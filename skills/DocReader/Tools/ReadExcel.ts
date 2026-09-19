#!/usr/bin/env bun
/**
 * ReadExcel.ts - Extract data from Excel files using pandas
 *
 * Usage:
 *   bun run ReadExcel.ts <filepath> [sheet_name]
 *   bun run ReadExcel.ts /path/to/file.xlsx
 *   bun run ReadExcel.ts /path/to/file.xlsx "Sheet1"
 *
 * Output: JSON with sheet data
 */

import { $ } from "bun";
import { existsSync } from "fs";

const PYTHON_SCRIPT = `
import pandas as pd
import json
import sys

def safe_convert(df):
    # Convert column names to strings (handles datetime columns)
    df.columns = [str(c) for c in df.columns]
    return df.to_dict(orient='records')

filepath = sys.argv[1]
sheet_name = sys.argv[2] if len(sys.argv) > 2 else None

try:
    if filepath.endswith('.csv'):
        df = pd.read_csv(filepath)
        result = {"Sheet1": safe_convert(df)}
    elif sheet_name:
        df = pd.read_excel(filepath, sheet_name=sheet_name)
        result = {sheet_name: safe_convert(df)}
    else:
        all_sheets = pd.read_excel(filepath, sheet_name=None)
        result = {str(name): safe_convert(df) for name, df in all_sheets.items()}

    print(json.dumps(result, indent=2, default=str))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: bun run ReadExcel.ts <filepath> [sheet_name]");
    console.error("  filepath: Path to Excel file (.xlsx, .xls, .csv)");
    console.error("  sheet_name: Optional - specific sheet to read");
    process.exit(1);
  }

  const filepath = args[0];
  const sheetName = args[1];

  if (!existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    process.exit(1);
  }

  // Check if pandas is available
  const pandasCheck = await $`python3 -c "import pandas"`.quiet().nothrow();
  if (pandasCheck.exitCode !== 0) {
    console.error("❌ pandas not installed. Run: pip install pandas openpyxl --break-system-packages");
    process.exit(1);
  }

  // Run the Python script
  const cmd = sheetName
    ? $`python3 -c ${PYTHON_SCRIPT} ${filepath} ${sheetName}`
    : $`python3 -c ${PYTHON_SCRIPT} ${filepath}`;

  const result = await cmd.nothrow();

  if (result.exitCode !== 0) {
    console.error(`❌ Error reading Excel: ${result.stderr.toString()}`);
    process.exit(1);
  }

  console.log(result.stdout.toString());
}

main();
