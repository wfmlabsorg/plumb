# CorrelationAnalysis Workflow

**Purpose:** Quantify relationships between variables and assess their statistical significance.

> **Critical Reminder:** Correlation ≠ Causation. Every finding from this workflow must include the causal disclaimer.

---

## When to Use

- Exploring relationships between continuous variables
- Assessing monotonic relationships (Spearman)
- Building correlation matrices for multivariate exploration
- Pre-regression variable selection

---

## Correlation Type Selection

```
What type of data?
│
├─► Both continuous, linear relationship → Pearson r
│
├─► Ordinal data OR non-linear monotonic → Spearman ρ
│
├─► Ordinal with many ties → Kendall τ
│
├─► One continuous, one binary → Point-biserial r
│
└─► Both binary → Phi coefficient (φ)
```

---

## Workflow Steps

### Step 1: Define Variables

```markdown
**Variables:**
- Variable 1: [name] ([type])
- Variable 2: [name] ([type])

**Expected Relationship:** [positive/negative/unknown]
**Hypothesis:** [if testing specific direction]
```

### Step 2: Check Assumptions (for Pearson)

```python
import numpy as np
from scipy import stats
from Tools.distribution_analysis import test_normality

# Check linearity (visual inspection or residual plot)
# Check normality of both variables
norm1 = test_normality(var1)
norm2 = test_normality(var2)

# If both normal → Pearson
# If either non-normal → Spearman
```

### Step 3: Compute Correlation

```python
from scipy import stats
import pandas as pd
import numpy as np

# Pearson correlation
r, p = stats.pearsonr(x, y)

# Spearman correlation (non-parametric)
rho, p = stats.spearmanr(x, y)

# Kendall tau
tau, p = stats.kendalltau(x, y)

# Confidence interval for Pearson r (Fisher z-transformation)
def pearson_ci(r, n, alpha=0.05):
    z = np.arctanh(r)
    se = 1 / np.sqrt(n - 3)
    z_crit = stats.norm.ppf(1 - alpha/2)
    ci_low = np.tanh(z - z_crit * se)
    ci_high = np.tanh(z + z_crit * se)
    return (ci_low, ci_high)
```

### Step 4: Correlation Matrix (Multiple Variables)

```python
import pandas as pd
from scipy import stats

def correlation_matrix_with_pvalues(df, method='pearson'):
    """Compute correlation matrix with p-values."""
    cols = df.columns
    n = len(cols)
    corr_matrix = pd.DataFrame(np.zeros((n, n)), columns=cols, index=cols)
    p_matrix = pd.DataFrame(np.zeros((n, n)), columns=cols, index=cols)

    for i, col1 in enumerate(cols):
        for j, col2 in enumerate(cols):
            if method == 'pearson':
                r, p = stats.pearsonr(df[col1].dropna(), df[col2].dropna())
            else:
                r, p = stats.spearmanr(df[col1].dropna(), df[col2].dropna())
            corr_matrix.loc[col1, col2] = r
            p_matrix.loc[col1, col2] = p

    return corr_matrix, p_matrix
```

### Step 5: Report Results

```markdown
## Correlation Analysis Results

**Variables:** [X] and [Y]
**Method:** [Pearson/Spearman/Kendall]
**Justification:** [Why this method]

| Statistic | Value |
|-----------|-------|
| Correlation Coefficient | [value] |
| 95% CI | [interval] |
| p-value | [value] |
| N | [sample size] |

**Effect Size Interpretation:**
- |r| < 0.1: Negligible
- 0.1 ≤ |r| < 0.3: Small
- 0.3 ≤ |r| < 0.5: Medium
- |r| ≥ 0.5: Large

**Current r = [value]:** [interpretation]

**Conclusion:** [Plain language interpretation]

**Outcome Impact:** [CX/COST/EX] — [explanation]

**Causal Note:** This is correlation. For causal interpretation, validate with CausalInference skill.
```

---

## Effect Size Interpretation (Cohen's Guidelines)

