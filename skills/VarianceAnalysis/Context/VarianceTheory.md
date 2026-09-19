# Variance Analysis Theory

## Fundamental Concepts

### What is Variance Analysis?

Variance analysis decomposes the difference between planned/budgeted values and actual results to understand **why** targets were missed and **how much** each factor contributed.

```
Variance = Actual - Budget (or Plan, Forecast, Prior Period)
```

### Types of Variances

| Variance Type | Comparison | Purpose |
|---------------|------------|---------|
| Budget Variance | Actual vs Budget | Financial control |
| Forecast Variance | Actual vs Forecast | Operational planning |
| Standard Variance | Actual vs Standard | Process control |
| Period Variance | Current vs Prior Period | Trend analysis |

---

## Two-Factor Decomposition

The classic approach for decomposing variance when outcome = Factor A × Factor B.

### Standard Convention

```
Total Variance = Actual Total - Budget Total
               = (A_actual × B_actual) - (A_budget × B_budget)

Decomposition:
- A Variance (Price/Rate) = ΔA × B_actual
- B Variance (Quantity/Volume) = ΔB × A_budget
- Joint Variance = ΔA × ΔB
```

### Why This Convention?

The convention assigns:
- **Rate variance** uses actual quantity (management responsible for rate at whatever volume occurred)
- **Volume variance** uses budget rate (volume change valued at planned efficiency)

This is not the only valid decomposition, but it's the most common in management accounting.

### Alternative: Pure Decomposition

```
A Variance (pure) = ΔA × B_budget
B Variance (pure) = ΔB × A_budget
Joint Variance = ΔA × ΔB

Where: A_pure + B_pure + Joint = Total Variance
```

---

## Flexible Budgeting

### The Problem with Static Budgets

Static budgets assume a fixed activity level. When actual volume differs from plan, comparing actual costs to static budget conflates:
- Volume effects (uncontrollable if demand-driven)
- Efficiency effects (controllable)

### The Flexible Budget Solution

```
Static Budget = Budget Rate × Budget Volume
Flex Budget = Budget Rate × Actual Volume
Actual = Actual Rate × Actual Volume
```

**Decomposition:**
- **Volume Variance** = Flex Budget - Static Budget (uncontrollable)
- **Flex Variance** = Actual - Flex Budget (controllable)

### Management Implications

| Variance | Controllable? | Management Focus |
|----------|---------------|------------------|
| Volume Variance | Usually No | Demand forecasting |
| Flex Variance | Usually Yes | Process improvement |

---

## Multi-Factor Decomposition

### The Order Problem

With 3+ factors, sequential decomposition depends on analysis order:

```
Outcome = A × B × C

Order A → B → C gives different attribution than C → B → A
```

### Why Order Matters

First factors analyzed get credit for their pure effect **plus** all interaction terms with subsequent factors.

**Example with A, B, C all increasing 10%:**
- If A analyzed first: A gets credit for 10% + interactions
- If C analyzed first: C gets that same advantage

### The Shapley Solution

Shapley values from cooperative game theory provide the **unique fair decomposition** by averaging marginal contributions across all possible orderings.

**Axioms satisfied:**
1. **Efficiency:** Contributions sum exactly to total
2. **Symmetry:** Interchangeable factors get equal credit
3. **Null Player:** Zero-impact factors get zero credit
4. **Additivity:** Decomposition is additive

---

## Favorable/Unfavorable Classification

### Direction Matters

Whether a variance is "good" or "bad" depends on the metric type:

| Metric Type | Negative Variance | Positive Variance |
|-------------|-------------------|-------------------|
| **Cost** | Favorable (under budget) | Unfavorable (over budget) |
| **Revenue** | Unfavorable (under target) | Favorable (over target) |
| **Efficiency** (lower better) | Favorable | Unfavorable |
| **Quality** (higher better) | Unfavorable | Favorable |

### Context Matters

Even "favorable" variances deserve scrutiny:
- Under-spending may indicate deferred maintenance
- Higher-than-expected revenue may be unsustainable
- Lower AHT might mean rushed service

---

## WFM-Specific Variance Analysis

### The Staffing Equation

```
FTE = (Volume × AHT) / (WorkHours × Occupancy × (1 - Shrinkage))

Where:
- Volume = Contact volume
- AHT = Average Handle Time (seconds)
- WorkHours = Productive hours per FTE (e.g., 8 × 60 = 480 min)
- Occupancy = Utilization target (e.g., 0.85)
- Shrinkage = Non-productive time % (e.g., 0.30)
```

### Factor Relationships

| Factor | Direction | FTE Impact | COST Impact |
|--------|-----------|------------|-------------|
| Volume ↑ | Numerator | ↑ | ↑ |
| AHT ↑ | Numerator | ↑ | ↑ |
| WorkHours ↓ | Denominator | ↑ | ↑ |
| Occupancy ↓ | Denominator | ↑ | ↑ |
| Shrinkage ↑ | Denominator | ↑ | ↑ |

### Typical Decomposition Factors

For WFM variance analysis, typically decompose:
- **Volume** — Contact demand (often uncontrollable)
- **AHT** — Call complexity and agent efficiency (partially controllable)
- **Shrinkage** — Absenteeism, training, aux time (partially controllable)

WorkHours and Occupancy are usually held constant as policy decisions.

---

## Verification Checks

### Sum Check

All decompositions must sum to total variance:
```
Σ Factor Attributions = Total Variance
```

If not, check for:
- Rounding errors (acceptable if small)
- Missing factors
- Model specification errors

### Reasonableness Checks

1. **Direction:** Factors that increased should generally contribute positive variance (in same-direction models)
2. **Proportionality:** Larger % changes should typically yield larger attributions
3. **Symmetry:** In multiplicative models, same % change → same attribution

---

## Common Pitfalls

### 1. Ignoring Interactions

In multiplicative models, factors interact. A 10% increase in both A and B yields 21% total increase, not 20%.

### 2. Order Dependence

Sequential decomposition gives different answers depending on factor order. Use Shapley for fairness.

### 3. Misclassifying F/U

Apply the right metric type. Cost under-runs are favorable; revenue under-runs are not.

### 4. Over-Decomposing

Not every variance needs full decomposition. Simple variances can use simple analysis.

### 5. Confusing Variance with Causation

Variance analysis shows **what** contributed to the gap, not **why** it happened. Root cause analysis is a separate step.

---

## Integration with Outcome Framework

All variances should map to outcomes:

| Variance Type | Primary Outcome | Secondary Outcomes |
|---------------|-----------------|-------------------|
| Labor cost | COST | EX (overtime stress) |
| Volume | COST | CX (capacity) |
| AHT | COST | CX (wait times), EX (complexity) |
| Service level | CX | COST (over/understaffing) |
| Attrition | EX | COST (replacement), CX (experience loss) |

---

## References

- Horngren, C. T., et al. *Cost Accounting: A Managerial Emphasis*
- Shapley, L. S. (1953). "A Value for n-Person Games"
- Kaplan, R. S., & Atkinson, A. A. *Advanced Management Accounting*
