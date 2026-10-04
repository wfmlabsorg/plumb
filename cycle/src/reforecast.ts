/**
 * reforecast.ts — Stage 2 + 4: the daily reforecast.
 *
 * Replays history one day at a time and keeps, per gate × channel, a learned correction to the
 * forecast of record (log scale, volume and handle time). It learns ONLY from clean days:
 *   - days a logged weather, outage or holiday event touches (and the day after) are "explained";
 *   - days it flags itself (one-series outliers, estate-wide spikes = suspected unlogged disruption)
 *     are excluded;
 *   - staffing shortfalls are flagged as suspected absence and never touch demand.
 * One odd day barely moves the baseline; a CUSUM shift detector speeds learning once a run of
 * same-direction misses confirms a real change. Migrations are modeled explicitly: the observed
 * contact ratio on migrated volume is estimated against plan and carried forward as an overlay.
 * The cycle never reads the planted truth.
 */
import { erlangCSL } from "./erlang";
import { GATES, PRODUCTIVE_HOURS_PER_FTE_DAY, gate as gateOf, type Gate, type ChannelSpec } from "./registry";
import { addDays, profile, required, type ExtractRow, type LoggedEvent, type OutlookRow } from "./world";
import { overlayFactor, type Overlay } from "./signals";

export const CFG = { confirmDays: 7, confirmZ: 0.8, supplyMin: 0.08, alpha: 0.01, alphaFast: 0.2, fastDays: 10, cap: 0.03, capAht: 0.02, k: 0.5, h: 4, window: 56, minObs: 14, zFlag: 3.5, estateZ: 1.5, estateShare: 0.3, supplyZ: 3, settleDays: 7, minPlannedForRatio: 500 };

interface Series {
  key: string; gate: string; channel: string;
  L: number; La: number; hist: number[]; histA: number[]; histS: number[];
  up: number; dn: number; fastUntil: string; shifts: { date: string; dir: "up" | "down" }[]; clean: number;
  pending: { date: string; dir: "up" | "down"; z: number[] } | null; alarms: number;
  trail: Map<string, number>; // date → L, for scoring and the report
  trailA: Map<string, number>; // date → La
}
export interface Migration { from: string; to: string; waves: { date: string; share: number }[]; plannedRatio: number; R: Map<string, number>; settle: string; Rtrail: Map<string, Map<string, number>>; acc: Map<string, { excess: number; planned: number; own: number; days: number; Lfrozen: number; LfrozenSd: number; ex: number[]; pl: number[]; se: number; applied: boolean }> }
export interface Detected { date: string; kind: "suspected-disruption" | "anomaly" | "suspected-absence"; gates: string[]; channel?: string; detail: string }
export interface CycleState { asOf: string; series: Map<string, Series>; migrations: Migration[]; detected: Detected[]; explained: number; excluded: number }

const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
const robustSd = (a: number[], floor: number) => { if (a.length < CFG.minObs) return Math.max(floor, 0.08); const m = median(a); return Math.max(floor, 1.4826 * median(a.map((x) => Math.abs(x - m)))); };
const clamp = (x: number, c: number) => Math.max(-c, Math.min(c, x));
const push = (a: number[], x: number) => { a.push(x); if (a.length > CFG.window) a.shift(); };
const touches = (e: LoggedEvent, gate: string, date: string) => (e.gates === "*" || e.gates.split(";").includes(gate)) && e.start <= date && date <= e.end;

export function parseMigrations(events: LoggedEvent[]): Migration[] {
  const by = new Map<string, Migration>();
  for (const e of events.filter((x) => x.type === "migration" && x.params)) {
    const p = Object.fromEntries(e.params.split(";").map((kv) => kv.split("=") as [string, string]));
    const k = `${p.from}>${p.to}`;
    const m: Migration = by.get(k) ?? { from: p.from!, to: p.to!, waves: [], plannedRatio: +(p.planned_ratio ?? 1), R: new Map(), settle: "", acc: new Map(), Rtrail: new Map() };
    m.waves.push({ date: e.start, share: +(p.share ?? 0) }); by.set(k, m);
  }
  for (const m of by.values()) m.waves.sort((a, b) => a.date.localeCompare(b.date));
  return [...by.values()];
}
const shareAt = (m: Migration, d: string) => { let s = 0; for (const w of m.waves) if (d >= w.date) s = w.share; return s; };
const lastWave = (m: Migration, d: string) => { let w = ""; for (const x of m.waves) if (d >= x.date) w = x.date; return w; };

