"""Intake and reconstruction: getting data in, asserting it is usable, and
rebuilding what a closed week actually required.

Split from `cycle.py` because this layer grew to carry the precondition
assertions -- row-set identity, config-data parity, value ranges -- that four
earlier rounds kept rediscovering one column at a time. It is now the larger
half and it stands on its own: nothing here touches MODEL-STATE.md.
"""
from __future__ import annotations

import os
from datetime import date, datetime

import numpy as np
import pandas as pd


class Unscoreable(Exception):
    """A week cannot be reconstructed honestly from the data supplied.

    Raised rather than returned as a number, because every previous version of
    this module answered a missing or partial column with a plausible-looking
    figure instead of a complaint. Measured on the demonstration intake, the
    silent answers were: concurrency absent +20.5%, AHT absent -81.3%, AHT
    present for only part of the week -0.1%, a supply column all-NaN -100%, and
    two missing supply days -28.3%. Every one of those passed validation and
    landed in the calibration log as though it were evidence.

    The rule this class enforces: a reconstruction either uses the data it
    claims to use, or it says why it cannot.
    """


# `aht_seconds` is required: without it `realized_required_hours` computes 0.0
# for every interactive channel, `score()` drops the row, and the calibration
# log stays empty forever -- the pack's central claim quietly never engaging.
# A loud failure at load is strictly better than a silent one at scoring.
REQUIRED_DEMAND = ["date", "segment", "channel", "transactions",
                   "contacts_offered", "contacts_handled", "productive_hours",
                   "aht_seconds"]


REQUIRED_SUPPLY = ["date", "scheduled_hours", "productive_hours",
                   "shrink_planned_hours", "shrink_unplanned_hours"]


def required_demand_columns(cfg) -> list[str]:
    """`REQUIRED_DEMAND`, plus `concurrency_effective` when any configured
    channel is concurrent.

    This has to fail at LOAD. Making it a per-week refusal produced the round-3
    failure in a new costume: a deployment built to the documented minimum with
    a chat channel scored nothing, ever, while `MODEL-STATE.md` reported a
    comfortable "Scored periods 0" and the same truncated flag was re-appended
    every cycle. Refusing once, loudly, at the door is the only version an operator
    can act on.
    """
    cols = list(REQUIRED_DEMAND)
    if any(ch.get("kind") != "deferrable" and _planned_concurrency(ch) > 1 + 1e-9
           for ch in cfg["channels"].values()):
        cols.append("concurrency_effective")
    # The same argument applied to the column beside it. A file built to the
    # documented minimum with a deferrable channel and no planned throughput
    # used to load clean and then fail at scoring, every week, forever --
    # refusing once at the door is the only version an operator can act on.
    if any(ch.get("kind") == "deferrable" and _planned_throughput(ch) is None
           for ch in cfg["channels"].values()):
        cols.append("items_resolved")
    return cols


def load_intake(directory: str, cfg=None):
    def rd(name, required):
        p = os.path.join(directory, name)
        if not os.path.exists(p):
            return None
        df = pd.read_csv(p, parse_dates=["date"])
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise ValueError(f"{name} missing required columns: {missing}")
        return df
    dem_req = required_demand_columns(cfg) if cfg is not None else REQUIRED_DEMAND
    return (rd("daily_demand.csv", dem_req),
            rd("daily_supply.csv", REQUIRED_SUPPLY),
            rd("pipeline_events.csv", ["date", "event", "count"]))


