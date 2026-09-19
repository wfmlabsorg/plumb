"""PLUMB deterministic staffing model -- the daily central case.

New in PLUMB; the four modules beside this one come from the CP-WFM-018 pack.
This one deliberately reuses their functions rather than restating the formulas,
because the deterministic plan and the Monte Carlo band must not be able to
disagree about arithmetic they share. See docs/ENGINE.md.

The model:

    interactive   workload_h = contacts x aht_seconds / 3600 / concurrency
    deferrable    workload_h = items / items_per_productive_hour

                  required_h = workload_h / target_occupancy
                  delivered_h = scheduled_h x (1 - shrink_planned - shrink_unplanned)
                  gap_h   = delivered_h - required_h
                  gap_fte = gap_h / (hours_per_head x (1 - shrink))

Three rules, each of which has been got wrong in production systems:

1.  SHRINK ONCE, ON SUPPLY. Demand produces required *productive* hours; supply
    converts heads into productive hours. Both sides speak the same unit. Grossing
    demand up by 1/(1-shrink) and comparing it to a roster that already nets it
    applies shrink twice.

2.  FTE CONVERSION DIVIDES BY PRODUCTIVE HOURS. `hours_per_head x (1 - shrink)`,
    never scheduled hours. The same defect wearing a different hat: dividing by
    37.5 rather than 37.5 x (1 - shrink) understates the gap by the whole shrink
    percentage.

3.  OCCUPANCY IS RESOLVED ON POOLED LOAD. Achievable occupancy is a function of how
    much load is pooled, and load on a channel is a portfolio quantity. Workload is
    summed across segments FIRST, occupancy resolved once for that channel-day, and
    the requirement allocated back by workload share. Resolving it per segment
    overstates the requirement by roughly 9% on the pack's demo config.
"""

from __future__ import annotations

import pandas as pd

import intake


# --------------------------------------------------------------------- grading


def _weakest(*grades: str) -> str:
    """A computed number inherits the weakest grade among its inputs.

    See context/plumb/GRADES.md. Order: M > C > E > A.
    """
    order = {"M": 0, "C": 1, "E": 2, "A": 3}
    return max(grades, key=lambda g: order[g])


def _occupancy_grade(cfg: dict, channel: str) -> str:
    """Occupancy is [E] whenever it rests on params.yaml rather than observation.

    params.yaml holds PRIORS. An erlang_curve occupancy is computed, but computed
    from an asserted target service level and ASA, so it is [E] until this
    operation's own achieved occupancy has been fitted to it. Calling it [C] is
    the most likely way this model would overstate its own confidence.
    """
    spec = cfg["channels"][channel].get("occupancy")
    if isinstance(spec, dict) and "a" in spec and "b" in spec:
        return "C"          # a learned posterior has been written back
    return "E"


# ----------------------------------------------------------------------- model


def _operating_hours_per_day(cfg: dict, channel: str) -> float:
    spec = cfg["channels"][channel].get("occupancy")
    if isinstance(spec, dict) and "operating_hours_per_week" in spec:
        return float(spec["operating_hours_per_week"]) / 7.0
    return 24.0


def workload_hours(row: pd.Series, cfg: dict) -> float:
    """Hours of work that exist, before any occupancy allowance."""
    ch = cfg["channels"][row["channel"]]
    if ch.get("kind") == "deferrable":
        tph = intake._planned_throughput(ch)
        if not tph:
            raise ValueError(
                f"channel {row['channel']} is deferrable but params.yaml declares no "
                "items_per_productive_hour")
        items = row.get("items_resolved")
        if pd.isna(items) or items == 0:
            items = row["contacts_offered"]
        return float(items) / tph

    # Prefer the measured concurrency; fall back to what the plan assumed.
    conc = row.get("concurrency_effective")
    if pd.isna(conc) or not conc:
        conc = intake._planned_concurrency(ch)
    return float(row["contacts_offered"]) * float(row["aht_seconds"]) / 3600.0 / float(conc)


