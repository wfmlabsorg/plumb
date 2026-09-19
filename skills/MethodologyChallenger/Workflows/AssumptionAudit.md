# AssumptionAudit Workflow

Surface and challenge assumptions made in the analysis.

---

## Purpose

Every methodology carries assumptions. This workflow surfaces implicit assumptions, checks if they're stated, evaluates evidence for/against them, and assesses what happens if they're violated.

---

## Input
- Analysis document
- Skills identified (from SkillAudit)
- Data description (if available)

## Output
- Complete assumption inventory
- Evidence assessment for each assumption
- Violation impact analysis
- Assumptions requiring explicit justification

---

## Procedure

### Step 1: Extract Skill-Required Assumptions

**For each PLUMB skill used, list its required assumptions:**

#### DataAnalysis Assumptions

| Assumption | Description | Check |
|------------|-------------|-------|
| Data completeness | No critical data is missing | [ ] |
| Data accuracy | Data reflects reality | [ ] |
| Sample representativeness | Sample represents population | [ ] |
| Temporal stability | Patterns are stable over time | [ ] |
| Metric consistency | Definitions are consistent | [ ] |
| No measurement error | Or error is random | [ ] |

#### CausalInference Assumptions

| Assumption | Description | Check |
|------------|-------------|-------|
| DAG correctness | No missing edges | [ ] |
| No unmeasured confounders | Or bounded | [ ] |
| SUTVA | No interference between units | [ ] |
| Positivity | All units could receive treatment | [ ] |
| Consistency | Treatment is well-defined | [ ] |
| Correct functional form | Parametric assumptions | [ ] |
| No selection bias | Sample not biased | [ ] |

#### BookOfWhy Assumptions

| Assumption | Description | Check |
|------------|-------------|-------|
| Correct rung | Question properly classified | [ ] |
| Causal mechanism exists | X can cause Y | [ ] |
| Temporal ordering | Cause precedes effect | [ ] |
| Counterfactual coherence | Alternative world is coherent | [ ] |
| SCM validity | Structural model is correct | [ ] |

#### Research Assumptions

| Assumption | Description | Check |
|------------|-------------|-------|
| Source completeness | Relevant sources found | [ ] |
| Source credibility | Sources are reliable | [ ] |
| No publication bias | Not just positive findings | [ ] |
| Generalizability | Findings apply to context | [ ] |
| Current relevance | Sources aren't outdated | [ ] |

#### Statistical Assumptions (General)

| Assumption | Description | Check |
|------------|-------------|-------|
| Independence | Observations are independent | [ ] |
| Normality | Distribution is normal (if required) | [ ] |
| Homoskedasticity | Variance is constant | [ ] |
| Linearity | Relationship is linear (if assumed) | [ ] |
| No multicollinearity | Predictors not highly correlated | [ ] |
| Correct specification | Model includes right variables | [ ] |

### Step 2: Categorize Assumptions

**For each assumption, determine:**

```
Assumption: [Name]

Category:
- [ ] Methodological (required by the method)
- [ ] Substantive (about the real world)
- [ ] Statistical (about data properties)
- [ ] Practical (about context/constraints)

Visibility:
- [ ] Explicitly stated in analysis
- [ ] Implied but not stated
- [ ] Completely hidden

Criticality:
- [ ] Foundational (if violated, analysis is invalid)
- [ ] Important (if violated, results may be biased)
- [ ] Minor (if violated, precision affected)
```

### Step 3: Evaluate Evidence

**For each assumption, assess supporting/contradicting evidence:**

```
Assumption: [Name]

Evidence FOR:
1. [Evidence 1] - Strength: [Strong/Moderate/Weak]
2. [Evidence 2] - Strength: [Strong/Moderate/Weak]

Evidence AGAINST:
1. [Evidence 1] - Strength: [Strong/Moderate/Weak]
2. [Evidence 2] - Strength: [Strong/Moderate/Weak]

Overall Assessment: [Supported / Uncertain / Questionable / Likely Violated]

Notes:
[Additional context]
```

### Step 4: Analyze Violation Impact

**For each critical/important assumption, assess what happens if violated:**

```
Assumption: [Name]

If Violated:

Direction of Bias:
- [ ] Results would be biased upward
- [ ] Results would be biased downward
- [ ] Direction uncertain
- [ ] Results would be invalid (not just biased)

Magnitude:
- [ ] Large effect (could change conclusions)
- [ ] Moderate effect (would change confidence)
- [ ] Small effect (minor impact)

What Would We See:
[Observable symptoms of violation]

Mitigation Options:
1. [Option 1]
2. [Option 2]

Was This Addressed?
- [ ] Yes, sensitivity analysis performed
- [ ] Yes, robustness check performed
- [ ] Partially addressed
- [ ] Not addressed
```

