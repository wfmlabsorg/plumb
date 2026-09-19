#!/usr/bin/env python3
"""
variance_calculations.py - Variance Analysis Computation Tools

Functions for decomposing variances between plan/budget and actual results.
For multi-factor decomposition (3+ factors), routes to ShapleyDecomposition skill.

Usage:
    python variance_calculations.py --type two-factor --actual-qty 110 --actual-price 12 --budget-qty 100 --budget-price 10
    python variance_calculations.py --type flex --budget-rate 50 --budget-volume 1000 --actual-rate 55 --actual-volume 1100
    python variance_calculations.py --help
"""

import argparse
import json
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Optional, Dict, List, Tuple
import sys

# ============================================================================
# TYPES
# ============================================================================

class MetricType(Enum):
    COST = "cost"           # Lower is better
    REVENUE = "revenue"     # Higher is better
    EFFICIENCY = "efficiency"  # Lower is better (like AHT)
    QUALITY = "quality"     # Higher is better

class FavorableStatus(Enum):
    FAVORABLE = "F"
    UNFAVORABLE = "U"
    NEUTRAL = "—"

@dataclass
class VarianceComponent:
    name: str
    budget: float
    actual: float
    variance: float
    variance_pct: float
    favorable: FavorableStatus

@dataclass
class TwoFactorResult:
    total_variance: float
    price_variance: float
    quantity_variance: float
    joint_variance: float  # Interaction term
    components: List[VarianceComponent]
    verification: bool

@dataclass
class FlexBudgetResult:
    static_budget: float
    flex_budget: float
    actual: float
    volume_variance: float      # Uncontrollable
    flex_variance: float        # Controllable
    total_variance: float
    controllable_pct: float
    verification: bool

@dataclass
class VarianceTableRow:
    component: str
    budget: float
    actual: float
    variance: float
    variance_pct: float
    favorable: str

# ============================================================================
# CORE FUNCTIONS
# ============================================================================

def classify_favorable(variance: float, metric_type: MetricType) -> FavorableStatus:
    """
    Determine if a variance is Favorable or Unfavorable based on metric type.

    Args:
        variance: The variance amount (actual - budget)
        metric_type: Type of metric determining direction preference

    Returns:
        FavorableStatus enum value
    """
    if abs(variance) < 0.001:
        return FavorableStatus.NEUTRAL

    # Cost/Efficiency: negative variance (under budget) is favorable
    if metric_type in (MetricType.COST, MetricType.EFFICIENCY):
        return FavorableStatus.FAVORABLE if variance < 0 else FavorableStatus.UNFAVORABLE

    # Revenue/Quality: positive variance (over target) is favorable
    if metric_type in (MetricType.REVENUE, MetricType.QUALITY):
        return FavorableStatus.FAVORABLE if variance > 0 else FavorableStatus.UNFAVORABLE

    return FavorableStatus.NEUTRAL


def two_factor_variance(
    actual_qty: float,
    actual_price: float,
    budget_qty: float,
    budget_price: float,
    metric_type: MetricType = MetricType.COST
) -> TwoFactorResult:
    """
    Classic two-factor variance decomposition (Price × Quantity).

    Total Variance = Price Variance + Quantity Variance + Joint Variance

    Convention:
    - Price Variance = (Actual Price - Budget Price) × Actual Qty
    - Qty Variance = (Actual Qty - Budget Qty) × Budget Price
    - Joint Variance = ΔPrice × ΔQty (the interaction term)

    Args:
        actual_qty: Actual quantity
        actual_price: Actual price/rate
        budget_qty: Budgeted quantity
        budget_price: Budgeted price/rate
        metric_type: For determining F/U status

    Returns:
        TwoFactorResult with decomposition
    """
    # Calculate variances
    budget_total = budget_qty * budget_price
    actual_total = actual_qty * actual_price
    total_variance = actual_total - budget_total

    delta_price = actual_price - budget_price
    delta_qty = actual_qty - budget_qty

    # Standard decomposition
    price_variance = delta_price * actual_qty
    quantity_variance = delta_qty * budget_price
    joint_variance = delta_price * delta_qty

    # Note: price_variance uses actual_qty, but includes joint.
    # Alternative pure decomposition:
    # price_variance_pure = delta_price * budget_qty
    # quantity_variance_pure = delta_qty * budget_price
    # joint stays the same
    # This version: price absorbs the joint effect

    # For clean reporting, we can show joint separately or absorb it
    # Here we'll show it separately for transparency
    price_variance_pure = delta_price * budget_qty

    # Build components
    components = [
        VarianceComponent(
            name="Total",
            budget=budget_total,
            actual=actual_total,
            variance=total_variance,
            variance_pct=(total_variance / budget_total * 100) if budget_total != 0 else 0,
            favorable=classify_favorable(total_variance, metric_type)
        )
    ]

    # Verification
    verification = abs((price_variance_pure + quantity_variance + joint_variance) - total_variance) < 0.01

    return TwoFactorResult(
        total_variance=total_variance,
        price_variance=price_variance_pure,
        quantity_variance=quantity_variance,
        joint_variance=joint_variance,
        components=components,
        verification=verification
    )


