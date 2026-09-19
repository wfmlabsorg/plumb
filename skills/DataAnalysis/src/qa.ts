/**
 * Phase 4: QA (Quality Assurance)
 * Validate data integrity and analysis correctness
 */

import { writeFileSync } from "fs";
import { join } from "path";
import type { AnalysisConfig } from "./orchestrator";
import type { AnalysisResult } from "./analyze";

export interface QACheck {
  name: string;
  category: "completeness" | "range" | "consistency" | "outlier";
  status: "pass" | "warn" | "fail";
  message: string;
  details?: Record<string, unknown>;
}

export interface QAResult {
  checks: QACheck[];
  passCount: number;
  warnCount: number;
  failCount: number;
  overallStatus: "pass" | "warn" | "fail";
  reportPath: string;
  flagsPath: string;
}

// Run completeness checks
async function checkCompleteness(
  config: AnalysisConfig,
  dataPath: string
): Promise<QACheck[]> {
  const checks: QACheck[] = [];

  const proc = Bun.spawn([
    "python3",
    "-c",
    `
import pandas as pd
import json

df = pd.read_csv("${dataPath}")
checks = []

# Check required dimensions exist
required_dims = ${JSON.stringify(config.qa.completeness.required_dimensions || [])}
for dim in required_dims:
    if dim in df.columns:
        null_count = df[dim].isna().sum()
        if null_count == 0:
            checks.append({
                "name": f"dimension_{dim}_present",
                "category": "completeness",
                "status": "pass",
                "message": f"Dimension '{dim}' present with no nulls"
            })
        else:
            checks.append({
                "name": f"dimension_{dim}_nulls",
                "category": "completeness",
                "status": "warn",
                "message": f"Dimension '{dim}' has {null_count} null values",
                "details": {"null_count": int(null_count)}
            })
    else:
        checks.append({
            "name": f"dimension_{dim}_missing",
            "category": "completeness",
            "status": "fail",
            "message": f"Required dimension '{dim}' not found in data"
        })

# Check required metrics have no nulls
no_null_metrics = ${JSON.stringify(config.qa.completeness.no_null_metrics || [])}
for metric in no_null_metrics:
    if metric in df.columns:
        null_count = df[metric].isna().sum()
        total = len(df)
        null_pct = null_count / total * 100 if total > 0 else 0

        if null_count == 0:
            checks.append({
                "name": f"metric_{metric}_complete",
                "category": "completeness",
                "status": "pass",
                "message": f"Metric '{metric}' is 100% complete"
            })
        elif null_pct < 5:
            checks.append({
                "name": f"metric_{metric}_nulls",
                "category": "completeness",
                "status": "warn",
                "message": f"Metric '{metric}' has {null_count} nulls ({null_pct:.1f}%)",
                "details": {"null_count": int(null_count), "null_pct": round(null_pct, 1)}
            })
        else:
            checks.append({
                "name": f"metric_{metric}_incomplete",
                "category": "completeness",
                "status": "fail",
                "message": f"Metric '{metric}' has {null_count} nulls ({null_pct:.1f}%)",
                "details": {"null_count": int(null_count), "null_pct": round(null_pct, 1)}
            })
    else:
        checks.append({
            "name": f"metric_{metric}_missing",
            "category": "completeness",
            "status": "fail",
            "message": f"Required metric '{metric}' not found in data"
        })

# Check date continuity if enabled
date_check = ${str(config.qa.completeness.date_continuity || False).lower()}
if date_check and 'Date' in df.columns:
    df['Date'] = pd.to_datetime(df['Date'])
    date_range = pd.date_range(df['Date'].min(), df['Date'].max())
    actual_dates = set(df['Date'].dt.date.unique())
    expected_dates = set(d.date() for d in date_range)
    missing_dates = expected_dates - actual_dates

    if len(missing_dates) == 0:
        checks.append({
            "name": "date_continuity",
            "category": "completeness",
            "status": "pass",
            "message": "Date range is continuous"
        })
    else:
        checks.append({
            "name": "date_continuity",
            "category": "completeness",
            "status": "warn",
            "message": f"{len(missing_dates)} dates missing in range",
            "details": {"missing_count": len(missing_dates)}
        })

print(json.dumps(checks))
`,
  ]);

  const output = await new Response(proc.stdout).text();
  return JSON.parse(output.trim());
}

