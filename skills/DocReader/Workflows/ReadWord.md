# Read Word Workflow

## Purpose
Extract text from Word documents (.docx) preserving structure as markdown

## Process

1. **Validate file path**
   - Verify file exists
   - Support relative and absolute paths

2. **Check for tracked changes**
   - Default: ignore tracked changes
   - Use `--track-changes` to include them

3. **Extract content**
   - Run `bun run ~/.claude/skills/DocReader/Tools/ReadWord.ts <filepath>`
   - Output is clean markdown

4. **Preserve structure**
   - Headings convert to markdown headings
   - Lists maintain proper nesting
   - Tables convert to markdown tables
   - Images noted but not extracted

## Commands

```bash
# Basic extraction
bun run ~/.claude/skills/DocReader/Tools/ReadWord.ts /path/to/document.docx

# Include tracked changes
bun run ~/.claude/skills/DocReader/Tools/ReadWord.ts /path/to/document.docx --track-changes
```

## Output Format

Clean markdown text preserving document structure:

```markdown
# Document Title

## Section 1

This is paragraph text with **bold** and *italic* formatting.

- List item 1
- List item 2

| Column A | Column B |
|----------|----------|
| Cell 1   | Cell 2   |
```

## Dependencies
- pandoc: `sudo apt-get install -y pandoc`
