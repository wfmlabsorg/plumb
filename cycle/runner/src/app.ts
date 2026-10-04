/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/** PLUMB runner: the whole daily cycle in one file, on the work laptop, with nothing installed and nothing uploaded. */
import { mdToHtml } from "../../src/md";
import { publish, wfmExport, type Decisions, type Packet } from "../../src/review";
import { useRegistry, type Gate } from "../../src/registry";
import { toCsv } from "../../src/csv";
import type { ProposedRow } from "../../src/reforecast";
import { page as reviewPage } from "../../review/page";
declare const __WORKER_JS__: string; declare const __REVIEW_JS__: string;

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const files: Record<string, File | undefined> = {};
let last: { asOf: string; packet: Packet; rows: ProposedRow[]; reports: { id: string; title: string; md: string }[] } | null = null;
const worker = new Worker(URL.createObjectURL(new Blob([__WORKER_JS__], { type: "text/javascript" })));
const read = (k: string) => files[k]?.text();
const download = (name: string, text: string, type = "text/plain") => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
const log = (s: string) => { const el = $("#log"); el.textContent += `${new Date().toLocaleTimeString()} · ${s}\n`; el.scrollTop = el.scrollHeight; };

async function message(kind: "validate" | "run") {
  for (const k of ["registry", "extract", "outlook"]) if (!files[k]) { alert(`Choose the ${k} file first.`); return; }
  const mapping = files.mapping ? JSON.parse((await read("mapping"))!) : undefined;
  worker.postMessage({ kind, registry: await read("registry"), extract: await read("extract"), extractIsExport: $<HTMLInputElement>("#isExport").checked, mapping, events: await read("events"), outlook: await read("outlook"),
    items: files.items ? JSON.parse((await read("items"))!) : undefined, signalDecisions: files.sigdec ? JSON.parse((await read("sigdec"))!) : undefined,
    priorRecord: await read("prior"), priorDecisions: files.priordec ? JSON.parse((await read("priordec"))!) : undefined });
  $("#log").textContent = ""; log(kind === "validate" ? "checking the files against the contracts…" : "running the cycle (about a minute on two years of history)…");
  $<HTMLButtonElement>("#run").disabled = $<HTMLButtonElement>("#validate").disabled = true;
}

worker.onmessage = (e) => {
  const m = e.data;
  if (m.kind === "progress") { log(m.step); return; }
  $<HTMLButtonElement>("#run").disabled = $<HTMLButtonElement>("#validate").disabled = false;
  if (m.kind === "error") { log(`error: ${m.message}`); return; }
  if (m.kind === "validated") {
    $("#check").innerHTML = `<p><b>${m.ok ? "Ready to run." : "Not ready."}</b> ${esc(m.summary)}</p>${m.problems.length ? `<div class="tw"><table><thead><tr><th>File</th><th>Row</th><th>Column</th><th>Problem</th></tr></thead><tbody>${m.problems.map((p: any) => `<tr><td>${esc(p.file)}</td><td>${p.row ?? "—"}</td><td>${esc(p.column ?? "—")}</td><td>${esc(p.message)}</td></tr>`).join("")}</tbody></table></div>${m.total > m.problems.length ? `<p class="muted">…and ${m.total - m.problems.length} more.</p>` : ""}` : ""}`;
    log(m.ok ? "contracts ok" : `${m.total} problem(s)`); return;
  }
  if (m.kind === "done") {
    useRegistry(m.gates as Gate[]); last = { asOf: m.out.asOf, packet: m.out.packet, rows: m.out.rows, reports: m.out.reports };
    log(`done · as of ${m.out.asOf}`);
    $("#check").innerHTML = `<p><b>Contracts ok.</b> ${esc(m.summary)}</p>`;
    $("#results").hidden = false;
    $("#summary").innerHTML = `<div class="tw"><table><tbody>${Object.entries(m.out.summary).map(([k, v]) => `<tr><td>${esc(k.replace(/_/g, " "))}</td><td class="r">${esc(v)}</td></tr>`).join("")}</tbody></table></div>`;
    $("#tabs").innerHTML = m.out.reports.map((r: any, i: number) => `<button data-i="${i}" class="${i ? "" : "on"}">${esc(r.title)}</button>`).join("");
    show(0);
  }
};
function show(i: number) { if (!last) return; const r = last.reports[i]!; for (const b of document.querySelectorAll("#tabs button")) b.classList.toggle("on", (b as HTMLElement).dataset.i === String(i)); $("#report").innerHTML = mdToHtml(r.md); $<HTMLButtonElement>("#dlReport").onclick = () => download(`${r.id}-${last!.asOf}.md`, r.md, "text/markdown"); }

document.addEventListener("DOMContentLoaded", () => {
  for (const el of document.querySelectorAll<HTMLInputElement>("input[type=file][data-k]")) el.addEventListener("change", () => { files[el.dataset.k!] = el.files?.[0]; });
  $("#validate").addEventListener("click", () => message("validate"));
  $("#run").addEventListener("click", () => message("run"));
  $("#tabs").addEventListener("click", (e) => { const b = (e.target as HTMLElement).closest("button"); if (b) show(+b.dataset.i!); });
  $("#openReview").addEventListener("click", () => { if (!last) return; const html = reviewPage(__REVIEW_JS__, JSON.stringify(last.packet)); window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank"); });
  $("#dlReview").addEventListener("click", () => last && download(`review-${last.asOf}.html`, reviewPage(__REVIEW_JS__, JSON.stringify(last.packet)), "text/html"));
  $("#dlPacket").addEventListener("click", () => last && download(`review-packet-${last.asOf}.json`, JSON.stringify(last.packet), "application/json"));
  $<HTMLInputElement>("#decisions").addEventListener("change", async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f || !last) return;
    const res = publish(last.packet, JSON.parse(await f.text()) as Decisions, last.rows);
    if (!res.ok) { $("#pub").innerHTML = `<p class="bad"><b>Not published.</b></p><ul>${res.problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`; return; }
    $("#pub").innerHTML = `<p><b>Published ${esc(res.version)}</b>: ${res.summary!.approved} approved · ${res.summary!.edited} edited · ${res.summary!.rejected} rejected · signed by ${esc(res.summary!.signer)}</p><button id="dlRecord" class="primary">Download record.csv</button> <button id="dlWfm">Download WFM export</button>`;
    $("#dlRecord").onclick = () => download(`record-${last!.asOf}.csv`, toCsv(res.rows as any), "text/csv");
    $("#dlWfm").onclick = () => download(`wfm_export-${last!.asOf}.csv`, toCsv(wfmExport(res.rows!) as any), "text/csv");
  });
});
