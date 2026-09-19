#!/usr/bin/env bun
/**
 * DataAnalysis Orchestrator
 * Main pipeline controller for end-to-end data analysis
 */

import { parseArgs } from "util";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve, basename } from "path";
import YAML from "yaml";

// Phase imports
import { runIngest, type IngestResult } from "./ingest";
import { runETL, type ETLResult } from "./etl";
import { runAnalysis, type AnalysisResult } from "./analyze";
import { runQA, type QAResult } from "./qa";
import { runReport, type ReportResult } from "./report";

// Types
export interface AnalysisConfig {
  project: {
    name: string;
    client?: string;
  };
  source: {
    directory: string;
    file_pattern?: string;
  };
  etl: {
    template: string;
    parameters?: Record<string, unknown>;
  };
  analysis: {
    type: string;
    metric: string;
    dimensions: string[];
    goals: {
      default: number;
      overrides?: Record<string, number>;
    };
    thresholds: {
      significantly_above: number;
      slightly_above: number;
      within_range: number;
      slightly_below: number;
      significantly_below: number;
    };
    special_rules?: Array<{
      condition: string;
      override_category: string;
    }>;
  };
  qa: {
    completeness: {
      required_dimensions?: string[];
      date_continuity?: boolean;
      no_null_metrics?: string[];
    };
    ranges?: Record<string, [number | null, number | null]>;
  };
  report: {
    template: string;
    title: string;
    include_sections?: string[];
  };
  output: {
    directory: string;
    formats?: string[];
  };
}

export interface PipelineState {
  config: AnalysisConfig;
  workDir: string;
  ingestResult?: IngestResult;
  etlResult?: ETLResult;
  analysisResult?: AnalysisResult;
  qaResult?: QAResult;
  reportResult?: ReportResult;
}

// Parse command line arguments
function parseArguments() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      config: { type: "string", short: "c" },
      type: { type: "string", short: "t" },
      metric: { type: "string", short: "m" },
      dimensions: { type: "string", short: "d" },
      goals: { type: "string", short: "g" },
      output: { type: "string", short: "o" },
      template: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  return { values, positionals };
}

// Parse goals string into config format
function parseGoals(goalsStr: string): { default: number; overrides: Record<string, number> } {
  const goals: { default: number; overrides: Record<string, number> } = {
    default: 0.8,
    overrides: {},
  };

  const parts = goalsStr.split(",");
  for (const part of parts) {
    const [key, value] = part.trim().split(":");
    if (key === "*") {
      goals.default = parseFloat(value);
    } else {
      goals.overrides[key] = parseFloat(value);
    }
  }

  return goals;
}

// Build config from command line options
function buildConfigFromOptions(
  sourceDir: string,
  options: Record<string, string | boolean | undefined>
): AnalysisConfig {
  const projectName = basename(resolve(sourceDir));
  const outputDir = (options.output as string) || join(resolve(sourceDir), "..", "results");

  const goals = options.goals ? parseGoals(options.goals as string) : { default: 0.8, overrides: {} };
  const dimensions = options.dimensions
    ? (options.dimensions as string).split(",").map((d) => d.trim())
    : ["LOB", "Date"];

  return {
    project: {
      name: projectName,
    },
    source: {
      directory: resolve(sourceDir),
      file_pattern: "*.xlsx",
    },
    etl: {
      template: (options.template as string) || "pivot_to_long",
    },
    analysis: {
      type: (options.type as string) || "deviation_analysis",
      metric: (options.metric as string) || "Actual_SL",
      dimensions,
      goals,
      thresholds: {
        significantly_above: 10,
        slightly_above: 5,
        within_range: 0,
        slightly_below: -5,
        significantly_below: -10,
      },
    },
    qa: {
      completeness: {
        required_dimensions: dimensions,
        no_null_metrics: [(options.metric as string) || "Actual_SL"],
      },
    },
    report: {
      template: "performance_analysis",
      title: `${projectName} Analysis Report`,
    },
    output: {
      directory: outputDir,
      formats: ["md"],
    },
  };
}

// Load config from YAML file
function loadConfig(configPath: string): AnalysisConfig {
  const content = readFileSync(configPath, "utf-8");
  const config = YAML.parse(content) as AnalysisConfig;

  // Resolve paths
  config.source.directory = resolve(config.source.directory.replace("~", process.env.HOME || ""));
  config.output.directory = resolve(config.output.directory.replace("~", process.env.HOME || ""));

  return config;
}