def run(demand: pd.DataFrame, supply: pd.DataFrame, cfg: dict) -> pd.DataFrame:
    """Daily deterministic plan, one row per date x segment x channel."""
    d = demand.copy()
    d["workload_h"] = d.apply(lambda r: workload_hours(r, cfg), axis=1)

    # --- rule 3: resolve occupancy once per channel-day, on POOLED load --------
    pooled = (d.groupby(["date", "channel"])
               .agg(pooled_workload_h=("workload_h", "sum"),
                    aht_median=("aht_seconds", "median"))
               .reset_index())

    occ, req = [], []
    for _, p in pooled.iterrows():
        ch = cfg["channels"][p["channel"]]
        if ch.get("kind") == "deferrable":
            # A deferrable channel has no queue, so no occupancy allowance: its
            # throughput rate already expresses hours per item.
            o = 1.0
        else:
            # target_occupancy() computes erlangs as workload / operating_hours_per_week,
            # so it expects a WEEKLY workload. We hold a daily one. Scaling the day up
            # by 7 gives the same erlangs -- load is a rate, and the ratio is what the
            # curve reads:
            #     daily_workload / hours_per_day  ==  (daily_workload x 7) / hours_per_week
            o = intake.target_occupancy(
                cfg, p["channel"],
                workload_hours=p["pooled_workload_h"] * 7.0,
                aht=float(p["aht_median"]))
        occ.append(o)
        req.append(p["pooled_workload_h"] / o)
    pooled["target_occupancy"] = occ
    pooled["pooled_required_h"] = req

    d = d.merge(pooled[["date", "channel", "target_occupancy",
                        "pooled_workload_h", "pooled_required_h"]],
                on=["date", "channel"], how="left")
    # allocate the pooled requirement back to segments by workload share
    d["required_h"] = d["pooled_required_h"] * (d["workload_h"] / d["pooled_workload_h"])

    # --- supply: rule 1, shrink netted once, here and nowhere else -------------
    s = supply.copy()
    s["shrink_frac"] = ((s["shrink_planned_hours"] + s["shrink_unplanned_hours"])
                        / s["scheduled_hours"])
    daily_supply = (s.groupby("date")
                     .agg(scheduled_h=("scheduled_hours", "sum"),
                          delivered_h=("productive_hours", "sum"),
                          heads=("heads_scheduled", "sum"),
                          shrink_frac=("shrink_frac", "mean"))
                     .reset_index())
    daily_supply["hours_per_head"] = (
        daily_supply["scheduled_h"] / daily_supply["heads"].replace(0, pd.NA))

    d = d.merge(daily_supply, on="date", how="left")

    # Delivered hours are a pooled resource; attribute them by workload share so a
    # per-row gap is meaningful. The day-level gap is the one that decides staffing.
    day_workload = d.groupby("date")["workload_h"].transform("sum")
    d["delivered_h_alloc"] = d["delivered_h"] * (d["workload_h"] / day_workload)

    d["gap_h"] = d["delivered_h_alloc"] - d["required_h"]

    # --- rule 2: FTE divides by PRODUCTIVE hours per head ----------------------
    productive_per_head = d["hours_per_head"] * (1.0 - d["shrink_frac"])
    d["gap_fte"] = d["gap_h"] / productive_per_head

    # --- grades ----------------------------------------------------------------
    d["occupancy_grade"] = d["channel"].map(lambda c: _occupancy_grade(cfg, c))
    d["grade"] = d.apply(
        lambda r: _weakest("M", "M", r["occupancy_grade"]), axis=1)

    cols = ["date", "segment", "channel", "contacts_offered", "aht_seconds",
            "workload_h", "target_occupancy", "required_h", "delivered_h_alloc",
            "gap_h", "gap_fte", "grade"]
    out = d[cols].rename(columns={"delivered_h_alloc": "delivered_h"})
    return out.sort_values(["date", "segment", "channel"]).reset_index(drop=True)


def daily_summary(plan: pd.DataFrame) -> pd.DataFrame:
    """One row per date: the number that actually decides staffing."""
    return (plan.groupby("date")
                .agg(required_h=("required_h", "sum"),
                     delivered_h=("delivered_h", "sum"),
                     gap_h=("gap_h", "sum"),
                     gap_fte=("gap_fte", "sum"))
                .reset_index())
