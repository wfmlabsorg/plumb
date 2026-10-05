/**
 * world.ts — P0: a synthetic contact center that looks like the real thing.
 *
 * Writes, for every gate × channel × day of history: what was forecast, what happened, how it was
 * staffed and how it performed (the raw extract a WFM platform would export). Also: the events
 * operations logged, the forward outlook of record and supply plan, and — separately — the planted
 * truth the cycle is scored against (never shown to the cycle).
 */
import { agentsFor, erlangA } from "./erlang";
import { GATES, PLANT, PRODUCTIVE_HOURS_PER_FTE_DAY, type ChannelSpec, type Gate } from "./registry";
import { Rng, streamSeed } from "./rng";

// ---- calendar ------------------------------------------------------------------------------------
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
export const dow = (s: string) => new Date(s + "T00:00:00Z").getUTCDay(); // 0 Sun … 6 Sat
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const nthWeekday = (y: number, m: number, wd: number, n: number) => { const d = new Date(Date.UTC(y, m, 1)); while (d.getUTCDay() !== wd) d.setUTCDate(d.getUTCDate() + 1); d.setUTCDate(d.getUTCDate() + 7 * (n - 1)); return iso(d); };
const lastWeekday = (y: number, m: number, wd: number) => { const d = new Date(Date.UTC(y, m + 1, 0)); while (d.getUTCDay() !== wd) d.setUTCDate(d.getUTCDate() - 1); return iso(d); };

/** US holidays and their multipliers on volume (NA full strength; other regions only the year-end). */
export function holidayMap(years: number[]): Map<string, { name: string; f: number; naOnly: boolean }> {
  const m = new Map<string, { name: string; f: number; naOnly: boolean }>();
  const put = (d: string, name: string, f: number, naOnly = true) => m.set(d, { name, f: Math.min(m.get(d)?.f ?? 1, f), naOnly });
  for (const y of years) {
    put(`${y}-01-01`, "New Year's Day", 0.35, false); put(`${y}-01-02`, "New Year (return)", 0.85, false);
    put(nthWeekday(y, 0, 1, 3), "MLK Day", 0.85); put(nthWeekday(y, 1, 1, 3), "Presidents Day", 0.85);
    const mem = lastWeekday(y, 4, 1); put(mem, "Memorial Day", 0.45); put(addDays(mem, 1), "Memorial Day (return)", 1.1);
    put(`${y}-06-19`, "Juneteenth", 0.9); put(`${y}-07-04`, "Independence Day", 0.4);
    const lab = nthWeekday(y, 8, 1, 1); put(lab, "Labor Day", 0.45); put(addDays(lab, 1), "Labor Day (return)", 1.1);
    const tg = nthWeekday(y, 10, 4, 4);
    ([[-3, 0.95], [-2, 0.85], [-1, 0.7], [0, 0.3], [1, 0.45], [2, 0.85], [3, 1.15]] as [number, number][]).forEach(([o, f]) => put(addDays(tg, o), o === 0 ? "Thanksgiving" : "Thanksgiving week", f));
    put(`${y}-12-24`, "Christmas Eve", 0.45, false); put(`${y}-12-25`, "Christmas", 0.25, false); put(`${y}-12-26`, "Boxing Day", 0.6, false);
    for (const d of [27, 28, 29, 30]) put(`${y}-12-${d}`, "Year-end", 0.7, false);
    put(`${y}-12-31`, "New Year's Eve", 0.5, false);
  }
  return m;
}

// ---- demand shape ------------------------------------------------------------------------------
const DOW_VOICE = [0.47, 1.22, 1.18, 1.03, 1.1, 1.08, 0.52];      // Sun … Sat: busy Mon/Tue, Wed dips, Thu/Fri up, weekend drops
const DOW_EMAIL = [0.35, 1.25, 1.2, 1.08, 1.12, 1.05, 0.4];
const DOW_24H = [0.8, 1.08, 1.06, 1.0, 1.04, 1.06, 0.86];
const norm = (a: number[]) => { const m = a.reduce((s, x) => s + x, 0) / a.length; return a.map((x) => x / m); };
const DOWS = { voice: norm(DOW_VOICE), chat: norm(DOW_VOICE), email: norm(DOW_EMAIL), h24: norm(DOW_24H) };

