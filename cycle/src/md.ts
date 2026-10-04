/** A small Markdown → HTML renderer for the cycle's own reports (headings, tables, lists, bold, italic, code). */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:]|$)/g, "$1<i>$2</i>").replace(/&lt;br&gt;/g, "<br>");
export function mdToHtml(md: string): string {
  const out: string[] = []; const lines = md.split("\n"); let i = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    if (/^#{1,4} /.test(l)) { const n = l.match(/^#+/)![0].length; out.push(`<h${n}>${inline(l.slice(n + 1))}</h${n}>`); i++; continue; }
    if (l.startsWith("|")) { const rows: string[][] = []; while (i < lines.length && lines[i]!.startsWith("|")) { rows.push(lines[i]!.slice(1, -1).split(" | ").map((c) => c.trim().replace(/^\|\s*/, ""))); i++; }
      const [h, sep, ...b] = rows; const right = (sep ?? []).map((x) => x.endsWith(":"));
      out.push(`<div class="tw"><table><thead><tr>${(h ?? []).map((c, k) => `<th${right[k] ? ' class="r"' : ""}>${inline(c)}</th>`).join("")}</tr></thead><tbody>${b.map((r) => `<tr>${r.map((c, k) => `<td${right[k] ? ' class="r"' : ""}>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`); continue; }
    if (/^\s*- /.test(l)) { const items: string[] = []; while (i < lines.length && /^\s*- /.test(lines[i]!)) { items.push(inline(lines[i]!.replace(/^\s*- /, ""))); i++; } out.push(`<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`); continue; }
    if (l.startsWith("```")) { const code: string[] = []; i++; while (i < lines.length && !lines[i]!.startsWith("```")) code.push(esc(lines[i++]!)); i++; out.push(`<pre>${code.join("\n")}</pre>`); continue; }
    if (l.trim() === "") { i++; continue; }
    const para: string[] = []; while (i < lines.length && lines[i]!.trim() !== "" && !/^(#|\||\s*- |```)/.test(lines[i]!)) para.push(lines[i++]!); out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}
export const REPORT_CSS = `:root{--bg:#f6f7f9;--card:#fff;--ink:#16202b;--muted:#5b6876;--line:#d9dee5;--accent:#1f5fbf;--soft:#eef3fb}@media (prefers-color-scheme:dark){:root{--bg:#0f141a;--card:#161d25;--ink:#e6ebf1;--muted:#9aa7b4;--line:#2a3542;--accent:#6ea2ff;--soft:#1b2633}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14.5px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}main{max-width:1100px;margin:0 auto;padding:20px 16px 60px}
h1{font-size:22px}h2{font-size:17px;margin-top:28px}h3{font-size:15px}a{color:var(--accent)}code{background:var(--soft);padding:1px 4px;border-radius:4px}pre{background:var(--soft);padding:10px;border-radius:8px;overflow:auto}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:var(--card)}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}.r{text-align:right}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:12px 0}.muted{color:var(--muted)}`;
