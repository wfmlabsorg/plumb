/** Builds dist/plumb-runner.html: the runner page with its worker and the review screen inlined. One file, no network. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPORT_CSS } from "../src/md";
const dir = import.meta.dir;
const bundle = async (entry: string, define: Record<string, string> = {}) => { const r = await Bun.build({ entrypoints: [entry], target: "browser", minify: true, format: "iife", define }); if (!r.success) throw new Error(r.logs.map(String).join("\n")); return r.outputs[0]!.text(); };
const reviewJs = await bundle(join(dir, "..", "review", "src", "app.ts"));
const workerJs = await bundle(join(dir, "src", "worker.ts"));
const appJs = (await bundle(join(dir, "src", "app.ts"), { __WORKER_JS__: JSON.stringify(workerJs), __REVIEW_JS__: JSON.stringify(reviewJs) })).replace(/<\/script/gi, "<\\/script");
const CSS = REPORT_CSS + `button{font:inherit;font-weight:600;border-radius:7px;border:1px solid var(--line);background:var(--card);color:var(--ink);padding:7px 12px;cursor:pointer}button.primary{background:var(--accent);border-color:var(--accent);color:#fff}button:disabled{opacity:.5}
.files{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}.files label{display:flex;flex-direction:column;font-size:13px;font-weight:600;gap:4px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px}.files small{font-weight:400;color:var(--muted)}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}#log{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px;height:120px;overflow:auto;font:12px ui-monospace,Consolas,monospace;white-space:pre-wrap}
#tabs{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}#tabs button.on{background:var(--accent);color:#fff;border-color:var(--accent)}.bad{color:#b42318}#report{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:6px 16px}`;
const BODY = `<main><h1>PLUMB runner</h1><p class="muted">The daily forecast cycle in one file. Everything runs in this browser: nothing is uploaded, nothing is installed. Load the files, check them against the contracts, run, review, publish.</p>
<h2>1 · Files</h2><div class="files">
<label>Gate registry (CSV) <small>registry contract</small><input type="file" data-k="registry" accept=".csv"></label>
<label>Daily performance (CSV) <small>the PDP extract, or a WFM export (tick below)</small><input type="file" data-k="extract" accept=".csv"><span><input type="checkbox" id="isExport" checked> this is a WFM export: map it</span></label>
<label>Mapping (JSON, optional) <small>export columns → contract; IEX-style default built in</small><input type="file" data-k="mapping" accept=".json"></label>
<label>Logged events (CSV, optional)<input type="file" data-k="events" accept=".csv"></label>
<label>Forecast of record + supply plan (CSV)<input type="file" data-k="outlook" accept=".csv"></label>
<label>Intake items (JSON, optional)<input type="file" data-k="items" accept=".json"></label>
<label>Signal decisions (JSON, optional)<input type="file" data-k="sigdec" accept=".json"></label>
<label>A previously published record (CSV, optional) <small>scored against the actuals that arrived since</small><input type="file" data-k="prior" accept=".csv"></label>
<label>…and its signed decisions (JSON, optional)<input type="file" data-k="priordec" accept=".json"></label></div>
<div class="row"><button id="validate">Check against the contracts</button><button id="run" class="primary">Run the cycle</button></div><pre id="log"></pre><div id="check"></div>
<section id="results" hidden><h2>2 · Results</h2><div id="summary"></div><div id="tabs"></div><div class="row"><button id="dlReport">Download this report (.md)</button></div><div id="report"></div>
<h2>3 · Review and publish</h2><div class="row"><button id="openReview" class="primary">Open the review screen</button><button id="dlReview">Download the review screen</button><button id="dlPacket">Download the packet</button></div>
<p class="muted">Decide every gate, sign, and the decisions file downloads. Load it here to publish: it is refused if unsigned, incomplete or stale.</p><label>Signed decisions <input type="file" id="decisions" accept=".json"></label><div id="pub"></div></section>
<p class="muted">Contracts and mapping: cycle/docs/CONTRACTS.md. Synthetic data unless you load your own.</p></main>`;
mkdirSync(join(dir, "dist"), { recursive: true });
writeFileSync(join(dir, "dist", "plumb-runner.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PLUMB runner</title><style>${CSS}</style></head><body>${BODY}<script>${appJs}</script></body></html>\n`);
console.log(`built dist/plumb-runner.html (${Math.round((workerJs.length + appJs.length) / 1024)} KB of script)`);
