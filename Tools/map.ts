/**
 * PLUMB mapping engine — planner document -> canonical schema.
 *
 * Reads a mapping file (books/<book>/mappings/<source>.yaml) and applies it to a
 * source document, producing canonical CSVs plus the list of gaps.
 *
 * The mapping file is the memory of how a source is shaped. Nothing here infers
 * anything: a column is mapped, declared a constant, or declared ignorable. A
 * source column that is none of those is a gap, because that is how a new column
 * appearing in next month's export gets noticed instead of silently dropped.
 *
 * See context/plumb/MAPPING-CONVENTION.md and context/plumb/CANONICAL-SCHEMA.md
 */

import { load } from "js-yaml";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// --------------------------------------------------------------- canonical schema
// Mirrors context/plumb/CANONICAL-SCHEMA.md, which mirrors the CP-WFM-018 pack.
// Changing these means changing Tools/engine/intake.py. Read docs/ENGINE.md first.

export const DEMAND_COLUMNS = [
  "date", "segment", "channel", "transactions", "transactions_forecast",
  "contacts_offered", "contacts_handled", "aht_seconds", "concurrency_effective",
  "items_resolved", "productive_hours", "occupancy_achieved", "service_level",
] as const;

export const SUPPLY_COLUMNS = [
  "date", "site", "cohort_id", "heads_on_roll", "heads_scheduled", "scheduled_hours",
  "productive_hours", "shrink_planned_hours", "shrink_unplanned_hours",
  "weeks_since_graduation", "separations", "separations_voluntary",
] as const;

/** Columns intake.py hard-fails on if absent. */
export const REQUIRED = {
  demand: ["date", "segment", "channel", "transactions", "contacts_offered",
           "contacts_handled", "productive_hours", "aht_seconds"],
  supply: ["date", "scheduled_hours", "productive_hours",
           "shrink_planned_hours", "shrink_unplanned_hours"],
} as const;

// ------------------------------------------------------------------ mapping types

type ColumnSpec = string | { from: string; transform?: string; of?: string };

export type Mapping = {
  source: string;
  kind: "demand" | "supply";
  file: string;
  header_row: number;
  sheet?: string;
  constant?: Record<string, string>;
  columns: Record<string, ColumnSpec>;
  unmapped_ok?: string[];
};

// ---------------------------------------------------------------------- transforms

const TRANSFORMS: Record<string, (v: string, ctx: Record<string, string>, of?: string) => number> = {
  minutes_to_seconds:  (v) => num(v) * 60,
  hours_to_seconds:    (v) => num(v) * 3600,
  // Only divides when the value actually looks like a percentage. A column that
  // already holds 0.83 is left alone rather than turned into 0.0083.
  percent_to_fraction: (v) => (num(v) > 1 ? num(v) / 100 : num(v)),
  strip_commas:        (v) => num(v),
  blank_as_zero:       (v) => (v.trim() === "" ? 0 : num(v)),
  // Converts a percentage into an absolute against another source column.
  percent_of: (v, ctx, of) => {
    if (!of) throw new Error("percent_of requires an `of:` column");
    if (!(of in ctx)) throw new Error(`percent_of references unknown column "${of}"`);
    return (num(v) / 100) * num(ctx[of]);
  },
};

/** Tolerant numeric parse: strips thousands separators, currency and stray spaces. */
function num(v: string): number {
  const cleaned = String(v).replace(/[,\s$£€]/g, "");
  if (cleaned === "") return NaN;
  const n = Number(cleaned);
  if (Number.isNaN(n)) throw new Error(`cannot parse "${v}" as a number`);
  return n;
}

// ---------------------------------------------------------------------------- CSV

