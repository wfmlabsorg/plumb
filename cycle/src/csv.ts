export function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  const cell = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}
export function fromCsv(text: string): Record<string, string>[] {
  const out: Record<string, string>[] = []; const rows: string[][] = []; let row: string[] = [], v = "", q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { v += '"'; i++; } else q = false; } else v += c; continue; }
    if (c === '"') q = true; else if (c === ",") { row.push(v); v = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(v); rows.push(row); row = []; v = ""; } else v += c; }
  if (v || row.length) { row.push(v); rows.push(row); }
  const [h = [], ...b] = rows.filter((r) => r.some((x) => x !== ""));
  for (const r of b) out.push(Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])));
  return out;
}
