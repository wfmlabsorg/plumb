/**
 * pipeline.ts — the whole cycle on one dataset, as one call. The demo command and the browser runner
 * both use it, so what runs in the demo is what runs inside the walls.
 */
import { GATES, useRegistry, gate as gateOf, type Gate } from "./registry";
import type { Dataset } from "./contracts";
import { pdpFor, pdpMarkdown } from "./pdp";
import { propose, replay, type ProposedRow } from "./reforecast";
import { reforecastMarkdown } from "./reforecast-report";
import { monthlyLock, monthlyMarkdown, weeklyMarkdown, weeklyRefresh, type MonthlyLock, type WeeklyRefresh } from "./cadence";
import { extract as extractSignals, gate as gateSignals, type Signal } from "./signals";
import { intakeMarkdown } from "./intake-report";
import type { Item } from "./materials";
import { backtest, earning, effectLibrary, forwardCheck, learningPolicy, type Forward } from "./learn";
import { learnMarkdown } from "./learn-report";
import { buildPacket, publish, wfmExport, type Decisions, type Packet, type RecordRow } from "./review";
import { addDays, type ExtractRow, type OutlookRow } from "./world";

export interface PipelineInput { data: Dataset; items?: Item[]; signalDecisions?: Record<string, "accept" | "reject">; weeks?: number; reviewDecisions?: Decisions; priorRecord?: { asOf: string; rows: RecordRow[]; signals?: Signal[]; edits?: Decisions["decisions"] }; progress?: (s: string) => void }
export interface PipelineOutput {
  asOf: string; through: string; reports: { id: string; title: string; md: string }[]; packet: Packet; rows: ProposedRow[];
  published: { ok: boolean; problems: string[]; version?: string; record?: RecordRow[]; wfm?: ReturnType<typeof wfmExport> } | null; forward: Forward | null; summary: Record<string, string | number>;
  /** structured outputs for downstream views (shape files), alongside the Markdown reports */
  monthly: MonthlyLock; weekly: WeeklyRefresh; outlook: OutlookRow[]; signals: Signal[];
}

export function runPipeline(inp: PipelineInput): PipelineOutput {
  const say = inp.progress ?? (() => {}); const { data } = inp; useRegistry(data.gates); const weeks = inp.weeks ?? 26;
  const through = data.extract[data.extract.length - 1]!.date; const reports: PipelineOutput["reports"] = [];
  say("prior-day performance"); const p = pdpFor(through, data.extract, data.events); reports.push({ id: "pdp", title: `Prior-day performance · ${through}`, md: pdpMarkdown(p) });
  say("replaying history"); const st = replay(data.extract, data.events, through);
  say("signals"); const g = gateSignals(extractSignals(inp.items ?? []), data.events, st.detected, inp.signalDecisions ?? {});
  if (inp.items?.length) reports.push({ id: "intake", title: "Intake and signals", md: intakeMarkdown(st.asOf, inp.items, g.signals, g.overlays, propose(st, data.outlook, g.overlays)) });
  say("learning policy"); const policy = learningPolicy(data.extract, st);
  say("reforecast"); const rows = propose(st, data.outlook, g.overlays, policy);
  reports.push({ id: "reforecast", title: `Daily reforecast · as of ${st.asOf}`, md: reforecastMarkdown(st, rows, data.events, 12).md });
  const packet = buildPacket(st, rows, g.signals, weeks);
  say("weekly refresh");
  // last week's proposal under the same rules, so the weekly diff is like-for-like
  const lastSt = replay(data.extract, data.events, addDays(through, -7)); const lastRows = propose(lastSt, data.outlook, g.overlays, learningPolicy(data.extract.filter((r) => r.date <= addDays(through, -7)), lastSt));
  const wr2 = weeklyRefresh(data.extract, data.events, data.outlook, weeks, { state: lastSt, rows: lastRows }, g.overlays, (s, t) => learningPolicy(data.extract.filter((r) => r.date <= t), s));
  reports.push({ id: "weekly", title: `Weekly outlook refresh · as of ${st.asOf}`, md: weeklyMarkdown(wr2, weeks) });
  say("monthly lock"); const ml = monthlyLock(data.extract, rows, st.asOf, undefined, 6, st); reports.push({ id: "monthly", title: `Monthly lock · ${ml.month}`, md: monthlyMarkdown(ml) });
  say("learning"); const b = backtest(data.extract, st); const earned = earning(b);
  let fwd: Forward | null = null;
  if (inp.priorRecord) { const pr = inp.priorRecord; const after = data.extract.filter((r) => r.date >= pr.asOf);
    // rebuild each layer from the breakdown the published record kept (old record → proposal parts → human)
    const asRows: ProposedRow[] = pr.rows.map((r) => ({ as_of: pr.asOf, date: r.date, gate: r.gate, channel: r.channel, fc_volume: r.prior_record_volume, fc_aht_sec: r.aht_sec, fc_req_fte: r.req_fte, planned_sched_fte: 0, fc_volume_proposed: r.proposal_volume, fc_aht_proposed: r.aht_sec, req_proposed_fte: r.req_fte, over_under_fte: 0, sl_projected: 0, overlay_volume: r.migration_overlay_volume, signal_overlay_volume: r.signal_overlay_volume, sd_log: 0 }));
    if (after.length) fwd = forwardCheck(asRows, after, [], pr.signals ?? [], pr.edits ?? []); }
  reports.push({ id: "learn", title: `Learning · as of ${st.asOf}`, md: learnMarkdown(st.asOf, b, earned, fwd, effectLibrary(data.extract, data.events), policy) });
  let published: PipelineOutput["published"] = null;
  if (inp.reviewDecisions) { say("publish"); const res = publish(packet, inp.reviewDecisions, rows); published = { ok: res.ok, problems: res.problems, version: res.version, record: res.rows, wfm: res.rows ? wfmExport(res.rows) : undefined }; }
  const moved = packet.gates.filter((x) => Math.abs(x.change_pct) >= 1).length;
  return { asOf: st.asOf, through, reports, packet, rows, published, forward: fwd, monthly: ml, weekly: wr2, outlook: data.outlook, signals: g.signals,
    summary: { gates: GATES.length, history: `${data.extract[0]!.date} → ${through}`, below_target_yesterday: p.lines.filter((l) => l.sl_gap_pts < -5).length, flags_in_history: st.detected.length, signals: g.signals.length, overlays: g.overlays.length, gates_learning: policy.size, gates_moved: moved, earned_auto_approval: earned.filter((e) => e.eligible).length, hiring_asks: ml.hires.length } };
}

/** The registry as a contract file (for the demo, and as a template for the real one). */
export function registryCsv(gates: Gate[]): string {
  const head = ["gate", "name", "product", "segment", "region", "pooled", "open_start", "open_end", "channel", "target_sl", "threshold_sec", "concurrency", "patience_sec", "aht_basis"];
  const cell = (v: unknown) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [head.join(","), ...gates.flatMap((g) => g.channels.map((c) => [g.id, g.name, g.product, g.segment, g.region, g.pooled ? "y" : "n", g.openHours[0], g.openHours[1], c.channel, c.targetSL, c.thresholdSec, c.concurrency, c.patienceSec, c.ahtBasis].map(cell).join(",")))].join("\n") + "\n";
}
export { gateOf };
export type { ExtractRow };
