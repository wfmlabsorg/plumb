# Value of Information Workflow

## Purpose
Calculate whether it's worth measuring something by computing the Expected Value of Information (EVI).

---

## Core Formula

**Value of Information = Reduction in Expected Opportunity Loss**

- **EOL** (Expected Opportunity Loss) = Probability of wrong decision × Cost of being wrong
- **EVPI** (Expected Value of Perfect Information) = Current EOL (upper bound on measurement value)
- **EVI** (Expected Value of Information) = EOL before - EOL after

**Decision Rule:**
- If EVI > Cost of measurement → Measure it
- If EVI < Cost of measurement → Don't measure, decide now

---

## Process

### Step 1: Define the Decision
- What decision are you making?
- What are the alternatives?
- What is the default choice (what would you do without more info)?

### Step 2: Identify the Threshold
At what value does your decision change?
- What's the breakeven point?
- Above X, you choose A; below X, you choose B

### Step 3: Estimate Current Uncertainty
What's your 90% CI for the uncertain quantity?
- Use CalibratedEstimate workflow if needed
- Note: uncertainty should span both sides of threshold (otherwise, why measure?)

### Step 4: Calculate EVPI (Binary Case)

For simple binary decisions:

```
EVPI = P(wrong) × Cost(wrong)
```

**Example:**
- Decision: Launch campaign (costs $5M) or don't
- Campaign succeeds (profit $40M) with 60% probability
- Campaign fails (lose $5M) with 40% probability
- Default: Launch

If we launch and it fails, we lose $5M.
EVPI = 40% × $5M = **$2M**

### Step 5: Calculate EVPI (Continuous Case)

When the uncertain variable has a range of values:

1. Determine threshold where decision changes
2. Calculate probability of being on wrong side of threshold
3. Calculate expected loss if on wrong side

**Simplified method:**
```
EVPI ≈ P(below threshold) × E[Loss if below threshold]
```

### Step 6: Compare to Measurement Cost
- What would the measurement cost? (time, money, effort)
- If EVPI > measurement cost → Worth measuring
- If EVPI < measurement cost → Decide without measuring

---

## Output Format

```markdown
## Value of Information Analysis: [Decision]

### Decision Context
- **Decision:** [What we're deciding]
- **Options:** [A, B, or more]
- **Default:** [What we'd do without more info]
- **Threshold:** [Where decision changes]

### Current Uncertainty
- **Uncertain variable:** [What we don't know]
- **90% CI:** [LB] to [UB]
- **Probability below threshold:** [X%]
- **Probability above threshold:** [Y%]

### Opportunity Loss Calculation
- **If wrong (chose A, should've been B):** $[loss]
- **Probability of this error:** [X%]
- **Expected Opportunity Loss:** $[EOL]

### EVPI (Value of Perfect Information)
**EVPI = $[amount]**

### Measurement Cost Estimate
- **Proposed measurement:** [description]
- **Estimated cost:** $[amount]
- **Time required:** [duration]

### Recommendation
**[MEASURE / DON'T MEASURE]**

[Justification: EVPI of $X is [greater/less] than measurement cost of $Y]

### If Not Measuring
Proceed with default decision: [decision]
Accept [X%] risk of $[loss] loss.
```

---

## EVPI Quick Reference Table

Use this when your 90% CI spans a threshold:

| P(wrong side) | Cost if wrong | EVPI |
|---------------|---------------|------|
| 10% | $100,000 | $10,000 |
| 20% | $100,000 | $20,000 |
| 30% | $100,000 | $30,000 |
| 10% | $1,000,000 | $100,000 |
| 20% | $1,000,000 | $200,000 |
| 30% | $1,000,000 | $300,000 |

---

## Example: Should We Survey Customers?

**Decision:** Add premium tier feature ($200K development cost)
**Threshold:** Need 15% uptake to break even within 2 years

**Step 1 - Define Decision:**
- Options: Build feature ($200K) or don't
- Default: Don't build (risk-averse)
- If uptake ≥15%, we should build
- If uptake <15%, we shouldn't

**Step 2 - Current Uncertainty:**
- Best estimate of uptake: 90% CI of 8% to 25%
- Median estimate: 14%
- P(uptake < 15%) ≈ 55%
- P(uptake ≥ 15%) ≈ 45%

**Step 3 - Opportunity Loss:**
If we don't build but should have:
- Foregone profit = ~$150K over 2 years
- P(this error) = 45%

If we build but shouldn't have:
- Lost investment = $200K
- P(this error) = 55%

**Step 4 - EVPI Calculation:**
Since default is "don't build":
- EOL = P(uptake ≥15%) × Value foregone
- EOL = 45% × $150K = **$67,500**

EVPI = $67,500

**Step 5 - Measurement Cost:**
- Customer survey: $5,000
- Focus groups: $15,000
- Beta test with subset: $30,000

**Step 6 - Decision:**
Even expensive beta test ($30K) < EVPI ($67.5K)

**Recommendation: MEASURE**

Run at minimum a $5K survey. If inconclusive, consider $15K focus groups.

---

## When VOI Is Zero

You don't need to measure if:
1. **Uncertainty doesn't span threshold:** Your 90% CI is entirely on one side
2. **Decision is robust:** Same choice regardless of answer
3. **No decision exists:** Purely informational, no action changes
4. **Cost of being wrong is zero:** No stakes

---

## Advanced: Partial Information

Real measurements don't give perfect information. Estimate reduction:

```
EVI = EVPI × Uncertainty Reduction Factor
```

Typical uncertainty reduction factors:
- Large random sample: 70-90%
- Small sample (Rule of Five): 30-50%
- Expert consultation: 10-30%
- Quick web research: 5-15%

**Example:**
- EVPI = $100,000
- Small survey reduces uncertainty by ~40%
- EVI ≈ $100,000 × 40% = $40,000
- Survey cost = $5,000
- Net value = $35,000 → Worth doing
