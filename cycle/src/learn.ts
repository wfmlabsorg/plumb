/**
 * learn.ts — P6: does each layer of the forecast earn its place?
 *
 *  BACKTEST   From every Monday origin, rebuild what the cycle knew the day before and forecast four
 *             weeks: record → + learned volume → + learned AHT → + migration ratio. Score workload
 *             (volume × AHT) against actuals: WAPE, bias, and forecast value added (FVA) per layer.
 *  FORWARD    Score the frozen proposal of one as-of date against the actuals that arrived after it,
 *             layer by layer, then each applied signal and each human edit on its own gate-days, plus
 *             the counterfactual of signals that were NOT applied (a rumor that would have hurt).
 *  EARNING    A gate may be auto-approved (when it barely moves) once its proposal has beaten or
 *             matched the record in ≥80% of recent windows and never lost by more than 2 points.
 *  EFFECTS    What logged storms and outages actually did to volume and handle time, by product.
 */
import { GATES, gate as gateOf } from "./registry";
import { addDays, dow, type ExtractRow, type LoggedEvent } from "./world";
import type { CycleState, Migration, ProposedRow } from "./reforecast";
import type { Overlay, Signal } from "./signals";
import type { Decision } from "./review";

export const EARN = { winShare: 0.8, tolPts: 0.5, maxLossPts: 2, window: 12 };
const r2 = (x: number) => Math.round(x * 100) / 100;
export interface Acc { abs: number; err: number; act: number; n: number }
const acc = (): Acc => ({ abs: 0, err: 0, act: 0, n: 0 });
const add = (a: Acc, f: number, act: number) => { a.abs += Math.abs(f - act); a.err += f - act; a.act += act; a.n++; };
export const wape = (a: Acc) => (a.act ? (a.abs / a.act) * 100 : 0);
export const bias = (a: Acc) => (a.act ? (a.err / a.act) * 100 : 0);

const shareAt = (m: Migration, d: string) => { let s = 0; for (const w of m.waves) if (d >= w.date) s = w.share; return s; };
const migPlanned = (m: Migration, d: string, fcFrom?: number) => { const sh = shareAt(m, d); return !sh || fcFrom === undefined || sh >= 1 ? 0 : (fcFrom / (1 - sh)) * sh * m.plannedRatio; };

// ---- backtest ---------------------------------------------------------------------------------------
export const LAYERS = ["record", "+ learned volume", "+ learned AHT", "+ migration ratio", "earned (walk-forward)", "shift-gated"] as const;
export const SHIFT_GATE = { days: 70 }; // use a learned correction only this long after a confirmed shift
export const EARNED = { lookback: 8, marginPts: 0.25 };
export interface Backtest { origins: string[]; horizonDays: number; total: Acc[]; byProduct: Map<string, Acc[]>; byGateOrigin: Map<string, { origin: string; record: number; proposal: number }[]> }