// Run range validation checks
async function checkRanges(
  config: AnalysisConfig,
  dataPath: string
): Promise<QACheck[]> {
  const checks: QACheck[] = [];
  const ranges = config.qa.ranges || {};

  if (Object.keys(ranges).length === 0) {
    return checks;
  }

  const proc = Bun.spawn([
    "python3",
    "-c",
    `
import pandas as pd
import json

df = pd.read_csv("${dataPath}")
checks = []
ranges = ${JSON.stringify(ranges)}

for metric, (min_val, max_val) in ranges.items():
    if metric not in df.columns:
        continue

    col = df[metric].dropna()

    violations = []
    if min_val is not None:
        below_min = (col < min_val).sum()
        if below_min > 0:
            violations.append(f"{below_min} values below {min_val}")

    if max_val is not None:
        above_max = (col > max_val).sum()
        if above_max > 0:
            violations.append(f"{above_max} values above {max_val}")

    if len(violations) == 0:
        checks.append({
            "name": f"range_{metric}",
            "category": "range",
            "status": "pass",
            "message": f"Metric '{metric}' within expected range [{min_val}, {max_val}]"
        })
    else:
        checks.append({
            "name": f"range_{metric}",
            "category": "range",
            "status": "warn",
            "message": f"Metric '{metric}' range violations: {'; '.join(violations)}",
            "details": {"violations": violations}
        })

print(json.dumps(checks))
`,
  ]);

  const output = await new Response(proc.stdout).text();
  return JSON.parse(output.trim());
}

// Check for statistical outliers
async function checkOutliers(
  config: AnalysisConfig,
  dataPath: string
): Promise<QACheck[]> {
  const proc = Bun.spawn([
    "python3",
    "-c",
    `
import pandas as pd
import json
import numpy as np

df = pd.read_csv("${dataPath}")
checks = []
metric = "${config.analysis.metric}"

if metric in df.columns:
    col = df[metric].dropna()

    # IQR method for outliers
    Q1 = col.quantile(0.25)
    Q3 = col.quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR

    outliers_low = (col < lower_bound).sum()
    outliers_high = (col > upper_bound).sum()
    total_outliers = outliers_low + outliers_high
    outlier_pct = total_outliers / len(col) * 100 if len(col) > 0 else 0

    if outlier_pct < 1:
        checks.append({
            "name": f"outliers_{metric}",
            "category": "outlier",
            "status": "pass",
            "message": f"Metric '{metric}' has minimal outliers ({outlier_pct:.1f}%)"
        })
    elif outlier_pct < 5:
        checks.append({
            "name": f"outliers_{metric}",
            "category": "outlier",
            "status": "warn",
            "message": f"Metric '{metric}' has {total_outliers} outliers ({outlier_pct:.1f}%)",
            "details": {
                "total_outliers": int(total_outliers),
                "outlier_pct": round(outlier_pct, 1),
                "lower_bound": round(lower_bound, 4),
                "upper_bound": round(upper_bound, 4)
            }
        })
    else:
        checks.append({
            "name": f"outliers_{metric}",
            "category": "outlier",
            "status": "fail",
            "message": f"Metric '{metric}' has excessive outliers: {total_outliers} ({outlier_pct:.1f}%)",
            "details": {
                "total_outliers": int(total_outliers),
                "outlier_pct": round(outlier_pct, 1)
            }
        })

print(json.dumps(checks))
`,
  ]);

  const output = await new Response(proc.stdout).text();
  return JSON.parse(output.trim());
}