def validate(demand, supply, cfg, tol_reconcile: float = 0.02) -> list[str]:
    """Checks 1-4 and 6 from `04`. Check 5, the `check_beta` round-trip over
    `params.yaml`, is a config check rather than a data check and is run
    separately — see `check_beta` in `03-simulator.md`.

    Returns failures; an empty list means clean.

    Failures are returned rather than raised so a cycle can report ALL of them
    at once. A planner fixing one thing at a time per run will stop bothering.
    """
    fails = []
    if demand is None:
        return ["daily_demand.csv not found"]

    known_seg, known_chan = set(cfg["segments"]), set(cfg["channels"])
    for col, known, label in (("segment", known_seg, "segment"),
                              ("channel", known_chan, "channel")):
        unknown = set(demand[col].unique()) - known
        if unknown:
            fails.append(f"unknown {label}(s) not in params.yaml: {sorted(unknown)}")

    bad = demand["contacts_handled"] > demand["contacts_offered"]
    if bad.any():
        fails.append(f"contacts_handled > contacts_offered on {int(bad.sum())} row(s)")

    dup = demand.duplicated(subset=["date", "segment", "channel"]).sum()
    if dup:
        fails.append(f"{dup} duplicate (date, segment, channel) row(s) in daily_demand.csv "
                     f"— the file may have been loaded twice")
    if supply is not None:
        key = [c for c in ("date", "site", "cohort_id") if c in supply]
        sdup = supply.duplicated(subset=key).sum()
        if sdup:
            fails.append(f"{sdup} duplicate row(s) in daily_supply.csv on {key}")

    if "occupancy_achieved" in demand:
        oob = demand[(demand["occupancy_achieved"] > 1.0)
                     | (demand["occupancy_achieved"] <= 0)]
        if len(oob):
            # Occupancy above 1 is the most common occupancy data defect -- after-
            # call-work definitions routinely push it over 100% -- and it used to
            # pass here and then kill the cycle from inside update_beta with an
            # unhandled ValueError, after scoring, with no state written.
            fails.append(f"{len(oob)} occupancy_achieved value(s) outside (0, 1] "
                         f"(max {demand['occupancy_achieved'].max():.3f}) — check the "
                         f"definition, particularly whether after-call work is counted")

    if supply is not None:
        sh = supply["shrink_planned_hours"] + supply["shrink_unplanned_hours"]
        over = sh > supply["scheduled_hours"]
        if over.any():
            fails.append(f"shrink hours exceed scheduled hours on {int(over.sum())} row(s)")

        d_hrs = demand.groupby("date")["productive_hours"].sum()
        s_hrs = supply.groupby("date")["productive_hours"].sum()
        common = d_hrs.index.intersection(s_hrs.index)
        if len(common):
            gap = ((d_hrs[common] - s_hrs[common]).abs()
                   / s_hrs[common].replace(0, np.nan))
            worst = float(gap.max())
            if worst > tol_reconcile:
                fails.append(
                    f"productive hours reconcile to {worst:.1%} at worst "
                    f"(tolerance {tol_reconcile:.0%}) — demand and supply files "
                    f"disagree on what a productive hour is")

    ops, closed = operating_days(cfg), closed_dates(cfg)
    for frame, label in ((demand, "daily_demand.csv"), (supply, "daily_supply.csv")):
        if frame is None:
            continue
        days = pd.to_datetime(sorted(frame["date"].unique()))
        if len(days) > 1:
            span = pd.date_range(days.min(), days.max(), freq="D")
            # Only days the calendar says the operation runs. Checking all seven
            # made every weekend a validation failure for a five-day operation,
            # which halted the cycle permanently -- and the remedy the message
            # implied (interpolate) is the one `04` forbids.
            expect = [d for d in span if d.weekday() in ops
                      and d.normalize() not in closed]
            gaps = pd.DatetimeIndex(expect).difference(days)
            if len(gaps):
                fails.append(f"{label}: {len(gaps)} missing operating date(s), first "
                             f"{gaps[0].date()} — record as missing, do not interpolate; "
                             f"if the operation was shut, declare it in "
                             f"calendar.closed_dates")
    if supply is not None:
        d_days = set(pd.to_datetime(demand["date"].unique()))
        s_days = set(pd.to_datetime(supply["date"].unique()))
        only_d, only_s = sorted(d_days - s_days), sorted(s_days - d_days)
        # Dates present in one file and not the other used to be dropped by the
        # reconciliation intersection rather than reported, which is how a
        # supply file missing two days passed validation clean.
        if only_d:
            fails.append(f"{len(only_d)} date(s) in demand but not supply, first "
                         f"{only_d[0].date()}")
        if only_s:
            fails.append(f"{len(only_s)} date(s) in supply but not demand, first "
                         f"{only_s[0].date()}")
    fails += check_calendar(cfg)
    fails += check_closed_dates(cfg, demand, supply)
    fails += _prior_band_check(demand, cfg)
    fails += [m for m in _consistency_residual(demand, cfg) if not m.startswith(ADVISORY)]
    return fails


def advisories(demand, cfg) -> list[str]:
    """Notices that reduce assurance without making a week unscoreable.

    Kept out of `validate()` because a non-empty failure list halts the cycle,
    and halting on "this check is providing less assurance than you think" is
    the over-refusal trap again: it stops the model running over a message about
    the model's own limits. These are reported in the cycle result and carried
    in the state file instead, where an operator can see them every cycle
    without being blocked by them.
    """
    return [m.removeprefix(ADVISORY) for m in _consistency_residual(demand, cfg)
            if m.startswith(ADVISORY)]


