# ConclusionWarrant Workflow

Challenge whether conclusions are warranted by the evidence.

---

## Purpose

Even if methodology was correctly chosen and executed, conclusions may overreach the evidence. This workflow evaluates whether each claim is supported, appropriately hedged, and would withstand scrutiny from a skeptical expert.

---

## Input
- Analysis conclusions/claims
- Evidence presented
- Methodology used (from SkillAudit)
- Limitations documented (if any)

## Output
- Claim-by-claim warrant assessment
- Evidence strength evaluation
- Claim-evidence match analysis
- Recommended claim adjustments

---

## Procedure

### Step 1: Extract All Claims

**Identify every claim made in the analysis:**

Claims can be:
- **Factual**: "X is Y" / "We observed X"
- **Causal**: "X causes Y" / "X led to Y"
- **Predictive**: "X will Y" / "If we do X, Y will happen"
- **Prescriptive**: "We should do X" / "X is recommended"
- **Comparative**: "X is better than Y" / "X improved by N%"

**Document each claim:**
```
Claim #[N]:
Text: "[Exact claim from analysis]"
Location: [Section/Page]
Type: [Factual/Causal/Predictive/Prescriptive/Comparative]
Strength: [Strong/Moderate/Weak/Hedged]
```

### Step 2: Assess Claim Strength

**Classify the strength of each claim:**

#### Strong Claims (High Certainty)
Language indicators:
- "X causes Y"
- "X will definitely Y"
- "We should absolutely X"
- "X is the best"
- No hedging or caveats

**Required evidence level:** Very strong (multiple converging lines, robust to alternatives)

#### Moderate Claims (Medium Certainty)
Language indicators:
- "X likely causes Y"
- "X probably will Y"
- "We should consider X"
- "X appears to be better"
- Some hedging

**Required evidence level:** Solid (consistent evidence, key assumptions supported)

#### Weak/Hedged Claims (Low Certainty)
Language indicators:
- "X may cause Y"
- "X might Y"
- "X could be considered"
- "X seems better"
- Explicit uncertainty

**Required evidence level:** Suggestive (directional evidence, acknowledged limitations)

### Step 3: Evaluate Evidence for Each Claim

**For each claim, inventory the supporting evidence:**

```
Claim: [Text]

Supporting Evidence:
1. [Evidence 1]
   - Type: [Statistical/Observational/Expert/Literature]
   - Strength: [Strong/Moderate/Weak]
   - Relevance: [Direct/Indirect/Tangential]

2. [Evidence 2]
   - Type: [Type]
   - Strength: [Strength]
   - Relevance: [Relevance]

3. [Evidence 3]
   ...

Contradicting Evidence:
1. [Counter-evidence 1]
   - Acknowledged in analysis: [Yes/No]

Alternative Explanations:
1. [Alternative 1]
   - Addressed in analysis: [Yes/No]
```

### Step 4: Assess Evidence Strength

**Rate the overall evidence strength for each claim:**

#### Strong Evidence
- Multiple independent sources converge
- Causal mechanism understood
- Effect size substantial
- Robust to alternative specifications
- Replicated or validated

#### Moderate Evidence
- Single strong source or multiple weaker sources
- Mechanism plausible
- Effect size meaningful
- Some sensitivity analysis
- Not contradicted

#### Weak Evidence
- Single source
- Mechanism speculative
- Effect size small or uncertain
- No sensitivity analysis
- Alternatives not ruled out

#### Insufficient Evidence
- No direct evidence
- Evidence contradicts claim
- Critical assumptions unverified
- Alternative explanations equally plausible

### Step 5: Match Claims to Evidence

**Evaluate whether claim strength matches evidence strength:**

```
Claim: [Text]
Claim Strength: [Strong/Moderate/Weak/Hedged]
Evidence Strength: [Strong/Moderate/Weak/Insufficient]

Match Assessment:
- [ ] Appropriate: Claim calibrated to evidence
- [ ] Over-claimed: Claim stronger than evidence supports
- [ ] Under-claimed: Evidence supports stronger claim
- [ ] Unsupported: No meaningful evidence for claim

If Over-claimed:
- Gap: [How much stronger is claim than evidence]
- Risk: [What could go wrong if claim is wrong]
- Suggested revision: [How to rephrase claim]

If Under-claimed:
- Note: [Evidence supports more confident claim]
```

### Step 6: Apply Claim-Specific Challenges

#### For Causal Claims

**Check Ladder of Causation alignment:**
- What rung evidence was gathered? (1: Association, 2: Intervention, 3: Counterfactual)
- What rung claim is being made?
- Match: [Appropriate/Rung violation]

**Check causal language:**
- [ ] "Causes" - requires Rung 2+ evidence
- [ ] "Led to" - implies causation, requires Rung 2+ evidence
- [ ] "Because of" - implies causation
- [ ] "As a result" - implies causation
- [ ] "Due to" - implies causation

**Check identification:**
- Is the causal effect identified?
- Are confounders addressed?
- Is direction of causation established?

#### For Predictive Claims

