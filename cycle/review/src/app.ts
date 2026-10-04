/// <reference lib="dom" />
/** The owner review screen. Loads a plumb.review/1 packet, records a decision for every gate, signs, downloads plumb.decisions/1. */
type Week = { week: string; record: number; proposed: number; staff: number; p10: number; p90: number };
type Card = { gate: string; name: string; product: string; segment: string; channels: string[]; order: number; change_pct: number; record_avg: number; proposed_avg: number; why: string[]; weeks: Week[]; flags: string[]; signals: string[] };
type Packet = { schema: string; asOf: string; created: string; weeks: number; hash: string; gates: Card[] };
type Decision = { gate: string; action: "approve" | "edit" | "reject"; reason?: string; edit?: { pct: number; from: string; to: string; channel?: string } };

declare global { interface Window { PACKET?: Packet } }
const $ = <T extends HTMLElement = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector(s) as T;
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
let P: Packet | null = null; const D = new Map<string, Decision>(); const bulk = new Set<string>();
const store = { key: () => `plumb.review.${P?.hash}`, save() { try { localStorage.setItem(this.key(), JSON.stringify({ d: [...D.values()], b: [...bulk] })); } catch {} }, load() { try { const x = JSON.parse(localStorage.getItem(this.key()) ?? "null"); if (x) { for (const d of x.d) D.set(d.gate, d); for (const b of x.b) bulk.add(b); } } catch {} } };

function chart(c: Card): string {
  const W = 520, H = 120, pad = 28, n = c.weeks.length; if (!n) return "";
  const max = Math.max(...c.weeks.flatMap((w) => [w.p90, w.staff, w.record])) * 1.08 || 1;
  const x = (i: number) => pad + (i * (W - pad - 6)) / Math.max(n - 1, 1), y = (v: number) => H - 18 - (v / max) * (H - 30);
  const line = (k: keyof Week) => c.weeks.map((w, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(w[k] as number).toFixed(1)}`).join("");
  const band = c.weeks.map((w, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(w.p90).toFixed(1)}`).join("") + [...c.weeks].reverse().map((w, j) => `L${x(n - 1 - j).toFixed(1)},${y(w.p10).toFixed(1)}`).join("") + "Z";
  const ticks = [0, Math.floor(n / 2), n - 1].map((i, j) => `<text x="${x(i)}" y="${H - 4}" class="t" text-anchor="${["start", "middle", "end"][j]}">${c.weeks[i]!.week.slice(5)}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly need and staff for ${c.gate}"><path d="${band}" class="band"/><path d="${line("staff")}" class="staff"/><path d="${line("record")}" class="rec"/><path d="${line("proposed")}" class="prop"/>
    <text x="2" y="${y(max / 1.08) + 4}" class="t">${Math.round(max / 1.08)}</text><text x="2" y="${H - 18}" class="t">0</text>${ticks}</svg>`;
}

function card(c: Card): string {
  const d = D.get(c.gate); const st = d ? (d.action === "approve" ? (bulk.has(c.gate) ? "approved (bulk)" : "approved") : d.action === "edit" ? `edited ${d.edit!.pct > 0 ? "+" : ""}${d.edit!.pct}%` : "rejected: record kept") : "undecided";
  const ch = c.change_pct; const cls = Math.abs(ch) >= 5 ? "big" : Math.abs(ch) >= 1 ? "mid" : "small";
  const weeks = c.weeks.map((w) => `<option>${w.week}</option>`).join("");
  return `<article class="card ${d ? "done" : ""}" id="c-${c.gate}" data-product="${c.product}" data-change="${Math.abs(ch)}">
  <header><span class="ord">#${c.order}</span><b>${esc(c.gate)}</b> <span class="muted">${esc(c.name)} · ${c.product} · ${c.segment} · ${c.channels.join("/")}</span>
   <span class="chg ${cls}">${ch >= 0 ? "+" : ""}${ch}%</span><span class="state" data-s="${d?.action ?? "none"}">${st}</span></header>
  <div class="grid"><div>${chart(c)}<div class="legend"><i class="k rec"></i>record need <i class="k prop"></i>proposed need <i class="k staff"></i>planned staff <i class="k band"></i>P10–P90</div></div>
   <div><p class="avg">Avg required: <b>${c.record_avg}</b> → <b>${c.proposed_avg}</b> FTE</p><ul>${c.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
    ${c.signals.length ? `<p class="muted small">Signals: ${c.signals.map(esc).join("; ")}</p>` : ""}${c.flags.length ? `<p class="muted small">Flags this week: ${c.flags.map(esc).join("; ")}</p>` : ""}</div></div>
  <div class="actions"><button data-a="approve" data-g="${c.gate}" class="primary">Approve</button><button data-a="edit-open" data-g="${c.gate}">Edit…</button><button data-a="reject-open" data-g="${c.gate}">Reject…</button>${d ? `<button data-a="undo" data-g="${c.gate}" class="link">undo</button>` : ""}</div>
  <form class="edit" data-g="${c.gate}" hidden><label>Adjust proposed volume by <input name="pct" type="number" step="0.5" min="-50" max="50" value="${d?.edit?.pct ?? 0}">%</label>
   <label>from week <select name="from">${weeks}</select></label><label>through week <select name="to">${weeks.replace(`<option>${c.weeks[c.weeks.length - 1]?.week}</option>`, `<option selected>${c.weeks[c.weeks.length - 1]?.week}</option>`)}</select></label>
   <label>channel <select name="channel"><option value="">all</option>${c.channels.map((x) => `<option>${x}</option>`).join("")}</select></label>
   <label class="wide">Reason (required) <input name="reason" value="${esc(d?.reason ?? "")}" placeholder="what you know that the cycle does not"></label><button class="primary">Save edit</button></form>
  <form class="reject" data-g="${c.gate}" hidden><label class="wide">Reason for keeping the record (required) <input name="reason" value="${esc(d?.action === "reject" ? d.reason : "")}"></label><button class="primary">Reject proposal</button></form>
 </article>`;
}

function render() {
  if (!P) return; const f = $<HTMLSelectElement>("#fProduct").value, only = $<HTMLInputElement>("#fMoved").checked;
  $("#cards").innerHTML = P.gates.filter((c) => (!f || c.product === f) && (!only || Math.abs(c.change_pct) >= 1)).map(card).join("");
  const n = D.size, t = P.gates.length; $<HTMLProgressElement>("#prog").value = n / t; $("#count").textContent = `${n} of ${t} gates decided`;
  const small = P.gates.filter((c) => Math.abs(c.change_pct) < 1 && !D.has(c.gate)); $<HTMLButtonElement>("#bulk").disabled = !small.length; $("#bulkN").textContent = String(small.length);
  $<HTMLButtonElement>("#sign").disabled = n < t; $("#signHint").textContent = n < t ? `Decide the remaining ${t - n} gates to sign.` : "Every gate decided. Sign to download the decisions file.";
}

function decide(d: Decision) { D.set(d.gate, d); bulk.delete(d.gate); store.save(); render(); location.hash = ""; const el = document.getElementById(`c-${d.gate}`); el?.scrollIntoView({ block: "nearest" }); }

function load(p: Packet) {
  if (p.schema !== "plumb.review/1") { alert("Not a review packet."); return; }
  P = p; D.clear(); bulk.clear(); store.load();
  $("#title").textContent = `Owner review · as of ${p.asOf}`; $("#meta").textContent = `${p.gates.length} gates · ${p.weeks}-week outlook · packet ${p.hash} · biggest movers first`;
  $("#app").hidden = false; $("#loader").hidden = true; render();
}

document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest("button[data-a]") as HTMLButtonElement | null; if (!b) return; const g = b.dataset.g!, a = b.dataset.a!;
  const art = document.getElementById(`c-${g}`)!;
  if (a === "approve") decide({ gate: g, action: "approve" });
  if (a === "undo") { D.delete(g); bulk.delete(g); store.save(); render(); }
  if (a === "edit-open") { $<HTMLFormElement>("form.edit", art).hidden = false; $<HTMLFormElement>("form.reject", art).hidden = true; }
  if (a === "reject-open") { $<HTMLFormElement>("form.reject", art).hidden = false; $<HTMLFormElement>("form.edit", art).hidden = true; }
});
document.addEventListener("submit", (e) => {
  const f = e.target as HTMLFormElement; e.preventDefault(); const g = f.dataset.g!; const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
  if (!v("reason")) { alert("A reason is required."); return; }
  if (f.classList.contains("reject")) return decide({ gate: g, action: "reject", reason: v("reason") });
  const pct = +v("pct"); if (!Number.isFinite(pct) || pct === 0 || Math.abs(pct) > 50) { alert("Enter an adjustment between −50% and +50% (not 0)."); return; }
  if (v("from") > v("to")) { alert("The range runs backwards."); return; }
  const to = (() => { const d = new Date(v("to") + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 6); return d.toISOString().slice(0, 10); })();
  decide({ gate: g, action: "edit", reason: v("reason"), edit: { pct, from: v("from"), to, ...(v("channel") ? { channel: v("channel") } : {}) } });
});