/** Business seasonality: anchors mid-month, cosine-interpolated; October peak; late-November slide. */
const SEASON = [0.9, 0.98, 1.06, 1.04, 1.05, 1.02, 0.93, 0.91, 1.07, 1.13, 0.97, 0.82];
export function season(s: string): number {
  const d = new Date(s + "T00:00:00Z"); const m = d.getUTCMonth(), day = d.getUTCDate();
  const t = (day - 15) / 30; const m2 = (m + (t >= 0 ? 1 : 11)) % 12; const w = Math.abs(t);
  const a = SEASON[m]!, b = SEASON[m2]!; const k = (1 - Math.cos(Math.PI * w)) / 2;
  let f = a * (1 - k) + b * k;
  if (m === 10 && day >= 16) f *= 0.92; // business demand dries up into Thanksgiving
  return f;
}
const seasonAHT = (s: string) => 1 + 0.06 * (season(s) - 1); // busier periods run slightly longer

/** Intraday arrival profile over open hours (morning and early-afternoon peaks). */
export function profile(open: [number, number]): number[] {
  const w: number[] = [];
  for (let h = open[0]; h < open[1]; h++) {
    const x = h + 0.5;
    w.push(open[1] - open[0] >= 24 ? 0.35 + Math.exp(-((x - 10) ** 2) / 18) + 0.8 * Math.exp(-((x - 15) ** 2) / 14) : 0.15 + Math.exp(-((x - 10) ** 2) / 6) + 0.85 * Math.exp(-((x - 14.5) ** 2) / 8));
  }
  const t = w.reduce((s, x) => s + x, 0); return w.map((x) => x / t);
}

// ---- planted truth -----------------------------------------------------------------------------
export interface Storm { id: string; start: string; days: number; intensity: number; gates: string[]; logged: boolean; name: string }
export interface Outage { id: string; date: string; gate: string; channel: string; logged: boolean }
export interface Absence { id: string; start: string; days: number; extra: number; gates: string[]; logged: boolean }
export interface Truth {
  seed: number; start: string; end: string;
  levelShift: { gate: string; from: string; factor: number; forecasterLearns: { startAfterDays: number; fullAfterDays: number } };
  migration: { from: string; to: string; waves: { date: string; cumulativeShare: number }[]; trueContactRatio: number; plannedContactRatio: number; ahtUpliftFirst6Weeks: number; ahtUpliftAfter: number };
  storms: Storm[]; outages: Outage[]; absences: Absence[];
  fakeSignal: { claim: string; gate: string; date: string; happened: false };
  /** real future effects the forecast of record does not know about (what the intake signals describe) */
  scheduled: { id: string; source: string; gates: string[]; channels: string[]; from: string; to: string | null; factor: number }[];
}