**Check prediction basis:**
- [ ] Historical pattern extrapolation (weakest)
- [ ] Statistical model (stronger)
- [ ] Causal model (strongest)

**Check validation:**
- Was prediction tested out-of-sample?
- What's the prediction error range?
- Are conditions for prediction holding?

#### For Prescriptive Claims

**Check action-consequence link:**
- Is there causal evidence that action leads to outcome?
- Are there unintended consequences considered?
- Is the cost-benefit analysis complete?

**Check generalizability:**
- Were recommendations derived from comparable context?
- Are implementation conditions met?

#### For Comparative Claims

**Check comparison validity:**
- Are comparison groups comparable?
- Is the metric appropriate?
- Are confounds controlled?
- Is the difference meaningful (not just significant)?

### Step 7: Apply the Skeptical Expert Test

**For each major claim, ask:**

```
Claim: [Text]

Would a skeptical expert accept this claim?

Expert Concerns:
1. [What they would question]
2. [What alternative they would suggest]
3. [What evidence they would want to see]

Defense Available:
- [How the claim could be defended]

Verdict:
- [ ] Yes, claim would be accepted
- [ ] Conditionally, with caveats: [List]
- [ ] Likely challenged on: [Point]
- [ ] Likely rejected because: [Reason]
```

### Step 8: Check Limitation Disclosure

**Verify limitations are adequately acknowledged:**

```
Limitations That Should Be Disclosed:

1. [Limitation 1]
   - Disclosed: [Yes/No/Partially]
   - Impact on claims: [Which claims affected]

2. [Limitation 2]
   - Disclosed: [Yes/No/Partially]
   - Impact on claims: [Which claims affected]

Missing Limitations:
- [Limitation not disclosed but should be]
```

### Step 9: Generate Revised Claims

**For over-claimed conclusions, suggest revisions:**

```
Original Claim:
"[Original text]"

Issues:
- [Issue 1]
- [Issue 2]

Suggested Revision:
"[Revised text with appropriate hedging]"

Rationale:
[Why this revision better matches evidence]
```

---

## Output Template

```markdown
## Conclusion Warrant Report

### Claims Inventory

| # | Claim | Type | Strength | Evidence | Match |
|---|-------|------|----------|----------|-------|
| 1 | [Claim] | [Type] | [Strength] | [Strength] | [OK/Over/Under] |
| 2 | ... | ... | ... | ... | ... |

---

### Detailed Claim Analysis

#### Claim 1: "[Claim text]"

**Type:** [Factual/Causal/Predictive/Prescriptive/Comparative]
**Claim Strength:** [Strong/Moderate/Weak]

**Supporting Evidence:**
1. [Evidence] - [Type], [Strength], [Relevance]
2. [Evidence] - [Type], [Strength], [Relevance]

**Evidence Strength:** [Strong/Moderate/Weak/Insufficient]

**Match Assessment:** [Appropriate/Over-claimed/Under-claimed/Unsupported]

**Skeptical Expert Test:**
- Would accept: [Yes/Conditionally/Challenged/Rejected]
- Key concern: [Concern]

**Verdict:** [SUPPORTED / NEEDS HEDGING / OVER-CLAIMED / UNSUPPORTED]

**Suggested Revision (if needed):**
"[Revised claim]"

---

#### Claim 2: "[Claim text]"
...

---

### Causal Claim Audit

| Claim | Evidence Rung | Claim Rung | Match |
|-------|---------------|------------|-------|
| [Claim] | [1/2/3] | [1/2/3] | [OK/Violation] |

**Rung Violations:**
- [Claim]: [Description of violation]

---

### Limitation Disclosure Check

| Limitation | Disclosed | Impact |
|------------|-----------|--------|
| [Limit 1] | [Y/N/Partial] | [Claims affected] |
| [Limit 2] | [Y/N/Partial] | [Claims affected] |

**Missing Disclosures:**
1. [Limitation that should be added]
2. [Limitation that should be added]

---

### Summary

**Claims Appropriately Supported:** [N of M]
**Claims Over-claimed:** [N of M]
**Claims Unsupported:** [N of M]

**Overall Conclusion Quality:** [Strong/Acceptable/Needs Revision/Unwarranted]

**Key Issues:**
1. [Issue 1]
2. [Issue 2]

**Required Actions:**
1. [Action 1]
2. [Action 2]
```

---

## Warrant Red Flags

### Language Red Flags
- Causal language without causal evidence
- "Proves" or "demonstrates" for suggestive findings
- Definitive claims without confidence intervals
- "Significant" conflated with meaningful
- Missing hedges for uncertain claims

### Evidence Red Flags
- Single data point supporting major claim
- Correlation presented as causation
- Cherry-picked examples
- No consideration of alternatives
- Contradicting evidence ignored

### Structure Red Flags
- Conclusions not tied to specific evidence
- Recommendations without supporting analysis
- Executive summary stronger than body supports
- Limitations buried or absent

### Scope Red Flags
- Generalizing beyond sample
- Extrapolating beyond data range
- Applying findings to different context
- Future predictions from historical patterns
