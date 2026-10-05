import { beforeAll, describe, expect, test } from "bun:test";
import { buildWorld, dow, holidayMap, season, type World } from "../src/world";
import { pdpFor, setupOf, checkRow } from "../src/pdp";
import { GATES, PLANT } from "../src/registry";

let w: World;
beforeAll(() => { w = buildWorld(); }, 120_000);
const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
const rows = (g: string, c: string) => w.extract.filter((r) => r.gate === g && r.channel === c);

describe("the world looks like a contact center", () => {
  test("deterministic for a seed", () => { const b = buildWorld(); expect(b.extract.slice(0, 50)).toEqual(w.extract.slice(0, 50)); expect(b.extract.length).toBe(w.extract.length); }, 120_000);
  test("every gate × channel × day is present, history ends the day before the run", () => {
    const days = new Set(w.extract.map((r) => r.date)); expect(days.size).toBe(733); expect(w.truth.end).toBe("2026-10-03");
    expect(w.outlook[0]!.date).toBe("2026-10-04"); expect(new Set(w.outlook.map((r) => r.date)).size).toBe(182);
  });
  test("weekday pattern: Mon/Tue busiest, Wed dips, Thu/Fri up, weekend lowest", () => {
    const by = [0, 1, 2, 3, 4, 5, 6].map((d) => avg(rows(PLANT.levelShift, "voice").filter((r) => dow(r.date) === d).map((r) => r.act_volume)));
    const [su, mo, tu, we, th, fr, sa] = by as [number, number, number, number, number, number, number];
    expect(Math.min(mo, tu)).toBeGreaterThan(Math.max(we, th, fr));
    expect(we).toBeLessThan(Math.min(th, fr));
    expect(Math.max(su, sa)).toBeLessThan(0.6 * mo);
  });
  test("October peak; business demand falls in the second half of November; Thanksgiving is the low", () => {
    expect(season("2025-10-15")).toBeGreaterThan(season("2025-11-24"));
    const wk = (a: string, b: string) => avg(rows(PLANT.levelShift, "voice").filter((r) => r.date >= a && r.date <= b && dow(r.date) > 0 && dow(r.date) < 6).map((r) => r.act_volume));
    expect(wk("2025-11-16", "2025-11-30")).toBeLessThan(0.75 * wk("2025-10-01", "2025-10-31"));
    const tg = rows(PLANT.levelShift, "voice").find((r) => r.date === "2025-11-27")!.act_volume; expect(tg).toBeLessThan(0.4 * wk("2025-10-01", "2025-10-31"));
    expect(holidayMap([2025]).get("2025-11-27")?.name).toBe("Thanksgiving");
  });
  test("voice handle time: 20–30 min on managed, legacy and agency gates; shorter on the automated online product", () => {
    const med = (p: string) => { const m = GATES.filter((g) => g.product === p && g.channels.some((c) => c.channel === "voice")).map((g) => avg(rows(g.id, "voice").map((r) => r.act_aht_sec)) / 60).sort((a, b) => a - b); return m[Math.floor(m.length / 2)]!; };
    for (const p of ["A", "C", "D"]) { expect(med(p)).toBeGreaterThan(20); expect(med(p)).toBeLessThan(30); }
    expect(med("E")).toBeGreaterThan(14); expect(med("E")).toBeLessThan(med("A") - 5);
  });
  test("estate proportions: mostly small gates, a few shared pools, gates roll up to segments and products", () => {
    const sizes = GATES.map((g) => g.sizeFte).sort((a, b) => a - b);
    expect(GATES.length).toBeGreaterThanOrEqual(50); expect(sizes[Math.floor(sizes.length / 2)]!).toBeLessThanOrEqual(12);
    expect(GATES.filter((g) => g.pooled && g.sizeFte >= 50).length).toBeGreaterThanOrEqual(2);
    expect(new Set(GATES.map((g) => g.product))).toEqual(new Set(["A", "C", "D", "E"]));
    expect(GATES.filter((g) => g.product === "D" && g.openHours[1] - g.openHours[0] === 24).map((g) => g.id)).toContain(PLANT.esc);
  });
  test("the planted hurricane lifts volume and handle time and breaks service level", () => {
    // judged over the storm's three days (planted ≈ +65%, +52%, +33%), not on one noisy draw
    const days = rows(PLANT.esc, "voice").filter((r) => r.date >= "2026-09-28" && r.date <= "2026-09-30");
    expect(avg(days.map((d) => d.act_volume / d.fc_volume))).toBeGreaterThan(1.3);
    expect(avg(days.map((d) => d.act_aht_sec / d.fc_aht_sec))).toBeGreaterThan(1.1);
    expect(Math.min(...days.map((d) => d.sl))).toBeLessThan(0.6);
  });
  test("the planted level shift is real and the forecaster catches up late", () => {
    const r = (a: string, b: string) => avg(rows(PLANT.levelShift, "voice").filter((x) => x.date >= a && x.date <= b && !["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"].includes(x.date)).map((x) => x.act_volume / x.fc_volume));
    expect(r("2026-05-01", "2026-06-14")).toBeLessThan(1.04); expect(r("2026-06-15", "2026-07-10")).toBeGreaterThan(1.07);
  });
  test("the migration drains the legacy gate", () => {
    const m = (a: string, b: string) => avg(rows(PLANT.migrationFrom, "voice").filter((x) => x.date >= a && x.date <= b && dow(x.date) > 0 && dow(x.date) < 6).map((x) => x.act_volume));
    expect(m("2026-08-01", "2026-08-31")).toBeLessThan(0.8 * m("2026-06-01", "2026-06-30"));
  });
  test("every extract row passes the contract checks", () => { expect(w.extract.filter((r) => checkRow(r).length).length).toBe(0); });
  test("the truth is not in the logged events: some storms and the planted absence spike are unlogged", () => {
    expect(w.truth.storms.some((s) => !s.logged)).toBe(true); expect(w.events.some((e) => e.id === "AB-PLANT")).toBe(false);
  });
});