export function backtest(extract: ExtractRow[], st: CycleState, horizonDays = 28, from = "2026-01-05"): Backtest {
  const last = extract[extract.length - 1]!.date; const origins: string[] = [];
  for (let d = from; addDays(d, horizonDays - 1) <= last; d = addDays(d, 7)) if (dow(d) === 1) origins.push(d);
  const byKey = new Map<string, ExtractRow>(); for (const r of extract) byKey.set(`${r.date}|${r.gate}|${r.channel}`, r);
  const total = LAYERS.map(acc); const byProduct = new Map<string, Acc[]>(); const byGateOrigin = new Map<string, { origin: string; record: number; proposal: number }[]>();
  for (const o of origins) {
    const known = addDays(o, -1); const gateAcc = new Map<string, Acc[]>();
    // walk-forward: each gate uses its learned corrections in this window only if they beat the record in EARLIER windows
    const earnedNow = new Set(GATES.filter((g) => { const h = (byGateOrigin.get(g.id) ?? []).slice(-EARNED.lookback); if (h.length < 4) return false;
      const rec = h.reduce((s, x) => s + x.record, 0) / h.length, pro = h.reduce((s, x) => s + x.proposal, 0) / h.length; return pro < rec - EARNED.marginPts; }).map((g) => g.id));
    for (const g of GATES) for (const c of g.channels) {
      const s = st.series.get(`${g.id}/${c.channel}`); const L = s?.trail.get(known) ?? 0, La = s?.trailA.get(known) ?? 0;
      const mig = st.migrations.find((m) => m.to === g.id); const R = mig?.Rtrail.get(known)?.get(c.channel) ?? mig?.plannedRatio ?? 1;
      for (let i = 0; i < horizonDays; i++) {
        const d = addDays(o, i); const r = byKey.get(`${d}|${g.id}|${c.channel}`); if (!r) continue;
        const mp = mig ? migPlanned(mig, d, byKey.get(`${d}|${mig.from}|${c.channel}`)?.fc_volume) : 0;
        const own = Math.max(0, r.fc_volume - mp);
        const mOver = mp * (R / (mig?.plannedRatio ?? 1));
        const e = earnedNow.has(g.id);
        const sg = !!s?.shifts.some((x) => x.date <= known && addDays(x.date, SHIFT_GATE.days) >= known); // a confirmed run, recently
        const vol = [r.fc_volume, own * Math.exp(L) + mp, own * Math.exp(L) + mp, own * Math.exp(L) + mOver, (e ? own * Math.exp(L) : own) + mOver, (sg ? own * Math.exp(L) : own) + mOver];
        const aht = [r.fc_aht_sec, r.fc_aht_sec, r.fc_aht_sec * Math.exp(La), r.fc_aht_sec * Math.exp(La), e ? r.fc_aht_sec * Math.exp(La) : r.fc_aht_sec, r.fc_aht_sec];
        const act = r.act_volume * r.act_aht_sec / 3600; // workload hours
        const ga = gateAcc.get(g.id) ?? LAYERS.map(acc); gateAcc.set(g.id, ga); const pa = byProduct.get(g.product) ?? LAYERS.map(acc); byProduct.set(g.product, pa);
        LAYERS.forEach((_, k) => { const f = (vol[k]! * aht[k]!) / 3600; add(total[k]!, f, act); add(pa[k]!, f, act); add(ga[k]!, f, act); });
      }
    }
    for (const [g, a] of gateAcc) { const x = byGateOrigin.get(g) ?? []; x.push({ origin: o, record: r2(wape(a[0]!)), proposal: r2(wape(a[3]!)) }); byGateOrigin.set(g, x); }
  }
  return { origins, horizonDays, total, byProduct, byGateOrigin };
}

