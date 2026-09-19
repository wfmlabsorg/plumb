#!/usr/bin/env bun
/**
 * PLUMB synthetic world generator.
 *
 * Twelve weeks, two segments, three channels, one cohort. Three planted effects,
 * each a named parameter in P below, each recorded in GROUND-TRUTH.md.
 *
 * Deliberately far smaller than HORIZON's generator (917 lines, seven mechanisms,
 * 120 days). The point here is not a rich story; it is a world small enough to
 * check the model against by hand.
 *
 * Writes the source documents in a DELIBERATELY MESSY shape -- title rows before
 * the header, AHT in minutes, shrinkage as percentages, a RAG column -- so that
 * the mapping layer is exercised against something that does not already match
 * the canonical schema. A generator that emits canonical CSVs would prove nothing.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- parameters

const P = {
  seed: 20260601,
  startDate: "2026-06-01",        // a Monday
  days: 84,                        // 12 weeks

  segments: ["NORTH", "SOUTH"] as const,
  channels: ["voice", "chat", "email"] as const,

  // demand baseline
  transactionsPerDay: { NORTH: 3200, SOUTH: 5400 },
  weekdayProfile: [1.18, 1.10, 1.04, 0.98, 0.94, 0.48, 0.28], // Mon..Sun
  seasonalRampPerDay: 0.0022,      // gentle background growth, both segments

  contactRate: {
    NORTH: { base: 0.42 },
    SOUTH: { base: 0.30 },
  },

  channelSplit: { voice: 0.45, chat: 0.35, email: 0.20 },

  ahtBase: { voice: 420, chat: 520, email: 300 },  // seconds, agent-work
  concurrency: { voice: 1.0, chat: 1.6, email: 1.0 },

  // supply
  headsOnRoll: 76,
  scheduledHoursPerHead: 7.5,
  shrinkPlannedPct: 0.12,
  shrinkUnplannedPct: 0.05,
  targetOccupancy: 0.83,

  // ---- PLANTED EFFECT 1: AHT level shift, NORTH voice, no learning curve ----
  ahtShift: { segment: "NORTH", channel: "voice", fromDay: 43, multiplier: 1.40 },

  // ---- PLANTED EFFECT 2: contact-rate drift, NORTH, linear ----
  contactDrift: { segment: "NORTH", fromDay: 29, toDay: 71, from: 0.42, to: 0.55 },

  // ---- PLANTED EFFECT 3: two-day unplanned shrinkage spike (a training pull) --
  shrinkSpike: { days: [57, 58], unplannedPct: 0.32 },

  noise: { transactions: 0.05, aht: 0.03, contactRate: 0.02 },
};

// ------------------------------------------------------------------- helpers

/** Mulberry32 — small, seeded, reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(P.seed);
/** Symmetric multiplicative noise, mean 1. */
const jitter = (pct: number) => 1 + (rand() * 2 - 1) * pct;

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const dowIndex = (iso: string) => (new Date(iso + "T00:00:00Z").getUTCDay() + 6) % 7; // Mon=0
const r2 = (x: number) => Math.round(x * 100) / 100;

// -------------------------------------------------------------- the world

type DemandRow = {
  date: string; day: number; segment: string; channel: string;
  transactions: number; transactionsForecast: number;
  contactsOffered: number; contactsHandled: number;
  ahtSeconds: number; concurrency: number; itemsResolved: number;
  workloadHours: number; productiveHours: number;
  occupancyAchieved: number; serviceLevel: number;
};

type SupplyRow = {
  date: string; day: number; site: string; cohortId: string;
  headsOnRoll: number; headsScheduled: number;
  scheduledHours: number; productiveHours: number;
  shrinkPlannedHours: number; shrinkUnplannedHours: number;
  separations: number;
};

const demand: DemandRow[] = [];
const supply: SupplyRow[] = [];

