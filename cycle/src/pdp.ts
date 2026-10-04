/**
 * pdp.ts — Stage 1: prior-day performance. Reads the raw extract for one day and returns, per
 * gate × channel and per gate: variances, net before and after the day, the walk between them,
 * how the day was set up, the outcome against target, the logged events that touch it, and a verdict.
 *
 * The walk is an identity, not a model:
 *   net_after − net_before = (act_fte − sched_open_fte) − (act_req_fte − fc_req_fte)
 *                          =  supply delivery          −  demand surprise
 */
import type { ExtractRow, LoggedEvent } from "./world";
import { GATES } from "./registry";

export type Setup = "short" | "right-sized" | "overhead";
export interface PdpLine {
  date: string; gate: string; channel: string;
  fc_volume: number; act_volume: number; vol_var_pct: number;
  fc_aht_sec: number; act_aht_sec: number; aht_var_pct: number;
  fc_req_fte: number; sched_open_fte: number; act_req_fte: number; act_fte: number;
  net_before: number; net_after: number; supply_delivery: number; demand_surprise: number;
  setup: Setup; sl: number; target_sl: number; sl_gap_pts: number; asa_sec: number | null; abandon_pct: number;
  driver: "demand" | "supply" | "both" | "none"; events: string[]; checks: string[];
}
export interface Rollup {
  key: string; level: "gate" | "segment" | "product"; product: string; segment: string; gates: number; channels: string[];
  fc_volume: number; act_volume: number; vol_var_pct: number; fc_req_fte: number; sched_open_fte: number; act_req_fte: number; act_fte: number;
  net_before: number; net_after: number; supply_delivery: number; demand_surprise: number; setup: Setup; driver: PdpLine["driver"];
  events: string[]; worst_sl_gap_pts: number; below_target: number;
}
export interface PdpReport { date: string; lines: PdpLine[]; gates: Rollup[]; segments: Rollup[]; products: Rollup[]; missing: string[]; failed: string[] }

const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (a: number, f: number) => (f ? r1(((a - f) / f) * 100) : 0);
export const SETUP_BAND = { shortBelowPct: -3, overheadAbovePct: 8 }; // net before as % of forecast required

export function setupOf(netBefore: number, fcReq: number): Setup {
  const p = fcReq ? (netBefore / fcReq) * 100 : 0;
  return p < SETUP_BAND.shortBelowPct ? "short" : p > SETUP_BAND.overheadAbovePct ? "overhead" : "right-sized";
}

/** Contract checks on one extract row. Any failure halts that gate-channel for the day. */
export function checkRow(r: ExtractRow): string[] {
  const c: string[] = [];
  if (r.answered_in_sl > r.handled) c.push("answered_in_sl > handled");
  if (r.handled > r.offered) c.push("handled > offered");
  if (r.offered !== r.act_volume) c.push("offered ≠ act_volume");
  for (const k of ["fc_req_fte", "sched_open_fte", "act_req_fte", "act_fte", "fc_volume", "act_volume"] as const) if (!(r[k] >= 0)) c.push(`${k} missing or negative`);
  for (const k of ["fc_aht_sec", "act_aht_sec"] as const) if (r.act_volume > 0 && !(r[k] >= 60 && r[k] <= 7200)) c.push(`${k} outside 1–120 min`);
  if (!(r.sl >= 0 && r.sl <= 1)) c.push("sl outside 0–1");
  return c;
}

const touches = (e: LoggedEvent, r: { date: string; gate: string; channel?: string }) =>
  e.start <= r.date && r.date <= e.end && (e.gates === "*" || e.gates.split(";").includes(r.gate)) && (!r.channel || e.channels.split(";").includes(r.channel));