function plantTruth(start: string, end: string, seed: number): Truth {
  // one stream per component, so a longer world adds events at the end and never moves earlier ones
  let rng = new Rng(streamSeed(seed, "storms"));
  const storms: Storm[] = []; const outages: Outage[] = []; const absences: Absence[] = [];
  const na = GATES.filter((g) => g.region === "NA").map((g) => g.id);
  let n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const m = new Date(d + "T00:00:00Z").getUTCMonth();
    const pStorm = [11, 0, 1].includes(m) ? 0.045 : [7, 8, 9].includes(m) ? 0.035 : [5, 6].includes(m) ? 0.03 : 0.012; // winter storms, hurricanes, summer thunderstorms
    if (rng.chance(pStorm)) { storms.push({ id: `ST${String(++n).padStart(3, "0")}`, start: d, days: 1 + Math.floor(rng.next() * 3), intensity: +(0.2 + rng.next() * 0.5).toFixed(2), gates: na.filter(() => rng.chance(0.75)), logged: rng.chance(0.8), name: [11, 0, 1].includes(m) ? "winter storm" : [7, 8, 9].includes(m) ? "tropical storm" : "thunderstorms" }); d = addDays(d, 3); }
  }
  // the planted hurricane at the end of September 2026
  storms.push({ id: "ST-PLANT", start: "2026-09-28", days: 3, intensity: 0.65, gates: [...new Set([PLANT.migrationTo, PLANT.levelShift, PLANT.esc, PLANT.afterHours, PLANT.migrationFrom, ...GATES.filter((g) => g.region === "NA" && g.weatherSensitivity >= 0.6 && (g.product === "A" || g.product === "C")).map((g) => g.id)])], logged: true, name: "hurricane" });
  let o = 0; rng = new Rng(streamSeed(seed, "outages"));
  for (let d = start; d <= end; d = addDays(d, 1)) if (rng.chance(2 / 365)) { const g = rng.pick(GATES); outages.push({ id: `OU${String(++o).padStart(2, "0")}`, date: d, gate: g.id, channel: rng.pick(g.channels).channel, logged: true }); }
  outages.push({ id: "OU-PLANT", date: "2026-08-19", gate: PLANT.outage, channel: "chat", logged: true });
  let a = 0; rng = new Rng(streamSeed(seed, "absences"));
  for (const y of [2025, 2026]) for (const region of ["NA", "EMEA", "APAC"]) for (let k = 0; k < 2; k++) {
    const s = addDays(`${y}-01-06`, Math.floor(rng.next() * 45));
    if (s >= start && s <= end) absences.push({ id: `AB${String(++a).padStart(2, "0")}`, start: s, days: 3 + Math.floor(rng.next() * 4), extra: +(0.06 + rng.next() * 0.08).toFixed(3), gates: GATES.filter((g) => g.region === region).map((g) => g.id), logged: rng.chance(0.5) });
  }
  absences.push({ id: "AB-PLANT", start: "2026-09-14", days: 3, extra: 0.25, gates: [PLANT.smallAbsence], logged: false }); // a quarter of a small pool out sick
  return {
    seed, start, end, storms, outages, absences,
    levelShift: { gate: PLANT.levelShift, from: "2026-06-15", factor: 1.12, forecasterLearns: { startAfterDays: 14, fullAfterDays: 70 } },
    migration: { from: PLANT.migrationFrom, to: PLANT.migrationTo, waves: [{ date: "2026-07-13", cumulativeShare: 0.25 }, { date: "2026-09-28", cumulativeShare: 0.55 }, { date: "2027-02-01", cumulativeShare: 0.9 }], trueContactRatio: 1.25, plannedContactRatio: 1.0, ahtUpliftFirst6Weeks: 0.18, ahtUpliftAfter: 0.06 },
    scheduled: [
      { id: "SC-ONBOARD", source: "IT-002/IT-003", gates: GATES.filter((g) => g.segment === "A-S08").map((g) => g.id), channels: [], from: "2026-11-09", to: null, factor: 1.15 },
      { id: "SC-COLUMBUS", source: "IT-008", gates: GATES.filter((g) => g.product === "D" && g.id !== PLANT.esc).map((g) => g.id), channels: [], from: "2026-10-12", to: "2026-10-12", factor: 0.6 },
      { id: "SC-CHAT-TIMEOUT", source: "IT-007", gates: GATES.filter((g) => g.product === "E").map((g) => g.id), channels: ["chat"], from: "2026-10-20", to: null, factor: 1.1 },
    ],
    fakeSignal: { claim: `A client moves 3,000 users to self-service on 2026-10-12, cutting ${PLANT.fakeSignal} voice by about 15%`, gate: PLANT.fakeSignal, date: "2026-10-12", happened: false },
  };
}

// ---- the expected-volume model -----------------------------------------------------------------
interface Effects { level: number; storm: number; stormAht: number; outage: number; outageAht: number; absence: number; ot: number }
const dowOf = (g: Gate, c: ChannelSpec, d: string) => (g.openHours[1] - g.openHours[0] >= 24 ? DOWS.h24 : DOWS[c.channel])[dow(d)]!;

