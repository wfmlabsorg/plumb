/**
 * cadence.ts — Stage 4 at two more horizons (P3).
 *
 *  WEEKLY  Refresh the 26-week outlook in weekly buckets from the daily cycle's learning, and say
 *          what changed since last week's version and why.
 *  MONTHLY Lock next month's plan (versioned, never silently overwritten); show the over/under trend
 *          (three months actual, six projected); project headcount under attrition with no hiring;
 *          raise hiring asks with hire-by dates from lead times; flag surplus and how long attrition
 *          takes to absorb it.
 */
import { GATES, gate as gateOf, type Product } from "./registry";
import { addDays, type ExtractRow, type OutlookRow } from "./world";
import { propose, replay, weekly, type CycleState, type ProposedRow, type WeekRow } from "./reforecast";
import type { Overlay } from "./signals";

export const PLAN = {
  attrition: { rate: 0.1, basis: "annual" as "annual" | "monthly" }, // the owner confirms the basis; a parameter either way
  shrinkage: 0.3,                                                      // productive FTE = headcount × (1 − shrinkage)
  recruitWeeks: 6,
  trainWeeks: { A: 6, C: 6, D: 8, E: 4 } as Record<Product, number>,  // D: clearance and agency specifics; E: more automation
  surplusAboveP90Pct: 10, shortAtP50Pct: -3, minHireFte: 0.5,
};
export const monthlyAttrition = () => (PLAN.attrition.basis === "annual" ? 1 - Math.pow(1 - PLAN.attrition.rate, 1 / 12) : PLAN.attrition.rate);
const r1 = (x: number) => Math.round(x * 10) / 10;
const monthOf = (d: string) => d.slice(0, 7);
const monthStart = (m: string) => `${m}-01`;
const nextMonth = (m: string) => { const [y, mo] = m.split("-").map(Number) as [number, number]; return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`; };
const monthsBetween = (a: string, b: string) => { const [ya, ma] = a.split("-").map(Number) as [number, number]; const [yb, mb] = b.split("-").map(Number) as [number, number]; return (yb - ya) * 12 + (mb - ma); };

// ---- weekly ------------------------------------------------------------------------------------------
export interface WeeklyRefresh { asOf: string; state: CycleState; rows: ProposedRow[]; gates: WeekRow[]; products: WeekRow[]; changes: WeeklyChange[] }
export interface WeeklyChange { gate: string; product: string; req_now: number; req_last: number; change_pct: number; why: string }

export function weeklyRefresh(extract: ExtractRow[], events: Parameters<typeof replay>[1], outlook: OutlookRow[], weeks = 26, prev?: { state: CycleState; rows: ProposedRow[] }, overlays: Overlay[] = [], policy?: (st: CycleState, through: string) => Set<string>): WeeklyRefresh {
  const through = extract[extract.length - 1]!.date;
  const state = replay(extract, events, through); const rows = propose(state, outlook, overlays, policy?.(state, through));
  const last = prev ?? (() => { const t = addDays(through, -7); const s = replay(extract, events, t); return { state: s, rows: propose(s, outlook, overlays, policy?.(s, t)) }; })();
  const horizonEnd = addDays(state.asOf, weeks * 7);
  const sum = (rs: ProposedRow[], g: string) => rs.filter((r) => r.gate === g && r.date < horizonEnd).reduce((s, r) => s + r.req_proposed_fte, 0);
  const changes: WeeklyChange[] = GATES.map((g) => {
    const now = sum(rows, g.id), was = sum(last.rows, g.id);
    const why: string[] = [];
    for (const c of g.channels) {
      const a = state.series.get(`${g.id}/${c.channel}`), b = last.state.series.get(`${g.id}/${c.channel}`);
      if (a && b && Math.abs(a.L - b.L) >= 0.005) why.push(`${c.channel} volume correction ${((Math.exp(b.L) - 1) * 100).toFixed(1)}% → ${((Math.exp(a.L) - 1) * 100).toFixed(1)}%`);
      if (a && b && Math.abs(a.La - b.La) >= 0.005) why.push(`${c.channel} AHT correction ${((Math.exp(b.La) - 1) * 100).toFixed(1)}% → ${((Math.exp(a.La) - 1) * 100).toFixed(1)}%`);
      for (const s of a?.shifts.filter((x) => x.date > addDays(state.asOf, -8)) ?? []) why.push(`${c.channel} level shift ${s.dir} detected ${s.date}`);
    }
    for (const m of state.migrations.filter((m) => m.to === g.id)) for (const [ch, acc] of m.acc) { const pr = last.state.migrations.find((x) => x.to === g.id)?.acc.get(ch); if (pr && acc.applied !== pr.applied) why.push(`${ch} migration ratio ${acc.applied ? "now applied" : "no longer applied"}`); }
    const flags = state.detected.filter((d) => d.date > addDays(state.asOf, -8) && d.gates.includes(g.id));
    if (flags.length) why.push(`${flags.length} flag(s) this week: ${[...new Set(flags.map((f) => f.kind))].join(", ")} (not learned from)`);
    const change = was ? +(((now - was) / was) * 100).toFixed(2) : 0;
    // causes are listed only for gates that actually moved; flags on an unmoved gate are context, not a change
    return { gate: g.id, product: g.product, req_now: r1(now / (weeks * 7)), req_last: r1(was / (weeks * 7)), change_pct: change, why: Math.abs(change) < 0.5 ? "no material change" : why.join("; ") || "small corrections across channels" };
  }).sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
  return { asOf: state.asOf, state, rows, gates: weekly(rows, (r) => r.gate, weeks), products: weekly(rows, (r) => gateOf(r.gate).product, weeks), changes };
}

export function weeklyMarkdown(w: WeeklyRefresh, weeks = 26): string {
  const prods = ["A", "C", "D", "E"] as const; const byWeek = new Map<string, Map<string, WeekRow>>();
  for (const x of w.products) { const m = byWeek.get(x.week) ?? new Map(); m.set(x.key, x); byWeek.set(x.week, m); }
  const short50 = w.gates.filter((x) => x.over_under_pct < PLAN.shortAtP50Pct && x.req >= 2), short90 = w.gates.filter((x) => x.sched < x.req_p90 && x.over_under_pct >= PLAN.shortAtP50Pct && x.req >= 2);
  const moved = w.changes.filter((c) => Math.abs(c.change_pct) >= 1);
  const out = [
    `# Weekly outlook refresh · as of ${w.asOf} · next ${weeks} weeks`, "",
    `${GATES.length} gates · ${moved.length} gates moved by 1% or more since last week's version · ${short50.length} gate-weeks short at the central forecast · ${short90.length} more short only at P90`, "",
    "## What changed since last week", "",
    ...(moved.length ? ["| Gate | Product | Avg required, last week | Now | Change | Why |", "|---|---|---:|---:|---:|---|", ...moved.slice(0, 20).map((c) => `| ${c.gate} | ${c.product} | ${c.req_last} | ${c.req_now} | ${c.change_pct >= 0 ? "+" : ""}${c.change_pct}% | ${c.why} |`)] : ["No gate moved by 1% or more. The outlook of record stands."]),
    "", "## Outlook by product (daily average FTE: required P50 / planned staff / over-under)", "",
    `| Week of | ${prods.map((p) => `${p} req | ${p} staff | ${p} ±`).join(" | ")} |`, `|---|${prods.map(() => "---:|---:|---:").join("|")}|`,
    ...[...byWeek].map(([wk, m]) => `| ${wk} | ${prods.map((p) => { const x = m.get(p); return x ? `${x.req} | ${x.sched} | ${x.over_under >= 0 ? "+" : ""}${x.over_under}` : "— | — | —"; }).join(" | ")} |`),
    "", `## Gate-weeks short (${short50.length} at P50; ${short90.length} more at P90)`, "",
    ...(short50.length ? ["| Week of | Gate | Required P50 (P90) | Planned staff | Over/under | Projected SL |", "|---|---|---:|---:|---:|---:|", ...short50.sort((a, b) => a.over_under_pct - b.over_under_pct).slice(0, 30).map((x) => `| ${x.week} | ${x.key} | ${x.req} (${x.req_p90}) | ${x.sched} | ${x.over_under} (${x.over_under_pct}%) | ${Math.round(x.sl * 100)}% |`)] : ["None at P50."]),
    "", "*The weekly refresh rolls up the daily cycle's learning; nothing here is learned separately. Synthetic data.*", "",
  ];
  return out.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

