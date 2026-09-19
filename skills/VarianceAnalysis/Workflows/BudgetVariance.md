# Budget Variance Workflow

## Purpose

Analyze variances between budgeted and actual spending/costs using two-factor decomposition.

---

## When to Use

- "Why did we go over budget?"
- "Analyze budget vs actual"
- "What caused the cost variance?"
- "Labor cost variance analysis"
- "Spending variance report"

---

## Input

User provides:
1. **Budget amount** or (budget rate × budget quantity)
2. **Actual amount** or (actual rate × actual quantity)
3. **Context** — What the budget covers (labor, materials, etc.)
4. **Metric type** — Cost (default), revenue, etc.

---

## Process

### Step 1: Clarify the Budget Structure

Determine if this is:
- **Lump sum:** Single budget vs actual comparison
- **Rate × Quantity:** Decomposable into price and volume effects

**Ask if unclear:** "Is this a fixed budget amount, or is it based on a rate × quantity formula?"

### Step 2: Gather Values

For rate × quantity:
```
Budget Rate: $[X] per [unit]
Budget Quantity: [Y] [units]
Actual Rate: $[X'] per [unit]
Actual Quantity: [Y'] [units]
```

For lump sum:
```
Budget: $[X]
Actual: $[Y]
Variance: $[Y-X]
```

### Step 3: Compute Variance

**Using the tool:**
```bash
python ~/.claude/skills/VarianceAnalysis/Tools/variance_calculations.py \
  --type two-factor \
  --actual-qty [qty] --actual-price [rate] \
  --budget-qty [qty] --budget-price [rate]
```

### Step 4: Classify Favorable/Unfavorable

For costs:
- Negative variance (under budget) = **Favorable**
- Positive variance (over budget) = **Unfavorable**

### Step 5: Map to Outcomes (OutcomeFramework)

| Variance Type | Primary Impact | Secondary Impact |
|---------------|----------------|------------------|
| Labor cost over | COST ↑ | Possibly EX (overtime) |
| Material cost under | COST ↓ | Possibly CX (quality?) |
| Volume increase | COST ↑ | CX ↑ (more capacity) |

---

## Output Format

```markdown
## Budget Variance Analysis: [Subject]

**Period:** [time period]
**Budget Type:** [Labor/Materials/Other]

### Summary

| Metric | Budget | Actual | Variance | Status |
|--------|-------:|-------:|---------:|:------:|
| Total | $[X] | $[Y] | $[+/-Z] | [F/U] |

### Two-Factor Decomposition

| Factor | Attribution | % of Total | Explanation |
|--------|------------:|-----------:|-------------|
| Rate Variance | $[value] | [%]% | [Higher/Lower rate than planned] |
| Volume Variance | $[value] | [%]% | [More/Less quantity than planned] |
| Joint Effect | $[value] | [%]% | [Interaction effect] |

**Verification:** Sum = $[total] ✓

### Outcome Impact

| Outcome | Impact | Magnitude |
|---------|:------:|----------:|
| COST | [↑/↓] | $[value] |

### Key Findings

1. **Primary Driver:** [Which factor contributed most]
2. **Controllability:** [Was this within management control?]
3. **Root Cause:** [If identifiable]

### Recommendations

- [Action item based on findings]
```

---

## Example: Labor Budget Variance

**Given:**
- Budget: 1,000 hours × $50/hour = $50,000
- Actual: 1,100 hours × $52/hour = $57,200
- Total Variance: +$7,200 (Unfavorable)

**Decomposition:**
```
Rate Variance = ($52 - $50) × 1,000 hrs = $2,000 (U)
Volume Variance = (1,100 - 1,000) hrs × $50 = $5,000 (U)
Joint Effect = $2 × 100 hrs = $200 (U)

Total: $2,000 + $5,000 + $200 = $7,200 ✓
```

**Analysis:**
- Volume drove 69% of the variance (more hours worked)
- Rate increase contributed 28%
- Joint effect minor at 3%

**Recommendation:** Focus on understanding why hours exceeded plan. Was this volume-driven (more contacts) or efficiency-driven (slower handling)?

---

## Tips

1. **Always decompose** — Even if user gives lump sums, try to identify underlying rate × quantity

2. **Look for root causes** — Variance analysis shows what changed, but understanding why requires further investigation

3. **Consider controllability** — Volume variances are often uncontrollable (demand-driven), while rate variances may be controllable

4. **Connect to operations** — A cost variance often has operational implications (quality, capacity, morale)

5. **Multi-factor?** — If variance involves 3+ factors, route to ShapleyVariance workflow
