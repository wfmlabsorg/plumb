/**
 * demo.ts — the whole cycle end to end, through the inside-the-walls path:
 * contract files (IEX-style export + mapping) → validate → Day 1 (as of 4 Oct): PDP, signals, reforecast,
 * review, weekly, monthly, learning → a scripted reviewer signs → publish → time passes → Day 63: the
 * cycle runs again and its learning phase scores the published Day-1 forecast against what happened.
 *   bun run cycle:demo            writes cycle/out/demo/ (index.html is the front door)
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { buildWorld } from "./src/world";
import { GATES, useSyntheticRegistry } from "./src/registry";
import { toCsv } from "./src/csv";
import { IEX_PDP_MAPPING, loadDataset, mapExport } from "./src/contracts";
import { iexStyleExport } from "./src/iex-sample";
import { materials } from "./src/materials";
import { runPipeline, registryCsv, type PipelineOutput } from "./src/pipeline";
import { publish, wfmExport, type Decisions } from "./src/review";
import { mdToHtml, REPORT_CSS } from "./src/md";

const D = join(import.meta.dir, "out", "demo"); const t0 = Date.now();
const say = (s: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`);
const page = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${REPORT_CSS}</style></head><body><main><p><a href="index.html">← PLUMB demo</a></p>${body}</main></body></html>\n`;

function writeInputs(dir: string, w: ReturnType<typeof buildWorld>) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "registry.csv"), registryCsv(GATES));
  writeFileSync(join(dir, "iex_pdp_export.csv"), iexStyleExport(w.extract));
  writeFileSync(join(dir, "events.csv"), toCsv(w.events as any));
  writeFileSync(join(dir, "outlook_record.csv"), toCsv(w.outlook as any));
  writeFileSync(join(dir, "mapping.json"), JSON.stringify(IEX_PDP_MAPPING, null, 2));
}
function load(dir: string) {
  const mapped = mapExport(readFileSync(join(dir, "iex_pdp_export.csv"), "utf8"), IEX_PDP_MAPPING);
  if (mapped.problems.length) throw new Error(mapped.problems.map((p) => p.message).join("; "));
  const r = loadDataset({ registry: readFileSync(join(dir, "registry.csv"), "utf8"), extract: mapped.csv, events: readFileSync(join(dir, "events.csv"), "utf8"), outlook: readFileSync(join(dir, "outlook_record.csv"), "utf8") });
  if (!r.data) throw new Error(`contracts failed: ${r.problems.slice(0, 5).map((p) => `${p.file}:${p.row} ${p.column} ${p.message}`).join("; ")}`);
  return r;
}
function writeReports(dir: string, out: PipelineOutput) {
  mkdirSync(dir, { recursive: true });
  for (const r of out.reports) { writeFileSync(join(dir, `${r.id}.md`), r.md); writeFileSync(join(dir, `${r.id}.html`), page(r.title, mdToHtml(r.md)).replace('href="index.html"', 'href="../index.html"')); }
  writeFileSync(join(dir, "review-packet.json"), JSON.stringify(out.packet));
  const b = spawnSync("bun", ["run", join(import.meta.dir, "review", "build.ts"), join(dir, "review-packet.json"), join(dir, "review.html")], { encoding: "utf8" }); if (b.status !== 0) throw new Error(b.stderr);
}

useSyntheticRegistry();
say("Day 1 · writing the inputs as they would arrive at work (IEX-style export + registry + events + record + intake)");
const day1World = buildWorld(); writeInputs(join(D, "inputs-day1"), day1World);
writeFileSync(join(D, "inputs-day1", "intake_items.json"), JSON.stringify(materials().items, null, 2));
const l1 = load(join(D, "inputs-day1")); say(`Day 1 · contracts ok: ${l1.summary}`);
const day1 = runPipeline({ data: l1.data!, items: materials().items, progress: (s) => say(`Day 1 · ${s}`) });
writeReports(join(D, "day1"), day1);
// the review: a SCRIPTED reviewer approves every gate (a person does this in the review screen)
const decisions: Decisions = { schema: "plumb.decisions/1", packet_hash: day1.packet.hash, asOf: day1.asOf, decisions: day1.packet.gates.map((g) => ({ gate: g.gate, action: "approve" as const })),
  signature: { name: "Demo reviewer (scripted)", role: "approves every gate; a forecast owner does this in the review screen", at: `${day1.asOf}T08:15:00.000Z`, bulk_approved: day1.packet.gates.filter((g) => Math.abs(g.change_pct) < 1).map((g) => g.gate) } };
const pub = publish(day1.packet, decisions, day1.rows); if (!pub.ok) throw new Error(pub.problems.join("; "));
writeFileSync(join(D, "day1", "decisions.json"), JSON.stringify(decisions, null, 2));
writeFileSync(join(D, "day1", "record.csv"), toCsv(pub.rows as any)); writeFileSync(join(D, "day1", "wfm_export.csv"), toCsv(wfmExport(pub.rows!) as any));
say(`Day 1 · published ${pub.version}: ${pub.summary!.approved} approved by ${pub.summary!.signer}`);

say("time passes · nine weeks of exports arrive (through 5 Dec)");
useSyntheticRegistry(); // the Day-1 run loaded the registry from the contract file; the generator needs the synthetic one back
const day63World = buildWorld({ end: "2026-12-05" }); writeInputs(join(D, "inputs-day63"), day63World);
const l63 = load(join(D, "inputs-day63")); say(`Day 63 · contracts ok: ${l63.summary}`);
const day1Signals = (await import("./src/signals")).gate((await import("./src/signals")).extract(materials().items), l1.data!.events, [], {}).signals;
const day63 = runPipeline({ data: l63.data!, items: materials().items, priorRecord: { asOf: day1.asOf, rows: pub.rows!, signals: day1Signals, edits: decisions.decisions }, progress: (s) => say(`Day 63 · ${s}`) });
writeReports(join(D, "day63"), day63);

const row = (k: string, a: unknown, b: unknown) => `<tr><td>${k}</td><td class="r">${a}</td><td class="r">${b}</td></tr>`;
const links = (dir: string, out: PipelineOutput) => `<ul>${out.reports.map((r) => `<li><a href="${dir}/${r.id}.html">${r.title}</a></li>`).join("")}<li><a href="${dir}/review.html">Owner review screen</a> (packet embedded)</li></ul>`;
const fwd = day63.forward;
writeFileSync(join(D, "index.html"), page("PLUMB demo", `<h1>PLUMB daily forecast cycle · end-to-end demo</h1>
<p class="muted">Synthetic, code-named data run through the inside-the-walls path: an IEX-style export mapped onto the contracts, validated, then the full cycle. Built ${new Date().toISOString().slice(0, 16)}Z in ${((Date.now() - t0) / 1000).toFixed(0)} s.</p>
<div class="card"><h2>The two days</h2><div class="tw"><table><thead><tr><th>Measure</th><th class="r">Day 1 · as of ${day1.asOf}</th><th class="r">Day 63 · as of ${day63.asOf}</th></tr></thead><tbody>
${Object.keys(day1.summary).map((k) => row(k.replace(/_/g, " "), day1.summary[k], day63.summary[k])).join("")}</tbody></table></div></div>
<div class="card"><h2>Day 1</h2>${links("day1", day1)}<p>Published: <b>${pub.version}</b>, ${pub.summary!.approved} gates approved by a <i>scripted</i> reviewer. <a href="day1/record.csv">record.csv</a> · <a href="day1/wfm_export.csv">wfm_export.csv</a> · <a href="day1/decisions.json">decisions.json</a></p></div>
<div class="card"><h2>Day 63 · the Day-1 forecast scored against what happened</h2>${fwd ? `<div class="tw"><table><thead><tr><th>Layer</th><th class="r">Volume WAPE</th><th class="r">Bias</th></tr></thead><tbody>${fwd.layers.map((l) => `<tr><td>${l.layer}</td><td class="r">${l.wape}%</td><td class="r">${l.bias}%</td></tr>`).join("")}</tbody></table></div>` : "<p>No forward check.</p>"}${links("day63", day63)}</div>
<div class="card"><h2>Inputs, as they arrive at work</h2><p><a href="inputs-day1/iex_pdp_export.csv">IEX-style daily export</a> (its own column names, mm:ss, %, US dates) · <a href="inputs-day1/mapping.json">mapping.json</a> (edit the right-hand names to match your export) · <a href="inputs-day1/registry.csv">registry.csv</a> · <a href="inputs-day1/events.csv">events.csv</a> · <a href="inputs-day1/outlook_record.csv">outlook_record.csv</a> · <a href="inputs-day1/intake_items.json">intake items</a></p></div>`));
say(`done · open cycle/out/demo/index.html`);
