# PLUMB Goals

## Primary Objectives

### 1. Ingest Any Planner Document Without Guessing
- A mapping file per source shape, written once, reviewed by a human, reused thereafter
- Sparse input is legal: model on what exists
- Every unfilled column named in the gap register, never silently defaulted
- Validation runs before any number is computed

### 2. Produce a Deterministic Plan Anyone Can Audit
- Required productive hours, delivered productive hours, gap in hours and FTE
- Shrinkage applied once, on the supply side
- Every formula stated; every number graded
- Reproducible from the canonical CSVs alone

### 3. Put an Honest Band Around It
- Demand and supply drawn together so correlation survives
- Coverage probability per week and across the horizon
- A decision curve: how many more heads buys how much coverage
- The interactive/deferrable split, so backlog is not mistaken for queue failure

### 4. Learn From Actuals Without Re-Forecasting
- Calibrate the forecast error ratio, not the forecast
- Bayesian updating with a forgetting factor, so old regimes fade
- Evidence discounted by effective sample size
- Score every forecast once its week closes: PIT, CRPS, interval hit

### 5. Deliver to Two Audiences in One Run
- A WFM load file the downstream system can explode into intervals
- An answer-first executive report where every number carries a grade

## Success Metrics

| Metric | Target |
|--------|--------|
| Ungraded numbers reaching a report | 0 |
| Planner documents ingestible without code changes | 100% (mapping only) |
| Truth inside the P10–P90 band, on synthetic validation | ≥ 80% of weeks |
| Unfilled canonical columns named in the gap register | 100% |
| Staffing recommendations carrying a coverage probability | 100% |
| Known limitations stated in the report rather than buried | 100% |
