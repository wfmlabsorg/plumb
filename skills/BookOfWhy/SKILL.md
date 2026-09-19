---
name: BookOfWhy
description: Causal reasoning framework from Judea Pearl. USE WHEN user asks about causation vs correlation, why something happened, what would happen if, causal diagrams, confounding, Simpson's paradox, do-calculus, counterfactuals, backdoor criterion, mediation analysis, causal inference.
---

# BookOfWhy - Causal Reasoning Framework

**Source:** "The Book of Why" by Judea Pearl & Dana Mackenzie (2018)
**Library Path:** ~/plumb/skills/BookOfWhy/context/

> "You are smarter than your data. Data do not understand causes and effects. Humans do."

---

## The Ladder of Causation

The foundational framework for classifying causal questions:

| Rung | Level | Activity | Typical Question | Mathematical Form |
|------|-------|----------|------------------|-------------------|
| **1** | Association | Seeing | "What if I *see* X?" | P(Y\|X) |
| **2** | Intervention | Doing | "What if I *do* X?" | P(Y\|do(X)) |
| **3** | Counterfactual | Imagining | "What if I *had done* X?" | P(Y_x\|X', Y') |

### Rung 1: Association (Observational)
- Purely statistical relationships
- "Customers who buy X also buy Y"
- Correlations, conditional probabilities
- **Limitation:** Cannot distinguish cause from effect or common cause

### Rung 2: Intervention (Experimental)
- Effects of actions/policies
- "What happens if we change the price?"
- Randomized trials, do-calculus
- **Key insight:** P(Y|X) ≠ P(Y|do(X)) in general

### Rung 3: Counterfactual (Imaginative)
- Reasoning about alternate worlds
- "Would this customer have churned if we'd called them?"
- Requires structural causal models
- **Key insight:** Uses hindsight (actual outcome) to inform counterfactual

---

## Quick Reference

### When to Apply Each Concept

| Situation | Tool to Use | See Workflow |
|-----------|-------------|--------------|
| "Is X correlated with Y?" | Rung 1 statistics | — |
| "Does X cause Y?" | Causal diagram + identification | IdentifyStructure |
| "What would Y be if we set X?" | do-calculus, backdoor/frontdoor | CheckIdentifiability |
| "Would Y have occurred if X hadn't?" | SCM + counterfactual procedure | CounterfactualQuery |
| "Why did the data show X→Y but intervention showed opposite?" | Simpson's Paradox analysis | ResolveParadox |
| "How much of X's effect goes through M?" | Mediation analysis | MediationAnalysis |

---

## Context Files

Detailed documentation for CausalInference skill to leverage:

| File | Contents |
|------|----------|
| `Context/LadderOfCausation.md` | Deep dive on 3 rungs with examples |
| `Context/CausalDiagrams.md` | Confounders, colliders, mediators, d-separation |
| `Context/DoCalculus.md` | The 3 rules, backdoor/frontdoor criteria |
| `Context/Counterfactuals.md` | SCMs, potential outcomes, PN/PS |
| `Context/CommonTraps.md` | Simpson's Paradox, Berkson's, mediation fallacy |
| `Context/HistoricalContext.md` | Galton, Pearson, Wright, Fisher debates |

---

## Workflows

| Workflow | Purpose |
|----------|---------|
| `ClassifyQuery.md` | Determine which rung a question belongs to |
| `IdentifyStructure.md` | Map scenario to causal diagram |
| `CheckIdentifiability.md` | Can we estimate the effect from data? |
| `ResolveParadox.md` | Explain paradoxical findings |
| `CounterfactualQuery.md` | Answer "what would have happened if" |

---

## Integration with CausalInference Skill

BookOfWhy provides the **conceptual foundation**. CausalInference provides the **operational tools**.

```
BookOfWhy (Concepts)          CausalInference (Operations)
─────────────────────         ────────────────────────────
Ladder of Causation      →    Query classification
Causal diagram rules     →    DAG builder & validator
do-calculus rules        →    Identification algorithms
SCM framework            →    Counterfactual computation
PN/PS definitions        →    Attribution analysis
```

When building causal analyses, load both skills:
1. Use BookOfWhy to frame the question correctly
2. Use CausalInference to execute the analysis

---

## Key Mantras

1. **"No causes in, no causes out"** - Data alone cannot answer causal questions
2. **"Correlation is not causation"** - Rung 1 cannot answer Rung 2 questions
3. **"Confounders open paths, colliders close them"** - Until conditioned on
4. **"Never condition on a mediator when estimating total effect"** - Mediator fallacy
5. **"Counterfactuals require models, not just data"** - You need assumptions
