#!/usr/bin/env bun
/**
 * doc.ts - Main CLI entry point for DocReader skill
 *
 * Usage:
 *   doc read <filepath>         → Auto-detect format, extract content
 *   doc excel <filepath>        → Read Excel file (all sheets)
 *   doc excel <filepath> <sheet>→ Read specific sheet
 *   doc word <filepath>         → Read Word document to markdown
 *   doc ppt <filepath>          → Read PowerPoint to markdown
 *   doc pdf <filepath>          → Read PDF to text
 *   doc scan <directory>        → List all supported documents
 *   doc deps                    → Check dependencies
 */

import { $ } from "bun";
import { existsSync, statSync } from "fs";
import { extname, resolve, dirname } from "path";

const TOOL_DIR = dirname(import.meta.path);

function detectFormat(filepath: string): string | null {
  const ext = extname(filepath).toLowerCase();
  const formatMap: Record<string, string> = {
    ".xlsx": "excel",
    ".xls": "excel",
    ".csv": "excel",
    ".docx": "word",
    ".doc": "word",
    ".pptx": "ppt",
    ".ppt": "ppt",
    ".pdf": "pdf",
  };
  return formatMap[ext] || null;
}

async function runTool(tool: string, args: string[]) {
  const toolPath = resolve(TOOL_DIR, tool);
  const result = await $`bun run ${toolPath} ${args}`.nothrow();
  console.log(result.stdout.toString());
  if (result.stderr.toString()) {
    console.error(result.stderr.toString());
  }
  return result.exitCode;
}

async function scanDirectory(directory: string) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    console.error(`❌ Directory not found: ${directory}`);
    process.exit(1);
  }

  const result = await $`find ${directory} -type f \( \
    -name "*.xlsx" -o -name "*.xls" -o -name "*.csv" \
    -o -name "*.docx" -o -name "*.doc" \
    -o -name "*.pptx" -o -name "*.ppt" \
    -o -name "*.pdf" \
  \) 2>/dev/null`.nothrow();

  const files = result.stdout.toString().trim().split("\n").filter(Boolean);

  if (files.length === 0) {
    console.log(`📂 No supported documents found in ${directory}`);
    return;
  }

  // Categorize files
  const categories: Record<string, string[]> = {
    excel: [],
    word: [],
    powerpoint: [],
    pdf: [],
  };

  for (const file of files) {
    const format = detectFormat(file);
    if (format === "excel") categories.excel.push(file);
    else if (format === "word") categories.word.push(file);
    else if (format === "ppt") categories.powerpoint.push(file);
    else if (format === "pdf") categories.pdf.push(file);
  }

  console.log(`## Documents Found in ${directory}\n`);

  if (categories.excel.length) {
    console.log(`### Excel Files (${categories.excel.length})`);
    for (const f of categories.excel) console.log(`- ${f}`);
    console.log();
  }

  if (categories.word.length) {
    console.log(`### Word Documents (${categories.word.length})`);
    for (const f of categories.word) console.log(`- ${f}`);
    console.log();
  }

  if (categories.powerpoint.length) {
    console.log(`### PowerPoint (${categories.powerpoint.length})`);
    for (const f of categories.powerpoint) console.log(`- ${f}`);
    console.log();
  }

  if (categories.pdf.length) {
    console.log(`### PDFs (${categories.pdf.length})`);
    for (const f of categories.pdf) console.log(`- ${f}`);
    console.log();
  }

  console.log(`**Total:** ${files.length} documents`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`DocReader - Read Office documents

Usage:
  doc read <filepath>           Auto-detect format and extract content
  doc excel <filepath> [sheet]  Read Excel file
  doc word <filepath>           Read Word document
  doc ppt <filepath>            Read PowerPoint presentation
  doc pdf <filepath>            Read PDF document
  doc scan <directory>          List all documents in directory
  doc deps                      Check dependencies

Examples:
  doc read "~/plumb/books/acme-corp/01-source/report.docx"
  doc excel "~/plumb/books/acme-corp/01-source/scores.xlsx" "Sheet1"
  doc scan "~/plumb/books/acme-corp/01-source/"`);
    process.exit(0);
  }

  const command = args[0];
  const filepath = args[1];

  switch (command) {
    case "deps":
      await runTool("CheckDeps.ts", []);
      break;

    case "read":
      if (!filepath) {
        console.error("❌ Please provide a file path");
        process.exit(1);
      }
      const format = detectFormat(filepath);
      if (!format) {
        console.error(`❌ Unsupported file format: ${extname(filepath)}`);
        process.exit(1);
      }
      const toolMap: Record<string, string> = {
        excel: "ReadExcel.ts",
        word: "ReadWord.ts",
        ppt: "ReadPowerPoint.ts",
        pdf: "ReadPDF.ts",
      };
      await runTool(toolMap[format], args.slice(1));
      break;

    case "excel":
      if (!filepath) {
        console.error("❌ Please provide a file path");
        process.exit(1);
      }
      await runTool("ReadExcel.ts", args.slice(1));
      break;

    case "word":
      if (!filepath) {
        console.error("❌ Please provide a file path");
        process.exit(1);
      }
      await runTool("ReadWord.ts", args.slice(1));
      break;

    case "ppt":
      if (!filepath) {
        console.error("❌ Please provide a file path");
        process.exit(1);
      }
      await runTool("ReadPowerPoint.ts", args.slice(1));
      break;

    case "pdf":
      if (!filepath) {
        console.error("❌ Please provide a file path");
        process.exit(1);
      }
      await runTool("ReadPDF.ts", args.slice(1));
      break;

    case "scan":
      if (!filepath) {
        console.error("❌ Please provide a directory path");
        process.exit(1);
      }
      await scanDirectory(filepath);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.error("Run 'doc' without arguments for usage.");
      process.exit(1);
  }
}

main();
