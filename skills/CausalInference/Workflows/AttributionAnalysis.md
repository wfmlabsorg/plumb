# AttributionAnalysis Workflow

Compute probabilities of necessity (PN) and sufficiency (PS) for causal attribution.

---

## When to Use

- Legal causation: "Did the defendant's action cause the harm?"
- Root cause analysis: "Was X responsible for Y?"
- Climate attribution: "Did climate change cause this event?"
- Customer attribution: "Did the marketing cause this conversion?"

## Key Concepts

| Measure | Question | Formula |
|---------|----------|---------|
| **PN** (Probability of Necessity) | "Would Y have occurred without X?" | P(Y₀=0 \| X=1, Y=1) |
| **PS** (Probability of Sufficiency) | "Would X have caused Y?" | P(Y₁=1 \| X=0, Y=0) |
| **PNS** (Probability of Necessity & Sufficiency) | "Was X the decisive factor?" | P(Y₁=1, Y₀=0) |

---

## Interpretation Guide

### Probability of Necessity (PN)

**Question:** Given that X happened and Y happened, what's the probability that Y wouldn't have happened without X?

**Legal parallel:** "But-for" causation — "But for the defendant's action, the injury would not have occurred."

**Values:**
- PN = 1.0: X was definitely necessary for Y
- PN = 0.9: 90% chance X was necessary (strong attribution)
- PN = 0.5: Coin flip whether X was necessary
- PN = 0.0: Y would have happened anyway

### Probability of Sufficiency (PS)

**Question:** Given that X didn't happen and Y didn't happen, what's the probability that X would have caused Y?

**Legal parallel:** "Proximate cause" — Was the action sufficient to bring about the harm?

**Values:**
- PS = 1.0: X definitely would have caused Y
- PS = 0.1: X unlikely to cause Y (weak sufficiency)

### Combined Use

| PN | PS | Interpretation |
|----|-----|---------------|
| High | High | X is both necessary and sufficient (strong cause) |
| High | Low | X was necessary but not reliably sufficient (enabling condition) |
| Low | High | X is sufficient but not necessary (one of several causes) |
| Low | Low | X is neither necessary nor sufficient (weak relationship) |

---

## Computation Methods

### Method 1: From Observational Data (Bounds Only)

When we only have observational data, we can compute bounds:

```python
def pn_bounds_observational(p_y_given_x1, p_y_given_x0):
    """
    Compute bounds on PN from observational data.

    PN ∈ [max(0, (P(Y|X=1) - P(Y|X=0)) / P(Y|X=1)),
          min(1, (1 - P(Y|X=0)) / P(Y|X=1))]
    """
    lower = max(0, (p_y_given_x1 - p_y_given_x0) / p_y_given_x1)
    upper = min(1, (1 - p_y_given_x0) / p_y_given_x1)
    return lower, upper


def ps_bounds_observational(p_y_given_x1, p_y_given_x0):
    """
    Compute bounds on PS from observational data.

    PS ∈ [max(0, P(Y|X=1) - P(Y|X=0)),
          min(1, P(Y|X=1))]
    """
    lower = max(0, p_y_given_x1 - p_y_given_x0)
    upper = min(1, p_y_given_x1)
    return lower, upper
```

### Method 2: From Experimental Data (Tighter Bounds)

With RCT data, bounds tighten:

```python
def pn_with_experimental(p_y1_exp, p_y0_exp, p_y_given_x1_obs):
    """
    PN with experimental data.

    If monotonicity holds: PN = (P(Y|X=1) - P(Y|do(X=0))) / P(Y|X=1)
    """
    # Under monotonicity assumption
    pn = (p_y_given_x1_obs - p_y0_exp) / p_y_given_x1_obs
    return max(0, min(1, pn))
```

### Method 3: From Structural Causal Model (Point Identification)

With fully specified SCM:

```python
def pn_from_scm(scm, evidence, n_samples=10000):
    """
    Compute PN via simulation from SCM.
    """
    # Filter to cases where X=1 and Y=1
    relevant_cases = [u for u in scm.sample_exogenous(n_samples)
                      if scm.compute(u)['X'] == 1 and scm.compute(u)['Y'] == 1]

    # Compute counterfactual Y under do(X=0)
    y0_values = []
    for u in relevant_cases:
        cf = scm.counterfactual(u, intervention={'X': 0})
        y0_values.append(cf['Y'])

    # PN = P(Y_0 = 0 | X=1, Y=1)
    pn = sum(1 for y in y0_values if y == 0) / len(y0_values)
    return pn
```

---

## Step-by-Step Procedure

### Step 1: Define the Attribution Question

```
Event: {Describe what happened}
Treatment (X): {The potential cause}
Outcome (Y): {The effect we observed}

Question type:
[ ] Necessity: "Was X necessary for Y?"
[ ] Sufficiency: "Was X sufficient to cause Y?"
[ ] Both: "Was X the decisive cause of Y?"
```

### Step 2: Gather Evidence

| Data Type | What It Gives Us |
|-----------|------------------|
| Observational only | Wide bounds on PN/PS |
| + RCT data | Tighter bounds |
| + Monotonicity assumption | Point identification possible |
| + Full SCM | Exact computation |

