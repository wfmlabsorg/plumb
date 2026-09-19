"""Posterior updating, calibration scoring and regime detection."""
from __future__ import annotations

import numpy as np
from scipy import stats


# --------------------------------------------------------------------------
# forgetting
# --------------------------------------------------------------------------

def discount_beta(a, b, lam):
    """Power-discount a Beta toward its uniform base so old evidence decays."""
    return 1 + lam * (a - 1), 1 + lam * (b - 1)


def discount_dirichlet(alpha, lam):
    return [1 + lam * (ai - 1) for ai in alpha]


# --------------------------------------------------------------------------
# conjugate updates
# --------------------------------------------------------------------------

def update_beta(a, b, successes, trials, lam=1.0, effective_n=None):
    """Beta-Binomial update.

    For genuinely independent events (graduations out of starts, offers out of
    requisitions) pass the raw counts and leave `effective_n` alone.

    For quantities measured in hours or on correlated units -- shrinkage above
    all -- pass `effective_n` as the number of INDEPENDENT units behind the
    observation (agent-weeks, not hours). Successes are rescaled to match, which
    is the whole point: treating 150,000 shrinkage hours as 150,000 independent
    trials produces a posterior so tight it stops responding to reality.

    Rescaling here rather than at the call site is deliberate. Passing a raw
    success count against a reduced trial count is an easy mistake to make and
    silently inflates the rate.
    """
    if trials <= 0:
        raise ValueError(f"trials must be positive, got {trials}")
    if successes < 0 or successes > trials:
        raise ValueError(f"successes {successes} outside [0, {trials}]")
    if effective_n is not None:
        if effective_n <= 0:
            raise ValueError(f"effective_n must be positive, got {effective_n}")
        successes = successes / trials * effective_n
        trials = effective_n
    a, b = discount_beta(a, b, lam)
    return a + successes, b + (trials - successes)


def update_dirichlet(alpha, counts, lam=1.0):
    alpha = discount_dirichlet(alpha, lam)
    return [ai + ci for ai, ci in zip(alpha, counts)]


def update_normal_invgamma(mu0, kappa0, alpha0, beta0, x, lam=1.0):
    """Normal-Inverse-Gamma update on log-scale observations (AHT, time-to-fill,
    forecast error). Updates BOTH location and spread — never freeze the variance.

    Returns (mu, kappa, alpha, beta); the predictive is Student-t.
    """
    x = np.log(np.asarray(x, float))
    x = x[np.isfinite(x)]
    n, xbar = len(x), x.mean() if len(x) else 0.0

    # Power-discount ALL THREE accumulating parameters. Discounting kappa and
    # alpha while leaving beta untouched makes alpha reach a steady state while
    # beta grows without bound, so sqrt(beta/(alpha-1)) inflates forever: against
    # a true sigma of 0.20 at lam=0.98, one observation a day, it drifts past 0.5
    # inside a year. That failure is insidious because it errs toward WIDE
    # intervals, which read as humility rather than as a bug.
    kappa0, alpha0, beta0 = lam * kappa0, lam * alpha0, lam * beta0

    kappa = kappa0 + n
    mu = (kappa0 * mu0 + n * xbar) / kappa
    alpha = alpha0 + n / 2
    ss = ((x - xbar) ** 2).sum() if n else 0.0
    beta = beta0 + 0.5 * ss + (kappa0 * n * (xbar - mu0) ** 2) / (2 * kappa)
    return mu, kappa, alpha, beta


def lognormal_params(mu, kappa, alpha, beta):
    """Point (mu, sigma) for sampling, from a Normal-Inverse-Gamma posterior."""
    return mu, float(np.sqrt(beta / max(alpha - 1, 1e-6)))


def ci_from_beta(a, b, conf=0.90):
    ql, qh = (1 - conf) / 2, 0.5 + conf / 2
    return float(stats.beta.ppf(ql, a, b)), float(stats.beta.ppf(qh, a, b))


# --------------------------------------------------------------------------
# calibration
# --------------------------------------------------------------------------

def pit(ensemble, actual):
    """Probability integral transform: where the actual fell in the forecast.

    A well-calibrated model produces PIT values uniform on [0,1]. Clustering
    near 1 means the model forecasts LOW; near 0, HIGH; clustering in the
    middle means the intervals are too wide.
    """
    e = np.asarray(ensemble, float)
    return float((e <= actual).mean())


def crps(ensemble, actual):
    """Continuous ranked probability score. Lower is better; units are the
    units of the forecast. Sorted-sample form, O(n log n)."""
    x = np.sort(np.asarray(ensemble, float))
    n = len(x)
    term1 = np.abs(x - actual).mean()
    i = np.arange(1, n + 1)
    term2 = (2.0 / (n * n)) * np.sum((2 * i - n - 1) * x)
    return float(term1 - 0.5 * term2)


def interval_hit(ensemble, actual, conf=0.80):
    lo = np.percentile(ensemble, (1 - conf) / 2 * 100)
    hi = np.percentile(ensemble, (0.5 + conf / 2) * 100)
    return bool(lo <= actual <= hi)


# --------------------------------------------------------------------------
# forecast archiving — the mechanism that makes scoring possible at all
# --------------------------------------------------------------------------

