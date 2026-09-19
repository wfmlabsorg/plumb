/**
 * Phase 2: ETL
 * Transform source data into analysis-ready format
 */

import { existsSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import type { AnalysisConfig } from "./orchestrator";
import type { IngestResult } from "./ingest";

export interface ETLResult {
  dataPath: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  logPath: string;
  notebookPath: string;
}

// Get template path
function getTemplatePath(templateName: string): string {
  const skillDir = dirname(dirname(import.meta.path));
  const templatePath = join(skillDir, "templates", "etl", `${templateName}.ipynb`);

  if (!existsSync(templatePath)) {
    throw new Error(`ETL template not found: ${templateName}`);
  }

  return templatePath;
}

// Configure notebook with parameters
function configureNotebook(
  templatePath: string,
  outputPath: string,
  config: AnalysisConfig,
  ingestResult: IngestResult
): void {
  // For now, copy template and inject parameters via Papermill
  // Parameters will be passed at execution time
  copyFileSync(templatePath, outputPath);
}

// Execute notebook via Papermill
async function executeNotebook(
  notebookPath: string,
  outputPath: string,
  parameters: Record<string, unknown>
): Promise<void> {
  // Build parameter string for papermill
  const paramArgs: string[] = [];
  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === "string") {
      paramArgs.push("-p", key, value);
    } else {
      paramArgs.push("-p", key, JSON.stringify(value));
    }
  }

  console.log(`Executing notebook: ${notebookPath}`);
  console.log(`Parameters:`, parameters);

  const proc = Bun.spawn(["papermill", notebookPath, outputPath, ...paramArgs], {
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Papermill execution failed with exit code ${exitCode}`);
  }
}

// Extract results from executed notebook
async function extractResults(
  outputDir: string
): Promise<{ rowCount: number; columnCount: number; columns: string[] }> {
  const dataPath = join(outputDir, "data_etl.csv");

  if (!existsSync(dataPath)) {
    // Try alternate names
    const altPath = join(outputDir, "interval_data_etl.csv");
    if (existsSync(altPath)) {
      // Use the existing file
    }
  }

  // Use Python to get CSV info
  const proc = Bun.spawn([
    "python3",
    "-c",
    `
import pandas as pd
import json
import os

output_dir = "${outputDir}"
data_path = os.path.join(output_dir, "data_etl.csv")

# Try alternate names if primary doesn't exist
if not os.path.exists(data_path):
    for alt in ["interval_data_etl.csv", "etl_output.csv"]:
        alt_path = os.path.join(output_dir, alt)
        if os.path.exists(alt_path):
            data_path = alt_path
            break

if os.path.exists(data_path):
    df = pd.read_csv(data_path)
    print(json.dumps({
        "rowCount": len(df),
        "columnCount": len(df.columns),
        "columns": list(df.columns)
    }))
else:
    print(json.dumps({
        "rowCount": 0,
        "columnCount": 0,
        "columns": []
    }))
`,
  ]);

  const output = await new Response(proc.stdout).text();
  return JSON.parse(output.trim());
}

// Main ETL function
export async function runETL(config: AnalysisConfig, ingestResult: IngestResult): Promise<ETLResult> {
  const templateName = config.etl.template;
  console.log(`ETL Template: ${templateName}`);

  // Get template
  const templatePath = getTemplatePath(templateName);
  console.log(`Template path: ${templatePath}`);

  // Setup paths
  const workNotebookPath = join(config.output.directory, `etl_${templateName}.ipynb`);
  const outputNotebookPath = join(config.output.directory, `etl_${templateName}_output.ipynb`);

  // Configure notebook
  configureNotebook(templatePath, workNotebookPath, config, ingestResult);

  // Build parameters
  const parameters: Record<string, unknown> = {
    data_dir: config.source.directory,
    output_dir: config.output.directory,
    ...config.etl.parameters,
  };

  // Add goal parameters if present
  if (config.analysis.goals) {
    parameters.sl_goal_default = config.analysis.goals.default;
    if (config.analysis.goals.overrides) {
      for (const [key, value] of Object.entries(config.analysis.goals.overrides)) {
        parameters[`sl_goal_${key.toLowerCase().replace(/\s+/g, "_")}`] = value;
      }
    }
  }

  // Execute
  await executeNotebook(workNotebookPath, outputNotebookPath, parameters);

  // Extract results
  const results = await extractResults(config.output.directory);

  // Find the actual data file
  let dataPath = join(config.output.directory, "data_etl.csv");
  if (!existsSync(dataPath)) {
    const altPath = join(config.output.directory, "interval_data_etl.csv");
    if (existsSync(altPath)) {
      dataPath = altPath;
    }
  }

  // Create ETL log
  const logPath = join(config.output.directory, "etl_log.json");
  const log = {
    timestamp: new Date().toISOString(),
    template: templateName,
    sourceFiles: ingestResult.files.map((f) => f.name),
    parameters,
    results: {
      rowCount: results.rowCount,
      columnCount: results.columnCount,
      columns: results.columns,
    },
    outputPath: dataPath,
  };
  writeFileSync(logPath, JSON.stringify(log, null, 2));

  console.log(`\n=== ETL Summary ===`);
  console.log(`Rows: ${results.rowCount.toLocaleString()}`);
  console.log(`Columns: ${results.columnCount}`);
  console.log(`Output: ${dataPath}`);
  console.log(`Log: ${logPath}`);

  return {
    dataPath,
    rowCount: results.rowCount,
    columnCount: results.columnCount,
    columns: results.columns,
    logPath,
    notebookPath: outputNotebookPath,
  };
}
