/**
 * contracts.ts — P7: the files the cycle needs from inside the walls, how they are checked, and how a
 * WFM export (IEX-style) is mapped onto them. Pure TypeScript: the same code runs in the CLI and in the
 * browser runner, so real data can stay on the work laptop.
 */
import type { Channel, Gate, Product } from "./registry";
import type { ExtractRow, LoggedEvent, OutlookRow } from "./world";
import { fromCsv } from "./csv";

export interface ColSpec { name: string; required: boolean; type: "date" | "int" | "num" | "share" | "text" | "channel" | "yn"; note: string }
export const CONTRACTS: Record<"registry" | "extract" | "events" | "outlook", { purpose: string; grain: string; cols: ColSpec[] }> = {
  registry: { purpose: "the gates the WFM platform plans for, and how each channel is served", grain: "one row per gate × channel", cols: [
    { name: "gate", required: true, type: "text", note: "the planning gate (CT) id" }, { name: "name", required: false, type: "text", note: "display name" },
    { name: "product", required: true, type: "text", note: "A, C, D or E (the product the gate rolls up to)" }, { name: "segment", required: true, type: "text", note: "segment code" },
    { name: "region", required: false, type: "text", note: "NA, EMEA or APAC (holidays)" }, { name: "pooled", required: false, type: "yn", note: "y for a shared pool" },
    { name: "open_start", required: true, type: "int", note: "first open hour (0–23)" }, { name: "open_end", required: true, type: "int", note: "hour it closes (1–24)" },
    { name: "channel", required: true, type: "channel", note: "voice, chat or email" }, { name: "target_sl", required: true, type: "share", note: "service-level target (0.8 or 80%)" },
    { name: "threshold_sec", required: true, type: "int", note: "answer threshold in seconds" }, { name: "concurrency", required: false, type: "num", note: "chat sessions per agent (1 otherwise)" },
    { name: "patience_sec", required: false, type: "int", note: "mean caller patience (voice/chat)" }, { name: "aht_basis", required: false, type: "text", note: "worked or elapsed (declared once, here)" },
  ] },
  extract: { purpose: "prior-day performance: what was forecast, what happened, how it was staffed and how it performed", grain: "one row per date × gate × channel", cols: [
    { name: "date", required: true, type: "date", note: "yyyy-mm-dd" }, { name: "gate", required: true, type: "text", note: "" }, { name: "channel", required: true, type: "channel", note: "" },
    { name: "fc_volume", required: true, type: "int", note: "forecast contacts" }, { name: "act_volume", required: true, type: "int", note: "actual contacts offered" },
    { name: "fc_aht_sec", required: true, type: "num", note: "forecast handle time (s)" }, { name: "act_aht_sec", required: true, type: "num", note: "actual handle time (s)" },
    { name: "fc_req_fte", required: true, type: "num", note: "forecast required (productive FTE)" }, { name: "sched_open_fte", required: true, type: "num", note: "scheduled open (productive FTE)" },
    { name: "act_req_fte", required: true, type: "num", note: "actual required (from actual volume and AHT)" }, { name: "act_fte", required: true, type: "num", note: "actual staff (productive FTE)" },
    { name: "offered", required: true, type: "int", note: "" }, { name: "handled", required: true, type: "int", note: "handled, never answered-in-threshold" },
    { name: "answered_in_sl", required: true, type: "int", note: "" }, { name: "abandoned", required: true, type: "int", note: "" },
    { name: "sl", required: true, type: "share", note: "answered in threshold ÷ offered" }, { name: "asa_sec", required: false, type: "num", note: "" }, { name: "target_sl", required: false, type: "share", note: "defaults to the registry" },
  ] },
  events: { purpose: "what operations logged: weather, outages, absence, holidays, migrations", grain: "one row per event", cols: [
    { name: "id", required: true, type: "text", note: "" }, { name: "start", required: true, type: "date", note: "" }, { name: "end", required: true, type: "date", note: "" },
    { name: "gates", required: true, type: "text", note: "* or gate ids separated by ;" }, { name: "channels", required: false, type: "text", note: "voice;chat;email by default" },
    { name: "type", required: true, type: "text", note: "weather, outage, absence, holiday, migration or other" }, { name: "description", required: false, type: "text", note: "" },
    { name: "source", required: false, type: "text", note: "" }, { name: "params", required: false, type: "text", note: "migration: from=…;to=…;share=…;planned_ratio=…" },
  ] },
  outlook: { purpose: "the forecast of record and the supply plan, forward", grain: "one row per date × gate × channel", cols: [
    { name: "as_of", required: true, type: "date", note: "the day the record was published" }, { name: "date", required: true, type: "date", note: "" }, { name: "gate", required: true, type: "text", note: "" },
    { name: "channel", required: true, type: "channel", note: "" }, { name: "fc_volume", required: true, type: "int", note: "" }, { name: "fc_aht_sec", required: true, type: "num", note: "" },
    { name: "fc_req_fte", required: false, type: "num", note: "recomputed if absent" }, { name: "planned_sched_fte", required: true, type: "num", note: "the supply plan" },
  ] },
};