def _prior_band_check(demand, cfg, factor: float = 3.0) -> list[str]:
    """Compare each observed quantity against the prior it was elicited from.

    This exists because the consistency residual below cannot be relied on
    alone. That residual compares `handled x AHT / conc / occupancy` against
    `productive_hours` -- and `04` defines occupancy as productive-working over
    productive-available, which makes the identity true BY CONSTRUCTION whenever
    occupancy is derived from those same columns, as most BI layers derive it.
    Measured: with derived occupancy, AHT supplied in minutes instead of seconds
    passes the residual silently. The residual has detection power only when
    occupancy is independently sourced.

    This check has no such dependency. A units error shows up as a 60x
    discrepancy against the elicited prior, and the prior comes from a different
    place entirely -- a person, before the data existed.
    """
    if demand is None:
        return []
    out = []
    for c, ch in cfg["channels"].items():
        g = demand[demand["channel"] == c]
        if g.empty:
            continue
        for col, spec_key, label in (("aht_seconds", "aht_seconds", "AHT"),
                                     ("concurrency_effective", "concurrency", "concurrency"),
                                     ("items_resolved", None, None)):
            if spec_key is None or col not in g or g[col].isna().all():
                continue
            spec = ch.get(spec_key)
            if not isinstance(spec, dict):
                continue
            if "ci" in spec:
                lo, hi = float(spec["ci"][0]), float(spec["ci"][1])
            elif "mu" in spec:
                mid = float(np.exp(spec["mu"]))
                lo = hi = mid
            else:
                continue
            obs = float(g[col].median())
            if obs < lo / factor or obs > hi * factor:
                out.append(
                    f"{c} {label} median {obs:,.4g} is more than {factor:g}x outside its "
                    f"elicited prior [{lo:,.4g}, {hi:,.4g}] — check units (seconds vs "
                    f"minutes) and the column definition before trusting any score")
    return out


def _consistency_residual(demand, cfg, tol: float = 0.05) -> list[str]:
    """Cross-check the columns against each other, not just against a range.

    `realized_required_hours` derives, and correctly refuses to SCORE on, the
    identity

        handled x AHT / concurrency / occupancy_achieved  ==  productive_hours

    because it is circular. Circularity is exactly what makes it a good
    VALIDATION residual: the two sides come from different columns, so they only
    agree if the columns agree with each other.

    Range checks cannot do this. A value can sit inside its physical range, be
    non-blank, belong to a complete row set, and still be wrong by an order of
    magnitude -- AHT supplied in minutes rather than seconds passes every range
    check and understates the requirement by about 80%. This residual catches
    that class: unit errors, upstream double-counts, and a segment zeroed in
    place while its hours stay put.

    It is a CHECK, never an input to the answer.
    """
    need = ["contacts_handled", "aht_seconds", "occupancy_achieved", "productive_hours"]
    if demand is None:
        return []
    missing = [c for c in need if c not in demand]
    if missing:
        # Saying nothing here was the defect: on a file built to the documented
        # minimum the check simply did not run, and reported no opinion, so an
        # operator had no way to know the value-axis check was absent.
        return [ADVISORY + f"consistency residual INACTIVE — {missing} not supplied. The value-axis "
                f"check is not running; a units error or a double-count will not be "
                f"caught by it"]
    d = demand[demand["channel"].isin(
        [c for c, ch in cfg["channels"].items() if ch.get("kind") != "deferrable"])]
    d = d.dropna(subset=need)
    if d.empty:
        return []

    # PER WEEK, not pooled over all history. Pooled, a bad week is diluted by
    # every good one, so the check got weaker the longer the model ran -- the
    # opposite of what a calibration instrument should do. A single bad week in
    # thirteen fell under tolerance; at twenty-six it vanished.
    out, gaps = [], []
    conc_all = d.get("concurrency_effective")
    for wk, g in d.assign(_w=d["date"].map(week_key)).groupby("_w"):
        conc = g["concurrency_effective"].fillna(1.0) if conc_all is not None else 1.0
        implied = (g["contacts_handled"] * g["aht_seconds"] / 3600.0
                   / conc / g["occupancy_achieved"]).sum()
        actual = g["productive_hours"].sum()
        if actual <= 0:
            continue
        gap = implied / actual - 1.0
        gaps.append(gap)
        if abs(gap) > tol:
            out.append(f"consistency residual {gap:+.1%} in {wk} (tolerance {tol:.0%}): "
                       f"handled x AHT / concurrency / occupancy implies {implied:,.0f} "
                       f"productive hours against {actual:,.0f} reported. Check units on "
                       f"aht_seconds, the concurrency definition, and for double-counted "
                       f"contacts")

    # A residual that is identically zero every week means occupancy was derived
    # from the very columns being compared, which makes the identity true by
    # construction and the check worthless. Say so rather than reporting health.
    if len(gaps) >= 3 and max(abs(g) for g in gaps) < 1e-6:
        out.append(ADVISORY + "consistency residual is identically zero every week — "
                   "occupancy_achieved appears to be DERIVED from handled x AHT / "
                   "concurrency / productive_hours, which makes this check a tautology. "
                   "It is providing no assurance. Source occupancy independently from the "
                   "ACD, or rely on the prior-band check instead")
    return out