function effects(t: Truth, g: Gate, c: ChannelSpec, d: string, view: "true" | "forecaster"): Effects {
  const e: Effects = { level: 1, storm: 1, stormAht: 1, outage: 1, outageAht: 1, absence: 0, ot: 0 };
  const ls = t.levelShift;
  if (g.id === ls.gate && d >= ls.from) {
    if (view === "true") e.level = ls.factor;
    else { const k = daysBetween(ls.from, d); const f = Math.min(1, Math.max(0, (k - ls.forecasterLearns.startAfterDays) / (ls.forecasterLearns.fullAfterDays - ls.forecasterLearns.startAfterDays))); e.level = 1 + (ls.factor - 1) * f; }
  }
  if (view === "forecaster") return e; // the forecast never knew about storms, outages or absence spikes
  for (const s of t.storms) {
    const k = daysBetween(s.start, d);
    const hit = s.gates.includes(g.id) ? g.weatherSensitivity * s.intensity : 0;
    if (hit && k >= 0 && k < s.days) { const shape = k === 0 ? 1 : k === 1 ? 0.8 : 0.5; e.storm *= 1 + hit * shape * (c.channel === "voice" ? 1 : c.channel === "chat" ? 0.6 : 0.3); e.stormAht *= 1 + 0.35 * hit * shape; e.ot = 0.03; }
    if (hit && k === s.days && c.channel === "email") e.storm *= 1 + 0.25 * hit; // the email backlog lands the day after
  }
  for (const o of t.outages) if (o.gate === g.id && o.channel === c.channel) { if (d === o.date) { e.outage = 0.65; e.outageAht = 1.2; } if (d === addDays(o.date, 1)) { e.outage = 1.25; e.outageAht = 1.15; } }
  for (const a of t.absences) { const k = daysBetween(a.start, d); if (a.gates.includes(g.id) && k >= 0 && k < a.days) e.absence += a.extra; }
  return e;
}

function migrationFactor(t: Truth, g: Gate, c: ChannelSpec, d: string, view: "true" | "forecaster"): { vol: (fromVol: number) => number; self: number; aht: number } {
  const mg = t.migration; let share = 0, last = "";
  for (const w of mg.waves) if (d >= w.date) { share = w.cumulativeShare; last = w.date; }
  const ratio = view === "true" ? mg.trueContactRatio : mg.plannedContactRatio;
  if (g.id === mg.from) return { vol: () => 0, self: 1 - share, aht: 1 };
  if (g.id === mg.to) {
    const recent = last && daysBetween(last, d) < 42;
    const up = view === "true" ? (recent ? mg.ahtUpliftFirst6Weeks : share > 0 ? mg.ahtUpliftAfter : 0) : share > 0 ? 0.05 : 0;
    return { vol: (fromVol) => fromVol * share * ratio, self: 1, aht: 1 + up };
  }
  return { vol: () => 0, self: 1, aht: 1 };
}

const baseVol = (t: Truth, g: Gate, c: ChannelSpec, d: string) => c.baseDaily * Math.pow(1 + g.trendPerYear, daysBetween(t.start, d) / 365) * dowOf(g, c, d) * season(d) * (g.product === "E" && [6, 7].includes(new Date(d + "T00:00:00Z").getUTCMonth()) ? 1.05 : 1);

function holidayF(h: ReturnType<typeof holidayMap>, g: Gate, d: string) { const x = h.get(d); if (!x) return 1; if (x.naOnly && g.region !== "NA") return 1; return g.product === "D" && x.naOnly ? Math.min(1, x.f * 0.7) : x.f; }

