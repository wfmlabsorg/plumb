# Staffing status — demo

_Issued 2026-09-19 · covering 2026-06-01 to 2026-08-23_

**The plan is short on 61 of 84 days [E]; coverage across the horizon is 0% [C].**

## What changed

- Required productive hours moved from **2,516 h** in the first week to **3,474 h** in the last [C]
- Delivered productive hours held flat at **2,671 h** a week [M] — headcount never moved, so the entire swing is on the demand side
- The book opened in surplus and closed in deficit; the crossover is week **2026-07-06/2026-07-12** [C]

## Where we stand

### Forecast

The volume forecast in the planner runs below actuals. The calibrated forecast-error ratio is carried in `MODEL-STATE.md`; PLUMB does not re-forecast the business, it calibrates how wrong the supplied forecast usually is.

### Staffing

| | Hours | Grade |
|---|---|---|
| Required productive | 35,608 | [E] |
| Delivered productive | 31,739 | [M] |
| **Gap** | **-3,870** | [E] |

Worst day **2026-07-27**: 67 FTE short (282 h) [C]. Worst week **2026-07-27/2026-08-02**: 919 h short [C].

### The range

Coverage across the horizon is **0.0%** [C] — the plan holds in fewer than 1 run in 100. The interactive lane alone covers **1.5%**.

**Both lanes are short** — 2% interactive against 0% pooled. This is not a backlog problem that overtime absorbs. The queue itself is uncovered, and only capacity closes it.

The decision curve — what more heads buys:

| Extra heads | Coverage |
|---|---|
| +0 | 0.0% |
| +20 | 9.4% |
| +40 | 62.8% |
| +60 | 95.2% |
| +80 | 99.7% |

### Calibration

11 closed week(s) scored. The 80% interval contained the actual **82%** of the time [M]. A well-calibrated band sits near 80%: materially above means the band is too wide to be useful, materially below means it is too narrow to be trusted.

## Decision requested

**Approve 50 incremental heads.** Owner: the capacity owner for demo. Date: within two weeks. Without a decision the book runs at 0% coverage and the shortfall compounds — it is already the largest in the final week.

## What would change the answer

- **Measuring occupancy.** It is the largest single assumption in the requirement and it currently rests on the Erlang curve rather than this operation's own achieved occupancy.
- **The three largest variance contributors** are `AHT[voice]` (66%), `txn[NORTH]` (29%), `txn[SOUTH]` (27%). These are a rank-correlation screen, not effect estimates; confirm with `pin_check()` before commissioning any measurement work.
- **A pipeline feed.** Without `pipeline_events.csv` the hiring pipeline is entirely prior, so the supply side of the band is assumption, not observation.

## Limitations

- **Occupancy as a service-level proxy is this model's weakest joint.** Achievable occupancy rises with pooled load — about 83% at 30 erlangs and 97% at 480 — so a fixed value exaggerates both tails. This run uses the Erlang curve.
- **The band is weekly; the plan is daily.** The supply side is a cohort pipeline (requisition, time to fill, class, training, graduation, ramp) and those are weekly mechanisms. A daily band would be false precision.
- **Seven simulation parameters have no extractor** and never learn from actuals. See `docs/KNOWN-GAPS.md`. They are not calibrated and are not described as such.
- **No intraday.** The WFM export is daily; the receiving system applies its own interval curve.

## Knowledge applied

- `aht-step-north-voice.md` [C]
- `contact-rate-drift-north.md` [M]

