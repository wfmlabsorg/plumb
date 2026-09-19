# Calibrated Estimate Workflow

## Purpose
Generate a 90% confidence interval estimate for an uncertain quantity using calibration techniques.

---

## When to Use
- Estimating a quantity you don't know exactly
- Need to express uncertainty about a number
- Starting point before deciding whether to measure further

---

## Process

### Step 1: Clarify What You're Estimating
Define the quantity precisely:
- What exactly are we measuring?
- What units?
- What time period?
- What population/scope?

**Example:** "Average time employees spend in meetings"
→ Clarified: "Mean hours per week an employee at Company X spends in scheduled meetings, measured over the past quarter"

### Step 2: Anchor on Extremes
Ask: "What values would be absurd?"
- What's the absolute minimum possible?
- What's the absolute maximum possible?

This establishes outer bounds and anchors your thinking.

### Step 3: Generate Initial 90% CI
Provide two numbers:
- **Lower bound (LB):** You're 95% sure the true value is ABOVE this
- **Upper bound (UB):** You're 95% sure the true value is BELOW this

Combined: 90% confident the answer is between LB and UB.

### Step 4: Apply Equivalent Bet Test
Imagine you can win $1,000 either by:
- **A:** Betting the true value is within your range
- **B:** Spinning a wheel that pays 90% of the time

Which do you prefer?
- Prefer B → Your range is too narrow (overconfident) → Widen it
- Prefer A → Your range is too wide (underconfident) → Narrow it
- Indifferent → Your range is correctly calibrated

### Step 5: Adjust and Finalize
Based on the equivalent bet test, adjust your bounds until you're truly indifferent between options A and B.

---

## Output Format

```markdown
## Calibrated Estimate: [Topic]

**Quantity:** [Precise definition]
**Units:** [units]
**Scope:** [population/time period]

### 90% Confidence Interval
- **Lower Bound:** [LB]
- **Upper Bound:** [UB]
- **Median Estimate:** [best single guess]

### Calibration Check
- Equivalent bet test: [pass/adjusted]
- Anchoring extremes used: [min] to [max]

### Key Assumptions
- [assumption 1]
- [assumption 2]

### What Would Change This Estimate
- [factor that would shift up]
- [factor that would shift down]
```

---

## Quick Version (Rule of Five)

If you can sample 5 actual observations:
1. Randomly select 5 data points
2. Record highest and lowest values
3. 93.75% confident median is between them

**Example:** Sample 5 employees' meeting hours: 4, 8, 6, 12, 5
→ 93.75% confident median is between 4 and 12 hours/week

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Anchoring too narrowly | Start with absurd extremes first |
| Ignoring uncertainty | If unsure, wider is better than falsely precise |
| Confusing mean and median | Be explicit about which statistic |
| Forgetting scope | Always specify time period and population |

---

## Example Execution

**Request:** "Estimate how many customer support tickets we'll get next month"

**Step 1 - Clarify:**
- Quantity: Total new support tickets submitted
- Scope: All channels, next calendar month
- Current baseline: ~500/month historically

**Step 2 - Anchor on Extremes:**
- Absolute minimum: 0 (impossible but theoretical floor)
- Practical minimum: 200 (never seen lower)
- Practical maximum: 1,500 (major incident scenario)
- Absolute maximum: 10,000 (absurd, system would break)

**Step 3 - Initial 90% CI:**
- Lower bound: 350
- Upper bound: 750

**Step 4 - Equivalent Bet Test:**
Would I bet on this range over 90% wheel? Yes, slightly prefer the bet.
→ Range might be slightly too wide

**Step 5 - Adjusted Estimate:**
- Lower bound: 380
- Upper bound: 700
- Median: 520

**Final Output:**
90% confident next month's support tickets will be between 380 and 700, with median estimate of 520.
