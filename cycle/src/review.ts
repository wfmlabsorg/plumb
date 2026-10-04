/**
 * review.ts — P5: the owner review packet and the publish step.
 *
 * PACKET   Every gate, biggest movers first: change vs the record, why it moved, the 26-week series
 *          (record need, proposed need, planned staff), recent flags and signals. A fingerprint of
 *          the proposal travels with it.
 * PUBLISH  Reads the packet and the signed decisions. Refuses when a gate is undecided, the file is
 *          unsigned, or the proposal changed after review (stale). Otherwise writes a new versioned
 *          forecast of record: approved gates take the proposal, edited gates take the proposal with
 *          the reviewer's adjustment (kept as a human overlay), rejected gates keep the record.
 */
import { GATES, gate as gateOf } from "./registry";
import { addDays, required } from "./world";
import { reviewList, weekly, type CycleState, type ProposedRow } from "./reforecast";
import type { Signal } from "./signals";

export interface GateCard {
  gate: string; name: string; product: string; segment: string; channels: string[]; order: number;
  change_pct: number; record_avg: number; proposed_avg: number; why: string[];
  weeks: { week: string; record: number; proposed: number; staff: number; p10: number; p90: number }[];
  flags: string[]; signals: string[];
}
export interface Packet { schema: "plumb.review/1"; asOf: string; created: string; weeks: number; hash: string; gates: GateCard[] }
export type Action = "approve" | "edit" | "reject";
export interface Decision { gate: string; action: Action; reason?: string; edit?: { pct: number; from: string; to: string; channel?: string } }
export interface Decisions { schema: "plumb.decisions/1"; packet_hash: string; asOf: string; decisions: Decision[]; signature?: { name: string; role: string; at: string; bulk_approved: string[] } }

/** Fingerprint of what was proposed: if any proposed number changes, the hash changes and old decisions go stale. */
export function proposalHash(asOf: string, rows: ProposedRow[]): string {
  // portable 64-bit FNV-1a (two 32-bit lanes): identical in the CLI and the browser runner; a fingerprint, not a secret
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x9e3779b9;
  const feed = (s: string) => { for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193); b = Math.imul(b ^ c, 0x01000193) ^ (a >>> 7); } };
  feed(asOf); for (const r of rows) feed(`|${r.date}|${r.gate}|${r.channel}|${r.fc_volume_proposed}|${r.fc_aht_proposed}|${r.req_proposed_fte}`);
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

export function buildPacket(st: CycleState, rows: ProposedRow[], signals: Signal[] = [], weeks = 26): Packet {
  const review = reviewList(st, rows, weeks);
  const gw = weekly(rows, (r) => r.gate, weeks);
  const recW = new Map<string, number>(); // record need, weekly average
  const start = rows[0]!.as_of;
  for (const r of rows) { const i = Math.round((Date.parse(r.date) - Date.parse(start)) / 86400000); if (i >= weeks * 7) continue; const k = `${addDays(start, Math.floor(i / 7) * 7)}|${r.gate}`; recW.set(k, (recW.get(k) ?? 0) + r.fc_req_fte / 7); }
  const gates: GateCard[] = review.map((rv, i) => {
    const g = gateOf(rv.gate); const why: string[] = [];
    if (Math.abs(rv.vol_correction_pct) >= 1) why.push(`learned volume correction ${rv.vol_correction_pct >= 0 ? "+" : ""}${rv.vol_correction_pct}% vs record`);
    if (Math.abs(rv.aht_correction_pct) >= 1) why.push(`learned handle-time correction ${rv.aht_correction_pct >= 0 ? "+" : ""}${rv.aht_correction_pct}%`);
    if (rv.overlay) why.push(`migration overlay: ${rv.overlay.toLocaleString()} contacts at the observed contact ratio`);
    const sigRows = rows.filter((r) => r.gate === g.id && r.signal_overlay_volume); if (sigRows.length) why.push(`applied signals: ${sigRows.reduce((s, r) => s + r.signal_overlay_volume, 0).toLocaleString()} contacts`);
    if (rv.shifts) why.push(`level shift: ${rv.shifts}`);
    if (!why.length) why.push("no material learning; proposal ≈ record");
    const card: GateCard = {
      gate: g.id, name: g.name, product: g.product, segment: g.segment, channels: g.channels.map((c) => c.channel), order: i + 1,
      change_pct: rv.workload_change_pct, record_avg: 0, proposed_avg: 0, why,
      weeks: gw.filter((x) => x.key === g.id).map((x) => ({ week: x.week, record: Math.round((recW.get(`${x.week}|${g.id}`) ?? 0) * 10) / 10, proposed: x.req, staff: x.sched, p10: x.req_p10, p90: x.req_p90 })),
      flags: st.detected.filter((d) => d.date >= addDays(st.asOf, -7) && d.gates.includes(g.id)).map((d) => `${d.date} ${d.kind}: ${d.detail}`),
      signals: signals.filter((s) => s.gates.includes(g.id) && s.kind === "forward").map((s) => `${s.id} (${s.grade}, ${s.status}): ${s.type} ${s.direction === "up" ? "+" : s.direction === "down" ? "−" : ""}${s.pct ?? ""}${s.pct !== null ? "%" : ""} from ${s.start}`),
    };
    card.record_avg = Math.round((card.weeks.reduce((s, w) => s + w.record, 0) / Math.max(card.weeks.length, 1)) * 10) / 10;
    card.proposed_avg = Math.round((card.weeks.reduce((s, w) => s + w.proposed, 0) / Math.max(card.weeks.length, 1)) * 10) / 10;
    return card;
  });
  return { schema: "plumb.review/1", asOf: st.asOf, created: new Date().toISOString(), weeks, hash: proposalHash(st.asOf, rows), gates };
}

