# Flexible Budget Analysis Workflow

## Purpose

Separate variances into controllable (rate/efficiency) and uncontrollable (volume) components using flexible budgeting.

---

## When to Use

- "Volume-adjusted budget comparison"
- "What was controllable vs uncontrollable?"
- "Separate efficiency from volume effects"
- "Flex budget analysis"
- "Performance vs activity variance"

---

## The Flexible Budget Concept

```
Static Budget = Budget Rate × Budget Volume
       ↓
   Volume Variance (Uncontrollable)
       ↓
Flex Budget = Budget Rate × Actual Volume
       ↓
   Flex Variance (Controllable)
       ↓
Actual = Actual Rate × Actual Volume
```

**Key Insight:** The flex budget "flexes" to actual activity level while holding efficiency constant. This isolates the controllable portion of variance.

---

## Input

User provides:
1. **Budget rate** — Planned cost/unit or efficiency metric
2. **Budget volume** — Planned activity level
3. **Actual rate** — Realized cost/unit or efficiency
4. **Actual volume** — Realized activity level

---

## Process

### Step 1: Calculate Three Budget Levels

```
Static Budget = Budget Rate × Budget Volume
Flex Budget = Budget Rate × Actual Volume
Actual = Actual Rate × Actual Volume
```

### Step 2: Decompose Variance

**Using the tool:**
```bash
python ~/.claude/skills/VarianceAnalysis/Tools/variance_calculations.py \
  --type flex \
  --budget-rate [rate] --budget-volume [volume] \
  --actual-rate [rate] --actual-volume [volume]
```

### Step 3: Interpret Components

| Variance Component | Formula | Meaning |
|--------------------|---------|---------|
| Volume Variance | Flex Budget - Static Budget | Due to activity change |
| Flex Variance | Actual - Flex Budget | Due to efficiency change |
| Total Variance | Actual - Static Budget | Overall performance |

### Step 4: Assess Controllability

| Variance Type | Typically Controllable? | By Whom? |
|---------------|-------------------------|----------|
| Volume | No | External demand, sales |
| Rate/Efficiency | Yes | Operations, management |

**Caveats:**
- Volume can be partially controllable (capacity decisions, marketing)
- Rate changes may be externally driven (supplier pricing, wage laws)

### Step 5: Management Action

Focus attention on flex variance (controllable):
- If favorable: Identify what went well, replicate
- If unfavorable: Investigate root cause, address

---

## Output Format

```markdown
## Flexible Budget Analysis: [Subject]

**Period:** [time period]
**Context:** [what is being measured]

### Budget Comparison

| Level | Calculation | Amount |
|-------|-------------|-------:|
| Static Budget | $[rate] × [vol] | $[X] |
| Flex Budget | $[rate] × [actual vol] | $[Y] |
| Actual | $[actual rate] × [actual vol] | $[Z] |

### Variance Decomposition

| Component | Amount | % of Total | Controllable? |
|-----------|-------:|:----------:|:-------------:|
| Volume Variance | $[X] | [%]% | No |
| Flex Variance | $[Y] | [%]% | Yes |
| **Total Variance** | **$[Z]** | 100% | — |

**Controllability Ratio:** [X]% of variance is controllable

### Analysis

**Volume Variance ([F/U]):**
[Explain why volume differed from plan]

**Flex Variance ([F/U]):**
[Explain why efficiency/rate differed from plan]

### Outcome Impact

| Outcome | Impact | Controllable Portion |
|---------|:------:|---------------------:|
| COST | [↑/↓] | $[flex variance] |

### Management Focus

**If Flex Variance is Unfavorable:**
- [Root cause investigation]
- [Process improvement opportunity]

**If Flex Variance is Favorable:**
- [Best practice identification]
- [Potential for replication]

### Recommendations

1. [Primary action]
2. [Secondary action]
```

---

## Example: Contact Center Labor Budget

**Given:**
- Budget: $50/hour × 1,000 hours = $50,000
- Actual volume: 1,100 hours (demand-driven)
- Actual rate: $52/hour (overtime premium)

**Calculation:**
```
Static Budget = $50 × 1,000 = $50,000
Flex Budget = $50 × 1,100 = $55,000
Actual = $52 × 1,100 = $57,200
```

**Decomposition:**
```
Volume Variance = $55,000 - $50,000 = $5,000 (U) — uncontrollable
Flex Variance = $57,200 - $55,000 = $2,200 (U) — controllable
Total Variance = $57,200 - $50,000 = $7,200 (U)
```

**Interpretation:**
- 69% of variance was volume-driven (uncontrollable demand)
- 31% was rate-driven (controllable overtime decisions)
- Management should focus on the $2,200 controllable portion:
  - Why was overtime needed?
  - Could scheduling be improved?
  - Was hiring delayed?

---

## Multi-Level Flex Budget

For more complex analysis, create multiple flex levels:

| Level | Volume | Rate | Other Factors |
|-------|--------|------|---------------|
| Static | Budget | Budget | Budget |
| Flex Level 1 | Actual | Budget | Budget |
| Flex Level 2 | Actual | Actual | Budget |
| Actual | Actual | Actual | Actual |

This allows isolation of each factor's contribution sequentially.

**Note:** For fair multi-factor attribution, use ShapleyVariance workflow instead.

---

## Tips

1. **Always separate controllable/uncontrollable** — This is the core value of flex budgeting

2. **Be honest about controllability** — Some "uncontrollable" variances have controllable roots (e.g., poor forecasting caused understaffing)

3. **Use for performance evaluation** — Managers shouldn't be held accountable for volume swings outside their control

4. **Combine with root cause** — Flex budget shows what to focus on; root cause analysis shows what to fix

5. **Consider multiple flex levels** — For complex situations with many factors
