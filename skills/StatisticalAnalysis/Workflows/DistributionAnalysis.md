# DistributionAnalysis Workflow

**Purpose:** Assess data distributions, test normality, and fit appropriate probability distributions.

---

## When to Use

- Before selecting a statistical test (parametric vs non-parametric)
- Modeling random variables for simulation
- Understanding data generation processes
- Identifying appropriate transformations

---

## Workflow Steps

### Step 1: Visual Inspection

```python
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

def visualize_distribution(data, title="Distribution"):
    fig, axes = plt.subplots(1, 3, figsize=(15, 4))

    # Histogram with KDE
    sns.histplot(data, kde=True, ax=axes[0])
    axes[0].set_title('Histogram with KDE')

    # Box plot
    sns.boxplot(x=data, ax=axes[1])
    axes[1].set_title('Box Plot')

    # Q-Q plot
    from scipy import stats
    stats.probplot(data, dist="norm", plot=axes[2])
    axes[2].set_title('Q-Q Plot (vs Normal)')

    plt.suptitle(title)
    plt.tight_layout()
    return fig
```

### Step 2: Compute Descriptive Statistics

```python
from Tools.distribution_analysis import describe_distribution

desc = describe_distribution(data)

print(f"N: {desc['n']}")
print(f"Mean: {desc['central_tendency']['mean']}")
print(f"Median: {desc['central_tendency']['median']}")
print(f"Std: {desc['dispersion']['std']}")
print(f"Skewness: {desc['shape']['skewness']} ({desc['shape']['skew_interpretation']})")
print(f"Kurtosis: {desc['shape']['kurtosis']} ({desc['shape']['kurtosis_interpretation']})")
print(f"Outliers: {desc['outliers']['n_outliers']} ({desc['outliers']['pct_outliers']}%)")
```

### Step 3: Test for Normality

```python
from Tools.distribution_analysis import test_normality

norm_result = test_normality(data, alpha=0.05)

print(f"Is Normal: {norm_result['is_normal']}")
print(f"Recommendation: {norm_result['recommendation']}")

for test_name, test_result in norm_result['tests'].items():
    print(f"  {test_name}: stat={test_result['statistic']}, p={test_result['p_value']}")
```

### Step 4: Fit Candidate Distributions

```python
from Tools.distribution_analysis import fit_distribution

fit_result = fit_distribution(data)

print("Top 3 Fits (by AIC):")
for fit in fit_result['fits'][:3]:
    print(f"  {fit['name']}: AIC={fit['aic']}, K-S p={fit['ks_pvalue']}")

print(f"\nBest Fit: {fit_result['best_fit']['name']}")
print(f"Recommendation: {fit_result['recommendation']}")
```

### Step 5: Suggest Transformations (if needed)

```python
from Tools.distribution_analysis import suggest_transformation

trans_result = suggest_transformation(data)

print(f"Best Transformation: {trans_result['best_transformation']}")
print(f"Recommendation: {trans_result['recommendation']}")
```

### Step 6: Report Results

```markdown
## Distribution Analysis Results

**Variable:** [name]
**N:** [count]

### Descriptive Statistics
| Statistic | Value |
|-----------|-------|
| Mean | [value] |
| Median | [value] |
| Std Dev | [value] |
| IQR | [value] |
| Skewness | [value] ([interpretation]) |
| Kurtosis | [value] ([interpretation]) |
| Outliers | [count] ([%]%) |

### Normality Tests
| Test | Statistic | p-value | Normal? |
|------|-----------|---------|---------|
| Shapiro-Wilk | [value] | [value] | ✓/✗ |
| Kolmogorov-Smirnov | [value] | [value] | ✓/✗ |
| D'Agostino-Pearson | [value] | [value] | ✓/✗ |

**Conclusion:** [Is data normal? Implications for analysis]

### Distribution Fitting
| Distribution | AIC | BIC | K-S p-value | Good Fit |
|--------------|-----|-----|-------------|----------|
| [name] | [value] | [value] | [value] | ✓/✗ |

**Best Fit:** [distribution name]

### Recommendation
[What analysis approach to use based on distribution]

**Causal Note:** This is correlation. For causal interpretation, validate with CausalInference skill.
```

---

## Common Distribution Types

### Continuous Distributions

