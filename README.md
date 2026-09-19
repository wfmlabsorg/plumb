# PLUMB — Deterministic + Probabilistic Staffing Engine

**PAI v2.0 architecture · TypeScript on bun, with one Python island for the math**

PLUMB takes a planner document — a month-to-date sheet, a daily planner, whatever shape it arrives
in — and returns a deterministic staffing model, a Monte Carlo range around it, and reports an
executive or a workforce management system can act on.

A plumb line gives you one number and an honest sense of how far off vertical you might be. That
is the whole product.

## Lineage

PLUMB is HORIZON forked back toward CASE.

**HORIZON** proved the planner-ecosystem idea and was too heavy to operate: 11 agents, 10 versioned
ledgers per book, 4 clocks, ~3,600 lines of clock machinery, and a committed demo of 119 daily
notes. It passed its own adversarial review at 4.1/5 — the work was sound. The surface area was a
demo artifact, not something you drop a file into on a Monday.

**CASE** is the opposite: 5 agents, 6 phase gates, a documented engagement folder, nothing else.
It is operational because it is small.

PLUMB keeps HORIZON's one genuinely load-bearing convention — **every number carries a grade** —
and drops the ledgers, the clocks, the question register and the gate machinery. The biggest
single change is that **analysis is pulled by a question rather than pushed by a schedule**.
HORIZON's Scout proposed 39 event candidates over 119 days; no planner reads that, which is the
same as producing none.

## Architecture

```
                        The Algorithm
     OBSERVE -> THINK -> PLAN -> BUILD -> EXECUTE -> VERIFY -> LEARN

    ┌──────────────────────────────────────────────────────────────┐
    │                       PLUMB Engine                           │
    │                                                              │
    │   planner.csv ──► DataEngineer ──► 02-canonical/             │
    │                   mappings/<source>.yaml      daily_demand   │
    │                   + intake.validate()         daily_supply   │
    │                                               INTAKE-GAPS    │
    │                                                              │
    │   canonical ──► Modeler ──► deterministic plan (daily)       │
    │                 contacts x AHT / 3600 / occupancy = req hrs  │
    │                 heads x hrs x (1 - shrink)     = supply hrs  │
    │                                                              │
    │   canonical + params ──► Simulator ──► weekly band           │
    │                 P10/P50/P90, P(supply >= demand)             │
    │                 Bayesian update of MODEL-STATE from actuals  │
    │                                                              │
    │   both ──► StrategySynthesizer ──► exec report               │
    │       └──► exports/ ──────────────► WFM-loadable CSV         │
    │                                                              │
    │   BlackBelt      on demand: variance, accuracy, SPC          │
    │   CausalAnalyst  on demand: only when a DAG is required      │
    │   Coordinator    phase state, handoffs, human checkpoints    │
    └──────────────────────────────────────────────────────────────┘
```

## Agent team (7, against HORIZON's 11)

| Agent | Specialty | Rung | Phase |
|---|---|---|---|
| **Coordinator** | Phase state, routing, handoffs, checkpoints | — | all |
| **DataEngineer** | Planner doc → canonical CSVs; validation; gap register | — | INGEST |
| **Modeler** | Deterministic daily plan: required, delivered, gap, FTE | — | MODEL |
| **Simulator** | Weekly band; Bayesian updating of `MODEL-STATE.md` | — | MODEL |
| **BlackBelt** | Variance decomposition, forecast accuracy, SPC | 1 | ANALYZE |
| **CausalAnalyst** | DAG, identifiability, counterfactuals | 2–3 | ANALYZE |
| **StrategySynthesizer** | Exec report, recommendation with confidence | — | REPORT |

BlackBelt and CausalAnalyst are **off the default path**. Most days the job is
INGEST → MODEL → REPORT.

## Quick start

```bash
bun install

bun run sim/generate.ts                            # build the synthetic world (10 checks)
bun run Tools/run.ts ingest   --book demo          # planner docs -> canonical, validated
bun run Tools/run.ts model    --book demo          # the deterministic daily plan
bun run Tools/run.ts simulate --book demo --learn  # learn from actuals, then draw the band
bun run Tools/run.ts report   --book demo          # exec report + WFM export

python3 sim/verify-recovery.py                     # did the model recover the planted truth?
```

`--learn` replays the book week by week: absorb the week's evidence, score the forecast issued for
it, update the posteriors, issue the next forecast. Without it the simulation runs on priors.

## The worked example

`books/demo/` carries a synthetic 12-week world — 2 segments, 3 channels, one cohort — with three
planted mechanisms and a ground truth in `sim/GROUND-TRUTH.md` that the model is never shown.

The source documents are written **deliberately messy**: two title rows above the header, AHT in
minutes, shrinkage as a percentage of schedule, quoted thousands separators, a RAG column and an
owner column. A generator that emitted canonical CSVs would prove nothing about the mapping layer.

### What the run produces

```
INGEST     504 demand rows, 84 supply rows, 13 of 13 demand columns filled
           VALIDATION: PASS          2 gaps registered
MODEL      required 35,608 h [E] · delivered 31,739 h · short on 61 of 84 days
           Jun +349 h   Jul -1,765 h   Aug -2,454 h
SIMULATE   13 of 16 parameters learned · 22 weeks scored · coverage 0.0% [E]
REPORT     "The plan is short on 61 of 84 days [E]" · decision: approve 50 heads
```

### What it recovers — `sim/verify-recovery.py`, 11/11

