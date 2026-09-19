# Operational Variance Workflow

## Purpose

Analyze variances between planned/forecasted and actual operational metrics (contacts, AHT, service level, etc.).

---

## When to Use

- "Why did we miss our forecast?"
- "Analyze plan vs actual performance"
- "What drove the staffing variance?"
- "Forecast accuracy analysis"
- "Why did we miss service level?"

---

## Input

User provides:
1. **Planned/Forecast values** for operational metrics
2. **Actual values** for the same metrics
3. **Context** — Time period, channel, queue
4. **Model relationship** — How metrics relate to outcome

---

## Common Operational Metrics

| Metric | Direction | Typical Model Role |
|--------|-----------|-------------------|
| Contact Volume | — | Driver of workload |
| AHT | Lower better | Driver of staffing |
| Shrinkage | Lower better | Reduces capacity |
| Occupancy | Higher better* | Efficiency measure |
| Service Level | Higher better | Outcome metric |
| Abandon Rate | Lower better | Outcome metric |
| FTE/Headcount | — | Resource requirement |

*Occupancy has a ceiling; too high impacts agent wellness

---

## Process

### Step 1: Identify the Relationship

Common WFM models:

**Staffing Requirement:**
```
FTE = (Volume × AHT) / (WorkHours × Occupancy × (1 - Shrinkage))
```

**Workload Hours:**
```
Workload = Volume × (AHT / 60)
```

**Capacity:**
```
Capacity = FTE × WorkHours × (1 - Shrinkage) × Occupancy
```

**Ask if unclear:** "What's the formula connecting these metrics to the outcome?"

### Step 2: Determine Factor Count

| Factors | Approach |
|---------|----------|
| 1 | Simple variance |
| 2 | Two-factor decomposition |
| 3+ | Route to ShapleyVariance workflow |

### Step 3: Compute Variance

**For 2 factors:**
```bash
python ~/.claude/skills/VarianceAnalysis/Tools/variance_calculations.py \
  --type two-factor \
  --actual-qty [volume] --actual-price [aht] \
  --budget-qty [planned_volume] --budget-price [planned_aht]
```

**For 3+ factors:**
Route to `ShapleyVariance.md` workflow, which invokes ShapleyDecomposition skill.

### Step 4: Interpret Direction

For operational metrics:

| Change | Typical Impact |
|--------|----------------|
| Volume ↑ | FTE requirement ↑, costs ↑ |
| AHT ↑ | FTE requirement ↑, capacity ↓ |
| Shrinkage ↑ | Available capacity ↓ |
| Occupancy ↑ | More efficient, but agent stress ↑ |

### Step 5: Map to Outcomes

| Metric Variance | COST | CX | EX |
|-----------------|------|----|----|
| Volume up | ↑ | ↑ (more served) | → |
| AHT up | ↑ | ↓ (longer waits) | ↓ (harder calls) |
| Shrinkage up | ↑ | ↓ (understaffed) | ↑ (more breaks) |

---

## Output Format

```markdown
## Operational Variance Analysis: [Subject]

**Period:** [time period]
**Scope:** [channel/queue/site]

### Metric Comparison

| Metric | Planned | Actual | Variance | % | Impact |
|--------|--------:|-------:|---------:|--:|--------|
| Volume | [X] | [Y] | [+/-Z] | [%] | [direction] |
| AHT | [X]s | [Y]s | [+/-Z]s | [%] | [direction] |
| ... | ... | ... | ... | ... | ... |

### Outcome Variance

**Outcome Metric:** [FTE Requirement / Capacity / Service Level]
**Planned:** [value]
**Actual:** [value]
**Total Variance:** [value] ([%]%)

### Factor Attribution

| Factor | Attribution | % of Total | Direction |
|--------|------------:|-----------:|:---------:|
| [factor] | [value] | [%]% | [+/-] |

**Verification:** Sum = [total] ✓

### Outcome Impact

| Outcome | Impact | Driver |
|---------|:------:|--------|
| COST | [↑/↓/→] | [explanation] |
| CX | [↑/↓/→] | [explanation] |
| EX | [↑/↓/→] | [explanation] |

### Root Cause Analysis

- **Primary Driver:** [Which factor contributed most]
- **Was it foreseeable?** [Yes/No and why]
- **Was it controllable?** [Yes/No and why]

### Recommendations

1. [Action item]
2. [Process improvement]
```

---

## Example: FTE Requirement Variance

**Given:**
- Planned: Volume=10,000, AHT=300s, Shrinkage=30%
- Actual: Volume=11,000, AHT=330s, Shrinkage=35%
- Model: FTE = (V × AHT) / (480 × 0.85 × (1-S))

**Approach:** 3 factors → Route to ShapleyVariance

**Result (from Shapley):**

| Factor | Attribution | % of Total |
|--------|------------:|-----------:|
| Volume (+10%) | +11.5 FTE | 36% |
| AHT (+10%) | +11.5 FTE | 36% |
| Shrinkage (+5pp) | +8.9 FTE | 28% |
| **Total** | **+31.9 FTE** | 100% |

**Interpretation:**
- Volume and AHT contributed equally (both changed by same %)
- Shrinkage increase drove nearly a third of the variance
- All factors pushed requirements upward — a "perfect storm"

---

## Tips

1. **Match units** — Ensure planned and actual use same units (seconds vs minutes, % vs decimal)

2. **Use Shapley for 3+ factors** — Sequential decomposition is biased by order; Shapley provides fair attribution

3. **Consider interactions** — In multiplicative models, factors interact. A 10% increase in both Volume and AHT increases FTE by 21%, not 20%

4. **Tie to planning cycle** — Variance analysis should feed back into forecast improvement

5. **Look for patterns** — Is this a one-time variance or recurring? Check TrendVariance workflow
