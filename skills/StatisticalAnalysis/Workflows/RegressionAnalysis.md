# RegressionAnalysis Workflow

**Purpose:** Build predictive models using OLS regression with full diagnostics and assumption checking.

> **Critical Reminder:** Regression coefficients represent associations, not causal effects. For causal interpretation, validate with CausalInference skill.

---

## When to Use

- Predicting a continuous outcome from multiple predictors
- Understanding relative importance of predictors
- Controlling for confounders in observational data
- Building baseline models before more complex approaches

---

## Regression Type Selection

```
What are you modeling?
│
├─► Continuous outcome, linear relationships → OLS (this workflow)
│
├─► Binary outcome (yes/no) → Logistic Regression
│
├─► Count outcome (integers ≥ 0) → Poisson/Negative Binomial
│
├─► Ordinal outcome (ranked categories) → Ordinal Logistic
│
├─► Hierarchical/nested data → Mixed Effects/HLM
│
└─► Non-linear relationships → Polynomial, GAM, or ML methods
```

---

## Workflow Steps

### Step 1: Define the Model

```markdown
**Research Question:** [What are you predicting?]
**Outcome (Y):** [Dependent variable]
**Predictors (X):** [List of independent variables]

**Expected Signs:**
- X1: [+/-] because [rationale]
- X2: [+/-] because [rationale]
```

### Step 2: Prepare Data

```python
import pandas as pd
import numpy as np

# Check for missing values
print(df[['y', 'x1', 'x2', 'x3']].isnull().sum())

# Handle missing (options: drop, impute)
df_clean = df.dropna(subset=['y', 'x1', 'x2', 'x3'])

# Check for outliers
from Tools.distribution_analysis import describe_distribution
for col in ['y', 'x1', 'x2', 'x3']:
    desc = describe_distribution(df_clean[col])
    print(f"{col}: {desc['outliers']['n_outliers']} outliers")
```

### Step 3: Fit the Model

```python
from Tools.regression_tools import fit_ols, format_regression_markdown

# Prepare predictors
X = df_clean[['x1', 'x2', 'x3']]
y = df_clean['y']

# Fit OLS
result = fit_ols(X, y, add_constant=True)

# View results
print(format_regression_markdown(result))
```

### Step 4: Check Assumptions

The `fit_ols` function automatically runs diagnostics. Key assumptions:

| Assumption | Test | Acceptable |
|------------|------|------------|
| Linearity | Residual plots | Random scatter |
| Normality of residuals | Shapiro-Wilk, Jarque-Bera | p > 0.05 |
| Homoscedasticity | Breusch-Pagan | p > 0.05 |
| No autocorrelation | Durbin-Watson | 1.5 < DW < 2.5 |
| No multicollinearity | VIF | VIF < 5 (ideally < 10) |

```python
# Diagnostics are in result['diagnostics']
diag = result['diagnostics']

print(f"Normality (Shapiro): {diag['normality_shapiro']['passed']}")
print(f"Homoscedasticity: {diag['homoscedasticity_breusch_pagan']['passed']}")
print(f"Autocorrelation: {diag['autocorrelation_durbin_watson']['passed']}")
print(f"Multicollinearity (max VIF): {diag['multicollinearity_vif']['_summary']['max_vif']}")
```

### Step 5: Assess Predictor Importance

```python
from Tools.regression_tools import get_predictor_importance

importance = get_predictor_importance(result, method='standardized')
print(f"Ranking: {importance['ranking']}")
print(f"Standardized Betas: {importance['importance']}")
```

### Step 6: Report Results

```markdown
## OLS Regression Results

**Model:** Y = β₀ + β₁X₁ + β₂X₂ + ... + ε
**Purpose:** [What this model predicts]

### Model Fit
| Metric | Value |
|--------|-------|
| N | [n] |
| R² | [value] |
| Adjusted R² | [value] |
| F-statistic | [value] |
| F p-value | [value] |

### Coefficients
| Predictor | β | SE | t | p | 95% CI | β* |
|-----------|---|----|----|---|--------|-----|
| Intercept | [value] | [value] | [value] | [value] | [CI] | — |
| X1 | [value] | [value] | [value] | [value] | [CI] | [std] |

*β* = standardized coefficient

### Predictor Importance
1. [Most important predictor] (β* = [value])
2. [Second most important] (β* = [value])
3. [etc.]

### Assumption Diagnostics
| Test | Result | Status |
|------|--------|--------|
| Normality | [interpretation] | ✓/✗ |
| Homoscedasticity | [interpretation] | ✓/✗ |
| Autocorrelation | [interpretation] | ✓/✗ |
| Multicollinearity | [max VIF] | ✓/✗ |

### Interpretation
[Plain language summary of key findings]

### Outcome Impact
[CX/COST/EX] — [How this model relates to outcomes]

### Causal Note
These coefficients represent associations, not causal effects.
For causal interpretation, validate with CausalInference skill.
```