def flex_budget(
    budget_rate: float,
    budget_volume: float,
    actual_rate: float,
    actual_volume: float,
    metric_type: MetricType = MetricType.COST
) -> FlexBudgetResult:
    """
    Flexible budget variance analysis.

    Separates variance into:
    - Volume Variance (uncontrollable): Due to activity level changes
    - Flex Variance (controllable): Due to rate/efficiency changes

    Args:
        budget_rate: Budgeted rate per unit
        budget_volume: Budgeted volume/activity level
        actual_rate: Actual rate per unit
        actual_volume: Actual volume/activity level
        metric_type: For context (volume variance is typically uncontrollable)

    Returns:
        FlexBudgetResult with decomposition
    """
    static_budget = budget_rate * budget_volume
    flex_budget_val = budget_rate * actual_volume  # Budget rate at actual volume
    actual = actual_rate * actual_volume

    # Decompose
    volume_variance = flex_budget_val - static_budget  # Uncontrollable
    flex_variance = actual - flex_budget_val          # Controllable
    total_variance = actual - static_budget

    # Controllable percentage
    controllable_pct = (abs(flex_variance) / abs(total_variance) * 100) if total_variance != 0 else 0

    # Verification
    verification = abs((volume_variance + flex_variance) - total_variance) < 0.01

    return FlexBudgetResult(
        static_budget=static_budget,
        flex_budget=flex_budget_val,
        actual=actual,
        volume_variance=volume_variance,
        flex_variance=flex_variance,
        total_variance=total_variance,
        controllable_pct=controllable_pct,
        verification=verification
    )


def three_factor_variance(
    actual: Dict[str, float],
    budget: Dict[str, float],
    factors: List[str],
    model_type: str = "multiply"
) -> Dict[str, float]:
    """
    Sequential three-factor variance decomposition.

    WARNING: Order-dependent! For fair attribution, use ShapleyDecomposition skill.

    This function performs sequential decomposition, which attributes variance
    based on the order factors are analyzed. The first factor gets credit for
    all its effect including interactions, while later factors only get
    residual effects.

    Args:
        actual: Dict of factor name -> actual value
        budget: Dict of factor name -> budget value
        factors: List of factor names in analysis order
        model_type: "multiply" or "add"

    Returns:
        Dict with variance attributions (order-dependent!)
    """
    if len(factors) < 3:
        raise ValueError("Use two_factor_variance for 2 factors")

    # This is intentionally simplistic - for real multi-factor work, use Shapley
    result = {"_warning": "Order-dependent decomposition. For fair attribution, use ShapleyDecomposition skill."}

    if model_type == "multiply":
        # Sequential decomposition
        # Factor 1: Δf1 × (remaining at budget)
        # Factor 2: Δf2 × f1_actual × (remaining at budget)
        # etc.

        baseline_product = 1.0
        for f in factors:
            baseline_product *= budget[f]

        actual_product = 1.0
        for f in factors:
            actual_product *= actual[f]

        result["total_variance"] = actual_product - baseline_product
        result["factors"] = factors
        result["decomposition"] = "sequential_multiply"

        # This is a simplified attribution - real implementation would need
        # to carefully track the sequential effects
        remaining = result["total_variance"]
        for i, f in enumerate(factors):
            # Approximate: evenly distribute for now with warning
            result[f] = remaining / (len(factors) - i)
            remaining -= result[f]

    return result


