# Gather Sources Workflow

## Purpose
Collect all relevant content before synthesis.

## Process

### Step 1: Parse Document List

From outline, extract all file paths:
- Excel files (scorecards, data)
- Word documents (reports, memos)
- PowerPoint files (decks, presentations)
- PDF files (contracts, external docs)

### Step 2: Read Documents

For each document, use DocReader:

```bash
# Auto-detect format and read
doc read [filepath]

# Or use specific readers
doc excel [filepath]     # For .xlsx, .xls, .csv
doc word [filepath]      # For .docx
doc ppt [filepath]       # For .pptx
doc pdf [filepath]       # For .pdf
```

Store extracted content with metadata:
- Source file name
- Extraction date
- Content type
- Key topics identified

### Step 3: Organize by Topic

Map gathered content to outline areas:

| Outline Area | Sources Found |
|--------------|---------------|
| Capacity Planning | scorecard.xlsx (Sheet: Capacity), interim-report.docx (Section 3), call-notes-12-15.md |
| Technology | client-deck.pptx (Slides 8-12), tech-assessment.pdf |
| Process | WFM-SOPs.docx, process-review-notes.md |
| Workforce Stability | HR-data.xlsx, attrition-analysis.md |
| ... | ... |

### Step 4: Identify Gaps

Flag any outline areas with insufficient sources:

| Area | Gap Type | Notes |
|------|----------|-------|
| [Area 1] | No documents | Need to request from client |
| [Area 2] | Single source only | May need additional validation |
| [Area 3] | Contradictory info | Requires reconciliation |

## Output

### gathered-sources.md

```markdown
# Source Inventory: [Client] Report

## Documents Processed

### Excel Files
| File | Sheets | Key Content |
|------|--------|-------------|
| [filename] | [sheets] | [description] |

### Word Documents
| File | Sections | Key Content |
|------|----------|-------------|
| [filename] | [sections] | [description] |

### PowerPoints
| File | Slides | Key Content |
|------|--------|-------------|
| [filename] | [count] | [description] |

### PDFs
| File | Pages | Key Content |
|------|-------|-------------|
| [filename] | [count] | [description] |

## Content Mapping

[Table mapping sources to outline areas]

## Gaps Identified

[List of areas needing more content]
```

## Tips

- Run `doc scan [directory]` first to find all available documents
- Check for version conflicts (multiple versions of same doc)
- Note document dates - prefer most recent
- Flag any password-protected or corrupted files