for (let day = 1; day <= P.days; day++) {
  const date = addDays(P.startDate, day - 1);
  const dow = dowIndex(date);
  const dayFactor = P.weekdayProfile[dow] * (1 + P.seasonalRampPerDay * day);

  // ---- supply for the day (generated first; demand's productive hours are
  //      allocated out of it, which is what guarantees the 2% reconciliation) --
  const spike = P.shrinkSpike.days.includes(day);
  const shrinkUnplanned = spike ? P.shrinkSpike.unplannedPct : P.shrinkUnplannedPct;
  const weekendScale = dow >= 5 ? P.weekdayProfile[dow] / P.weekdayProfile[0] : 1;

  const headsScheduled = Math.round(P.headsOnRoll * weekendScale);
  const scheduledHours = headsScheduled * P.scheduledHoursPerHead;
  const shrinkPlannedHours = scheduledHours * P.shrinkPlannedPct;
  const shrinkUnplannedHours = scheduledHours * shrinkUnplanned;
  const productiveHoursTotal = scheduledHours - shrinkPlannedHours - shrinkUnplannedHours;

  supply.push({
    date, day, site: "HALCYON-OPS", cohortId: "",
    headsOnRoll: P.headsOnRoll, headsScheduled,
    scheduledHours: r2(scheduledHours),
    productiveHours: r2(productiveHoursTotal),
    shrinkPlannedHours: r2(shrinkPlannedHours),
    shrinkUnplannedHours: r2(shrinkUnplannedHours),
    separations: rand() < 0.06 ? 1 : 0,
  });

  // ---- demand: workload first, so productive hours can be allocated to it ----
  const pending: (Omit<DemandRow,
    "productiveHours" | "occupancyAchieved" | "serviceLevel" | "contactsHandled"> &
    { workloadHours: number })[] = [];

  for (const segment of P.segments) {
    const transactions = Math.round(
      P.transactionsPerDay[segment] * dayFactor * jitter(P.noise.transactions));
    // the forecast is somebody else's, and it is biased slightly low
    const transactionsForecast = Math.round(transactions * 0.97 * jitter(0.04));

    // PLANTED EFFECT 2 — contact-rate drift on NORTH
    let cr = P.contactRate[segment].base;
    const d = P.contactDrift;
    if (segment === d.segment && day >= d.fromDay) {
      const t = Math.min(1, (day - d.fromDay) / (d.toDay - d.fromDay));
      cr = d.from + (d.to - d.from) * t;
    }
    cr *= jitter(P.noise.contactRate);

    const contacts = transactions * cr;

    for (const channel of P.channels) {
      const offered = Math.round(contacts * P.channelSplit[channel]);

      // PLANTED EFFECT 1 — AHT level shift, no learning curve
      let aht = P.ahtBase[channel];
      const s = P.ahtShift;
      if (segment === s.segment && channel === s.channel && day >= s.fromDay) {
        aht *= s.multiplier;
      }
      aht = Math.round(aht * jitter(P.noise.aht));

      const conc = P.concurrency[channel];
      pending.push({
        date, day, segment, channel,
        transactions, transactionsForecast,
        contactsOffered: offered,
        ahtSeconds: aht, concurrency: conc,
        itemsResolved: channel === "email" ? offered : 0,
        workloadHours: (offered * aht) / 3600 / conc,
      });
    }
  }

  // Allocate the day's delivered productive hours across rows by workload share.
  const totalWorkload = pending.reduce((a, r) => a + r.workloadHours, 0);
  const requiredHours = totalWorkload / P.targetOccupancy;
  // When the operation is short, occupancy pins at 1.0 and contacts abandon.
  const short = requiredHours > productiveHoursTotal;
  const handledShare = short ? productiveHoursTotal / requiredHours : 1;

  for (const r of pending) {
    const share = r.workloadHours / totalWorkload;
    const productiveHours = productiveHoursTotal * share;
    const handled = Math.round(r.contactsOffered * Math.min(1, handledShare));
    // Achieved occupancy is HANDLED work over productive hours, not offered work.
    // Offered work that abandoned never occupied anybody, and intake.py's
    // consistency check (handled x AHT / concurrency / occupancy vs reported
    // productive hours) is right to insist on that.
    const handledWorkload = (handled * r.ahtSeconds) / 3600 / r.concurrency;
    const occ = Math.min(1, handledWorkload / productiveHours);
    // crude but monotone: service degrades as occupancy approaches 1
    const sl = Math.max(0.05, Math.min(0.99, 1 - Math.pow(Math.max(0, occ - 0.70) / 0.30, 1.6)));

    demand.push({
      ...r,
      contactsHandled: handled,
      productiveHours: r2(productiveHours),
      occupancyAchieved: r2(occ),
      serviceLevel: r2(sl),
      itemsResolved: r.channel === "email" ? handled : 0,
    });
  }
}

