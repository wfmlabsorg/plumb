# PLUMB — Deterministic + Probabilistic Staffing Engine
## TELOS Summary (Auto-loaded at Session Start)

**Mission:** Turn a planner document into a staffed plan with a defensible range around it — and
never let a point estimate leave the building on its own.

**Creator:** Ted Lango / Kyōdō Solutions
**Lineage:** forked from HORIZON, pulled back toward CASE's operational simplicity

---

## Key Beliefs

- **A point estimate of required staff is a coin flip dressed as a plan.** The range is not a
  caveat on the answer; it is part of the answer.
- **Shrinkage belongs on the supply side, once.** Applying it twice, or not at all, is the most
  common defect in staffing arithmetic — and it grows in exactly the draws that matter.
- **Grade everything, or the report is unfalsifiable.** `[M]` measured · `[C]` computed ·
  `[E]` estimated · `[A]` asserted.
- **We calibrate the forecast error, not the forecast.** Somebody else owns the volume forecast.
  Our job is to know how wrong it usually is.
- **Correlation is not causation** — specify the rung, always.
- **A finding with no disconfirming condition is an assertion.** Say what would change the answer.
- **Occupancy as a service-level proxy is the weakest joint in this model.** Say so in the report
  rather than hoping nobody asks.

## Methodology

1. **The Algorithm:** OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
2. **The grade rule:** every number carries `[M]/[C]/[E]/[A]`; computed inherits the weakest input
3. **Shrink-once:** demand → required productive hours; supply → delivered productive hours
4. **Two-sided Monte Carlo:** demand and supply drawn together, so correlation survives
5. **Pearl's Ladder:** Rung 1 association → Rung 2 intervention → Rung 3 counterfactual
6. **Value of information:** gaps ranked by variance contribution per unit of effort to close

## Agent Team

| Agent | Role |
|-------|------|
| Coordinator | Phase state, routing, handoffs, the human checkpoint |
| DataEngineer | Planner doc → canonical CSVs; validation; the gap register |
| Modeler | Deterministic daily plan: required hours, supply hours, gap, FTE |
| Simulator | Weekly Monte Carlo band; Bayesian updating of MODEL-STATE |
| BlackBelt | Rung 1: variance decomposition, forecast accuracy, SPC |
| CausalAnalyst | Rungs 2–3: DAG, identifiability, counterfactuals |
| StrategySynthesizer | Exec report, staffing recommendation with confidence |

## The Path

```
INTAKE → INGEST → MODEL → ANALYZE (optional) → REPORT
```

ANALYZE is **off the default path** — it runs when someone asks a question, not because data is
present. Most days the job is INGEST → MODEL → REPORT.

## Outputs

| Output | Audience |
|---|---|
| `exports/wfm-requirement.csv` | the WFM system, to explode into intervals |
| `05-reports/staffing-status.md` | leadership, answer-first, every number graded |
| `02-canonical/INTAKE-GAPS.md` | whoever owns the data, ranked by what it is worth fixing |

---

*Deep context: `~/plumb/TELOS/` | Learnings: `~/plumb/MEMORY/` | Framework: `~/plumb/ALGORITHM.md` | Engine: `~/plumb/docs/ENGINE.md`*
