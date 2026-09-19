# FullReview Workflow

Comprehensive adversarial review of a complete analysis.

---

## Purpose

Perform a thorough skeptical review of an analysis before it goes to external stakeholders, examining methodology choice, assumption validity, execution correctness, and conclusion warrant.

---

## Input
- Analysis to review (document, notebook, report)
- Optional: List of skills used (if known)
- Optional: Specific concerns to focus on

## Output
- Comprehensive Methodology Challenge Report
- Prioritized list of issues (Critical/Important/Minor)
- Questions requiring explicit justification
- Skill compliance assessment
- Verdict and confidence assessment

---

## Procedure

### Step 1: Gather the Analysis

**Collect all relevant materials:**
1. The final report/analysis document
2. Any supporting notebooks or code
3. Source data descriptions
4. Any intermediate outputs
5. The original question being answered

**Document:**
```
Analysis Materials:
- Primary Document: [path]
- Supporting Files: [list]
- Data Sources: [list]
- Original Question: [statement]
```

### Step 2: Execute Skill Audit

**Run the SkillAudit workflow to identify:**
- Which PLUMB skills were used
- Read each skill's SKILL.md
- Understand the intended methodology for each

**Document:**
```
Skills Identified:
1. [Skill Name] - [How used]
   - Read: [SKILL.md path]
   - Relevant workflows: [list]
2. ...
```

### Step 3: Challenge Approach (Phase 2)

**For each skill used, challenge the methodology choice:**

#### Question Classification
- What type of question is being answered?
  - Descriptive: "What is X?"
  - Predictive: "What will X be?"
  - Causal: "Does X cause Y?" / "What would happen if X?"

- Does the methodology match the question type?
  - Descriptive questions → DataAnalysis appropriate
  - Predictive questions → Need forecasting methods
  - Causal questions → Need CausalInference + BookOfWhy

#### Alternative Approaches
For each skill used, ask:
1. What alternative methodologies could answer this question?
2. Why was this approach chosen over alternatives?
3. What are the trade-offs?
4. Would an alternative approach be more robust?

**Challenge Template:**
```
Methodology: [Name]
Question Type: [Descriptive/Predictive/Causal]
Match: [Appropriate/Questionable/Mismatch]

Alternatives Considered:
1. [Alternative A]
   - Argument FOR: [Why it might be better]
   - Why not used: [Justification needed]
2. [Alternative B]
   - Argument FOR: ...
   - Why not used: ...

Steel-Man Case for Best Alternative:
[Make the strongest argument for using a different approach]
```

### Step 4: Audit Assumptions (Phase 3)

**For each methodology used, list required assumptions:**

#### From DataAnalysis
- Data quality assumptions (completeness, accuracy)
- Sample representativeness
- Temporal relevance
- Metric definition consistency

#### From CausalInference
- DAG correctly specified (no missing arrows)
- No unmeasured confounders (or identified)
- Causal effect identifiable
- Estimation method assumptions (overlap, SUTVA)

#### From BookOfWhy
- Rung classification correct
- Structural model appropriate
- Counterfactual assumptions valid

#### From Research
- Source credibility
- Synthesis completeness
- No selection bias in sources

**For each assumption, assess:**
```
| Assumption | Stated? | Evidence For | Evidence Against | Status |
|------------|---------|--------------|------------------|--------|
| [A1]       | [Y/N]   | [E+]         | [E-]             | [OK/?/CONCERN] |
```

### Step 5: Review Execution (Phase 4)

**Compare intended process (from skill workflows) to actual execution:**

For each skill used:
1. Read the relevant workflow(s)
2. List the prescribed steps
3. Check if each step was followed
4. Note any deviations or gaps

**Execution Checklist Template:**

#### DataAnalysis Execution
- [ ] INGEST: Source data profiled and cataloged
- [ ] ETL: Transformation documented and validated
- [ ] ANALYZE: Analysis method appropriate for data
- [ ] QA: Quality checks performed
- [ ] REPORT: Results accurately represented

