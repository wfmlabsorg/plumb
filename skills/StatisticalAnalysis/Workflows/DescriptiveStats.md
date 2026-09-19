# DescriptiveStats Workflow

**Purpose:** Summarize data characteristics, identify outliers, and prepare data summaries for reporting.

---

## When to Use

- Initial data exploration (EDA)
- Generating summary tables for reports
- Identifying data quality issues
- Comparing groups descriptively (before formal testing)

---

## Workflow Steps

### Step 1: Overview Summary

```python
import pandas as pd
import numpy as np

def data_overview(df):
    """Generate quick overview of dataset."""
    return {
        "n_rows": len(df),
        "n_cols": len(df.columns),
        "numeric_cols": list(df.select_dtypes(include=[np.number]).columns),
        "categorical_cols": list(df.select_dtypes(include=['object', 'category']).columns),
        "missing_summary": df.isnull().sum().to_dict(),
        "dtypes": df.dtypes.astype(str).to_dict()
    }
```

### Step 2: Numeric Variable Summary

```python
from Tools.distribution_analysis import describe_distribution

def numeric_summary(df, columns=None):
    """Comprehensive summary of numeric variables."""
    if columns is None:
        columns = df.select_dtypes(include=[np.number]).columns

    summaries = {}
    for col in columns:
        summaries[col] = describe_distribution(df[col].dropna())

    return summaries
```

### Step 3: Categorical Variable Summary

```python
def categorical_summary(df, columns=None, top_n=10):
    """Summary of categorical variables."""
    if columns is None:
        columns = df.select_dtypes(include=['object', 'category']).columns

    summaries = {}
    for col in columns:
        value_counts = df[col].value_counts()
        summaries[col] = {
            "n_unique": df[col].nunique(),
            "n_missing": df[col].isnull().sum(),
            "pct_missing": round(df[col].isnull().mean() * 100, 2),
            "top_values": value_counts.head(top_n).to_dict(),
            "mode": value_counts.index[0] if len(value_counts) > 0 else None
        }

    return summaries
```

### Step 4: Group Comparisons

```python
def group_summary(df, outcome, grouping):
    """Compare descriptive stats across groups."""
    from Tools.distribution_analysis import describe_distribution

    groups = df.groupby(grouping)[outcome]
    summaries = {}

    for name, group in groups:
        summaries[name] = describe_distribution(group.dropna())

    # Overall comparison
    comparison = pd.DataFrame({
        name: {
            'n': s['n'],
            'mean': s['central_tendency']['mean'],
            'median': s['central_tendency']['median'],
            'std': s['dispersion']['std']
        }
        for name, s in summaries.items()
    }).T

    return {
        "group_summaries": summaries,
        "comparison_table": comparison
    }
```

### Step 5: Outlier Detection

```python
from Tools.distribution_analysis import detect_outliers

def identify_outliers(df, columns=None, method='iqr'):
    """Detect outliers in numeric columns."""
    if columns is None:
        columns = df.select_dtypes(include=[np.number]).columns

    outlier_report = {}
    for col in columns:
        data = df[col].dropna().values
        outlier_report[col] = detect_outliers(data, method=method)

    return outlier_report
```

### Step 6: Generate Report Table

```markdown
## Descriptive Statistics Summary

**Dataset:** [name]
**N:** [total observations]
**Variables:** [count] numeric, [count] categorical

### Numeric Variables

| Variable | N | Mean | Median | SD | Min | Max | Skew | Outliers |
|----------|---|------|--------|----|----|-----|------|----------|
| [var] | [n] | [mean] | [med] | [sd] | [min] | [max] | [skew] | [count] |

### Categorical Variables

| Variable | N Unique | Mode | Mode % | Missing % |
|----------|----------|------|--------|-----------|
| [var] | [n] | [mode] | [%] | [%] |

### Group Comparison: [Outcome] by [Group]

| Group | N | Mean | Median | SD |
|-------|---|------|--------|-----|
| [group] | [n] | [mean] | [med] | [sd] |

### Data Quality Notes
- [Any issues identified]

**Causal Note:** This is correlation. For causal interpretation, validate with CausalInference skill.
```

---

## Quick Summary Functions

### One-Line Summary

```python
def quick_summary(series):
    """Quick stats for a single variable."""
    return {
        'n': len(series.dropna()),
        'mean': round(series.mean(), 2),
        'median': round(series.median(), 2),
        'std': round(series.std(), 2),
        'min': round(series.min(), 2),
        'max': round(series.max(), 2)
    }
```

### Percentile Summary