/** Planned migrated volume landing on the to-gate on day d (from the from-gate's forecast, at the planned ratio). */
function migPlanned(m: Migration, d: string, fcFrom: number | undefined): number {
  const sh = shareAt(m, d); if (!sh || fcFrom === undefined || sh >= 1) return 0;
  return (fcFrom / (1 - sh)) * sh * m.plannedRatio;
}

export function replay(extract: ExtractRow[], events: LoggedEvent[], through: string): CycleState {
  const series = new Map<string, Series>(); const migrations = parseMigrations(events); const detected: Detected[] = [];
  const byDate = new Map<string, ExtractRow[]>(); for (const r of extract) if (r.date <= through) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
  const transient = events.filter((e) => ["weather", "outage", "holiday"].includes(e.type));
  const absenceLogged = events.filter((e) => e.type === "absence");
  const naVoice = new Set(GATES.filter((g) => g.region === "NA" && g.channels.some((c) => c.channel === "voice")).map((g) => g.id));
  let explained = 0, excluded = 0;
  for (const date of [...byDate.keys()].sort()) {
    const rows = byDate.get(date)!; const fcOf = new Map(rows.map((r) => [`${r.gate}/${r.channel}`, r.fc_volume]));
    const calc = rows.map((r) => {
      const key = `${r.gate}/${r.channel}`;
      let s = series.get(key); if (!s) { s = { key, gate: r.gate, channel: r.channel, L: 0, La: 0, hist: [], histA: [], histS: [], up: 0, dn: 0, fastUntil: "", shifts: [], clean: 0, trail: new Map(), trailA: new Map(), pending: null, alarms: 0 }; series.set(key, s); }
      const mig = migrations.find((m) => m.to === r.gate);
      const mp = mig ? migPlanned(mig, date, fcOf.get(`${mig.from}/${r.channel}`)) : 0;
      const R = mig ? (mig.R.get(r.channel) ?? mig.plannedRatio) : 1;
      // the learned level applies to the gate's own volume; migrated volume carries the estimated ratio
      const expected = Math.max(0, r.fc_volume - mp) * Math.exp(s.L) + mp * (R / (mig?.plannedRatio ?? 1));
      const e = Math.log((r.act_volume + 1) / (expected + 1));
      const ea = r.act_volume > 0 && r.fc_aht_sec > 0 ? Math.log(r.act_aht_sec / r.fc_aht_sec) - s.La : 0;
      const sup = r.sched_open_fte > 0 ? (r.act_fte - r.sched_open_fte) / r.sched_open_fte : 0;
      const sd = robustSd(s.hist, Math.sqrt(1 / Math.max(r.fc_volume, 1))), sda = robustSd(s.histA, 0.02), sds = robustSd(s.histS, 0.01);
      const logged = transient.some((ev) => touches(ev, r.gate, date) || (ev.type !== "holiday" && touches(ev, r.gate, addDays(date, -1))));
      return { r, s, key, mig, mp, e, ea, sup, z: e / sd, za: ea / sda, zs: (sup - median(s.histS)) / sds, sd, logged };
    });
    // estate-wide spike on NA voice gates that nothing logged explains → suspected unlogged disruption
    const na = calc.filter((c) => c.r.channel === "voice" && naVoice.has(c.r.gate) && !c.logged);
    const hot = na.filter((c) => c.z > CFG.estateZ);
    const disrupted = new Set<string>();
    if (na.length >= 10 && hot.length / na.length >= CFG.estateShare) {
      for (const c of calc.filter((x) => naVoice.has(x.r.gate) && x.z > 2)) disrupted.add(c.r.gate);
      detected.push({ date, kind: "suspected-disruption", gates: [...disrupted].sort(), detail: `${hot.length} of ${na.length} NA voice gates above +${CFG.estateZ}σ with nothing logged` });
    }
    for (const c of calc) {
      const { r, s } = c;
      // supply: a staffing shortfall nothing logged explains
      if (c.zs < -CFG.supplyZ && c.sup < -CFG.supplyMin && r.sched_open_fte - r.act_fte >= 0.5 && s.histS.length >= CFG.minObs && !absenceLogged.some((ev) => touches(ev, r.gate, date)) && !detected.some((d) => d.date === date && d.kind === "suspected-absence" && d.gates[0] === r.gate))
        detected.push({ date, kind: "suspected-absence", gates: [r.gate], channel: r.channel, detail: `staff ${(c.sup * 100).toFixed(1)}% vs schedule (z ${c.zs.toFixed(1)})` });
      push(s.histS, c.sup);
      if (c.logged) { explained++; s.trail.set(date, s.L); continue; }
      if (disrupted.has(r.gate)) { excluded++; s.trail.set(date, s.L); continue; }
      if (s.hist.length >= CFG.minObs && (Math.abs(c.z) > CFG.zFlag || Math.abs(c.za) > CFG.zFlag)) {
        detected.push({ date, kind: "anomaly", gates: [r.gate], channel: r.channel, detail: `volume ${(c.e * 100).toFixed(1)}% (z ${c.z.toFixed(1)}), AHT ${(c.ea * 100).toFixed(1)}% (z ${c.za.toFixed(1)}) vs learned` });
        excluded++; s.trail.set(date, s.L); continue;
      }
      // clean day on a migration's receiving gate: during a migration the gate's own level and the migrated
      // volume cannot be separated, so the level is frozen at the first wave and the excess is attributed to
      // the migration, estimated as ONE pooled ratio over every clean settled day (a day alone is mostly noise)
      if (c.mig && c.mig.waves[0] && date >= c.mig.waves[0].date) {
        const a = c.mig.acc.get(r.channel) ?? { excess: 0, planned: 0, own: 0, days: 0, Lfrozen: s.L, LfrozenSd: c.sd * Math.sqrt(CFG.alpha / 2), ex: [], pl: [], se: NaN, applied: false }; c.mig.acc.set(r.channel, a);
        const lw = lastWave(c.mig, date);
        if (c.mp > 0 && lw && addDays(lw, CFG.settleDays) <= date) {
          const own = Math.max(0, r.fc_volume - c.mp) * Math.exp(a.Lfrozen), ex = r.act_volume - own;
          a.excess += ex; a.planned += c.mp; a.own += own; a.days++; a.ex.push(ex); a.pl.push(c.mp);
          const Rhat = a.excess / a.planned; // ratio estimator; its standard error from the day-to-day scatter
          // day-to-day scatter, plus the uncertainty of the frozen level: a 1% error on a large own stream swamps a small migrated one
          a.se = Math.hypot(Math.sqrt(a.ex.reduce((t, x, i) => t + (x - Rhat * a.pl[i]!) ** 2, 0)) / a.planned, a.LfrozenSd * (a.own / a.planned));
          a.applied = a.planned >= CFG.minPlannedForRatio && Math.abs(Rhat - 1) > 2 * a.se; // only when clearly distinguishable from plan
          // apply a SHRUNK ratio: pull the estimate toward plan in proportion to its uncertainty (James–Stein style),
          // so a noisy channel does not carry its full overshoot into the forecast
          const dev = Rhat - 1, shrink = Math.max(0, 1 - (a.se * a.se) / (dev * dev || 1e-9));
          if (a.applied) c.mig.R.set(r.channel, Math.max(0.5, Math.min(2.5, c.mig.plannedRatio * (1 + dev * shrink)))); else c.mig.R.delete(r.channel);
        }
        s.L = a.Lfrozen; s.clean++; push(s.histA, c.ea); s.La += clamp(CFG.alpha * c.ea, CFG.capAht); s.trail.set(date, s.L); continue;
      }
      const z = c.z;
      // CUSUM raises an alarm; a shift is CONFIRMED only if the following week's mean error stays on the same side.
      // Across ~130 series a bare CUSUM fires constantly on noise; confirmation kills most of that a week later.
      if (s.pending) {
        s.pending.z.push(z);
        if (s.pending.z.length >= CFG.confirmDays) {
          const m = s.pending.z.reduce((a, b) => a + b, 0) / s.pending.z.length;
          if ((s.pending.dir === "up" ? m : -m) >= CFG.confirmZ) { s.shifts.push({ date: s.pending.date, dir: s.pending.dir }); s.fastUntil = addDays(date, CFG.fastDays); }
          s.pending = null;
        }
      } else {
        s.up = Math.max(0, s.up + z - CFG.k); s.dn = Math.max(0, s.dn - z - CFG.k);
        if (s.up > CFG.h || s.dn > CFG.h) { s.pending = { date, dir: s.up > CFG.h ? "up" : "down", z: [] }; s.alarms++; s.up = s.dn = 0; }
      }
      const a = date <= s.fastUntil ? CFG.alphaFast : CFG.alpha;
      s.L += clamp(a * c.e, CFG.cap); s.La += clamp(CFG.alpha * c.ea, CFG.capAht);
      push(s.hist, c.e); push(s.histA, c.ea); s.clean++; s.trail.set(date, s.L);
    }
    for (const c of calc) c.s.trailA.set(date, c.s.La); // what the cycle knew at the end of each day, for backtests
    for (const m of migrations) m.Rtrail.set(date, new Map(m.R));
  }
  return { asOf: addDays(through, 1), series, migrations, detected, explained, excluded };
}