export function expectedVolume(t: Truth, h: ReturnType<typeof holidayMap>, g: Gate, c: ChannelSpec, d: string, view: "true" | "forecaster"): number {
  const e = effects(t, g, c, d, view); const m = migrationFactor(t, g, c, d, view);
  let v = baseVol(t, g, c, d) * holidayF(h, g, d) * e.level * m.self;
  if (g.id === t.migration.to) { const from = GATES.find((x) => x.id === t.migration.from)!; const fc = from.channels.find((x) => x.channel === c.channel); if (fc) v += m.vol(baseVol(t, from, fc, d) * holidayF(h, from, d)); }
  let sched = 1;
  if (view === "true") for (const x of t.scheduled) if (x.gates.includes(g.id) && (!x.channels.length || x.channels.includes(c.channel)) && d >= x.from && (!x.to || d <= x.to)) sched *= x.factor;
  return v * e.storm * e.outage * sched;
}
export function expectedAht(t: Truth, g: Gate, c: ChannelSpec, d: string, view: "true" | "forecaster"): number {
  const e = effects(t, g, c, d, view); const m = migrationFactor(t, g, c, d, view);
  return c.ahtSec * seasonAHT(d) * (dow(d) === 1 ? 1.02 : 1) * e.stormAht * e.outageAht * m.aht;
}

// ---- staffing and outcomes ---------------------------------------------------------------------
export interface HourPlan { agents: number[]; fte: number }
/** Required productive FTE for a day: Erlang C per open hour (voice/chat), workload for email. */
export function required(g: Gate, c: ChannelSpec, vol: number, aht: number): HourPlan {
  const w = profile(g.openHours);
  if (c.channel === "email") { const hrs = (vol * aht) / 3600 / 0.85; return { agents: w.map((x) => (hrs * x)), fte: hrs / PRODUCTIVE_HOURS_PER_FTE_DAY }; }
  const eff = aht / c.concurrency;
  const agents = w.map((x) => agentsFor((vol * x * eff) / 3600, eff, c.targetSL, c.thresholdSec));
  return { agents, fte: agents.reduce((s, a) => s + a, 0) / PRODUCTIVE_HOURS_PER_FTE_DAY };
}

/**
 * The day's outcome, realized rather than expected: arrivals clump hour by hour, and each call is
 * answered in threshold (or abandoned) by chance around the Erlang A probability. Large pools
 * average that out; a gate of a few agents taking forty calls a day cannot.
 */
export function outcome(g: Gate, c: ChannelSpec, vol: number, aht: number, actFte: number, planShape: number[], actReqFte: number, rng: Rng) {
  const w = profile(g.openHours);
  if (c.channel === "email") {
    const cover = actReqFte > 0 ? actFte / actReqFte : 1;
    const expected = cover >= 0.9 ? 0.97 : Math.max(0.2, 0.97 - 1.2 * (0.9 - cover)); // deferred work: a shortfall builds backlog, it does not collapse
    const inSl = rng.binomial(vol, expected);
    return { inSl, abandoned: 0, asa: NaN };
  }
  // realized hourly arrivals: Poisson with hour-level clumping, rescaled to the day's total
  const raw = w.map((x) => rng.poisson(vol * x * rng.lognormal1(0.1)));
  const tot = raw.reduce((s, x) => s + x, 0) || 1;
  let left = vol; const arr = raw.map((x, i) => { const a = i === raw.length - 1 ? left : Math.min(left, Math.round((x * vol) / tot)); left -= a; return a; });
  const shape = planShape.reduce((s, x) => s + x, 0) || 1; const agentHours = actFte * PRODUCTIVE_HOURS_PER_FTE_DAY; const eff = aht / c.concurrency;
  let inSl = 0, abandoned = 0, asaN = 0, answered = 0;
  arr.forEach((a, i) => {
    if (!a) return;
    const n = (agentHours * planShape[i]!) / shape, lo = Math.floor(n), f = n - lo; // fractional agents: interpolate, never round capacity away
    const r0 = erlangA(a / 3600, eff, lo, c.patienceSec, c.thresholdSec), r1 = f > 0 ? erlangA(a / 3600, eff, lo + 1, c.patienceSec, c.thresholdSec) : r0;
    const r = { sl: r0.sl * (1 - f) + r1.sl * f, abandon: r0.abandon * (1 - f) + r1.abandon * f, asa: (Number.isFinite(r0.asa) ? r0.asa : r1.asa) * (1 - f) + r1.asa * f };
    const wouldAbandon = rng.binomial(a, r.abandon);
    const ab = !g.pooled && g.sizeFte < 20 ? rng.binomial(wouldAbandon, 0.4) : wouldAbandon; // small gates overflow to backup skills: 60% of would-be abandons are answered, late
    const ans = a - ab;
    inSl += Math.min(ans, rng.binomial(a, r.sl)); abandoned += ab; asaN += r.asa * ans; answered += ans;
  });
  return { inSl, abandoned, asa: answered ? asaN / answered : 0 };
}

