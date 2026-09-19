"""Does the deterministic model recover the three effects planted in the synthetic world?

    python3 sim/verify-recovery.py

Run after `bun run sim/generate.ts`, `run.ts ingest` and `run.ts model`. Ground truth
lives in sim/GROUND-TRUTH.md and the model is never shown it -- these checks read the
model's own output and ask whether the planted mechanisms came back out.

The last check is the one that matters. On days 57-58 a training pull removes a third of
productive hours while demand is unchanged. Every dashboard in the world reads that day as
a demand spike. A staffing model that does the same is worse than no model, because it
will recommend hiring to fix a scheduling problem.
"""
import pandas as pd, pathlib
R = pathlib.Path.home() / "projects/plumb"
plan = pd.read_csv(R / "books/demo/03-model/deterministic.csv", parse_dates=["date"])
plan["day"] = (plan.date - pd.Timestamp("2026-06-01")).dt.days + 1

_failures = []


def band(lbl, ok, detail):
    if not ok:
        _failures.append(lbl)
    print(f"  {'PASS' if ok else 'FAIL'}  {lbl:<52} {detail}")

print("\nGROUND-TRUTH RECOVERY\n" + "=" * 78)

# --- effect 1: AHT level shift, NORTH voice, from day 43, 1.40x --------------
nv = plan[(plan.segment == "NORTH") & (plan.channel == "voice")]
before = nv[nv.day < 43].aht_seconds.mean()
after  = nv[nv.day >= 43].aht_seconds.mean()
band("effect 1: NORTH voice AHT shift recovered at 1.40x",
     abs(after / before - 1.40) < 0.03, f"{after/before:.2f}x  ({before:.0f}s -> {after:.0f}s)")

# the shift must show up in REQUIRED HOURS, not just in the input column
rh_before = nv[nv.day < 43].required_h.mean()
rh_after  = nv[(nv.day >= 43) & (nv.day < 57)].required_h.mean()   # exclude the shrink spike
band("effect 1: it moves required hours, not just the input",
     rh_after / rh_before > 1.25, f"required/day {rh_before:.0f}h -> {rh_after:.0f}h "
     f"({rh_after/rh_before:.2f}x)")

# --- effect 2: contact-rate drift, NORTH only --------------------------------
d = pd.read_csv(R / "books/demo/02-canonical/daily_demand.csv", parse_dates=["date"])
d["day"] = (d.date - pd.Timestamp("2026-06-01")).dt.days + 1
def cr(seg, lo, hi):
    s = d[(d.segment == seg) & (d.day >= lo) & (d.day < hi)]
    tx = s[s.channel == "voice"].groupby("day").transactions.first().sum()
    return s.contacts_offered.sum() / tx
n_early, n_late = cr("NORTH", 1, 29), cr("NORTH", 71, 85)
s_early, s_late = cr("SOUTH", 1, 29), cr("SOUTH", 71, 85)
band("effect 2: NORTH contact rate drifts 0.42 -> 0.55",
     abs(n_early - .42) < .02 and abs(n_late - .55) < .02, f"{n_early:.3f} -> {n_late:.3f}")
band("effect 2 control: SOUTH contact rate stays flat",
     abs(s_late - s_early) < .02, f"{s_early:.3f} -> {s_late:.3f}")

# the composition trap: book-level rate understates NORTH's move
b_early = d[d.day < 29].contacts_offered.sum() / d[(d.day < 29) & (d.channel=="voice")].groupby(["day","segment"]).transactions.first().sum()
b_late  = d[d.day >= 71].contacts_offered.sum() / d[(d.day >= 71) & (d.channel=="voice")].groupby(["day","segment"]).transactions.first().sum()
band("effect 2 trap: book-level rate understates the segment move",
     (b_late/b_early - 1) < (n_late/n_early - 1),
     f"book +{(b_late/b_early-1)*100:.0f}% vs NORTH +{(n_late/n_early-1)*100:.0f}%")

# --- effect 3: supply break on days 57-58 that must NOT read as demand -------
day = plan.groupby("day").agg(required_h=("required_h","sum"),
                              delivered_h=("delivered_h","sum"),
                              gap_fte=("gap_fte","sum")).reset_index()
spike = day[day.day.isin([57, 58])]
ref   = day[day.day.isin([50, 51, 64, 65])]          # same weekdays, +/- 1 week
band("effect 3: delivered hours collapse on days 57-58",
     spike.delivered_h.mean() / ref.delivered_h.mean() < 0.75,
     f"{spike.delivered_h.mean():.0f}h vs {ref.delivered_h.mean():.0f}h "
     f"({(1-spike.delivered_h.mean()/ref.delivered_h.mean())*100:.0f}% fall)")
band("effect 3 THE KEY TEST: required hours do NOT spike (supply break, not demand)",
     abs(spike.required_h.mean() / ref.required_h.mean() - 1) < 0.10,
     f"required {spike.required_h.mean():.0f}h vs {ref.required_h.mean():.0f}h "
     f"({spike.required_h.mean()/ref.required_h.mean():.2f}x)")

print("=" * 78)
print(f"  {7 - len(_failures)}/7 recovery checks pass")
print()

import sys
sys.exit(1 if _failures else 0)
