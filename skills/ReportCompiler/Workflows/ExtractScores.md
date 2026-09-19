# Extract Scores Workflow

## Purpose
Pull maturity scores from Excel scorecard into structured format.

## Process

### Step 1: Read Scorecard

```bash
doc excel [scorecard-path]
```

### Step 2: Identify Score Structure

Look for:
- Assessment areas (rows or columns)
- Score values (typically 1-5 scale)
- Weighting if present
- Sub-scores or dimensions
- Score date/version

Common scorecard layouts:
- Rows = assessment areas, columns = dimensions
- Single score per area
- Multiple sub-scores that roll up

### Step 3: Extract and Structure

Create structured score data:

```json
{
  "client": "[Client Name]",
  "assessment_date": "2026-01-05",
  "overall_score": 2.4,
  "overall_level": "Developing",
  "areas": [
    {
      "name": "Capacity Planning",
      "score": 2.5,
      "max_score": 5.0,
      "level": "Developing",
      "sub_scores": {
        "Forecasting": 2.3,
        "Scheduling": 2.7,
        "Real-time": 2.5
      },
      "notes": "Key gap in variance analysis"
    },
    {
      "name": "Technology",
      "score": 2.3,
      "max_score": 5.0,
      "level": "Developing",
      "sub_scores": {
        "Core Systems": 2.5,
        "Integration": 2.0,
        "Automation": 2.4
      },
      "notes": "Fragmented landscape"
    }
  ],
  "highest_scoring": {
    "area": "WFM Talent",
    "score": 2.7
  },
  "lowest_scoring": {
    "area": "Process",
    "score": 2.1
  }
}
```

### Step 4: Generate Score Summary

Create markdown summary for report insertion:

```markdown
## Maturity Assessment Summary

**Overall Score: 2.4 / 5.0 (Level 2: Developing)**

[VISUAL: Overall score gauge]

### Scores by Area

| Assessment Area | Score | Level | Priority |
|-----------------|-------|-------|----------|
| Capacity Planning | 2.5 | Developing | Medium |
| Technology | 2.3 | Developing | High |
| Process | 2.1 | Developing | High |
| Workforce Stability | 2.4 | Developing | High |
| WFM Talent | 2.7 | Developing | Medium |
| Employee Experience | 2.3 | Developing | Medium |
| Governance | 2.5 | Developing | Low |

**Strongest Area:** WFM Talent (2.7)
**Priority Gap:** Process (2.1)

[VISUAL: Radar chart showing all areas]

### Score Distribution

| Level | Count | Areas |
|-------|-------|-------|
| Initial (1.0-1.4) | 0 | — |
| Developing (1.5-2.4) | 5 | Technology, Process, Workforce, Employee Exp, Governance |
| Defined (2.5-3.4) | 2 | Capacity Planning, WFM Talent |
| Managed (3.5-4.4) | 0 | — |
| Optimized (4.5-5.0) | 0 | — |
```

## Level Definitions

| Score Range | Level | Description |
|-------------|-------|-------------|
| 1.0 - 1.4 | Initial | Ad hoc, reactive, no formal process |
| 1.5 - 2.4 | Developing | Basic process, inconsistent execution |
| 2.5 - 3.4 | Defined | Documented, measured, standardized |
| 3.5 - 4.4 | Managed | Data-driven, continuous improvement |
| 4.5 - 5.0 | Optimized | Predictive, innovative, leading |

## Output Files

| File | Format | Purpose |
|------|--------|---------|
| `scores.json` | JSON | Structured data for processing |
| `score-summary.md` | Markdown | Ready for report insertion |

## Validation Checks

- [ ] All scores within 1.0-5.0 range
- [ ] Overall score matches area average (if weighted, verify formula)
- [ ] No missing areas
- [ ] Score date is current
- [ ] Level assignments match score ranges
