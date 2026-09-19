# Counterfactuals and Structural Causal Models

**Source:** Chapter 8, The Book of Why

Counterfactuals are the highest rung of the Ladder of Causation, enabling us to reason about what would have happened under different circumstances.

---

## What Are Counterfactuals?

A counterfactual is a statement about what **would have happened** if circumstances had been different:

- "Would this patient have survived if we'd given the drug?"
- "Would the fire have occurred if the match hadn't been struck?"
- "Would I have gotten the job if I'd worn a tie?"

### Key Distinction from Intervention

| Type | Question | Uses Hindsight? |
|------|----------|-----------------|
| Intervention | "What happens if we set X?" | No |
| Counterfactual | "What would have happened if X had been different?" | Yes |

**Hindsight:** Counterfactuals condition on what actually happened (X=x, Y=y), then ask about an alternative world (X=x').

---

## Notation: Potential Outcomes

**Y_x** = The value Y would take if X were set to x

**Y_x(u)** = The value Y would take for individual u if X were set to x

### Examples
- Y₁ = Recovery if treated
- Y₀ = Recovery if not treated
- Y₁(Alice) = Alice's recovery if she were treated

### The Fundamental Problem
We can never observe both Y₁(u) and Y₀(u) for the same individual — only one potential outcome is realized.

---

## Structural Causal Models (SCMs)

An SCM consists of:
1. **Endogenous variables (V)** — Variables determined by the model
2. **Exogenous variables (U)** — External factors, typically unobserved
3. **Structural equations** — Functions specifying how each V is determined

### Structural Equation Form
```
Y = f_Y(parents(Y), U_Y)
```

Each variable is a **function** of its parents (direct causes) plus exogenous factors.

### Example: Education-Experience-Salary
```
EX = 10 - 4·ED + U_EX       (Experience depends on education)
S = 65000 + 2500·EX + 5000·ED + U_S  (Salary depends on both)
```

### Key Insight: Functions, Not Distributions
SCMs specify deterministic functions, not probability distributions. Uncertainty comes from the exogenous U variables.

---

## The Three-Step Counterfactual Procedure

To answer "What would Y have been if X had been x'?" given evidence E:

### Step 1: Abduction
Use evidence E to update our knowledge about exogenous variables U.

**Example:** Given Alice has ED=0, EX=6, S=$81,000, compute U_S and U_EX.

### Step 2: Action
Modify the model to reflect the counterfactual intervention:
- Delete arrows into X
- Set X = x'

### Step 3: Prediction
Compute Y in the modified model using the updated U values.

**Example:** With Alice's U values, compute her salary if ED=1.

---

## Worked Example: Alice's Counterfactual Salary

**Given:**
- Alice: ED=0 (high school), EX=6 years, S=$81,000
- Model: EX = 10 - 4·ED + U_EX; S = 65000 + 2500·EX + 5000·ED + U_S

**Query:** What would Alice's salary be if she had a college degree (ED=1)?

**Step 1: Abduction**
```
U_EX = EX - (10 - 4·ED) = 6 - (10 - 0) = -4
U_S = S - (65000 + 2500·EX + 5000·ED) = 81000 - (65000 + 15000 + 0) = 1000
```

**Step 2: Action**
Set ED = 1 (counterfactual assumption)

**Step 3: Prediction**
```
EX' = 10 - 4·(1) + (-4) = 2 years
S' = 65000 + 2500·(2) + 5000·(1) + 1000 = $76,000
```

**Answer:** Alice would earn $76,000 if she had a college degree.

---

## Probability of Necessity (PN)

**Definition:** The probability that X=1 was a necessary cause of Y=1.

```
PN = P(Y_{X=0} = 0 | X=1, Y=1)
```

**Plain English:** Given that X happened and Y happened, what's the probability that Y wouldn't have happened if X hadn't?

### Legal Application: But-For Causation
"But for the defendant's action, the injury would not have occurred."

PN quantifies this — it's the probability the defendant caused the harm.

### Example: Fire and Match
- X = Match struck (X=1: yes)
- Y = Fire occurred (Y=1: yes)
- PN = P(no fire if match not struck | match struck, fire occurred)

If PN = 0.95, we're 95% confident the match was necessary for the fire.

---

## Probability of Sufficiency (PS)

**Definition:** The probability that X=1 would be sufficient to cause Y=1.

```
PS = P(Y_{X=1} = 1 | X=0, Y=0)
```

**Plain English:** Given that X didn't happen and Y didn't happen, what's the probability that Y would have happened if X had?

### Legal Application: Proximate Cause
Did the defendant's action have sufficient likelihood of causing harm?

### Example: Falling Piano Scenario
- Defendant shoots at victim, misses
- Victim runs away, killed by falling piano
- X = Shooting; Y = Death

PS is low — shooting wasn't sufficient to cause death by piano.

---

## Necessary vs. Sufficient Causes

| Concept | Definition | Example |
|---------|------------|---------|
| **Necessary** | Y wouldn't happen without X | Oxygen for fire |
| **Sufficient** | X alone can cause Y | Lightning for fire |
| **Necessary & Sufficient** | Both | Rare in practice |

### The Match vs. Oxygen Puzzle
Both match and oxygen are necessary for fire. Why do we blame the match?

**Answer:** PS differs
- Match: High PN, High PS (striking a match likely causes fire)
- Oxygen: High PN, Low PS (having oxygen doesn't make fire likely)

We blame causes with both high necessity AND high sufficiency.

---

## Counterfactuals in Practice

### Climate Attribution
"Did climate change cause this heat wave?"

Using PN:
- PN = 0.9 means 90% probability climate change was necessary for this heat wave
- Policy-relevant: Without emissions, this heat wave likely wouldn't have occurred

Using PS:
- PS = 0.72 means 72% probability climate change will be sufficient to cause another such heat wave
- Planning-relevant: Expect more extreme events

### Individual Treatment Effects
"Would this patient have benefited from treatment?"

Standard clinical trials give Average Treatment Effect (ATE):
```
ATE = E[Y₁] - E[Y₀]
```

Counterfactual reasoning gives Individual Treatment Effect (ITE):
```
ITE(u) = Y₁(u) - Y₀(u)
```

### Attribution Analysis
"What caused this customer to churn?"
- Enumerate possible causes
- Compute PN for each
- Rank by probability of necessity

---

## Relationship to Potential Outcomes (Rubin Causal Model)

| SCM Approach | Potential Outcomes Approach |
|--------------|----------------------------|
| Structural equations | Potential outcome variables |
| Graphical representation | Ignorability assumptions |
| Mechanisms explicit | Mechanisms implicit |
| Counterfactuals derived | Counterfactuals primitive |

### Key Difference
- **SCM:** Counterfactuals computed from model
- **Rubin:** Counterfactuals are undefined quantities to be estimated

### Advantage of SCM
Can test and verify assumptions via d-separation implications.

---

## The First Law of Causal Inference

```
Y_x(u) = Y_{M_x}(u)
```

The counterfactual Y_x can be computed by:
1. Taking the model M
2. Performing surgery (delete arrows into X, set X=x) → M_x
3. Computing Y in the modified model

This bridges the conceptual (what would have happened) with the computational (how to calculate it).