// ------------------------------------------------------- write source documents
// These are written MESSY on purpose. See the module docstring.

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, "books/demo/01-source");
const PROFILE = join(ROOT, "books/demo/00-profile");
mkdirSync(SRC, { recursive: true });
mkdirSync(PROFILE, { recursive: true });

const rag = (sl: number) => (sl >= 0.8 ? "Green" : sl >= 0.6 ? "Amber" : "Red");

const plannerCsv = [
  "Halcyon Group — Daily Planner (MTD)",
  `Generated ${addDays(P.startDate, P.days)} · CONFIDENTIAL — internal use only`,
  "",
  "Date,Region,Channel,Bookings,Fcst Calls,Offered,Answered,AHT (min),Conc,Resolved,Prod Hrs,Occ %,SL %,RAG,Owner",
  ...demand.map((r) =>
    [
      r.date, r.segment, r.channel,
      // Thousands separators, quoted, on purpose: this is what a spreadsheet
      // export actually looks like, and it exercises both the quoted-field CSV
      // reader and the strip_commas transform.
      `"${r.transactions.toLocaleString("en-US")}"`,
      `"${r.transactionsForecast.toLocaleString("en-US")}"`,
      r.contactsOffered, r.contactsHandled,
      r2(r.ahtSeconds / 60),                    // MINUTES, on purpose
      r.concurrency, r.itemsResolved,
      r.productiveHours,
      r2(r.occupancyAchieved * 100),            // PERCENT, on purpose
      r2(r.serviceLevel * 100),
      rag(r.serviceLevel), "K. Osei",
    ].join(","),
  ),
].join("\n");

const rosterCsv = [
  "Halcyon Group — Roster Summary",
  "",
  "Date,Site,Cohort,Heads On Roll,Heads Scheduled,Sched Hrs,Planned Shrink %,Unplanned Shrink %,Prod Hrs,Leavers,Notes",
  ...supply.map((r) =>
    [
      r.date, r.site, r.cohortId || "tenured",
      r.headsOnRoll, r.headsScheduled, r.scheduledHours,
      r2((r.shrinkPlannedHours / r.scheduledHours) * 100),     // PERCENT, on purpose
      r2((r.shrinkUnplannedHours / r.scheduledHours) * 100),
      r.productiveHours, r.separations,
      P.shrinkSpike.days.includes(r.day) ? "Release training" : "",
    ].join(","),
  ),
].join("\n");

writeFileSync(join(SRC, "planner-mtd.csv"), plannerCsv + "\n");
writeFileSync(join(SRC, "roster-summary.csv"), rosterCsv + "\n");

// --------------------------------------------------------------- params.yaml