document.addEventListener("DOMContentLoaded", () => {
  $<HTMLInputElement>("#file").addEventListener("change", async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) load(JSON.parse(await f.text())); });
  $("#fProduct").addEventListener("change", render); $("#fMoved").addEventListener("change", render);
  $("#bulk").addEventListener("click", () => { if (!P) return; const small = P.gates.filter((c) => Math.abs(c.change_pct) < 1 && !D.has(c.gate)); if (!confirm(`Approve ${small.length} gates whose proposal is within 1% of the record? Each is recorded as a bulk approval.`)) return; for (const c of small) { D.set(c.gate, { gate: c.gate, action: "approve" }); bulk.add(c.gate); } store.save(); render(); });
  $("#sign").addEventListener("click", () => {
    if (!P) return; const name = $<HTMLInputElement>("#name").value.trim(), role = $<HTMLInputElement>("#role").value.trim();
    if (!name || !role) { alert("Name and role are required to sign."); return; }
    const out = { schema: "plumb.decisions/1", packet_hash: P.hash, asOf: P.asOf, decisions: P.gates.map((c) => D.get(c.gate)!), signature: { name, role, at: new Date().toISOString(), bulk_approved: [...bulk] } };
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" })); a.download = `decisions-${P.asOf}.json`; a.click();
    $("#signHint").textContent = `Signed by ${name} (${role}). Decisions downloaded: run the publish step with this file.`;
  });
  if (window.PACKET) load(window.PACKET);
});
export {};