// Generate QA report markdown
function generateQAReport(checks: QACheck[], config: AnalysisConfig): string {
  const passChecks = checks.filter((c) => c.status === "pass");
  const warnChecks = checks.filter((c) => c.status === "warn");
  const failChecks = checks.filter((c) => c.status === "fail");

  let report = `# Quality Assurance Report\n\n`;
  report += `**Project:** ${config.project.name}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  report += `## Summary\n\n`;
  report += `| Status | Count |\n`;
  report += `|--------|-------|\n`;
  report += `| Pass | ${passChecks.length} |\n`;
  report += `| Warning | ${warnChecks.length} |\n`;
  report += `| Fail | ${failChecks.length} |\n`;
  report += `| **Total** | **${checks.length}** |\n\n`;

  if (failChecks.length > 0) {
    report += `## Failures\n\n`;
    for (const check of failChecks) {
      report += `### ${check.name}\n`;
      report += `- **Category:** ${check.category}\n`;
      report += `- **Message:** ${check.message}\n`;
      if (check.details) {
        report += `- **Details:** ${JSON.stringify(check.details)}\n`;
      }
      report += `\n`;
    }
  }

  if (warnChecks.length > 0) {
    report += `## Warnings\n\n`;
    for (const check of warnChecks) {
      report += `- **${check.name}:** ${check.message}\n`;
    }
    report += `\n`;
  }

  if (passChecks.length > 0) {
    report += `## Passed Checks\n\n`;
    for (const check of passChecks) {
      report += `- ${check.name}: ${check.message}\n`;
    }
  }

  return report;
}

// Main QA function
export async function runQA(
  config: AnalysisConfig,
  analysisResult: AnalysisResult
): Promise<QAResult> {
  console.log("Running quality assurance checks...\n");

  // Find data path from findings
  const findingsData = JSON.parse(
    await Bun.file(analysisResult.findingsPath).text()
  );

  // Look for ETL output
  let dataPath = join(config.output.directory, "data_etl.csv");
  const altPath = join(config.output.directory, "interval_data_etl.csv");

  const { existsSync } = await import("fs");
  if (!existsSync(dataPath) && existsSync(altPath)) {
    dataPath = altPath;
  }

  const allChecks: QACheck[] = [];

  // Run all check types
  console.log("Checking completeness...");
  const completenessChecks = await checkCompleteness(config, dataPath);
  allChecks.push(...completenessChecks);

  console.log("Checking ranges...");
  const rangeChecks = await checkRanges(config, dataPath);
  allChecks.push(...rangeChecks);

  console.log("Checking outliers...");
  const outlierChecks = await checkOutliers(config, dataPath);
  allChecks.push(...outlierChecks);

  // Tally results
  const passCount = allChecks.filter((c) => c.status === "pass").length;
  const warnCount = allChecks.filter((c) => c.status === "warn").length;
  const failCount = allChecks.filter((c) => c.status === "fail").length;

  const overallStatus: "pass" | "warn" | "fail" =
    failCount > 0 ? "fail" : warnCount > 0 ? "warn" : "pass";

  // Generate report
  const reportPath = join(config.output.directory, "qa_report.md");
  const report = generateQAReport(allChecks, config);
  writeFileSync(reportPath, report);

  // Save flags (issues that need attention)
  const flagsPath = join(config.output.directory, "qa_flags.json");
  const flags = allChecks.filter((c) => c.status !== "pass");
  writeFileSync(
    flagsPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        overallStatus,
        flags,
      },
      null,
      2
    )
  );

  // Summary
  console.log(`\n=== QA Summary ===`);
  console.log(`Total checks: ${allChecks.length}`);
  console.log(`  Pass: ${passCount}`);
  console.log(`  Warnings: ${warnCount}`);
  console.log(`  Failures: ${failCount}`);
  console.log(`Overall status: ${overallStatus.toUpperCase()}`);
  console.log(`\nReport: ${reportPath}`);
  console.log(`Flags: ${flagsPath}`);

  return {
    checks: allChecks,
    passCount,
    warnCount,
    failCount,
    overallStatus,
    reportPath,
    flagsPath,
  };
}
