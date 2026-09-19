/**
 * Phase 1: INGEST
 * Discover and catalog source data
 */

import { readdirSync, statSync, writeFileSync } from "fs";
import { join, extname, basename } from "path";
import type { AnalysisConfig } from "./orchestrator";

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  sheets?: string[];
  columns?: string[];
  rowCount?: number;
}

export interface IngestResult {
  files: FileInfo[];
  totalFiles: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  manifestPath: string;
  schemaReportPath: string;
}

// Detect file type from extension
function detectFileType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const typeMap: Record<string, string> = {
    ".xlsx": "excel",
    ".xls": "excel",
    ".csv": "csv",
    ".json": "json",
    ".parquet": "parquet",
    ".tsv": "tsv",
  };
  return typeMap[ext] || "unknown";
}

// Profile Excel file structure
async function profileExcelFile(filePath: string): Promise<Partial<FileInfo>> {
  try {
    // Use Python to read Excel metadata (more reliable for complex files)
    const proc = Bun.spawn([
      "python3",
      "-c",
      `
import pandas as pd
import json
import sys

try:
    xl = pd.ExcelFile("${filePath}")
    sheets = xl.sheet_names

    # Sample first sheet for columns
    df = pd.read_excel("${filePath}", sheet_name=sheets[0], nrows=5)
    columns = list(df.columns.astype(str))

    # Estimate row count from first sheet
    df_full = pd.read_excel("${filePath}", sheet_name=sheets[0])
    row_count = len(df_full)

    print(json.dumps({
        "sheets": sheets,
        "columns": columns,
        "rowCount": row_count
    }))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`,
    ]);

    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output.trim());

    return {
      sheets: result.sheets,
      columns: result.columns,
      rowCount: result.rowCount,
    };
  } catch (error) {
    console.warn(`  Warning: Could not profile ${basename(filePath)}`);
    return {};
  }
}

// Profile CSV file
async function profileCSVFile(filePath: string): Promise<Partial<FileInfo>> {
  try {
    const proc = Bun.spawn([
      "python3",
      "-c",
      `
import pandas as pd
import json

df = pd.read_csv("${filePath}", nrows=5)
columns = list(df.columns.astype(str))

# Count rows
with open("${filePath}", 'r') as f:
    row_count = sum(1 for _ in f) - 1  # Subtract header

print(json.dumps({
    "columns": columns,
    "rowCount": row_count
}))
`,
    ]);

    const output = await new Response(proc.stdout).text();
    const result = JSON.parse(output.trim());

    return {
      columns: result.columns,
      rowCount: result.rowCount,
    };
  } catch {
    return {};
  }
}

// Generate schema report markdown
function generateSchemaReport(files: FileInfo[], config: AnalysisConfig): string {
  let report = `# Data Schema Report\n\n`;
  report += `**Project:** ${config.project.name}\n`;
  report += `**Source Directory:** ${config.source.directory}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  report += `## Files Discovered\n\n`;
  report += `| File | Type | Size | Sheets/Columns | Rows |\n`;
  report += `|------|------|------|----------------|------|\n`;

  for (const file of files) {
    const sizeKB = (file.size / 1024).toFixed(1);
    const sheetsOrCols = file.sheets?.length
      ? `${file.sheets.length} sheets`
      : file.columns?.length
        ? `${file.columns.length} cols`
        : "-";
    const rows = file.rowCount?.toLocaleString() || "-";

    report += `| ${file.name} | ${file.type} | ${sizeKB} KB | ${sheetsOrCols} | ${rows} |\n`;
  }

  report += `\n## Detailed Structure\n\n`;

  for (const file of files) {
    report += `### ${file.name}\n\n`;

    if (file.sheets && file.sheets.length > 0) {
      report += `**Sheets:** ${file.sheets.join(", ")}\n\n`;
    }

    if (file.columns && file.columns.length > 0) {
      report += `**Columns (sample):**\n`;
      for (const col of file.columns.slice(0, 20)) {
        report += `- ${col}\n`;
      }
      if (file.columns.length > 20) {
        report += `- ... and ${file.columns.length - 20} more\n`;
      }
      report += `\n`;
    }
  }

  return report;
}

// Main ingest function
export async function runIngest(config: AnalysisConfig): Promise<IngestResult> {
  console.log(`Scanning: ${config.source.directory}`);

  const files: FileInfo[] = [];
  const fileTypes: Record<string, number> = {};
  let totalSize = 0;

  // Get file pattern (default to all data files)
  const pattern = config.source.file_pattern || "*";
  const extensions = [".xlsx", ".xls", ".csv", ".json", ".parquet", ".tsv"];

  // Scan directory
  const entries = readdirSync(config.source.directory);

  for (const entry of entries) {
    // Skip hidden and temp files
    if (entry.startsWith(".") || entry.startsWith("~")) continue;

    const ext = extname(entry).toLowerCase();
    if (!extensions.includes(ext)) continue;

    const filePath = join(config.source.directory, entry);
    const stats = statSync(filePath);

    if (!stats.isFile()) continue;

    const fileType = detectFileType(entry);
    fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;
    totalSize += stats.size;

    const fileInfo: FileInfo = {
      name: entry,
      path: filePath,
      size: stats.size,
      type: fileType,
    };

    // Profile file structure
    console.log(`  Profiling: ${entry}`);

    if (fileType === "excel") {
      const profile = await profileExcelFile(filePath);
      Object.assign(fileInfo, profile);
    } else if (fileType === "csv") {
      const profile = await profileCSVFile(filePath);
      Object.assign(fileInfo, profile);
    }

    files.push(fileInfo);
  }

  // Save manifest
  const manifestPath = join(config.output.directory, "source_manifest.json");
  const manifest = {
    generated: new Date().toISOString(),
    sourceDirectory: config.source.directory,
    totalFiles: files.length,
    totalSizeBytes: totalSize,
    fileTypes,
    files,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved: ${manifestPath}`);

  // Generate schema report
  const schemaReportPath = join(config.output.directory, "schema_report.md");
  const schemaReport = generateSchemaReport(files, config);
  writeFileSync(schemaReportPath, schemaReport);
  console.log(`Schema report saved: ${schemaReportPath}`);

  // Summary
  console.log(`\n=== Ingest Summary ===`);
  console.log(`Files discovered: ${files.length}`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`File types:`, fileTypes);

  return {
    files,
    totalFiles: files.length,
    totalSize,
    fileTypes,
    manifestPath,
    schemaReportPath,
  };
}