// ---- forward: the proposed outlook ---------------------------------------------------------------
export interface ProposedRow extends OutlookRow { fc_volume_proposed: number; fc_aht_proposed: number; req_proposed_fte: number; over_under_fte: number; sl_projected: number; overlay_volume: number; signal_overlay_volume: number; sd_log: number }

/** Expected service level for a day at the planned staff (hour by hour, Erlang C; email by cover). */
export function slAt(g: Gate, c: ChannelSpec, vol: number, aht: number, fte: number): number {
  if (vol <= 0) return 1;
  if (c.channel === "email") { const req = required(g, c, vol, aht).fte; const cover = req ? fte / req : 1; return cover >= 0.9 ? 0.97 : Math.max(0.2, 0.97 - 1.2 * (0.9 - cover)); }
  const w = profile(g.openHours), plan = required(g, c, vol, aht).agents, tot = plan.reduce((s, x) => s + x, 0) || 1, eff = aht / c.concurrency;
  let num = 0; w.forEach((x, i) => { const a = (vol * x * eff) / 3600, n = (fte * PRODUCTIVE_HOURS_PER_FTE_DAY * plan[i]!) / tot; num += vol * x * (n > a ? erlangCSL(a, Math.floor(n) || 1, eff, c.thresholdSec) * (1 - (n % 1)) + erlangCSL(a, Math.ceil(n), eff, c.thresholdSec) * (n % 1) : 0); });
  return num / vol;
}