// ---- the build ---------------------------------------------------------------------------------
export interface ExtractRow {
  date: string; gate: string; channel: string;
  fc_volume: number; act_volume: number; fc_aht_sec: number; act_aht_sec: number;
  fc_req_fte: number; sched_open_fte: number; act_req_fte: number; act_fte: number;
  offered: number; handled: number; answered_in_sl: number; abandoned: number;
  sl: number; asa_sec: number | null; target_sl: number;
}
export interface LoggedEvent { id: string; start: string; end: string; gates: string; channels: string; type: string; description: string; source: string; params: string }
export interface OutlookRow { as_of: string; date: string; gate: string; channel: string; fc_volume: number; fc_aht_sec: number; fc_req_fte: number; planned_sched_fte: number }

export interface World { truth: Truth; extract: ExtractRow[]; events: LoggedEvent[]; outlook: OutlookRow[] }

export function buildWorld(opts: { seed?: number; start?: string; end?: string; horizonDays?: number } = {}): World {
  // the generator needs the synthetic estate's volume and handle-time parameters; a registry loaded from real
  // files has none, and would silently produce a world of zeros
  const bare = GATES.flatMap((g) => g.channels).filter((c) => !(c.baseDaily > 0) || !(c.ahtSec > 0)).length;
  if (bare) throw new Error(`buildWorld needs the synthetic registry (${bare} gate-channels have no base volume or handle time); call useSyntheticRegistry() first`);
  const seed = opts.seed ?? 20261004, start = opts.start ?? "2024-10-01", end = opts.end ?? "2026-10-03", horizon = opts.horizonDays ?? 182;
  const truth = plantTruth(start, end, seed);
  const hol = holidayMap([2024, 2025, 2026, 2027]);
  const extract: ExtractRow[] = []; const outlook: OutlookRow[] = [];
  const asOf = addDays(end, 1); const last = addDays(end, horizon);
  for (const g of GATES) for (const c of g.channels) {
    const S = (purpose: string) => new Rng(streamSeed(seed, g.id, c.channel, purpose));
    const fxV = S("fc-volume"), fxA = S("fc-aht"), fxS = S("schedule"), fx = S("actuals");
    const bias = g.product === "E" ? 1.01 : g.product === "C" ? 0.99 : 1;
    // forecast-required series for the whole span first: the schedule follows the requirement with a lag
    const days: string[] = []; for (let d = start; d <= last; d = addDays(d, 1)) days.push(d);
    const fcVol = days.map((d) => expectedVolume(truth, hol, g, c, d, "forecaster") * bias * fxV.lognormal1(0.04));
    const fcAht = days.map((d) => expectedAht(truth, g, c, d, "forecaster") * fxA.lognormal1(0.02));
    const fcPlan = days.map((_, i) => required(g, c, fcVol[i]!, fcAht[i]!));
    const wk = (i: number) => { let s = 0, n = 0; for (let j = i - 3; j <= i + 3; j++) if (j >= 0 && j < days.length) { s += fcPlan[j]!.fte; n++; } return s / n; };
    days.forEach((d, i) => {
      const fv = fcVol[i]!, fa = fcAht[i]!, fp = fcPlan[i]!;
      const lagRatio = i >= 42 ? Math.min(1.12, Math.max(0.88, 1 + 0.5 * (wk(i - 42) / Math.max(wk(i), 1e-6) - 1))) : 1; // capacity was built for six weeks ago
      const sched = fp.fte * 1.06 * lagRatio * fxS.lognormal1(0.03);
      if (d > end) { outlook.push({ as_of: asOf, date: d, gate: g.id, channel: c.channel, fc_volume: Math.round(fv), fc_aht_sec: Math.round(fa), fc_req_fte: +fp.fte.toFixed(1), planned_sched_fte: +sched.toFixed(1) }); return; }
      const e = effects(truth, g, c, d, "true");
      const actVol = fx.poisson(expectedVolume(truth, hol, g, c, d, "true") * fx.lognormal1(c.noiseCv));
      const actAht = expectedAht(truth, g, c, d, "true") * fx.lognormal1(0.035);
      const actFte = Math.max(0, sched * (1 - fx.normal(0, 0.025) - e.absence) * (1 + e.ot));
      const actReq = required(g, c, actVol, actAht);
      const out = outcome(g, c, actVol, actAht, actFte, fp.agents, actReq.fte, fx);
      const handled = actVol - out.abandoned;
      extract.push({
        date: d, gate: g.id, channel: c.channel, fc_volume: Math.round(fv), act_volume: actVol, fc_aht_sec: Math.round(fa), act_aht_sec: Math.round(actAht),
        fc_req_fte: +fp.fte.toFixed(1), sched_open_fte: +sched.toFixed(1), act_req_fte: +actReq.fte.toFixed(1), act_fte: +actFte.toFixed(1),
        offered: actVol, handled, answered_in_sl: Math.min(handled, out.inSl), abandoned: out.abandoned,
        sl: actVol ? +(Math.min(handled, out.inSl) / actVol).toFixed(3) : 1, asa_sec: Number.isNaN(out.asa) ? null : Math.round(out.asa), target_sl: c.targetSL,
      });
    });
  }
  // what operations logged (not the truth)
  const events: LoggedEvent[] = [];
  for (const s of truth.storms) if (s.logged && s.gates.length) events.push({ id: s.id, start: s.start, end: addDays(s.start, s.days - 1), gates: s.gates.join(";"), channels: "voice;chat;email", type: "weather", description: `${s.name}, service disruption in affected markets`, source: "weather-feed", params: "" });
  for (const o of truth.outages) events.push({ id: o.id, start: o.date, end: o.date, gates: o.gate, channels: o.channel, type: "outage", description: `${o.channel} platform outage`, source: "incident-log", params: "" });
  for (const a of truth.absences) if (a.logged) events.push({ id: a.id, start: a.start, end: addDays(a.start, a.days - 1), gates: a.gates.join(";"), channels: "voice;chat;email", type: "absence", description: "illness spike, unplanned absence above plan", source: "ops-log", params: "" });
  for (const [d, x] of hol) if (d >= start && d <= last && x.f < 1) events.push({ id: `HOL-${d}`, start: d, end: d, gates: x.naOnly ? GATES.filter((g) => g.region === "NA").map((g) => g.id).join(";") : "*", channels: "voice;chat;email", type: "holiday", description: x.name, source: "calendar", params: "" });
  truth.migration.waves.forEach((w, i) => events.push({ id: `MIG-W${i + 1}`, start: w.date, end: w.date, gates: `${truth.migration.from};${truth.migration.to}`, channels: "voice;chat;email", type: "migration", description: `migration wave ${i + 1}: ${Math.round(w.cumulativeShare * 100)}% of the legacy book moved (planned contact ratio ${truth.migration.plannedContactRatio})`, source: "plan", params: `from=${truth.migration.from};to=${truth.migration.to};share=${w.cumulativeShare};planned_ratio=${truth.migration.plannedContactRatio}` }));
  events.sort((a, b) => a.start.localeCompare(b.start));
  extract.sort((a, b) => a.date.localeCompare(b.date) || a.gate.localeCompare(b.gate) || a.channel.localeCompare(b.channel));
  return { truth, extract, events, outlook };
}