/** Minimal RFC-4180 reader: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export const toCsv = (header: readonly string[], rows: Record<string, unknown>[]): string =>
  [header.join(","),
   ...rows.map((r) => header.map((h) => {
     const v = r[h];
     if (v === undefined || v === null) return "";
     const s = String(v);
     return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
   }).join(",")),
  ].join("\n") + "\n";

// ------------------------------------------------------------------------- result

export type Gap = {
  input: string;
  status: "absent" | "unmapped source column" | "proxy" | "disputed definition";
  treatment: string;
};

export type MapResult = {
  mapping: Mapping;
  rows: Record<string, string | number>[];
  columns: readonly string[];
  gaps: Gap[];
  errors: string[];
  filled: number;
  total: number;
};

// ---------------------------------------------------------------------------- run

export function applyMapping(bookDir: string, mapping: Mapping): MapResult {
  const columns = mapping.kind === "demand" ? DEMAND_COLUMNS : SUPPLY_COLUMNS;
  const errors: string[] = [];
  const gaps: Gap[] = [];

  const raw = readFileSync(join(bookDir, "01-source", mapping.file), "utf8");
  const grid = parseCsv(raw);

  const headerIdx = mapping.header_row - 1;      // the file states it 1-indexed
  if (headerIdx >= grid.length)
    throw new Error(`header_row ${mapping.header_row} is past the end of ${mapping.file}`);

  const header = grid[headerIdx].map((h) => h.trim());
  const body = grid.slice(headerIdx + 1).filter((r) => r.some((c) => c.trim() !== ""));

  // -- every source column must be mapped, constant, or explicitly ignorable ----
  const mappedSources = new Set(
    Object.values(mapping.columns).map((s) => (typeof s === "string" ? s : s.from)));
  const ok = new Set(mapping.unmapped_ok ?? []);
  for (const h of header) {
    if (h === "" || mappedSources.has(h) || ok.has(h)) continue;
    gaps.push({
      input: h,
      status: "unmapped source column",
      treatment: "ignored — not in `columns` or `unmapped_ok`; confirm it is not needed",
    });
  }

  // -- canonical columns this mapping does not fill ----------------------------
  const constants = mapping.constant ?? {};
  for (const c of columns) {
    if (c in mapping.columns || c in constants) continue;
    const required = (REQUIRED[mapping.kind] as readonly string[]).includes(c);
    gaps.push({
      input: c,
      status: "absent",
      treatment: required
        ? "REQUIRED by intake validation — the ingest will halt"
        : "left empty; not modelled",
    });
  }

  // -- apply -------------------------------------------------------------------
  const rows: Record<string, string | number>[] = [];
  for (const [i, r] of body.entries()) {
    const ctx: Record<string, string> = {};
    header.forEach((h, j) => { if (h) ctx[h] = (r[j] ?? "").trim(); });

    const out: Record<string, string | number> = { ...constants };
    for (const [canonical, spec] of Object.entries(mapping.columns)) {
      const from = typeof spec === "string" ? spec : spec.from;
      if (!(from in ctx)) {
        if (i === 0) errors.push(`column "${from}" (-> ${canonical}) not found in ${mapping.file}`);
        continue;
      }
      const value = ctx[from];
      if (value === "") continue;                 // sparse is legal
      try {
        if (typeof spec === "string") {
          out[canonical] = isNumericColumn(canonical) ? num(value) : value;
        } else if (spec.transform) {
          const fn = TRANSFORMS[spec.transform];
          if (!fn) throw new Error(`unknown transform "${spec.transform}"`);
          out[canonical] = round4(fn(value, ctx, spec.of));
        } else {
          out[canonical] = isNumericColumn(canonical) ? num(value) : value;
        }
      } catch (e) {
        errors.push(`row ${i + mapping.header_row + 1}, ${canonical}: ${(e as Error).message}`);
      }
    }
    rows.push(out);
  }

  const filled = columns.filter((c) => rows.some((r) => r[c] !== undefined && r[c] !== "")).length;
  return { mapping, rows, columns, gaps, errors, filled, total: columns.length };
}

const TEXT_COLUMNS = new Set(["date", "segment", "channel", "site", "cohort_id"]);
const isNumericColumn = (c: string) => !TEXT_COLUMNS.has(c);
const round4 = (x: number) => Math.round(x * 10000) / 10000;

export function loadMapping(bookDir: string, source: string): Mapping {
  const path = join(bookDir, "mappings", `${source}.yaml`);
  const m = load(readFileSync(path, "utf8")) as Mapping;
  for (const k of ["source", "kind", "file", "header_row", "columns"] as const)
    if (!(k in m)) throw new Error(`${source}.yaml is missing required key "${k}"`);
  if (m.kind !== "demand" && m.kind !== "supply")
    throw new Error(`${source}.yaml: kind must be "demand" or "supply", got "${m.kind}"`);
  return m;
}
