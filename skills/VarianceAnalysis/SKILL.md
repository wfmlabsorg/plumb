---
name: VarianceAnalysis
description: Variance decomposition for budget vs actual analysis. USE WHEN user wants to decompose variance, analyze budget vs actual, understand why targets were missed, FTE variance, labor variance, flex budget analysis, period-over-period variance, or "why did we miss the target". Integrates with ShapleyDecomposition for multi-factor attribution.
---

# VarianceAnalysis

Decomposes variances between plan/budget and actual results. Answers: "Why did we miss the target, and by how much for each factor?"

> **Core Insight:** Variance analysis explains the gap between expectation and reality. For multi-factor decomposition, fair attribution requires Shapley values.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **BudgetVariance** | "budget vs actual", "spending variance", "cost variance" | `Workflows/BudgetVariance.md` |
| **OperationalVariance** | "plan vs actual", "forecast variance", "operational metrics" | `Workflows/OperationalVariance.md` |
| **FlexBudgetAnalysis** | "flex budget", "volume-adjusted", "controllable variance" | `Workflows/FlexBudgetAnalysis.md` |
| **TrendVariance** | "period over period", "MoM variance", "YoY change" | `Workflows/TrendVariance.md` |
| **ShapleyVariance** | "multi-factor", "fair attribution", "WFM labor variance" | `Workflows/ShapleyVariance.md` |

## Quick Commands

```
variance budget [actual] [budget]       → Two-factor variance (Price × Quantity)
variance flex [data]                    → Flexible budget analysis
variance wfm [actual] [plan]            → WFM labor variance (calls Shapley)
variance trend [data] [periods]         → Period-over-period comparison
variance explain [type]                 → Explain variance methodology
```

## Variance Decomposition Concepts

### Two-Factor Variance (Price × Quantity)

```
Total Variance = Actual - Budget

Price Variance = (Actual Price - Budget Price) × Actual Qty
Qty Variance = (Actual Qty - Budget Qty) × Budget Price
Joint Variance = (ΔPrice) × (ΔQty)
```

**Convention:** Price variance uses actual qty; Qty variance uses budget price.

### Flexible Budget

```
Static Budget: Budget Rate × Budget Volume
Flex Budget: Budget Rate × Actual Volume
Actual: Actual Rate × Actual Volume

Volume Variance = Flex Budget - Static Budget    (uncontrollable)
Flex Variance = Actual - Flex Budget             (controllable)
```

### WFM Labor Variance

For contact center labor, decompose into:
- **Volume variance** — Contact volume difference
- **Efficiency variance** — AHT difference
- **Shrinkage variance** — Shrinkage % difference
- **Rate variance** — Wage rate difference

**For fair attribution across Volume, AHT, Shrinkage:** Route to ShapleyDecomposition skill.

## Favorable/Unfavorable Classification

| Metric Type | Negative Variance | Positive Variance |
|-------------|-------------------|-------------------|
| Cost | Favorable (under budget) | Unfavorable (over budget) |
| Revenue | Unfavorable (under target) | Favorable (over target) |
| Efficiency (lower better) | Favorable | Unfavorable |
| Quality (higher better) | Unfavorable | Favorable |

## Output Format

```markdown
## Variance Analysis: [Subject]

**Period:** [time period]
**Comparison:** [Actual vs Budget / Plan / Prior Period]

| Component | Budget | Actual | Variance | % | F/U |
|-----------|--------|--------|----------|---|-----|
| [item] | [value] | [value] | [value] | [%] | [F/U] |
| **Total** | [value] | [value] | [value] | [%] | [F/U] |

### Variance Decomposition

| Factor | Attribution | % of Total | Impact |
|--------|-------------|------------|--------|
| [factor] | [value] | [%] | [explanation] |

**Verification:** Attributions sum to [total] ✓

### Outcome Impact

| Outcome | Impact | Magnitude |
|---------|--------|-----------|
| COST | [↑/↓/→] | [value] |
| CX | [↑/↓/→] | [if applicable] |
| EX | [↑/↓/→] | [if applicable] |

**Key Driver:** [Primary factor explanation]

**Recommendation:** [Action based on findings]
```

## Integration Points

| Skill | Integration |
|-------|-------------|
| **ShapleyDecomposition** | Multi-factor fair attribution (3+ factors) |
| **OutcomeFramework** | Map all variances to CX/COST/EX |
| **DataAnalysis** | ETL and analysis pipeline |
| **CausalInference** | Understand causal drivers of variance |

## Examples

**Example 1: Budget Variance**
```
User: "Analyze our labor budget variance - we spent $120K vs $100K budget"
→ Invokes BudgetVariance workflow
→ Decomposes into rate variance and hours variance
→ Classifies as Unfavorable
```

**Example 2: WFM Variance with Shapley**
```
User: "FTE requirement was 120 but we planned 100. Volume up 10%, AHT up 10%,
       shrinkage went from 30% to 35%"
→ Invokes ShapleyVariance workflow
→ Routes to ShapleyDecomposition skill
→ Returns fair attribution: Volume 11.5 FTE, AHT 11.5 FTE, Shrinkage 8.9 FTE
```

**Example 3: Flex Budget**
```
User: "Compare actual costs against a volume-adjusted budget"
→ Invokes FlexBudgetAnalysis workflow
→ Separates volume variance (uncontrollable) from flex variance (controllable)
→ Focuses management attention on controllable factors
```

**Example 4: Trend Analysis**
```
User: "Why did our costs increase from Q3 to Q4?"
→ Invokes TrendVariance workflow
→ Identifies which components drove the change
→ Compares variance drivers across periods
```

## Hierarchy Analysis

| Capability | Layer | Implementation |
|------------|-------|----------------|
| Two-factor variance | CODE | `Tools/variance_calculations.py` |
| Flex budget analysis | CODE | `Tools/variance_calculations.py` |
| F/U classification | CODE | `Tools/variance_calculations.py` |
| Multi-factor Shapley | SKILL | ShapleyDecomposition |
| Budget vs actual | PROMPT | `Workflows/BudgetVariance.md` |
| Operational variance | PROMPT | `Workflows/OperationalVariance.md` |
| Flex budget workflow | PROMPT | `Workflows/FlexBudgetAnalysis.md` |
| Trend variance | PROMPT | `Workflows/TrendVariance.md` |
| Shapley routing | PROMPT | `Workflows/ShapleyVariance.md` |

## Context Files

| File | Contents |
|------|----------|
| `Context/VarianceTheory.md` | Variance analysis methodology and formulas |
| `Templates/LaborVariance.md` | Contact center labor variance template |
| `Templates/BudgetReport.md` | Standard budget variance report format |