// Save pipeline state
function saveState(state: PipelineState) {
  const statePath = join(state.workDir, "pipeline_state.json");
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

// Load pipeline state
function loadState(workDir: string): PipelineState | null {
  const statePath = join(workDir, "pipeline_state.json");
  if (existsSync(statePath)) {
    return JSON.parse(readFileSync(statePath, "utf-8"));
  }
  return null;
}

// Print usage
function printUsage() {
  console.log(`
DataAnalysis - End-to-end data analysis pipeline

USAGE:
  bun run orchestrator.ts <command> [source_dir] [options]
  bun run orchestrator.ts --config <config.yaml>

COMMANDS:
  ingest    Phase 1: Discover and catalog source data
  etl       Phase 2: Transform data to analysis-ready format
  run       Phase 3: Execute statistical analysis
  qa        Phase 4: Quality assurance validation
  report    Phase 5: Generate client-ready report
  all       Run full pipeline (default if no command specified)

OPTIONS:
  -c, --config <file>     YAML configuration file
  -t, --type <type>       Analysis type (deviation, trend, distribution)
  -m, --metric <name>     Primary metric to analyze
  -d, --dimensions <list> Comma-separated grouping dimensions
  -g, --goals <spec>      Goal specification (e.g., "Concierge:0.90,*:0.80")
  -o, --output <dir>      Output directory
  --template <name>       ETL or report template name
  -h, --help              Show this help message

EXAMPLES:
  # Full pipeline with config file
  bun run orchestrator.ts --config analysis_config.yaml

  # Quick analysis with options
  bun run orchestrator.ts all ./source-data --type deviation --metric Actual_SL

  # Individual phases
  bun run orchestrator.ts ingest ./source-data
  bun run orchestrator.ts etl --template pivot_to_long
  bun run orchestrator.ts run --type deviation
  bun run orchestrator.ts qa
  bun run orchestrator.ts report --template performance_analysis
`);
}

// Main execution
async function main() {
  const { values, positionals } = parseArguments();

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  // Determine command and source
  let command = positionals[0] || "all";
  let sourceDir = positionals[1];

  // Handle case where first positional is a directory (no command specified)
  if (command && existsSync(command) && !["ingest", "etl", "run", "qa", "report", "all"].includes(command)) {
    sourceDir = command;
    command = "all";
  }

  // Load or build configuration
  let config: AnalysisConfig;

  if (values.config) {
    config = loadConfig(values.config as string);
  } else if (sourceDir) {
    config = buildConfigFromOptions(sourceDir, values);
  } else {
    // Try to load existing state
    const existingState = loadState(process.cwd());
    if (existingState) {
      config = existingState.config;
    } else {
      console.error("Error: No source directory or config file specified");
      printUsage();
      process.exit(1);
    }
  }

  // Ensure output directory exists
  mkdirSync(config.output.directory, { recursive: true });

  // Initialize or load state
  let state: PipelineState = loadState(config.output.directory) || {
    config,
    workDir: config.output.directory,
  };
  state.config = config; // Update with latest config

  console.log(`\n${"=".repeat(60)}`);
  console.log(`DataAnalysis Pipeline - ${config.project.name}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // Execute requested phase(s)
    const phases = command === "all" ? ["ingest", "etl", "run", "qa", "report"] : [command];

    for (const phase of phases) {
      console.log(`\n--- Phase: ${phase.toUpperCase()} ---\n`);

      switch (phase) {
        case "ingest":
          state.ingestResult = await runIngest(config);
          break;

        case "etl":
          if (!state.ingestResult) {
            console.log("Running ingest first...");
            state.ingestResult = await runIngest(config);
          }
          state.etlResult = await runETL(config, state.ingestResult);
          break;

        case "run":
          if (!state.etlResult) {
            throw new Error("ETL must be run before analysis. Run 'etl' phase first.");
          }
          state.analysisResult = await runAnalysis(config, state.etlResult);
          break;

        case "qa":
          if (!state.analysisResult) {
            throw new Error("Analysis must be run before QA. Run 'run' phase first.");
          }
          state.qaResult = await runQA(config, state.analysisResult);
          break;

        case "report":
          if (!state.analysisResult) {
            throw new Error("Analysis must be run before report. Run 'run' phase first.");
          }
          state.reportResult = await runReport(config, state.analysisResult, state.qaResult);
          break;

        default:
          console.error(`Unknown command: ${phase}`);
          process.exit(1);
      }

      // Save state after each phase
      saveState(state);
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("Pipeline Complete");
    console.log(`${"=".repeat(60)}`);
    console.log(`\nOutputs saved to: ${config.output.directory}`);

  } catch (error) {
    console.error("\nPipeline Error:", error);
    saveState(state);
    process.exit(1);
  }
}

main();
