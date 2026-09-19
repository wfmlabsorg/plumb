# Labor Variance Template

Use this template for contact center labor/staffing variance analysis.

---

## Quick Setup

**Required Inputs:**

| Input | Planned | Actual |
|-------|---------|--------|
| Contact Volume | | |
| AHT (seconds) | | |
| Shrinkage % | | |
| Wage Rate (optional) | | |

**Fixed Parameters:**
- Work Hours per FTE: 480 minutes (8 hours)
- Target Occupancy: 85%

---

## FTE Variance Analysis

```markdown
## FTE Variance Analysis: [Queue/Channel]

**Period:** [Month/Week]
**Scope:** [All Queues / Specific Queue]

### Input Metrics

| Metric | Planned | Actual | Variance | % Change |
|--------|--------:|-------:|---------:|---------:|
| Volume | [X] | [Y] | [+/-Z] | [%]% |
| AHT | [X]s | [Y]s | [+/-Z]s | [%]% |
| Shrinkage | [X]% | [Y]% | [+/-Z]pp | — |

### FTE Calculation

**Formula:** FTE = (Volume × AHT) / (480 × 0.85 × (1 - Shrinkage))

| Scenario | FTE |
|----------|----:|
| Planned | [X] |
| Actual Requirement | [Y] |
| **Variance** | **[+/-Z]** |

### Shapley Decomposition

| Factor | Attribution | % of Total | Impact |
|--------|------------:|-----------:|--------|
| Volume | [+/-X] FTE | [%]% | [Volume ↑/↓ → FTE ↑/↓] |
| AHT | [+/-X] FTE | [%]% | [AHT ↑/↓ → FTE ↑/↓] |
| Shrinkage | [+/-X] FTE | [%]% | [Shrinkage ↑/↓ → FTE ↑/↓] |
| **Total** | **[+/-X] FTE** | 100% | |

**Verification:** [X] + [Y] + [Z] = [Total] ✓

### Outcome Impact

| Outcome | Impact | Driver |
|---------|:------:|--------|
| COST | [↑/↓] | [Primary factor] |
| CX | [↑/↓] | [If understaffed: service degradation] |
| EX | [↑/↓] | [If overstaffed/understaffed] |

### Root Cause Notes

**Volume Variance:**
- [ ] Demand forecast accuracy
- [ ] Marketing campaigns
- [ ] Seasonal patterns
- [ ] System issues generating contacts

**AHT Variance:**
- [ ] Call complexity changes
- [ ] New agents in training
- [ ] System/tool issues
- [ ] Process changes
- [ ] Product issues

**Shrinkage Variance:**
- [ ] Absenteeism
- [ ] Training time
- [ ] Meeting time
- [ ] System downtime
- [ ] Adherence issues

### Recommendations

1. [Primary recommendation targeting largest driver]
2. [Secondary recommendation]
3. [Process improvement suggestion]
```

---

## Labor Cost Variance Analysis

```markdown
## Labor Cost Variance Analysis: [Queue/Channel]

**Period:** [Month]
**Budget:** $[X]
**Actual:** $[Y]
**Variance:** $[+/-Z] ([F/U])

### Cost Breakdown

| Component | Budget | Actual | Variance | F/U |
|-----------|-------:|-------:|---------:|:---:|
| Regular Hours | $[X] | $[Y] | $[Z] | [F/U] |
| Overtime | $[X] | $[Y] | $[Z] | [F/U] |
| Benefits | $[X] | $[Y] | $[Z] | [F/U] |
| **Total** | **$[X]** | **$[Y]** | **$[Z]** | **[F/U]** |

### Flex Budget Analysis

| Level | Calculation | Amount |
|-------|-------------|-------:|
| Static Budget | $[rate] × [planned hrs] | $[X] |
| Flex Budget | $[rate] × [actual hrs] | $[Y] |
| Actual | $[actual rate] × [actual hrs] | $[Z] |

### Variance Decomposition

| Component | Amount | % | Type |
|-----------|-------:|--:|------|
| Volume Variance | $[X] | [%]% | Uncontrollable |
| Rate Variance | $[Y] | [%]% | Controllable |
| **Total** | **$[Z]** | 100% | |

**Controllable %:** [X]%

### Outcome Impact

| Outcome | Impact | Magnitude |
|---------|:------:|----------:|
| COST | [↑/↓] | $[value] |

### Action Items

1. [ ] [Action for volume variance]
2. [ ] [Action for rate variance]
3. [ ] [Process improvement]
```

---

## Multi-Period Trend Template

```markdown
## FTE Variance Trend: [Queue]

**Period:** [Start Month] - [End Month]

### Monthly Variance

| Month | Planned | Actual | Variance | % | Trend |
|-------|--------:|-------:|---------:|--:|:-----:|
| [M1] | [X] | [Y] | [Z] | [%]% | — |
| [M2] | [X] | [Y] | [Z] | [%]% | [↑/↓] |
| [M3] | [X] | [Y] | [Z] | [%]% | [↑/↓] |
| [M4] | [X] | [Y] | [Z] | [%]% | [↑/↓] |

### Driver Trends

| Factor | [M1] | [M2] | [M3] | [M4] | Trend |
|--------|------|------|------|------|:-----:|
| Volume | [X] | [X] | [X] | [X] | [↑/↓/→] |
| AHT | [X] | [X] | [X] | [X] | [↑/↓/→] |
| Shrinkage | [X] | [X] | [X] | [X] | [↑/↓/→] |

### Pattern Assessment

**Overall:** [Improving / Deteriorating / Stable / Volatile]

**Key Observation:**
[Main trend insight]

### Recommendations

1. [Trend-based recommendation]
2. [Preventive action]
```

---

## Quick Reference: Shapley Command

```bash
bun run ~/.claude/skills/ShapleyDecomposition/Tools/ShapleyCompute.ts \
  --factors "Volume,AHT,Shrinkage" \
  --baseline "[volume],[aht],[shrinkage]" \
  --actual "[volume],[aht],[shrinkage]" \
  --model "wfm_fte"
```

---

## Quick Reference: Variance Tool

```bash
# Two-factor variance
python ~/.claude/skills/VarianceAnalysis/Tools/variance_calculations.py \
  --type two-factor \
  --actual-qty [qty] --actual-price [rate] \
  --budget-qty [qty] --budget-price [rate]

# Flex budget
python ~/.claude/skills/VarianceAnalysis/Tools/variance_calculations.py \
  --type flex \
  --budget-rate [rate] --budget-volume [vol] \
  --actual-rate [rate] --actual-volume [vol]
```
