# ExecutionReview Workflow

Check if the methodology was applied correctly per the skill workflows.

---

## Purpose

Even if the right methodology was chosen, it must be executed correctly. This workflow compares what the skill workflows prescribe against what was actually done, identifying gaps and deviations.

---

## Input
- Analysis document/notebook
- Skills identified (from SkillAudit)
- Skill workflow documentation (read during audit)

## Output
- Step-by-step compliance check for each skill
- Identified gaps and deviations
- Calculation verification (where applicable)
- Execution quality assessment

---

## Procedure

### Step 1: Load Workflow Prescriptions

**For each skill identified, read the relevant workflows:**

```
Skill: [Name]
Workflow: [Workflow Name]
Path: ~/.claude/skills/[Skill]/Workflows/[Workflow].md

Prescribed Steps:
1. [Step 1]
2. [Step 2]
3. [Step 3]
...

Required Outputs:
- [Output 1]
- [Output 2]

Guardrails/Checks:
- [ ] [Check 1]
- [ ] [Check 2]
```

### Step 2: DataAnalysis Execution Check

**If DataAnalysis was used:**

#### Phase 1: INGEST
- [ ] Source data profiled?
- [ ] File structures documented?
- [ ] Data types inferred?
- [ ] `source_manifest.json` created?
- [ ] `schema_report.md` generated?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Phase 2: ETL
- [ ] Appropriate template selected?
- [ ] Parameters documented?
- [ ] Transformation validated (row counts, nulls)?
- [ ] `data_etl.csv` or equivalent produced?
- [ ] `etl_log.json` created?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Phase 3: ANALYZE
- [ ] Analysis method appropriate for data?
- [ ] Thresholds and goals defined?
- [ ] Notebook executed with parameters?
- [ ] Findings structured and extracted?
- [ ] Visualizations generated?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Phase 4: QA
- [ ] Completeness checked (dates, dimensions)?
- [ ] Ranges validated?
- [ ] Outliers detected and addressed?
- [ ] Cross-validation against source?
- [ ] `qa_report.md` or `qa_flags.json` produced?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Phase 5: REPORT
- [ ] Report template used?
- [ ] Findings accurately represented?
- [ ] Methodology documented?
- [ ] Limitations disclosed?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

### Step 3: CausalInference Execution Check

**If CausalInference was used:**

#### DAG Construction (BuildDAG Workflow)
- [ ] Treatment and outcome clearly defined?
- [ ] Variables enumerated with domain expert?
- [ ] Relationships established for each pair?
- [ ] Hidden confounders actively probed?
- [ ] Variables classified (confounder, mediator, collider)?
- [ ] DAG generated in multiple formats?
- [ ] DAG validated (no cycles, no missing confounders)?
- [ ] Testable implications extracted?
- [ ] Adjustment sets identified?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Effect Identification (IdentifyEffect Workflow)
- [ ] Identification method documented?
- [ ] Backdoor/frontdoor/IV justified?
- [ ] Adjustment set specified?
- [ ] Validity conditions verified?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Effect Estimation (EstimateEffect Workflow)
- [ ] Estimation method appropriate for DAG?
- [ ] Point estimate calculated?
- [ ] Confidence intervals provided?
- [ ] Robustness checks performed?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Sensitivity Analysis
- [ ] Unmeasured confounding assessed?
- [ ] Results tested under alternative assumptions?
- [ ] Bounds computed if exact identification impossible?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Guardrails (from CausalInference SKILL.md)
- [ ] Query classified to correct rung?
- [ ] DAG reviewed by domain expert?
- [ ] Assumptions explicitly stated?
- [ ] Data quality verified?
- [ ] No conditioning on colliders?
- [ ] No conditioning on mediators (for total effect)?
- [ ] Limitations documented?
- [ ] Causal language used appropriately?

### Step 4: BookOfWhy Execution Check

**If BookOfWhy framework was applied:**

#### Ladder of Causation
- [ ] Query correctly classified to rung?
- [ ] Rung 1 evidence not used for Rung 2/3 claims?
- [ ] Language matches claim level?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Causal Structure
- [ ] Confounders identified and addressed?
- [ ] Mediators not treated as confounders?
- [ ] Colliders not conditioned on (unless intentional)?
- [ ] d-separation rules followed?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Key Mantras Check
- [ ] "No causes in, no causes out" - Were causal assumptions made explicit?
- [ ] "Correlation is not causation" - Was this distinction maintained?
- [ ] "Confounders open paths, colliders close them" - Correctly applied?
- [ ] "Never condition on mediator for total effect" - Avoided mediator fallacy?
- [ ] "Counterfactuals require models" - SCM provided for counterfactual claims?

### Step 5: Research Execution Check

**If Research skill was used:**

#### Phase 1: INTAKE
- [ ] Objectives clearly defined and specific?
- [ ] Primary deliverable identified?
- [ ] Initial sources listed by type?
- [ ] Research Brief created?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Phase 2: DISCOVER
- [ ] Sources inventoried systematically?
- [ ] Multiple source types considered?
- [ ] Files needing conversion flagged?
- [ ] Source Inventory created?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Phase 3: EXECUTE
- [ ] Sources analyzed against objectives?
- [ ] Findings tagged to specific objectives?
- [ ] Raw findings documented by source?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Phase 4: SYNTHESIZE
- [ ] Findings merged across sources?
- [ ] Organized by objective?
- [ ] Key quotes and data points extracted?
- [ ] Citations/source links included?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

