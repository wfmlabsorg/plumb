"""Probabilistic staffing model: two-sided Monte Carlo over a weekly horizon.

Demand  -> required productive hours (workload / occupancy)
Supply  -> available productive hours (heads x ramp x hours x (1 - shrink))
Answer  -> P(supply >= demand), shortfall distribution, variance attribution.

Shrinkage is applied ONCE, on the supply side. Demand is never grossed up for it.
"""
from __future__ import annotations

import json
import os
import warnings
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy import optimize, stats

SEED = 20260919
Z90 = 1.6448536269514722


# --------------------------------------------------------------------------
# distribution helpers
# --------------------------------------------------------------------------

def lognormal_from_ci(lo: float, hi: float, conf: float = 0.90):
    """Lognormal (mu, sigma) on the log scale matching a central interval."""
    if lo <= 0 or hi <= lo:
        raise ValueError(f"bad lognormal interval: ({lo}, {hi})")
    z = stats.norm.ppf(0.5 + conf / 2)
    mu = (np.log(lo) + np.log(hi)) / 2
    sigma = (np.log(hi) - np.log(lo)) / (2 * z)
    return mu, sigma


def beta_from_mean_ci(mean: float, lo: float, hi: float, conf: float = 0.90):
    """Beta(a, b) with the given mean whose central interval width matches (lo, hi).

    Parameterized as Beta(mean*k, (1-mean)*k) and solved for the concentration k.

    The search is DELIBERATELY restricted to k > 1/min(mean, 1-mean), the region
    where both shape parameters exceed 1 and the density is unimodal. Interval
    width is monotone decreasing in k only inside that region; below it the width
    rises, peaks and collapses again as the density piles up on the boundaries.
    An unrestricted search therefore has two roots, and for a small mean it finds
    the wrong one: a degenerate U-shaped Beta that reproduces the requested mean
    while drawing almost every sample at 0 with rare samples at 1. That failure is
    silent -- the mean is right and every quantile is wrong.
    """
    if not 0 < mean < 1:
        raise ValueError(f"beta mean must be in (0,1), got {mean}")
    if not lo < mean < hi:
        raise ValueError(f"mean {mean} must lie inside its interval ({lo}, {hi})")
    target = hi - lo
    ql, qh = (1 - conf) / 2, 0.5 + conf / 2

    def width(k):
        a, b = mean * k, (1 - mean) * k
        return stats.beta.ppf(qh, a, b) - stats.beta.ppf(ql, a, b)

    k_min = (1.0 / min(mean, 1 - mean)) * (1 + 1e-9)   # a > 1 and b > 1
    k_max = 1e9

    if width(k_min) <= target:
        # No unimodal Beta with this mean is that wide. Use the widest one and say so.
        warnings.warn(
            f"interval ({lo}, {hi}) is wider than any unimodal Beta with mean {mean} "
            f"can produce; using the widest available (k={k_min:.3g}). Reconsider "
            f"whether a Beta is the right family here.", RuntimeWarning)
        k = k_min
    else:
        k = np.exp(optimize.brentq(lambda lk: width(np.exp(lk)) - target,
                                   np.log(k_min), np.log(k_max)))
    return mean * k, (1 - mean) * k


def check_beta(mean: float, lo: float, hi: float, conf: float = 0.90, tol: float = 0.15):
    """Round-trip a Beta spec and confirm the realized mean and interval match.

    Run this over every rate in the config before trusting a single result. A
    distribution can reproduce a requested mean while being the wrong shape
    entirely; only the quantiles catch it.
    """
    a, b = beta_from_mean_ci(mean, lo, hi, conf)
    ql, qh = (1 - conf) / 2, 0.5 + conf / 2
    got_lo, got_hi = stats.beta.ppf(ql, a, b), stats.beta.ppf(qh, a, b)
    got_mean = a / (a + b)
    ok = (abs(got_mean - mean) <= tol * mean
          and abs((got_hi - got_lo) - (hi - lo)) <= tol * (hi - lo)
          and a > 1 and b > 1)
    return {"a": a, "b": b, "mean": got_mean, "lo": got_lo, "hi": got_hi, "ok": bool(ok)}


def pert_ab(lo: float, mode: float, hi: float, lam: float = 4.0):
    """Beta-PERT shape parameters for a (min, most likely, max) elicitation."""
    if hi <= lo:
        raise ValueError(f"bad PERT range: ({lo}, {mode}, {hi})")
    a = 1 + lam * (mode - lo) / (hi - lo)
    b = 1 + lam * (hi - mode) / (hi - lo)
    return a, b