export interface Problem { file: string; row: number | null; column: string | null; message: string }
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const r6 = (x: number) => Math.round(x * 1e6) / 1e6; // percent → share without floating-point dust (82.7% must be exactly 0.827)
const toNum = (v: string) => { const t = v.trim().replace(/,/g, ""); if (t === "") return NaN; if (t.endsWith("%")) return r6(+t.slice(0, -1) / 100); return +t; };

/** Parse one contract file: check columns and every value; return typed rows plus problems (never throws). */
export function parseContract(kind: keyof typeof CONTRACTS, text: string): { rows: Record<string, unknown>[]; problems: Problem[] } {
  const spec = CONTRACTS[kind]; const problems: Problem[] = []; const raw = fromCsv(text.replace(/^﻿/, ""));
  const header = raw.length ? Object.keys(raw[0]!) : [];
  for (const c of spec.cols.filter((x) => x.required)) if (!header.includes(c.name)) problems.push({ file: kind, row: null, column: c.name, message: "required column missing" });
  if (problems.length) return { rows: [], problems };
  const rows = raw.map((r, i) => {
    const out: Record<string, unknown> = {};
    for (const c of spec.cols) {
      const v = (r[c.name] ?? "").trim();
      if (v === "") { if (c.required) problems.push({ file: kind, row: i + 2, column: c.name, message: "empty" }); out[c.name] = c.type === "text" ? "" : null; continue; }
      if (c.type === "date") { if (!DATE.test(v)) problems.push({ file: kind, row: i + 2, column: c.name, message: `not yyyy-mm-dd: "${v}"` }); out[c.name] = v; }
      else if (c.type === "channel") { const ch = v.toLowerCase(); if (!["voice", "chat", "email"].includes(ch)) problems.push({ file: kind, row: i + 2, column: c.name, message: `unknown channel "${v}"` }); out[c.name] = ch; }
      else if (c.type === "yn") out[c.name] = /^(y|yes|true|1)$/i.test(v);
      else if (c.type === "text") out[c.name] = v;
      else { let n = toNum(v); if (c.type === "share" && n > 1) n = r6(n / 100); if (!Number.isFinite(n)) problems.push({ file: kind, row: i + 2, column: c.name, message: `not a number: "${v}"` }); else if (n < 0) problems.push({ file: kind, row: i + 2, column: c.name, message: "negative" }); out[c.name] = n; }
    }
    return out;
  });
  return { rows, problems };
}

