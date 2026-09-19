# Trend Variance Workflow

## Purpose

Analyze period-over-period variances to identify trends, patterns, and changes in variance drivers.

---

## When to Use

- "MoM variance analysis"
- "Year over year comparison"
- "How have variance drivers changed?"
- "Trend in performance gaps"
- "Rolling variance analysis"

---

## Input

User provides:
1. **Two or more periods** of data (e.g., Jan vs Feb, Q1 vs Q2)
2. **Metrics to compare** — Same metrics across periods
3. **Comparison type** — Sequential (MoM) or same-period-prior (YoY)

---

## Comparison Types

| Type | Use Case | Example |
|------|----------|---------|
| Sequential | Short-term changes | January vs February |
| Same-period-prior | Seasonality control | Q1 2025 vs Q1 2024 |
| Rolling average | Smoothed trends | 3-month rolling vs prior |
| vs. Baseline | Deviation from target | Each month vs annual plan |

---

## Process

### Step 1: Align Data Structures

Ensure periods have consistent:
- Metric definitions
- Units
- Scope (same queues, channels)
- Adjustments (if any)

### Step 2: Calculate Period Variances

For each period, compute:
```
Variance_t = Actual_t - Plan_t
Variance %_t = (Variance_t / Plan_t) × 100
```

### Step 3: Compare Variance Trends

| Period | Plan | Actual | Variance | % |
|--------|------|--------|----------|---|
| Period 1 | [X₁] | [Y₁] | [V₁] | [P₁] |
| Period 2 | [X₂] | [Y₂] | [V₂] | [P₂] |
| Change | [ΔX] | [ΔY] | [ΔV] | [ΔP] |

### Step 4: Decompose Changes (Optional)

If decomposition available for each period:

| Factor | Period 1 | Period 2 | Δ | Trend |
|--------|----------|----------|---|-------|
| Volume | [v₁] | [v₂] | [Δv] | [↑/↓/→] |
| AHT | [a₁] | [a₂] | [Δa] | [↑/↓/→] |
| Shrinkage | [s₁] | [s₂] | [Δs] | [↑/↓/→] |

### Step 5: Identify Pattern

| Pattern | Meaning | Action |
|---------|---------|--------|
| Consistent favorable | Sustained improvement | Maintain, institutionalize |
| Consistent unfavorable | Systemic issue | Investigate root cause |
| Improving trend | Getting better | Monitor, reinforce |
| Deteriorating trend | Getting worse | Urgent intervention |
| Volatile | Unstable process | Focus on consistency |

---

## Output Format

```markdown
## Trend Variance Analysis: [Subject]

**Comparison:** [Period 1] vs [Period 2]
**Type:** [MoM / YoY / vs Baseline]

### Period Comparison

| Metric | [Period 1] | [Period 2] | Change | Trend |
|--------|------------|------------|--------|:-----:|
| Plan | [X₁] | [X₂] | [ΔX] | [→] |
| Actual | [Y₁] | [Y₂] | [ΔY] | [↑/↓] |
| Variance | [V₁] | [V₂] | [ΔV] | [↑/↓] |
| Variance % | [P₁]% | [P₂]% | [ΔP]pp | [↑/↓] |

### Variance Driver Trends

| Factor | [Period 1] | [Period 2] | Δ | Trend |
|--------|------------|------------|---|:-----:|
| [Factor 1] | [val] | [val] | [Δ] | [arrow] |
| [Factor 2] | [val] | [val] | [Δ] | [arrow] |

### Pattern Identification

**Overall Pattern:** [Improving / Deteriorating / Stable / Volatile]

**Key Observations:**
1. [Main trend observation]
2. [Supporting observation]
3. [Contextual factor]

### Visualization

```
Variance Trend:
[Period 1] █████████░░░ [V₁] (P₁%)
[Period 2] ███████████░ [V₂] (P₂%)
           ↑ [Trend indicator]
```

### Outcome Implications

| Outcome | Trend | Concern Level |
|---------|:-----:|:-------------:|
| COST | [↑/↓/→] | [Low/Med/High] |
| CX | [↑/↓/→] | [Low/Med/High] |
| EX | [↑/↓/→] | [Low/Med/High] |

### Recommendations

**If Deteriorating:**
- [Intervention needed]
- [Timeline for action]

**If Improving:**
- [Continue current approach]
- [Opportunities to accelerate]

**If Volatile:**
- [Stabilization measures]
- [Process control focus]
```

---

## Example: Monthly FTE Variance Trend

**Data:**
| Month | Planned FTE | Actual FTE | Variance | Variance % |
|-------|-------------|------------|----------|------------|
| Jan | 100 | 108 | +8 | +8.0% |
| Feb | 102 | 115 | +13 | +12.7% |
| Mar | 105 | 125 | +20 | +19.0% |

**Decomposition Trend:**
| Factor | Jan | Feb | Mar | Trend |
|--------|-----|-----|-----|:-----:|
| Volume | +3 FTE | +5 FTE | +8 FTE | ↑ |
| AHT | +3 FTE | +5 FTE | +7 FTE | ↑ |
| Shrinkage | +2 FTE | +3 FTE | +5 FTE | ↑ |

**Pattern:** Deteriorating — All variance drivers trending unfavorably

**Analysis:**
- Total variance growing exponentially (+8 → +13 → +20)
- Every driver is worsening; no offsetting improvements
- If trend continues, April variance projected at +28 FTE

**Recommendation:**
- **Urgent intervention required**
- Volume: Review forecast methodology, identify demand drivers
- AHT: Launch call efficiency initiative, check for complexity changes
- Shrinkage: Audit time codes, address attendance issues

---

## Multi-Period Trend Table

For longer horizon analysis:

```markdown
### 6-Month Variance Trend

| Month | Variance | % | MoM Δ | 3-Mo Avg | Trend |
|-------|----------|---|-------|----------|:-----:|
| Jan | +8 | 8.0% | — | — | — |
| Feb | +13 | 12.7% | +5 | — | ↑ |
| Mar | +20 | 19.0% | +7 | +13.7 | ↑ |
| Apr | +15 | 14.3% | -5 | +16.0 | ↓ |
| May | +12 | 11.4% | -3 | +15.7 | ↓ |
| Jun | +10 | 9.5% | -2 | +12.3 | ↓ |

**Pattern:** Peaked in March, improving trend since then
**Interpretation:** Intervention in April is showing results
```

---

## Tips

1. **Control for seasonality** — Use YoY for seasonal businesses, or compare to seasonal baseline

2. **Look at both absolute and percentage** — A consistent 5% variance matters more on a growing base

3. **Watch for trend breaks** — Sudden changes in pattern warrant investigation

4. **Decompose when possible** — Understanding which drivers are trending helps target interventions

5. **Use rolling averages** — Smooths noise, reveals underlying trends

6. **Set thresholds** — Define what variance level triggers action