def draw_beta(rng, spec, size):
    """spec: {'mean':, 'ci':[lo,hi]} or {'a':, 'b':} (a posterior)."""
    if "a" in spec:
        a, b = spec["a"], spec["b"]
    else:
        a, b = beta_from_mean_ci(spec["mean"], *spec["ci"])
    return rng.beta(a, b, size=size)


def draw_lognormal(rng, spec, size):
    """spec: {'ci':[lo,hi]} or {'mu':, 'sigma':} (a posterior)."""
    if "mu" in spec:
        mu, sigma = spec["mu"], spec["sigma"]
    else:
        mu, sigma = lognormal_from_ci(*spec["ci"])
    return rng.lognormal(mu, sigma, size=size)


def _draw_curve(rng, spec_list, N, monotone: bool = False) -> np.ndarray:
    """A tenure curve as (N, L). Entries may be fixed floats or Beta specs.

    Ramp and early attrition were fixed arrays in an earlier version while the
    parameter register described both as distributions. That is the wrong way
    round: `01-method.md` calls the ramp multiplier the place most plans lie to
    themselves, and a curve carrying no uncertainty cannot express the failure
    mode `06-interpretation.md` warns about -- a ramp reaching 1.0 sooner than
    the tenure data supports.

    With `monotone`, each draw is made non-decreasing across tenure. Sampling
    each week independently can put week 3 below week 2, which would mean agents
    getting less proficient with practice.
    """
    cols = []
    for spec in spec_list:
        if isinstance(spec, dict):
            cols.append(draw_beta(rng, spec, N))
        else:
            cols.append(np.full(N, float(spec)))
    out = np.column_stack(cols)
    return np.maximum.accumulate(out, axis=1) if monotone else out


# --------------------------------------------------------------------------
# occupancy as a function of load — the alternative to a fixed assumption
# --------------------------------------------------------------------------

def erlang_b(n: int, a: float) -> float:
    """Erlang B by the stable recurrence. No factorials, so no overflow at
    realistic group sizes -- the direct formula fails above roughly n=170."""
    inv = 1.0
    for i in range(1, n + 1):
        inv = 1.0 + inv * i / a
    return 1.0 / inv


def erlang_c(n: int, a: float) -> float:
    if a >= n:
        return 1.0
    b = erlang_b(n, a)
    rho = a / n
    return b / (1.0 - rho * (1.0 - b))


def service_level(n: int, a: float, asa: float, aht: float) -> float:
    if a >= n:
        return 0.0
    return 1.0 - erlang_c(n, a) * np.exp(-(n - a) * asa / aht)


def agents_for_sl(a: float, target: float, asa: float, aht: float,
                  cap_mult: float = 3.0) -> int:
    n = int(np.floor(a)) + 1
    limit = max(int(a * cap_mult) + 10, n + 10)
    while n < limit:
        if service_level(n, a, asa, aht) >= target:
            return n
        n += 1
    return limit


def erlang_a(n: int, a: float, aht: float, patience: float, jmax: int = 4000) -> dict:
    """M/M/n+M — Erlang C plus impatience. Returns abandonment and delay rates.

    Erlang C assumes infinite patience: every caller waits forever, so once
    staffing falls below offered load the queue grows without bound and the
    model reports total collapse. Real callers leave, and that abandonment is
    what stabilizes the system. Using Erlang C to describe an understaffed
    operation therefore overstates what happens -- the failure is severe but it
    is finite, and it shows up as lost contacts rather than as infinite waits.

    Computed from the birth-death chain in log space so that loads of several
    hundred erlangs do not overflow. `patience` is mean time to abandon, in the
    same units as `aht`.
    """
    mu, theta = 1.0 / aht, 1.0 / patience
    lam = a * mu
    logr = [0.0]
    for k in range(1, n + 1):
        logr.append(logr[-1] + np.log(a) - np.log(k))
    for j in range(1, jmax + 1):
        logr.append(logr[-1] + np.log(lam) - np.log(n * mu + j * theta))
    r = np.array(logr)
    p = np.exp(r - r.max())
    p /= p.sum()
    pq = p[n:]
    eq = float((np.arange(len(pq)) * pq).sum())
    return {"p_abandon": float(theta * eq / lam), "p_delay": float(pq.sum()),
            "mean_queue": eq}