export function pdpFor(date: string, extract: ExtractRow[], events: LoggedEvent[]): PdpReport {
  const rows = extract.filter((r) => r.date === date);
  const expected = GATES.flatMap((g) => g.channels.map((c) => `${g.id}/${c.channel}`));
  const have = new Set(rows.map((r) => `${r.gate}/${r.channel}`));
  const missing = expected.filter((k) => !have.has(k));
  const failed: string[] = []; const lines: PdpLine[] = [];
  for (const r of rows) {
    const checks = checkRow(r);
    if (checks.length) failed.push(`${r.gate}/${r.channel}: ${checks.join("; ")}`);
    const netBefore = r1(r.sched_open_fte - r.fc_req_fte), netAfter = r1(r.act_fte - r.act_req_fte);
    const supply = r1(r.act_fte - r.sched_open_fte), demand = r1(r.act_req_fte - r.fc_req_fte);
    const gap = r1((r.sl - r.target_sl) * 100);
    const thr = Math.max(1, 0.03 * r.fc_req_fte);
    const dHurts = demand > thr, sHurts = supply < -thr;
    lines.push({
      date, gate: r.gate, channel: r.channel, fc_volume: r.fc_volume, act_volume: r.act_volume, vol_var_pct: pct(r.act_volume, r.fc_volume),
      fc_aht_sec: r.fc_aht_sec, act_aht_sec: r.act_aht_sec, aht_var_pct: pct(r.act_aht_sec, r.fc_aht_sec),
      fc_req_fte: r.fc_req_fte, sched_open_fte: r.sched_open_fte, act_req_fte: r.act_req_fte, act_fte: r.act_fte,
      net_before: netBefore, net_after: netAfter, supply_delivery: supply, demand_surprise: demand, setup: setupOf(netBefore, r.fc_req_fte),
      sl: r.sl, target_sl: r.target_sl, sl_gap_pts: gap, asa_sec: r.asa_sec, abandon_pct: r.offered ? r1((r.abandoned / r.offered) * 100) : 0,
      driver: dHurts && sHurts ? "both" : dHurts ? "demand" : sHurts ? "supply" : "none",
      events: events.filter((e) => touches(e, r)).map((e) => `${e.type}: ${e.description}`), checks,
    });
  }
  const byId = new Map(GATES.map((g) => [g.id, g]));
  const roll = (level: Rollup["level"], key: string, ls: PdpLine[]): Rollup => {
    const sum = (k: keyof PdpLine) => r1(ls.reduce((s, l) => s + (l[k] as number), 0));
    const g0 = byId.get(ls[0]!.gate)!;
    const nb = sum("net_before"), fr = sum("fc_req_fte"), d = sum("demand_surprise"), sp = sum("supply_delivery"), thr = Math.max(1, 0.03 * fr);
    return { key, level, product: g0.product, segment: level === "product" ? "*" : g0.segment, gates: new Set(ls.map((l) => l.gate)).size, channels: [...new Set(ls.map((l) => l.channel))],
      fc_volume: sum("fc_volume"), act_volume: sum("act_volume"), vol_var_pct: pct(sum("act_volume"), sum("fc_volume")),
      fc_req_fte: fr, sched_open_fte: sum("sched_open_fte"), act_req_fte: sum("act_req_fte"), act_fte: sum("act_fte"), net_before: nb, net_after: sum("net_after"),
      supply_delivery: sp, demand_surprise: d, setup: setupOf(nb, fr), driver: d > thr && sp < -thr ? "both" : d > thr ? "demand" : sp < -thr ? "supply" : "none",
      events: [...new Set(ls.flatMap((l) => l.events))], worst_sl_gap_pts: Math.min(...ls.map((l) => l.sl_gap_pts)), below_target: ls.filter((l) => l.sl_gap_pts < -5).length };
  };
  const group = (f: (l: PdpLine) => string) => { const m = new Map<string, PdpLine[]>(); for (const l of lines) { const k = f(l); m.set(k, [...(m.get(k) ?? []), l]); } return m; };
  const gates = [...group((l) => l.gate)].map(([k, ls]) => roll("gate", k, ls));
  const segments = [...group((l) => byId.get(l.gate)!.segment)].map(([k, ls]) => roll("segment", k, ls)).sort((a, b) => a.key.localeCompare(b.key));
  const products = [...group((l) => byId.get(l.gate)!.product)].map(([k, ls]) => roll("product", k, ls)).sort((a, b) => a.key.localeCompare(b.key));
  return { date, lines, gates, segments, products, missing, failed };
}