ADVISORY = "[advisory] "

DAY_NAMES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def operating_days(cfg) -> set[int]:
    """Weekday indices the operation actually runs, from `calendar.operating_days`.

    Defaults to all seven. Without this the pack refused every real operating
    shape it was handed: a Monday-to-Friday operation halted permanently on the
    date-contiguity check, and nothing in the pack mentioned five-day weeks at
    all. A refusal with no documented remedy blocks a deployment exactly as
    effectively as a silent wrong number.
    """
    cal = (cfg or {}).get("calendar") or {}
    days = cal.get("operating_days")
    if not days:
        return set(range(7))
    out = set()
    for d in days:
        key = str(d).strip().lower()[:3]
        if key not in DAY_NAMES:
            raise ValueError(f"calendar.operating_days: unknown day {d!r}")
        out.add(DAY_NAMES.index(key))
    return out


def check_calendar(cfg) -> list[str]:
    """The calendar must agree with the rest of the config, and be believable.

    Declaring five operating days changed what the INTAKE accepted and nothing
    else: `operating_hours_per_week` stayed at 168, the volume priors were
    untouched, and `target_occupancy` kept dividing realized load by 168. A
    five-day deployment therefore ran to completion with every actual in the
    bottom 5% of its own interval and no flag raised — a refusal replaced by a
    silent wrong number, which is the trade this pack exists to refuse.

    Completion is not the bar. The calibration log coming back honest is.
    """
    fails = []
    ops = operating_days(cfg)
    if len(ops) < 7:
        implied = 24.0 * len(ops)
        for c, ch in (cfg.get("channels") or {}).items():
            spec = ch.get("occupancy")
            if not (isinstance(spec, dict) and spec.get("kind") == "erlang_curve"):
                continue
            oh = float(spec.get("operating_hours_per_week", 168))
            if oh > implied * 1.01:
                fails.append(
                    f"calendar declares {len(ops)} operating day(s) but channel {c} "
                    f"spreads load over operating_hours_per_week={oh:g}. At most "
                    f"{implied:g} is consistent. Occupancy, and therefore the whole "
                    f"requirement, is computed against the wrong denominator")
    return fails


def check_closed_dates(cfg, demand, supply) -> list[str]:
    """`closed_dates` suppresses gap detection, so it needs its own guard.

    An outage declared as a closure scored clean and about 13% low, straight
    into the calibration log as evidence. The whole value axis this pack spent
    two rounds hardening was moved into an unvalidated operator-supplied config
    field. A closure is a claim about the world and it should cost something to
    make: it has to fall inside the data span, and it has to actually have no
    data behind it.
    """
    fails = []
    closed = closed_dates(cfg)
    if not closed:
        return fails
    frames = [f for f in (demand, supply) if f is not None and len(f)]
    if not frames:
        return fails
    lo = min(pd.Timestamp(f["date"].min()).normalize() for f in frames)
    hi = max(pd.Timestamp(f["date"].max()).normalize() for f in frames)
    span_days = max((hi - lo).days + 1, 1)
    inside = {d for d in closed if lo <= d <= hi}
    for f, label in ((demand, "daily_demand.csv"), (supply, "daily_supply.csv")):
        if f is None:
            continue
        have = {pd.Timestamp(x).normalize() for x in f["date"].unique()}
        contradicted = sorted(inside & have)
        if contradicted:
            fails.append(
                f"{len(contradicted)} closed_date(s) have rows in {label}, first "
                f"{contradicted[0].date()} — a declared closure with data behind it is "
                f"either a mislabelled operating day or an undeclared change")
    share = len(inside) / span_days
    if share > 0.2:
        fails.append(
            f"{len(inside)} of {span_days} days in the data span are declared closed "
            f"({share:.0%}) — above 20% this stops being a holiday list and starts "
            f"suppressing gap detection wholesale")
    return fails