def occupancy_curve(target_sl: float, asa: float, aht: float,
                    a_min: float = 0.5, a_max: float = 5000.0, points: int = 60):
    """Tabulate achievable occupancy against offered load, at a fixed service level.

    This is the honest answer to the model's weakest joint. Occupancy is not a
    property of an operation, it is a consequence of how much load is being
    pooled: at 450s AHT and 80/20, roughly 83% at 30 erlangs and 97% at 480.
    Holding it fixed while volume swings across the simulated range understates
    the requirement in low draws and overstates it in high ones, compressing the
    very spread the model exists to show.

    Returns (a_grid, occ_grid) for interpolation. Built once per channel at the
    channel's median AHT -- the curve's shape is driven by load, and re-deriving
    it per draw would cost far more than the second-order accuracy it buys.
    """
    a_grid = np.geomspace(a_min, a_max, points)
    occ = np.array([a / agents_for_sl(a, target_sl, asa, aht) for a in a_grid])
    return a_grid, occ


def _occupancy_for(spec, rng, N, W, workload_hours, aht_median):
    """Resolve an occupancy spec to an (N, W) array.

    Accepts either a Beta spec (fixed occupancy, sampled) or
    {kind: erlang_curve, target_sl, asa_seconds, operating_hours_per_week,
     spread}, in which case occupancy tracks the load in every draw.
    """
    if not (isinstance(spec, dict) and spec.get("kind") == "erlang_curve"):
        return draw_beta(rng, spec, (N, 1)) * np.ones((1, W))

    oh = float(spec["operating_hours_per_week"])
    a_grid, occ_grid = occupancy_curve(
        float(spec.get("target_sl", 0.80)), float(spec.get("asa_seconds", 20.0)),
        aht_median)
    load = np.clip(workload_hours / oh, a_grid[0], a_grid[-1])   # erlangs
    occ = np.interp(load, a_grid, occ_grid)
    # Residual uncertainty about the curve itself: the operation does not sit
    # exactly on its theoretical curve, and pretending otherwise would replace
    # one false certainty with another.
    spread = float(spec.get("spread", 0.03))
    if spread > 0:
        occ = occ * rng.lognormal(0.0, spread, size=(N, 1))
    return np.clip(occ, 0.30, 0.98)


# --------------------------------------------------------------------------
# results container
# --------------------------------------------------------------------------

@dataclass
class Result:
    demand_interactive: np.ndarray  # (N, W) productive hours, queued work
    demand_deferrable: np.ndarray   # (N, W) productive hours, email and similar
    supply: np.ndarray              # (N, W) available productive hours
    shrink: np.ndarray              # (N, W) sampled shrink, kept for the S-curve
    hours_per_head: float
    inputs: dict = field(default_factory=dict)   # name -> (N,) scalar draws
    endogenous: set = field(default_factory=set)  # inputs that are model OUTPUTS too

    @property
    def demand(self) -> np.ndarray:
        """Total required productive hours.

        Read with `coverage(lane="interactive")` as a priority model: queued work
        has first call on capacity, deferrable work absorbs what is left. The
        pooled figure is therefore the STRICTER test, not the flattering one --
        the gap between the two is what the email backlog absorbs before the
        queue is affected at all.

        Summing does assume the hours are interchangeable. Where interactive and
        deferrable work are staffed by different, non-cross-skilled people, the
        residual is not actually available and both figures need a supply split
        the model does not currently carry.
        """
        return self.demand_interactive + self.demand_deferrable

    @property
    def shortfall(self) -> np.ndarray:
        return self.demand - self.supply

    def coverage(self, week=None, lane: str = "all") -> float:
        """lane: 'interactive' asks whether queued work is covered when it has
        first call on capacity; 'all' asks whether everything is, deferrable
        work included. The gap between them is the deferrable exposure."""
        if lane == "all":
            sf = self.shortfall
        elif lane == "interactive":
            sf = self.demand_interactive - self.supply
        else:
            raise ValueError(f"lane must be 'all' or 'interactive', got {lane!r}")
        sf = sf if week is None else sf[:, week]
        if week is None:
            return float((sf.max(axis=1) <= 0).mean())   # every week covered
        return float((sf <= 0).mean())

    def productive_hours_per_head(self, week: int) -> np.ndarray:
        """What one head actually delivers, per draw: scheduled hours net of shrink.

        Converting a shortfall to FTE by dividing by SCHEDULED hours is the
        shrink-once rule broken in the other direction -- the shortfall is in
        productive hours, so its denominator must be productive hours too.
        Dividing by 37.5 rather than 37.5 x (1 - shrink) understates the gap by
        the whole shrink percentage.
        """
        return self.hours_per_head * (1.0 - self.shrink[:, week])

    def shortfall_fte(self, week: int) -> np.ndarray:
        """Per-draw shortfall in FTE. Converted inside the draw, then summarized
        -- not a percentile of hours divided by an average head."""
        return self.shortfall[:, week] / self.productive_hours_per_head(week)

    def summary(self) -> pd.DataFrame:
        rows = []
        for w in range(self.demand.shape[1]):
            d, s = self.demand[:, w], self.supply[:, w]
            sf = d - s
            fte = self.shortfall_fte(w)
            rows.append({
                "week": w,
                "demand_p10": np.percentile(d, 10),
                "demand_p50": np.percentile(d, 50),
                "demand_p90": np.percentile(d, 90),
                "supply_p50": np.percentile(s, 50),
                "coverage": float((sf <= 0).mean()),
                "coverage_interactive": self.coverage(w, lane="interactive"),
                "deferrable_share": float(np.mean(self.demand_deferrable[:, w]
                                                  / np.maximum(d, 1e-9))),
                "shortfall_p50_hrs": np.percentile(sf, 50),
                "shortfall_p90_hrs": np.percentile(sf, 90),
                "shortfall_p50_fte": np.percentile(fte, 50),
                "shortfall_p90_fte": np.percentile(fte, 90),
            })
        return pd.DataFrame(rows)