```python
def percentile_summary(series, percentiles=[5, 25, 50, 75, 95]):
    """Get key percentiles."""
    return {
        f'p{p}': round(series.quantile(p/100), 2)
        for p in percentiles
    }
```

### Coefficient of Variation

```python
def cv(series):
    """Coefficient of variation (std/mean)."""
    return round(series.std() / series.mean() * 100, 2) if series.mean() != 0 else None
```

---

## Integration with OutcomeFramework

When summarizing data, tag variables by outcome domain:

```markdown
### Variable Summary by Outcome Domain

**CX (Customer Experience)**
| Variable | Mean | Std | Domain Role |
|----------|------|-----|-------------|
| CSAT | 4.12 | 0.85 | Primary outcome |
| FCR | 0.72 | 0.12 | Driver |
| Wait_Time | 45s | 22s | Driver |

**COST (Financial)**
| Variable | Mean | Std | Domain Role |
|----------|------|-----|-------------|
| AHT | 342s | 95s | Primary driver |
| FTE | 125 | 15 | Resource |
| Cost_Per_Contact | $4.25 | $1.10 | Outcome |

**EX (Employee Experience)**
| Variable | Mean | Std | Domain Role |
|----------|------|-----|-------------|
| Satisfaction | 3.8 | 0.9 | Outcome |
| Tenure | 2.5yr | 1.8yr | Driver |
| Attrition | 0.18 | 0.08 | Outcome |
```

---

## Examples

### Example 1: Contact Center Daily Metrics

```
Dataset: 90 days of operational metrics

Numeric Summary:
| Variable | N | Mean | Median | SD | Skew |
|----------|---|------|--------|-------|------|
| Calls | 90 | 1,245 | 1,180 | 312 | 0.82 |
| AHT | 90 | 342s | 328s | 85s | 1.15 |
| ASA | 90 | 28s | 22s | 18s | 1.92 |
| Abandon | 90 | 4.2% | 3.8% | 2.1% | 1.45 |
| CSAT | 90 | 4.12 | 4.20 | 0.42 | -0.65 |

Key Findings:
- ASA highly right-skewed (spikes on busy days)
- CSAT slightly left-skewed (ceiling effect)
- AHT has 5 outliers (complex calls >600s)
```

### Example 2: Agent Performance Comparison

```
Comparison: Performance by Team

| Team | N | Mean Score | Median | SD |
|------|---|------------|--------|-----|
| Team A | 25 | 82.4 | 84 | 8.2 |
| Team B | 28 | 78.1 | 79 | 10.5 |
| Team C | 22 | 85.6 | 86 | 6.8 |

Observations:
- Team C highest and most consistent (lowest SD)
- Team B most variable (highest SD)
- Formal testing recommended to confirm differences
```

### Example 3: Data Quality Report

```
Data Quality Summary:

Missing Values:
| Variable | N Missing | % Missing | Action |
|----------|-----------|-----------|--------|
| CSAT | 45 | 5.0% | Investigate non-response |
| Agent_ID | 0 | 0% | Complete |
| Handle_Time | 12 | 1.3% | Drop or impute |

Outliers (IQR method):
| Variable | N Outliers | % | Range |
|----------|------------|---|-------|
| AHT | 23 | 2.5% | >580s |
| Wait_Time | 8 | 0.9% | >120s |

Recommendations:
1. Investigate CSAT non-response pattern
2. Review AHT outliers (complex cases or data errors?)
3. Handle_Time missing likely system issues
```

---

## Report Templates

### Executive Summary Table

```markdown
| Metric | Current | Prior | Change | Status |
|--------|---------|-------|--------|--------|
| Volume | 1,245 | 1,180 | +5.5% | ⚠️ |
| AHT | 342s | 355s | -3.7% | ✓ |
| CSAT | 4.12 | 4.05 | +1.7% | ✓ |
| Abandon | 4.2% | 3.8% | +0.4pp | ⚠️ |
```

### Benchmark Comparison

```markdown
| Metric | Actual | Target | Gap | % to Target |
|--------|--------|--------|-----|-------------|
| AHT | 342s | 320s | +22s | 93.6% |
| FCR | 72% | 80% | -8pp | 90.0% |
| CSAT | 4.12 | 4.25 | -0.13 | 97.0% |
```

---

## Quick Reference Commands

```python
# Full summary
from Tools.distribution_analysis import describe_distribution
desc = describe_distribution(df['variable'])

# Quick stats
df['variable'].describe()

# Group comparison
df.groupby('group')['outcome'].agg(['count', 'mean', 'median', 'std'])

# Correlation preview
df[['var1', 'var2', 'var3']].corr()
```