| r | Interpretation | Shared Variance (r²) |
|---|----------------|---------------------|
| 0.1 | Small | 1% |
| 0.3 | Medium | 9% |
| 0.5 | Large | 25% |
| 0.7 | Very Large | 49% |

---

## Common Pitfalls

1. **Assuming linearity** — Always visualize first; Spearman can capture non-linear monotonic
2. **Outliers dominating** — One outlier can create/destroy a correlation
3. **Restricted range** — Correlations are attenuated with restricted samples
4. **Confounding** — Third variable may explain the relationship
5. **Causal language** — Never say "X affects Y" from correlation alone

---

## Correlation Matrix Visualization

```python
import seaborn as sns
import matplotlib.pyplot as plt

def plot_correlation_matrix(corr_df, title="Correlation Matrix"):
    plt.figure(figsize=(10, 8))
    mask = np.triu(np.ones_like(corr_df, dtype=bool))
    sns.heatmap(corr_df, mask=mask, annot=True, fmt='.2f',
                cmap='RdBu_r', center=0, vmin=-1, vmax=1,
                square=True, linewidths=0.5)
    plt.title(title)
    plt.tight_layout()
    return plt.gcf()
```

---

## Integration with OutcomeFramework

Map correlations to outcome domains:

```markdown
**Outcome Correlation Summary:**

| Variable Pair | r | Domain Impact |
|--------------|---|---------------|
| AHT × FCR | -0.42 | COST ↓ (lower AHT), CX ↑ (better FCR) |
| Tenure × CSAT | 0.35 | EX (stability) → CX (satisfaction) |
| Training × Performance | 0.28 | COST (investment) → COST (efficiency) |

**Key Insight:** [Summary of most important relationship]
```

---

## Integration with CausalInference

When correlation suggests an important relationship:

```markdown
**Correlation Found:** Training Hours ↔ Performance Score (r = 0.45, p < 0.001)

**Causal Hypothesis:** Training → Performance

**To Validate Causally:**
1. Build DAG including confounders (motivation, prior ability, tenure)
2. Check identifiability via backdoor/frontdoor criterion
3. Estimate causal effect controlling for confounders
4. See CausalInference skill for next steps
```

---

## Examples

### Example 1: Simple Bivariate Correlation

```
Variables: Tenure (years) and Customer Satisfaction Score
Method: Pearson (both continuous, linear expected)

Results:
- r = 0.32, p = 0.002, 95% CI [0.12, 0.49]
- N = 95

Interpretation: Medium positive correlation. Employees with longer tenure
tend to receive higher customer satisfaction scores.

Outcome Impact: EX (tenure) associated with CX (satisfaction)

IMPORTANT: This does NOT mean tenure causes satisfaction.
Possible explanations:
- Experienced agents have more skills
- Less skilled agents leave (survivorship bias)
- High performers stay longer
- Third variable (e.g., team culture) affects both
```

### Example 2: Correlation Matrix for Variable Selection

```
Variables: AHT, FCR, CSAT, Agent Tenure, Training Hours

Correlation Matrix:
           AHT    FCR   CSAT  Tenure  Training
AHT       1.00  -0.35   0.08   -0.22     0.05
FCR      -0.35   1.00   0.52    0.18     0.31
CSAT      0.08   0.52   1.00    0.25     0.22
Tenure   -0.22   0.18   0.25    1.00     0.15
Training  0.05   0.31   0.22    0.15     1.00

Key Findings:
1. FCR and CSAT strongly correlated (r=0.52) — multicollinearity concern for regression
2. AHT and FCR negatively correlated (r=-0.35) — efficiency/effectiveness tradeoff
3. Training correlated with FCR (r=0.31) — candidate for causal investigation
```

---

## Quick Reference Commands

```python
# Quick correlation with CI
from scipy import stats
import numpy as np

r, p = stats.pearsonr(x, y)
ci = (np.tanh(np.arctanh(r) - 1.96/np.sqrt(len(x)-3)),
      np.tanh(np.arctanh(r) + 1.96/np.sqrt(len(x)-3)))
print(f"r = {r:.3f}, p = {p:.4f}, 95% CI = [{ci[0]:.3f}, {ci[1]:.3f}]")
```
