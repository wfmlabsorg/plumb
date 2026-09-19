"""
Statistical Tests Module for StatisticalAnalysis Skill
Provides hypothesis testing functions with effect sizes and interpretation.

Dependencies: scipy, statsmodels, pingouin, pandas, numpy
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Optional, Tuple, Union
import warnings

# Try importing pingouin for cleaner API
try:
    import pingouin as pg
    HAS_PINGOUIN = True
except ImportError:
    HAS_PINGOUIN = False
    warnings.warn("pingouin not installed. Some features will use scipy fallbacks.")


def check_normality(data: Union[np.ndarray, pd.Series], alpha: float = 0.05) -> Dict:
    """
    Test normality using Shapiro-Wilk and Kolmogorov-Smirnov tests.

    Args:
        data: Numeric array or series to test
        alpha: Significance level (default 0.05)

    Returns:
        Dict with test results and recommendation
    """
    data = np.array(data).flatten()
    data = data[~np.isnan(data)]
    n = len(data)

    results = {
        "n": n,
        "tests": {},
        "is_normal": None,
        "recommendation": ""
    }

    # Shapiro-Wilk (best for n < 5000)
    if n >= 3 and n <= 5000:
        stat_sw, p_sw = stats.shapiro(data)
        results["tests"]["shapiro_wilk"] = {
            "statistic": round(stat_sw, 4),
            "p_value": round(p_sw, 4),
            "normal": p_sw > alpha
        }

    # Kolmogorov-Smirnov (compare to normal with same mean/std)
    if n >= 5:
        stat_ks, p_ks = stats.kstest(data, 'norm', args=(np.mean(data), np.std(data)))
        results["tests"]["kolmogorov_smirnov"] = {
            "statistic": round(stat_ks, 4),
            "p_value": round(p_ks, 4),
            "normal": p_ks > alpha
        }

    # D'Agostino-Pearson (for n >= 20)
    if n >= 20:
        stat_dp, p_dp = stats.normaltest(data)
        results["tests"]["dagostino_pearson"] = {
            "statistic": round(stat_dp, 4),
            "p_value": round(p_dp, 4),
            "normal": p_dp > alpha
        }

    # Determine overall normality
    if results["tests"]:
        normal_votes = [t["normal"] for t in results["tests"].values()]
        results["is_normal"] = sum(normal_votes) >= len(normal_votes) / 2

        if results["is_normal"]:
            results["recommendation"] = "Data appears normally distributed. Parametric tests appropriate."
        else:
            results["recommendation"] = "Data deviates from normality. Consider non-parametric tests or transformation."

    return results


def select_test(
    data: pd.DataFrame,
    outcome: str,
    groups: str,
    paired: bool = False
) -> Dict:
    """
    Recommend appropriate statistical test based on data characteristics.

    Args:
        data: DataFrame containing the data
        outcome: Name of outcome/dependent variable column
        groups: Name of grouping variable column
        paired: Whether observations are paired (repeated measures)

    Returns:
        Dict with recommended test and justification
    """
    outcome_data = data[outcome].dropna()
    group_data = data[groups].dropna()

    # Check if outcome is continuous or categorical
    is_continuous = np.issubdtype(outcome_data.dtype, np.number)
    n_groups = group_data.nunique()

    # Check normality for continuous data
    is_normal = True
    if is_continuous:
        normality = check_normality(outcome_data)
        is_normal = normality.get("is_normal", True)

    # Sample sizes per group
    group_sizes = data.groupby(groups)[outcome].count()
    min_n = group_sizes.min()
    total_n = len(data)

    result = {
        "n_groups": n_groups,
        "is_continuous": is_continuous,
        "is_normal": is_normal,
        "is_paired": paired,
        "sample_sizes": group_sizes.to_dict(),
        "recommended_test": None,
        "justification": [],
        "alternatives": []
    }

    if not is_continuous:
        # Categorical outcome
        if n_groups == 2:
            if min_n < 5:
                result["recommended_test"] = "fisher_exact"
                result["justification"].append("Categorical outcome with small cell counts")
            else:
                result["recommended_test"] = "chi_square"
                result["justification"].append("Categorical outcome comparing 2 groups")
        else:
            result["recommended_test"] = "chi_square"
            result["justification"].append(f"Categorical outcome comparing {n_groups} groups")

    elif n_groups == 2:
        # Two-group comparison
        if paired:
            if is_normal:
                result["recommended_test"] = "paired_ttest"
                result["justification"].append("Paired observations, normally distributed")
            else:
                result["recommended_test"] = "wilcoxon_signed_rank"
                result["justification"].append("Paired observations, non-normal distribution")
        else:
            if is_normal:
                result["recommended_test"] = "independent_ttest"
                result["justification"].append("Independent groups, normally distributed")
                result["alternatives"].append("welch_ttest if unequal variances")
            else:
                result["recommended_test"] = "mann_whitney_u"
                result["justification"].append("Independent groups, non-normal distribution")

    elif n_groups >= 3:
        # Multi-group comparison
        if is_normal:
            result["recommended_test"] = "one_way_anova"
            result["justification"].append(f"Comparing {n_groups} groups, normally distributed")
            result["justification"].append("Use Tukey HSD for post-hoc pairwise comparisons")
        else:
            result["recommended_test"] = "kruskal_wallis"
            result["justification"].append(f"Comparing {n_groups} groups, non-normal distribution")
            result["justification"].append("Use Dunn's test for post-hoc pairwise comparisons")

    return result


def run_ttest(
    group1: Union[np.ndarray, pd.Series],
    group2: Union[np.ndarray, pd.Series],
    paired: bool = False,
    alternative: str = 'two-sided'
) -> Dict:
    """
    Run t-test with effect size (Cohen's d) and confidence intervals.

    Args:
        group1: First group data
        group2: Second group data
        paired: Whether to run paired t-test
        alternative: 'two-sided', 'less', or 'greater'

    Returns:
        Dict with test results, effect size, and interpretation
    """
    g1 = np.array(group1).flatten()
    g2 = np.array(group2).flatten()
    g1 = g1[~np.isnan(g1)]
    g2 = g2[~np.isnan(g2)]

    if HAS_PINGOUIN:
        if paired:
            result = pg.ttest(g1, g2, paired=True, alternative=alternative)
        else:
            result = pg.ttest(g1, g2, paired=False, alternative=alternative)

        return {
            "test": "paired_ttest" if paired else "independent_ttest",
            "statistic": round(result['T'].values[0], 4),
            "p_value": round(result['p-val'].values[0], 6),
            "df": round(result['dof'].values[0], 2),
            "effect_size": {
                "cohens_d": round(result['cohen-d'].values[0], 4),
                "interpretation": interpret_effect_size(abs(result['cohen-d'].values[0]), 'cohens_d')
            },
            "ci_95": [round(result['CI95%'].values[0][0], 4), round(result['CI95%'].values[0][1], 4)],
            "n1": len(g1),
            "n2": len(g2),
            "mean1": round(np.mean(g1), 4),
            "mean2": round(np.mean(g2), 4),
            "std1": round(np.std(g1, ddof=1), 4),
            "std2": round(np.std(g2, ddof=1), 4)
        }
    else:
        # Fallback to scipy
        if paired:
            stat, p = stats.ttest_rel(g1, g2, alternative=alternative)
            diff = g1 - g2
            cohens_d = np.mean(diff) / np.std(diff, ddof=1)
        else:
            stat, p = stats.ttest_ind(g1, g2, alternative=alternative)
            pooled_std = np.sqrt(((len(g1)-1)*np.var(g1, ddof=1) + (len(g2)-1)*np.var(g2, ddof=1)) /
                                 (len(g1) + len(g2) - 2))
            cohens_d = (np.mean(g1) - np.mean(g2)) / pooled_std

        return {
            "test": "paired_ttest" if paired else "independent_ttest",
            "statistic": round(stat, 4),
            "p_value": round(p, 6),
            "effect_size": {
                "cohens_d": round(cohens_d, 4),
                "interpretation": interpret_effect_size(abs(cohens_d), 'cohens_d')
            },
            "n1": len(g1),
            "n2": len(g2),
            "mean1": round(np.mean(g1), 4),
            "mean2": round(np.mean(g2), 4)
        }


def run_anova(
    data: pd.DataFrame,
    outcome: str,
    factor: str,
    posthoc: bool = True
) -> Dict:
    """
    Run one-way ANOVA with effect size (eta-squared) and optional post-hoc tests.

    Args:
        data: DataFrame with outcome and factor columns
        outcome: Name of dependent variable column
        factor: Name of grouping factor column
        posthoc: Whether to run Tukey HSD post-hoc comparisons

    Returns:
        Dict with ANOVA results and post-hoc comparisons
    """
    groups = [group[outcome].dropna().values for name, group in data.groupby(factor)]
    group_names = list(data[factor].unique())

    # Run one-way ANOVA
    f_stat, p_value = stats.f_oneway(*groups)

    # Calculate eta-squared
    grand_mean = data[outcome].mean()
    ss_between = sum(len(g) * (np.mean(g) - grand_mean)**2 for g in groups)
    ss_total = sum((x - grand_mean)**2 for g in groups for x in g)
    eta_squared = ss_between / ss_total if ss_total > 0 else 0

    result = {
        "test": "one_way_anova",
        "statistic": round(f_stat, 4),
        "p_value": round(p_value, 6),
        "effect_size": {
            "eta_squared": round(eta_squared, 4),
            "interpretation": interpret_effect_size(eta_squared, 'eta_squared')
        },
        "n_groups": len(groups),
        "group_names": group_names,
        "group_stats": {
            name: {
                "n": len(g),
                "mean": round(np.mean(g), 4),
                "std": round(np.std(g, ddof=1), 4)
            }
            for name, g in zip(group_names, groups)
        }
    }

    # Post-hoc: Tukey HSD
    if posthoc and p_value < 0.05 and HAS_PINGOUIN:
        posthoc_result = pg.pairwise_tukey(data=data, dv=outcome, between=factor)
        result["posthoc"] = {
            "method": "tukey_hsd",
            "comparisons": posthoc_result.to_dict('records')
        }

    return result


def run_chi_square(
    observed: Union[np.ndarray, pd.DataFrame],
    expected: Optional[np.ndarray] = None
) -> Dict:
    """
    Run chi-square test with Cramér's V effect size.

    Args:
        observed: Contingency table (2D array or DataFrame)
        expected: Expected frequencies (optional, computed if not provided)

    Returns:
        Dict with chi-square results and effect size
    """
    if isinstance(observed, pd.DataFrame):
        observed = observed.values

    observed = np.array(observed)

    if expected is None:
        chi2, p, dof, expected = stats.chi2_contingency(observed)
    else:
        chi2, p = stats.chisquare(observed.flatten(), expected.flatten())
        dof = observed.size - 1

    # Cramér's V
    n = observed.sum()
    min_dim = min(observed.shape) - 1
    cramers_v = np.sqrt(chi2 / (n * min_dim)) if min_dim > 0 and n > 0 else 0

    return {
        "test": "chi_square",
        "statistic": round(chi2, 4),
        "p_value": round(p, 6),
        "df": dof,
        "effect_size": {
            "cramers_v": round(cramers_v, 4),
            "interpretation": interpret_effect_size(cramers_v, 'cramers_v')
        },
        "observed": observed.tolist(),
        "expected": expected.tolist() if isinstance(expected, np.ndarray) else expected
    }


def run_mann_whitney(
    group1: Union[np.ndarray, pd.Series],
    group2: Union[np.ndarray, pd.Series],
    alternative: str = 'two-sided'
) -> Dict:
    """
    Run Mann-Whitney U test (non-parametric alternative to independent t-test).

    Args:
        group1: First group data
        group2: Second group data
        alternative: 'two-sided', 'less', or 'greater'

    Returns:
        Dict with test results and rank-biserial correlation (effect size)
    """
    g1 = np.array(group1).flatten()
    g2 = np.array(group2).flatten()
    g1 = g1[~np.isnan(g1)]
    g2 = g2[~np.isnan(g2)]

    stat, p = stats.mannwhitneyu(g1, g2, alternative=alternative)

    # Rank-biserial correlation as effect size
    n1, n2 = len(g1), len(g2)
    r = 1 - (2 * stat) / (n1 * n2)

    return {
        "test": "mann_whitney_u",
        "statistic": round(stat, 4),
        "p_value": round(p, 6),
        "effect_size": {
            "rank_biserial_r": round(r, 4),
            "interpretation": interpret_effect_size(abs(r), 'pearson_r')
        },
        "n1": n1,
        "n2": n2,
        "median1": round(np.median(g1), 4),
        "median2": round(np.median(g2), 4)
    }


def run_kruskal_wallis(
    data: pd.DataFrame,
    outcome: str,
    factor: str,
    posthoc: bool = True
) -> Dict:
    """
    Run Kruskal-Wallis H test (non-parametric alternative to one-way ANOVA).

    Args:
        data: DataFrame with outcome and factor columns
        outcome: Name of dependent variable column
        factor: Name of grouping factor column
        posthoc: Whether to run Dunn's post-hoc test

    Returns:
        Dict with test results and post-hoc comparisons
    """
    groups = [group[outcome].dropna().values for name, group in data.groupby(factor)]
    group_names = list(data[factor].unique())

    stat, p = stats.kruskal(*groups)

    # Epsilon-squared effect size
    n = sum(len(g) for g in groups)
    epsilon_sq = (stat - len(groups) + 1) / (n - len(groups))

    result = {
        "test": "kruskal_wallis",
        "statistic": round(stat, 4),
        "p_value": round(p, 6),
        "effect_size": {
            "epsilon_squared": round(epsilon_sq, 4),
            "interpretation": interpret_effect_size(epsilon_sq, 'eta_squared')  # Similar scale
        },
        "n_groups": len(groups),
        "group_names": group_names,
        "group_stats": {
            name: {
                "n": len(g),
                "median": round(np.median(g), 4),
                "iqr": round(stats.iqr(g), 4)
            }
            for name, g in zip(group_names, groups)
        }
    }

    # Post-hoc: Dunn's test
    if posthoc and p < 0.05 and HAS_PINGOUIN:
        try:
            posthoc_result = pg.pairwise_tests(data=data, dv=outcome, between=factor,
                                               parametric=False, padjust='bonf')
            result["posthoc"] = {
                "method": "dunn_bonferroni",
                "comparisons": posthoc_result.to_dict('records')
            }
        except Exception:
            result["posthoc"] = {"method": "dunn", "error": "Could not compute post-hoc"}

    return result


def interpret_effect_size(value: float, effect_type: str) -> str:
    """
    Interpret effect size magnitude.

    Args:
        value: The effect size value (absolute)
        effect_type: One of 'cohens_d', 'pearson_r', 'eta_squared', 'cramers_v'

    Returns:
        String interpretation: 'negligible', 'small', 'medium', or 'large'
    """
    thresholds = {
        'cohens_d': [(0.2, 'small'), (0.5, 'medium'), (0.8, 'large')],
        'pearson_r': [(0.1, 'small'), (0.3, 'medium'), (0.5, 'large')],
        'eta_squared': [(0.01, 'small'), (0.06, 'medium'), (0.14, 'large')],
        'cramers_v': [(0.1, 'small'), (0.3, 'medium'), (0.5, 'large')],
    }

    if effect_type not in thresholds:
        return 'unknown'

    value = abs(value)
    for threshold, label in thresholds[effect_type]:
        if value < threshold:
            return 'negligible' if label == 'small' else thresholds[effect_type][thresholds[effect_type].index((threshold, label)) - 1][1] if thresholds[effect_type].index((threshold, label)) > 0 else 'negligible'

    return 'large'


def format_results_markdown(results: Dict) -> str:
    """
    Format test results as standardized markdown output.

    Args:
        results: Dict from any test function

    Returns:
        Markdown-formatted string
    """
    test_name = results.get('test', 'Statistical Test').replace('_', ' ').title()

    lines = [
        f"## {test_name} Results",
        "",
        f"**Test:** {test_name}",
        "",
        "| Statistic | Value |",
        "|-----------|-------|",
    ]

    # Add main statistics
    if 'statistic' in results:
        lines.append(f"| Test Statistic | {results['statistic']} |")
    if 'df' in results:
        lines.append(f"| Degrees of Freedom | {results['df']} |")
    if 'p_value' in results:
        lines.append(f"| p-value | {results['p_value']} |")

    # Add effect size
    if 'effect_size' in results:
        es = results['effect_size']
        for key, value in es.items():
            if key != 'interpretation':
                lines.append(f"| {key.replace('_', ' ').title()} | {value} ({es.get('interpretation', '')}) |")

    # Add sample info
    if 'n1' in results:
        lines.append(f"| N (Group 1) | {results['n1']} |")
    if 'n2' in results:
        lines.append(f"| N (Group 2) | {results['n2']} |")

    # Confidence interval
    if 'ci_95' in results:
        lines.append(f"| 95% CI | [{results['ci_95'][0]}, {results['ci_95'][1]}] |")

    lines.extend([
        "",
        "**Causal Note:** This is correlation. For causal interpretation, validate with CausalInference skill."
    ])

    return "\n".join(lines)


if __name__ == "__main__":
    # Example usage
    import pandas as pd

    # Generate sample data
    np.random.seed(42)
    df = pd.DataFrame({
        'group': ['A']*30 + ['B']*30,
        'score': np.concatenate([
            np.random.normal(100, 15, 30),
            np.random.normal(110, 15, 30)
        ])
    })

    # Test selection
    print("=== Test Selection ===")
    selection = select_test(df, 'score', 'group')
    print(f"Recommended: {selection['recommended_test']}")
    print(f"Justification: {selection['justification']}")

    # Run t-test
    print("\n=== T-Test ===")
    g1 = df[df['group'] == 'A']['score']
    g2 = df[df['group'] == 'B']['score']
    result = run_ttest(g1, g2)
    print(format_results_markdown(result))