/** Registry rows (gate × channel) → gates. Synthetic-only fields get neutral defaults. */
export function gatesFromRegistry(rows: Record<string, unknown>[]): Gate[] {
  const by = new Map<string, Gate>();
  for (const r of rows) {
    const id = String(r.gate); const ch = r.channel as Channel;
    const g = by.get(id) ?? { id, name: String(r.name || id), product: String(r.product) as Product, segment: String(r.segment), region: (String(r.region || "NA") as Gate["region"]), pooled: !!r.pooled,
      sizeFte: 0, openHours: [Number(r.open_start), Number(r.open_end)] as [number, number], weatherSensitivity: 0.5, trendPerYear: 0, reviewThresholdPct: 5, channels: [] };
    g.channels.push({ channel: ch, baseDaily: 0, ahtSec: 0, ahtBasis: (String(r.aht_basis || (ch === "chat" ? "elapsed" : "worked")) as "worked" | "elapsed"), concurrency: Number(r.concurrency ?? 1) || 1,
      targetSL: Number(r.target_sl), thresholdSec: Number(r.threshold_sec), patienceSec: Number(r.patience_sec ?? (ch === "email" ? 0 : 300)) || (ch === "email" ? 0 : 300), noiseCv: 0 });
    by.set(id, g);
  }
  return [...by.values()];
}

export interface Dataset { gates: Gate[]; extract: ExtractRow[]; events: LoggedEvent[]; outlook: OutlookRow[] }