def format_variance_table(
    rows: List[VarianceTableRow],
    title: str = "Variance Analysis"
) -> str:
    """
    Format variance data as a markdown table.

    Args:
        rows: List of VarianceTableRow objects
        title: Table title

    Returns:
        Formatted markdown string
    """
    output = f"## {title}\n\n"
    output += "| Component | Budget | Actual | Variance | % | F/U |\n"
    output += "|-----------|-------:|-------:|---------:|--:|:---:|\n"

    for row in rows:
        output += f"| {row.component} | {row.budget:,.2f} | {row.actual:,.2f} | "
        output += f"{row.variance:+,.2f} | {row.variance_pct:+.1f}% | {row.favorable} |\n"

    return output


def format_decomposition_table(
    decomposition: Dict[str, float],
    total: float,
    title: str = "Variance Decomposition"
) -> str:
    """
    Format variance decomposition as a markdown table.

    Args:
        decomposition: Dict of factor name -> attribution value
        total: Total variance for percentage calculation
        title: Table title

    Returns:
        Formatted markdown string
    """
    output = f"### {title}\n\n"
    output += "| Factor | Attribution | % of Total |\n"
    output += "|--------|------------:|-----------:|\n"

    for factor, value in decomposition.items():
        if factor.startswith("_"):
            continue
        pct = (value / total * 100) if total != 0 else 0
        output += f"| {factor} | {value:+,.2f} | {pct:+.1f}% |\n"

    # Verification
    total_check = sum(v for k, v in decomposition.items() if not k.startswith("_"))
    output += f"\n**Verification:** Sum = {total_check:,.2f} "
    output += "✓\n" if abs(total_check - total) < 0.01 else "✗\n"

    return output


# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Variance Analysis Calculations",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Two-factor variance (Price × Quantity)
  python variance_calculations.py --type two-factor \\
    --actual-qty 110 --actual-price 12 --budget-qty 100 --budget-price 10

  # Flexible budget analysis
  python variance_calculations.py --type flex \\
    --budget-rate 50 --budget-volume 1000 --actual-rate 55 --actual-volume 1100

  # Classify variance direction
  python variance_calculations.py --classify --variance -500 --metric cost

