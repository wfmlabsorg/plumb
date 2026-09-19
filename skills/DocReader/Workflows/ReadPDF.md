# Read PDF Workflow

## Purpose
Extract text and tables from PDF documents (.pdf)

## Process

1. **Validate file path**
   - Verify file exists
   - Support relative and absolute paths

2. **Determine extraction mode**
   - Default: text only
   - `--tables`: extract tables as markdown tables

3. **Extract content**
   - Run `bun run ~/.claude/skills/DocReader/Tools/ReadPDF.ts <filepath>`
   - Content organized by page

4. **Handle special cases**
   - Scanned PDFs may have limited text extraction
   - Tables are best extracted with `--tables` flag
   - Complex layouts may need manual review

## Commands

```bash
# Extract text only
bun run ~/.claude/skills/DocReader/Tools/ReadPDF.ts /path/to/document.pdf

# Extract text and tables
bun run ~/.claude/skills/DocReader/Tools/ReadPDF.ts /path/to/document.pdf --tables
```

## Output Format

Text with page markers:

```
--- Page 1 ---

Document Title

This is the content of page 1...

--- Page 2 ---

Continued content on page 2...
```

With `--tables`:

```
--- Page 1 ---

### Table 1

| Header A | Header B | Header C |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |

### Text Content

Additional text from the page...
```

## Dependencies
- Python 3
- pdfplumber: `pip install pdfplumber --break-system-packages`
