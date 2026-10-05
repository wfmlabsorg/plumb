/**
 * signals.ts — P4: unstructured intake → graded signals → (only when earned) forecast overlays.
 *
 * Extraction here is deterministic so the demo costs nothing and the tests are exact; in production
 * the same schema is filled by an LLM (prompt: cycle/docs/EXTRACTION-PROMPT.md). Everything after
 * extraction — grading rules, corroboration, gating, linking explanations to flags — is the same.
 *
 * Grades:  V  plan, calendar or system of record      E  a named owner with a number or specifics
 *          I  hedged or unconfirmed ("maybe", "not confirmed")      U  rumor or unattributed ("I heard")
 * Gate to the forecast: V applies; E applies only when the owner confirms or an independent second
 * source corroborates; I and U never apply on their own; nothing applies without a stated size.
 */
import { GATES, type Channel } from "./registry";
import { addDays, dow, type LoggedEvent } from "./world";
import type { Detected } from "./reforecast";
import type { Item } from "./materials";

export type Grade = "V" | "E" | "I" | "U";
export type Status = "applied" | "proposed" | "in-plan" | "rumor" | "explanation" | "corroborating" | "accepted" | "rejected";
export interface Signal {
  id: string; item: string; received: string; author_role: string; source_kind: string; clause: string;
  kind: "forward" | "explanation"; type: string; gates: string[]; channels: Channel[]; start: string; end: string | null;
  direction: "up" | "down" | null; pct: number | null; grade: Grade; status: Status; needs: string; corroborates: string | null; explains: string[];
}
export interface Overlay { signals: string[]; gates: string[]; channels: Channel[]; from: string; to: string | null; factor: number }

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "Nov 9", "February 1", "Oct 12" → an ISO date in the year that keeps it near the message. */
function monthDay(clause: string, received: string): string[] {
  const out: string[] = [];
  // whole month names only: "maybe 10 percent" must not read as May 10
  for (const m of clause.matchAll(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})\b(?!\s*(?:%|percent))/gi)) {
    const mo = MONTHS.indexOf(m[1]!.toLowerCase().slice(0, 3)) + 1, d = +m[2]!; const y0 = +received.slice(0, 4);
    const cands = [y0 - 1, y0, y0 + 1].map((y) => `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    out.push(cands.reduce((best, c) => (Math.abs(Date.parse(c) - Date.parse(received) - 60 * 86400000) < Math.abs(Date.parse(best) - Date.parse(received) - 60 * 86400000) ? c : best)));
  }
  return out;
}
/** "Monday through Wednesday" in a note → the most recent such run before the note. */
function dayRange(clause: string, received: string): [string, string] | null {
  const m = clause.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+(?:through|to|-|–)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i); if (!m) return null;
  const a = DAYS.indexOf(m[1]!.toLowerCase()), b = DAYS.indexOf(m[2]!.toLowerCase());
  let d = addDays(received, -1); while (dow(d) !== b) d = addDays(d, -1); return [addDays(d, -((b - a + 7) % 7)), d];
}

function targets(clause: string, text: string): string[] {
  const ids = [...clause.matchAll(/\bG\d{3}\b/g)].map((m) => m[0]);
  const seg = [...clause.matchAll(/\b([ACDE]-(?:S\d{2}|POOL|ESC))\b/g)].flatMap((m) => GATES.filter((g) => g.segment === m[1]).map((g) => g.id));
  let prod: string[] = [];
  if (/\bproduct D\b|agency gates/i.test(clause)) prod = GATES.filter((g) => g.product === "D" && !(/ESC stays|except the ESC/i.test(text) && g.segment === "D-ESC")).map((g) => g.id);
  else if (/online product/i.test(clause) && !/legacy/i.test(clause)) prod = GATES.filter((g) => g.product === "E").map((g) => g.id);
  else if (/NA managed service gates/i.test(clause)) prod = GATES.filter((g) => g.product === "A" && g.region === "NA").map((g) => g.id);
  return [...new Set([...ids, ...seg, ...prod])];
}
const channelsOf = (clause: string): Channel[] => { const c: Channel[] = []; if (/\b(voice|phones?|calls?)\b/i.test(clause)) c.push("voice"); if (/\bchat/i.test(clause)) c.push("chat"); if (/\bemails?\b/i.test(clause)) c.push("email"); return c; };
const typeOf = (c: string) => /\b(wave|migrat|legacy book)/i.test(c) ? "migration" : /\b(sick|absence|out (sick|ill)|flu)\b/i.test(c) ? "absence" : /\b(snow|storm|hurricane|weather|flights?)\b/i.test(c) ? "weather" : /\b(timeout|release|goes live|go-live)\b/i.test(c) ? "platform" : /\b(holiday|calendar|reduced hours|closed)\b/i.test(c) || /\bColumbus|Thanksgiving|Christmas\b/.test(c) ? "calendar" : /\b(travell?ers?|onboard\w*|division|clients?|self-service)\b/i.test(c) ? "client" : "other";

function grade(clause: string, it: Item): { g: Grade; why: string } {
  const all = `${clause} ${it.text}`;
  if (/\b(I heard|rumou?r|apparently|someone (said|mentioned)|not sure if this is real|hallway)\b/i.test(all) || /unknown|forwarded/i.test(it.author_role)) return { g: "U", why: "unattributed or hearsay" };
  if (/\b(might|maybe|possibly|not confirmed)\b/i.test(clause)) return { g: "I", why: "hedged and unconfirmed" };
  if (/calendar|plan of record|locked/i.test(all) && /lead|calendar/i.test(`${it.author_role} ${all}`)) return { g: "V", why: "plan, calendar or system of record" };
  if (/\d/.test(clause) && /lead|manager|analyst|owner/i.test(it.author_role)) return { g: "E", why: "a named owner with specifics" };
  return { g: "I", why: "no owner or no specifics" };
}

/** Split an item into clauses and extract at most one signal per clause that carries one. */
export function extract(items: Item[]): Signal[] {
  const out: Signal[] = [];
  for (const it of items) {
    let k = 0;
    const clauses = it.text.split(/(?<=[.!?])\s+|\s+(?=\d\)\s)|\s+(?=SPEAKER \d+:)|\n+/).map((c) => c.trim()).filter(Boolean);
    for (let i = 0; i < clauses.length; i++) {
      const own = clauses[i]!; const type = typeOf(own); if (type === "other") continue;
      // people put the date in one sentence and the size or the target in the next: read on when this one lacks them
      const next = clauses[i + 1];
      const lacks = !/\d+(\.\d+)?\s*(%|percent)/i.test(own) || !targets(own, it.text).length;
      const clause = lacks && next && !monthDay(next, it.received).length && typeOf(next) !== "other" ? `${own} ${next}` : lacks && next && !monthDay(next, it.received).length && /\d+\s*(%|percent)|\bG\d{3}\b|[ACDE]-S\d{2}/.test(next) ? `${own} ${next}` : own;
      const dates = monthDay(clause, it.received); const range = dayRange(clause, it.received);
      const today = /\btoday\b/i.test(clause) ? it.received : null;
      const start = range?.[0] ?? dates[0] ?? today; if (!start) continue;
      const end = range?.[1] ?? (dates[1] ?? (type === "calendar" ? start : today));
      const pctM = clause.match(/(\d+(?:\.\d+)?)\s*(%|percent)/i);
      const dir = /\b(up|bump|increase|rise|lit up|more)\b/i.test(clause) ? "up" : /\b(down|drop|cut|fewer|reduced|lower)\b/i.test(clause) ? "down" : null;
      const kind = (type === "absence" || type === "weather") && start <= it.received ? "explanation" : "forward";
      let gates = targets(clause, it.text); if (!gates.length && type === "migration" && /legacy book/i.test(it.text)) gates = [];
      const { g } = grade(clause, it);
      // ids are stable (item + clause), so a reviewer's decision stays on its signal as new items arrive
      out.push({ id: `SG-${it.id.replace(/^IT-/, "")}-${++k}`, item: it.id, received: it.received, author_role: it.author_role, source_kind: it.source_kind, clause,
        kind, type, gates, channels: channelsOf(clause), start, end: end ?? null, direction: dir, pct: pctM ? +pctM[1]! : null, grade: g, status: "proposed", needs: "", corroborates: null, explains: [] });
    }
  }
  return out;
}

const overlap = (a: string[], b: string[]) => a.some((x) => b.includes(x));
const near = (a: string, b: string, days = 3) => Math.abs(Date.parse(a) - Date.parse(b)) <= days * 86400000;

/** Grade-based gating, corroboration, plan de-duplication, explanations linked to flags, manual decisions on top. */
export function gate(signals: Signal[], events: LoggedEvent[], detected: Detected[], decisions: Record<string, "accept" | "reject"> = {}): { signals: Signal[]; overlays: Overlay[] } {
  const S = signals.map((s) => ({ ...s, explains: [] as string[] }));
  for (const s of S) {
    if (s.kind === "explanation") {
      const days = new Set<string>(); for (let d = s.start; d <= (s.end ?? s.start); d = addDays(d, 1)) days.add(d);
      const hit = detected.filter((d) => days.has(d.date) && (s.type === "absence" ? d.kind === "suspected-absence" && (!s.gates.length || overlap(d.gates, s.gates)) : d.kind !== "suspected-absence" && (!s.gates.length || overlap(d.gates, s.gates))));
      s.explains = hit.map((d) => `${d.date} ${d.kind} ${d.gates.length > 3 ? d.gates.length + " gates" : d.gates.join(",")}`);
      s.status = "explanation"; s.needs = hit.length ? "" : "no matching flag: file for context"; continue;
    }
    if (s.type === "migration" && events.some((e) => e.type === "migration" && e.start === s.start)) { s.status = "in-plan"; s.needs = "already in the plan of record"; continue; }
    if (s.grade === "U") { s.status = "rumor"; s.needs = "a named owner who will stand behind it"; continue; }
    if (!s.gates.length) { s.status = "proposed"; s.needs = "which gates"; continue; }
    if (s.pct === null || !s.direction) { s.status = "proposed"; s.needs = "a size and direction"; continue; }
    if (s.grade === "I") { s.status = "proposed"; s.needs = "confirmation from the owner"; continue; }
    if (s.grade === "V") { s.status = "applied"; continue; }
    // E: needs the owner's confirmation or an independent second source saying the same thing
    const twin = S.find((o) => o !== s && o.kind === "forward" && (o.grade === "E" || o.grade === "V") && o.author_role !== s.author_role && o.item !== s.item && overlap(o.gates, s.gates) && near(o.start, s.start) && o.direction === s.direction);
    if (twin) { const first = [s, twin].sort((a, b) => a.id.localeCompare(b.id))[0]!; if (first === s) s.status = "applied"; else { s.status = "corroborating"; s.corroborates = first.id; } }
    else { s.status = "proposed"; s.needs = "owner confirmation or a second source"; }
  }
  for (const s of S) { const d = decisions[s.id]; if (d === "reject") { s.status = "rejected"; s.needs = "rejected by the reviewer"; } if (d === "accept" && s.kind === "forward" && s.pct !== null && s.direction && s.gates.length && !["applied", "in-plan"].includes(s.status)) { s.status = "accepted"; s.needs = ""; } }
  // a rejected claim takes its corroborating twins with it: they say the same thing
  for (const s of S) if (s.corroborates && S.find((o) => o.id === s.corroborates)?.status === "rejected") { s.status = "rejected"; s.needs = `same claim as ${s.corroborates}, which was rejected`; }
  const overlays: Overlay[] = S.filter((s) => s.status === "applied" || s.status === "accepted").map((s) => ({
    signals: [s.id, ...S.filter((o) => o.corroborates === s.id).map((o) => o.id)], gates: s.gates, channels: s.channels,
    from: s.start, to: s.type === "calendar" ? (s.end ?? s.start) : s.end && s.end !== s.start ? s.end : null, factor: 1 + (s.direction === "up" ? 1 : -1) * (s.pct! / 100),
  }));
  return { signals: S, overlays };
}

/** The multiplicative factor the applied overlays put on one gate-channel-day. */
export function overlayFactor(overlays: Overlay[], gate: string, channel: Channel, date: string): number {
  let f = 1; for (const o of overlays) if (o.gates.includes(gate) && (!o.channels.length || o.channels.includes(channel)) && date >= o.from && (!o.to || date <= o.to)) f *= o.factor; return f;
}
