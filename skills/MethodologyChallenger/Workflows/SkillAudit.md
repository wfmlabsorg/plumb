# SkillAudit Workflow

Identify and examine which PLUMB skills were used in an analysis.

---

## Purpose

Before challenging anything, establish exactly what methodologies were employed by identifying which PLUMB skills were invoked and reading their documentation to understand the intended process.

---

## Input
- Analysis document or notebook
- Optional: Session transcript or conversation history
- Optional: List of files in project directory

## Output
- List of skills identified
- Summary of each skill's framework (from SKILL.md)
- Relevant workflows for each skill
- Methodology summary

---

## Procedure

### Step 1: Scan for Skill Indicators

**Look for explicit skill invocations:**
- Slash commands: `/analyze`, `/research`, etc.
- Skill references in text: "Using the CausalInference skill..."
- Tool names mentioned: "BuildDAG", "ETL", etc.

**Look for methodology indicators:**
| If analysis mentions... | Likely skill |
|------------------------|--------------|
| DAG, causal graph, confounders | CausalInference |
| Ladder of Causation, rungs, do-calculus | BookOfWhy |
| ETL, data pipeline, QA checks | DataAnalysis |
| Sources, objectives, synthesis | Research |
| Report compilation, sections, deliverable | ReportCompiler |
| Calibrated estimates, value of information | MeasureAnything |

**Look for output artifacts:**
| Artifact type | Likely skill |
|---------------|--------------|
| Mermaid DAG diagram | CausalInference |
| source_manifest.json, etl_log.json | DataAnalysis |
| research/[project]/brief.md | Research |
| [client]-wfm-report-draft.md | ReportCompiler |

### Step 2: Read Each Skill's Documentation

**For each skill identified, read:**

1. **SKILL.md** - Understand the skill's purpose and framework
   ```
   Path: ~/.claude/skills/[SkillName]/SKILL.md
   ```

2. **Relevant Workflows** - Understand prescribed processes
   ```
   Path: ~/.claude/skills/[SkillName]/Workflows/[WorkflowName].md
   ```

**Document for each skill:**
```
Skill: [Name]
Path: ~/.claude/skills/[Name]/SKILL.md

Purpose: [From SKILL.md]

Key Concepts:
- [Concept 1]
- [Concept 2]
- [Concept 3]

Workflows Relevant to This Analysis:
1. [Workflow Name] - [Path]
   - Purpose: [What it prescribes]
   - Key steps: [List]
2. [Workflow Name] - ...

Guardrails/Requirements:
- [Requirement 1]
- [Requirement 2]
```

### Step 3: Map Analysis Components to Skills

**Create a mapping of what the analysis contains:**

```
Analysis Component → Skill → Workflow
─────────────────────────────────────
[Component 1] → [Skill A] → [Workflow A1]
[Component 2] → [Skill A] → [Workflow A2]
[Component 3] → [Skill B] → [Workflow B1]
...
```

**Example:**
```
Data transformation     → DataAnalysis → ETL
Causal diagram          → CausalInference → BuildDAG
Effect estimation       → CausalInference → EstimateEffect
Counterfactual claim    → BookOfWhy → CounterfactualQuery
Final report            → ReportCompiler → CompileReport
```

### Step 4: Identify the Question Chain

**Trace the analytical question through skills:**

```
Original Question: [What was asked]
                     ↓
Decomposed Into:
  Q1: [Sub-question] → Answered by [Skill/Workflow]
  Q2: [Sub-question] → Answered by [Skill/Workflow]
  Q3: [Sub-question] → Answered by [Skill/Workflow]
                     ↓
Final Answer: [Conclusion reached]
```

### Step 5: Document Data Flow

**Trace how data moved through the analysis:**

```
Source Data
     ↓
[Skill A: Transform/Clean]
     ↓
Intermediate Data
     ↓
[Skill B: Analyze]
     ↓
Findings
     ↓
[Skill C: Synthesize]
     ↓
Report/Conclusions
```

### Step 6: Identify Skill Dependencies

**Note which skills depended on others:**

```
CausalInference
├── Depends on: BookOfWhy (conceptual framework)
├── Depends on: DataAnalysis (clean data input)
└── Used by: ReportCompiler (findings to report)

DataAnalysis
├── No dependencies
└── Used by: CausalInference, ReportCompiler
```

### Step 7: Summarize Methodology

**Create a narrative summary:**

```
## Methodology Summary

This analysis used [N] PLUMB skills to answer the question: "[Question]"

**DataAnalysis** was used to:
- [What it did]
- Following the [Workflow] workflow

**CausalInference** was used to:
- [What it did]
- Following the [Workflow] workflow
- Leveraging concepts from BookOfWhy

**ReportCompiler** was used to:
- [What it did]
- Following the [Workflow] workflow

The overall analytical approach was:
1. [Step 1]
2. [Step 2]
3. [Step 3]
```

---

## Output Template

```markdown
## Skill Audit Report

### Analysis Reviewed
[Brief description of the analysis]

### Skills Identified

#### 1. [Skill Name]
- **Path:** `~/.claude/skills/[Name]/SKILL.md`
- **Purpose:** [From SKILL.md]
- **How Used:** [Description]
- **Workflows Applied:**
  - [Workflow 1] - [Purpose]
  - [Workflow 2] - [Purpose]

#### 2. [Skill Name]
...

### Analysis-to-Skill Mapping

| Analysis Component | Skill | Workflow | Output |
|--------------------|-------|----------|--------|
| [Component] | [Skill] | [Workflow] | [Output] |
| ... | ... | ... | ... |

### Question Chain

Original Question: [Question]

Sub-questions:
1. [Q1] → [Skill/Workflow] → [Answer]
2. [Q2] → [Skill/Workflow] → [Answer]
3. [Q3] → [Skill/Workflow] → [Answer]

### Data Flow

```
[Source] → [Skill A] → [Intermediate] → [Skill B] → [Output]
```

### Methodology Summary

[Narrative description of overall approach]

### Ready for Review

Skills to challenge:
- [ ] [Skill 1] - Read SKILL.md and Workflows
- [ ] [Skill 2] - Read SKILL.md and Workflows
- [ ] [Skill 3] - Read SKILL.md and Workflows
```

---

## Next Steps

After completing the Skill Audit:
1. Use **ApproachChallenge** to question methodology choices
2. Use **AssumptionAudit** to surface assumptions from each skill
3. Use **ExecutionReview** to check workflow compliance
4. Use **ConclusionWarrant** to evaluate claim validity

Or proceed directly to **FullReview** which incorporates all phases.
