# PLUMB Mental Models

## The Two-Sided Model

The structure everything else hangs from. Both sides end in **productive hours**, which is what
makes them comparable.

```
DEMAND                                    SUPPLY

transactions                              requisitions
   × contact rate                            → time to fill
   → contacts                                → class starts
   × channel split                           → graduation
   × AHT ÷ concurrency                       → heads
   → workload hours                       × scheduled hours per head
   ÷ target occupancy                     × ramp(weeks since graduation)
   → REQUIRED PRODUCTIVE HOURS            × (1 − shrinkage)
                                          → DELIVERED PRODUCTIVE HOURS

            gap = delivered − required
            coverage = P(delivered ≥ required)
```

**Workload hours** are the hours of work that exist. **Productive hours** are the hours people
must be logged in and available to absorb that work, idle time included. Dividing by occupancy is
what converts one into the other, and it is the only place service level enters the demand side.

## The Grade Ladder

```
[M] Measured   read from data, definition cited
[C] Computed   formula stated, inherits the weakest input grade
[E] Estimated  range and assumption stated
[A] Asserted   one source; never load-bearing alone
```

Anything carried across a platform, channel or vendor change drops to `[A]` until this operation
measures it. A benchmark from another book is `[A]`, however confidently it was offered.

## Pearl's Ladder of Causation

| Rung | Level | Question | In this domain |
|------|-------|----------|----------------|
| 1 | Association | What do I observe? | "AHT rose in the same week the vendor cohort went live" |
| 2 | Intervention | What happens if I do X? | "Adding eight heads raises coverage from 45% to 62%" |
| 3 | Counterfactual | What would have happened? | "Without the training pull, service would have held" |

**Rule:** BlackBelt operates at Rung 1. CausalAnalyst operates at Rungs 2–3. A Rung 1 finding is
never presented as causal.

## Deterministic vs Probabilistic

| | Deterministic | Probabilistic |
|---|---|---|
| Grain | Daily | Weekly |
| Answers | "What does the plan require?" | "How likely is the plan to hold?" |
| Output | Required hours, gap, FTE | P10/P50/P90, coverage, decision curve |
| Fails when | Inputs vary and the mean is not the mode | Parameters are uncalibrated |
| Cost | Instant | Seconds |

They are not alternatives. The deterministic number is the thing people argue with; the band is
what stops them betting the quarter on it.

## The Flaw of Averages

A plan built on average volume, average AHT and average shrinkage is not the average plan. Because
the staffing response is convex, the mean of the outputs exceeds the output of the means — and the
gap widens exactly when variance is highest. This is why a single deterministic run understates
risk even when every input is correct.

## Value of Information

Gaps are ranked by **variance contribution per unit of effort to obtain**, not by how badly they
are missed. A parameter that drives 40% of shortfall variance and takes a day to measure outranks
one that drives 5% and takes a quarter. Confirm the top few by pinning them in the simulation
before asking anyone to go collect data.

## The Algorithm

**Current State → Ideal State via Verifiable Iteration**

OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN

Define success criteria before executing. Verify results. Extract learnings.
Full documentation: `~/plumb/ALGORITHM.md`

## The Path

```
INTAKE → INGEST → MODEL → ANALYZE (optional) → REPORT
                              ↑
                    invoked by a question,
                    never by a schedule
```

One human checkpoint, before REPORT publishes.
