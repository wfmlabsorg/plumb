"""
Regression Analysis Tools for StatisticalAnalysis Skill
Provides OLS regression with diagnostics, VIF, and predictor importance.

Dependencies: scipy, statsmodels, pandas, numpy
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Union
import warnings

try:
    import statsmodels.api as sm
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    from statsmodels.stats.diagnostic import het_breuschpagan, acorr_ljungbox
    from statsmodels.stats.stattools import durbin_watson
    HAS_STATSMODELS = True
except ImportError:
    HAS_STATSMODELS = False
    warnings.warn("statsmodels not installed. Regression features will be limited.")

from scipy import stats


def fit_ols(
    X: Union[pd.DataFrame, np.ndarray],
    y: Union[pd.Series, np.ndarray],
    add_constant: bool = True
) -> Dict:
    """
    Fit OLS regression with comprehensive diagnostics.

    Args:
        X: Predictor variables (DataFrame or array)
        y: Outcome variable
        add_constant: Whether to add intercept term

    Returns:
        Dict with model results, coefficients, and diagnostics
    """
    if not HAS_STATSMODELS:
        raise ImportError("statsmodels required for OLS regression")

    # Prepare data
    if isinstance(X, pd.DataFrame):
        feature_names = list(X.columns)
        X_data = X.values
    else:
        X_data = np.array(X)
        feature_names = [f"X{i+1}" for i in range(X_data.shape[1])]

    y_data = np.array(y).flatten()

    # Remove missing values
    mask = ~(np.isnan(X_data).any(axis=1) | np.isnan(y_data))
    X_clean = X_data[mask]
    y_clean = y_data[mask]

    if add_constant:
        X_with_const = sm.add_constant(X_clean)
        all_names = ['Intercept'] + feature_names
    else:
        X_with_const = X_clean
        all_names = feature_names

    # Fit model
    model = sm.OLS(y_clean, X_with_const).fit()

    # Extract results
    result = {
        "model_type": "OLS",
        "n_observations": int(model.nobs),
        "n_predictors": len(feature_names),
        "r_squared": round(model.rsquared, 4),
        "r_squared_adj": round(model.rsquared_adj, 4),
        "f_statistic": round(model.fvalue, 4) if model.fvalue else None,
        "f_pvalue": round(model.f_pvalue, 6) if model.f_pvalue else None,
        "aic": round(model.aic, 2),
        "bic": round(model.bic, 2),
        "coefficients": {},
        "residuals_summary": {},
        "diagnostics": {}
    }

    # Coefficients
    for i, name in enumerate(all_names):
        result["coefficients"][name] = {
            "estimate": round(model.params[i], 6),
            "std_error": round(model.bse[i], 6),
            "t_value": round(model.tvalues[i], 4),
            "p_value": round(model.pvalues[i], 6),
            "ci_95": [round(model.conf_int()[i, 0], 6), round(model.conf_int()[i, 1], 6)]
        }

    # Standardized coefficients (beta weights)
    if add_constant:
        X_std = (X_clean - X_clean.mean(axis=0)) / X_clean.std(axis=0)
        y_std = (y_clean - y_clean.mean()) / y_clean.std()
        model_std = sm.OLS(y_std, X_std).fit()
        for i, name in enumerate(feature_names):
            result["coefficients"][name]["standardized_beta"] = round(model_std.params[i], 4)

    # Residuals summary
    residuals = model.resid
    result["residuals_summary"] = {
        "mean": round(np.mean(residuals), 6),
        "std": round(np.std(residuals), 4),
        "min": round(np.min(residuals), 4),
        "max": round(np.max(residuals), 4),
        "skewness": round(stats.skew(residuals), 4),
        "kurtosis": round(stats.kurtosis(residuals), 4)
    }

    # Run diagnostics
    result["diagnostics"] = check_assumptions(model, X_clean, y_clean)

    # Store model for further analysis
    result["_model"] = model

    return result


def check_assumptions(
    model,
    X: np.ndarray,
    y: np.ndarray
) -> Dict:
    """
    Check OLS regression assumptions.

    Tests:
    - Normality of residuals (Shapiro-Wilk, Jarque-Bera)
    - Homoscedasticity (Breusch-Pagan)
    - Autocorrelation (Durbin-Watson)
    - Multicollinearity (VIF)

    Args:
        model: Fitted statsmodels OLS model
        X: Predictor matrix (without constant)
        y: Outcome vector

    Returns:
        Dict with diagnostic test results
    """
    diagnostics = {}
    residuals = model.resid

    # 1. Normality of residuals
    if len(residuals) >= 3:
        # Shapiro-Wilk
        if len(residuals) <= 5000:
            sw_stat, sw_p = stats.shapiro(residuals)
            diagnostics["normality_shapiro"] = {
                "statistic": round(sw_stat, 4),
                "p_value": round(sw_p, 4),
                "passed": sw_p > 0.05,
                "interpretation": "Residuals appear normal" if sw_p > 0.05 else "Residuals deviate from normality"
            }

        # Jarque-Bera
        jb_stat, jb_p = stats.jarque_bera(residuals)
        diagnostics["normality_jarque_bera"] = {
            "statistic": round(jb_stat, 4),
            "p_value": round(jb_p, 4),
            "passed": jb_p > 0.05,
            "interpretation": "Residuals appear normal" if jb_p > 0.05 else "Residuals deviate from normality"
        }

    # 2. Homoscedasticity (Breusch-Pagan)
    try:
        X_with_const = sm.add_constant(X)
        bp_stat, bp_p, _, _ = het_breuschpagan(residuals, X_with_const)
        diagnostics["homoscedasticity_breusch_pagan"] = {
            "statistic": round(bp_stat, 4),
            "p_value": round(bp_p, 4),
            "passed": bp_p > 0.05,
            "interpretation": "Homoscedasticity holds" if bp_p > 0.05 else "Heteroscedasticity detected"
        }
    except Exception as e:
        diagnostics["homoscedasticity_breusch_pagan"] = {"error": str(e)}

    # 3. Autocorrelation (Durbin-Watson)
    dw_stat = durbin_watson(residuals)
    diagnostics["autocorrelation_durbin_watson"] = {
        "statistic": round(dw_stat, 4),
        "interpretation": (
            "No autocorrelation" if 1.5 < dw_stat < 2.5
            else "Positive autocorrelation likely" if dw_stat < 1.5
            else "Negative autocorrelation likely"
        ),
        "passed": 1.5 < dw_stat < 2.5
    }

    # 4. Multicollinearity (VIF)
    if X.shape[1] > 1:
        diagnostics["multicollinearity_vif"] = calculate_vif(pd.DataFrame(X))

    # Overall assessment
    checks = [d.get("passed", True) for d in diagnostics.values() if isinstance(d, dict) and "passed" in d]
    diagnostics["overall"] = {
        "checks_passed": sum(checks),
        "checks_total": len(checks),
        "all_passed": all(checks) if checks else True
    }

    return diagnostics


def calculate_vif(X: pd.DataFrame) -> Dict:
    """
    Calculate Variance Inflation Factors for multicollinearity assessment.

    Args:
        X: DataFrame of predictor variables

    Returns:
        Dict with VIF for each variable and interpretation
    """
    if not HAS_STATSMODELS:
        raise ImportError("statsmodels required for VIF calculation")

    X_array = X.values
    n_features = X_array.shape[1]

    vif_data = {}
    for i in range(n_features):
        try:
            vif = variance_inflation_factor(X_array, i)
            col_name = X.columns[i] if hasattr(X, 'columns') else f"X{i+1}"
            vif_data[col_name] = {
                "vif": round(vif, 2),
                "interpretation": (
                    "No concern" if vif < 5
                    else "Moderate multicollinearity" if vif < 10
                    else "Severe multicollinearity"
                )
            }
        except Exception:
            continue

    # Overall assessment
    max_vif = max(v["vif"] for v in vif_data.values()) if vif_data else 0
    vif_data["_summary"] = {
        "max_vif": max_vif,
        "concern": max_vif >= 5,
        "recommendation": (
            "No multicollinearity concerns"
            if max_vif < 5
            else "Consider removing or combining highly correlated predictors"
        )
    }

    return vif_data


def get_predictor_importance(
    model_result: Dict,
    method: str = "standardized"
) -> Dict:
    """
    Calculate predictor importance from regression results.

    Args:
        model_result: Dict from fit_ols()
        method: "standardized" (beta weights), "t_value", or "shapley" (calls ShapleyDecomposition)

    Returns:
        Dict with predictor importance rankings
    """
    coefficients = model_result.get("coefficients", {})

    # Remove intercept for importance ranking
    predictors = {k: v for k, v in coefficients.items() if k != 'Intercept'}

    if method == "standardized":
        importance = {
            name: abs(coef.get("standardized_beta", 0))
            for name, coef in predictors.items()
        }
    elif method == "t_value":
        importance = {
            name: abs(coef.get("t_value", 0))
            for name, coef in predictors.items()
        }
    else:
        importance = {
            name: abs(coef.get("standardized_beta", 0))
            for name, coef in predictors.items()
        }

    # Rank predictors
    sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)

    return {
        "method": method,
        "importance": {k: round(v, 4) for k, v in sorted_importance},
        "ranking": [k for k, v in sorted_importance],
        "r_squared": model_result.get("r_squared"),
        "note": "For causal importance, use Shapley decomposition with CausalInference validation"
    }


def format_regression_markdown(result: Dict) -> str:
    """
    Format regression results as standardized markdown output.

    Args:
        result: Dict from fit_ols()

    Returns:
        Markdown-formatted string
    """
    lines = [
        "## OLS Regression Results",
        "",
        "### Model Summary",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| N | {result['n_observations']} |",
        f"| R² | {result['r_squared']} |",
        f"| Adjusted R² | {result['r_squared_adj']} |",
        f"| F-statistic | {result['f_statistic']} |",
        f"| F p-value | {result['f_pvalue']} |",
        f"| AIC | {result['aic']} |",
        f"| BIC | {result['bic']} |",
        "",
        "### Coefficients",
        "",
        "| Predictor | Estimate | Std Error | t | p-value | 95% CI |",
        "|-----------|----------|-----------|---|---------|--------|",
    ]

    for name, coef in result["coefficients"].items():
        ci = coef.get("ci_95", [None, None])
        ci_str = f"[{ci[0]}, {ci[1]}]" if ci[0] is not None else "N/A"
        sig = "***" if coef["p_value"] < 0.001 else "**" if coef["p_value"] < 0.01 else "*" if coef["p_value"] < 0.05 else ""
        lines.append(f"| {name} | {coef['estimate']} | {coef['std_error']} | {coef['t_value']} | {coef['p_value']}{sig} | {ci_str} |")

    lines.append("")
    lines.append("*Significance: *** p<0.001, ** p<0.01, * p<0.05*")

    # Diagnostics summary
    diag = result.get("diagnostics", {})
    if diag:
        lines.extend([
            "",
            "### Assumption Diagnostics",
            "",
            "| Test | Result | Status |",
            "|------|--------|--------|",
        ])

        for test_name, test_result in diag.items():
            if test_name == "overall" or test_name.startswith("_"):
                continue
            if isinstance(test_result, dict):
                if "passed" in test_result:
                    status = "✓" if test_result["passed"] else "✗"
                    interp = test_result.get("interpretation", "")
                    lines.append(f"| {test_name.replace('_', ' ').title()} | {interp} | {status} |")

    lines.extend([
        "",
        "**Causal Note:** This is correlation. For causal interpretation, validate with CausalInference skill."
    ])

    return "\n".join(lines)


if __name__ == "__main__":
    # Example usage
    np.random.seed(42)

    # Generate sample data
    n = 100
    X = pd.DataFrame({
        'tenure': np.random.uniform(1, 10, n),
        'training_hours': np.random.uniform(10, 50, n),
        'satisfaction': np.random.uniform(3, 5, n)
    })

    # Create outcome with known relationships
    y = (
        5 +
        2 * X['tenure'] +
        0.5 * X['training_hours'] +
        3 * X['satisfaction'] +
        np.random.normal(0, 5, n)
    )

    # Fit model
    print("=== OLS Regression ===")
    result = fit_ols(X, y)
    print(format_regression_markdown(result))

    # Predictor importance
    print("\n=== Predictor Importance ===")
    importance = get_predictor_importance(result)
    print(f"Method: {importance['method']}")
    print(f"Ranking: {importance['ranking']}")
    print(f"Importance: {importance['importance']}")