const paramsYaml = `# PLUMB — books/demo parameters
# Priors for the simulation. Every rate is a mean plus a 90% interval; every
# positive unbounded quantity is a 90% interval alone. Once a posterior exists,
# MODEL-STATE.md supersedes what is written here.
#
# NOTE: these are PRIORS, not measurements. Anything sourced here is [E] at best
# until the model has observed it. See context/plumb/GRADES.md.

horizon_weeks: 12

channels:
  voice:
    kind: interactive
    aht_seconds: {ci: [380, 620]}
    concurrency: 1.0
    occupancy:
      kind: erlang_curve
      target_sl: 0.80
      asa_seconds: 20
      operating_hours_per_week: 105
      spread: 0.04
  chat:
    kind: interactive
    aht_seconds: {ci: [460, 600]}
    concurrency: {ci: [1.4, 1.9]}
    occupancy:
      kind: erlang_curve
      target_sl: 0.80
      asa_seconds: 30
      operating_hours_per_week: 105
      spread: 0.05
  email:
    kind: deferrable
    items_per_productive_hour: {ci: [9.0, 13.0]}

segments:
  NORTH:
    transactions_per_week: [16000, 19000, 23000]
    weekly_index: [1.00, 1.00, 1.01, 1.01, 1.02, 1.02, 1.03, 1.03, 1.04, 1.04, 1.05, 1.05]
    forecast_error: {ci: [0.98, 1.08]}
    forecast_error_weekly: {ci: [0.94, 1.06]}
    contact_rate: {mean: 0.42, ci: [0.36, 0.50]}
    channel_split: {voice: 45, chat: 35, email: 20}
  SOUTH:
    transactions_per_week: [27000, 32000, 38000]
    weekly_index: [1.00, 1.00, 1.01, 1.01, 1.02, 1.02, 1.03, 1.03, 1.04, 1.04, 1.05, 1.05]
    forecast_error: {ci: [0.98, 1.08]}
    forecast_error_weekly: {ci: [0.94, 1.06]}
    contact_rate: {mean: 0.30, ci: [0.26, 0.35]}
    channel_split: {voice: 45, chat: 35, email: 20}

supply:
  starting_productive_heads: ${P.headsOnRoll}
  scheduled_hours_per_head: ${P.scheduledHoursPerHead * 5}
  ramp_curve: [0.35, 0.55, 0.75, 0.90, 1.0]
  early_attrition_weekly: [0.03, 0.03, 0.02, 0.02, 0.01]
  tenured_attrition_weekly: {mean: 0.006, ci: [0.003, 0.011]}
  shrinkage_planned: {mean: ${P.shrinkPlannedPct}, ci: [0.09, 0.16]}
  shrinkage_unplanned: {mean: ${P.shrinkUnplannedPct}, ci: [0.03, 0.09]}
  requisition_fill_prob: {mean: 0.70, ci: [0.55, 0.85]}
  time_to_fill_weeks: {ci: [3.0, 8.0]}
  class_fill_rate: {mean: 0.85, ci: [0.70, 0.95]}
  graduation_rate: {mean: 0.88, ci: [0.78, 0.95]}
  training_weeks: 4
  # The three cohorts in sim/generate-pipeline.ts, as the plan of record.
  # lead_weeks is requisition-open to class-start.
  class_plan:
    - {planned_start_week: 6,  seats_planned: 20, requisitions_opened: 40, lead_weeks: 4}
    - {planned_start_week: 8,  seats_planned: 30, requisitions_opened: 50, lead_weeks: 4}
    - {planned_start_week: 10, seats_planned: 20, requisitions_opened: 35, lead_weeks: 4}
`;
writeFileSync(join(PROFILE, "params.yaml"), paramsYaml);

// -------------------------------------------------------------- ground truth

const shiftRows = demand.filter(
  (r) => r.segment === P.ahtShift.segment && r.channel === P.ahtShift.channel);
const ahtBefore = shiftRows.filter((r) => r.day < P.ahtShift.fromDay);
const ahtAfter = shiftRows.filter((r) => r.day >= P.ahtShift.fromDay);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const spikeDays = supply.filter((r) => P.shrinkSpike.days.includes(r.day));
const normalDays = supply.filter(
  (r) => !P.shrinkSpike.days.includes(r.day) && dowIndex(r.date) < 5);

const totalRequired = demand.reduce((a, r) => a + r.workloadHours, 0) / P.targetOccupancy;
const totalDelivered = supply.reduce((a, r) => a + r.productiveHours, 0);

