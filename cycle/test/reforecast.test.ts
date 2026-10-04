import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildWorld, required, addDays, type World } from "../src/world";
import { propose, replay, weekly, type CycleState, type ProposedRow } from "../src/reforecast";
import { reforecastMarkdown } from "../src/reforecast-report";
import { GATES, PLANT, gate } from "../src/registry";

// The cycle is scored against planted truth it never sees: only the test reads w.truth.
let w: World, st: CycleState, rows: ProposedRow[];
beforeAll(() => { w = buildWorld(); st = replay(w.extract, w.events, w.truth.end); rows = propose(st, w.outlook); }, 240_000);
const trail = (key: string, d: string) => st.series.get(key)!.trail.get(d)!;

describe("learns what is real", () => {
  test("the client level shift on G103 is learned within weeks, with a shift detected", () => {
    expect(trail(`${PLANT.levelShift}/voice`, "2026-07-24")).toBeGreaterThan(0.06);
    expect(st.series.get(`${PLANT.levelShift}/voice`)!.shifts.some((s) => s.dir === "up" && s.date >= w.truth.levelShift.from && s.date <= "2026-07-15")).toBe(true);
  });
  test("…and unwinds once the forecast of record catches up (the correction is relative to the record)", () => {
    expect(Math.abs(trail(`${PLANT.levelShift}/voice`, "2026-10-03"))).toBeLessThan(0.04);
  });
  test("every channel's migration ratio range contains the truth, and a ratio is applied exactly when its range excludes plan", () => {
    const m = st.migrations[0]!;
    for (const [, a] of m.acc) { const r = m.plannedRatio * a.excess / a.planned;
      expect(Math.abs(r - w.truth.migration.trueContactRatio)).toBeLessThan(2 * a.se);
      expect(a.applied).toBe(a.planned >= 500 && Math.abs(r - m.plannedRatio) > 2 * a.se); }
    expect(m.acc.get("voice")!.applied).toBe(true); // the largest stream is measurable
  });
  test("an applied ratio is shrunk toward plan by its uncertainty, landing closer to the truth than the raw estimate", () => {
    const m = st.migrations[0]!; const a = m.acc.get("voice")!; const raw = m.plannedRatio * a.excess / a.planned; const used = m.R.get("voice")!;
    expect(Math.abs(used - 1)).toBeLessThan(Math.abs(raw - 1)); expect(Math.abs(used - w.truth.migration.trueContactRatio)).toBeLessThanOrEqual(Math.abs(raw - w.truth.migration.trueContactRatio) + 1e-9);
  });
  test("the next wave carries the observed ratio forward as an overlay on the receiving gate only", () => {
    const after = rows.filter((r) => r.gate === PLANT.migrationTo && r.date >= "2027-02-01");
    expect(after.some((r) => r.overlay_volume > 0)).toBe(true);
    expect(rows.filter((r) => r.gate !== PLANT.migrationTo).every((r) => r.overlay_volume === 0)).toBe(true);
  });
});

describe("ignores what is not", () => {
  test("the hurricane teaches the emergency service center nothing", () => {
    expect(Math.abs(trail(`${PLANT.esc}/voice`, "2026-10-01") - trail(`${PLANT.esc}/voice`, "2026-09-27"))).toBeLessThan(0.01);
  });
  test("a staffing shortfall never moves the demand forecast: remove the absence spike and demand learning is identical", () => {
    const noAbsence = w.extract.map((r) => (r.gate === PLANT.smallAbsence && r.date >= "2026-09-14" && r.date <= "2026-09-16" ? { ...r, act_fte: r.sched_open_fte } : r));
    const st2 = replay(noAbsence, w.events, w.truth.end);
    for (const ch of ["voice", "email"]) expect(st2.series.get(`${PLANT.smallAbsence}/${ch}`)!.trail.get("2026-10-03")).toBe(trail(`${PLANT.smallAbsence}/${ch}`, "2026-10-03"));
  }, 120_000);
});

describe("finds what nobody logged", () => {
  test("every unlogged storm is flagged on its first day", () => {
    for (const s of w.truth.storms.filter((x) => !x.logged && x.gates.length)) expect(st.detected.some((d) => d.date === s.start && d.kind !== "suspected-absence")).toBe(true);
  });
  test("estate-wide disruption flags fall only on true storm days", () => {
    const stormDays = new Set(w.truth.storms.flatMap((s) => Array.from({ length: s.days }, (_, k) => addDays(s.start, k))));
    const est = st.detected.filter((d) => d.kind === "suspected-disruption");
    expect(est.length).toBeGreaterThan(0); expect(est.every((d) => stormDays.has(d.date))).toBe(true);
  });
  test("the unlogged absence spike on the small gate is flagged, and absence flags are mostly real", () => {
    const g = st.detected.filter((d) => d.kind === "suspected-absence" && d.gates[0] === PLANT.smallAbsence && d.date >= "2026-09-14" && d.date <= "2026-09-16");
    expect(new Set(g.map((d) => d.date)).size).toBeGreaterThanOrEqual(2);
    const abs = new Set(w.truth.absences.flatMap((a) => a.gates.flatMap((gg) => Array.from({ length: a.days }, (_, k) => `${gg}|${addDays(a.start, k)}`))));
    const flags = st.detected.filter((d) => d.kind === "suspected-absence");
    expect(flags.filter((d) => abs.has(`${d.gates[0]}|${d.date}`)).length / flags.length).toBeGreaterThan(0.8);
  });
});

describe("the proposal is internally consistent", () => {
  test("proposed requirement is the Erlang recompute of the proposed volume and handle time", () => {
    for (const r of rows.filter((_, i) => i % 997 === 0)) { const g = gate(r.gate); const c = g.channels.find((x) => x.channel === r.channel)!; expect(Math.abs(required(g, c, r.fc_volume_proposed, r.fc_aht_proposed).fte - r.req_proposed_fte)).toBeLessThan(0.15); }
  });
  test("weekly over/under = planned staff − required, every week", () => {
    for (const x of weekly(rows, (r) => gate(r.gate).product, 26)) expect(Math.abs(x.sched - x.req - x.over_under)).toBeLessThan(0.15);
  });
  test("26 weeks of outlook for every gate-channel; the note covers every gate", () => {
    expect(new Set(rows.map((r) => r.date)).size).toBe(182); expect(rows.length).toBe(182 * GATES.reduce((s, g) => s + g.channels.length, 0));
    const { md, review } = reforecastMarkdown(st, rows, w.events, 12); expect(review.length).toBe(GATES.length); expect(md).toContain("## Migrations"); expect(md).toContain("## Watchlist");
  });
  test("the cycle never reads the planted truth", () => {
    for (const f of ["reforecast.ts", "reforecast-report.ts", "pdp.ts"]) expect(readFileSync(join(import.meta.dir, "..", "src", f), "utf8")).not.toMatch(/_truth|truth\.json|\.truth\b/);
  });
});