def closed_dates(cfg) -> set:
    """Dates the operation was deliberately shut — holidays, shutdowns.

    A closed day is DECLARED, not inferred. Declaring it is what distinguishes
    a holiday from a data outage, and the two need opposite responses: one is
    expected and the other is a defect. Previously neither encoding worked —
    omitting the day tripped contiguity, zeroing it tripped the zero check, and
    `04` forbade the only remedy the code would accept.
    """
    cal = (cfg or {}).get("calendar") or {}
    return {pd.Timestamp(d).normalize() for d in (cal.get("closed_dates") or [])}


def expected_dates(cfg, week: str):
    """The dates a given week should carry, given the calendar."""
    # date.fromisocalendar, not a parsed string: pandas does not read "2026-W37-1",
    # and week_key emits ISO year/week, which is not always the calendar year.
    iso_year, iso_week = int(week[:4]), int(week.split("W")[1])
    monday = pd.Timestamp(date.fromisocalendar(iso_year, iso_week, 1))
    ops, closed = operating_days(cfg), closed_dates(cfg)
    return [d for i in range(7)
            for d in [monday + pd.Timedelta(days=i)]
            if d.weekday() in ops and d.normalize() not in closed]


def week_key(d) -> str:
    iso = pd.Timestamp(d).isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def complete_weeks(df, cfg=None) -> list[str]:
    """Weeks carrying every date the calendar expects. Partial weeks never score.

    With no calendar this is all seven days, as before. With one it is the
    operating days minus declared closures, so a five-day operation and a
    holiday week both complete normally instead of never completing at all.
    """
    w = df.assign(_w=df["date"].map(week_key))
    have = w.groupby("_w")["date"].apply(lambda s: {pd.Timestamp(x).normalize()
                                                    for x in s.unique()})
    out = []
    for wk, dates in have.items():
        want = {d.normalize() for d in expected_dates(cfg, wk)} if cfg is not None \
            else None
        if want is None:
            if len(dates) == 7:
                out.append(wk)
        elif want and dates == want:
            # Equality, not issubset. A lower bound let a week reporting mon-sun
            # and a week reporting mon-fri both count as complete under a 5-day
            # calendar, while the reconstruction summed every row present -- the
            # two scored 30% apart against the same forecast.
            out.append(wk)
    return sorted(out)


# Physical ranges for every value the reconstruction reads. A quantity outside
# its range is a data defect, not a small number -- negative concurrency once
# produced 4.1 billion hours through the divisor floor, and a negative AHT
# produced a negative requirement. Both passed validation.
RANGES = {
    "contacts_offered": (0.0, 1e9),
    "contacts_handled": (0.0, 1e9),
    "aht_seconds": (1.0, 36000.0),
    "concurrency_effective": (1.0, 20.0),
    "productive_hours": (0.0, 1e7),
    "occupancy_achieved": (0.01, 1.0),
    "items_resolved": (0.0, 1e9),
}