# --------------------------------------------------------------------------
# demand
# --------------------------------------------------------------------------

def simulate_demand(cfg, rng, N, W, inputs, endogenous):
    """Two passes: accumulate workload per channel, then convert to productive hours.

    The passes are separate because occupancy may be a function of LOAD, and the
    load on a channel is a portfolio quantity -- it is not known until every
    segment has contributed. Converting inside the segment loop would apply an
    occupancy derived from one segment's volume to the whole channel.

    Returns (interactive, deferrable), each (N, W) productive hours.
    """
    chans = cfg["channels"]

    # Channel parameters are properties of the PORTFOLIO, not of a segment, and
    # are drawn once per simulation before the segment loop.
    #
    # Drawing them inside the loop -- as an earlier version did -- gives voice AHT
    # an independent value for each segment, so a high draw in one is offset by a
    # low draw in another and the portfolio-level risk is diversified away. It is
    # the same error the forecast-error comment below warns about, one level up.
    # Where a channel genuinely behaves differently by segment, give that segment
    # its own channel entry rather than relying on resampling to represent it.
    cpar = {}
    for c, ch in chans.items():
        if ch["kind"] == "deferrable":
            tph = draw_lognormal(rng, ch["items_per_productive_hour"], (N, 1))
            cpar[c] = {"tph": tph}
            inputs[f"tph[{c}]"] = tph[:, 0]
            continue
        aht = draw_lognormal(rng, ch["aht_seconds"], (N, 1))
        conc = (draw_lognormal(rng, ch["concurrency"], (N, 1))
                if isinstance(ch.get("concurrency"), dict) else
                np.full((N, 1), float(ch.get("concurrency", 1.0))))
        cpar[c] = {"aht": aht, "conc": conc}
        inputs[f"AHT[{c}]"] = aht[:, 0]
        if isinstance(ch.get("concurrency"), dict):
            inputs[f"conc[{c}]"] = conc[:, 0]

    # ---- pass 1: workload (interactive) and item counts (deferrable) --------
    workload = {c: np.zeros((N, W)) for c in chans}

    for sname, seg in cfg["segments"].items():
        lo, mode, hi = seg["transactions_per_week"]
        a, b = pert_ab(lo, mode, hi)
        base = lo + (hi - lo) * rng.beta(a, b, size=(N, 1))

        index = np.asarray(seg.get("weekly_index", [1.0] * W), float)
        if index.size != W:
            raise ValueError(f"{sname}: weekly_index length {index.size} != horizon {W}")

        # Forecast error has TWO components, and the model needs both.
        #
        # The systematic part is drawn once per simulation: forecast bias
        # persists, and redrawing it weekly would average it away. But drawing
        # ONLY that leaves every week perfectly correlated -- measured at 0.9998
        # before `forecast_error_weekly` existed -- which makes "the probability
        # we cover every week" identical to "the probability we cover the worst
        # week", and quietly removes week-to-week forecast error, a large and
        # entirely real source of staffing risk.
        err_sys = draw_lognormal(rng, seg["forecast_error"], (N, 1))
        wspec = seg.get("forecast_error_weekly")
        err_wk = draw_lognormal(rng, wspec, (N, W)) if wspec else 1.0
        txn = base * index[None, :] * err_sys * err_wk
        inputs[f"txn[{sname}]"] = txn.mean(axis=1)
        inputs[f"fcst_err[{sname}]"] = err_sys[:, 0]

        cr = draw_beta(rng, seg["contact_rate"], (N, 1))
        inputs[f"CR[{sname}]"] = cr[:, 0]
        contacts = txn * cr

        alpha = np.asarray([seg["channel_split"][c] for c in chans], float)
        split = rng.dirichlet(alpha, size=N)                      # (N, n_chan)
        for i, c in enumerate(chans):
            inputs[f"split[{sname},{c}]"] = split[:, i]

        for i, (c, ch) in enumerate(chans.items()):
            n_c = contacts * split[:, i : i + 1]
            if ch["kind"] == "deferrable":
                workload[c] += n_c                      # items, not hours
            else:
                workload[c] += n_c * cpar[c]["aht"] / 3600.0 / cpar[c]["conc"]

    # ---- pass 2: workload -> productive hours -------------------------------
    interactive = np.zeros((N, W))
    deferrable = np.zeros((N, W))

    for c, ch in chans.items():
        if ch["kind"] == "deferrable":
            deferrable += workload[c] / cpar[c]["tph"]
            continue
        aht_med = float(np.median(cpar[c]["aht"]))
        occ = _occupancy_for(ch["occupancy"], rng, N, W, workload[c], aht_med)
        inputs[f"occ[{c}]"] = occ.mean(axis=1)
        if isinstance(ch["occupancy"], dict) and ch["occupancy"].get("kind") == "erlang_curve":
            endogenous.add(f"occ[{c}]")
        interactive += workload[c] / occ

    return interactive, deferrable