const gt = `# PLUMB synthetic world — ground truth

**For validation only.** The agent chain is never shown this file; it exists to check what the
chain recovers. Generated by \`sim/generate.ts\`, seed \`${P.seed}\`. Re-running reproduces it
exactly.

Day 1 = ${P.startDate} (a Monday). Day ${P.days} = ${addDays(P.startDate, P.days - 1)}.
Two segments (NORTH, SOUTH), three channels (voice, chat, email), one tenured cohort.

## The world in plain language

Halcyon Group's travellers contact the operation by voice, chat and email. Volume follows a
weekday profile with a gentle background ramp. A single blended pool serves everything, so
delivered productive hours are allocated across segment and channel by workload share — which is
why demand and supply reconcile exactly, and why the DataEngineer's 2% check should always pass
on this data.

Three mechanisms are planted. Each is a named parameter at the top of the generator.

### 1. Handle-time level shift — NORTH voice, no learning curve

From **day ${P.ahtShift.fromDay}** (${addDays(P.startDate, P.ahtShift.fromDay - 1)}), NORTH voice
AHT steps to **${P.ahtShift.multiplier}×** its baseline of ${P.ahtBase.voice}s and stays there for
the rest of the window. There is **no curve** — it is a step, which is what makes it *structural*
rather than transitional.

| | Mean AHT (observed) |
|---|---|
| Before day ${P.ahtShift.fromDay} | ${Math.round(mean(ahtBefore.map((r) => r.ahtSeconds)))}s |
| From day ${P.ahtShift.fromDay} | ${Math.round(mean(ahtAfter.map((r) => r.ahtSeconds)))}s |
| Ratio | ${r2(mean(ahtAfter.map((r) => r.ahtSeconds)) / mean(ahtBefore.map((r) => r.ahtSeconds)))}× |

**What the model must recover:** the gap widens from day ${P.ahtShift.fromDay}, and the
decomposition attributes it to handle time, not volume. A model that reads this as a demand
problem has failed.

### 2. Contact-rate drift — NORTH, linear

From **day ${P.contactDrift.fromDay}** to **day ${P.contactDrift.toDay}**, NORTH's contact rate
moves linearly from **${P.contactDrift.from}** to **${P.contactDrift.to}** (+31%), then holds.
SOUTH stays flat at ${P.contactRate.SOUTH.base}.

**What the model must recover:** the Bayesian posterior on \`CR[NORTH]\` tracks upward as the
cycle runs and \`prior_only\` clears. \`CR[SOUTH]\` stays put. A posterior that does not move on
NORTH means the updating is not wired to the evidence.

**The trap:** the whole-book contact rate rises far less than NORTH's does, because SOUTH is the
larger and lower-contact segment. Reading the book-level rate alone understates the move — this is
the composition check BlackBelt is required to run.

### 3. Unplanned shrinkage spike — two days, a supply break

On **days ${P.shrinkSpike.days.join(" and ")}**
(${P.shrinkSpike.days.map((d) => addDays(P.startDate, d - 1)).join(", ")}), unplanned shrinkage
jumps from ${P.shrinkUnplannedPct * 100}% to **${P.shrinkSpike.unplannedPct * 100}%** of schedule.
Schedules are unchanged; the roster file notes "Release training".

| | Mean productive hours |
|---|---|
| Normal weekdays | ${Math.round(mean(normalDays.map((r) => r.productiveHours)))} |
| Days ${P.shrinkSpike.days.join("–")} | ${Math.round(mean(spikeDays.map((r) => r.productiveHours)))} |
| Fall | ${Math.round((1 - mean(spikeDays.map((r) => r.productiveHours)) / mean(normalDays.map((r) => r.productiveHours))) * 100)}% |

**What the model must recover:** service falls on these two days while **transactions and contacts
are unchanged**. This is the supply-break-that-looks-like-demand test. A model that reports a
demand spike here has failed the most important check in this file.

## Reference totals

| Quantity | Value |
|---|---|
| Demand rows | ${demand.length} |
| Supply rows | ${supply.length} |
| Total transactions | ${demand.filter((r) => r.channel === "voice").reduce((a, r) => a + r.transactions, 0).toLocaleString("en-US")} |
| Total contacts offered | ${demand.reduce((a, r) => a + r.contactsOffered, 0).toLocaleString("en-US")} |
| Total workload hours | ${Math.round(demand.reduce((a, r) => a + r.workloadHours, 0)).toLocaleString("en-US")} |
| Total required productive hours @ occ ${P.targetOccupancy} | ${Math.round(totalRequired).toLocaleString("en-US")} |
| Total delivered productive hours | ${Math.round(totalDelivered).toLocaleString("en-US")} |
| Overall gap | ${Math.round(totalDelivered - totalRequired).toLocaleString("en-US")} h |

## What is deliberately NOT planted

No outage, no weather event, no migration, no second cohort, no learning curve, no definition
change. HORIZON had all of those and the resulting world took 917 lines to generate and a day to
understand. Three effects are enough to prove the pipeline recovers what it should, and few enough
that a person can hold them in their head while reading the output.
`;
writeFileSync(join(import.meta.dir, "GROUND-TRUTH.md"), gt);

// -------------------------------------------------------------- signature checks

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const check = (name: string, pass: boolean, detail: string) =>
  checks.push({ name, pass, detail });

check("row counts", demand.length === P.days * 2 * 3 && supply.length === P.days,
  `demand ${demand.length}, supply ${supply.length}`);

const ratio = mean(ahtAfter.map((r) => r.ahtSeconds)) / mean(ahtBefore.map((r) => r.ahtSeconds));
check("effect 1: AHT shift ≈ 1.40×", Math.abs(ratio - P.ahtShift.multiplier) < 0.02,
  `${r2(ratio)}×`);