/** One sentence per gate-channel: the outcome, how the day was set up, and what moved. */
export function verdict(l: PdpLine): string {
  const sl = `${Math.round(l.sl * 100)}% vs ${Math.round(l.target_sl * 100)}%`;
  const set = l.setup === "short" ? `went in short (${l.net_before} FTE)` : l.setup === "overhead" ? `went in with overhead (+${l.net_before} FTE)` : `went in right-sized (${l.net_before >= 0 ? "+" : ""}${l.net_before} FTE)`;
  const why = l.driver === "none" ? "demand and staffing landed close to plan"
    : l.driver === "demand" ? `demand ran ${l.vol_var_pct >= 0 ? "+" : ""}${l.vol_var_pct}% volume and ${l.aht_var_pct >= 0 ? "+" : ""}${l.aht_var_pct}% AHT, +${l.demand_surprise} FTE of work`
    : l.driver === "supply" ? `staff delivered ${l.supply_delivery} FTE against schedule`
    : `demand +${l.demand_surprise} FTE of work and staff ${l.supply_delivery} FTE against schedule`;
  return `${l.gate} ${l.channel}: SL ${sl}; ${set}; ${why}; finished ${l.net_after >= 0 ? "+" : ""}${l.net_after} FTE.${l.events.length ? ` Logged: ${l.events.join("; ")}.` : ""}`;
}

export function pdpMarkdown(p: PdpReport): string {
  const miss = p.lines.filter((l) => l.sl_gap_pts < -5).sort((a, b) => a.sl_gap_pts - b.sl_gap_pts);
  const head = "| Vol var | Fc req | Sched | Net before | Setup | Act req | Act staff | Net after | Demand surprise | Supply delivery | Driver | Below target | Worst gap |";
  const sep = "|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---|---:|---:|";
  const row = (r: Rollup) => `| ${r.vol_var_pct}% | ${r.fc_req_fte} | ${r.sched_open_fte} | ${r.net_before} | ${r.setup} | ${r.act_req_fte} | ${r.act_fte} | ${r.net_after} | ${r.demand_surprise >= 0 ? "+" : ""}${r.demand_surprise} | ${r.supply_delivery >= 0 ? "+" : ""}${r.supply_delivery} | ${r.driver} | ${r.below_target} | ${r.worst_sl_gap_pts} pts |`;
  const trouble = p.segments.filter((r) => r.below_target || r.setup === "short");
  const badGates = p.gates.filter((r) => r.below_target).sort((a, b) => a.worst_sl_gap_pts - b.worst_sl_gap_pts);
  const out = [
    `# Prior-day performance · ${p.date}`, "",
    `${p.products.length} products · ${p.segments.length} segments · ${p.gates.length} gates · ${p.lines.length} gate-channels · **${miss.length} gate-channels below target by more than 5 points** in ${badGates.length} gates · ${p.gates.filter((g) => g.setup === "short").length} gates went in short`,
    p.missing.length ? `\n**Missing from the extract:** ${p.missing.join(", ")}` : "",
    p.failed.length ? `\n**Contract checks failed (held out of the cycle):** ${p.failed.join(" · ")}` : "",
    "", "## By product", "", `| Product | Gates ${head}`, `|---|---:${sep}`, ...p.products.map((r) => `| ${r.key} | ${r.gates} ${row(r)}`),
    "", `## Segments below target or going in short (${trouble.length} of ${p.segments.length})`, "", `| Segment | Gates ${head}`, `|---|---:${sep}`, ...trouble.map((r) => `| ${r.key} | ${r.gates} ${row(r)}`),
    "", `## Gates below target (${badGates.length})`, "", `| Gate | Segment ${head}`, `|---|---${sep}`, ...badGates.map((r) => `| ${r.key} | ${r.segment} ${row(r)}`),
    "", "## Gate-channels below target, worst first", "", ...(miss.length ? miss.slice(0, 25).map((l) => `- ${verdict(l)}`) : ["- None."]), miss.length > 25 ? `- …and ${miss.length - 25} more in the CSV.` : "",
    "", "*Net before = scheduled open − forecast required. Net after = actual staff − actual required. Net after − net before = supply delivery − demand surprise (an identity). FTE are productive. Full gate-channel detail in the CSV. Synthetic data.*", "",
  ];
  return out.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