# --------------------------------------------------------------------------
# supply
# --------------------------------------------------------------------------

def simulate_supply(cfg, rng, N, W, inputs):
    sup = cfg["supply"]
    hours = float(sup["scheduled_hours_per_head"])
    ramp = _draw_curve(rng, sup["ramp_curve"], N, monotone=True)      # (N, L)
    early = _draw_curve(rng, sup["early_attrition_weekly"], N)        # (N, Le)
    inputs["ramp_wk1"] = ramp[:, 0]
    inputs["attrition_early_wk1"] = early[:, 0]
    tenured_rate = draw_beta(rng, sup["tenured_attrition_weekly"], (N, 1))[:, 0]
    inputs["attrition_tenured"] = tenured_rate

    # --- starting tenured pool -------------------------------------------
    tenured = np.full(N, float(sup["starting_productive_heads"]))

    # --- pipeline rates: drawn ONCE, shared across every cohort -----------
    # These are properties of the labor market and the training operation, not
    # of an individual class. Drawing them per class let a bad class be canceled
    # by a good one, which averaged away the pipeline risk this whole side of the
    # model exists to represent -- and left the attribution table reporting only
    # the first cohort's draw.
    #
    # What this deliberately omits is per-class EXECUTION noise on top of the
    # shared rate (a binomial draw around it). That is a second-order effect next
    # to not knowing the rate, and adding it without evidence would manufacture
    # precision. Revisit once several cohorts have been observed.
    fill = draw_beta(rng, sup["requisition_fill_prob"], N)
    cf = draw_beta(rng, sup["class_fill_rate"], N)
    grad = draw_beta(rng, sup["graduation_rate"], N)
    ttf = draw_lognormal(rng, sup["time_to_fill_weeks"], N)
    inputs["req_fill_prob"] = fill
    inputs["class_fill_rate"] = cf
    inputs["graduation_rate"] = grad
    inputs["time_to_fill_wks"] = ttf

    # --- build cohorts from the class plan --------------------------------
    grad_week, coh_heads = [], []
    for cls in sup.get("class_plan", []):
        offers = float(cls["requisitions_opened"]) * fill
        seats = np.minimum(float(cls["seats_planned"]) * cf, offers)
        heads = seats * grad

        slip = np.ceil(np.maximum(ttf - float(cls.get("lead_weeks", 0)), 0)).astype(int)
        gw = int(cls["planned_start_week"]) + int(sup["training_weeks"]) + slip
        grad_week.append(gw)                 # (N,) — slip is per draw
        coh_heads.append(heads)

    grad_week = np.array(grad_week).T if grad_week else np.zeros((N, 0), int)   # (N, C)
    coh_heads = np.array(coh_heads).T if coh_heads else np.zeros((N, 0))        # (N, C)

    # --- shrinkage --------------------------------------------------------
    shrink_p = draw_beta(rng, sup["shrinkage_planned"], (N, 1))
    shrink_u = draw_beta(rng, sup["shrinkage_unplanned"], (N, 1))
    shrink = np.clip(shrink_p + shrink_u, 0.0, 0.95) * np.ones((1, W))
    inputs["shrink_planned"] = shrink_p[:, 0]
    inputs["shrink_unplanned"] = shrink_u[:, 0]

    # --- walk the horizon -------------------------------------------------
    supply = np.zeros((N, W))
    for w in range(W):
        tenured *= (1.0 - tenured_rate)
        productive = tenured.copy()

        if coh_heads.shape[1]:
            k = w - grad_week                              # (N, C) weeks since grad
            live = k >= 0
            if live.any():
                rows = np.arange(coh_heads.shape[0])[:, None]
                L, Le = ramp.shape[1], early.shape[1]

                eidx = np.clip(k, 0, Le - 1)
                haz = np.where(k < Le, early[rows, eidx], tenured_rate[:, None])
                coh_heads = np.where(live, coh_heads * (1.0 - haz), coh_heads)

                ridx = np.clip(k, 0, L - 1)
                mult = np.where(k < L, ramp[rows, ridx], 1.0)
                productive += np.where(live, coh_heads * mult, 0.0).sum(axis=1)

        supply[:, w] = productive * hours * (1.0 - shrink[:, w])

    return supply, shrink, hours


