# Read Excel Workflow

## Purpose
Extract data from Excel spreadsheets (.xlsx, .xls, .csv)

## Process

1. **Validate file path**
   - Verify file exists
   - Support relative and absolute paths

2. **Determine scope**
   - All sheets (default) or specific sheet
   - All columns or specific columns

3. **Extract data**
   - Run `bun run ~/.claude/skills/DocReader/Tools/ReadExcel.ts <filepath> [sheet]`
   - Parse JSON output

4. **Format output**
   - For scorecards: Extract key metrics
   - For data tables: Preserve structure
   - For matrices: Maintain row/column relationships

## Commands

```bash
# Read all sheets
bun run ~/.claude/skills/DocReader/Tools/ReadExcel.ts /path/to/file.xlsx

# Read specific sheet
bun run ~/.claude/skills/DocReader/Tools/ReadExcel.ts /path/to/file.xlsx "Sheet Name"

# Read CSV
bun run ~/.claude/skills/DocReader/Tools/ReadExcel.ts /path/to/file.csv
```

## Output Format

JSON structure with sheet names as keys and arrays of row objects:

```json
{
  "Sheet1": [
    {"Column A": "value1", "Column B": "value2"},
    {"Column A": "value3", "Column B": "value4"}
  ],
  "Sheet2": [...]
}
```

## Dependencies
- Python 3
- pandas: `pip install pandas --break-system-packages`
- openpyxl: `pip install openpyxl --break-system-packages`
