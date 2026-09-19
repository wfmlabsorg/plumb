/**
 * Phase 3: ANALYZE
 * Run statistical analysis and generate insights
 */

import { existsSync, writeFileSync, copyFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import type { AnalysisConfig } from "./orchestrator";
import type { ETLResult } from "./etl";

export interface Finding {
  category: string;
  dimension?: string;
  metric: string;
  value: number;
  comparison?: string;
  severity?: "info" | "warning" | "critical";
  description: string;
}

export interface AnalysisResult {
  findings: Finding[];
  summaryStats: Record<string, Record<string, number>>;
  distributions: Record<string, Record<string, number>>;
  visualizations: string[];
  notebookPath: string;
  findingsPath: string;
}

// Get analysis template path
function getTemplatePath(analysisType: string): string {
  const skillDir = dirname(dirname(import.meta.path));
  const templatePath = join(skillDir, "templates", "analysis", `${analysisType}.ipynb`);

  if (!existsSync(templatePath)) {
    throw new Error(`Analysis template not found: ${analysisType}`);
  }

  return templatePath;
}

// Execute analysis notebook via Papermill
async function executeAnalysis(
  templatePath: string,
  outputPath: string,
  config: AnalysisConfig,
  etlResult: ETLResult
): Promise<void> {
  // Build parameters
  const params: string[] = [];

  // Data path
  params.push("-p", "data_path", etlResult.dataPath);
  params.push("-p", "output_dir", config.output.directory);

  // Metric and dimensions
  params.push("-p", "metric", config.analysis.metric);
  params.push("-p", "dimensions", JSON.stringify(config.analysis.dimensions));

  // Goals
  params.push("-p", "goal_default", String(config.analysis.goals.default));
  if (config.analysis.goals.overrides) {
    params.push("-p", "goal_overrides", JSON.stringify(config.analysis.goals.overrides));
  }

  // Thresholds
  params.push("-p", "thresholds", JSON.stringify(config.analysis.thresholds));

  // Special rules
  if (config.analysis.special_rules) {
    params.push("-p", "special_rules", JSON.stringify(config.analysis.special_rules));
  }

  console.log(`Executing analysis: ${config.analysis.type}`);

  const proc = Bun.spawn(["papermill", templatePath, outputPath, ...params], {
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Analysis execution failed with exit code ${exitCode}`);
  }
}

// Extract findings from analysis results
async function extractFindings(
  config: AnalysisConfig,
  etlResult: ETLResult
): Promise<{
  findings: Finding[];
  summaryStats: Record<string, Record<string, number>>;
  distributions: Record<string, Record<string, number>>;
}> {
  // Use Python to analyze the data and extract findings
  const proc = Bun.spawn([
    "python3",
    "-c",
    `
import pandas as pd
import json

# Load data
df = pd.read_csv("${etlResult.dataPath}")

# Configuration
metric = "${config.analysis.metric}"
dimensions = ${JSON.stringify(config.analysis.dimensions)}
goal_default = ${config.analysis.goals.default}
goal_overrides = ${JSON.stringify(config.analysis.goals.overrides || {})}
thresholds = ${JSON.stringify(config.analysis.thresholds)}

findings = []
summary_stats = {}
distributions = {}

# Check if metric exists
if metric not in df.columns:
    print(json.dumps({
        "findings": [{"category": "error", "description": f"Metric {metric} not found in data"}],
        "summaryStats": {},
        "distributions": {}
    }))
    exit()

# Calculate goal for each row
def get_goal(row):
    for dim in dimensions:
        if dim in row and row[dim] in goal_overrides:
            return goal_overrides[row[dim]]
    return goal_default

df['_goal'] = df.apply(get_goal, axis=1)
df['_deviation'] = (df[metric] - df['_goal']) * 100

# Categorize
def categorize(deviation):
    if deviation >= thresholds['significantly_above']:
        return 'Significantly Above'
    elif deviation >= thresholds['slightly_above']:
        return 'Slightly Above'
    elif deviation >= thresholds['slightly_below']:
        return 'Within Range'
    elif deviation >= thresholds['significantly_below']:
        return 'Slightly Below'
    else:
        return 'Significantly Below'

df['_category'] = df['_deviation'].apply(categorize)

# Overall distribution
overall_dist = df['_category'].value_counts().to_dict()
distributions['overall'] = overall_dist

# Summary statistics
total = len(df)
meeting_goal = len(df[df['_deviation'] >= thresholds['slightly_below']])
below_goal = len(df[df['_deviation'] < thresholds['slightly_below']])

summary_stats['overall'] = {
    'total': total,
    'meeting_goal': meeting_goal,
    'meeting_goal_pct': round(meeting_goal / total * 100, 1) if total > 0 else 0,
    'below_goal': below_goal,
    'below_goal_pct': round(below_goal / total * 100, 1) if total > 0 else 0,
    'significantly_below': int(overall_dist.get('Significantly Below', 0)),
    'significantly_below_pct': round(overall_dist.get('Significantly Below', 0) / total * 100, 1) if total > 0 else 0
}

# Findings
findings.append({
    'category': 'summary',
    'metric': metric,
    'value': summary_stats['overall']['meeting_goal_pct'],
    'description': f"{summary_stats['overall']['meeting_goal_pct']}% of intervals meeting or exceeding goal"
})

if summary_stats['overall']['significantly_below_pct'] > 20:
    findings.append({
        'category': 'warning',
        'metric': metric,
        'value': summary_stats['overall']['significantly_below_pct'],
        'severity': 'warning',
        'description': f"{summary_stats['overall']['significantly_below_pct']}% of intervals significantly below goal"
    })

# Per-dimension analysis
for dim in dimensions:
    if dim not in df.columns:
        continue

    dim_stats = df.groupby(dim).agg({
        metric: ['mean', 'std', 'count'],
        '_deviation': 'mean',
        '_category': lambda x: (x == 'Significantly Below').sum()
    }).round(3)

    dim_stats.columns = ['mean', 'std', 'count', 'avg_deviation', 'sig_below_count']
    dim_stats['sig_below_pct'] = (dim_stats['sig_below_count'] / dim_stats['count'] * 100).round(1)

    summary_stats[dim] = dim_stats.to_dict('index')

    # Distribution per dimension value
    for val in df[dim].unique():
        val_dist = df[df[dim] == val]['_category'].value_counts().to_dict()
        distributions[f"{dim}_{val}"] = val_dist

    # Find problem areas
    problem_dims = dim_stats[dim_stats['sig_below_pct'] > 30]
    for dim_val, row in problem_dims.iterrows():
        findings.append({
            'category': 'concern',
            'dimension': dim,
            'metric': str(dim_val),
            'value': row['sig_below_pct'],
            'severity': 'critical' if row['sig_below_pct'] > 40 else 'warning',
            'description': f"{dim_val}: {row['sig_below_pct']}% of intervals significantly below goal"
        })

print(json.dumps({
    'findings': findings,
    'summaryStats': summary_stats,
    'distributions': distributions
}))
`,
  ]);

  const output = await new Response(proc.stdout).text();
  return JSON.parse(output.trim());
}

// Find generated visualizations
function findVisualizations(outputDir: string): string[] {
  const visualizations: string[] = [];

  try {
    const files = readdirSync(outputDir);
    for (const file of files) {
      if (file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".svg")) {
        visualizations.push(join(outputDir, file));
      }
    }
  } catch {
    // Directory might not exist yet
  }

  return visualizations;
}

// Main analysis function
export async function runAnalysis(config: AnalysisConfig, etlResult: ETLResult): Promise<AnalysisResult> {
  console.log(`Analysis Type: ${config.analysis.type}`);
  console.log(`Metric: ${config.analysis.metric}`);
  console.log(`Dimensions: ${config.analysis.dimensions.join(", ")}`);

  // Check if template exists, otherwise run inline analysis
  let notebookPath = "";
  const outputNotebookPath = join(config.output.directory, `analysis_${config.analysis.type}_output.ipynb`);

  try {
    const templatePath = getTemplatePath(config.analysis.type);
    notebookPath = templatePath;
    await executeAnalysis(templatePath, outputNotebookPath, config, etlResult);
  } catch (error) {
    console.log(`Note: Using inline analysis (template not found)`);
    // Continue with inline analysis
  }

  // Extract findings
  console.log(`\nExtracting findings...`);
  const { findings, summaryStats, distributions } = await extractFindings(config, etlResult);

  // Find visualizations
  const visualizations = findVisualizations(config.output.directory);

  // Save findings
  const findingsPath = join(config.output.directory, "findings.json");
  const findingsData = {
    timestamp: new Date().toISOString(),
    config: {
      type: config.analysis.type,
      metric: config.analysis.metric,
      dimensions: config.analysis.dimensions,
      goals: config.analysis.goals,
      thresholds: config.analysis.thresholds,
    },
    findings,
    summaryStats,
    distributions,
    visualizations: visualizations.map((v) => v.replace(config.output.directory + "/", "")),
  };
  writeFileSync(findingsPath, JSON.stringify(findingsData, null, 2));

  // Summary
  console.log(`\n=== Analysis Summary ===`);
  console.log(`Findings: ${findings.length}`);

  const criticalFindings = findings.filter((f) => f.severity === "critical");
  const warningFindings = findings.filter((f) => f.severity === "warning");

  if (criticalFindings.length > 0) {
    console.log(`\nCritical Issues (${criticalFindings.length}):`);
    for (const f of criticalFindings) {
      console.log(`  - ${f.description}`);
    }
  }

  if (warningFindings.length > 0) {
    console.log(`\nWarnings (${warningFindings.length}):`);
    for (const f of warningFindings.slice(0, 5)) {
      console.log(`  - ${f.description}`);
    }
    if (warningFindings.length > 5) {
      console.log(`  ... and ${warningFindings.length - 5} more`);
    }
  }

  console.log(`\nVisualizations: ${visualizations.length}`);
  console.log(`Findings saved: ${findingsPath}`);

  return {
    findings,
    summaryStats,
    distributions,
    visualizations,
    notebookPath: existsSync(outputNotebookPath) ? outputNotebookPath : "",
    findingsPath,
  };
}