# --------------------------------------------------------------------------
# run
# --------------------------------------------------------------------------

def run(cfg, n_draws: int = 20000, seed: int = SEED) -> Result:
    rng = np.random.default_rng(seed)
    W = int(cfg["horizon_weeks"])
    inputs: dict = {}
    endogenous: set = set()
    inter, defer = simulate_demand(cfg, rng, n_draws, W, inputs, endogenous)
    supply, shrink, hours = simulate_supply(cfg, rng, n_draws, W, inputs)
    return Result(inter, defer, supply, shrink, hours, inputs, endogenous)


# --------------------------------------------------------------------------
# variance attribution
# --------------------------------------------------------------------------

def attribution(res: Result, week: int | None = None,
                include_endogenous: bool = False) -> pd.DataFrame:
    """Rank inputs by share of shortfall variance, via squared rank correlation.

    SCREENING TOOL ONLY. It assumes each input's effect is monotone and roughly
    additive. It will mislead where two inputs interact (occupancy and volume do).
    Confirm the top two or three by pinning them at their mean and re-running.

    ENDOGENOUS inputs are flagged and, by default, excluded. Under `erlang_curve`
    occupancy is a FUNCTION of load, so it inherits volume's correlation with
    shortfall and ranks near the top -- while actually reducing the requirement.
    Left in, it reads as the second-largest driver and sends the gap register
    chasing a quantity that is an output of the model, not an input to it.
    """
    y = res.shortfall.max(axis=1) if week is None else res.shortfall[:, week]
    rows = []
    for name, x in res.inputs.items():
        if np.std(x) == 0:
            continue
        endo = name in res.endogenous
        if endo and not include_endogenous:
            continue
        r = stats.spearmanr(x, y).statistic
        rows.append({"input": name, "rho": r, "rho2": r * r, "endogenous": endo})
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["share"] = df["rho2"] / df["rho2"].sum()
    return df.sort_values("share", ascending=False).reset_index(drop=True)


def pin_check(cfg, name_to_fixed: dict, n_draws=20000, seed=SEED, week=None):
    """Exact contribution: re-run with a parameter's spread removed.

    Pass e.g. {'channels.chat.aht_seconds': {'mu': m, 'sigma': 0.0}} and compare
    the shortfall variance against the full run.
    """
    import copy
    c = copy.deepcopy(cfg)
    for dotted, val in name_to_fixed.items():
        node = c
        *path, leaf = dotted.split(".")
        for p in path:
            node = node[p]
        node[leaf] = val
    res = run(c, n_draws, seed)
    y = res.shortfall.max(axis=1) if week is None else res.shortfall[:, week]
    return float(np.var(y))