const crLate = demand.filter((r) => r.segment === "NORTH" && r.day >= P.contactDrift.toDay);
const crEarly = demand.filter((r) => r.segment === "NORTH" && r.day < P.contactDrift.fromDay);
const crOf = (rows: DemandRow[]) => {
  const byDay = new Map<number, { c: number; t: number }>();
  for (const r of rows) {
    const e = byDay.get(r.day) ?? { c: 0, t: 0 };
    e.c += r.contactsOffered;
    if (r.channel === "voice") e.t += r.transactions;
    byDay.set(r.day, e);
  }
  return mean([...byDay.values()].map((e) => e.c / e.t));
};
check("effect 2: NORTH contact rate drifts 0.42 → 0.55",
  Math.abs(crOf(crEarly) - 0.42) < 0.02 && Math.abs(crOf(crLate) - 0.55) < 0.02,
  `${r2(crOf(crEarly))} → ${r2(crOf(crLate))}`);

const crSouth = crOf(demand.filter((r) => r.segment === "SOUTH"));
check("effect 2 control: SOUTH contact rate flat", Math.abs(crSouth - 0.30) < 0.02,
  `${r2(crSouth)}`);

const fall = 1 - mean(spikeDays.map((r) => r.productiveHours)) /
  mean(normalDays.map((r) => r.productiveHours));
check("effect 3: productive hours fall ≈ 33%", fall > 0.28 && fall < 0.38,
  `${Math.round(fall * 100)}%`);

// Compare each spike day against the SAME WEEKDAY one week either side. A pooled
// weekday mean is the wrong instrument here: it mixes weekday profile and lags the
// seasonal ramp, and reads a 1.13x rise on days that are genuinely unchanged. That
// is the false positive this check exists to avoid, and it is the same defect the
// predecessor system recorded against its own outage-day comparison.
const txOn = (day: number) =>
  mean(demand.filter((r) => r.day === day && r.channel === "voice").map((r) => r.transactions));
const spikeRatios = P.shrinkSpike.days.map(
  (d) => txOn(d) / mean([txOn(d - 7), txOn(d + 7)]));

check("effect 3 control: transactions UNCHANGED on spike days",
  spikeRatios.every((x) => Math.abs(x - 1) < 0.10),
  `${spikeRatios.map(r2).join(", ")}× (same weekday ±1wk)`);

for (const d of demand) {
  if (d.contactsHandled > d.contactsOffered) {
    check("handled ≤ offered", false, `${d.date} ${d.segment} ${d.channel}`); break;
  }
}
if (!checks.some((c) => c.name === "handled ≤ offered"))
  check("handled ≤ offered", true, "all rows");

for (const day of new Set(demand.map((r) => r.day))) {
  const dHours = demand.filter((r) => r.day === day)
    .reduce((a, r) => a + r.productiveHours, 0);
  const sHours = supply.find((r) => r.day === day)!.productiveHours;
  if (Math.abs(dHours / sHours - 1) > 0.02) {
    check("demand/supply productive hours reconcile within 2%", false, `day ${day}`); break;
  }
}
if (!checks.some((c) => c.name.startsWith("demand/supply")))
  check("demand/supply productive hours reconcile within 2%", true, "all 84 days");

const occOk = demand.every((r) => r.occupancyAchieved > 0.01 && r.occupancyAchieved <= 1.0);
check("occupancy within physical range (0.01–1.0)", occOk, "intake.RANGES");

const ahtOk = demand.every((r) => r.ahtSeconds >= 1 && r.ahtSeconds <= 36000);
check("AHT within physical range (1–36,000s)", ahtOk, "intake.RANGES");

console.log("\nPLUMB synthetic world\n" + "=".repeat(64));
for (const c of checks) {
  console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name.padEnd(48)} ${c.detail}`);
}
const failed = checks.filter((c) => !c.pass).length;
console.log("=".repeat(64));
console.log(`  ${checks.length - failed}/${checks.length} checks pass`);
console.log(`\n  books/demo/01-source/planner-mtd.csv      ${demand.length} rows`);
console.log(`  books/demo/01-source/roster-summary.csv   ${supply.length} rows`);
console.log(`  books/demo/00-profile/params.yaml`);
console.log(`  sim/GROUND-TRUTH.md\n`);

if (failed > 0) process.exit(1);