// ---- publish ---------------------------------------------------------------------------------------
/** A published row keeps its own breakdown, so it can be scored layer by layer when the actuals arrive. */
export interface RecordRow { version: string; date: string; gate: string; channel: string; volume: number; aht_sec: number; req_fte: number; source: "proposal" | "edited" | "record"; human_overlay_pct: number;
  prior_record_volume: number; proposal_volume: number; migration_overlay_volume: number; signal_overlay_volume: number }
export interface PublishResult { ok: boolean; problems: string[]; version?: string; rows?: RecordRow[]; summary?: { approved: number; edited: number; rejected: number; signer: string } }

export function publish(packet: Packet, d: Decisions, rows: ProposedRow[]): PublishResult {
  const problems: string[] = [];
  if (d.schema !== "plumb.decisions/1") problems.push("not a decisions file");
  if (d.packet_hash !== packet.hash) problems.push(`decisions were made on a different packet (${d.packet_hash} ≠ ${packet.hash})`);
  const current = proposalHash(packet.asOf, rows); if (current !== packet.hash) problems.push(`the proposal changed after review (now ${current}): regenerate the packet and review again`);
  if (!d.signature?.name || !d.signature.role || !d.signature.at) problems.push("unsigned: nothing is published without a signature");
  const by = new Map(d.decisions.map((x) => [x.gate, x]));
  const undecided = packet.gates.filter((g) => !by.has(g.gate)).map((g) => g.gate); if (undecided.length) problems.push(`${undecided.length} gate(s) undecided: ${undecided.slice(0, 8).join(", ")}${undecided.length > 8 ? "…" : ""}`);
  for (const x of d.decisions) {
    if (!packet.gates.some((g) => g.gate === x.gate)) problems.push(`${x.gate}: not in the packet`);
    if ((x.action === "edit" || x.action === "reject") && !(x.reason ?? "").trim()) problems.push(`${x.gate}: an ${x.action} needs a reason`);
    if (x.action === "edit" && (!x.edit || !Number.isFinite(x.edit.pct) || Math.abs(x.edit.pct) > 50 || !x.edit.from || !x.edit.to || x.edit.from > x.edit.to)) problems.push(`${x.gate}: an edit needs a percentage within ±50 and a valid date range`);
  }
  if (problems.length) return { ok: false, problems };
  const version = `${packet.asOf}@${d.signature!.at.slice(0, 16)}`; const out: RecordRow[] = [];
  for (const r of rows) {
    const x = by.get(r.gate)!; const g = gateOf(r.gate); const c = g.channels.find((y) => y.channel === r.channel)!;
    const parts = { prior_record_volume: r.fc_volume, proposal_volume: r.fc_volume_proposed, migration_overlay_volume: r.overlay_volume, signal_overlay_volume: r.signal_overlay_volume };
    if (x.action === "reject") { out.push({ version, date: r.date, gate: r.gate, channel: r.channel, volume: r.fc_volume, aht_sec: r.fc_aht_sec, req_fte: r.fc_req_fte, source: "record", human_overlay_pct: 0, ...parts }); continue; }
    const inEdit = x.action === "edit" && r.date >= x.edit!.from && r.date <= x.edit!.to && (!x.edit!.channel || x.edit!.channel === r.channel);
    const f = inEdit ? 1 + x.edit!.pct / 100 : 1; const vol = Math.round(r.fc_volume_proposed * f);
    out.push({ version, date: r.date, gate: r.gate, channel: r.channel, volume: vol, aht_sec: r.fc_aht_proposed, req_fte: inEdit ? +required(g, c, vol, r.fc_aht_proposed).fte.toFixed(1) : r.req_proposed_fte, source: inEdit ? "edited" : "proposal", human_overlay_pct: inEdit ? x.edit!.pct : 0, ...parts });
  }
  const count = (a: Action) => d.decisions.filter((x) => x.action === a).length;
  return { ok: true, problems: [], version, rows: out, summary: { approved: count("approve"), edited: count("edit"), rejected: count("reject"), signer: `${d.signature!.name} (${d.signature!.role})` } };
}

/** What a WFM platform loads: one row per gate × channel × day (read-only first; write-back later). */
export const wfmExport = (rows: RecordRow[]) => rows.map((r) => ({ gate: r.gate, channel: r.channel, date: r.date, volume: r.volume, aht_sec: r.aht_sec }));
export { GATES };
