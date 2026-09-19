# Extract All Documents Workflow

## Purpose
Bulk extract content from all documents in a directory to a structured output folder

## Process

1. **Scan directory**
   - Use ScanDirectory workflow first
   - Identify all supported documents

2. **Create output structure**
   ```
   [output_dir]/
   ├── excel/
   │   ├── Maturity_Scorecard.json
   │   └── Data_Export.json
   ├── word/
   │   ├── Interim_Report_v2.md
   │   └── Memo.md
   ├── powerpoint/
   │   └── Client_Deck.md
   ├── pdf/
   │   └── Contract.md
   └── manifest.md
   ```

3. **Process each file**
   - Route to appropriate reader tool
   - Save extracted content with appropriate extension
   - Log progress

4. **Generate manifest**
   - List all extracted files
   - Note any failures
   - Include extraction timestamps

## Implementation Steps

```bash
# Step 1: Scan the directory
bun run ~/.claude/skills/DocReader/Tools/doc.ts scan /path/to/source

# Step 2: Create output directories
mkdir -p /path/to/output/{excel,word,powerpoint,pdf}

# Step 3: Extract each document type
# (PLUMB iterates through found files and runs appropriate reader)

# Step 4: Generate manifest
# (PLUMB creates manifest.md with extraction results)
```

## Example Extraction Commands

```bash
# Excel to JSON
bun run ~/.claude/skills/DocReader/Tools/ReadExcel.ts input.xlsx > output/excel/input.json

# Word to Markdown
bun run ~/.claude/skills/DocReader/Tools/ReadWord.ts input.docx > output/word/input.md

# PowerPoint to Markdown
bun run ~/.claude/skills/DocReader/Tools/ReadPowerPoint.ts input.pptx > output/powerpoint/input.md

# PDF to Markdown
bun run ~/.claude/skills/DocReader/Tools/ReadPDF.ts input.pdf > output/pdf/input.md
```

## Manifest Format

```markdown
# Document Extraction Manifest

**Source:** /path/to/source
**Output:** /path/to/output
**Extracted:** 2026-01-05 10:30:00

## Successful Extractions (12)

### Excel (3)
- [x] Maturity_Scorecard.xlsx → excel/Maturity_Scorecard.json
- [x] Data_Export.csv → excel/Data_Export.json
- [x] Budget.xlsx → excel/Budget.json

### Word (5)
- [x] Interim_Report_v2.docx → word/Interim_Report_v2.md
...

### PowerPoint (2)
- [x] Client_Deck.pptx → powerpoint/Client_Deck.md
...

### PDF (2)
- [x] Contract.pdf → pdf/Contract.md
...

## Failed Extractions (2)

- [ ] OldFormat.doc - Error: Unsupported format
- [ ] Corrupted.xlsx - Error: File could not be read
```

## Dependencies
- All DocReader tool dependencies
- Write access to output directory