# Midpoint quadrature over [0,1]: tau_i = (i - 0.5)/M. The midpoint rule is used
# rather than an evenly-spaced grid from 0.025 to 0.975 because CRPS is an
# integral over the WHOLE unit interval -- a grid that stops short of the tails
# omits that mass and biases every score in the same direction. Measured against
# the ensemble CRPS: an 0.025-0.975 grid runs 2.2-2.6% high, this one within
# 0.2%, at identical storage cost.
QM = 40
QGRID = (np.arange(1, QM + 1) - 0.5) / QM


def archive_quantiles(ensemble, grid=QGRID):
    """Compress a predictive ensemble to a quantile grid for storage.

    A session cannot keep 40,000 draws between cycles, and without the previous
    cycle's forecast there is nothing to score -- which would leave the model
    making claims it cannot be held to. A 40-point grid is small enough to sit
    in MODEL-STATE.md and dense enough for PIT, interval hits and CRPS.
    """
    return np.percentile(np.asarray(ensemble, float), grid * 100).tolist()


def pit_from_quantiles(q, actual, grid=QGRID):
    """PIT by interpolating the stored grid. Returns 0.0 or 1.0 beyond the ends.

    Values pinned at exactly 0 or 1 are real information -- the actual fell
    outside everything the model considered -- and must not be discarded.
    """
    q = np.asarray(q, float)
    if actual <= q[0]:
        return 0.0
    if actual >= q[-1]:
        return 1.0
    return float(np.interp(actual, q, grid))


def crps_from_quantiles(q, actual, grid=QGRID):
    """CRPS via the pinball-loss identity: CRPS = 2 * mean over tau of pinball.

    Agrees with the ensemble `crps()` to within 0.2% on the 40-point midpoint
    grid, measured on both lognormal and normal ensembles.
    """
    q = np.asarray(q, float)
    pin = np.where(actual >= q, (actual - q) * grid, (q - actual) * (1 - grid))
    return float(2.0 * pin.mean())


def interval_hit_from_quantiles(q, actual, conf=0.80, grid=QGRID):
    q = np.asarray(q, float)
    lo = float(np.interp((1 - conf) / 2, grid, q))
    hi = float(np.interp(0.5 + conf / 2, grid, q))
    return bool(lo <= actual <= hi)


# --------------------------------------------------------------------------
# aging — forgetting is a function of ELAPSED TIME, not of call count
# --------------------------------------------------------------------------

def lam_for(lam_daily: float, days_elapsed: float) -> float:
    """Convert a daily forgetting factor to the factor for a gap of N days.

    Every update function discounts once per call. If a parameter is updated
    weekly and lambda is quoted per day, calling update once a week ages it at
    0.98 per WEEK instead of 0.98^7 = 0.868 -- roughly seven times too little
    forgetting, silently. Pass `lam=lam_for(0.98, days_since_last_update)`.

    This is also how a missing day is honoured: age the posterior without
    feeding it evidence, via `discount_only` below. A gap is information about
    how stale the model is; skipping it pretends no time passed.
    """
    if not 0 < lam_daily <= 1:
        raise ValueError(f"lam_daily must be in (0,1], got {lam_daily}")
    if days_elapsed < 0:
        raise ValueError(f"days_elapsed must be >= 0, got {days_elapsed}")
    return float(lam_daily ** days_elapsed)


def discount_only_beta(a, b, lam_daily, days):
    """Age a Beta across days with no observation. Widens; never shifts the mean."""
    return discount_beta(a, b, lam_for(lam_daily, days))


# --------------------------------------------------------------------------
# effective sample size
# --------------------------------------------------------------------------

def effective_n(raw_denominator: float, kind: str) -> float:
    """Independent units behind an observation, which is rarely the raw count.

    Contact rate is the trap. Its denominator is transactions -- of the order of
    a million a week -- but those transactions are not a million independent
    trials of a stable propensity to make contact. They share a day, a
    disruption, a marketing campaign, a system outage. Updated on the raw count,
    the posterior concentration reaches the millions within days and the 90%
    interval collapses to a few thousandths of a percentage point, on a
    parameter that is the single largest contributor to the model's output
    variance -- 44% across both segments on the demo, over exogenous inputs.
    The model stops learning because it has decided it already knows.

    The divisors below are deliberately crude and deliberately conservative.
    They are `[estimated]` and should be replaced with a measured intra-day
    correlation as soon as enough daily history exists to compute one.
    """
    DIVISOR = {
        "events": 1.0,        # genuinely independent: graduations out of starts
        "contacts": 20.0,     # contacts within a day share conditions  [estimated]
        "transactions": 50.0, # bulk volume, heavily correlated          [estimated]
        "hours": 40.0,        # ~ one agent-week per 40 hours            [estimated]
    }
    if kind not in DIVISOR:
        raise ValueError(f"unknown kind {kind!r}; expected one of {sorted(DIVISOR)}")
    return max(raw_denominator / DIVISOR[kind], 1.0)


def regime_flag(pit_history, window=10, threshold=0.8, trigger=7):
    """Distinguish bad luck from a biased model.

    Returns 'HIGH', 'LOW' or None. If 7 of the last 10 actuals landed above the
    80th percentile of their forecast, the model is biased low — a structural
    change, not a run of bad luck. Do not absorb this silently into a posterior:
    surface it, and consider lowering the forgetting factor.
    """
    h = np.asarray(pit_history[-window:], float)
    if len(h) < window:
        return None
    if (h > threshold).sum() >= trigger:
        return "LOW"          # model forecasting low
    if (h < 1 - threshold).sum() >= trigger:
        return "HIGH"         # model forecasting high
    return None