| Distribution | When to Use | Shape |
|--------------|-------------|-------|
| Normal | Symmetric, bell-shaped | Mean=Median=Mode |
| Log-Normal | Positive, right-skewed | Log(X) is normal |
| Exponential | Time between events | Right-skewed, memoryless |
| Gamma | Waiting times, positive | Flexible shape |
| Weibull | Failure times, reliability | Flexible hazard rate |
| Beta | Proportions (0 to 1) | Flexible on [0,1] |
| Uniform | Equal probability | Flat |

### Discrete Distributions

| Distribution | When to Use |
|--------------|-------------|
| Poisson | Count data, rare events |
| Binomial | Success/failure counts |
| Negative Binomial | Overdispersed counts |

---

## Interpretation Guidelines

### Skewness

| Value | Interpretation |
|-------|----------------|
| Skew ≈ 0 | Symmetric |
| Skew < -0.5 | Left-skewed (tail on left) |
| Skew > 0.5 | Right-skewed (tail on right) |
| |Skew| > 1 | Highly skewed |

### Kurtosis (Excess)

| Value | Interpretation |
|-------|----------------|
| Kurt ≈ 0 | Mesokurtic (normal-like tails) |
| Kurt < 0 | Platykurtic (thin tails, flat peak) |
| Kurt > 0 | Leptokurtic (heavy tails, sharp peak) |

---

## Transformation Guide

| Original Distribution | Suggested Transformation |
|-----------------------|-------------------------|
| Right-skewed, positive | Log, Square root |
| Left-skewed, positive | Square, Reflect + Log |
| Heavy-tailed | Winsorize or Log |
| Counts | Square root |
| Proportions | Arcsin-square root, Logit |
| Unknown | Box-Cox (finds optimal λ) |

---

## Integration with Other Workflows

### Before Hypothesis Testing
```
1. Run DistributionAnalysis on outcome variable
2. If normal → Parametric test (t-test, ANOVA)
3. If non-normal → Non-parametric test (Mann-Whitney, Kruskal-Wallis)
   OR transform data and retest normality
```

### Before Regression
```
1. Check distribution of residuals (not raw outcome)
2. Non-normal residuals → Consider transformation or robust methods
3. Heavy tails → May need robust standard errors
```

---

## Examples

### Example 1: Call Volume Distribution

```
Variable: Daily call volume (n=365 days)

Descriptive Statistics:
- Mean: 1,245
- Median: 1,180
- Skewness: 0.82 (moderately right-skewed)
- Kurtosis: 0.45 (slightly heavy tails)

Normality Tests:
- Shapiro-Wilk: p = 0.003 (reject normality)
- K-S: p = 0.012 (reject normality)

Distribution Fitting:
1. Log-Normal: AIC=4,521, K-S p=0.34 ✓
2. Gamma: AIC=4,528, K-S p=0.28 ✓
3. Normal: AIC=4,612, K-S p=0.01 ✗

Best Fit: Log-Normal

Recommendation: Use log-transformed values for parametric analysis,
or use non-parametric methods on raw data.
```

### Example 2: CSAT Score Distribution

```
Variable: Customer satisfaction (1-5 scale, n=500)

Descriptive Statistics:
- Mean: 4.12
- Median: 4.00
- Skewness: -0.95 (moderately left-skewed)
- Kurtosis: 0.23

Normality Tests:
- Shapiro-Wilk: p < 0.001 (reject normality)

Distribution Fitting:
- Beta distribution best fits (scaled to 1-5)

Recommendation: Data is bounded and left-skewed (ceiling effect).
Consider ordinal logistic regression or treat as ordinal.
```

### Example 3: Handle Time Distribution

```
Variable: Average Handle Time in seconds (n=1,000 calls)

Descriptive Statistics:
- Mean: 342s
- Median: 298s
- Skewness: 1.85 (highly right-skewed)
- Kurtosis: 4.21 (heavy tails)
- Outliers: 47 (4.7%)

Normality Tests: All reject normality

Distribution Fitting:
1. Log-Normal: AIC=12,456, K-S p=0.45 ✓
2. Weibull: AIC=12,489, K-S p=0.38 ✓
3. Gamma: AIC=12,512, K-S p=0.31 ✓

Best Fit: Log-Normal

Recommendation: Log-transform AHT for regression analysis.
Log(AHT) is approximately normal.
```

---

## Quick Reference Commands

```python
# Full distribution analysis
from Tools.distribution_analysis import (
    describe_distribution,
    test_normality,
    fit_distribution,
    suggest_transformation
)

# One-liner checks
desc = describe_distribution(data)
norm = test_normality(data)
fits = fit_distribution(data)
trans = suggest_transformation(data)
```
