# PLUMB Mission

## Purpose

Turn a planner document into a staffed plan with a defensible range around it.

## Core Mission

PLUMB exists because the two halves of this problem are usually solved separately and badly. The
deterministic half — volume times handle time over occupancy, netted against delivered hours —
lives in a spreadsheet nobody can audit. The probabilistic half either does not exist, or lives in
a simulation model that no planner document can feed.

PLUMB joins them. One ingestion path, one set of arithmetic, one report that carries both the
central case and the band around it.

## What This Means

1. **Any planner document, one canonical shape.** A month-to-date sheet, a daily planner, a vendor
   export — each gets a mapping file written once and reused forever. The mapping is the memory of
   how that source is shaped, and it is reviewable.

2. **One source of truth for the arithmetic.** The deterministic model and the Monte Carlo band
   share the same occupancy curve, the same shrink convention, the same definitions. Two
   implementations of the same formula diverge silently, and silent divergence is worse than a
   crash.

3. **The range is part of the answer.** A point estimate of required staff is a coin flip dressed
   as a plan. Every recommendation carries its coverage probability.

4. **Learning without re-forecasting.** Somebody else owns the volume forecast. PLUMB calibrates
   how wrong it usually is, and updates that calibration as actuals arrive.

5. **Two destinations.** The same model feeds a WFM system that will explode it into intervals,
   and an executive who needs to know where staffing stands and what decision is being asked for.

## Non-Goals

- PLUMB is not a forecasting system. It calibrates a forecast; it does not produce one.
- PLUMB does not do intraday. Interval shape belongs to the WFM system downstream.
- PLUMB is not a general-purpose assistant, and not a consulting engine — that is CASE.
- PLUMB does not replace the planner. It removes the arithmetic, not the judgment.
