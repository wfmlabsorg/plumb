---
name: DataAnalysis
description: End-to-end data analysis pipeline for consulting engagements. ETL complex source files, run parameterized Jupyter analysis, validate quality, and generate client-ready reports. USE WHEN user mentions analyze data, ETL, data pipeline, interval analysis, performance analysis, deviation analysis, consulting report, data quality, run analysis, generate report, statistical analysis.
---

# DataAnalysis Skill

End-to-end data analysis pipeline for consulting engagements: ETL complex source files, run parameterized analysis via Jupyter/Papermill, validate quality, and generate client-ready reports.

## Commands

### Full Pipeline
```bash
/analyze <source_dir> [options]
```

### Individual Phases
```bash
/analyze ingest <source_dir>           # Phase 1: Discover and catalog sources
/analyze etl [--template <name>]       # Phase 2: Transform data
/analyze run [--config <file>]         # Phase 3: Execute analysis
/analyze qa                            # Phase 4: Quality assurance
/analyze report [--template <name>]    # Phase 5: Generate report
```

## Options

| Option | Description | Example |
|--------|-------------|---------|
| `--type` | Analysis type | `deviation`, `trend`, `distribution` |
| `--metric` | Primary metric to analyze | `Actual_SL`, `AHT`, `Calls` |
| `--dimensions` | Grouping dimensions | `LOB,Date,Interval` |
| `--goals` | Target values by dimension | `"Concierge:0.90,*:0.80"` |
| `--output` | Output directory | `~/plumb/books/engagement/03-output` |
| `--template` | Specific template to use | `pivot_to_long`, `performance_analysis` |
| `--config` | YAML config file | `analysis_config.yaml` |

## Pipeline Phases

### Phase 1: INGEST
Discover and catalog source data.
- Scan directory for data files (xlsx, csv, json)
- Profile Excel structure (sheets, columns, pivot detection)
- Infer data types and schemas
- Output: `source_manifest.json`, `schema_report.md`

### Phase 2: ETL
Transform source data into analysis-ready format.
- Select appropriate ETL template based on source structure
- Configure parameterized notebook
- Execute via Papermill
- Validate transformation (row counts, nulls, joins)
- Output: `data_etl.csv`, `etl_log.json`

### Phase 3: ANALYZE
Run statistical analysis and generate insights.
- Configure analysis notebook from template + parameters
- Define thresholds and goals
- Execute via Papermill
- Extract structured findings
- Output: `analysis_output.ipynb`, `findings.json`, `visualizations/*.png`

### Phase 4: QA
Validate data integrity and analysis correctness.
- Check completeness (dates, dimensions, nulls)
- Validate ranges (metrics within bounds)
- Detect outliers
- Cross-validate against source
- Output: `qa_report.md`, `qa_flags.json`

### Phase 5: REPORT
Generate client-ready deliverable.
- Select report template
- Populate with findings, tables, visualizations
- Generate markdown (optionally convert to PDF)
- Output: `{project}_Analysis_Report.md`

## Available Templates

### ETL Templates
| Template | Use Case |
|----------|----------|
| `pivot_to_long` | Day-of-week or time pivoted data |
| `multi_sheet_merge` | Combine LOB/category sheets |
| `time_series_parse` | Interval/timestamp handling |
| `hierarchy_flatten` | Nested category structures |

### Analysis Templates
| Template | Use Case |
|----------|----------|
| `deviation_analysis` | Compare actuals vs goals |
| `trend_analysis` | Time-series patterns |
| `distribution_analysis` | Histograms, percentiles, outliers |
| `comparison_analysis` | A/B, before/after comparisons |
| `forecast_accuracy` | MAPE, bias detection |

### Report Templates
| Template | Use Case |
|----------|----------|
| `performance_analysis` | SL/metric performance report |
| `maturity_assessment` | Capability scoring |
| `gap_analysis` | Current vs target state |
| `executive_summary` | One-pager |

## Configuration File Format

