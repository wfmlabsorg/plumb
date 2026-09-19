# Shapley Variance Workflow

## Purpose

Route multi-factor variance decomposition to the ShapleyDecomposition skill for fair, order-independent attribution.

---

## When to Use

- Variance involves **3 or more factors**
- User requests "fair attribution" or "Shapley decomposition"
- WFM labor variance (Volume × AHT × Shrinkage)
- Any multiplicative/complex model with multiple drivers

---

## Why Shapley?

**The Problem with Sequential Decomposition:**

When decomposing variance across 3+ factors, the order of analysis matters:

```
Example: Volume ↑10%, AHT ↑10%, Shrinkage ↑5pp

If analyzed Volume → AHT → Shrinkage:
  Volume gets credit for its pure effect + interactions with AHT/Shrinkage

If analyzed Shrinkage → AHT → Volume:
  Different attribution!
```

**The Shapley Solution:**

Shapley values average marginal contributions across ALL possible orderings, giving each factor its "fair share" of the variance.

---

## Integration with ShapleyDecomposition Skill

This workflow **routes** to the ShapleyDecomposition skill. It does not duplicate Shapley computation.

### Handoff Protocol

**Collect from user:**
1. Model formula (how outcome depends on factors)
2. Baseline/planned values for each factor
3. Actual values for each factor
4. The outcome metric being analyzed

**Pass to ShapleyDecomposition:**
```
Invoke: ShapleyDecomposition → Analyze workflow
With:
  - model: [formula]
  - baseline: [values]
  - actual: [values]
  - factors: [names]
```

**Receive from ShapleyDecomposition:**
- Factor attributions (values and percentages)
- Verification that attributions sum to total
- Direction indicators

---

## Process

### Step 1: Identify Multi-Factor Situation

Recognize when Shapley is appropriate:
- "What caused the FTE variance? Volume was up, AHT increased, and shrinkage grew"
- "Decompose revenue variance across price, quantity, and mix"
- "Fair attribution of cost variance"

### Step 2: Clarify the Model

**Common WFM model:**
```
FTE = (Volume × AHT) / (WorkHours × Occupancy × (1 - Shrinkage))
```

**Revenue model:**
```
Revenue = Price × Quantity × Mix
```

**Ask if unclear:** "What's the formula connecting [factors] to [outcome]?"

### Step 3: Gather Values

```
Baseline (Plan):
- Factor 1: [value]
- Factor 2: [value]
- Factor 3: [value]

Actual:
- Factor 1: [value]
- Factor 2: [value]
- Factor 3: [value]
```

### Step 4: Route to Shapley

**Option A: CLI Tool**
```bash
bun run ~/.claude/skills/ShapleyDecomposition/Tools/ShapleyCompute.ts \
  --factors "Volume,AHT,Shrinkage" \
  --baseline "1000,300,0.30" \
  --actual "1100,330,0.35" \
  --model "wfm_fte"
```

**Option B: Invoke Skill**
```
[Invoke ShapleyDecomposition skill with Analyze workflow]
```

### Step 5: Interpret Results

Receive Shapley attributions and add variance analysis context:
- F/U classification for each factor
- Outcome mapping (CX/COST/EX)
- Recommendations

---

## Output Format

```markdown
## Multi-Factor Variance Analysis: [Subject]

**Period:** [time period]
**Model:** [formula]

### Factor Changes

| Factor | Baseline | Actual | Δ | % Change |
|--------|----------|--------|---|----------|
| [Factor 1] | [val] | [val] | [+/-X] | [%]% |
| [Factor 2] | [val] | [val] | [+/-X] | [%]% |
| [Factor 3] | [val] | [val] | [+/-X] | [%]% |

### Outcome

| Metric | Baseline | Actual | Variance |
|--------|----------|--------|----------|
| [Outcome] | [val] | [val] | [+/-X] |

### Shapley Decomposition

| Factor | Attribution | % of Total | F/U |
|--------|------------:|-----------:|:---:|
| [Factor 1] | [value] | [%]% | [F/U] |
| [Factor 2] | [value] | [%]% | [F/U] |
| [Factor 3] | [value] | [%]% | [F/U] |
| **Total** | **[value]** | 100% | — |

**Verification:** Attributions sum to [total] ✓

### Why Shapley?

Traditional sequential decomposition would give:
- [Factor 1] first: [different value]
- [Factor 3] first: [different value]

Shapley provides the unique **fair** decomposition.

### Outcome Impact

| Outcome | Impact | Primary Driver |
|---------|:------:|----------------|
| COST | [↑/↓] | [factor] |
| CX | [↑/↓] | [factor, if applicable] |
| EX | [↑/↓] | [factor, if applicable] |

### Key Insights

1. **Dominant Factor:** [Factor] contributed [%]% of variance
2. **Interaction Effects:** [Description of any notable interactions]
3. **Controllability:** [Which factors were within control]

### Recommendations

1. [Action targeting primary driver]
2. [Action targeting secondary driver]
```

---

## Example: WFM FTE Variance

**Given:**
- Model: FTE = (Volume × AHT) / (480 × 0.85 × (1-Shrinkage))
- Baseline: Volume=1000, AHT=300s, Shrinkage=30%
- Actual: Volume=1100, AHT=330s, Shrinkage=35%

**Shapley Computation:**
```
Coalition values computed for 2³ = 8 combinations
Shapley weights applied to marginal contributions
```

**Result:**

| Factor | Attribution | % of Total |
|--------|------------:|-----------:|
| Volume (+10%) | +11.47 FTE | 36.0% |
| AHT (+10%) | +11.47 FTE | 36.0% |
| Shrinkage (+5pp) | +8.89 FTE | 27.9% |
| **Total** | **+31.83 FTE** | 100% |

**Interpretation:**
- Volume and AHT contributed equally (both +10% change)
- Shrinkage's 5pp increase had disproportionate impact due to its position in denominator
- All factors pushed in unfavorable direction

---

## When NOT to Use Shapley

| Situation | Better Approach |
|-----------|-----------------|
| 2 factors only | Two-factor variance (simpler) |
| Independent factors | Simple sum of variances |
| Explicit causal order known | Sequential may be appropriate |
| Purely additive model | Direct attribution works |

---

## Tips

1. **Always verify sum** — Shapley values must sum exactly to total variance

2. **Equal changes → Equal shares** — In multiplicative models, factors with same % change get same attribution (symmetry axiom)

3. **Explain to stakeholders** — Many aren't familiar with Shapley; the "average across all orderings" explanation helps

4. **Compare to naive** — Showing how sequential methods give different answers justifies Shapley's complexity

5. **Use for recurring analysis** — Build templates for common decompositions (WFM, revenue, etc.)