| Check | Result |
|---|---|
| AHT level shift, NORTH voice | **1.40×** recovered (419s → 587s) |
| …and it moves *required hours*, not just the input | 89 h/day → 142 h/day (**1.60×**) |
| Contact-rate drift, NORTH | **0.420 → 0.547** against a planted 0.42 → 0.55 |
| Control: SOUTH contact rate | **0.300 → 0.301** — held, as planted |
| The composition trap | book-level **+14%** vs NORTH **+30%** |
| Supply break, days 57–58: delivered hours | **33% fall** |
| **…and required hours do NOT spike** | **0.98×** — a supply break, not a demand break |
| Learned `CR[NORTH]` posterior | **0.5475** against a planted 0.55 |
| Learned `CR[SOUTH]` posterior | **0.3015** against a planted 0.30 |
| Pipeline parameters stay `prior_only` | 3 of 16 — no `pipeline_events.csv` to learn from |
| **Calibration: 80% interval hit rate** | **82%** across 11 scored weeks |

The seventh row is the one that matters. On days 57–58 a training pull removes a third of
productive hours while demand is unchanged. Every dashboard reads that as a demand spike. A
staffing model that agrees is worse than no model, because it recommends hiring to fix a scheduling
problem.

The last row is the test of the probabilistic layer: a band that always contains the truth is as
useless as one that never does. 82% against a nominal 80% is the band being honest about itself.

## The three rules

**1. Every number carries a grade.** `[M]` measured · `[C]` computed, formula stated · `[E]`
estimated, range stated · `[A]` asserted, one source, never load-bearing alone. A computed number
inherits the weakest input grade. Anything carried across a platform, channel or vendor change
drops to `[A]` until measured here. No ungraded number reaches a report.

**2. Shrinkage is applied once, on the supply side.** Demand produces required *productive* hours;
supply converts heads into productive hours. Both sides speak the same unit. Grossing demand up by
`1/(1−shrink)` and comparing it to a roster that already nets it applies it twice — and because
shrink is sampled, the error is largest in the draws that decide the plan. The same defect wears a
second hat in the FTE conversion, which divides by `hours_per_head × (1 − shrink)`, never by
scheduled hours.

**3. The deterministic number is never the answer on its own.** A point estimate of required staff
is a coin flip dressed as a plan.

## Repository layout

```
plumb/
├── CLAUDE.md          identity, principles, phase table, agent routing
├── ALGORITHM.md       the universal problem-solving framework
├── agents/            7 agent definitions
├── context/plumb/     6 standards: grades, schema, mapping, gaps, answer-first, checkpoints
├── skills/            10 analytical skills
├── hooks/             session and security hooks
├── Tools/
│   ├── run.ts         the CLI — ingest | model | simulate | report
│   ├── map.ts         the mapping engine
│   └── engine/        THE PYTHON ISLAND — all staffing math (docs/ENGINE.md)
├── docs/              ENGINE.md, KNOWN-GAPS.md
├── books/<client>/    the working unit
└── sim/               generator, ground truth, recovery verification
```

## Book structure

```
books/<client>/
├── 00-profile/     client, channels, targets, cohorts; params.yaml
├── 01-source/      planner documents as received        (never committed)
├── mappings/       <source>.yaml, written once per document shape
├── 02-canonical/   daily_demand.csv, daily_supply.csv,
│                   pipeline_events.csv, INTAKE-GAPS.md
├── 03-model/       deterministic.csv, simulation.json, MODEL-STATE.md
├── 04-knowledge/   graded notes, one fact each
├── 05-reports/     the exec report
└── exports/        wfm-requirement.csv
```

Flat files. A re-pull overwrites. Provenance lives in the grade on the number, not in a version
tree — that was HORIZON's answer and it cost ten ledgers to maintain.

## Ingesting a real planner document

1. Drop it in `books/<book>/01-source/`.
2. Write `books/<book>/mappings/<source>.yaml` — see `context/plumb/MAPPING-CONVENTION.md`.
   **Never invent a mapping at run time.** Guessing at column meanings produces numbers nobody can
   defend six weeks later.
3. `bun run Tools/run.ts ingest --book <book> --source <source>`
4. **Read `02-canonical/INTAKE-GAPS.md` before reading any model output.** The gaps are the
   interesting half.

The mapping file is the memory of how that source is shaped. Written once, reviewed by a human,
deterministic thereafter.

## The Python island

`Tools/engine/` holds the staffing math and nothing else does. It is lifted as-is from the verified
**CP-WFM-018 Probabilistic Staffing pack** and reproduces every figure that pack documents — pooled
coverage 9.9%, interactive lane 52.2%, occupancy 83.3% at 30 erlangs and 97.0% at 480.

Reimplementing it in TypeScript would create two sources of truth for the same arithmetic, and the
failure mode is not a crash but a silent divergence between the central case and the band around
it. See `docs/ENGINE.md`.

## Known limitations

Stated here and in every report, rather than discovered by an audience. Full list:
`docs/KNOWN-GAPS.md`.

- **Occupancy as a service-level proxy is the weakest joint.** Achievable occupancy rises with
  pooled load, so a fixed value exaggerates both tails. PLUMB defaults to the Erlang curve.
- **The band is weekly; the plan is daily.** The supply side is a cohort pipeline, and those are
  weekly mechanisms.
- **Seven simulation parameters have no extractor** and never learn from actuals.
- **The mapping engine reads CSV only.** `.xlsx` is a single reader function away and is not
  written.
- **No intraday.** The WFM export is daily; the receiving system applies its own interval curve.

---

*Architecture: PAI v2.0 (Miessler — scaffolding > model)*
