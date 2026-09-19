/**
 * Phase 5: REPORT
 * Generate client-ready deliverable
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname, basename } from "path";
import type { AnalysisConfig } from "./orchestrator";
import type { AnalysisResult, Finding } from "./analyze";
import type { QAResult } from "./qa";

export interface ReportResult {
  reportPath: string;
  format: string;
  sections: string[];
}

// Load report template
function loadTemplate(templateName: string): string {
  const skillDir = dirname(dirname(import.meta.path));
  const templatePath = join(skillDir, "templates", "reports", `${templateName}.md`);

  if (existsSync(templatePath)) {
    return readFileSync(templatePath, "utf-8");
  }

  // Return default template
  return getDefaultTemplate();
}

// Default report template
function getDefaultTemplate(): string {
  return `# {{title}}
## {{subtitle}}

---

## Executive Summary

{{executive_summary}}

---

## Methodology

### Data Sources

{{data_sources}}

### Analysis Approach

{{methodology}}

---

## Results

### Overall Performance

{{overall_results}}

### Detailed Findings

{{detailed_findings}}

---

## Visualizations

{{visualizations}}

---

## Quality Assurance

{{qa_summary}}

---

## Recommendations

{{recommendations}}

---

## Appendix

### Technical Details

{{technical_details}}

### Data Quality Notes

{{data_quality}}

---

**Report Generated:** {{generated_date}}
**Analysis Tool:** PLUMB Consulting Analytical Systems Engine
`;
}

// Generate executive summary from findings
function generateExecutiveSummary(findings: Finding[], config: AnalysisConfig): string {
  const summaryFindings = findings.filter((f) => f.category === "summary");
  const criticalFindings = findings.filter((f) => f.severity === "critical");
  const warningFindings = findings.filter((f) => f.severity === "warning");

  let summary = `This report presents an analysis of **${config.analysis.metric}** performance `;
  summary += `across ${config.analysis.dimensions.join(", ")} dimensions.\n\n`;

  summary += `### Key Metrics\n\n`;
  summary += `| Metric | Value |\n`;
  summary += `|--------|-------|\n`;

  for (const f of summaryFindings) {
    summary += `| ${f.description.split(":")[0] || f.metric} | ${f.value}${typeof f.value === "number" && f.value <= 100 ? "%" : ""} |\n`;
  }

  if (criticalFindings.length > 0) {
    summary += `\n### Critical Issues\n\n`;
    for (const f of criticalFindings) {
      summary += `- **${f.metric || f.dimension}:** ${f.description}\n`;
    }
  }

  if (warningFindings.length > 0) {
    summary += `\n### Areas of Concern\n\n`;
    for (const f of warningFindings.slice(0, 5)) {
      summary += `- ${f.description}\n`;
    }
    if (warningFindings.length > 5) {
      summary += `- *...and ${warningFindings.length - 5} additional warnings*\n`;
    }
  }

  return summary;
}

// Generate data sources section
function generateDataSources(config: AnalysisConfig): string {
  let section = `| Source | Details |\n`;
  section += `|--------|--------|\n`;
  section += `| Directory | \`${config.source.directory}\` |\n`;
  section += `| File Pattern | \`${config.source.file_pattern || "*"}\` |\n`;

  // Check for manifest
  const manifestPath = join(config.output.directory, "source_manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    section += `| Files Processed | ${manifest.totalFiles} |\n`;
    section += `| Total Size | ${(manifest.totalSizeBytes / 1024 / 1024).toFixed(2)} MB |\n`;

    if (manifest.files && manifest.files.length > 0) {
      section += `\n### Source Files\n\n`;
      for (const file of manifest.files.slice(0, 10)) {
        section += `- \`${file.name}\``;
        if (file.sheets) {
          section += ` (${file.sheets.length} sheets)`;
        }
        section += `\n`;
      }
      if (manifest.files.length > 10) {
        section += `- *...and ${manifest.files.length - 10} more files*\n`;
      }
    }
  }

  return section;
}

// Generate methodology section
function generateMethodology(config: AnalysisConfig): string {
  let section = `**Analysis Type:** ${config.analysis.type}\n\n`;
  section += `**Primary Metric:** ${config.analysis.metric}\n\n`;
  section += `**Dimensions:** ${config.analysis.dimensions.join(", ")}\n\n`;

  section += `### Performance Goals\n\n`;
  section += `| Category | Target |\n`;
  section += `|----------|--------|\n`;
  section += `| Default | ${(config.analysis.goals.default * 100).toFixed(0)}% |\n`;

  if (config.analysis.goals.overrides) {
    for (const [key, value] of Object.entries(config.analysis.goals.overrides)) {
      section += `| ${key} | ${(value * 100).toFixed(0)}% |\n`;
    }
  }

  section += `\n### Performance Categories\n\n`;
  section += `| Category | Deviation from Goal |\n`;
  section += `|----------|--------------------|\n`;
  section += `| Significantly Above | +${config.analysis.thresholds.significantly_above}pt or more |\n`;
  section += `| Slightly Above | +${config.analysis.thresholds.slightly_above}pt to +${config.analysis.thresholds.significantly_above - 1}pt |\n`;
  section += `| Within Range | +/-${Math.abs(config.analysis.thresholds.slightly_below)}pt |\n`;
  section += `| Slightly Below | ${config.analysis.thresholds.slightly_below}pt to ${config.analysis.thresholds.significantly_below + 1}pt |\n`;
  section += `| Significantly Below | ${config.analysis.thresholds.significantly_below}pt or worse |\n`;

  return section;
}

// Generate overall results section
function generateOverallResults(analysisResult: AnalysisResult): string {
  const { summaryStats, distributions } = analysisResult;
  let section = "";

  if (summaryStats.overall) {
    const stats = summaryStats.overall;
    section += `| Metric | Value |\n`;
    section += `|--------|-------|\n`;
    section += `| Total Records | ${stats.total?.toLocaleString() || "N/A"} |\n`;
    section += `| Meeting Goal | ${stats.meeting_goal?.toLocaleString() || "N/A"} (${stats.meeting_goal_pct || 0}%) |\n`;
    section += `| Below Goal | ${stats.below_goal?.toLocaleString() || "N/A"} (${stats.below_goal_pct || 0}%) |\n`;
    section += `| Significantly Below | ${stats.significantly_below?.toLocaleString() || "N/A"} (${stats.significantly_below_pct || 0}%) |\n`;
  }

  if (distributions.overall) {
    section += `\n### Distribution by Category\n\n`;
    section += `| Category | Count |\n`;
    section += `|----------|-------|\n`;

    const order = [
      "Significantly Above",
      "Slightly Above",
      "Within Range",
      "Slightly Below",
      "Significantly Below",
    ];

    for (const cat of order) {
      const count = distributions.overall[cat] || 0;
      section += `| ${cat} | ${count.toLocaleString()} |\n`;
    }
  }

  return section;
}

// Generate detailed findings section
function generateDetailedFindings(
  analysisResult: AnalysisResult,
  config: AnalysisConfig
): string {
  const { summaryStats } = analysisResult;
  let section = "";

  // Per-dimension breakdowns
  for (const dim of config.analysis.dimensions) {
    if (summaryStats[dim]) {
      section += `### By ${dim}\n\n`;
      section += `| ${dim} | Count | Avg Deviation | Sig. Below % |\n`;
      section += `|------|-------|---------------|-------------|\n`;

      const dimData = summaryStats[dim] as Record<string, Record<string, number>>;
      const sorted = Object.entries(dimData).sort(
        (a, b) => (b[1].sig_below_pct || 0) - (a[1].sig_below_pct || 0)
      );

      for (const [key, stats] of sorted) {
        section += `| ${key} | ${stats.count?.toLocaleString() || "N/A"} | ${stats.avg_deviation?.toFixed(1) || "N/A"}pt | ${stats.sig_below_pct?.toFixed(1) || "N/A"}% |\n`;
      }

      section += `\n`;
    }
  }

  return section;
}

// Generate visualizations section
function generateVisualizations(analysisResult: AnalysisResult): string {
  let section = "";

  if (analysisResult.visualizations.length === 0) {
    return "*No visualizations generated*\n";
  }

  for (const viz of analysisResult.visualizations) {
    const filename = basename(viz);
    section += `### ${filename.replace(/[_-]/g, " ").replace(/\.(png|jpg|svg)$/i, "")}\n\n`;
    section += `![${filename}](${filename})\n\n`;
  }

  return section;
}

// Generate QA summary section
function generateQASummary(qaResult: QAResult | undefined): string {
  if (!qaResult) {
    return "*QA phase not run*\n";
  }

  let section = `**Overall Status:** ${qaResult.overallStatus.toUpperCase()}\n\n`;
  section += `| Check Type | Pass | Warn | Fail |\n`;
  section += `|------------|------|------|------|\n`;
  section += `| Total | ${qaResult.passCount} | ${qaResult.warnCount} | ${qaResult.failCount} |\n`;

  if (qaResult.failCount > 0) {
    section += `\n### Issues Requiring Attention\n\n`;
    const failures = qaResult.checks.filter((c) => c.status === "fail");
    for (const check of failures) {
      section += `- **${check.name}:** ${check.message}\n`;
    }
  }

  if (qaResult.warnCount > 0) {
    section += `\n### Warnings\n\n`;
    const warnings = qaResult.checks.filter((c) => c.status === "warn");
    for (const check of warnings.slice(0, 5)) {
      section += `- ${check.message}\n`;
    }
    if (warnings.length > 5) {
      section += `- *...and ${warnings.length - 5} more warnings*\n`;
    }
  }

  return section;
}

// Generate recommendations based on findings
function generateRecommendations(findings: Finding[]): string {
  const critical = findings.filter((f) => f.severity === "critical");
  const warnings = findings.filter((f) => f.severity === "warning");

  let section = "";

  if (critical.length > 0) {
    section += `### Immediate Actions\n\n`;
    for (let i = 0; i < Math.min(critical.length, 3); i++) {
      const f = critical[i];
      section += `${i + 1}. **Address ${f.metric || f.dimension}** - ${f.description}\n`;
      section += `   - Investigate root cause of underperformance\n`;
      section += `   - Review staffing/capacity during problem periods\n\n`;
    }
  }

  if (warnings.length > 0) {
    section += `### Short-Term Improvements\n\n`;
    const grouped: Record<string, Finding[]> = {};
    for (const f of warnings) {
      const key = f.dimension || "general";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    }

    let idx = critical.length + 1;
    for (const [dim, dimFindings] of Object.entries(grouped).slice(0, 3)) {
      section += `${idx}. **Monitor ${dim}** - ${dimFindings.length} dimension values showing concern\n`;
      section += `   - Implement regular tracking and alerts\n`;
      section += `   - Establish improvement targets\n\n`;
      idx++;
    }
  }

  section += `### Strategic Considerations\n\n`;
  section += `- Review forecast accuracy and scheduling methodology\n`;
  section += `- Evaluate cross-training opportunities to improve flexibility\n`;
  section += `- Consider implementing real-time performance dashboards\n`;

  return section;
}

// Generate technical details section
function generateTechnicalDetails(config: AnalysisConfig): string {
  let section = `**ETL Template:** ${config.etl.template}\n\n`;
  section += `**Analysis Type:** ${config.analysis.type}\n\n`;
  section += `**Output Directory:** \`${config.output.directory}\`\n\n`;

  section += `### Output Files\n\n`;

  try {
    const files = readdirSync(config.output.directory);
    for (const file of files) {
      section += `- \`${file}\`\n`;
    }
  } catch {
    section += `*Unable to list output files*\n`;
  }

  return section;
}

// Main report function
export async function runReport(
  config: AnalysisConfig,
  analysisResult: AnalysisResult,
  qaResult?: QAResult
): Promise<ReportResult> {
  console.log(`Report Template: ${config.report.template}`);
  console.log(`Title: ${config.report.title}`);

  // Load template
  let template = loadTemplate(config.report.template);

  // Generate sections
  const sections = {
    title: config.report.title,
    subtitle: config.project.client
      ? `${config.project.client} - Analysis Report`
      : "Data Analysis Report",
    executive_summary: generateExecutiveSummary(analysisResult.findings, config),
    data_sources: generateDataSources(config),
    methodology: generateMethodology(config),
    overall_results: generateOverallResults(analysisResult),
    detailed_findings: generateDetailedFindings(analysisResult, config),
    visualizations: generateVisualizations(analysisResult),
    qa_summary: generateQASummary(qaResult),
    recommendations: generateRecommendations(analysisResult.findings),
    technical_details: generateTechnicalDetails(config),
    data_quality: qaResult
      ? `See QA Report: \`qa_report.md\``
      : "*QA phase not run*",
    generated_date: new Date().toISOString().split("T")[0],
  };

  // Replace placeholders
  for (const [key, value] of Object.entries(sections)) {
    template = template.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  // Save report
  const projectSlug = config.project.name.replace(/\s+/g, "_");
  const reportPath = join(
    config.output.directory,
    `${projectSlug}_Analysis_Report.md`
  );
  writeFileSync(reportPath, template);

  console.log(`\n=== Report Generated ===`);
  console.log(`Path: ${reportPath}`);
  console.log(`Sections: ${Object.keys(sections).length}`);

  // Optional: Convert to PDF if pandoc is available
  if (config.output.formats?.includes("pdf")) {
    try {
      const pdfPath = reportPath.replace(".md", ".pdf");
      const proc = Bun.spawn([
        "pandoc",
        reportPath,
        "-o",
        pdfPath,
        "--pdf-engine=xelatex",
      ]);
      await proc.exited;
      console.log(`PDF: ${pdfPath}`);
    } catch {
      console.log(`Note: PDF conversion not available (pandoc not installed)`);
    }
  }

  return {
    reportPath,
    format: "md",
    sections: Object.keys(sections),
  };
}