#### CausalInference Execution
- [ ] Query classified to correct rung
- [ ] DAG built with domain expert input
- [ ] Identification strategy documented
- [ ] Estimation method matches DAG
- [ ] Sensitivity analysis performed
- [ ] Limitations documented

#### BookOfWhy Execution
- [ ] Ladder of Causation applied correctly
- [ ] Confounders, mediators, colliders identified
- [ ] d-separation rules followed
- [ ] Causal language used appropriately

#### Research Execution
- [ ] Objectives clearly defined
- [ ] Sources inventoried systematically
- [ ] Findings tagged to objectives
- [ ] Synthesis complete
- [ ] Gaps identified

### Step 6: Challenge Conclusions (Phase 5)

**For each major claim in the analysis:**

```
Claim: "[Statement]"

Evidence Presented:
- [E1]
- [E2]
- [E3]

Claim Strength: [Strong/Moderate/Weak/Hedged]
Evidence Strength: [Strong/Moderate/Weak]
Match: [Appropriate/Over-claimed/Under-claimed]

Would a skeptical expert accept this claim?
- [ ] Yes, evidence is sufficient
- [ ] Possibly, but with caveats: [list]
- [ ] No, because: [reason]

What would make this claim stronger?
- [Action]
```

### Step 7: Apply General Statistical Challenges

**Regardless of specific skills, check:**

#### Sample Issues
- Is sample size adequate for the claims made?
- Was power analysis performed (if applicable)?
- Is the sample representative or selected?
- Are there survivorship/selection biases?

#### Assumption Violations
- Were distributional assumptions tested?
- Are independence assumptions reasonable?
- Were outliers handled appropriately?

#### Multiple Testing / p-Hacking
- How many comparisons were made?
- Was correction applied?
- Is there risk of HARKing?

#### Effect Interpretation
- Is statistical significance conflated with practical significance?
- Are effect sizes reported and interpreted?
- Are confidence intervals provided?

#### Model Concerns
- Is there overfitting risk?
- Was out-of-sample validation done?
- Are predictions within training domain?

### Step 8: Synthesize Findings

**Categorize all identified issues:**

#### Critical (Must Address)
Issues that could invalidate the analysis:
- Fundamental methodology mismatch
- Violated core assumptions
- Incorrect calculations
- Unsupported claims

#### Important (Should Address)
Issues that weaken the analysis:
- Missing sensitivity analyses
- Undisclosed limitations
- Alternative explanations not considered
- Partial compliance with skill workflows

#### Minor (Consider Addressing)
Issues that reduce polish:
- Unclear language
- Missing visualizations
- Incomplete documentation

### Step 9: Generate Questions

**List questions the analyst must answer:**

These are not rhetorical—they require explicit justification:
1. "[Question about methodology choice]"
2. "[Question about assumption validity]"
3. "[Question about conclusion strength]"
4. ...

### Step 10: Render Verdict

**Overall Assessment:**

```
VERDICT: [PASS / PASS WITH RESERVATIONS / NEEDS REVISION / MAJOR CONCERNS]

Confidence Assessment:
- Methodology appropriateness: [High/Medium/Low] - [Reason]
- Execution correctness: [High/Medium/Low] - [Reason]
- Conclusion warrant: [High/Medium/Low] - [Reason]

Recommended Actions Before Finalization:
1. [Critical action]
2. [Important action]
3. ...
```

---

## Output Template

See SKILL.md for the full Methodology Challenge Report format.

---

## Quality Standards

The review is complete when:
- [ ] All skills used have been identified and their SKILL.md read
- [ ] Relevant workflows from each skill have been consulted
- [ ] Methodology choice has been challenged with steel-manned alternatives
- [ ] All assumptions have been inventoried and assessed
- [ ] Execution has been compared to prescribed workflow steps
- [ ] Each major claim has been evaluated for warrant
- [ ] General statistical challenges have been applied
- [ ] Issues are categorized by severity
- [ ] Questions requiring justification are specific and answerable
- [ ] Verdict is calibrated to the severity of issues found