---

## Handling Assumption Violations

| Violation | Solution |
|-----------|----------|
| Non-normal residuals | Transform Y (log, sqrt), use robust SE, or larger sample |
| Heteroscedasticity | Weighted LS, robust SE (HC3), or transform Y |
| Autocorrelation | Include lagged variables, use GLS, or cluster SE |
| Multicollinearity | Remove redundant predictors, use PCA, or ridge regression |
| Non-linearity | Add polynomial terms, interactions, or use GAM |

---

## Model Comparison

```python
# Compare nested models using F-test
from scipy import stats

# Full model vs reduced model
r2_full = result_full['r_squared']
r2_reduced = result_reduced['r_squared']
n = result_full['n_observations']
k_full = result_full['n_predictors'] + 1  # +1 for intercept
k_reduced = result_reduced['n_predictors'] + 1

f_stat = ((r2_full - r2_reduced) / (k_full - k_reduced)) / ((1 - r2_full) / (n - k_full))
p_value = 1 - stats.f.cdf(f_stat, k_full - k_reduced, n - k_full)

print(f"F-test for nested models: F = {f_stat:.2f}, p = {p_value:.4f}")
```

---

## Integration with Shapley Decomposition

For R² attribution among predictors:

```markdown
**Standard regression:** Shows marginal contributions (order-dependent)
**Shapley decomposition:** Provides fair, order-independent attribution

To decompose R² fairly:
1. Get R² from this regression
2. Pass to ShapleyDecomposition skill
3. Get each predictor's fair share of explained variance
```

---

## Integration with CausalInference

When regression suggests an important predictor:

```markdown
**Regression Found:** Training Hours (β* = 0.35) predicts Performance

**To Validate Causally:**
1. This coefficient is likely confounded (motivated employees seek training AND perform well)
2. Build DAG with potential confounders
3. Apply backdoor adjustment or IV methods
4. See CausalInference skill for next steps

**WARNING:** Do NOT interpret regression coefficients as causal effects
without proper causal identification.
```

---

## Examples

### Example 1: Predicting Customer Satisfaction

```
Model: CSAT = β₀ + β₁(FCR) + β₂(AHT) + β₃(Wait Time) + ε

Results:
- R² = 0.42 (42% variance explained)
- F(3, 196) = 47.2, p < 0.001

Coefficients:
| Predictor | β | β* | p |
|-----------|---|----|---|
| FCR | 0.45 | 0.52 | <0.001 |
| AHT | -0.02 | -0.08 | 0.21 |
| Wait Time | -0.15 | -0.31 | <0.001 |

Interpretation:
- FCR is the strongest predictor (β* = 0.52)
- Wait Time has moderate negative effect (β* = -0.31)
- AHT not significant when controlling for FCR and Wait Time

Assumption Checks: All passed ✓

Outcome Impact:
- CX: FCR and Wait Time are key drivers
- COST: Focus on FCR may reduce callbacks
- EX: Pressure on metrics affects agents
```

### Example 2: Handling Multicollinearity

```
Initial Model: Performance ~ Training + Experience + Tenure

VIF Results:
- Training: 2.1 ✓
- Experience: 8.7 ⚠️
- Tenure: 9.2 ⚠️

Problem: Experience and Tenure highly correlated (r = 0.89)

Solution Options:
1. Remove one predictor (keep the more theoretically relevant)
2. Combine into single index: Seniority = (Experience + Tenure) / 2
3. Use ridge regression if both are important

Chosen: Remove Experience, keep Tenure (easier to measure)

Revised VIF: All < 2 ✓
```

---

## Quick Reference Commands

```python
# Quick regression
from Tools.regression_tools import fit_ols, format_regression_markdown
result = fit_ols(X, y)
print(format_regression_markdown(result))

# Check VIF only
from Tools.regression_tools import calculate_vif
vif = calculate_vif(X)
print(vif)
```
