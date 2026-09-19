# Known gaps

Honest limits of the engine, recorded at build time rather than discovered later. Most are
inherited from the CP-WFM-018 pack, which declared them itself — that is why the pack was worth
reusing.

**These belong in the report's limitations section, not in a drawer.**

## Parameters that never learn

Seven register parameters are *sampled* by the simulation but have **no extractor**, so no volume
of actuals will move them. They are priors forever until someone writes the extractor:

| Parameter | Why it matters |
|---|---|
| `concurrency` | Chat only. Effective, not licensed. Often the largest single gap in a chat operation. |
| `time_to_fill_weeks` | Sets how fast the supply side can respond at all. |
| `ramp_curve` | Tenure productivity. Wrong here means the hiring plan is wrong. |
| `early_attrition_weekly` | Hazard by tenure band, not a cumulative rate. |
| `forecast_error_weekly` | Carries week-to-week decorrelation. The *systematic* error does learn; this does not. |
| `items_per_productive_hour` | Deferrable throughput. See the circularity note below. |
| `occupancy` (as `erlang_curve`) | Learned only as a diagnostic; not fed back. |

**Never describe these as calibrated.** `MODEL-STATE.md` marks them, and a band resting on them is
`[E]`.

## `items_per_productive_hour` is scored against itself

The deferrable lane's "actual" is *derived from* planned throughput, so the residual is structurally
zero and no evidence can correct it. The deferrable coverage number is therefore softer than the
interactive one, and where the two lanes diverge the interactive lane is the more trustworthy of
the pair.

## `weeks_since_graduation` is collected and unused

It is in the canonical supply schema and nothing reads it. Either wire it to the ramp curve or drop
it from the schema — carrying a column nobody consumes teaches people the schema is decorative.

## No cadence gate

`apply_updates` absorbs whatever batch it is handed, every run. Weekly cadence is a discipline on
the caller, not something the code enforces. Feeding the same week twice would double-count it —
`ingested_through` guards against that for growing files, but not against a deliberate re-feed.

## Occupancy is the weakest joint

Achievable occupancy is a consequence of pooled load, not a property of an operation: roughly 83%
at 30 erlangs and 97% at 480. Holding it fixed removes a stabilizing feedback and **exaggerates
both tails** — the pack measured peak-week P90/P10−1 at 56.9–57.6% fixed against 48.5–49.2% under
the curve.

Preference order: `erlang_curve` refit to the operation's own achieved occupancy > `erlang_curve`
on defaults > a declared fixed Beta. PLUMB defaults to the curve.

`erlang_curve` also assumes a **flat arrival profile**, which biases occupancy up and the
requirement down. Intraday is out of scope.

## Segment independence

Segments are drawn independently unless a correlation matrix is supplied. A shock that hits every
segment at once — weather, an outage, a platform failure — is therefore understated in the tail.

## PLUMB's own gaps, not the pack's

- **The deterministic model and the simulation disagree about grain by design** (daily vs weekly).
  Reconciling them is a resampling step, not a rebuild, but it is not written.
- **Only `.csv` and `.xlsx` are read.** A `.pdf` or `.docx` planner has to be exported first. PLUMB
  says so rather than guessing.
- **`percent_of` and `lookup` resolve against the source row only.** Neither can reference a value
  from another file or a previous row, so a document that expresses shrinkage against a
  month-to-date total rather than the row's own schedule needs that column precomputed.