### Step 3: Check Assumptions

**Monotonicity:** X can only increase (or only decrease) Y, never both.
- If violated, bounds widen
- Often reasonable in practice

**No confounding of X-Y:**
- If violated, observational P(Y|X) ≠ P(Y|do(X))
- Need adjustment or experimental data

### Step 4: Compute PN/PS

```python
def attribution_analysis(data, treatment, outcome, experimental_data=None,
                         monotonicity=True):
    """
    Full attribution analysis.
    """
    # Observational probabilities
    p_y_x1 = data[data[treatment] == 1][outcome].mean()
    p_y_x0 = data[data[treatment] == 0][outcome].mean()

    # Compute bounds
    pn_lower, pn_upper = pn_bounds_observational(p_y_x1, p_y_x0)
    ps_lower, ps_upper = ps_bounds_observational(p_y_x1, p_y_x0)

    # Tighten with experimental data if available
    if experimental_data is not None:
        p_y_do_x1 = experimental_data['Y_treated'].mean()
        p_y_do_x0 = experimental_data['Y_control'].mean()

        if monotonicity:
            # Point identification
            pn = (p_y_x1 - p_y_do_x0) / p_y_x1
            ps = p_y_do_x1 - p_y_x0
            pn_lower = pn_upper = pn
            ps_lower = ps_upper = ps

    return {
        'PN': (pn_lower, pn_upper),
        'PS': (ps_lower, ps_upper),
        'PNS_lower': max(0, pn_lower + ps_lower - 1),
        'PNS_upper': min(pn_upper, ps_upper)
    }
```

### Step 5: Interpret Results

**For legal/attribution purposes:**
- PN > 0.5 → "More likely than not" X was necessary (preponderance of evidence)
- PN > 0.95 → "Beyond reasonable doubt" X was necessary

**For policy purposes:**
- High PS → Interventions on X will be effective
- High PN → X is a good target for prevention

---

## Example: Climate Attribution

**Event:** Record heat wave in Europe, 2003
**X:** Anthropogenic greenhouse gas emissions
**Y:** Heat wave severity exceeding 1.6°C above normal

```python
# From climate models (Allen & Stott, 2004)
p_heatwave_with_ghg = 0.75  # P(Y=1 | do(X=1))
p_heatwave_without_ghg = 0.10  # P(Y=1 | do(X=0))

# Observed: heat wave occurred (Y=1) with current emissions (X=1)
# Question: PN = P(Y=0 if X=0 | X=1, Y=1)

# Under monotonicity (GHG can't prevent heat waves)
PN = (0.75 - 0.10) / 0.75
# PN ≈ 0.87

print(f"87% probability that climate change was necessary for the 2003 heat wave")
```

---

## Example: Legal Causation

**Event:** Patient died after taking drug
**X:** Drug administered (X=1)
**Y:** Death (Y=1)

**From clinical trial:**
- P(death | drug) = 0.05
- P(death | placebo) = 0.02

```python
# Under monotonicity (drug can't prevent death)
pn_lower = (0.05 - 0.02) / 0.05  # = 0.60
pn_upper = (1 - 0.02) / 0.05  # = 0.98, but cap at 1.0

# PN ∈ [0.60, 1.0]

# Interpretation: 60-100% probability drug was necessary cause of death
# This exceeds "more likely than not" threshold
```

---

## Output Template

```markdown
# Attribution Analysis Report

## Event
**What happened:** {description}
**When:** {date/time}
**Treatment (X):** {potential cause}
**Outcome (Y):** {observed effect}

## Data Sources
- [ ] Observational data (N={n})
- [ ] Experimental/RCT data (N={n})
- [ ] Structural causal model

## Assumptions
1. Monotonicity: {yes/no} — {justification}
2. No unmeasured confounding: {yes/no} — {justification}

## Results

| Measure | Value | Interpretation |
|---------|-------|----------------|
| PN (Probability of Necessity) | {value or range} | {interpretation} |
| PS (Probability of Sufficiency) | {value or range} | {interpretation} |
| PNS (Necessity & Sufficiency) | {value or range} | {interpretation} |

## Conclusion

**Attribution statement:**
There is a {PN}% probability that {X} was a necessary cause of {Y}.

**Confidence level:** {high/medium/low}
**Caveats:** {list any important limitations}

## Comparison to Legal Standards

| Standard | Threshold | Met? |
|----------|-----------|------|
| Preponderance of evidence | PN > 50% | {yes/no} |
| Clear and convincing | PN > 75% | {yes/no} |
| Beyond reasonable doubt | PN > 95% | {yes/no} |
```

---

## Advanced: Combining Multiple Causes

When multiple factors may have contributed:

```python
def multi_cause_attribution(causes, outcome, data, scm=None):
    """
    Attribute outcome to multiple potential causes.
    """
    results = {}

    for cause in causes:
        # PN for each cause individually
        pn = compute_pn(data, cause, outcome)

        # PS for each cause
        ps = compute_ps(data, cause, outcome)

        results[cause] = {'PN': pn, 'PS': ps}

    # Note: PN values don't need to sum to 1
    # Multiple causes can each be necessary
    # (e.g., oxygen AND match both necessary for fire)

    return results
```
