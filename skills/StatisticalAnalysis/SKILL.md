---
name: StatisticalAnalysis
description: Statistical hypothesis testing, correlation, regression, and distribution analysis. USE WHEN user wants to compare groups, test claims, quantify relationships, fit distributions, or build predictive models. Foundation skill for BlackBelt suite. All findings map to CX/COST/EX outcomes.
dependencies:
  - OutcomeFramework
---

# StatisticalAnalysis

**Foundation skill for the BlackBelt analytical suite.** Provides rigorous statistical methods for hypothesis testing, correlation, regression, and distribution analysis.

> **Critical Constraint:** This skill identifies patterns and quantifies relationships but does NOT make causal claims. Every finding must include: "This is correlation. For causal interpretation, validate with CausalInference skill."

---

## Workflow Routing

| Intent | Workflow | File |
|--------|----------|------|
| Compare groups, test claims | HypothesisTest | `Workflows/HypothesisTest.md` |
| Fit distributions, assess normality | DistributionAnalysis | `Workflows/DistributionAnalysis.md` |
| Quantify relationships between variables | CorrelationAnalysis | `Workflows/CorrelationAnalysis.md` |
| Build predictive models | RegressionAnalysis | `Workflows/RegressionAnalysis.md` |
| Summarize data, identify outliers | DescriptiveStats | `Workflows/DescriptiveStats.md` |

---

## Quick Commands

```
stats test [data] [groups]      → Run appropriate hypothesis test
stats correlate [vars]          → Correlation matrix with significance
stats regress [y] [x1,x2,...]   → Regression with diagnostics
stats describe [data]           → Descriptive statistics
stats distribution [data]       → Fit and compare distributions
```

---

## Test Selection Decision Tree

```
What are you comparing?
├─► 2 groups, continuous, normal → t-test
├─► 2 groups, continuous, non-normal → Mann-Whitney U
├─► 2 groups, categorical → Chi-square / Fisher exact
├─► 3+ groups, continuous, normal → One-way ANOVA + Tukey post-hoc
├─► 3+ groups, continuous, non-normal → Kruskal-Wallis + Dunn
├─► 2+ factors, continuous → Two-way ANOVA
└─► Before/After same subjects → Paired t-test / Wilcoxon signed-rank
```

---

## Tools

| Tool | Purpose |
|------|---------|
| `Tools/statistical_tests.py` | Hypothesis testing functions (t-test, ANOVA, chi-square) |
| `Tools/regression_tools.py` | OLS regression with diagnostics |
| `Tools/distribution_analysis.py` | Distribution fitting and normality tests |

### Python Dependencies
```bash
pip install scipy statsmodels pingouin pandas numpy
```

---

## Output Format

All statistical findings return this standardized format:

```markdown
## [Test Name] Results

**Question:** [What was tested]
**Test Selected:** [Test name]
**Justification:** [Why this test]

| Statistic | Value |
|-----------|-------|
| [relevant stats] | [values] |
| Effect Size | [value] ([interpretation]) |
| 95% CI | [interval] |
| p-value | [value] |

**Conclusion:** [Plain language interpretation]

**Outcome Impact:** [CX/COST/EX] [direction] — [brief explanation]

**Causal Note:** This is correlation. For causal interpretation, validate with CausalInference skill.
```

---

## Integration with BlackBelt Suite

| Skill | Integration |
|-------|-------------|
| **OutcomeFramework** | Map all findings to CX/COST/EX domains |
| **CausalInference** | Validate correlations as causal (requires DAG) |
| **ShapleyDecomposition** | Decompose variance after regression R² |
| **DataAnalysis** | Source data from ETL pipelines |

---

## Effect Size Interpretation

| Measure | Small | Medium | Large |
|---------|-------|--------|-------|
| Cohen's d | 0.2 | 0.5 | 0.8 |
| Pearson r | 0.1 | 0.3 | 0.5 |
| Eta-squared (η²) | 0.01 | 0.06 | 0.14 |
| Cramér's V | 0.1 | 0.3 | 0.5 |

---

## Examples

**Example 1: Compare two groups**
```
User: "Is there a difference in AHT between Team A and Team B?"
→ Invokes HypothesisTest workflow
→ Checks normality → selects t-test or Mann-Whitney
→ Returns effect size, p-value, and practical interpretation
→ Maps to COST outcome domain
```

**Example 2: Build prediction model**
```
User: "Predict CSAT from AHT, wait time, and resolution"
→ Invokes RegressionAnalysis workflow
→ Fits OLS, checks assumptions, calculates VIF
→ Returns coefficients, R², and predictor importance
→ Flags for Shapley decomposition if requested
```

**Example 3: Assess data distribution**
```
User: "Is this call volume data normally distributed?"
→ Invokes DistributionAnalysis workflow
→ Runs Shapiro-Wilk, K-S tests
→ Fits candidate distributions
→ Recommends best fit by AIC
```

**Example 4: Find relationships**
```
User: "What's the relationship between tenure and performance?"
→ Invokes CorrelationAnalysis workflow
→ Computes Pearson/Spearman as appropriate
→ Returns r, p-value, and 95% CI
→ Explicitly notes: "This is correlation, not causation"
```

---

## Guardrails

### Before Analysis
- [ ] Data quality verified (missing values, outliers addressed)
- [ ] Sample size sufficient for chosen test
- [ ] Assumptions checked (normality, homoscedasticity)

### During Analysis
- [ ] Correct test selected per decision tree
- [ ] Effect sizes reported (not just p-values)
- [ ] Confidence intervals provided

### After Analysis
- [ ] Results mapped to CX/COST/EX outcomes
- [ ] Causal disclaimer included
- [ ] Practical significance discussed (not just statistical)
- [ ] Limitations documented