def assert_reconstructable(demand, cfg, week: str) -> None:
    """Assert the PRECONDITIONS of a reconstruction, rather than probing for
    known failures one column at a time.

    Four rounds of this pack fixed columns that had been found to fail, and each
    round a sibling column failed the same way. Column-by-column auditing closes
    the cases you thought of. These assertions close the properties instead:

      1. ROW-SET IDENTITY  — exactly one row per (date, segment, channel).
         Double-loading an intake file inflated the requirement 88% and the
         supply 100%, and validation was clean.
      2. CONFIG-DATA PARITY — every configured channel and segment actually
         reports. The reconstruction iterates the channels in the DATA, so a
         channel that stops reporting silently removes its whole requirement:
         -33% with nothing raised. A model cannot notice demand that never
         arrives in its own input.
      3. VALUE RANGES — every quantity inside a declared physical range.
      4. COMPLETENESS — no blanks in any column the arithmetic consumes.

    Anything outside these raises `Unscoreable`, which is caught by `score()`
    and reported. This is falsifiable in a way "we probed thirty-one cases" is
    not: to break it you must violate a stated property.
    """
    d = demand[demand["date"].map(week_key) == week]
    if d.empty:
        raise Unscoreable(f"{week}: no demand rows")

    # 1. row-set identity
    key = ["date", "segment", "channel"]
    dup = d.duplicated(subset=key).sum()
    if dup:
        raise Unscoreable(f"{week}: {dup} duplicate (date, segment, channel) row(s) — "
                          f"the file may have been loaded twice")
    want = {x.normalize() for x in expected_dates(cfg, week)}
    have = {pd.Timestamp(x).normalize() for x in d["date"].unique()}
    if want - have:
        missing = sorted(want - have)
        raise Unscoreable(f"{week}: demand missing {len(missing)} expected day(s), "
                          f"first {missing[0].date()} — declare it in "
                          f"calendar.closed_dates if the operation was shut")
    if have - want:
        extra = sorted(have - want)
        raise Unscoreable(f"{week}: demand carries {len(extra)} day(s) the calendar does "
                          f"not expect, first {extra[0].date()} — either the calendar is "
                          f"wrong or the operation ran when it says it was shut")

    # 2. config-data parity, both directions
    want_ch, have_ch = set(cfg["channels"]), set(d["channel"].unique())
    if want_ch - have_ch:
        raise Unscoreable(f"{week}: configured channel(s) absent from the data: "
                          f"{sorted(want_ch - have_ch)}")
    if have_ch - want_ch:
        raise Unscoreable(f"{week}: channel(s) in the data but not in params.yaml: "
                          f"{sorted(have_ch - want_ch)}")
    want_sg, have_sg = set(cfg["segments"]), set(d["segment"].unique())
    if want_sg - have_sg:
        raise Unscoreable(f"{week}: configured segment(s) absent from the data: "
                          f"{sorted(want_sg - have_sg)}")

    # 3 and 4. values present and in range, for the columns each lane consumes
    for c, g in d.groupby("channel"):
        kind = cfg["channels"][c]["kind"]
        needed = ["contacts_offered"]
        if kind == "deferrable":
            # Only demanded when the reconstruction will actually read them.
            # Requiring columns the arithmetic never touches contradicts this
            # function's own stated property, and `04` tells an operator that
            # leaving an unsourced column empty is legitimate.
            if _planned_throughput(cfg["channels"][c]) is None:
                needed += ["items_resolved", "productive_hours"]
        else:
            needed.append("aht_seconds")
        if kind != "deferrable" and _planned_concurrency(cfg["channels"][c]) > 1 + 1e-9:
            needed.append("concurrency_effective")
        for col in needed:
            if col not in g:
                raise Unscoreable(f"{week}: {c} has no {col} column")
            n_na = int(g[col].isna().sum())
            if n_na:
                raise Unscoreable(f"{week}: {c} missing {col} on {n_na} of {len(g)} rows")
            lo, hi = RANGES[col]
            bad = g[(g[col] < lo) | (g[col] > hi)]
            if len(bad):
                raise Unscoreable(f"{week}: {c} has {len(bad)} {col} value(s) outside "
                                  f"[{lo}, {hi}] (min {g[col].min():.4g}, "
                                  f"max {g[col].max():.4g})")


