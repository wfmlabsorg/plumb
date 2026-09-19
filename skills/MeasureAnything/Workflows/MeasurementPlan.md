# Measurement Plan Workflow

## Purpose
Create a comprehensive measurement approach using Applied Information Economics (AIE) methodology.

---

## Applied Information Economics Overview

AIE is a five-step decision analysis method that determines:
1. What decisions need to be made
2. What you currently know (and don't know)
3. What's worth measuring
4. How to measure it
5. How to use the results

---

## The Five AIE Steps

### Step 1: Define the Decision
**Goal:** Clearly articulate what decision(s) this measurement supports.

**Questions to answer:**
- What are we deciding?
- What are the alternatives?
- Who is the decision-maker?
- When must the decision be made?
- What's at stake ($ value range)?

**Output:**
```markdown
## Decision Definition

**Primary Decision:** [Decision statement]
**Alternatives:**
1. [Option A]
2. [Option B]
3. [Option C]

**Decision Maker:** [Name/Role]
**Decision Deadline:** [Date]
**Stakes:** $[range] over [time period]
```

### Step 2: Model Current Knowledge
**Goal:** Express what you know now in calibrated probabilities.

**Process:**
1. List all variables that matter for this decision
2. For each variable, generate calibrated 90% CI
3. Identify key assumptions
4. Map dependencies between variables

**Output:**
```markdown
## Current Knowledge Model

| Variable | 90% CI | Units | Source |
|----------|--------|-------|--------|
| [Var 1] | [LB-UB] | [units] | [estimate/data] |
| [Var 2] | [LB-UB] | [units] | [estimate/data] |

**Key Assumptions:**
- [Assumption 1]
- [Assumption 2]

**Dependencies:**
- [Var 1] affects [Var 3] because...
- [Var 2] is independent of...
```

### Step 3: Compute Value of Information
**Goal:** Determine which variables are worth measuring.

**Process:**
1. For each variable, calculate EVPI
2. Rank variables by information value
3. Compare to measurement cost
4. Identify high-value measurement opportunities

**Output:**
```markdown
## Information Value Analysis

| Variable | Current Uncertainty | EVPI | Measurement Cost | Net Value |
|----------|---------------------|------|------------------|-----------|
| [Var 1] | Very High | $50K | $5K | $45K |
| [Var 2] | Medium | $10K | $20K | -$10K |
| [Var 3] | High | $30K | $3K | $27K |

**Priority Measurements:**
1. [Var 1] - Highest net value
2. [Var 3] - Second priority

**Skip Measuring:**
- [Var 2] - Cost exceeds value
```

### Step 4: Design Measurement Approach
**Goal:** Create practical measurement methods for high-value variables.

**For each priority variable:**
1. Decompose if intangible
2. Identify data sources
3. Design sampling method
4. Estimate measurement error
5. Plan execution

**Output:**
```markdown
## Measurement Approach: [Variable Name]

**Decomposition:**
- Observable 1: [description]
- Observable 2: [description]

**Data Sources:**
- Primary: [source]
- Secondary: [source]

**Sampling Method:**
- Sample size: [N]
- Selection method: [random/stratified/etc.]
- Data collection: [survey/observation/etc.]

**Timeline:**
- Start: [date]
- Complete: [date]
- Results available: [date]

**Expected Uncertainty Reduction:** [X%]
**Estimated Cost:** $[amount]
```

### Step 5: Make Decision and Measure Value
**Goal:** Apply results, decide, and track outcomes.

**Process:**
1. Conduct priority measurements
2. Update calibrated estimates
3. Recalculate EVPI (should be reduced)
4. Make the decision
5. Track actual outcome
6. Learn for future measurements

**Output:**
```markdown
## Updated Estimates

| Variable | Before Measurement | After Measurement | Reduction |
|----------|-------------------|-------------------|-----------|
| [Var 1] | [LB-UB] | [LB-UB] | [X%] narrower |

## Decision

Based on updated information:
- **Decision:** [Choice made]
- **Confidence:** [X%] this is correct choice
- **Remaining Risk:** $[EOL after measurement]

## Tracking

- Decision made: [date]
- Outcome observed: [date]
- Actual result: [to be filled]
- Learning: [to be filled]
```

---

## Complete AIE Template

```markdown
# Measurement Plan: [Problem Name]

**Created:** [Date]
**Decision Deadline:** [Date]

---

## Step 1: Decision Definition

**Primary Decision:**
[Clear statement of what we're deciding]

**Alternatives:**
1. [Option A] - [brief description]
2. [Option B] - [brief description]
3. Do nothing

**Decision Maker:** [Name/Role]
**Stakes:** $[low] to $[high] over [time period]

---

## Step 2: Current Knowledge

### Key Variables

| Variable | 90% CI | Impact | Data Quality |
|----------|--------|--------|--------------|
| [Var 1] | | High | Estimate |
| [Var 2] | | Medium | Data-based |
| [Var 3] | | High | Estimate |

### Critical Uncertainties
1. [Most uncertain factor with highest impact]
2. [Second most critical uncertainty]

### Baseline Model
[Simple model showing how variables relate to outcomes]

---

## Step 3: Information Value

### EVPI by Variable

| Variable | EVPI | Ease of Measurement | Priority |
|----------|------|---------------------|----------|
| [Var 1] | $[X] | Easy | 1 |
| [Var 2] | $[X] | Hard | 3 |
| [Var 3] | $[X] | Medium | 2 |

### Measurement Budget
- Available: $[budget]
- Recommended allocation:
  - [Var 1]: $[amount]
  - [Var 3]: $[amount]

---

## Step 4: Measurement Design

### [Variable 1] Measurement

**Method:** [Survey/Sampling/Experiment/etc.]
**Sample:** [Description]
**Timeline:** [Duration]
**Cost:** $[Amount]
**Expected result:** Reduce uncertainty by [X%]

### [Variable 3] Measurement

**Method:** [Description]
**Sample:** [Description]
**Timeline:** [Duration]
**Cost:** $[Amount]
**Expected result:** Reduce uncertainty by [X%]

---

## Step 5: Decision and Tracking

### Pre-Measurement Decision Rule
If [Var 1] > [threshold], choose [Option A]
If [Var 1] ≤ [threshold], choose [Option B]

### Measurement Results
(To be completed after measurement)

| Variable | Original 90% CI | Updated 90% CI |
|----------|-----------------|----------------|
| [Var 1] | | |
| [Var 3] | | |

### Final Decision
**Choice:** [Option chosen]
**Date:** [Date]
**Key factor:** [What drove the decision]

### Outcome Tracking
- Expected outcome: [prediction]
- Actual outcome: [to be recorded]
- Variance: [analysis]
- Learning: [insights for future]
```

---

## Example: Should We Expand to New Market?

### Step 1: Decision
**Decision:** Expand product to European market
**Alternatives:** (A) Full launch, (B) Pilot in UK only, (C) Defer 1 year
**Stakes:** $2M-$10M over 3 years

### Step 2: Current Knowledge

| Variable | 90% CI | Impact |
|----------|--------|--------|
| Market size | 50K-200K customers | High |
| Conversion rate | 1%-5% | High |
| Customer acquisition cost | $50-$200 | Medium |
| Regulatory timeline | 3-12 months | Medium |

### Step 3: Information Value
- Market size EVPI: $150K (highest uncertainty, direct impact)
- Conversion rate EVPI: $120K (uncertain, affects ROI)
- CAC EVPI: $30K (narrower range, less impact)
- Regulatory EVPI: $50K (binary outcome)

Priority: Measure market size, then conversion rate

### Step 4: Measurement Design
- **Market size:** Commission research firm ($15K), 3 weeks
- **Conversion rate:** Beta test in UK ($25K), 8 weeks

### Step 5: Tracking
[To be completed after measurements and decision]