#### Phase 5: VALIDATE
- [ ] Each objective assessed (Met/Partial/Gap)?
- [ ] Coverage score calculated?
- [ ] Gaps identified for iteration?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

### Step 6: ReportCompiler Execution Check

**If ReportCompiler was used:**

- [ ] Outline provided/created?
- [ ] Sources gathered systematically?
- [ ] Scores extracted accurately (if scorecard)?
- [ ] Sections synthesized from multiple sources?
- [ ] Recommendations generated from findings?
- [ ] Visual suggestions appropriate?

**Evidence found:**
```
[What was actually done vs. prescribed]
```

### Step 7: Verify Calculations

**For any numerical results, spot-check calculations:**

```
Calculation: [Description]

Inputs:
- [Input 1]: [Value]
- [Input 2]: [Value]

Formula: [Formula used]

Claimed Result: [Value]

Verification:
- Manual calculation: [Result]
- Match: [Yes/No/Close]
- If discrepancy: [Explanation]
```

**Common calculations to verify:**
- Percentages and proportions
- Means, medians, standard deviations
- Effect sizes and confidence intervals
- Aggregations and roll-ups
- Year-over-year or period comparisons

### Step 8: Check Intermediate Results

**Verify that intermediate results make sense:**

```
Intermediate Result: [Description]

Value: [Value]

Sanity Checks:
- [ ] Within reasonable bounds?
- [ ] Consistent with related quantities?
- [ ] Directionally correct?
- [ ] Order of magnitude sensible?

Red Flags:
- [ ] Values outside possible range
- [ ] 100% or 0% where neither expected
- [ ] Negative values where impossible
- [ ] Implausible outliers
- [ ] Perfect correlations
```

### Step 9: Assess Execution Quality

**Overall execution assessment:**

```
Execution Quality Assessment

Skill: [Name]
Workflow Compliance: [Full/Partial/Minimal/None]

Steps Followed: [N of M]
Steps Skipped: [List]
Steps Deviated: [List]

Outputs Produced: [N of M]
Outputs Missing: [List]

Guardrails Met: [N of M]
Guardrails Violated: [List]

Calculations Verified: [N of M checked]
Calculation Errors: [List]

Overall: [Excellent/Good/Acceptable/Poor/Unacceptable]
```

---

## Output Template

```markdown
## Execution Review Report

### Analysis Reviewed
[Brief description]

---

### Skill Compliance Summary

| Skill | Workflow | Compliance | Steps Done | Steps Skipped | Guardrails Met |
|-------|----------|------------|------------|---------------|----------------|
| [Skill1] | [WF1] | [%] | [N/M] | [List] | [N/M] |
| [Skill2] | [WF2] | [%] | [N/M] | [List] | [N/M] |

---

### Detailed Compliance Checks

#### [Skill 1]: [Workflow Name]

**Prescribed Steps:**
1. [Step 1] - [Done/Skipped/Deviated]
2. [Step 2] - [Done/Skipped/Deviated]
3. [Step 3] - [Done/Skipped/Deviated]

**Gaps Identified:**
- [Gap 1]: [Description and impact]
- [Gap 2]: [Description and impact]

**Deviations:**
- [Deviation 1]: [What was done differently and why it matters]

#### [Skill 2]: [Workflow Name]
...

---

### Calculation Verification

| Calculation | Claimed | Verified | Match |
|-------------|---------|----------|-------|
| [Calc 1] | [Value] | [Value] | [Y/N] |
| [Calc 2] | [Value] | [Value] | [Y/N] |

**Discrepancies:**
- [Discrepancy 1]: [Explanation]

---

### Intermediate Results Check

| Result | Value | Sensible | Concerns |
|--------|-------|----------|----------|
| [Result 1] | [Value] | [Y/N] | [Concern] |
| [Result 2] | [Value] | [Y/N] | [Concern] |

---

### Execution Issues

#### Critical (Invalidates Results)
1. [Issue]: [Description]

#### Important (May Bias Results)
1. [Issue]: [Description]

#### Minor (Reduces Rigor)
1. [Issue]: [Description]

---

### Verdict

**Overall Execution Quality:** [Excellent/Good/Acceptable/Poor/Unacceptable]

**Key Execution Gaps:**
1. [Gap 1]
2. [Gap 2]

**Remediation Required:**
- [ ] [Action 1]
- [ ] [Action 2]
```

---

## Execution Red Flags

### DataAnalysis Red Flags
- No QA phase documented
- ETL not validated against source
- Missing data not addressed
- Calculations not reproducible

### CausalInference Red Flags
- DAG presented without explanation
- No domain expert involved in DAG
- Adjustment set not justified
- No sensitivity analysis
- Causal claims without identification

### BookOfWhy Red Flags
- Rung 2 claims from Rung 1 evidence
- Conditioning on mediator or collider
- Counterfactual claims without SCM
- "Causes" language without causal analysis

### Research Red Flags
- No objective definition
- Sources not documented
- No synthesis, just concatenation
- No validation of coverage

### General Red Flags
- Steps claimed but no evidence
- Outputs missing
- Calculations can't be reproduced
- Intermediate results implausible
