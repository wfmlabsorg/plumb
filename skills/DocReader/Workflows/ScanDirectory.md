# Scan Directory Workflow

## Purpose
Find all supported documents in a directory tree

## Process

1. **Validate directory path**
   - Verify directory exists
   - Support relative and absolute paths

2. **Scan for documents**
   - Search recursively for supported file types
   - Group by format

3. **Report results**
   - List files by category
   - Show total counts

## Commands

```bash
# Scan a directory
bun run ~/.claude/skills/DocReader/Tools/doc.ts scan /path/to/directory

# Scan engagement source documents
bun run ~/.claude/skills/DocReader/Tools/doc.ts scan ~/plumb/books/<engagement>/01-source

# Scan current project
bun run ~/.claude/skills/DocReader/Tools/doc.ts scan ~/plumb/books/<engagement>/
```

## Supported Extensions

| Category | Extensions |
|----------|------------|
| Excel | .xlsx, .xls, .csv |
| Word | .docx, .doc |
| PowerPoint | .pptx, .ppt |
| PDF | .pdf |

## Output Format

```markdown
## Documents Found in /path/to/directory

### Excel Files (3)
- /path/to/Maturity_Scorecard.xlsx
- /path/to/Data_Export.csv
- /path/to/Budget.xlsx

### Word Documents (5)
- /path/to/Interim_Report_v2.docx
- /path/to/Memo.docx
...

### PowerPoint (2)
- /path/to/Client_Deck.pptx
- /path/to/Training.pptx

### PDFs (4)
- /path/to/Contract.pdf
- /path/to/Guidelines.pdf
...

**Total:** 14 documents
```

## Dependencies
- find (standard Unix tool)
