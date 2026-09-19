---
name: MethodologyChallenger
description: Adversarial review of analytical work. USE WHEN user mentions challenge analysis, review methodology, QA my work, check my approach, validate analysis, devil's advocate, pressure test, before I finalize, sanity check, challenge this, critique this, find holes, what am I missing, stress test.
dependencies:
  - BookOfWhy
  - CausalInference
  - DataAnalysis
  - Research
  - ReportCompiler
---

# MethodologyChallenger - Adversarial Analysis Review

**Purpose:** Provide rigorous peer review of analytical work by examining methodology, assumptions, execution, and conclusions.

> "The goal is to find weaknesses before external review. Every claim needs justification."

---

## Core Concept

This skill operates as a **skeptical peer reviewer** whose job is to find weaknesses before external review.

**Key Insight:** When other PLUMB skills (BookOfWhy, CausalInference, DataAnalysis, etc.) are used to produce an analysis, this challenger:

1. **Identifies** which skills were invoked
2. **Reads** each skill's SKILL.md and workflows to understand the methodology
3. **Challenges** whether the methodology was applied correctly
4. **Challenges** whether the methodology was appropriate for the question
5. **Challenges** whether conclusions are warranted by the evidence

**Important:** This skill does NOT take other PLUMB skills as authoritative—it examines them to understand what was *supposed* to happen, then challenges whether it *actually* happened correctly.

---

## Workflow Routing

| User Intent | Workflow |
|-------------|----------|
| Full adversarial review of analysis | `Workflows/FullReview.md` |
| Identify which skills were used | `Workflows/SkillAudit.md` |
| Challenge methodology choice | `Workflows/ApproachChallenge.md` |
| Surface and challenge assumptions | `Workflows/AssumptionAudit.md` |
| Check methodology execution | `Workflows/ExecutionReview.md` |
| Challenge conclusion validity | `Workflows/ConclusionWarrant.md` |
| Quick 5-question challenge | `Workflows/QuickChallenge.md` |

---

## The Challenge Protocol

### Phase 1: Skill Audit
Before challenging anything, establish what was done:
- **Check `pipeline-state.json`** in the project working directory — it contains the `skills_invoked` array listing every skill used in the pipeline run, plus task completion status and output file locations
- If no pipeline-state.json exists, identify skills from the analysis output manually
- Read each skill's SKILL.md to understand its framework
- Read relevant workflows to understand intended process
- Identify the question being answered
- Identify the data used
- Identify the conclusions drawn

### Phase 2: Question-Method Fit
Challenge whether the approach matches the question:
- Is this a descriptive, predictive, or causal question?
- Does the chosen methodology match the question type?
- What alternative approaches exist?
- Why were alternatives rejected?
- Is that rejection justified?

### Phase 3: Assumption Audit
Surface and challenge assumptions:
- What assumptions does this methodology require?
- Are these assumptions stated explicitly in the analysis?
- What evidence supports each assumption?
- What evidence contradicts each assumption?
- What happens if an assumption is violated?

### Phase 4: Execution Review
Check if the methodology was applied correctly:
- Per the skill's workflows, what steps should have been followed?
- Were those steps actually followed?
- Are calculations correct?
- Are statistical tests appropriate?
- Do intermediate results make sense?

### Phase 5: Conclusion Warrant
Challenge whether conclusions are supported:
- What claims are being made?
- What evidence supports each claim?
- Does the evidence strength match the claim strength?
- Are limitations adequately acknowledged?
- Would a skeptical expert accept these conclusions?

---

## Skill-Specific Challenge Modules

### When DataAnalysis Was Used

| Challenge | Question |
|-----------|----------|
| ETL Appropriateness | Was the ETL pipeline appropriate for this data structure? |
| Quality Checks | Were data quality checks performed and documented? |
| Representativeness | Is the sample representative of the population of interest? |
| Missing Data | Are there missing data issues? How were they handled? |
| Time Period | Is the time period appropriate for the question? |
| Metric Definitions | Are metrics defined consistently with business intent? |