def assert_supply_reconstructable(supply, week: str, cfg=None) -> None:
    """Row-set and value preconditions for the supply side."""
    s = supply[supply["date"].map(week_key) == week]
    if s.empty:
        raise Unscoreable(f"{week}: no supply rows")
    want = {x.normalize() for x in expected_dates(cfg, week)}
    have = {pd.Timestamp(x).normalize() for x in s["date"].unique()}
    if want - have:
        missing = sorted(want - have)
        raise Unscoreable(f"{week}: supply missing {len(missing)} expected day(s), "
                          f"first {missing[0].date()} — declare it in "
                          f"calendar.closed_dates if the operation was shut")
    key = [c for c in ("date", "site", "cohort_id") if c in s]
    if s.duplicated(subset=key).sum():
        raise Unscoreable(f"{week}: duplicate supply rows on {key} — "
                          f"the file may have been loaded twice")
    if "productive_hours" not in s:
        raise Unscoreable(f"{week}: supply has no productive_hours column")
    n_na = int(s["productive_hours"].isna().sum())
    if n_na:
        raise Unscoreable(f"{week}: supply productive_hours blank on {n_na} row(s)")
    lo, hi = RANGES["productive_hours"]
    bad = s[(s["productive_hours"] < lo) | (s["productive_hours"] > hi)]
    if len(bad):
        raise Unscoreable(f"{week}: {len(bad)} supply productive_hours outside [{lo}, {hi}]")
    total = float(s["productive_hours"].sum())
    if total <= 0:
        raise Unscoreable(f"{week}: supply productive_hours totals zero")
    closed = closed_dates(cfg)
    working = s[~s["date"].map(lambda x: pd.Timestamp(x).normalize()).isin(closed)]
    zeroed = int((working["productive_hours"] == 0).sum())
    if zeroed:
        # Zero is inside the declared range, so the range check alone lets a
        # non-reporting day through and scores the week low -- which is the
        # missing-days defect with the rows present and zeroed instead. A day
        # that genuinely delivered nothing has to be stated deliberately, not
        # encoded as a zero among working days.
        raise Unscoreable(
            f"{week}: {zeroed} supply row(s) report zero productive hours on days the "
            f"calendar says were open — if the operation was shut, declare the date in "
            f"calendar.closed_dates; otherwise this is a reporting gap, not a zero")


def _planned_throughput(ch: dict):
    """Planned items per productive hour from params.yaml, or None."""
    spec = ch.get("items_per_productive_hour")
    if isinstance(spec, dict):
        if "mu" in spec:
            return float(np.exp(spec["mu"]))
        if "ci" in spec:
            return float(np.exp(np.mean(np.log(spec["ci"]))))
    return None


def _planned_concurrency(ch: dict) -> float:
    """The concurrency the plan assumed, from params.yaml."""
    spec = ch.get("concurrency", 1.0)
    if isinstance(spec, dict):
        if "mu" in spec:
            return float(np.exp(spec["mu"]))
        if "ci" in spec:
            return float(np.exp(np.mean(np.log(spec["ci"]))))
    return max(float(spec), 1e-6)


def target_occupancy(cfg, channel: str, workload_hours: float, aht: float) -> float:
    """The occupancy the plan was built on, at the realized load.

    Deliberately NOT the achieved occupancy. See `realized_required_hours`.
    """
    spec = cfg["channels"][channel]["occupancy"]
    if isinstance(spec, dict) and spec.get("kind") == "erlang_curve":
        from mc_staffing import occupancy_curve
        a_grid, occ_grid = occupancy_curve(
            float(spec.get("target_sl", 0.80)), float(spec.get("asa_seconds", 20.0)), aht)
        load = workload_hours / float(spec["operating_hours_per_week"])
        return float(np.interp(np.clip(load, a_grid[0], a_grid[-1]), a_grid, occ_grid))
    # A fixed occupancy arrives in either form: elicited {mean, ci}, or {a, b}
    # once `apply_posteriors` has written a learned posterior back. Reading only
    # `mean` raised KeyError on the second cycle of every deployment using the
    # documented fixed-occupancy fallback -- the two headline fixes of the
    # previous round, each correct alone, meeting each other.
    if "a" in spec and "b" in spec:
        return float(spec["a"] / (spec["a"] + spec["b"]))
    return float(spec["mean"])


