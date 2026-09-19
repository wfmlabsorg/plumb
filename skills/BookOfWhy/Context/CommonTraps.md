# Common Traps and Paradoxes

**Source:** Chapters 1, 4, 6, 9 of The Book of Why

These are the most common mistakes in causal reasoning, including famous paradoxes that have confused researchers for decades.

---

## Simpson's Paradox

### The Paradox
A treatment can appear beneficial in every subgroup but harmful overall (or vice versa).

### Classic Example: Kidney Stone Treatment
| | Treatment A | Treatment B |
|---|-------------|-------------|
| Small Stones | 93% success | 87% success |
| Large Stones | 73% success | 69% success |
| **Overall** | **78% success** | **83% success** |

Treatment A is better for both stone sizes, but B appears better overall!

### Resolution
The paradox arises from **confounding**. Stone size affects both treatment choice and outcome.

```
Stone Size → Treatment Choice
    ↓             ↓
    └──────→ Outcome
```

Doctors give Treatment B to easier cases. When we aggregate, we're comparing "A given to hard cases" vs "B given to easy cases."

### The Causal Question Matters
- **"Which treatment should I choose?"** → Subgroup data (A is better)
- **"Which treatment had better results in this hospital?"** → Aggregate data (B had better results)

### Rule
When aggregated and subgroup data disagree, the causal diagram determines which is correct for your question.

---

## Berkson's Paradox (Collider Bias)

### The Paradox
Conditioning on a collider creates spurious correlations between its causes.

### Example: Hollywood Talent-Attractiveness
```
Talent → Success ← Attractiveness
```

Among successful actors, talent and attractiveness are negatively correlated. Why? If someone succeeded without talent, they must be attractive (and vice versa).

### Example: Hospital Admission Bias
```
Disease A → Hospitalized ← Disease B
```

Among hospitalized patients, diseases A and B appear negatively correlated, even if independent in the population.

### Rule
**Never condition on a collider** (or its descendants) unless you intend to create this dependency.

### Detection
Look for variables that are **effects** of the variables you're studying. If you're conditioning on one, you may have Berkson's bias.

---

## Mediation Fallacy

### The Fallacy
Treating a mediator as a confounder and adjusting for it.

### Example
```
Education → Job Type → Salary
```

Question: "What is the effect of education on salary?"

**Mistake:** Adjust for Job Type to "control for" differences in jobs.

**Problem:** Job Type is how education affects salary. Adjusting for it blocks the causal effect you're trying to measure.

### When It Happens
Researchers often adjust for everything "to be safe." But adjusting for mediators blocks causal paths.

### Rule
- **Total effect:** Don't adjust for mediators
- **Direct effect:** Do adjust for mediators (but this is a different question)

### Detection
Ask: "Is this variable on the causal path from X to Y?" If yes, don't adjust for total effect.

---

## Table 2 Fallacy

### The Fallacy
In regression analysis, interpreting all coefficients as causal effects.

### Example
Regression of Salary on Education, Experience, and IQ:
```
Salary = β₁·Education + β₂·Experience + β₃·IQ + ε
```

**Mistake:** Interpreting β₁ as "the causal effect of education on salary, controlling for experience and IQ."

**Problem:** The coefficients have causal meaning only if the adjustment set satisfies the backdoor criterion for each variable.

### Rule
Regression coefficients are causal effects **only if** the covariates satisfy the backdoor criterion. Otherwise, they're just partial correlations.

---

## Monty Hall Problem

### The Paradox
You're on a game show with 3 doors. One has a prize. You pick Door 1. The host (who knows where the prize is) opens Door 3, showing no prize. Should you switch to Door 2?

**Answer:** Yes! Switching wins 2/3 of the time.

### Causal Explanation
```
Your Choice → Host's Action ← Prize Location
```

Host's Action is a collider. Once revealed (conditioned on), the prize location and your choice become correlated.

- If prize is behind Door 1, host could open 2 or 3
- If prize is behind Door 2, host must open 3
- Given host opened 3, prize is more likely behind Door 2

### Lesson
Conditioning on a collider (the host's choice) creates information flow between previously independent variables.

---

## Confounding vs. Collider: A Comparison

| | Confounder | Collider |
|---|------------|----------|
| Structure | X ← Z → Y | X → Z ← Y |
| Without conditioning | Spurious X-Y correlation | No X-Y correlation |
| After conditioning on Z | Blocks spurious correlation | **Creates** spurious correlation |
| Adjustment | Should adjust | Should NOT adjust |

### Memory Aid
- **Confounders:** "Open doors that should be closed" → Close them by adjusting
- **Colliders:** "Closed doors that should stay closed" → Leave them alone

---

## The Reversal Paradox

### The Paradox
Adjusting for a variable can reverse the direction of an effect.

### Example
Suppose in raw data: Exercise → Lower Heart Attack Risk

After adjusting for cholesterol:
Exercise → Higher Heart Attack Risk

### Explanation
```
Exercise → Cholesterol → Heart Attack
         ↘           ↗
          Direct Effect?
```

If exercise affects heart attack ONLY through cholesterol, adjusting for cholesterol removes the entire effect. Any remaining "effect" is noise or bias.

If there's a direct effect, adjusting for cholesterol isolates it (but may be wrong sign due to selection).

### Rule
Reversal after adjustment suggests the adjusted variable may be a mediator or involved in complex pathways.

---

## Lord's Paradox

### The Paradox
Two statisticians analyze the same data and reach opposite conclusions, both seemingly correct.

### Setup
- Compare diets' effect on weight
- Measure weight before and after
- One analyst adjusts for initial weight, one doesn't
- They disagree on which diet is better

### Explanation
The disagreement stems from different causal questions:
1. "Which diet causes more weight loss?" (don't adjust)
2. "Which diet is better for people of the same initial weight?" (adjust)

### Lesson
The causal question determines the correct analysis. Different questions → different adjustment sets → different answers.

---

## Practical Detection Guide

### Red Flags for Simpson's Paradox
- Subgroup results contradict aggregate
- There's a variable affecting both treatment and outcome
- **Action:** Draw the DAG, identify confounders

### Red Flags for Berkson's Bias
- You're analyzing a selected subset (hospitalized, employed, published)
- Selection criterion depends on multiple study variables
- **Action:** Consider what caused selection

### Red Flags for Mediation Fallacy
- "Controlling for" variables on the causal path
- Effect "disappears" after adjustment
- **Action:** Ask if adjusted variable is a mediator

### Red Flags for Table 2 Fallacy
- Multiple regression coefficients interpreted as causal
- No DAG drawn to justify adjustment set
- **Action:** Check backdoor criterion for each coefficient separately

---

## The Universal Resolution

All these paradoxes resolve with one tool: **the causal diagram**.

1. Draw the DAG
2. Identify what you're trying to estimate
3. Use d-separation to determine valid adjustment sets
4. Interpret results in light of the causal structure

> "Without a causal diagram, you're navigating in the dark."