/** All four files → a dataset the cycle can run on, plus every problem found (cross-file checks included). */
export function loadDataset(texts: { registry: string; extract: string; events?: string; outlook: string }): { data: Dataset | null; problems: Problem[]; summary: string } {
  const reg = parseContract("registry", texts.registry), ex = parseContract("extract", texts.extract), ol = parseContract("outlook", texts.outlook);
  const ev = texts.events ? parseContract("events", texts.events) : { rows: [], problems: [] };
  const problems = [...reg.problems, ...ex.problems, ...ol.problems, ...ev.problems];
  const gates = gatesFromRegistry(reg.rows); const known = new Set(gates.flatMap((g) => g.channels.map((c) => `${g.id}/${c.channel}`)));
  const seen = new Set<string>(); const dates = new Set<string>();
  ex.rows.forEach((r, i) => {
    const k = `${r.gate}/${r.channel}`; if (!known.has(k)) problems.push({ file: "extract", row: i + 2, column: "gate", message: `${k} is not in the registry` });
    const d = `${r.date}|${k}`; if (seen.has(d)) problems.push({ file: "extract", row: i + 2, column: "date", message: `duplicate ${d}` }); seen.add(d); dates.add(String(r.date));
    if (Number(r.answered_in_sl) > Number(r.handled)) problems.push({ file: "extract", row: i + 2, column: "answered_in_sl", message: "answered in threshold exceeds handled (handled must be handled, not answered-in-threshold)" });
    if (Number(r.handled) > Number(r.offered)) problems.push({ file: "extract", row: i + 2, column: "handled", message: "handled exceeds offered" });
  });
  const sorted = [...dates].sort(); const gaps: string[] = [];
  for (let i = 1; i < sorted.length; i++) { const a = Date.parse(sorted[i - 1]!), b = Date.parse(sorted[i]!); if (b - a > 86400000) gaps.push(`${sorted[i - 1]} → ${sorted[i]}`); }
  if (gaps.length) problems.push({ file: "extract", row: null, column: "date", message: `missing days: ${gaps.slice(0, 5).join(", ")}${gaps.length > 5 ? "…" : ""}` });
  const last = sorted[sorted.length - 1] ?? ""; const asOf = new Set(ol.rows.map((r) => String(r.as_of)));
  if (asOf.size > 1) problems.push({ file: "outlook", row: null, column: "as_of", message: `more than one as_of: ${[...asOf].join(", ")}` });
  ol.rows.forEach((r, i) => { if (!known.has(`${r.gate}/${r.channel}`)) problems.push({ file: "outlook", row: i + 2, column: "gate", message: `${r.gate}/${r.channel} is not in the registry` }); });
  if (ol.rows.length && last && String(ol.rows[0]!.as_of) <= last) problems.push({ file: "outlook", row: null, column: "as_of", message: `as_of ${ol.rows[0]!.as_of} must be after the last extract day ${last}` });
  const fatal = problems.some((p) => p.row === null || p.file === "registry") || problems.length > 50;
  const summary = `${gates.length} gates · ${known.size} gate-channels · extract ${ex.rows.length} rows (${sorted[0] ?? "—"} → ${last || "—"}) · ${ev.rows.length} events · outlook ${ol.rows.length} rows · ${problems.length} problem(s)`;
  if (fatal || problems.some((p) => p.file === "extract" && /registry|duplicate|exceeds/.test(p.message))) return { data: null, problems, summary };
  const extract = (ex.rows as unknown as ExtractRow[]).map((r) => ({ ...r, asa_sec: r.asa_sec ?? null, target_sl: (r.target_sl as number | null) ?? gates.find((g) => g.id === r.gate)!.channels.find((c) => c.channel === r.channel)!.targetSL }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.gate.localeCompare(b.gate) || a.channel.localeCompare(b.channel));
  const events = (ev.rows as unknown as LoggedEvent[]).map((e) => ({ ...e, channels: e.channels || "voice;chat;email", params: e.params || "", description: e.description || "", source: e.source || "" }));
  return { data: { gates, extract, events, outlook: ol.rows as unknown as OutlookRow[] }, problems, summary };
}

// ---- mapping a WFM export onto a contract ----------------------------------------------------------
export type Transform = "mmss" | "pct" | "mdy" | "lower" | "none";
export interface Mapping { contract: keyof typeof CONTRACTS; columns: Record<string, string | { from: string; transform: Transform }>; constants?: Record<string, string> }

const mmss = (v: string) => { const p = v.trim().split(":").map(Number); return p.length === 3 ? p[0]! * 3600 + p[1]! * 60 + p[2]! : p.length === 2 ? p[0]! * 60 + p[1]! : Number(v); };
const mdy = (v: string) => { const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[1]!.padStart(2, "0")}-${m[2]!.padStart(2, "0")}` : v; };
function apply(t: Transform, v: string): string { if (v === undefined || v === null) return ""; switch (t) { case "mmss": return v.trim() ? String(mmss(v)) : ""; case "pct": return v.trim() ? String(toNum(v.includes("%") ? v : `${v}%`)) : ""; case "mdy": return mdy(v); case "lower": return v.trim().toLowerCase(); default: return v; } }

/** Re-key an export into contract columns (CSV text out), so the contract parser checks it like any other file. */
export function mapExport(text: string, m: Mapping): { csv: string; problems: Problem[] } {
  const raw = fromCsv(text.replace(/^﻿/, "")); const problems: Problem[] = []; const header = raw.length ? Object.keys(raw[0]!) : [];
  const cols = Object.entries(m.columns).map(([to, src]) => ({ to, from: typeof src === "string" ? src : src.from, t: (typeof src === "string" ? "none" : src.transform) as Transform }));
  for (const c of cols) if (!header.includes(c.from)) problems.push({ file: m.contract, row: null, column: c.from, message: `export column "${c.from}" (for ${c.to}) not found` });
  const outCols = [...cols.map((c) => c.to), ...Object.keys(m.constants ?? {})];
  const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [outCols.join(","), ...raw.map((r) => [...cols.map((c) => cell(apply(c.t, r[c.from] ?? ""))), ...Object.values(m.constants ?? {}).map(cell)].join(","))];
  return { csv: lines.join("\n") + "\n", problems };
}

/** The default mapping for an IEX-style daily performance export (edit the right-hand names to match yours). */
export const IEX_PDP_MAPPING: Mapping = { contract: "extract", columns: {
  date: { from: "Date", transform: "mdy" }, gate: "CT", channel: { from: "Queue Type", transform: "lower" },
  fc_volume: "Fcst Contacts", act_volume: "Act Contacts", fc_aht_sec: { from: "Fcst AHT", transform: "mmss" }, act_aht_sec: { from: "Act AHT", transform: "mmss" },
  fc_req_fte: "Fcst Req", sched_open_fte: "Sched Open", act_req_fte: "Act Req", act_fte: "Act Open",
  offered: "Offered", handled: "Handled", answered_in_sl: "Ans in SL", abandoned: "Abandoned", sl: { from: "SL %", transform: "pct" }, asa_sec: { from: "ASA", transform: "mmss" },
} };
