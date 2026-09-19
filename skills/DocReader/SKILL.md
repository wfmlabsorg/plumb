---
name: DocReader
description: Read and extract content from Office documents (Excel, Word, PowerPoint, PDF). USE WHEN user mentions read document, extract text, open file, analyze spreadsheet, read excel, read word, read pdf, read powerpoint, document content, file contents, scorecard, report, deck, presentation, spreadsheet, maturity assessment, client documents, import data, extract data.
---

# DocReader Skill

Extract text, data, and content from Office documents for analysis and report compilation.

> **Purpose:** Enable PLUMB to read any document format and extract structured content for downstream processing.

---

## Supported Formats

| Format | Extensions | Tool | Best For |
|--------|------------|------|----------|
| Excel | .xlsx, .xls, .csv | pandas | Scorecards, data, matrices |
| Word | .docx | pandoc | Reports, narratives, memos |
| PowerPoint | .pptx | markitdown | Decks, presentations |
| PDF | .pdf | pdfplumber | Contracts, scanned docs |

---

## Workflow Routing

| User Intent | Workflow |
|-------------|----------|
| Read an Excel file / scorecard | Workflows/ReadExcel.md |
| Read a Word document / report | Workflows/ReadWord.md |
| Read a PowerPoint deck | Workflows/ReadPowerPoint.md |
| Read a PDF document | Workflows/ReadPDF.md |
| Find all documents in a folder | Workflows/ScanDirectory.md |
| Extract content from multiple docs | Workflows/ExtractAll.md |

---

## Quick Commands

```
doc read [filepath]              → Auto-detect format, extract content
doc excel [filepath]             → Read Excel file (all sheets)
doc excel [filepath] [sheet]     → Read specific sheet
doc word [filepath]              → Read Word document to markdown
doc ppt [filepath]               → Read PowerPoint to markdown
doc pdf [filepath]               → Read PDF to text
doc scan [directory]             → List all supported documents
doc extract [directory]          → Extract all documents to markdown
```

---

## Path Handling

Use standard Unix paths in GitHub Codespaces. For engagement documents, use project-relative paths:
- ~/plumb/books/<engagement>/01-source/file.xlsx
- ~/plumb/books/<engagement>/02-processed/file.docx

All paths are native Linux paths in the Codespace environment.

---

## Dependencies

This skill requires the following to be installed:

```bash
# Python packages
pip install pandas openpyxl pdfplumber markitdown --break-system-packages

# System tools
sudo apt-get install -y pandoc poppler-utils
```

Run `bun run ~/.claude/skills/DocReader/Tools/CheckDeps.ts` to verify installation.