### Step 5: Check for Unstated Assumptions

**Actively probe for hidden assumptions:**

#### Domain Assumptions
- What does the analysis assume about how the domain works?
- Are there implicit causal mechanisms assumed?
- What behavioral assumptions are made?

#### Data Assumptions
- What is assumed about data quality?
- What is assumed about data generation process?
- What edge cases are implicitly excluded?

#### Context Assumptions
- What is assumed about the decision context?
- What is assumed about stakeholder needs?
- What time horizon is implicitly assumed?

**Document each unstated assumption found:**
```
Unstated Assumption: [Description]

Found by: [How it was discovered]

Should Have Been Stated Because:
[Why it matters]

Evidence Status: [Unknown/Needs Investigation]
```

### Step 6: Generate Assumption Inventory

**Create comprehensive assumption table:**

```markdown
## Assumption Inventory

| ID | Assumption | Category | Source | Stated? | Evidence | Status |
|----|------------|----------|--------|---------|----------|--------|
| A1 | [Assumption] | [Cat] | [Skill] | [Y/N] | [For/Against] | [OK/?/CONCERN] |
| A2 | ... | ... | ... | ... | ... | ... |

### Critical Assumptions (Foundational)

#### A1: [Assumption Name]
- **Required by:** [Skill/Method]
- **Stated:** [Yes/No]
- **Evidence for:** [List]
- **Evidence against:** [List]
- **If violated:** [Impact]
- **Status:** [OK/CONCERN/VIOLATED]
- **Action needed:** [None/Document/Investigate/Mitigate]

### Important Assumptions

#### A2: [Assumption Name]
...

### Minor Assumptions

#### A3: [Assumption Name]
...
```

### Step 7: Prioritize for Justification

**List assumptions requiring explicit justification:**

```
Assumptions Requiring Explicit Justification:

MUST JUSTIFY (Critical + Questionable):
1. [Assumption]: [Why justification needed]
2. [Assumption]: [Why justification needed]

SHOULD JUSTIFY (Important + Not Stated):
1. [Assumption]: [Why justification needed]
2. [Assumption]: [Why justification needed]

CONSIDER JUSTIFYING (Minor but Potentially Challenged):
1. [Assumption]: [Why might be questioned]
```

---

## Output Template

```markdown
## Assumption Audit Report

### Analysis Reviewed
[Brief description]

### Skills Used
[List of skills and their assumption requirements]

---

### Assumption Inventory

#### Critical Assumptions

| Assumption | Source | Stated | Evidence | Status |
|------------|--------|--------|----------|--------|
| [A1] | [Skill] | [Y/N] | [+/-] | [Status] |
| [A2] | ... | ... | ... | ... |

#### Important Assumptions

| Assumption | Source | Stated | Evidence | Status |
|------------|--------|--------|----------|--------|
| [A3] | ... | ... | ... | ... |

#### Minor Assumptions

| Assumption | Source | Stated | Evidence | Status |
|------------|--------|--------|----------|--------|
| [A4] | ... | ... | ... | ... |

---

### Unstated Assumptions Discovered

1. **[Assumption]**
   - Why it matters: [Explanation]
   - Should investigate: [Yes/No]

2. **[Assumption]**
   - Why it matters: [Explanation]
   - Should investigate: [Yes/No]

---

### Violation Impact Analysis

#### [Assumption A1]
- If violated: [Impact]
- Direction of bias: [Up/Down/Invalid]
- Magnitude: [Large/Moderate/Small]
- Addressed in analysis: [Yes/No/Partially]

#### [Assumption A2]
...

---

### Justification Requirements

**Must Justify:**
1. [Assumption]: The analyst must explain [what]
2. [Assumption]: The analyst must provide [what]

**Should Justify:**
1. [Assumption]: Would strengthen analysis to address
2. [Assumption]: Potential reviewer concern

---

### Summary

**Assumptions well-supported:** [N]
**Assumptions uncertain:** [N]
**Assumptions concerning:** [N]

**Overall assumption robustness:** [Strong/Moderate/Weak]

**Key vulnerability:** [Main assumption risk]
```

---

## Assumption Red Flags

Watch for these warning signs:

### In Causal Analysis
- No discussion of unmeasured confounders
- DAG presented without domain expert input
- "We control for X" without justifying why X is sufficient
- Counterfactual claims without SCM specification

### In Statistical Analysis
- No discussion of model assumptions
- Significance tests without power analysis
- P-values without effect sizes
- No sensitivity analysis

### In Data Analysis
- No data quality assessment documented
- Sample size not discussed
- Missing data not addressed
- Temporal coverage not justified

### In Research Synthesis
- Source selection not documented
- No discussion of source quality
- Conflicting evidence not acknowledged
- Generalizability not discussed