// ---- monthly lock --------------------------------------------------------------------------------------
export interface LockRow { version: string; month: string; week: string; gate: string; product: string; segment: string; req_p50: number; req_p90: number; planned_staff: number; over_under: number }
export interface Runway { gate: string; product: string; segment: string; hc_now: number; months: { month: string; hc: number; capacity: number; req_p50: number; req_p90: number; gap_p50: number }[] }
export interface HireAsk { gate: string; product: string; segment: string; month: string; need_hc: number; hire_by: string; late: boolean }
export interface Surplus { gate: string; product: string; month: string; surplus_fte: number; months_to_absorb: number | null; advice: string }
export interface Trend { key: string; month: string; kind: "actual" | "projected"; net_before: number; net_after: number; sl: number | null }
export interface MonthlyLock { asOf: string; month: string; version: string; lock: LockRow[]; trend: Trend[]; runway: Runway[]; hires: HireAsk[]; surplus: Surplus[] }

/** Headcount from recent actual productive staff, carried forward under attrition with no hiring. */
export function projectHeadcount(hcNow: number, months: number): number[] { const a = monthlyAttrition(); return Array.from({ length: months }, (_, k) => hcNow * Math.pow(1 - a, k)); }

export function monthlyLock(extract: ExtractRow[], rows: ProposedRow[], asOf: string, month?: string, horizonMonths = 6, state?: CycleState): MonthlyLock {
  const lockMonth = month ?? nextMonth(monthOf(asOf)); const version = `${lockMonth}@${asOf}`;
  // the locked plan: every gate × week overlapping the month
  const wk = weekly(rows, (r) => r.gate, 26).filter((x) => monthOf(x.week) === lockMonth || monthOf(addDays(x.week, 6)) === lockMonth);
  const lock: LockRow[] = wk.map((x) => { const g = gateOf(x.key); return { version, month: lockMonth, week: x.week, gate: x.key, product: g.product, segment: g.segment, req_p50: x.req, req_p90: x.req_p90, planned_staff: x.sched, over_under: x.over_under }; });
  // trend: three months actual (PDP history: net before/after), six projected (proposed outlook vs planned staff)
  const trend: Trend[] = []; const cur = monthOf(asOf);
  const actualMonths = [-3, -2, -1].map((k) => { let m = cur; for (let i = 0; i < -k; i++) { const [y, mo] = m.split("-").map(Number) as [number, number]; m = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`; } return m; });
  const days = (m: string) => new Set(extract.filter((r) => monthOf(r.date) === m).map((r) => r.date)).size || 1;
  for (const p of ["A", "C", "D", "E"]) {
    for (const m of actualMonths) { const rs = extract.filter((r) => monthOf(r.date) === m && gateOf(r.gate).product === p); const vol = rs.reduce((s, r) => s + r.offered, 0);
      trend.push({ key: p, month: m, kind: "actual", net_before: r1(rs.reduce((s, r) => s + r.sched_open_fte - r.fc_req_fte, 0) / days(m)), net_after: r1(rs.reduce((s, r) => s + r.act_fte - r.act_req_fte, 0) / days(m)), sl: vol ? +(rs.reduce((s, r) => s + r.answered_in_sl, 0) / vol).toFixed(3) : null }); }
    let m = monthOf(rows[0]!.date); for (let k = 0; k < horizonMonths; k++, m = nextMonth(m)) { const rs = rows.filter((r) => monthOf(r.date) === m && gateOf(r.gate).product === p); const nd = new Set(rs.map((r) => r.date)).size || 1; const vol = rs.reduce((s, r) => s + r.fc_volume_proposed, 0);
      if (rs.length) trend.push({ key: p, month: m, kind: "projected", net_before: r1(rs.reduce((s, r) => s + r.over_under_fte, 0) / nd), net_after: NaN, sl: vol ? +(rs.reduce((s, r) => s + r.sl_projected * r.fc_volume_proposed, 0) / vol).toFixed(3) : null }); }
  }
  // headcount runway under attrition, against the monthly P50/P90 need
  const recentFrom = addDays(asOf, -28);
  const runway: Runway[] = GATES.map((g) => {
    const recent = extract.filter((r) => r.gate === g.id && r.date >= recentFrom); const nd = new Set(recent.map((r) => r.date)).size || 1;
    const hcNow = recent.reduce((s, r) => s + r.act_fte, 0) / nd / (1 - PLAN.shrinkage);
    const hc = projectHeadcount(hcNow, horizonMonths + 1); let m = monthOf(rows[0]!.date); const months = [];
    for (let k = 0; k < horizonMonths; k++, m = nextMonth(m)) {
      const rs = rows.filter((r) => r.gate === g.id && monthOf(r.date) === m); if (!rs.length) continue; const nd2 = new Set(rs.map((r) => r.date)).size;
      const p50 = rs.reduce((s, r) => s + r.req_proposed_fte, 0) / nd2; const sd = Math.sqrt(rs.reduce((s, r) => s + (r.req_proposed_fte * r.sd_log) ** 2, 0)) / nd2 + 0.02 * p50;
      const cap = hc[k]! * (1 - PLAN.shrinkage);
      months.push({ month: m, hc: r1(hc[k]!), capacity: r1(cap), req_p50: r1(p50), req_p90: r1(p50 + 1.2816 * sd), gap_p50: r1(cap - p50) });
    }
    return { gate: g.id, product: g.product, segment: g.segment, hc_now: r1(hcNow), months };
  });
  // hiring asks: the first month capacity falls short of P50 by more than the threshold; hire-by from lead time
  const hires: HireAsk[] = []; const surplus: Surplus[] = [];
  for (const r of runway) {
    // only months from the locked month on: the current month is already staffed; a half-FTE wobble is not a hire
    const first = r.months.find((x) => x.month >= lockMonth && x.req_p50 >= 1 && (x.gap_p50 / x.req_p50) * 100 < PLAN.shortAtP50Pct && -x.gap_p50 >= PLAN.minHireFte);
    if (first) { const need = Math.max(...r.months.filter((x) => x.month >= first.month).map((x) => (x.req_p50 - x.capacity) / (1 - PLAN.shrinkage)));
      const lead = (PLAN.recruitWeeks + PLAN.trainWeeks[r.product as Product]) * 7; const hireBy = addDays(monthStart(first.month), -lead);
      hires.push({ gate: r.gate, product: r.product, segment: r.segment, month: first.month, need_hc: r1(need), hire_by: hireBy, late: hireBy < asOf }); }
  }
  for (const r of runway) {
    const lockM = r.months.find((x) => x.month === lockMonth);
    if (lockM && lockM.req_p90 >= 1 && ((lockM.capacity - lockM.req_p90) / lockM.req_p90) * 100 > PLAN.surplusAboveP90Pct) {
      const over = lockM.capacity - lockM.req_p90; let k: number | null = null;
      for (let i = 1; i <= 24; i++) if (lockM.hc * Math.pow(1 - monthlyAttrition(), i) * (1 - PLAN.shrinkage) <= lockM.req_p90 * (1 + PLAN.surplusAboveP90Pct / 100)) { k = i; break; }
      const mig = state?.migrations.find((x) => x.from === r.gate);
      const later = hires.find((h) => h.gate === r.gate);
      const advice = mig ? `migration source: redeploy to ${mig.to} as waves land` : later ? `seasonal: hold — needed again by ${later.month}; cross-train or lend to a shared pool, do not release` : k === null ? "structural: redeploy" : `attrition absorbs it in about ${k} months`;
      surplus.push({ gate: r.gate, product: r.product, month: lockMonth, surplus_fte: r1(over), months_to_absorb: k, advice });
    }
  }
  return { asOf, month: lockMonth, version, lock, trend, runway, hires: hires.sort((a, b) => a.hire_by.localeCompare(b.hire_by)), surplus: surplus.sort((a, b) => b.surplus_fte - a.surplus_fte) };
}

export function monthlyMarkdown(m: MonthlyLock): string {
  const prods = ["A", "C", "D", "E"]; const months = [...new Set(m.trend.map((t) => t.month))].sort();
  const seg = new Map<string, LockRow[]>(); for (const l of m.lock) seg.set(l.segment, [...(seg.get(l.segment) ?? []), l]);
  const segRows = [...seg].map(([s, ls]) => { const wk = new Set(ls.map((l) => l.week)).size || 1; const t = (f: (l: LockRow) => number) => r1(ls.reduce((a, l) => a + f(l), 0) / wk); return { s, product: ls[0]!.product, p50: t((l) => l.req_p50), p90: t((l) => l.req_p90), staff: t((l) => l.planned_staff), ou: t((l) => l.over_under) }; }).sort((a, b) => a.ou - b.ou);
  const byP = (p: string, f: (r: Runway["months"][number]) => number, mo: string) => r1(m.runway.filter((r) => r.product === p).reduce((s, r) => s + (r.months.find((x) => x.month === mo) ? f(r.months.find((x) => x.month === mo)!) : 0), 0));
  const rmonths = [...new Set(m.runway.flatMap((r) => r.months.map((x) => x.month)))].sort();
  const out = [
    `# Monthly lock · ${m.month} · version ${m.version}`, "",
    `Attrition ${(PLAN.attrition.rate * 100).toFixed(0)}% ${PLAN.attrition.basis} (${(monthlyAttrition() * 100).toFixed(2)}% a month) · shrinkage ${PLAN.shrinkage * 100}% · lead time = ${PLAN.recruitWeeks} weeks recruiting + training (A ${PLAN.trainWeeks.A}, C ${PLAN.trainWeeks.C}, D ${PLAN.trainWeeks.D}, E ${PLAN.trainWeeks.E} weeks) · **${m.hires.length} hiring asks** (${m.hires.filter((h) => h.late).length} already past their hire-by date) · **${m.surplus.length} gates carry surplus** above P90 in ${m.month}`, "",
    "## Over/under trend by product (daily average FTE)", "",
    `| Product | ${months.map((x) => `${x}${m.trend.find((t) => t.month === x)?.kind === "actual" ? " (actual)" : ""}`).join(" | ")} |`, `|---|${months.map(() => "---:").join("|")}|`,
    ...prods.map((p) => `| ${p} | ${months.map((x) => { const t = m.trend.find((y) => y.key === p && y.month === x); if (!t) return "—"; return t.kind === "actual" ? `in ${t.net_before >= 0 ? "+" : ""}${t.net_before} / out ${t.net_after >= 0 ? "+" : ""}${t.net_after} · SL ${Math.round((t.sl ?? 0) * 100)}%` : `${t.net_before >= 0 ? "+" : ""}${t.net_before} · SL ${Math.round((t.sl ?? 0) * 100)}%`; }).join(" | ")} |`),
    "", "*Actual months: net before the day (in) and after it (out), from the PDP history. Projected months: planned staff minus required at the central forecast.*", "",
    `## The locked plan for ${m.month}, by segment (worst first)`, "",
    "| Segment | Product | Required P50 | Required P90 | Planned staff | Over/under |", "|---|---|---:|---:|---:|---:|",
    ...segRows.map((r) => `| ${r.s} | ${r.product} | ${r.p50} | ${r.p90} | ${r.staff} | ${r.ou >= 0 ? "+" : ""}${r.ou} |`),
    "", "## Headcount runway with no hiring (by product: capacity vs required P50, daily FTE)", "",
    `| Product | ${rmonths.join(" | ")} |`, `|---|${rmonths.map(() => "---:").join("|")}|`,
    ...prods.map((p) => `| ${p} | ${rmonths.map((mo) => { const cap = byP(p, (x) => x.capacity, mo), req = byP(p, (x) => x.req_p50, mo); return `${cap} vs ${req} (${cap - req >= 0 ? "+" : ""}${r1(cap - req)})`; }).join(" | ")} |`),
    "", `## Hiring asks (${m.hires.length})`, "",
    ...(m.hires.length ? ["| Product | Gates | Heads needed | Earliest hire-by | Late |", "|---|---:|---:|---|---:|", ...["A", "C", "D", "E"].map((p) => { const h = m.hires.filter((x) => x.product === p); return h.length ? `| ${p} | ${h.length} | ${r1(h.reduce((s, x) => s + x.need_hc, 0))} | ${h.map((x) => x.hire_by).sort()[0]} | ${h.filter((x) => x.late).length} |` : `| ${p} | 0 | 0 | — | 0 |`; }), "", "| Gate | Segment | First short month | Heads needed | Hire by | |", "|---|---|---|---:|---|---|", ...m.hires.map((h) => `| ${h.gate} | ${h.segment} | ${h.month} | ${h.need_hc} | ${h.hire_by} | ${h.late ? "**too late to hire: mitigate (overtime, cross-train, shared pool)**" : ""} |`)] : ["None: from the locked month on, capacity under attrition stays within 3% of P50 on every gate."]),
    "", `## Surplus in ${m.month} (capacity above P90 by more than ${PLAN.surplusAboveP90Pct}%)`, "",
    ...(m.surplus.length ? ["| Gate | Product | Surplus FTE | What to do |", "|---|---|---:|---|", ...m.surplus.slice(0, 25).map((s) => `| ${s.gate} | ${s.product} | ${s.surplus_fte} | ${s.advice} |`)] : ["None."]),
    "", "*The lock is a version: a month is locked once, and a relock writes a new version beside the old one. Synthetic data.*", "",
  ];
  return out.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