describe("PDP", () => {
  test("the walk is an identity on every line", () => {
    for (const d of ["2025-11-27", "2026-09-29", "2026-10-03"]) for (const l of pdpFor(d, w.extract, w.events).lines)
      expect(Math.abs(l.net_after - l.net_before - (l.supply_delivery - l.demand_surprise))).toBeLessThan(0.25);
  });
  test("setup bands", () => { expect(setupOf(-5, 100)).toBe("short"); expect(setupOf(2, 100)).toBe("right-sized"); expect(setupOf(10, 100)).toBe("overhead"); });
  test("hurricane day: the emergency service center is a demand miss, with the weather event logged", () => {
    const l = pdpFor("2026-09-29", w.extract, w.events).lines.find((x) => x.gate === PLANT.esc)!;
    expect(["demand", "both"]).toContain(l.driver); expect(l.events.some((e) => e.startsWith("weather"))).toBe(true); expect(l.sl_gap_pts).toBeLessThan(-10);
  });
  test("planted absence spike on a small gate: a supply miss with nothing logged, which the cycle must find itself", () => {
    const l = pdpFor("2026-09-15", w.extract, w.events).lines.find((x) => x.gate === PLANT.smallAbsence && x.channel === "voice")!;
    expect(l.supply_delivery).toBeLessThan(-0.05 * l.sched_open_fte); expect(l.driver === "supply" || l.driver === "both").toBe(true); expect(l.events.some((e) => e.startsWith("absence"))).toBe(false);
  });
  test("a corrupted row is held out by the contract checks", () => {
    const bad = w.extract.filter((r) => r.date === "2026-10-03").map((r, i) => (i === 0 ? { ...r, answered_in_sl: r.handled + 5 } : r));
    const p = pdpFor("2026-10-03", bad, w.events); expect(p.failed.length).toBe(1); expect(p.failed[0]).toContain("answered_in_sl > handled");
  });
  test("rollups reconcile: product totals equal the sum of their gates", () => {
    const p = pdpFor("2026-09-29", w.extract, w.events);
    for (const pr of p.products) expect(Math.abs(pr.fc_req_fte - p.gates.filter((g) => g.product === pr.key).reduce((s, g) => s + g.fc_req_fte, 0))).toBeLessThan(0.5);
    expect(p.segments.reduce((s, x) => s + x.gates, 0)).toBe(p.gates.length);
  });
  test("a missing gate-channel is reported", () => {
    const p = pdpFor("2026-10-03", w.extract.filter((r) => !(r.date === "2026-10-03" && r.gate === PLANT.levelShift)), w.events); expect(p.missing.length).toBe(2);
  });
});
