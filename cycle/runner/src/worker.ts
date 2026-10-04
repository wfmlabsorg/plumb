/// <reference lib="webworker" />
/** The runner's worker: contracts, mapping and the whole cycle, off the main thread so the page stays responsive. */
import { IEX_PDP_MAPPING, loadDataset, mapExport, type Mapping } from "../../src/contracts";
import { runPipeline } from "../../src/pipeline";
import type { RecordRow, Decisions } from "../../src/review";
import type { Item } from "../../src/materials";
import { fromCsv } from "../../src/csv";

type Msg = { kind: "validate" | "run"; registry: string; extract: string; extractIsExport: boolean; mapping?: Mapping; events?: string; outlook: string; items?: Item[]; signalDecisions?: Record<string, "accept" | "reject">; priorRecord?: string; priorDecisions?: Decisions };
self.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data; const post = (x: unknown) => (self as unknown as Worker).postMessage(x);
  try {
    let extract = m.extract; const mapProblems: { file: string; row: number | null; column: string | null; message: string }[] = [];
    if (m.extractIsExport) { const r = mapExport(m.extract, m.mapping ?? IEX_PDP_MAPPING); extract = r.csv; mapProblems.push(...r.problems); }
    const loaded = loadDataset({ registry: m.registry, extract, events: m.events, outlook: m.outlook });
    const problems = [...mapProblems, ...loaded.problems];
    if (m.kind === "validate" || !loaded.data || mapProblems.length) { post({ kind: "validated", ok: !!loaded.data && !mapProblems.length, summary: loaded.summary, problems: problems.slice(0, 200), total: problems.length }); return; }
    let priorRecord;
    if (m.priorRecord) { const rows = fromCsv(m.priorRecord).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, ["version", "date", "gate", "channel", "source"].includes(k) ? v : +v]))) as unknown as RecordRow[];
      priorRecord = { asOf: String(rows[0]?.version ?? "").slice(0, 10), rows, edits: m.priorDecisions?.decisions ?? [] }; }
    const out = runPipeline({ data: loaded.data, items: m.items, signalDecisions: m.signalDecisions, priorRecord, progress: (s) => post({ kind: "progress", step: s }) });
    post({ kind: "done", summary: loaded.summary, gates: loaded.data.gates, out: { asOf: out.asOf, through: out.through, reports: out.reports, packet: out.packet, rows: out.rows, summary: out.summary, forward: out.forward } });
  } catch (err) { post({ kind: "error", message: String((err as Error)?.stack ?? err).slice(0, 2000) }); }
};
