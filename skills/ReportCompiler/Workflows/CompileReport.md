# Compile Report Workflow

## Purpose
Full orchestration of report compilation from outline to draft.

## Inputs Required
- Outline file (markdown) with areas to cover and document pointers
- Access to source documents (via DocReader skill)

## Process

### Phase 1: Parse Outline

1. Read the outline file
2. Extract:
   - Client/engagement context
   - List of key documents with paths
   - Areas to cover with specific questions
   - Overall perspectives/themes

```bash
# Read the outline
Read [outline-path]
```

### Phase 2: Gather Sources

1. **Documents** (via DocReader)
   ```bash
   # Read scorecard
   doc excel [scorecard-path]

   # Read Word reports
   doc word [report-path]

   # Read PPT decks
   doc ppt [deck-path]

   # Read PDFs
   doc pdf [pdf-path]

   # Scan for all docs in a directory
   doc scan [directory-path]
   ```

2. **Create source inventory**
   - List all gathered content
   - Map content to outline areas
   - Flag gaps (areas with no supporting material)

### Phase 3: Extract Scores

1. Use ExtractScores workflow on scorecard
2. Parse all assessment scores
3. Calculate overall maturity score
4. Identify highest/lowest scoring areas
5. Create score summary table

### Phase 4: Synthesize Sections

For each area in outline:
1. Gather relevant source content
2. Apply AssessmentSection template
3. Write narrative based on evidence
4. Insert specific findings with citations
5. Add visual suggestions
6. Flag areas needing more input

### Phase 5: Generate Recommendations

1. Review all findings across sections
2. Identify patterns and root causes
3. Apply Recommendation template
4. Prioritize into tiers
5. Map dependencies
6. Create implementation sequence

### Phase 6: Assemble Report

1. Apply WFMMaturityReport template
2. Write executive summary (last, based on full content)
3. Insert all sections
4. Add implementation roadmap
5. Compile appendices
6. Add visual annotations throughout

### Phase 7: Quality Check

1. Verify all outline areas covered
2. Check score consistency
3. Ensure recommendations trace to findings
4. Validate all citations
5. List all [VISUAL] annotations for review

## Output Files

| File | Description |
|------|-------------|
| `[client]-wfm-report-draft.md` | Full report in markdown |
| `[client]-sources-used.md` | Inventory of sources referenced |
| `[client]-visual-suggestions.md` | List of suggested visuals |

## Quality Checklist

Before finalizing:
- [ ] All outline areas addressed
- [ ] Scores match source scorecard
- [ ] Each finding has evidence cited
- [ ] Recommendations tie to specific findings
- [ ] Executive summary reflects full content
- [ ] Visual suggestions are actionable
- [ ] No placeholder text remaining
