# Read PowerPoint Workflow

## Purpose
Extract text content from PowerPoint presentations (.pptx) as markdown

## Process

1. **Validate file path**
   - Verify file exists
   - Support relative and absolute paths

2. **Extract slide content**
   - Run `bun run ~/.claude/skills/DocReader/Tools/ReadPowerPoint.ts <filepath>`
   - Each slide's text is extracted in order

3. **Structure output**
   - Slides marked with headers
   - Text content preserved
   - Speaker notes included when present

## Commands

```bash
# Extract all slides
bun run ~/.claude/skills/DocReader/Tools/ReadPowerPoint.ts /path/to/presentation.pptx
```

## Output Format

Markdown with slide structure:

```markdown
# Slide 1: Title Slide

Company Presentation
Q4 2025 Results

---

# Slide 2: Overview

- Key accomplishment 1
- Key accomplishment 2
- Revenue growth: 25%

---

# Slide 3: Details

Further details about the quarter...
```

## Dependencies
- Python 3
- markitdown: `pip install markitdown --break-system-packages`