### When CausalInference Was Used

| Challenge | Question |
|-----------|----------|
| DAG Specification | Is the causal graph correctly specified? |
| Unmeasured Confounders | Are there plausible unmeasured confounders? |
| Identification | Is the causal effect identified (backdoor/frontdoor criteria)? |
| Estimation Approach | Is the estimation approach appropriate for the data? |
| Counterfactual Claims | Are counterfactual claims warranted by the analysis? |
| Ladder of Causation | Do claims match the appropriate "rung" on the Ladder? |

### When BookOfWhy Was Used

| Challenge | Question |
|-----------|----------|
| Rung Classification | Is the Ladder of Causation being applied correctly? |
| Rung Violations | Are Rung 2 claims being made from Rung 1 evidence? |
| Confounding | Is confounding adequately addressed? |
| Causation vs Correlation | Is the distinction maintained in language? |
| SCM Requirements | If counterfactuals claimed, is an SCM specified? |

### When ReportCompiler Was Used

| Challenge | Question |
|-----------|----------|
| Analysis-Conclusion Alignment | Do conclusions align with the analysis? |
| Visualization Accuracy | Are visualizations accurate representations? |
| Limitation Disclosure | Are limitations disclosed? |
| Language Calibration | Is language calibrated to evidence strength? |
| Cherry-Picking | Are findings selectively reported? |

### When Research Was Used

| Challenge | Question |
|-----------|----------|
| Source Credibility | Are sources credible and authoritative? |
| Synthesis Quality | Is evidence synthesized correctly? |
| Conflicting Evidence | Are conflicting findings acknowledged? |
| Comprehensiveness | Is the literature review comprehensive? |
| Recency | Are sources current for the domain? |

### General Statistical Challenges (Apply Broadly)

| Category | Challenges |
|----------|------------|
| Sample | Sample size adequacy, power analysis, representativeness |
| Assumptions | Normality, homoskedasticity, independence violations |
| Multiple Testing | Multiple comparisons, p-hacking risk, HARKing |
| Effect Interpretation | Effect size vs statistical significance, practical significance |
| Uncertainty | Confidence interval interpretation, propagated uncertainty |
| Model Fit | Overfitting risk, out-of-sample validation |

---

## Output Format

The skill produces a structured challenge report:

```markdown
## Methodology Challenge Report

### Analysis Reviewed
[Description of what was analyzed]

### Skills Invoked
[List of PLUMB skills used, with links to their SKILL.md files read]

### Methodology Summary
[What approach was taken, per the skills' frameworks]

---

### Challenges Identified

#### Critical (Must Address Before Finalizing)
1. **[Challenge Title]**
   - What's wrong: [Description]
   - Why it matters: [Risk if ignored]
   - How to fix: [Suggested resolution]
   - Relevant skill guidance: [Reference to skill workflow that applies]

#### Important (Should Address)
[Same format]

#### Minor (Consider Addressing)
[Abbreviated format]

---

### Questions Requiring Explicit Justification
1. [Question that the analyst must answer]
2. [Question]
3. [Question]

---

### Assumption Inventory
| Assumption | Required By | Evidence For | Evidence Against | Status |
|------------|-------------|--------------|------------------|--------|
| [A1] | [Skill/Method] | [Evidence] | [Evidence] | [OK/CONCERN/?] |

---

### Skill Compliance Check
| Skill | Key Workflow | Followed? | Gaps Identified |
|-------|--------------|-----------|-----------------|
| [Skill] | [Workflow] | [Y/N/Partial] | [Description] |

---

### Verdict
[PASS / PASS WITH RESERVATIONS / NEEDS REVISION / MAJOR CONCERNS]

**Confidence Assessment:**
- Methodology appropriateness: [High/Medium/Low]
- Execution correctness: [High/Medium/Low]
- Conclusion warrant: [High/Medium/Low]

---

### Recommended Actions Before Finalization
1. [Action]
2. [Action]
```