# --------------------------------------------------------------------------
# the decision curve
# --------------------------------------------------------------------------

def coverage_curve(res: Result, extra_heads=range(0, 121, 5)) -> pd.DataFrame:
    """P(covered every week) against additional fully-ramped heads from week 0.

    Fully-ramped is deliberately optimistic: it is the ceiling on what extra
    hiring can buy. Real heads arrive late and ramped, so read this as an upper
    bound and use the pipeline in the config to model the achievable version.
    """
    rows = []
    for h in extra_heads:
        added = h * res.hours_per_head * (1.0 - res.shrink)
        sf = res.demand - (res.supply + added)
        by_week = (sf <= 0).mean(axis=0)          # coverage in each week
        rows.append({"extra_heads": h,
                     "coverage_all_weeks": float((sf.max(axis=1) <= 0).mean()),
                     "coverage_worst_week": float(by_week.min()),
                     "coverage_mean_week": float(by_week.mean())})
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------
# charts
# --------------------------------------------------------------------------

def charts(res: Result, week: int | None = None, outdir: str = "."):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    w = week if week is not None else res.demand.shape[1] - 1
    paths = []

    # 1. demand vs supply for the chosen week
    fig, ax = plt.subplots(figsize=(9, 4.5))
    ax.hist(res.demand[:, w], bins=80, alpha=0.6, label="required productive hours")
    ax.hist(res.supply[:, w], bins=80, alpha=0.6, label="available productive hours")
    ax.set_title(f"Week {w}: demand vs supply  |  coverage = {res.coverage(w):.1%}")
    ax.set_xlabel("productive hours"); ax.legend()
    p = f"{outdir}/01-demand-vs-supply.png"; fig.savefig(p, dpi=140, bbox_inches="tight")
    plt.close(fig); paths.append(p)

    # 2. coverage by week
    s = res.summary()
    fig, ax = plt.subplots(figsize=(9, 4))
    ax.plot(s["week"], s["coverage"], marker="o")
    ax.axhline(0.8, ls="--", lw=1); ax.set_ylim(0, 1)
    ax.set_title("Coverage probability by week"); ax.set_xlabel("week")
    p = f"{outdir}/02-coverage-by-week.png"; fig.savefig(p, dpi=140, bbox_inches="tight")
    plt.close(fig); paths.append(p)

    # 3. requirement fan
    fig, ax = plt.subplots(figsize=(9, 4))
    ax.fill_between(s["week"], s["demand_p10"], s["demand_p90"], alpha=0.25,
                    label="demand P10-P90")
    ax.plot(s["week"], s["demand_p50"], label="demand P50")
    ax.plot(s["week"], s["supply_p50"], ls="--", label="supply P50")
    ax.set_title("Required vs available productive hours"); ax.legend()
    p = f"{outdir}/03-fan.png"; fig.savefig(p, dpi=140, bbox_inches="tight")
    plt.close(fig); paths.append(p)

    # 4. attribution tornado
    a = attribution(res).head(12)
    if not a.empty:
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.barh(a["input"][::-1], a["share"][::-1])
        ax.set_title("Share of shortfall variance (screening)")
        ax.set_xlabel("share")
        p = f"{outdir}/04-attribution.png"; fig.savefig(p, dpi=140, bbox_inches="tight")
        plt.close(fig); paths.append(p)

    # 5. the decision curve
    cc = coverage_curve(res)
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.plot(cc["extra_heads"], cc["coverage_all_weeks"], marker="o")
    ax.axhline(0.8, ls="--", lw=1); ax.set_ylim(0, 1)
    ax.set_title("Coverage probability vs additional heads (upper bound)")
    ax.set_xlabel("additional fully-ramped heads")
    p = f"{outdir}/05-decision-curve.png"; fig.savefig(p, dpi=140, bbox_inches="tight")
    plt.close(fig); paths.append(p)

    return paths


# --------------------------------------------------------------------------
# demonstration parameters — REPLACE with params.yaml
# --------------------------------------------------------------------------