```yaml
# analysis_config.yaml
project:
  name: "Blue Shield Interval Analysis"
  client: "Blue Shield of California"

source:
  directory: ~/plumb/books/sample-engagement/01-source/interval-data
  file_pattern: "*.xlsx"

etl:
  template: pivot_to_long
  parameters:
    days: [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday]
    metrics_per_day: 6
    interval_column: 1

analysis:
  type: deviation_analysis
  metric: Actual_SL
  dimensions: [LOB, Date, Interval]
  goals:
    default: 0.80
    overrides:
      Concierge: 0.90
      Designated: 0.90
  thresholds:
    significantly_above: 10
    slightly_above: 5
    within_range: 0
    slightly_below: -5
    significantly_below: -10
  special_rules:
    - condition: "goal == 0.90 AND actual > 0.995"
      override_category: "significantly_above"

qa:
  completeness:
    required_dimensions: [LOB]
    date_continuity: false
    no_null_metrics: [Actual_SL, Actual_Calls]
  ranges:
    Actual_SL: [0, 1]
    Actual_Calls: [0, null]

report:
  template: performance_analysis
  title: "Service Level Performance Analysis"
  include_sections:
    - executive_summary
    - methodology
    - results
    - recommendations
    - appendix

output:
  directory: ~/plumb/books/sample-engagement/03-output
  formats: [md]  # Options: md, pdf, docx
```

## Example Usage

### Quick Analysis
```bash
# Analyze interval data with default settings
/analyze ~/plumb/books/engagement/01-source/interval-data \
  --type deviation \
  --metric Actual_SL \
  --goals "*:0.80"
```

### Full Configuration
```bash
# Run with config file
/analyze --config ~/plumb/books/engagement/analysis_config.yaml
```

### Step-by-Step
```bash
# 1. Ingest and profile sources
/analyze ingest ~/plumb/books/engagement/01-source

# 2. Review manifest, then run ETL
/analyze etl --template pivot_to_long

# 3. Run analysis
/analyze run --type deviation --metric Actual_SL

# 4. Validate quality
/analyze qa

# 5. Generate report
/analyze report --template performance_analysis
```

## Dependencies

- JupyterLab (notebook environment)
- Papermill (parameterized execution)
- pandas, numpy (data manipulation)
- matplotlib, seaborn (visualization)
- openpyxl (Excel handling)
- PyYAML (config parsing)

## File Structure

```
~/.claude/skills/DataAnalysis/
├── SKILL.md
├── src/
│   ├── orchestrator.ts      # Main pipeline controller
│   ├── ingest.ts            # Phase 1: Source discovery
│   ├── etl.ts               # Phase 2: Data transformation
│   ├── analyze.ts           # Phase 3: Statistical analysis
│   ├── qa.ts                # Phase 4: Quality assurance
│   └── report.ts            # Phase 5: Report generation
├── templates/
│   ├── etl/
│   ├── analysis/
│   └── reports/
├── schemas/
│   └── analysis_config.schema.json
└── examples/
```

## Agent Teams Integration

When DataAnalysis runs as part of a BlackBeltSuite Agent Teams pipeline:
- **DataAnalysis handles Phases 1-4 only** (Ingest, ETL, Analyze, QA)
- **Phase 5 (Report) is delegated to ReportCompiler** — the dedicated report generation skill
- The DataPrep agent outputs structured files that downstream agents consume
- See: `~/.claude/skills/BlackBeltSuite/AgentTeamsTemplate.md`

### Boundary with ReportCompiler

| Responsibility | Owner |
|----------------|-------|
| Source discovery, profiling | DataAnalysis |
| ETL and data transformation | DataAnalysis |
| Statistical analysis execution | DataAnalysis |
| Quality assurance and validation | DataAnalysis |
| Report compilation and formatting | **ReportCompiler** |
| Slide deck generation | **ReportCompiler** |
| Visual suggestions | **ReportCompiler** |

When invoked standalone (not as part of Agent Teams), DataAnalysis still runs all 5 phases including reporting.

## PLUMB Instructions

When user invokes this skill:

1. **Parse command** - Determine phase(s) to run and parameters
2. **Load or create config** - Use provided config or build from options
3. **Execute phases sequentially** - Each phase validates before proceeding
4. **Report progress** - Update user at each phase completion
5. **Handle errors** - Log issues, allow phase retry

For the full pipeline, run all 5 phases. For individual phases, run only the specified phase (requires prior phases to have been completed).

Always save outputs to the configured output directory, defaulting to `./results/` if not specified.