/**
 * @param learnFor gates allowed to use their learned corrections (P6 policy: earned in backtest, or a confirmed
 *                 recent shift). Others stay on the record; explicit overlays (migration, signals) apply everywhere.
 *                 Omitted = every gate learns (used by tests that inspect learning itself).
 */
export function propose(st: CycleState, outlook: OutlookRow[], overlays: Overlay[] = [], learnFor?: Set<string>): ProposedRow[] {
  const fcOf = new Map(outlook.map((r) => [`${r.date}/${r.gate}/${r.channel}`, r.fc_volume]));
  return outlook.map((r) => {
    const s0 = st.series.get(`${r.gate}/${r.channel}`); const s = !learnFor || learnFor.has(r.gate) ? s0 : undefined; const g = gateOf(r.gate); const c = g.channels.find((x) => x.channel === r.channel)!;
    const mig = st.migrations.find((m) => m.to === r.gate);
    const mp = mig ? migPlanned(mig, r.date, fcOf.get(`${r.date}/${mig.from}/${r.channel}`)) : 0;
    const overlay = mig ? ((mig.R.get(r.channel) ?? mig.plannedRatio) / mig.plannedRatio - 1) * mp : 0;
    const base = Math.max(0, r.fc_volume * Math.exp(s?.L ?? 0) + overlay); // learned level + migration overlay
    const vol = base * overlayFactor(overlays, r.gate, r.channel as never, r.date), aht = r.fc_aht_sec * Math.exp(s?.La ?? 0); // + applied signals, tracked apart
    const req = required(g, c, vol, aht).fte;
    return { ...r, fc_volume_proposed: Math.round(vol), fc_aht_proposed: Math.round(aht), req_proposed_fte: +req.toFixed(1), over_under_fte: +(r.planned_sched_fte - req).toFixed(1), sl_projected: +slAt(g, c, vol, aht, r.planned_sched_fte).toFixed(3), overlay_volume: Math.round(overlay), signal_overlay_volume: Math.round(vol - base), sd_log: +robustSd(s0?.hist ?? [], Math.sqrt(1 / Math.max(r.fc_volume, 1))).toFixed(3) };
  });
}

