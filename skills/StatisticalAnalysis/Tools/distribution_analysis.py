"""
Distribution Analysis Tools for StatisticalAnalysis Skill
Provides distribution fitting, normality tests, and descriptive statistics.

Dependencies: scipy, pandas, numpy
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Optional, Tuple, Union
import warnings


# Candidate distributions for fitting
CONTINUOUS_DISTRIBUTIONS = [
    ('norm', 'Normal'),
    ('lognorm', 'Log-Normal'),
    ('expon', 'Exponential'),
    ('gamma', 'Gamma'),
    ('weibull_min', 'Weibull'),
    ('beta', 'Beta'),
    ('uniform', 'Uniform'),
    ('t', 'Student-t'),
]


def describe_distribution(
    data: Union[np.ndarray, pd.Series],
    percentiles: List[float] = [0.05, 0.25, 0.5, 0.75, 0.95]
) -> Dict:
    """
    Compute comprehensive descriptive statistics for a distribution.

    Args:
        data: Numeric array or series
        percentiles: Percentiles to compute (as fractions)

    Returns:
        Dict with all descriptive statistics
    """
    data = np.array(data).flatten()
    data = data[~np.isnan(data)]

    n = len(data)

    if n == 0:
        return {"error": "No valid data points"}

    result = {
        "n": n,
        "missing": 0,  # Already removed
        "central_tendency": {
            "mean": round(np.mean(data), 4),
            "median": round(np.median(data), 4),
            "mode": round(float(stats.mode(data, keepdims=True)[0][0]), 4) if n > 0 else None,
            "trimmed_mean_10": round(stats.trim_mean(data, 0.1), 4) if n >= 10 else None
        },
        "dispersion": {
            "std": round(np.std(data, ddof=1), 4),
            "variance": round(np.var(data, ddof=1), 4),
            "iqr": round(stats.iqr(data), 4),
            "range": round(np.max(data) - np.min(data), 4),
            "mad": round(stats.median_abs_deviation(data), 4),
            "cv": round(np.std(data, ddof=1) / np.mean(data), 4) if np.mean(data) != 0 else None
        },
        "shape": {
            "skewness": round(stats.skew(data), 4),
            "kurtosis": round(stats.kurtosis(data), 4),  # Excess kurtosis
            "skew_interpretation": interpret_skewness(stats.skew(data)),
            "kurtosis_interpretation": interpret_kurtosis(stats.kurtosis(data))
        },
        "range": {
            "min": round(np.min(data), 4),
            "max": round(np.max(data), 4)
        },
        "percentiles": {
            f"p{int(p*100)}": round(np.percentile(data, p*100), 4)
            for p in percentiles
        },
        "outliers": detect_outliers(data)
    }

    return result


def interpret_skewness(skew: float) -> str:
    """Interpret skewness value."""
    if abs(skew) < 0.5:
        return "approximately symmetric"
    elif skew < -1:
        return "highly left-skewed"
    elif skew < -0.5:
        return "moderately left-skewed"
    elif skew > 1:
        return "highly right-skewed"
    else:
        return "moderately right-skewed"


def interpret_kurtosis(kurt: float) -> str:
    """Interpret excess kurtosis value."""
    if kurt < -1:
        return "platykurtic (thin tails)"
    elif kurt > 1:
        return "leptokurtic (heavy tails)"
    else:
        return "mesokurtic (normal-like tails)"


def detect_outliers(
    data: np.ndarray,
    method: str = "iqr"
) -> Dict:
    """
    Detect outliers using IQR or Z-score method.

    Args:
        data: Numeric array
        method: "iqr" or "zscore"

    Returns:
        Dict with outlier information
    """
    data = np.array(data).flatten()

    if method == "iqr":
        q1 = np.percentile(data, 25)
        q3 = np.percentile(data, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outliers = data[(data < lower_bound) | (data > upper_bound)]
    else:  # zscore
        z_scores = np.abs(stats.zscore(data))
        outliers = data[z_scores > 3]
        lower_bound = np.mean(data) - 3 * np.std(data)
        upper_bound = np.mean(data) + 3 * np.std(data)

    return {
        "method": method,
        "n_outliers": len(outliers),
        "pct_outliers": round(len(outliers) / len(data) * 100, 2),
        "lower_bound": round(lower_bound, 4),
        "upper_bound": round(upper_bound, 4),
        "outlier_values": sorted([round(x, 4) for x in outliers])[:10]  # First 10
    }


def test_normality(
    data: Union[np.ndarray, pd.Series],
    alpha: float = 0.05
) -> Dict:
    """
    Run multiple normality tests with recommendations.

    Tests:
    - Shapiro-Wilk (best for n < 5000)
    - Kolmogorov-Smirnov
    - D'Agostino-Pearson (best for n >= 20)
    - Anderson-Darling

    Args:
        data: Numeric array or series
        alpha: Significance level

    Returns:
        Dict with all test results and recommendation
    """
    data = np.array(data).flatten()
    data = data[~np.isnan(data)]
    n = len(data)

    results = {
        "n": n,
        "alpha": alpha,
        "tests": {},
        "recommendation": ""
    }

    # Shapiro-Wilk
    if 3 <= n <= 5000:
        stat, p = stats.shapiro(data)
        results["tests"]["shapiro_wilk"] = {
            "statistic": round(stat, 4),
            "p_value": round(p, 6),
            "normal": p > alpha,
            "note": "Most powerful for small samples"
        }

    # Kolmogorov-Smirnov (with estimated parameters)
    if n >= 5:
        stat, p = stats.kstest(data, 'norm', args=(np.mean(data), np.std(data)))
        results["tests"]["kolmogorov_smirnov"] = {
            "statistic": round(stat, 4),
            "p_value": round(p, 6),
            "normal": p > alpha,
            "note": "Sensitive to differences in location and shape"
        }

    # D'Agostino-Pearson
    if n >= 20:
        stat, p = stats.normaltest(data)
        results["tests"]["dagostino_pearson"] = {
            "statistic": round(stat, 4),
            "p_value": round(p, 6),
            "normal": p > alpha,
            "note": "Tests skewness and kurtosis jointly"
        }

    # Anderson-Darling
    if n >= 8:
        result = stats.anderson(data, dist='norm')
        # Use 5% significance level
        critical_idx = 2  # 5% is at index 2
        results["tests"]["anderson_darling"] = {
            "statistic": round(result.statistic, 4),
            "critical_value_5pct": round(result.critical_values[critical_idx], 4),
            "normal": result.statistic < result.critical_values[critical_idx],
            "note": "More weight to tails than K-S"
        }

    # Overall recommendation
    if results["tests"]:
        votes = [t["normal"] for t in results["tests"].values()]
        pct_normal = sum(votes) / len(votes)

        if pct_normal >= 0.75:
            results["is_normal"] = True
            results["recommendation"] = "Data appears normally distributed. Parametric methods appropriate."
        elif pct_normal >= 0.5:
            results["is_normal"] = False
            results["recommendation"] = "Mixed evidence. Consider both parametric and non-parametric approaches, or apply transformation."
        else:
            results["is_normal"] = False
            results["recommendation"] = "Data deviates from normality. Use non-parametric methods or transform data."

    return results


def fit_distribution(
    data: Union[np.ndarray, pd.Series],
    candidates: Optional[List[str]] = None
) -> Dict:
    """
    Fit multiple candidate distributions and compare by AIC/BIC.

    Args:
        data: Numeric array or series
        candidates: List of distribution names to try (default: common distributions)

    Returns:
        Dict with fitted distributions ranked by AIC
    """
    data = np.array(data).flatten()
    data = data[~np.isnan(data)]
    n = len(data)

    if candidates is None:
        candidates = [d[0] for d in CONTINUOUS_DISTRIBUTIONS]

    results = {
        "n": n,
        "data_range": [round(np.min(data), 4), round(np.max(data), 4)],
        "fits": [],
        "best_fit": None
    }

    for dist_name in candidates:
        try:
            dist = getattr(stats, dist_name)

            # Fit distribution
            params = dist.fit(data)

            # Compute log-likelihood
            log_likelihood = np.sum(dist.logpdf(data, *params))

            # Compute AIC and BIC
            k = len(params)  # Number of parameters
            aic = 2 * k - 2 * log_likelihood
            bic = k * np.log(n) - 2 * log_likelihood

            # Kolmogorov-Smirnov test for goodness of fit
            ks_stat, ks_p = stats.kstest(data, dist_name, args=params)

            # Get friendly name
            friendly_name = next(
                (d[1] for d in CONTINUOUS_DISTRIBUTIONS if d[0] == dist_name),
                dist_name
            )

            results["fits"].append({
                "distribution": dist_name,
                "name": friendly_name,
                "parameters": {f"param_{i}": round(p, 6) for i, p in enumerate(params)},
                "log_likelihood": round(log_likelihood, 4),
                "aic": round(aic, 4),
                "bic": round(bic, 4),
                "ks_statistic": round(ks_stat, 4),
                "ks_pvalue": round(ks_p, 6),
                "good_fit": ks_p > 0.05
            })

        except Exception as e:
            # Some distributions may fail for certain data
            continue

    # Sort by AIC
    results["fits"] = sorted(results["fits"], key=lambda x: x["aic"])

    if results["fits"]:
        results["best_fit"] = results["fits"][0]
        results["recommendation"] = (
            f"Best fit: {results['best_fit']['name']} (AIC={results['best_fit']['aic']}). "
            f"K-S test p-value: {results['best_fit']['ks_pvalue']}."
        )

    return results


def compare_distributions(
    data: Union[np.ndarray, pd.Series],
    dist1: str,
    dist2: str
) -> Dict:
    """
    Compare two fitted distributions using likelihood ratio test.

    Args:
        data: Numeric data
        dist1: Name of first distribution
        dist2: Name of second distribution

    Returns:
        Dict with comparison results
    """
    data = np.array(data).flatten()
    data = data[~np.isnan(data)]

    results = {}

    for dist_name in [dist1, dist2]:
        try:
            dist = getattr(stats, dist_name)
            params = dist.fit(data)
            ll = np.sum(dist.logpdf(data, *params))
            k = len(params)

            results[dist_name] = {
                "log_likelihood": round(ll, 4),
                "n_params": k,
                "aic": round(2 * k - 2 * ll, 4)
            }
        except Exception as e:
            results[dist_name] = {"error": str(e)}

    if "error" not in results.get(dist1, {}) and "error" not in results.get(dist2, {}):
        delta_aic = results[dist1]["aic"] - results[dist2]["aic"]
        better = dist1 if delta_aic < 0 else dist2

        results["comparison"] = {
            "delta_aic": round(delta_aic, 4),
            "better_fit": better,
            "interpretation": (
                f"{better} provides substantially better fit (ΔAIC > 10)"
                if abs(delta_aic) > 10
                else f"{better} provides better fit (2 < ΔAIC ≤ 10)"
                if abs(delta_aic) > 2
                else "Models are roughly equivalent (ΔAIC ≤ 2)"
            )
        }

    return results


def suggest_transformation(data: Union[np.ndarray, pd.Series]) -> Dict:
    """
    Suggest data transformations to achieve normality.

    Args:
        data: Numeric data

    Returns:
        Dict with transformation recommendations
    """
    data = np.array(data).flatten()
    data = data[~np.isnan(data)]

    # Only proceed if data is positive for log/sqrt
    has_negative = np.any(data <= 0)
    has_zero = np.any(data == 0)

    suggestions = []

    # Original normality
    orig_norm = test_normality(data)

    # Try transformations
    transformations = [
        ("original", data),
    ]

    if not has_negative and not has_zero:
        transformations.append(("log", np.log(data)))
        transformations.append(("sqrt", np.sqrt(data)))

    if not has_negative:
        if not has_zero:
            transformations.append(("inverse", 1 / data))

    # Box-Cox (requires positive data)
    if not has_negative and not has_zero:
        try:
            transformed, lambda_param = stats.boxcox(data)
            transformations.append(("box_cox", transformed))
        except Exception:
            pass

    for name, transformed_data in transformations:
        norm_test = test_normality(transformed_data)
        sw_p = norm_test["tests"].get("shapiro_wilk", {}).get("p_value", 0)

        suggestions.append({
            "transformation": name,
            "shapiro_p": sw_p,
            "is_normal": norm_test.get("is_normal", False)
        })

    # Sort by Shapiro p-value (higher is better)
    suggestions = sorted(suggestions, key=lambda x: x["shapiro_p"], reverse=True)

    return {
        "original_is_normal": orig_norm.get("is_normal", False),
        "suggestions": suggestions,
        "best_transformation": suggestions[0]["transformation"],
        "recommendation": (
            f"Apply {suggestions[0]['transformation']} transformation for closest to normality"
            if not orig_norm.get("is_normal", False)
            else "Data is already approximately normal; no transformation needed"
        )
    }


def format_distribution_markdown(result: Dict) -> str:
    """
    Format distribution analysis results as markdown.

    Args:
        result: Dict from fit_distribution()

    Returns:
        Markdown-formatted string
    """
    lines = [
        "## Distribution Analysis Results",
        "",
        f"**N:** {result['n']}",
        f"**Data Range:** [{result['data_range'][0]}, {result['data_range'][1]}]",
        "",
        "### Fitted Distributions (Ranked by AIC)",
        "",
        "| Distribution | AIC | BIC | K-S p-value | Good Fit |",
        "|--------------|-----|-----|-------------|----------|",
    ]

    for fit in result["fits"][:5]:  # Top 5
        good = "✓" if fit["good_fit"] else "✗"
        lines.append(
            f"| {fit['name']} | {fit['aic']} | {fit['bic']} | {fit['ks_pvalue']} | {good} |"
        )

    if result.get("best_fit"):
        lines.extend([
            "",
            f"**Best Fit:** {result['best_fit']['name']}",
            f"**Recommendation:** {result.get('recommendation', '')}",
        ])

    lines.extend([
        "",
        "**Causal Note:** This is correlation. For causal interpretation, validate with CausalInference skill."
    ])

    return "\n".join(lines)


if __name__ == "__main__":
    # Example usage
    np.random.seed(42)

    # Generate sample data (lognormal)
    data = np.random.lognormal(mean=2, sigma=0.5, size=200)

    print("=== Descriptive Statistics ===")
    desc = describe_distribution(data)
    print(f"Mean: {desc['central_tendency']['mean']}")
    print(f"Median: {desc['central_tendency']['median']}")
    print(f"Skewness: {desc['shape']['skewness']} ({desc['shape']['skew_interpretation']})")
    print(f"Outliers: {desc['outliers']['n_outliers']}")

    print("\n=== Normality Tests ===")
    norm = test_normality(data)
    print(f"Is Normal: {norm['is_normal']}")
    print(f"Recommendation: {norm['recommendation']}")

    print("\n=== Distribution Fitting ===")
    fits = fit_distribution(data)
    print(format_distribution_markdown(fits))

    print("\n=== Transformation Suggestions ===")
    trans = suggest_transformation(data)
    print(f"Best Transformation: {trans['best_transformation']}")
    print(f"Recommendation: {trans['recommendation']}")
