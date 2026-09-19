# HypothesisTest Workflow

**Purpose:** Select and execute the appropriate statistical hypothesis test based on data characteristics.

---

## When to Use

- Comparing means/medians between groups
- Testing if a proportion differs from expected
- Checking for differences in categorical outcomes
- Before/after comparisons (paired data)

---

## Test Selection Decision Tree

```
What are you comparing?
│
├─► 2 groups, continuous, normal → Independent t-test
│   └─► Check: Levene's test for equal variances
│       ├─► Equal variances → Student's t-test
│       └─► Unequal variances → Welch's t-test
│
├─► 2 groups, continuous, non-normal → Mann-Whitney U
│
├─► 2 groups, categorical → Chi-square / Fisher exact
│   └─► Check: Expected cell counts
│       ├─► All cells ≥ 5 → Chi-square
│       └─► Any cell < 5 → Fisher's exact
│
├─► 3+ groups, continuous, normal → One-way ANOVA
│   └─► Post-hoc: Tukey HSD
│
├─► 3+ groups, continuous, non-normal → Kruskal-Wallis
│   └─► Post-hoc: Dunn's test with Bonferroni
│
├─► 2+ factors, continuous → Two-way ANOVA
│   └─► Check for interaction effects
│
├─► Before/After same subjects, continuous, normal → Paired t-test
│
└─► Before/After same subjects, continuous, non-normal → Wilcoxon signed-rank
```

---

## Workflow Steps

### Step 1: Define the Question

```markdown
**Research Question:** [What are you testing?]
**Null Hypothesis (H₀):** [Statement of no effect/difference]
**Alternative Hypothesis (H₁):** [Statement of effect/difference]
**Outcome Variable:** [DV]
**Grouping Variable:** [IV]
**Significance Level (α):** [0.05 default]
```

### Step 2: Check Data Characteristics

```python
from Tools.statistical_tests import check_normality, select_test

# Check normality
normality = check_normality(data[outcome])
print(f"Normal: {normality['is_normal']}")
print(f"Recommendation: {normality['recommendation']}")

# Get test recommendation
selection = select_test(data, outcome, groups, paired=False)
print(f"Recommended Test: {selection['recommended_test']}")
print(f"Justification: {selection['justification']}")
```

### Step 3: Run Appropriate Test

```python
from Tools.statistical_tests import (
    run_ttest, run_anova, run_chi_square,
    run_mann_whitney, run_kruskal_wallis
)

# Example: Independent t-test
result = run_ttest(group1, group2, paired=False)

# Example: One-way ANOVA with post-hoc
result = run_anova(data, outcome='score', factor='group', posthoc=True)

# Example: Chi-square
result = run_chi_square(contingency_table)
```

### Step 4: Report Results

Use the standardized output format:

```markdown
## [Test Name] Results

**Question:** [What was tested]
**Test Selected:** [Test name]
**Justification:** [Why this test]

| Statistic | Value |
|-----------|-------|
| Test Statistic | [value] |
| Degrees of Freedom | [df] |
| p-value | [value] |
| Effect Size | [value] ([interpretation]) |
| 95% CI | [interval] |

**Conclusion:** [Plain language interpretation]

**Outcome Impact:** [CX/COST/EX] [direction] — [explanation]

**Causal Note:** This is correlation. For causal interpretation, validate with CausalInference skill.
```

---

## Effect Size Guidelines

| Measure | Small | Medium | Large |
|---------|-------|--------|-------|
| Cohen's d (t-tests) | 0.2 | 0.5 | 0.8 |
| Eta-squared η² (ANOVA) | 0.01 | 0.06 | 0.14 |
| Cramér's V (Chi-square) | 0.1 | 0.3 | 0.5 |
| r (Mann-Whitney) | 0.1 | 0.3 | 0.5 |

---

## Common Pitfalls

1. **Multiple comparisons without correction** — Use Bonferroni or FDR when testing many hypotheses
2. **Ignoring effect sizes** — p-values alone don't tell practical significance
3. **Assuming normality** — Always check with Shapiro-Wilk or visual inspection
4. **Small sample sizes** — Power analysis should precede study design
5. **Confusing statistical vs. practical significance** — A tiny effect can be "significant" with large n

---

## Integration with OutcomeFramework

After obtaining results, map to outcome domains:

```markdown
**Outcome Impact Analysis:**

| Domain | Impact | Direction | Confidence |
|--------|--------|-----------|------------|
| CX | [effect on customer experience] | ↑/↓/→ | [high/medium/low] |
| COST | [effect on costs] | ↑/↓/→ | [high/medium/low] |
| EX | [effect on employee experience] | ↑/↓/→ | [high/medium/low] |
```

---

## Examples

### Example 1: Comparing Two Groups

```
Question: Is there a difference in AHT between morning and afternoon shifts?

1. Check normality: Shapiro-Wilk p=0.23 (normal)
2. Select test: Independent t-test (2 groups, continuous, normal)
3. Run test:
   - t(198) = 2.45, p = 0.015
   - Cohen's d = 0.35 (small-medium)
   - 95% CI: [0.15, 1.42]

Conclusion: Afternoon shift has significantly higher AHT (M=342s) than morning (M=325s),
with a small-to-medium effect size. This is a 5% difference.

Outcome Impact: COST ↑ (higher labor cost for afternoon), CX ↓ (longer handle times)
```

### Example 2: Comparing Three+ Groups

```
Question: Do satisfaction scores differ across tenure bands (<1yr, 1-3yr, 3+yr)?

1. Check normality: p=0.08 (approximately normal)
2. Select test: One-way ANOVA
3. Run test:
   - F(2, 147) = 4.82, p = 0.009
   - η² = 0.062 (medium effect)
4. Post-hoc (Tukey HSD):
   - <1yr vs 3+yr: p = 0.007 (significant)
   - <1yr vs 1-3yr: p = 0.34 (not significant)
   - 1-3yr vs 3+yr: p = 0.12 (not significant)

Conclusion: Employees with 3+ years tenure show significantly higher satisfaction
than those with less than 1 year. Medium effect size.

Outcome Impact: EX ↑ for tenured staff
```

---

## Quick Reference Commands

```bash
# From Python
python -c "from Tools.statistical_tests import *; print(select_test(df, 'score', 'group'))"

# Quick t-test
python -c "from Tools.statistical_tests import run_ttest; print(run_ttest(g1, g2))"
```
