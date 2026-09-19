#!/usr/bin/env bun
/**
 * ReadPDF.ts - Extract text from PDF files using pdfplumber
 *
 * Usage:
 *   bun run ReadPDF.ts <filepath> [--tables]
 *   bun run ReadPDF.ts /path/to/document.pdf
 *   bun run ReadPDF.ts /path/to/document.pdf --tables
 *
 * Output: Text content with page markers (or markdown tables if --tables)
 */

import { $ } from "bun";
import { existsSync } from "fs";

const PYTHON_SCRIPT_TEXT = `
import pdfplumber
import sys

filepath = sys.argv[1]

try:
    with pdfplumber.open(filepath) as pdf:
        for i, page in enumerate(pdf.pages):
            print(f"\\n--- Page {i+1} ---\\n")
            text = page.extract_text()
            if text:
                print(text)
            else:
                print("[No text extracted from this page]")
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

const PYTHON_SCRIPT_TABLES = `
import pdfplumber
import sys

filepath = sys.argv[1]

def table_to_markdown(table):
    if not table or len(table) == 0:
        return ""

    # Clean up cells
    cleaned = []
    for row in table:
        cleaned.append([str(cell).replace('|', '\\|') if cell else '' for cell in row])

    # Build markdown table
    md = ""
    if cleaned:
        # Header
        md += "| " + " | ".join(cleaned[0]) + " |\\n"
        md += "| " + " | ".join(["---"] * len(cleaned[0])) + " |\\n"
        # Rows
        for row in cleaned[1:]:
            md += "| " + " | ".join(row) + " |\\n"
    return md

try:
    with pdfplumber.open(filepath) as pdf:
        for i, page in enumerate(pdf.pages):
            print(f"\\n--- Page {i+1} ---\\n")

            # Extract tables
            tables = page.extract_tables()
            if tables:
                for j, table in enumerate(tables):
                    print(f"### Table {j+1}\\n")
                    print(table_to_markdown(table))

            # Also extract text
            text = page.extract_text()
            if text:
                print("### Text Content\\n")
                print(text)
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: bun run ReadPDF.ts <filepath> [--tables]");
    console.error("  filepath: Path to PDF file (.pdf)");
    console.error("  --tables: Extract tables as markdown tables");
    process.exit(1);
  }

  const extractTables = args.includes("--tables");
  const filepath = args.find(a => !a.startsWith("--"))!;

  if (!existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    process.exit(1);
  }

  // Check if pdfplumber is available
  const pdfplumberCheck = await $`python3 -c "import pdfplumber"`.quiet().nothrow();
  if (pdfplumberCheck.exitCode !== 0) {
    console.error("❌ pdfplumber not installed. Run: pip install pdfplumber --break-system-packages");
    process.exit(1);
  }

  // Run the appropriate Python script
  const script = extractTables ? PYTHON_SCRIPT_TABLES : PYTHON_SCRIPT_TEXT;
  const result = await $`python3 -c ${script} ${filepath}`.nothrow();

  if (result.exitCode !== 0) {
    console.error(`❌ Error reading PDF: ${result.stderr.toString()}`);
    process.exit(1);
  }

  console.log(result.stdout.toString());
}

main();