def realized_required_hours(demand, cfg, week: str) -> float:
    """What the week WOULD have required to serve everything offered at target.

    This is a COUNTERFACTUAL RECONSTRUCTION, and it has to be, for a reason that
    is easy to get wrong -- an earlier version of this function got it wrong.

    The obvious formulation uses handled contacts at ACHIEVED occupancy. That is
    circular. `04-intake-schema.md` defines achieved occupancy as productive-
    working over productive-available, and productive-working is exactly
    handled x AHT / concurrency. So the expression reduces algebraically to the
    productive hours the floor actually delivered. Scored that way, the
    "requirement" can never exceed what was staffed: in an understaffed week
    contacts go unhandled, occupancy rises, and the computed requirement stays
    pinned to delivered hours. The calibration log would then be incapable of
    detecting a demand miss -- the one failure the model exists to price -- while
    appearing perfectly well calibrated.

    So: OFFERED contacts, at the occupancy the plan assumed (or the curve's
    occupancy at the realized load). The assumption being made is explicit --
    that the work offered should have been served at target service -- and it is
    a different quantity from `realized_supply_hours`, not an algebraic
    restatement of it.

    The two scored quantities are still not independent: both are driven by the
    same week. Read their PIT histories together, not as separate evidence.
    """
    assert_reconstructable(demand, cfg, week)
    d = demand[demand["date"].map(week_key) == week]
    total = 0.0
    for c, g in d.groupby("channel"):
        ch = cfg["channels"][c]
        offered = float(g["contacts_offered"].sum())
        if offered <= 0:
            continue

        if ch["kind"] == "deferrable":
            # Planned throughput, for the same reason the interactive lane uses
            # target occupancy: dividing offered work by the throughput the week
            # actually achieved reintroduces the circularity in miniature -- a
            # week that cleared its backlog by working faster would score as
            # having required less. Observed throughput is used only if the
            # config carries no planned figure.
            spec = ch.get("items_per_productive_hour")
            tph = None
            if isinstance(spec, dict):
                if "mu" in spec:
                    tph = float(np.exp(spec["mu"]))
                elif "ci" in spec:
                    tph = float(np.exp(np.mean(np.log(spec["ci"]))))
            if tph is None:
                hrs = float(g["productive_hours"].sum())
                items = float(g.get("items_resolved", pd.Series(dtype=float)).sum())
                tph = (items / hrs) if hrs > 0 and items > 0 else None
            if not tph or tph <= 0:
                # The interactive lane refuses when it cannot reconstruct; this
                # lane used to return a smaller number instead, which is the
                # same asymmetry between the lanes that an earlier round fixed
                # in the opposite direction.
                raise Unscoreable(
                    f"{week}: {c} has no planned items_per_productive_hour and no "
                    f"usable observed throughput")
            total += offered / tph
            continue

        if "aht_seconds" not in g:
            raise Unscoreable(f"{week}: {c} has no aht_seconds column")
        missing = int(g["aht_seconds"].isna().sum())
        if missing:
            # Partial coverage is the dangerous case: dropping the blank rows
            # quietly scores the week on a subset of its own contacts and looks
            # almost right (-0.1% on the demo), which is far harder to notice
            # than a column that is absent altogether.
            raise Unscoreable(
                f"{week}: {c} missing aht_seconds on {missing} of {len(g)} rows")
        wt = g["contacts_offered"].clip(lower=0)
        if wt.sum() <= 0:
            raise Unscoreable(f"{week}: {c} has no offered contacts")
        aht = float((g["aht_seconds"] * wt).sum() / wt.sum())

        # Concurrency falls back to the PLANNED value from params.yaml, never to
        # 1.0. Defaulting to 1.0 silently inflated a chat channel's requirement
        # by the whole concurrency factor -- and it is the one value guaranteed
        # to be wrong for any channel configured with concurrency at all.
        planned_conc = _planned_concurrency(ch)
        conc_col = g.get("concurrency_effective", pd.Series(dtype=float))
        has_obs = len(conc_col) > 0 and conc_col.notna().any()
        if has_obs:
            cc = g.loc[conc_col.notna()]
            cw = cc["contacts_offered"].clip(lower=0)
            conc = (max(float((cc["concurrency_effective"] * cw).sum() / cw.sum()), 1e-6)
                    if cw.sum() > 0 else planned_conc)
        elif planned_conc > 1.0 + 1e-9:
            # A channel the plan treats as concurrent cannot be reconstructed
            # from a file that never measured its concurrency. Falling back to
            # the plan here would score the channel against its own assumption
            # and report a difference of zero, which is worse than not scoring.
            raise Unscoreable(
                f"{week}: {c} is configured with concurrency {planned_conc:.2f} "
                f"but the intake carries no concurrency_effective")
        else:
            conc = planned_conc   # single-session channel; plan and floor agree

        workload = offered * aht / 3600.0 / conc
        occ = target_occupancy(cfg, c, workload, aht)
        if occ > 0:
            total += workload / occ
    return float(total)


def realized_supply_hours(supply, week: str, cfg=None) -> float:
    """Available productive hours for a COMPLETE week of supply data.

    Week completeness was previously checked on the demand frame only, so a
    supply file missing two days scored 28% low with nothing flagged -- and
    because `run_cycle` only ever ran the regime check on required hours, the
    detector was pointed at the other series.
    """
    assert_supply_reconstructable(supply, week, cfg)
    s = supply[supply["date"].map(week_key) == week]
    return float(s["productive_hours"].sum())