DEMO = {
    "horizon_weeks": 13,
    "channels": {
        "voice": {"kind": "interactive", "aht_seconds": {"ci": [380, 520]},
                  "concurrency": 1.0,
                  "occupancy": {"kind": "erlang_curve", "target_sl": 0.80,
                                "asa_seconds": 20, "operating_hours_per_week": 168,
                                "spread": 0.03}},
        "chat":  {"kind": "interactive", "aht_seconds": {"ci": [600, 950]},
                  "concurrency": {"ci": [1.4, 2.2]},
                  "occupancy": {"kind": "erlang_curve", "target_sl": 0.80,
                                "asa_seconds": 30, "operating_hours_per_week": 168,
                                "spread": 0.03}},
        "email": {"kind": "deferrable", "items_per_productive_hour": {"ci": [4.0, 7.0]}},
    },
    "segments": {
        "SEG-A": {"transactions_per_week": [950_000, 1_100_000, 1_320_000],
                  "weekly_index": [1.00, 1.02, 1.05, 1.09, 1.12, 1.10, 1.06,
                                   1.03, 1.00, 0.97, 0.95, 0.94, 0.96],
                  "forecast_error": {"ci": [0.90, 1.12]},
                  "forecast_error_weekly": {"ci": [0.93, 1.08]},
                  "contact_rate": {"mean": 0.031, "ci": [0.024, 0.040]},
                  "channel_split": {"voice": 55, "chat": 30, "email": 15}},
        "SEG-B": {"transactions_per_week": [300_000, 375_000, 525_000],
                  "weekly_index": [1.00, 1.01, 1.03, 1.04, 1.06, 1.05, 1.03,
                                   1.01, 1.00, 0.99, 0.98, 0.98, 0.99],
                  "forecast_error": {"ci": [0.85, 1.20]},
                  "forecast_error_weekly": {"ci": [0.90, 1.11]},
                  "contact_rate": {"mean": 0.052, "ci": [0.038, 0.070]},
                  "channel_split": {"voice": 40, "chat": 42, "email": 18}},
    },
    "supply": {
        "starting_productive_heads": 300,
        "scheduled_hours_per_head": 37.5,
        "ramp_curve": [{"mean": 0.45, "ci": [0.30, 0.60]},
                       {"mean": 0.70, "ci": [0.55, 0.82]},
                       {"mean": 0.85, "ci": [0.73, 0.93]}, 1.00],
        "early_attrition_weekly": [{"mean": 0.030, "ci": [0.015, 0.050]},
                                   {"mean": 0.025, "ci": [0.012, 0.043]},
                                   {"mean": 0.018, "ci": [0.008, 0.033]},
                                   {"mean": 0.012, "ci": [0.005, 0.024]}],
        "tenured_attrition_weekly": {"mean": 0.006, "ci": [0.003, 0.010]},
        "shrinkage_planned": {"mean": 0.18, "ci": [0.15, 0.21]},
        "shrinkage_unplanned": {"mean": 0.09, "ci": [0.05, 0.15]},
        "requisition_fill_prob": {"mean": 0.70, "ci": [0.50, 0.86]},
        "time_to_fill_weeks": {"ci": [3.0, 9.0]},
        "class_fill_rate": {"mean": 0.88, "ci": [0.72, 0.97]},
        "graduation_rate": {"mean": 0.84, "ci": [0.70, 0.93]},
        "training_weeks": 5,
        "class_plan": [
            {"planned_start_week": 0, "seats_planned": 24,
             "requisitions_opened": 40, "lead_weeks": 6},
            {"planned_start_week": 4, "seats_planned": 24,
             "requisitions_opened": 40, "lead_weeks": 6},
        ],
    },
}


def load_config(path: str = "params.yaml"):
    if os.path.exists(path):
        import yaml
        with open(path) as fh:
            return yaml.safe_load(fh)
    print(f"[warn] {path} not found — running on DEMONSTRATION parameters. "
          f"Results are illustrative only.")
    return DEMO


if __name__ == "__main__":
    cfg = load_config()
    res = run(cfg)
    pd.set_option("display.width", 160)
    print(res.summary().to_string(index=False, float_format=lambda v: f"{v:,.2f}"))
    print(f"\nCoverage, every week: {res.coverage():.1%}")
    print("\nVariance attribution (screening):")
    print(attribution(res).head(10).to_string(index=False))
    print("\nDecision curve:")
    print(coverage_curve(res).to_string(index=False))
    print("\nCharts:", charts(res))
