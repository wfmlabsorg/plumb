---
name: ReportCompiler
description: Compile consulting reports from multiple sources including Excel scorecards, Word documents, PowerPoints, PDFs, and project files. USE WHEN user mentions compile report, build report, create report, maturity assessment, consulting deliverable, final report, draft report, synthesize findings, gather sources, report compilation, assessment report, WFM report, client deliverable.
---

# ReportCompiler Skill

Orchestrate the compilation of consulting reports from distributed sources.

> **Purpose:** Transform scattered notes, documents, and assessments into polished consulting deliverables.

---

## The Compilation Process

```
YOUR OUTLINE                    SOURCES                         OUTPUT
─────────────                   ───────                         ──────

┌─────────────┐                ┌─────────────┐
│ 10 Areas    │                │ Excel       │──┐
│ to Cover    │                │ Scorecard   │  │
├─────────────┤                ├─────────────┤  │    ┌─────────────────┐
│ Key Docs    │───────────────►│ Word        │──┼───►│ DRAFT REPORT    │
│ to Include  │                │ Reports     │  │    │                 │
├─────────────┤                ├─────────────┤  │    │ • Exec Summary  │
│ Perspectives│                │ PPT Decks   │──┤    │ • Assessments   │
│ & Angles    │                ├─────────────┤  │    │ • Scores        │
└─────────────┘                │ PDFs        │──┤    │ • Findings      │
                               ├─────────────┤  │    │ • Recommendations│
                               │ Project     │──┘    │ • Visual Notes  │
                               │ Files       │       └─────────────────┘
                               └─────────────┘
```

---

## Workflow Routing

| User Intent | Workflow |
|-------------|----------|
| Compile a full report | Workflows/CompileReport.md |
| Gather sources for a report | Workflows/GatherSources.md |
| Extract scores from scorecard | Workflows/ExtractScores.md |
| Write a specific section | Workflows/SynthesizeSection.md |
| Generate recommendations | Workflows/GenerateRecommendations.md |
| Prepare slide concepts | Workflows/PrepareSlides.md |

---

## Quick Commands

```
report compile [outline.md]              → Full report compilation
report gather [outline.md]               → Gather sources only
report scores [scorecard.xlsx]           → Extract maturity scores
report section [topic] [sources...]      → Write single section
report recommend [findings.md]           → Generate recommendations
report slides [report.md]                → Convert to slide concepts
```

---

## Dependencies

This skill requires:
- **DocReader skill** — For reading Excel, Word, PPT, PDF

## Agent Teams Integration

When ReportCompiler runs as part of a BlackBeltSuite Agent Teams pipeline:
- It acts as the **Report Agent** teammate, consuming outputs from all upstream agents
- It reads structured analysis outputs from `{working_dir}/analysis/` (findings.json, phase outputs)
- It reads causal findings from `{working_dir}/causal/` if causal escalation occurred
- It reads `pipeline-state.json` for context on what workflow ran and which skills were invoked

### BlackBeltSuite Output Ingestion

| Source Directory | Contents | How to Use |
|------------------|----------|------------|
| `data-prep/` | source_manifest.json, qa_report.md | Data methodology section |
| `analysis/` | phase_1 through phase_8 .md files | Main findings sections |
| `analysis/findings.json` | Structured findings with effect sizes | Executive summary, tables |
| `causal/` | causal_findings.md, dag.mermaid | Causal analysis section (if present) |

### Compilation from Agent Teams Output

When compiling from Agent Teams output, automatically:
1. Read `pipeline-state.json` for workflow context and skills used
2. Ingest all phase output files from `analysis/`
3. Check for causal findings in `causal/`
4. Generate executive summary from findings.json
5. Include methodology section listing all skills invoked
6. Ensure every finding includes CX/COST/EX outcome mapping
7. Add causal caveats per BlackBeltSuite requirements

See: `~/.claude/skills/BlackBeltSuite/AgentTeamsTemplate.md`

---

## Input Format

The outline should be a markdown file structured like:

```markdown
# Report Outline: [Client Name] WFM Maturity Assessment

## Engagement Context
- Client: [Name]
- Scope: [What's being assessed]
- Date Range: [Assessment period]

## Key Documents
- Scorecard: [path to Excel]
- Interim Reports: [paths]
- Client Materials: [paths to PPTs, PDFs]

## Areas to Cover

### 1. [Area Name]
- Key questions to address
- Specific findings to highlight
- Documents to reference

### 2. [Area Name]
...

## Perspectives & Angles
- [Overall narrative/theme]
- [Key message for client]
- [Strategic recommendations to emphasize]
```

---

## Templates Available

| Template | Purpose |
|----------|---------|
| WFMMaturityReport.md | Full report structure |
| ExecutiveSummary.md | Executive summary template |
| AssessmentSection.md | Per-section template |
| Recommendation.md | Recommendation template |
| SlideConceptTemplate.md | For slide output |

---

## Output Files

After compilation, the skill produces:
- `[client]-wfm-report-draft.md` — Full report in markdown
- `[client]-sources-used.md` — Inventory of sources referenced
- `[client]-visual-suggestions.md` — List of suggested visuals

---

## Native Office Output (Opus 4.6)

### PowerPoint Generation

With Opus 4.6's native Office integration, ReportCompiler can generate `.pptx` slide decks directly from analytical findings:

| Output | Format | Source |
|--------|--------|--------|
| Consulting report | `.md` | Primary — always generated |
| Slide deck | `.pptx` | Generated from report sections + findings |
| Data appendix | `.xlsx` | Formatted tables, charts, control charts |
| Visual notes | `.md` | Suggested visualizations for manual creation |

### Slide Deck Structure

When generating `.pptx` from BlackBeltSuite output:

```
Slide 1:  Title slide (client, engagement, date)
Slide 2:  Executive summary (key findings + verdict)
Slide 3:  Methodology overview (skills used, phases completed)
Slides 4-N: One slide per major finding (metric + visual + insight)
Slide N+1: Outcome impact summary (CX/COST/EX table)
Slide N+2: Recommendations (prioritized actions)
Slide N+3: Causal status + next steps
```

### Excel Data Appendix

When generating `.xlsx` from analytical outputs:
- **Sheet 1:** Summary metrics table with conditional formatting
- **Sheet 2:** Detailed findings with effect sizes and CIs
- **Sheet 3:** Variance decomposition / Shapley results
- **Sheet 4:** Control charts (if ProcessCapability was used)
- **Sheet 5:** Raw data reference

### Client Template Support

Store client-specific templates in `~/plumb/context/templates/`:
- `client-slide-template.pptx` — Brand-compliant slide deck
- `client-report-template.docx` — Brand-compliant report format

ReportCompiler applies the client template when available, falling back to a standard consulting template.