---

## Challenger Principles

These principles guide the adversarial review:

### 1. Guilty Until Proven Innocent
The default stance is skepticism. Every claim needs justification.

### 2. Skills Are Guidance, Not Gospel
Read skills to understand frameworks, but challenge whether the framework was appropriate AND whether it was followed correctly.

### 3. Steel-Man Alternatives
Don't just note that alternatives exist—actively argue FOR them. Make the analyst defend their choice.

### 4. Calibrate Claims to Evidence
Strong claims require strong evidence. Flag any mismatch.

### 5. Surface the Implicit
Many analyses have unstated assumptions. Make them explicit so they can be evaluated.

### 6. Find the Weakest Link
An analysis is only as strong as its weakest component. Identify what would break the argument.

### 7. Anticipate Objections
What would a skeptical expert ask? What would a hostile reviewer challenge? Surface those before they do.

### 8. Not a Replacement for Peer Review
This adds rigor but doesn't replace human expert review.

---

## Examples

### Example 1: Full Review After Analysis
```
User: "Challenge my CEO complaint analysis before I send it to the client"
→ Invokes FullReview workflow
→ Identifies DataAnalysis + CausalInference were used
→ Reads those skills' SKILL.md and relevant workflows
→ Produces comprehensive challenge report
```

### Example 2: Mid-Analysis Check
```
User: "I'm using CausalInference to estimate treatment effects—challenge my approach"
→ Invokes ApproachChallenge workflow
→ Reads CausalInference/SKILL.md and BookOfWhy context
→ Challenges whether causal inference is appropriate
→ Challenges DAG specification and identification strategy
```

### Example 3: Specific Concern
```
User: "I have an R-squared of 0.15 but I'm making strong causal claims—is this defensible?"
→ Invokes ConclusionWarrant workflow
→ Evaluates claim strength vs evidence strength
→ Distinguishes explanatory power from causal identification
```

### Example 4: Assumption Focus
```
User: "What assumptions am I making in this analysis that I haven't justified?"
→ Invokes AssumptionAudit workflow
→ Identifies all skills used
→ Lists assumptions required by each methodology
→ Checks which are stated vs unstated
```

### Example 5: Quick Check
```
User: "Quick challenge—what are the top 5 holes in this analysis?"
→ Invokes QuickChallenge workflow
→ Rapid assessment across all phases
→ Returns prioritized list of 5 concerns
```

### Example 6: Skill Compliance
```
User: "I used BookOfWhy and DataAnalysis for this—did I apply them correctly?"
→ Invokes SkillAudit + ExecutionReview workflows
→ Reads both skills' workflows
→ Compares intended process to actual process
→ Reports compliance gaps
```

---

## Integration Notes

- This skill should **READ** other skills (BookOfWhy, CausalInference, DataAnalysis, etc.) to understand their frameworks
- It should **NOT** modify those skills or their outputs
- It should **REFERENCE** specific workflows from other skills when identifying compliance gaps
- It should be invocable at any point in the analysis process (planning, mid-analysis, pre-finalization)
- Output should be saved to the project's working directory for reference

---

## Skills to Read During Review

When reviewing an analysis, read the relevant skill documentation:

| Skill | Path | When to Read |
|-------|------|--------------|
| BookOfWhy | `~/.claude/skills/BookOfWhy/SKILL.md` | Any causal claims |
| CausalInference | `~/.claude/skills/CausalInference/SKILL.md` | Causal effect estimation |
| DataAnalysis | `~/.claude/skills/DataAnalysis/SKILL.md` | Data processing/analysis |
| Research | `~/.claude/skills/Research/SKILL.md` | Literature/source synthesis |
| ReportCompiler | `~/.claude/skills/ReportCompiler/SKILL.md` | Final report generation |
| MeasureAnything | `~/.claude/skills/MeasureAnything/SKILL.md` | Measurement/estimation |

Also read relevant workflow files from each skill to understand the intended process.