// ---- review list and weekly view -------------------------------------------------------------------
export interface Review { gate: string; product: string; segment: string; workload_change_pct: number; vol_correction_pct: number; aht_correction_pct: number; overlay: number; shifts: string; weeks_short: number; worst_week_over_under: number }
export interface WeekRow { week: string; key: string; req: number; req_p10: number; req_p90: number; sched: number; over_under: number; over_under_pct: number; sl: number }

export function weekly(rows: ProposedRow[], by: (r: ProposedRow) => string, weeks: number): WeekRow[] {
  const start = rows[0]?.as_of ?? ""; const days = weeks * 7; const m = new Map<string, { req: number; sched: number; slN: number; vol: number; var: number; n: number }>();
  for (const r of rows) {
    const i = Math.round((Date.parse(r.date) - Date.parse(start)) / 86400000); if (i < 0 || i >= days) continue;
    const week = addDays(start, Math.floor(i / 7) * 7); const k = `${week}|${by(r)}`;
    const x = m.get(k) ?? { req: 0, sched: 0, slN: 0, vol: 0, var: 0, n: 0 };
    x.req += r.req_proposed_fte; x.sched += r.planned_sched_fte; x.slN += r.sl_projected * r.fc_volume_proposed; x.vol += r.fc_volume_proposed; x.var += (r.req_proposed_fte * r.sd_log) ** 2; x.n++; m.set(k, x);
  }
  return [...m].map(([k, x]) => { const [week, key] = k.split("|") as [string, string]; const sd = Math.sqrt(x.var) + 0.02 * x.req; // daily noise averages within the week; level uncertainty does not
    return { week, key, req: +(x.req / 7).toFixed(1), req_p10: +((x.req - 1.2816 * sd) / 7).toFixed(1), req_p90: +((x.req + 1.2816 * sd) / 7).toFixed(1), sched: +(x.sched / 7).toFixed(1), over_under: +((x.sched - x.req) / 7).toFixed(1), over_under_pct: +(((x.sched - x.req) / Math.max(x.req, 1e-9)) * 100).toFixed(1), sl: x.vol ? +(x.slN / x.vol).toFixed(3) : 1 }; })
    .sort((a, b) => a.week.localeCompare(b.week) || a.key.localeCompare(b.key));
}

export function reviewList(st: CycleState, rows: ProposedRow[], weeks = 12): Review[] {
  const gw = weekly(rows, (r) => r.gate, weeks);
  return GATES.map((g) => {
    const rs = rows.filter((r) => r.gate === g.id && Date.parse(r.date) < Date.parse(r.as_of) + weeks * 7 * 86400000);
    const rec = rs.reduce((s, r) => s + r.fc_req_fte, 0), pro = rs.reduce((s, r) => s + r.req_proposed_fte, 0);
    const ser = g.channels.map((c) => st.series.get(`${g.id}/${c.channel}`)).filter(Boolean) as Series[];
    const w = gw.filter((x) => x.key === g.id);
    const wv = (f: (s: Series) => number) => +((ser.reduce((s, x) => s + f(x), 0) / Math.max(ser.length, 1)) * 100).toFixed(1);
    return { gate: g.id, product: g.product, segment: g.segment, workload_change_pct: rec ? +(((pro - rec) / rec) * 100).toFixed(1) : 0, vol_correction_pct: wv((s) => Math.exp(s.L) - 1), aht_correction_pct: wv((s) => Math.exp(s.La) - 1), overlay: rs.reduce((s, r) => s + r.overlay_volume, 0),
      shifts: ser.flatMap((s) => s.shifts.filter((x) => x.date >= addDays(st.asOf, -60)).map((x) => `${s.channel} ${x.dir} ${x.date}`)).join("; "), weeks_short: w.filter((x) => x.over_under_pct < -5).length, worst_week_over_under: Math.min(...w.map((x) => x.over_under), 0) };
  }).sort((a, b) => Math.abs(b.workload_change_pct) - Math.abs(a.workload_change_pct));
}
