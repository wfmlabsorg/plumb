# Measurement Decomposition Workflow

## Purpose
Break down an "intangible" or abstract concept into observable, measurable components.

---

## Core Principle

**If it matters, it's detectable. If it's detectable, it can be measured.**

When something seems unmeasurable, it's usually because:
1. The concept isn't clearly defined
2. You haven't identified what would be different if the quantity changed
3. You're seeking false precision instead of uncertainty reduction

---

## Process

### Step 1: Define What You Mean
Ask clarifying questions:
- "What do you mean by [intangible]?"
- "How would you know if it increased or decreased?"
- "What would be different in the world if this changed?"

Document the operational definition.

### Step 2: Identify the Decision
Why does this matter?
- What decision depends on this measurement?
- What would you do differently based on the answer?
- What's at stake?

If there's no decision, there may be no need to measure.

### Step 3: List Observable Consequences
If [intangible] changed, what would you observe?

**Template:**
```
If [intangible] is HIGH, we would see:
- [observable 1]
- [observable 2]
- [observable 3]

If [intangible] is LOW, we would see:
- [observable 1]
- [observable 2]
- [observable 3]
```

### Step 4: Select Proxy Measures
From the observables, identify measurable proxies:

| Observable | Possible Proxy Measure |
|------------|----------------------|
| [observable 1] | [count/rate/amount of X] |
| [observable 2] | [frequency of Y] |
| [observable 3] | [percentage of Z] |

### Step 5: Create Composite Measure (Optional)
If multiple proxies are needed, determine how to combine:
- Simple average?
- Weighted index?
- Principal component?

Often a single good proxy is sufficient.

---

## Output Format

```markdown
## Decomposition: [Intangible Concept]

### Original Statement
"[How the user described the intangible]"

### Operational Definition
[Clear, specific definition of what we mean]

### Decision Context
- **Decision:** [What decision this informs]
- **Stakes:** [What's at risk]

### Observable Consequences

If [intangible] is HIGH:
- [observable 1]
- [observable 2]

If [intangible] is LOW:
- [observable 1]
- [observable 2]

### Recommended Proxy Measures

| Proxy | What It Measures | Data Source |
|-------|------------------|-------------|
| [proxy 1] | [aspect] | [where to get data] |
| [proxy 2] | [aspect] | [where to get data] |

### Measurement Approach
[Summary of how to measure using these proxies]
```

---

## Common Intangibles and Decompositions

### Employee Morale
**Observables:**
- Voluntary turnover rate
- Discretionary effort (staying late, going above)
- Sick day usage
- Participation in optional activities
- Response rates to surveys

**Proxies:**
- 12-month voluntary turnover %
- Anonymous survey score (calibrated)
- Ratio of applied vs. accepted PTO

### Customer Satisfaction
**Observables:**
- Repeat purchases
- Referrals
- Complaint rate
- Time spent on site
- Social media sentiment

**Proxies:**
- Net Promoter Score (NPS)
- Repeat purchase rate
- Support ticket sentiment

### Quality
**Observables:**
- Defect rate
- Rework frequency
- Customer returns
- Time to resolve issues
- Warranty claims

**Proxies:**
- Defects per unit
- First-pass yield
- Return rate

### Strategic Alignment
**Observables:**
- % of projects tied to strategic goals
- Resource allocation to priorities
- Employee knowledge of strategy
- Decision consistency with strategy

**Proxies:**
- Strategy quiz scores
- Budget allocation audit
- Project portfolio review

---

## Decomposition Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Infinite regression | "But how do you measure THAT?" | Stop when you hit something directly observable |
| Over-precision | Creating 20 proxies for one concept | 1-3 good proxies usually suffice |
| Ignoring context | Same proxy for all situations | Tailor proxies to your specific decision |
| Proxy worship | Optimizing the proxy, not the goal | Remember: proxy ≠ the thing itself |

---

## Example: "How do we measure innovation?"

**Step 1 - Define:**
"Innovation" here means: the organization's ability to develop and implement new products, services, or processes that create value.

**Step 2 - Decision:**
We're deciding whether to invest $500K in an innovation lab.

**Step 3 - Observable Consequences:**

If innovation is HIGH:
- More new products launched per year
- Higher % of revenue from products <3 years old
- More patents filed
- More employee ideas submitted
- Faster time-to-market

If innovation is LOW:
- Stagnant product portfolio
- Competitors launching more new products
- Employee ideas ignored or stuck
- Long development cycles

**Step 4 - Proxy Measures:**

| Proxy | What It Measures | Data Source |
|-------|------------------|-------------|
| % revenue from new products | Output of innovation | Finance system |
| Ideas submitted per employee | Innovation culture | Idea management tool |
| Avg time from idea to launch | Innovation velocity | Project records |
| Patents filed annually | Technical innovation | Legal records |

**Step 5 - Composite:**
Innovation Index = 0.4 × (New Product Revenue %) + 0.3 × (Idea Velocity) + 0.3 × (Time-to-Market Score)

**Measurement Approach:**
Track Innovation Index quarterly. Baseline for 2 quarters before lab investment, then compare post-investment trend.