export interface Earned { gate: string; product: string; windows: number; wins: number; worst_loss_pts: number; record_wape: number; proposal_wape: number; eligible: boolean; why: string }
export function earning(b: Backtest): Earned[] {
  return GATES.map((g) => {
    const w = (b.byGateOrigin.get(g.id) ?? []).slice(-EARN.window);
    const wins = w.filter((x) => x.proposal <= x.record + EARN.tolPts).length; const worst = Math.max(0, ...w.map((x) => x.proposal - x.record));
    const eligible = w.length >= 6 && wins / w.length >= EARN.winShare && worst <= EARN.maxLossPts;
    const avg = (f: (x: (typeof w)[number]) => number) => r2(w.reduce((s, x) => s + f(x), 0) / Math.max(w.length, 1));
    return { gate: g.id, product: g.product, windows: w.length, wins, worst_loss_pts: r2(worst), record_wape: avg((x) => x.record), proposal_wape: avg((x) => x.proposal), eligible,
      why: eligible ? `beat or matched the record in ${wins}/${w.length} windows; worst loss ${r2(worst)} pts` : w.length < 6 ? "not enough windows yet" : wins / w.length < EARN.winShare ? `won only ${wins}/${w.length} windows` : `one window lost by ${r2(worst)} pts` };
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.gate.localeCompare(b.gate));
}

// ---- forward check --------------------------------------------------------------------------------
export interface Attribution { id: string; kind: "signal" | "human edit" | "counterfactual"; what: string; gate_days: number; wape_without: number; wape_with: number; fva_pts: number; verdict: "helped" | "hurt" | "neutral" }
export interface Forward { asOf: string; through: string; layers: { layer: string; wape: number; bias: number }[]; attributions: Attribution[] }

export function forwardCheck(rows: ProposedRow[], actuals: ExtractRow[], overlays: Overlay[], signals: Signal[], edits: Decision[]): Forward {
  const A = new Map(actuals.map((r) => [`${r.date}|${r.gate}|${r.channel}`, r])); const scored = rows.filter((r) => A.has(`${r.date}|${r.gate}|${r.channel}`));
  const through = scored.reduce((m, r) => (r.date > m ? r.date : m), "");
  const editF = (r: ProposedRow, only?: Decision) => { let f = 1; for (const e of only ? [only] : edits) if (e.action === "edit" && e.gate === r.gate && r.date >= e.edit!.from && r.date <= e.edit!.to && (!e.edit!.channel || e.edit!.channel === r.channel)) f *= 1 + e.edit!.pct / 100; return f; };
  const learnedOnly = (r: ProposedRow) => r.fc_volume_proposed - r.signal_overlay_volume - r.overlay_volume;
  const L: [string, (r: ProposedRow) => number][] = [
    ["record", (r) => r.fc_volume], ["+ learned level", learnedOnly], ["+ migration ratio", (r) => learnedOnly(r) + r.overlay_volume],
    ["+ applied signals", (r) => r.fc_volume_proposed], ["+ human edits (published)", (r) => r.fc_volume_proposed * editF(r)],
  ];
  const layers = L.map(([name, f]) => { const a = acc(); for (const r of scored) add(a, f(r), A.get(`${r.date}|${r.gate}|${r.channel}`)!.act_volume); return { layer: name, wape: r2(wape(a)), bias: r2(bias(a)) }; });
  const att: Attribution[] = []; const touches = (o: { gates: string[]; channels: string[]; from: string; to: string | null }, r: ProposedRow) => o.gates.includes(r.gate) && (!o.channels.length || o.channels.includes(r.channel)) && r.date >= o.from && (!o.to || r.date <= o.to);
  const score = (id: string, kind: Attribution["kind"], what: string, rs: ProposedRow[], without: (r: ProposedRow) => number, withIt: (r: ProposedRow) => number) => {
    if (!rs.length) return; const a = acc(), b = acc(); for (const r of rs) { const x = A.get(`${r.date}|${r.gate}|${r.channel}`)!.act_volume; add(a, without(r), x); add(b, withIt(r), x); }
    const fva = r2(wape(a) - wape(b)); att.push({ id, kind, what, gate_days: rs.length, wape_without: r2(wape(a)), wape_with: r2(wape(b)), fva_pts: fva, verdict: fva > 0.25 ? "helped" : fva < -0.25 ? "hurt" : "neutral" });
  };
  for (const o of overlays) { const rs = scored.filter((r) => touches(o, r)); score(o.signals.join("+"), "signal", `${o.factor > 1 ? "+" : ""}${Math.round((o.factor - 1) * 100)}% on ${o.gates.length > 3 ? o.gates.length + " gates" : o.gates.join(",")} from ${o.from}`, rs, (r) => r.fc_volume_proposed / o.factor, (r) => r.fc_volume_proposed); }
  for (const s of signals.filter((x) => x.kind === "forward" && !["applied", "accepted", "corroborating", "in-plan"].includes(x.status) && x.pct !== null && x.direction && x.gates.length)) {
    const f = 1 + (s.direction === "up" ? 1 : -1) * (s.pct! / 100); const o = { gates: s.gates, channels: s.channels, from: s.start, to: s.end && s.end !== s.start ? s.end : null };
    score(s.id, "counterfactual", `had the ${s.status} ${s.type} signal (${s.grade}) been applied: ${f > 1 ? "+" : ""}${Math.round((f - 1) * 100)}% from ${s.start}`, scored.filter((r) => touches(o, r)), (r) => r.fc_volume_proposed, (r) => r.fc_volume_proposed * f);
  }
  for (const e of edits.filter((x) => x.action === "edit")) score(`edit ${e.gate}`, "human edit", `${e.edit!.pct > 0 ? "+" : ""}${e.edit!.pct}% ${e.edit!.channel ?? "all channels"} ${e.edit!.from}→${e.edit!.to}: “${e.reason}”`, scored.filter((r) => editF(r, e) !== 1), (r) => r.fc_volume_proposed, (r) => r.fc_volume_proposed * editF(r, e));
  for (const e of edits.filter((x) => x.action === "reject")) score(`reject ${e.gate}`, "human edit", `kept the record instead of the proposal: “${e.reason}”`, scored.filter((r) => r.gate === e.gate), (r) => r.fc_volume_proposed, (r) => r.fc_volume);
  return { asOf: rows[0]!.as_of, through, layers, attributions: att };
}

// ---- event-effect library --------------------------------------------------------------------------
export interface Effect { type: string; product: string; events: number; vol_day0: number; vol_day1: number; aht_day0: number }
export function effectLibrary(extract: ExtractRow[], events: LoggedEvent[]): Effect[] {
  const by = new Map<string, ExtractRow>(); for (const r of extract) by.set(`${r.date}|${r.gate}|${r.channel}`, r);
  const med = (a: number[]) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]!; };
  const out: Effect[] = [];
  for (const type of ["weather", "outage"]) for (const p of ["A", "C", "D", "E"]) {
    const ev = events.filter((e) => e.type === type); const v0: number[] = [], v1: number[] = [], a0: number[] = []; let n = 0;
    for (const e of ev) { let hit = false; for (const g of (e.gates === "*" ? GATES.map((x) => x.id) : e.gates.split(";"))) { if (gateOf(g).product !== p) continue;
      for (const c of e.channels.split(";")) { const r0 = by.get(`${e.start}|${g}|${c}`), r1 = by.get(`${addDays(e.end, 1)}|${g}|${c}`); if (r0 && r0.fc_volume > 20) { v0.push(r0.act_volume / r0.fc_volume); a0.push(r0.act_aht_sec / r0.fc_aht_sec); hit = true; } if (r1 && r1.fc_volume > 20) v1.push(r1.act_volume / r1.fc_volume); } }
      if (hit) n++; }
    if (n) out.push({ type, product: p, events: n, vol_day0: r2((med(v0) - 1) * 100), vol_day1: r2((med(v1) - 1) * 100), aht_day0: r2((med(a0) - 1) * 100) });
  }
  return out;
}

/** Which gates have earned their learned corrections as of now (the same rule the backtest applies walk-forward). */
export function earnedGates(b: Backtest): Set<string> {
  return new Set(GATES.filter((g) => { const h = (b.byGateOrigin.get(g.id) ?? []).slice(-EARNED.lookback); if (h.length < 4) return false;
    return h.reduce((s, x) => s + x.proposal, 0) / h.length < h.reduce((s, x) => s + x.record, 0) / h.length - EARNED.marginPts; }).map((g) => g.id));
}

/** P6 policy for the proposal: learned corrections only where earned, or after a confirmed shift in the last 70 days. */
export function learningPolicy(extract: ExtractRow[], st: CycleState): Set<string> {
  const earned = earnedGates(backtest(extract, st));
  for (const s of st.series.values()) if (s.shifts.some((x) => addDays(x.date, SHIFT_GATE.days) >= st.asOf)) earned.add(s.gate);
  return earned;
}