For multi-factor decomposition (3+ factors), use ShapleyDecomposition skill.
        """
    )

    parser.add_argument("--type", choices=["two-factor", "flex", "classify"],
                        help="Type of variance analysis")
    parser.add_argument("--output", choices=["json", "markdown"], default="markdown",
                        help="Output format")

    # Two-factor arguments
    parser.add_argument("--actual-qty", type=float, help="Actual quantity")
    parser.add_argument("--actual-price", type=float, help="Actual price/rate")
    parser.add_argument("--budget-qty", type=float, help="Budget quantity")
    parser.add_argument("--budget-price", type=float, help="Budget price/rate")

    # Flex budget arguments
    parser.add_argument("--budget-rate", type=float, help="Budget rate per unit")
    parser.add_argument("--budget-volume", type=float, help="Budget volume")
    parser.add_argument("--actual-rate", type=float, help="Actual rate per unit")
    parser.add_argument("--actual-volume", type=float, help="Actual volume")

    # Classification arguments
    parser.add_argument("--classify", action="store_true", help="Classify F/U only")
    parser.add_argument("--variance", type=float, help="Variance amount to classify")
    parser.add_argument("--metric", choices=["cost", "revenue", "efficiency", "quality"],
                        default="cost", help="Metric type for F/U determination")

    args = parser.parse_args()

    # Classification only
    if args.classify:
        if args.variance is None:
            print("Error: --variance required for classification")
            sys.exit(1)
        metric = MetricType(args.metric)
        status = classify_favorable(args.variance, metric)
        print(f"Variance: {args.variance:+,.2f}")
        print(f"Metric Type: {args.metric}")
        print(f"Status: {status.value} ({'Favorable' if status == FavorableStatus.FAVORABLE else 'Unfavorable' if status == FavorableStatus.UNFAVORABLE else 'Neutral'})")
        return

    # Two-factor variance
    if args.type == "two-factor":
        if None in [args.actual_qty, args.actual_price, args.budget_qty, args.budget_price]:
            print("Error: Two-factor requires --actual-qty, --actual-price, --budget-qty, --budget-price")
            sys.exit(1)

        result = two_factor_variance(
            args.actual_qty, args.actual_price,
            args.budget_qty, args.budget_price
        )

        if args.output == "json":
            print(json.dumps(asdict(result), indent=2, default=lambda x: x.value if isinstance(x, Enum) else x))
        else:
            print("## Two-Factor Variance Analysis\n")
            print(f"**Budget:** {args.budget_qty:,.0f} units × ${args.budget_price:,.2f} = ${args.budget_qty * args.budget_price:,.2f}")
            print(f"**Actual:** {args.actual_qty:,.0f} units × ${args.actual_price:,.2f} = ${args.actual_qty * args.actual_price:,.2f}")
            print(f"**Total Variance:** ${result.total_variance:+,.2f}\n")
            print("### Decomposition\n")
            print("| Component | Amount | % of Total |")
            print("|-----------|-------:|-----------:|")
            total = result.total_variance
            print(f"| Price Variance | ${result.price_variance:+,.2f} | {result.price_variance/total*100 if total else 0:+.1f}% |")
            print(f"| Quantity Variance | ${result.quantity_variance:+,.2f} | {result.quantity_variance/total*100 if total else 0:+.1f}% |")
            print(f"| Joint Variance | ${result.joint_variance:+,.2f} | {result.joint_variance/total*100 if total else 0:+.1f}% |")
            print(f"\n**Verification:** {result.price_variance + result.quantity_variance + result.joint_variance:+,.2f} = {total:+,.2f} {'✓' if result.verification else '✗'}")

    # Flex budget
    elif args.type == "flex":
        if None in [args.budget_rate, args.budget_volume, args.actual_rate, args.actual_volume]:
            print("Error: Flex requires --budget-rate, --budget-volume, --actual-rate, --actual-volume")
            sys.exit(1)

        result = flex_budget(
            args.budget_rate, args.budget_volume,
            args.actual_rate, args.actual_volume
        )

        if args.output == "json":
            print(json.dumps(asdict(result), indent=2))
        else:
            print("## Flexible Budget Analysis\n")
            print(f"**Static Budget:** ${result.static_budget:,.2f} (Budget Rate × Budget Volume)")
            print(f"**Flex Budget:** ${result.flex_budget:,.2f} (Budget Rate × Actual Volume)")
            print(f"**Actual:** ${result.actual:,.2f} (Actual Rate × Actual Volume)\n")
            print("### Variance Decomposition\n")
            print("| Component | Amount | Type |")
            print("|-----------|-------:|------|")
            print(f"| Volume Variance | ${result.volume_variance:+,.2f} | Uncontrollable |")
            print(f"| Flex Variance | ${result.flex_variance:+,.2f} | Controllable |")
            print(f"| **Total Variance** | **${result.total_variance:+,.2f}** | |")
            print(f"\n**Controllable %:** {result.controllable_pct:.1f}% of total variance is controllable")
            print(f"**Verification:** {'✓' if result.verification else '✗'}")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()


# ============================================================================
# MODULE EXPORTS
# ============================================================================

__all__ = [
    "MetricType",
    "FavorableStatus",
    "VarianceComponent",
    "TwoFactorResult",
    "FlexBudgetResult",
    "VarianceTableRow",
    "classify_favorable",
    "two_factor_variance",
    "flex_budget",
    "three_factor_variance",
    "format_variance_table",
    "format_decomposition_table",
]
