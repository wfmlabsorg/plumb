#!/usr/bin/env bun
/**
 * PLUMB synthetic world — the hiring pipeline, as a spreadsheet.
 *
 * Written as .xlsx rather than .csv on purpose. A recruiting pipeline is the one
 * artifact in this domain that virtually never arrives as a clean CSV: it comes
 * out of an ATS as a workbook, with a title block, a named sheet, real Date
 * cells, human-readable milestone labels and a formula column somebody added.
 * So this is where the xlsx reader and the `lookup` transform get exercised.
 *
 * PLANTED EFFECT 4 -- the funnel rates differ from the priors in params.yaml,
 * so learning has something to move toward:
 *
 *              prior   planted truth
 *   req_fill    0.70       0.624
 *   class_fill  0.85       0.900
 *   graduation  0.88       0.794
 *
 * Three cohorts across the 12-week window, each walking
 * req_opened -> offer_accepted -> class_started -> graduated, with withdrawals.
 */

import ExcelJS from "exceljs";
import { join } from "node:path";

const START = "2026-06-01";
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

type Cohort = {
  id: string;
  reqDay: number; reqs: number;
  offerDay: number; offers: number;
  classDay: number; seatsPlanned: number; seatsFilled: number;
  gradDay: number; graduates: number;
  withdrewDay: number; withdrew: number;
};

// offers/reqs ~ 0.624 · filled/planned = 0.900 · graduates/starts ~ 0.794
const COHORTS: Cohort[] = [
  { id: "C1", reqDay:  8, reqs: 40, offerDay: 29, offers: 25,
    classDay: 36, seatsPlanned: 20, seatsFilled: 18,
    gradDay: 64, graduates: 14, withdrewDay: 50, withdrew: 4 },
  { id: "C2", reqDay: 22, reqs: 50, offerDay: 43, offers: 31,
    classDay: 50, seatsPlanned: 30, seatsFilled: 27,
    gradDay: 78, graduates: 22, withdrewDay: 64, withdrew: 5 },
  { id: "C3", reqDay: 36, reqs: 35, offerDay: 57, offers: 22,
    classDay: 64, seatsPlanned: 20, seatsFilled: 18,
    gradDay: 84, graduates: 14, withdrewDay: 78, withdrew: 4 },
];

type Row = {
  date: Date; milestone: string; cohort: string;
  count: number; planned: number | null; plannedDate: Date | null;
};

const rows: Row[] = [];
for (const c of COHORTS) {
  rows.push({ date: addDays(START, c.reqDay - 1), milestone: "Req Opened", cohort: c.id,
              count: c.reqs, planned: null, plannedDate: null });
  // denominator: requisitions opened
  rows.push({ date: addDays(START, c.offerDay - 1), milestone: "Offer Accepted", cohort: c.id,
              count: c.offers, planned: c.reqs, plannedDate: addDays(START, c.reqDay - 1) });
  // denominator: seats planned
  rows.push({ date: addDays(START, c.classDay - 1), milestone: "Class Started", cohort: c.id,
              count: c.seatsFilled, planned: c.seatsPlanned,
              plannedDate: addDays(START, c.classDay - 1) });
  rows.push({ date: addDays(START, c.withdrewDay - 1), milestone: "Withdrew", cohort: c.id,
              count: c.withdrew, planned: null, plannedDate: null });
  // denominator: CLASS STARTS -- never seats planned. Getting this wrong does not
  // fail, it silently inflates the graduation rate.
  rows.push({ date: addDays(START, c.gradDay - 1), milestone: "Graduated", cohort: c.id,
              count: c.graduates, planned: c.seatsFilled,
              plannedDate: addDays(START, c.gradDay - 1) });
}
rows.sort((a, b) => a.date.getTime() - b.date.getTime());

// ------------------------------------------------------------------ the workbook

const wb = new ExcelJS.Workbook();
wb.creator = "Halcyon Talent Acquisition";
const ws = wb.addWorksheet("Pipeline Detail");
wb.addWorksheet("Notes").addRow(["Extract from the ATS. Do not edit in place."]);

ws.addRow(["Halcyon Group — Recruiting Pipeline"]);
ws.addRow([`Extract run ${addDays(START, 84).toISOString().slice(0, 10)} · Talent Acquisition`]);
ws.addRow([]);
ws.addRow(["Date", "Milestone", "Cohort", "Count", "Planned", "Planned Date",
           "Conversion", "Recruiter"]);

for (const [i, r] of rows.entries()) {
  const excelRow = i + 5;                       // header is row 4
  ws.addRow([
    r.date,                                     // a real Date cell, not text
    r.milestone,                                // human label, needs `lookup`
    r.cohort,
    r.count,
    r.planned,
    r.plannedDate,
    // a formula column somebody added; ExcelJS stores the cached result too
    r.planned ? { formula: `D${excelRow}/E${excelRow}`, result: r.count / r.planned } : null,
    "A. Nwosu",
  ]);
}

ws.getColumn(1).numFmt = "yyyy-mm-dd";
ws.getColumn(6).numFmt = "yyyy-mm-dd";
ws.getColumn(7).numFmt = "0.0%";

const out = join(import.meta.dir, "../books/demo/01-source/hiring-pipeline.xlsx");
await wb.xlsx.writeFile(out);

// ------------------------------------------------------------------ ground truth

const sum = (m: string, k: "count" | "planned") =>
  rows.filter((r) => r.milestone === m).reduce((a, r) => a + (r[k] ?? 0), 0);

const truth = {
  req_fill_prob:   sum("Offer Accepted", "count") / sum("Offer Accepted", "planned"),
  class_fill_rate: sum("Class Started", "count") / sum("Class Started", "planned"),
  graduation_rate: sum("Graduated", "count") / sum("Graduated", "planned"),
};

console.log("\nPLUMB hiring pipeline (planted effect 4)\n" + "=".repeat(64));
console.log(`  ${rows.length} events across ${COHORTS.length} cohorts -> hiring-pipeline.xlsx`);
console.log(`  sheet "Pipeline Detail", header on row 4, Date cells, a formula column`);
console.log();
console.log("  planted funnel truth      (prior in params.yaml)");
console.log(`    req_fill_prob    ${truth.req_fill_prob.toFixed(3)}   (0.70)`);
console.log(`    class_fill_rate  ${truth.class_fill_rate.toFixed(3)}   (0.85)`);
console.log(`    graduation_rate  ${truth.graduation_rate.toFixed(3)}   (0.88)`);
console.log();
console.log("  Each differs from its prior, so a posterior that does not move");
console.log("  means the pipeline evidence is not reaching the update.");
console.log("=".repeat(64) + "\n");
