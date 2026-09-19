"""The cycle: state, scoring, posterior updates, and the run loop.

Reads and rewrites MODEL-STATE.md. The intake and reconstruction layer it sits
on is `intake.py`.
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime

import numpy as np
import pandas as pd

from intake import (Unscoreable, advisories, complete_weeks, load_intake,
                    realized_required_hours, realized_supply_hours, validate,
                    week_key)
from update import (archive_quantiles, crps_from_quantiles, discount_only_beta,
                    effective_n, interval_hit_from_quantiles, lam_for,
                    pit_from_quantiles, regime_flag, update_beta,
                    update_dirichlet, update_normal_invgamma)


# NB: the fence marker is built rather than written literally. A literal triple
# backtick inside this file would close the very code block that carries it, and
# anything extracting the block would silently truncate here.
FENCE = "`" * 3


STATE_RE = re.compile(FENCE + r"json\s*\n(.*?)\n" + FENCE, re.S)


def read_state(path: str = "MODEL-STATE.md") -> dict:
    with open(path) as fh:
        m = STATE_RE.search(fh.read())
    if not m:
        raise ValueError(f"{path} contains no json state block")
    return json.loads(m.group(1))


def blank_state(revision: int = 0) -> dict:
    return {"revision": revision, "covers_through": None, "lambda_daily": {},
            "posteriors": {}, "forecast_archive": [], "calibration": [],
            "flags": [], "definitions": {}}


def bootstrap_state(cfg, default_lambda: float = 0.98) -> dict:
    """Build revision 0 from the elicited priors in params.yaml.

    Every posterior starts marked `prior_only` with n_obs = 0. The mark is
    removed by the first real observation and by nothing else -- not by age, and
    not by a parameter having been carried a long time.
    """
    from mc_staffing import beta_from_mean_ci, lognormal_from_ci

    st = blank_state(0)

    def beta_node(spec):
        a, b = beta_from_mean_ci(spec["mean"], *spec["ci"])
        return {"family": "beta", "a": a, "b": b, "n_obs": 0, "prior_only": True}

    def nig_node(spec, kappa=5.0, alpha=3.0):
        mu, sigma = lognormal_from_ci(*spec["ci"])
        # beta chosen so E[sigma^2] = beta/(alpha-1) matches the elicited sigma.
        return {"family": "nig", "mu": mu, "kappa": kappa, "alpha": alpha,
                "beta": sigma ** 2 * (alpha - 1), "n_obs": 0, "prior_only": True}

    for sname, seg in cfg["segments"].items():
        st["posteriors"][f"CR[{sname}]"] = beta_node(seg["contact_rate"])
        st["posteriors"][f"fcst_err[{sname}]"] = nig_node(seg["forecast_error"])
        st["posteriors"][f"split[{sname}]"] = {
            "family": "dirichlet",
            "alpha": [float(seg["channel_split"][c]) for c in cfg["channels"]],
            "channels": list(cfg["channels"]), "n_obs": 0, "prior_only": True}

    for c, ch in cfg["channels"].items():
        if ch["kind"] == "deferrable":
            continue
        st["posteriors"][f"AHT[{c}]"] = nig_node(ch["aht_seconds"])

        occ_spec = ch["occupancy"]
        if isinstance(occ_spec, dict) and occ_spec.get("kind") == "erlang_curve":
            # The curve supplies occupancy to the simulation, so there is no
            # occupancy parameter to learn. Achieved occupancy is still worth
            # tracking: it is the empirical test of whether this operation sits
            # on its theoretical curve, and it is what a fitted replacement
            # curve would eventually be built from. Kept as a DIAGNOSTIC -- it
            # is recorded and reported, and it does not feed the model.
            node = beta_node({"mean": 0.80, "ci": [0.60, 0.93]})
            node["role"] = "diagnostic"
            node["note"] = ("occupancy comes from erlang_curve; this tracks "
                            "achieved occupancy to test the curve, and is not a "
                            "model input")
            st["posteriors"][f"occ[{c}]"] = node
        else:
            st["posteriors"][f"occ[{c}]"] = beta_node(occ_spec)

    sup = cfg["supply"]
    for name, key in (("shrink_planned", "shrinkage_planned"),
                      ("shrink_unplanned", "shrinkage_unplanned"),
                      ("req_fill_prob", "requisition_fill_prob"),
                      ("class_fill_rate", "class_fill_rate"),
                      ("graduation_rate", "graduation_rate"),
                      ("attrition_tenured", "tenured_attrition_weekly")):
        st["posteriors"][name] = beta_node(sup[key])

    SLOW = {"attrition_tenured": 0.995, "graduation_rate": 0.99,
            "class_fill_rate": 0.99, "req_fill_prob": 0.99}
    for p in st["posteriors"]:
        st["lambda_daily"][p] = SLOW.get(p, default_lambda)
    st["definitions"] = {"chat_aht": "UNCONFIRMED", "productive_hours": "UNCONFIRMED",
                         "occupancy": "UNCONFIRMED"}
    return st


def frozen_parameters(cfg, state) -> list[str]:
    """Sampled parameters that carry no node in MODEL-STATE.md.

    These neither learn nor age: they sit in params.yaml at whatever was
    elicited, permanently. The pack's prose stated this count as four, then as
    five, and both were wrong -- so it is computed here and reported in the
    state file rather than asserted anywhere. A number that has been wrong
    twice should not be written down a third time.
    """
    have = set(state.get("posteriors", {}))
    configured = []
    for s in cfg.get("segments", {}):
        configured += [f"CR[{s}]", f"fcst_err[{s}]", f"split[{s}]"]
        if cfg["segments"][s].get("forecast_error_weekly"):
            configured.append(f"fcst_err_weekly[{s}]")
    for c, ch in cfg.get("channels", {}).items():
        if ch.get("kind") == "deferrable":
            configured.append(f"tph[{c}]")
            continue
        configured += [f"AHT[{c}]", f"occ[{c}]"]
        if isinstance(ch.get("concurrency"), dict):
            configured.append(f"conc[{c}]")
    sup = cfg.get("supply", {})
    for name, key in (("shrink_planned", "shrinkage_planned"),
                      ("shrink_unplanned", "shrinkage_unplanned"),
                      ("req_fill_prob", "requisition_fill_prob"),
                      ("class_fill_rate", "class_fill_rate"),
                      ("graduation_rate", "graduation_rate"),
                      ("attrition_tenured", "tenured_attrition_weekly"),
                      ("time_to_fill", "time_to_fill_weeks")):
        if key in sup:
            configured.append(name)
    if any(isinstance(x, dict) for x in sup.get("ramp_curve", [])):
        configured.append("ramp_curve")
    if any(isinstance(x, dict) for x in sup.get("early_attrition_weekly", [])):
        configured.append("early_attrition")
    return sorted(p for p in configured if p not in have)


def write_state(state: dict, path: str = "MODEL-STATE.md", readout: str = "",
                cfg=None) -> None:
    """Emit MODEL-STATE.md: rendered tables for humans, JSON block for the code."""
    cal = calibration_summary(state)
    prior_only = [p for p, v in state["posteriors"].items() if v.get("prior_only")]
    diagnostic = [p for p, v in state["posteriors"].items()
                  if v.get("role") == "diagnostic"]
    lines = [f"# MODEL-STATE.md", "",
             f"**Revision:** {state['revision']} · "
             f"**Covers data through:** {state['covers_through'] or '—'} · "
             f"**Emitted:** {date.today()}", ""]
    if prior_only:
        lines += [f"**{len(prior_only)} of {len(state['posteriors'])} parameters are "
                  f"`[prior only]`:** {', '.join(sorted(prior_only))}", ""]
    if cfg is not None:
        frozen = frozen_parameters(cfg, state)
        if frozen:
            lines += [f"**{len(frozen)} sampled parameter(s) carry no state node** and so "
                      f"neither learn nor age: {', '.join(frozen)}. They sit in "
                      f"`params.yaml` at whatever was elicited.", ""]
    if diagnostic:
        lines += [f"**Tracked but not model inputs:** {', '.join(sorted(diagnostic))} — "
                  f"compare against what the occupancy curve predicts at the observed "
                  f"load; a persistent gap means the curve needs refitting.", ""]
    sup = calibration_summary(state, quantity="available_productive_hours")
    lines += ["## Calibration", "",
              "| Metric | Required hours | Available hours |", "|---|---|---|",
              f"| Scored periods | {cal.get('n', 0)} | {sup.get('n', 0)} |",
              f"| 80% interval hit rate | {cal.get('hit80', '—')} | {sup.get('hit80', '—')} |",
              f"| Mean CRPS | {cal.get('crps_mean', '—')} | {sup.get('crps_mean', '—')} |",
              f"| PIT mean (0.5 = unbiased) | {cal.get('pit_mean', '—')} | {sup.get('pit_mean', '—')} |",
              f"| regime_flag | {cal.get('regime') or 'none'} | {sup.get('regime') or 'none'} |", ""]
    if state.get("covers_through") and cal.get("n", 0) == 0:
        lines += ["> **The required-hours log is empty.** Forecasts are being archived and not "
                  "scored. Check Open flags below — this is the state in which the model "
                  "cannot be shown to be wrong, which is the one state it exists to avoid.", ""]
    if state["flags"]:
        lines += ["## Open flags", ""] + [f"- {f}" for f in state["flags"][-10:]] + [""]
    if readout:
        lines += ["## This cycle", "", readout, ""]
    lines += ["## Machine state", "",
              "Do not hand-edit. Parameters move through `cycle.py` or not at all.", "",
              FENCE + "json", json.dumps(state, indent=1, sort_keys=True), FENCE, ""]
    with open(path, "w") as fh:
        fh.write("\n".join(lines))


def score(state: dict, demand, supply, cfg):
    """Score every archived forecast whose target week has now closed.

    Returns (scored, skipped). A tuple rather than a list with a sentinel dict
    in it: `05-daily-protocol.md` tells an operator to call this directly, and a
    sentinel would poison `state["calibration"]` on the next cycle.
    """
    if demand is None:
        return [], ["no demand file"]
    done = complete_weeks(demand, cfg)
    already = {(c["target_week"], c["quantity"]) for c in state["calibration"]}
    new, skipped = [], []

    for fc in state["forecast_archive"]:
        key = (fc["target_week"], fc["quantity"])
        if fc["target_week"] not in done or key in already:
            continue
        try:
            if fc["quantity"] == "required_productive_hours":
                actual = realized_required_hours(demand, cfg, fc["target_week"])
            elif fc["quantity"] == "available_productive_hours":
                if supply is None:
                    raise Unscoreable(f"{fc['target_week']}: no supply file")
                actual = realized_supply_hours(supply, fc["target_week"], cfg)
            else:
                continue
        except Unscoreable as exc:
            skipped.append(f"{fc['quantity']}: {exc}")
            continue
        if not np.isfinite(actual) or actual <= 0:
            skipped.append(f"{fc['quantity']}: {fc['target_week']} computed as {actual}")
            continue
        q = fc["q"]
        new.append({"target_week": fc["target_week"], "quantity": fc["quantity"],
                    "issued": fc["issued"], "actual": round(actual, 2),
                    "pit": round(pit_from_quantiles(q, actual), 4),
                    "crps": round(crps_from_quantiles(q, actual), 2),
                    "hit80": interval_hit_from_quantiles(q, actual, 0.80)})
    return new, skipped


def calibration_summary(state: dict, quantity="required_productive_hours") -> dict:
    rows = [c for c in state["calibration"] if c["quantity"] == quantity]
    if not rows:
        return {"n": 0}
    pits = [r["pit"] for r in rows]
    return {"n": len(rows),
            "hit80": round(float(np.mean([r["hit80"] for r in rows])), 3),
            "crps_mean": round(float(np.mean([r["crps"] for r in rows])), 2),
            "pit_mean": round(float(np.mean(pits)), 3),
            "regime": regime_flag(pits)}


def daily_statistics(demand, supply, events, cfg) -> list[dict]:
    """Turn raw rows into (parameter, successes, trials, kind) records.

    Every rate names the KIND of its denominator so effective_n can be applied.
    Contact rate's denominator is transactions -- a bulk correlated count, not
    independent trials -- and updating it raw collapses the interval on the
    single largest contributor to the model's output variance (44% on the demo,
    over exogenous inputs).
    """
    stats = []
    if demand is not None:
        per_seg = demand.groupby(["date", "segment"]).agg(
            transactions=("transactions", "max"),
            contacts=("contacts_offered", "sum")).reset_index()
        for _, r in per_seg.iterrows():
            if r["transactions"] > 0:
                stats.append({"param": f"CR[{r['segment']}]", "family": "beta",
                              "successes": float(r["contacts"]),
                              "trials": float(r["transactions"]),
                              "kind": "transactions"})

        for (dt, seg), g in demand.groupby(["date", "segment"]):
            # Carry the channel NAMES with the counts. Passing a bare positional
            # list aligned them to whatever order the alpha happened to be
            # stored in at bootstrap, so reordering channels in params.yaml sent
            # each count to the wrong component silently, and adding one
            # truncated the last count through zip.
            names = list(cfg["channels"])
            counts = [float(g.loc[g["channel"] == c, "contacts_offered"].sum())
                      for c in names]
            if sum(counts) > 0:
                stats.append({"param": f"split[{seg}]", "family": "dirichlet",
                              "counts": counts, "channels": names,
                              "trials": sum(counts), "kind": "contacts"})

        for c in cfg["channels"]:
            sub = demand[(demand["channel"] == c) & demand.get(
                "aht_seconds", pd.Series(dtype=float)).notna()]
            vals = [v for v in sub.get("aht_seconds", []) if v > 0]
            if vals:
                stats.append({"param": f"AHT[{c}]", "family": "nig", "obs": vals})

            # Per DATE, not pooled across the batch. Pooling several days into one
            # update makes effective_n treat a fortnight as a single observation
            # and leaves n_obs reporting 1 when twenty days were seen.
            if cfg["channels"][c].get("kind") == "deferrable":
                # Deferrable channels have no occupancy in the model, so an
                # occ[<channel>] statistic had nowhere to land: it created an
                # untyped node in state that never aged and never cleared, and
                # then killed apply_posteriors with KeyError: 'occupancy'.
                continue
            occ = demand[demand["channel"] == c]
            if "occupancy_achieved" in occ and occ["occupancy_achieved"].notna().any():
                for _, o in occ.dropna(subset=["occupancy_achieved"]).groupby("date"):
                    hrs = float(o["productive_hours"].sum())
                    if hrs > 0:
                        worked = float((o["occupancy_achieved"] * o["productive_hours"]).sum())
                        stats.append({"param": f"occ[{c}]", "family": "beta",
                                      "successes": worked, "trials": hrs, "kind": "hours"})

        if "transactions_forecast" in demand:
            f = demand.groupby(["date", "segment"]).agg(
                a=("transactions", "max"), f=("transactions_forecast", "max")).reset_index()
            for seg, g in f.groupby("segment"):
                ratios = [float(x.a / x.f) for x in g.itertuples()
                          if pd.notna(x.f) and x.f > 0 and x.a > 0]
                if ratios:
                    stats.append({"param": f"fcst_err[{seg}]", "family": "nig",
                                  "obs": ratios})

    if supply is not None:
        for _, s in supply.groupby("date"):          # per date, not pooled
            sched = float(s["scheduled_hours"].sum())
            if sched <= 0:
                continue
            for name, col in (("shrink_planned", "shrink_planned_hours"),
                              ("shrink_unplanned", "shrink_unplanned_hours")):
                stats.append({"param": name, "family": "beta",
                              "successes": float(s[col].sum()),
                              "trials": sched, "kind": "hours"})

    if events is not None and "planned_count" in events.columns:
        # `planned_count` is optional in the schema, so its absence must not be
        # a crash -- a sparse file written to the documented minimum used to
        # raise KeyError and kill the whole cycle.
        ev = events.groupby("event")[["count", "planned_count"]].sum(min_count=1)

        # The DENOMINATOR for each rate, pinned. graduation_rate is graduates
        # over class STARTS, never over seats planned: the simulator composes
        # class fill and graduation multiplicatively (`seats x grad`), so using
        # seats planned here would charge the same class-fill shortfall twice.
        DENOM = {"offer_accepted": ("req_fill_prob", "requisitions opened"),
                 "class_started": ("class_fill_rate", "seats planned"),
                 "graduated": ("graduation_rate", "class starts")}
        for e, (param, _) in DENOM.items():
            if e not in ev.index:
                continue
            planned = ev.loc[e, "planned_count"]
            if pd.notna(planned) and planned > 0:
                stats.append({"param": param, "family": "beta",
                              "successes": float(ev.loc[e, "count"]),
                              "trials": float(planned), "kind": "events"})

    if supply is not None and "separations" in supply.columns \
            and "heads_on_roll" in supply.columns:
        # `tenured_attrition_weekly` is a WEEKLY hazard and must be learned
        # weekly. Grouping by date fed it a DAILY rate, which settled roughly
        # 3x low with an interval confidently excluding the truth -- and it errs
        # toward inflating supply, the direction that hides a shortfall.
        #
        # The denominator is agent-weeks at risk: mean heads on roll across the
        # week, not the sum of daily headcounts, which counts the same person
        # seven times and is this pack's own contact-rate trap reproduced inside
        # the extractor that was added to fix the last round's finding.
        sup_w = supply.assign(_w=supply["date"].map(week_key))
        for wk in complete_weeks(supply, cfg):
            s = sup_w[sup_w["_w"] == wk]
            days = s["date"].nunique()
            heads = float(s["heads_on_roll"].sum()) / max(days, 1)   # agent-weeks
            sep = float(s["separations"].sum())
            if heads > 0 and 0 <= sep <= heads:
                stats.append({"param": "attrition_tenured", "family": "beta",
                              "successes": sep, "trials": heads, "kind": "events"})
    return stats


def apply_updates(state: dict, stats: list[dict], as_of: str,
                  default_lambda: float = 0.98, run_date: str | None = None) -> list[str]:
    """Update every posterior; age the ones with no observation today.

    Aging is by ELAPSED DAYS, not per call. A weekly-updated parameter must
    discount by lambda^7, not lambda. Parameters with no data in this batch are
    aged anyway -- time passed for them too, and a posterior that never widens
    while the world moves is the overconfidence this model exists to avoid.
    """
    run_date = run_date or as_of
    notes = []
    seen = set()
    # Aging keys off CALENDAR time since the last run, not off the data date.
    #
    # Keying it off `covers_through` made idle-day aging unreachable: with no
    # new data the data date cannot advance, so the gap was always zero and the
    # cycle reported "posteriors aged only" while aging nothing. That silently
    # canceled the whole point of aging -- a model going stale because no data
    # arrived is exactly when its intervals should widen.
    #
    # Zero still means zero, so running twice in one day changes nothing.
    prev_run = state.get("last_run") or state.get("covers_through")
    gap = 1.0 if not prev_run else float(max(
        (datetime.fromisoformat(run_date).date()
         - datetime.fromisoformat(prev_run).date()).days, 0))

    for s in stats:
        p = s["param"]
        seen.add(p)
        if p not in state["posteriors"]:
            # setdefault wrote an empty {} that had no family, so the ageing
            # loop skipped it forever while it inflated the [prior only] count.
            notes.append(f"{p}: no node in MODEL-STATE.md, skipped "
                         f"(bootstrap does not carry this parameter)")
            continue
        post = state["posteriors"][p]
        lam_d = state["lambda_daily"].get(p, default_lambda)
        lam = lam_for(lam_d, gap)

        if gap == 0 and not s.get("_force"):
            # Same day, already absorbed: apply evidence without aging.
            lam = 1.0
        if s["family"] == "beta":
            if "a" not in post:
                notes.append(f"{p}: no prior in state, skipped")
                continue
            n_eff = effective_n(s["trials"], s["kind"])
            post["a"], post["b"] = update_beta(post["a"], post["b"],
                                               s["successes"], s["trials"],
                                               lam=lam, effective_n=n_eff)
            post["n_obs"] = post.get("n_obs", 0) + 1
        elif s["family"] == "dirichlet":
            if "alpha" not in post:
                notes.append(f"{p}: no prior in state, skipped")
                continue
            order = post.get("channels")
            if order and s.get("channels"):
                if set(order) != set(s["channels"]):
                    notes.append(f"{p}: channel set changed "
                                 f"({sorted(order)} -> {sorted(s['channels'])}), skipped")
                    continue
                idx = {c: i for i, c in enumerate(s["channels"])}
                counts = [s["counts"][idx[c]] for c in order]   # realign by name
            else:
                counts = s["counts"]
            scale = effective_n(s["trials"], s["kind"]) / max(s["trials"], 1e-9)
            post["alpha"] = update_dirichlet(post["alpha"],
                                             [c * scale for c in counts], lam=lam)
            post["n_obs"] = post.get("n_obs", 0) + 1
        elif s["family"] == "nig":
            need = ("mu", "kappa", "alpha", "beta")
            if not all(k in post for k in need):
                notes.append(f"{p}: no prior in state, skipped")
                continue
            post["mu"], post["kappa"], post["alpha"], post["beta"] = \
                update_normal_invgamma(post["mu"], post["kappa"], post["alpha"],
                                       post["beta"], s["obs"], lam=lam)
            post["n_obs"] = post.get("n_obs", 0) + len(s["obs"])
        post["last_update"] = as_of
        post.pop("prior_only", None)

    # Age every unobserved posterior, whatever its family. An earlier version
    # guarded on `"a" not in post`, which silently skipped NIG and Dirichlet
    # nodes -- so AHT and forecast-error intervals never widened with age, which
    # is precisely the overconfidence aging exists to prevent.
    if gap > 0:
        for p, post in state["posteriors"].items():
            if p in seen:
                continue
            lam_d = state["lambda_daily"].get(p, default_lambda)
            lam = lam_for(lam_d, gap)
            fam = post.get("family")
            if fam == "beta" and "a" in post:
                post["a"], post["b"] = discount_only_beta(
                    post["a"], post["b"], lam_d, gap)
            elif fam == "dirichlet" and "alpha" in post:
                post["alpha"] = [1 + lam * (a - 1) for a in post["alpha"]]
            elif fam == "nig" and "kappa" in post:
                post["kappa"] = lam * post["kappa"]
                post["alpha"] = lam * post["alpha"]
                post["beta"] = lam * post["beta"]
            else:
                continue
            notes.append(f"{p}: no observation, aged {gap:.0f} day(s) only")
    return notes


def archive_forecast(state: dict, res, issued: str, first_week_start: str,
                     weeks: int = 4) -> None:
    """Store a quantile grid for the next `weeks` weeks, both quantities.

    Only the near horizon is archived. Weeks further out will be re-forecast
    several times before they close, and storing them all would bloat the state
    file without adding anything scoreable sooner.
    """
    start = pd.Timestamp(first_week_start)
    for w in range(min(weeks, res.demand.shape[1])):
        wk = week_key(start + pd.Timedelta(weeks=w))
        for name, arr in (("required_productive_hours", res.demand[:, w]),
                          ("available_productive_hours", res.supply[:, w])):
            state["forecast_archive"] = [
                f for f in state["forecast_archive"]
                if not (f["target_week"] == wk and f["quantity"] == name)]
            state["forecast_archive"].append(
                {"issued": issued, "target_week": wk, "quantity": name,
                 "q": [round(float(x), 2) for x in archive_quantiles(arr)]})


def prune_archive(state: dict, keep_weeks: int = 26) -> None:
    """Drop scored forecasts older than the calibration window."""
    scored = {(c["target_week"], c["quantity"]) for c in state["calibration"]}
    keep = sorted({f["target_week"] for f in state["forecast_archive"]})[-keep_weeks:]
    state["forecast_archive"] = [
        f for f in state["forecast_archive"]
        if f["target_week"] in keep or (f["target_week"], f["quantity"]) not in scored]
    # two scored quantities per week, so keep_weeks x 2 rows
    state["calibration"] = state["calibration"][-(keep_weeks * 2):]


def apply_posteriors(cfg: dict, state: dict) -> dict:
    """Push learned posteriors back into a copy of the config, for step 6.

    Without this the pack's central claim -- parameters move on evidence, not on
    argument -- is a manual splice the operator has to invent every cycle.

    Nodes marked `role: diagnostic` are SKIPPED. Achieved occupancy under an
    `erlang_curve` is tracked to test the curve, not to feed the model; writing
    it back would silently replace the curve with a fixed occupancy and undo the
    mechanism it exists to validate.
    """
    import copy
    from update import lognormal_params

    cfg = copy.deepcopy(cfg)
    applied, skipped = [], []

    for name, post in state.get("posteriors", {}).items():
        if post.get("role") == "diagnostic":
            skipped.append(name)
            continue
        fam = post.get("family")
        target = None
        if name.startswith("CR[") and name[3:-1] in cfg["segments"]:
            target = cfg["segments"][name[3:-1]]["contact_rate"]
        elif name.startswith("fcst_err[") and name[9:-1] in cfg["segments"]:
            target = cfg["segments"][name[9:-1]]["forecast_error"]
        elif name.startswith("AHT[") and name[4:-1] in cfg["channels"]:
            target = cfg["channels"][name[4:-1]]["aht_seconds"]
        elif name.startswith("occ[") and name[4:-1] in cfg["channels"]:
            target = cfg["channels"][name[4:-1]]["occupancy"]
        elif name.startswith("split[") and name[6:-1] in cfg["segments"]:
            seg = cfg["segments"][name[6:-1]]
            order = post.get("channels") or list(cfg["channels"])
            seg["channel_split"] = {c: float(a) for c, a
                                    in zip(order, post["alpha"])}
            applied.append(name)
            continue
        else:
            target = {"shrink_planned": ("supply", "shrinkage_planned"),
                      "shrink_unplanned": ("supply", "shrinkage_unplanned"),
                      "req_fill_prob": ("supply", "requisition_fill_prob"),
                      "class_fill_rate": ("supply", "class_fill_rate"),
                      "graduation_rate": ("supply", "graduation_rate"),
                      "attrition_tenured": ("supply", "tenured_attrition_weekly"),
                      }.get(name)
            target = cfg["supply"][target[1]] if target else None

        if target is None or not isinstance(target, dict):
            skipped.append(name)
            continue
        if fam == "beta" and "a" in post:
            target.clear(); target.update({"a": post["a"], "b": post["b"]})
            applied.append(name)
        elif fam == "nig" and "mu" in post:
            mu, sigma = lognormal_params(post["mu"], post["kappa"],
                                         post["alpha"], post["beta"])
            target.clear(); target.update({"mu": mu, "sigma": sigma})
            applied.append(name)
        else:
            skipped.append(name)

    cfg["_posteriors_applied"] = applied
    cfg["_posteriors_skipped"] = skipped
    return cfg


def run_cycle(directory: str, cfg, state_path: str = "MODEL-STATE.md",
              as_of: str | None = None, run_date: str | None = None) -> dict:
    """Steps 1-5 and 8. Returns a report; does not itself re-run the model.

    `as_of` is the last DATA date; `run_date` is the calendar day the cycle is
    run, defaulting to today. They are separate on purpose: evidence is bounded
    by the data, aging is bounded by the calendar, and conflating them means a
    model that never widens while no data arrives.
    """
    state = read_state(state_path)
    demand, supply, events = load_intake(directory, cfg)
    as_of = as_of or str(demand["date"].max().date())
    run_date = run_date or str(date.today())

    fails = validate(demand, supply, cfg)
    if fails:
        return {"as_of": as_of, "halted": True, "validation_failures": fails,
                "advisories": advisories(demand, cfg)}
    advice = advisories(demand, cfg)
    for a in advice:
        line = f"{as_of}: {a}"
        if line not in state["flags"]:
            state["flags"].append(line)

    # Only dates not already absorbed may update a posterior. The intake files
    # grow -- a daily cycle points at the same directory every day -- so without
    # this the same evidence is applied again on every run and the posterior
    # concentrates on nothing but repetition. Scoring, by contrast, reads the
    # FULL history: it needs completed weeks, and `score` already skips any
    # (week, quantity) pair it has recorded before.
    ingested = state.get("ingested_through")
    if ingested:
        cut = pd.Timestamp(ingested)
        fresh = [None if d is None else d[d["date"] > cut]
                 for d in (demand, supply, events)]
        if all(d is None or d.empty for d in fresh):
            new_demand, new_supply, new_events = None, None, None
        else:
            new_demand, new_supply, new_events = fresh
    else:
        new_demand, new_supply, new_events = demand, supply, events

    scored, unscored = score(state, demand, supply, cfg)
    state["calibration"].extend(scored)
    cal = calibration_summary(state)
    # Check the regime on BOTH scored series. Running it on required hours only
    # left the available-hours PIT unmonitored, which is where a supply-data
    # problem shows up.
    cal_sup = calibration_summary(state, quantity="available_productive_hours")

    for label, summ in (("required", cal), ("available", cal_sup)):
        if summ.get("regime"):
            state["flags"].append(
                f"{as_of}: regime_flag={summ['regime']} on {label} hours — seven of the "
                f"last ten actuals in one tail. Surface before updating further; "
                f"consider lowering lambda.")
    if unscored:
        msg = f"{len(unscored)} forecast(s) could not be scored: " + "; ".join(unscored[:4])
        if len(unscored) > 4:
            msg += f"; and {len(unscored) - 4} more"
        line = f"{as_of}: {msg}"
        # Do not re-append an identical flag every cycle; ten repeats of one
        # message used to evict every other flag from the rendered list.
        if line not in state["flags"]:
            state["flags"].append(line)

    if new_demand is None:
        notes = [f"no dates after {ingested} — nothing new to absorb"]
        notes += apply_updates(state, [], as_of, run_date=run_date)
    else:
        notes = apply_updates(
            state, daily_statistics(new_demand, new_supply, new_events, cfg), as_of,
            run_date=run_date)
    state["revision"] += 1
    state["covers_through"] = as_of
    state["ingested_through"] = as_of
    state["last_run"] = run_date
    prune_archive(state)

    return {"as_of": as_of, "run_date": run_date, "halted": False,
            "revision": state["revision"], "scored": scored, "unscored": unscored,
            "advisories": advice, "calibration": cal, "calibration_supply": cal_sup,
            "update_notes": notes, "state": state}
