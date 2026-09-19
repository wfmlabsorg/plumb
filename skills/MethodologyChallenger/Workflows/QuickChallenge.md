# QuickChallenge Workflow

Rapid 5-question challenge for time-constrained review.

---

## Purpose

When a full review isn't possible, this workflow provides a rapid assessment focusing on the five most impactful challenges. Use before meetings, quick reviews, or initial screening.

---

## Input
- Analysis to review
- Time constraint (typically < 15 minutes)

## Output
- Top 5 challenges/holes identified
- Quick verdict
- Priority action if only one thing can be fixed

---

## Procedure

### The Five Critical Questions

Apply these five questions in order. Each is designed to catch the most common and impactful issues.

---

### Question 1: Is This the Right Methodology for the Question?

**Quick Check:**
- What question is being answered? [State it]
- Is it descriptive, predictive, or causal? [Classify]
- Does the methodology match? [Y/N]

**Common Mismatches:**
- Correlation analysis used for causal question
- Simple regression for complex causal structure
- Descriptive stats for prediction task
- Historical average for forecast

**Challenge Output:**
```
Q1: Methodology Match
Question Type: [Type]
Methodology: [Method]
Match: [Yes/No/Partial]
If No: [What should be different]
```

---

### Question 2: What's the Biggest Assumption, and Is It Justified?

**Quick Check:**
- What's the single most critical assumption? [State it]
- Is it stated explicitly in the analysis? [Y/N]
- What evidence supports it? [Brief]
- What if it's wrong? [Impact]

**Common Unjustified Assumptions:**
- No unmeasured confounders
- Sample is representative
- Relationships are stable over time
- Data is accurate

**Challenge Output:**
```
Q2: Critical Assumption
Assumption: [Statement]
Stated: [Yes/No]
Evidence: [Brief summary or "None provided"]
If Wrong: [What breaks]
```

---

### Question 3: Do the Claims Match the Evidence?

**Quick Check:**
- What's the strongest claim made? [State it]
- What evidence directly supports it? [List]
- Is the claim appropriately hedged? [Y/N]
- Would a skeptic accept it? [Y/N/Maybe]

**Common Over-claims:**
- Causal language from correlational evidence
- "Significant" treated as "important"
- Point estimate without uncertainty
- Generalization beyond sample

**Challenge Output:**
```
Q3: Claim-Evidence Match
Strongest Claim: [Statement]
Evidence: [Brief summary]
Appropriately Hedged: [Yes/No]
Skeptic Test: [Pass/Fail/Conditional]
```

---

### Question 4: What Alternative Explanation Wasn't Considered?

**Quick Check:**
- For the main finding, what else could explain it? [State alternative]
- Was this alternative addressed in the analysis? [Y/N]
- How likely is the alternative? [Low/Medium/High]
- What would distinguish it from the claimed explanation? [Test]

**Common Missed Alternatives:**
- Selection effects / survivorship bias
- Reverse causation
- Common cause (confounding)
- Coincidence / random variation
- Measurement artifact

**Challenge Output:**
```
Q4: Alternative Explanation
Main Finding: [Statement]
Alternative: [What else could explain this]
Addressed: [Yes/No]
Likelihood: [Low/Medium/High]
Test: [How to distinguish]
```

---

### Question 5: What Would Make This Wrong?

**Quick Check:**
- What single thing, if true, would invalidate the conclusion? [State it]
- Was this risk addressed? [Y/N]
- How likely is it? [Low/Medium/High]
- What's the consequence if wrong? [Impact]

**Common Fatal Flaws:**
- Key data is inaccurate or biased
- Sample is not representative
- Effect is spurious (p-hacking, overfitting)
- Direction of causation is reversed
- Critical confounder is unmeasured

**Challenge Output:**
```
Q5: Fatal Flaw Risk
Invalidating Condition: [Statement]
Addressed: [Yes/No]
Likelihood: [Low/Medium/High]
Consequence: [What happens if wrong]
```

---

### Synthesize Quick Verdict

**Count the issues:**
```
Issues Found:
- Q1 Methodology Match: [Issue or OK]
- Q2 Critical Assumption: [Issue or OK]
- Q3 Claim-Evidence Match: [Issue or OK]
- Q4 Alternative Explanation: [Issue or OK]
- Q5 Fatal Flaw Risk: [Issue or OK]

Total Issues: [N of 5]
```

**Quick Verdict Table:**
| Issues | Verdict |
|--------|---------|
| 0 | PASS - Analysis looks solid |
| 1 | PASS WITH NOTE - Address minor concern |
| 2 | CAUTION - Review before proceeding |
| 3 | CONCERN - Significant revision needed |
| 4-5 | STOP - Major problems, needs rework |

---

## Output Template

```markdown
## Quick Challenge Report

### Analysis: [Brief description]
### Time: [Duration of review]

---

### The Five Challenges

#### Q1: Is the methodology right?
**Verdict:** [Match/Mismatch]
**Issue:** [Brief or "None"]

#### Q2: Is the biggest assumption justified?
**Assumption:** [Statement]
**Verdict:** [Justified/Questionable/Unjustified]
**Issue:** [Brief or "None"]

#### Q3: Do claims match evidence?
**Strongest claim:** [Statement]
**Verdict:** [Supported/Over-claimed/Unsupported]
**Issue:** [Brief or "None"]

#### Q4: What wasn't considered?
**Alternative:** [Statement]
**Verdict:** [Addressed/Missed]
**Issue:** [Brief or "None"]

#### Q5: What would make this wrong?
**Risk:** [Statement]
**Verdict:** [Mitigated/Unaddressed]
**Issue:** [Brief or "None"]

---

### Quick Verdict

**Issues Found:** [N of 5]
**Verdict:** [PASS / PASS WITH NOTE / CAUTION / CONCERN / STOP]

---

### If You Can Only Fix One Thing

**Priority Fix:** [The single most important issue to address]
**Why:** [Brief rationale]
**How:** [Suggested action]

---

### Full Review Needed?

Based on this quick challenge:
- [ ] No, analysis can proceed
- [ ] Maybe, address noted issues first
- [ ] Yes, significant concerns warrant deep review
```

---

## Usage Notes

### When to Use QuickChallenge
- Before a meeting or presentation
- Initial screening of analysis
- When full review isn't feasible
- Sanity check during analysis

### When to Escalate to FullReview
- Multiple issues found in quick challenge
- Complex methodology requires detailed audit
- High-stakes decision depends on analysis
- Significant concerns about assumptions or claims

### Time Targets
- Questions 1-5: 2-3 minutes each
- Synthesis: 2-3 minutes
- Total: 15-20 minutes max

### Quality Note
This is a screening tool, not a substitute for thorough review. A passing quick challenge doesn't guarantee the analysis is correct—it indicates no obvious problems were found with limited examination.
