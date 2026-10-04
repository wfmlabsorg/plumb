import { beforeAll, describe, expect, test } from "bun:test";
import { buildWorld, addDays, type World } from "../src/world";
import { propose, replay, type CycleState, type ProposedRow } from "../src/reforecast";
import { PLAN, monthlyAttrition, monthlyLock, projectHeadcount, weeklyMarkdown, weeklyRefresh, type MonthlyLock, type WeeklyRefresh } from "../src/cadence";
import { GATES, PLANT, gate } from "../src/registry";

let w: World, st: CycleState, rows: ProposedRow[], wk: WeeklyRefresh, ml: MonthlyLock;
beforeAll(() => {
  w = buildWorld(); st = replay(w.extract, w.events, w.truth.end); rows = propose(st, w.outlook);
  wk = weeklyRefresh(w.extract, w.events, w.outlook, 26); ml = monthlyLock(w.extract, rows, st.asOf, undefined, 6, st);
}, 300_000);

describe("attrition", () => {
  test("10% annual compounds to exactly 90% of headcount after 12 months", () => { expect(projectHeadcount(100, 13)[12]!).toBeCloseTo(90, 6); });
  test("monthly basis applies the rate each month", () => { const b = PLAN.attrition.basis; PLAN.attrition.basis = "monthly"; expect(monthlyAttrition()).toBeCloseTo(0.1); expect(projectHeadcount(100, 2)[1]!).toBeCloseTo(90); PLAN.attrition.basis = b; });
});

describe("weekly refresh", () => {
  test("26 weekly buckets for every gate", () => { expect(wk.gates.length).toBe(26 * GATES.length); expect(new Set(wk.products.map((x) => x.key))).toEqual(new Set(["A", "C", "D", "E"])); });
  test("nothing new learned → nothing changes", () => {
    const same = weeklyRefresh(w.extract, w.events, w.outlook, 26, { state: wk.state, rows: wk.rows });
    expect(same.changes.every((c) => c.change_pct === 0 && c.why === "no material change")).toBe(true);
  }, 120_000);
  test("every material change names its cause", () => {
    for (const c of wk.changes.filter((x) => Math.abs(x.change_pct) >= 1)) expect(c.why).not.toBe("no material change");
    expect(weeklyMarkdown(wk)).toContain("## What changed since last week");
  });
});

describe("monthly lock", () => {
  test("locks next month, every gate × every week that touches it, under one version", () => {
    expect(ml.month).toBe("2026-11"); expect(new Set(ml.lock.map((l) => l.version))).toEqual(new Set(["2026-11@2026-10-04"]));
    const weeks = new Set(ml.lock.map((l) => l.week)); expect(ml.lock.length).toBe(weeks.size * GATES.length);
    for (const l of ml.lock) expect(l.req_p90).toBeGreaterThanOrEqual(l.req_p50);
  });
  test("the trend's actual months reconcile to the PDP history (net before the day)", () => {
    const t = ml.trend.find((x) => x.key === "A" && x.month === "2026-09" && x.kind === "actual")!;
    const rs = w.extract.filter((r) => r.date.startsWith("2026-09") && gate(r.gate).product === "A");
    const days = new Set(rs.map((r) => r.date)).size;
    expect(Math.abs(t.net_before - rs.reduce((s, r) => s + r.sched_open_fte - r.fc_req_fte, 0) / days)).toBeLessThan(0.1);
  });
  test("hiring asks start no earlier than the locked month, and hire-by = month start − lead time", () => {
    for (const h of ml.hires) {
      expect(h.month >= ml.month).toBe(true);
      expect(h.hire_by).toBe(addDays(`${h.month}-01`, -(PLAN.recruitWeeks + PLAN.trainWeeks[gate(h.gate).product]) * 7));
      expect(h.late).toBe(h.hire_by < st.asOf);
    }
  });
  test("the migration's receiving gate gets a hiring ask for the next wave", () => {
    const h = ml.hires.find((x) => x.gate === PLANT.migrationTo); expect(h).toBeDefined(); expect(h!.month <= "2027-02").toBe(true); expect(h!.need_hc).toBeGreaterThan(5);
  });
  test("surplus advice: the migration source redeploys to the receiving gate; trough surplus needed later is held", () => {
    const src = ml.surplus.find((s) => s.gate === PLANT.migrationFrom); if (src) expect(src.advice).toContain(`redeploy to ${PLANT.migrationTo}`);
    for (const s of ml.surplus) if (ml.hires.some((h) => h.gate === s.gate) && s.gate !== PLANT.migrationFrom) expect(s.advice).toContain("hold");
  });
  test("November carries more surplus than the October peak (capacity built for the peak lingers)", () => {
    const ou = (m: string) => ml.trend.filter((t) => t.month === m && t.kind === "projected").reduce((s, t) => s + t.net_before, 0);
    expect(ou("2026-11")).toBeGreaterThan(ou("2026-10") + 50);
  });
});
