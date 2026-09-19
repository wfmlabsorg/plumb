# PLUMB Mental Models

## Pearl's Ladder of Causation

The foundational framework for analytical rigor.

| Rung | Level | Question | Example |
|------|-------|----------|---------|
| 1 | Association | What do I observe? | "Sites with high attrition also have low SL" |
| 2 | Intervention | What happens if I do X? | "If we increase training hours, AHT decreases" |
| 3 | Counterfactual | What would have happened? | "Had we not cut training, attrition would be 15% lower" |

**Rule:** BlackBelt operates at Rung 1. CausalAnalyst operates at Rung 2-3. Never present Rung 1 findings as causal claims.

## CX / COST / EX Outcome Triangle

Every finding must map to at least one outcome dimension:

- **CX (Customer Experience):** Service levels, CSAT, FCR, quality scores, wait times
- **COST (Operational Efficiency):** Cost per contact, shrinkage, overtime, technology spend
- **EX (Employee Experience):** Attrition, engagement, schedule satisfaction, burnout indicators

## DMAIC (Six Sigma)

Process improvement cycle mapped to consulting phases:

| DMAIC | Consulting Phase | Activities |
|-------|-----------------|------------|
| **Define** | INTAKE | SOW, stakeholders, success criteria |
| **Measure** | DISCOVERY | Data inventory, baseline metrics |
| **Analyze** | ANALYSIS | Statistical + causal analysis |
| **Improve** | SYNTHESIS | Recommendations, business cases |
| **Control** | DELIVERY + CLOSEOUT | Implementation plan, monitoring |

## The Algorithm

Universal problem-solving framework: **Current State → Ideal State via Verifiable Iteration**

OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN

Always define success criteria (BUILD) before executing. Always verify results. Always extract learnings.

Full documentation: `~/plumb/ALGORITHM.md`

## Confidence Ladder

Progressive evidence accumulation:

```
LOW (Hypothesis)     → Pattern observed, needs testing
    ↓ + statistical test
MEDIUM (Tested)      → Evidence present, mechanism plausible
    ↓ + causal validation
HIGH (Validated)     → Confirmed with causal backing
    ↓ fails validation
REJECTED             → Tested, found insufficient
```

## Project State Machine

Engagement lifecycle with phase transitions:

```
INTAKE → DISCOVERY → ANALYSIS → SYNTHESIS → DELIVERY → CLOSEOUT
   │         │          │           │          │
   └─────────┴──────────┴───────────┘          │
         Backward flows allowed                │
         (scoped, time-boxed, logged)          │
                                               │
                                          IMMUTABLE
```
