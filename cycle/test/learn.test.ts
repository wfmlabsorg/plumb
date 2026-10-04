import { beforeAll, describe, expect, test } from "bun:test";
import { buildWorld, type World } from "../src/world";
import { propose, replay, type CycleState } from "../src/reforecast";
import { materials } from "../src/materials";
import { extract, gate } from "../src/signals";
import { backtest, earning, effectLibrary, forwardCheck, learningPolicy, wape, EARN, LAYERS, type Backtest, type Forward } from "../src/learn";
import { PLANT, GATES } from "../src/registry";

let w: World, fut: World, st: CycleState, b: Backtest, fwd: Forward;
beforeAll(() => {
  w = buildWorld(); fut = buildWorld({ end: "2026-12-05" }); st = replay(w.extract, w.events, w.truth.end); b = backtest(w.extract, st);
  const g = gate(extract(materials().items), w.events, st.detected);
  const rows = propose(st, w.outlook, g.overlays, learningPolicy(w.extract, st));
  fwd = forwardCheck(rows, fut.extract.filter((r) => r.date >= "2026-10-04"), g.overlays, g.signals, [
    { gate: PLANT.migrationTo, action: "edit", reason: "training ran short", edit: { pct: -5, from: "2026-10-04", to: "2026-11-28", channel: "voice" } },
  ]);
}, 600_000);
const item = (k: string) => fwd.attributions.find((a) => a.id.startsWith(k))!;

describe("time passing does not rewrite the past", () => {
  test("a world run on to December has the identical history and the same forecast of record", () => {
    const key = (r: { date: string; gate: string; channel: string }) => `${r.date}|${r.gate}|${r.channel}`; const F = new Map(fut.extract.map((r) => [key(r), r]));
    expect(w.extract.every((r) => JSON.stringify(F.get(key(r))) === JSON.stringify(r))).toBe(true);
    expect(w.outlook.filter((o) => F.has(key(o))).every((o) => F.get(key(o))!.fc_volume === o.fc_volume)).toBe(true);
  });
});

describe("backtest", () => {
  test("weekly Monday origins from January, four-week horizon, every layer scored", () => {
    expect(b.origins.length).toBeGreaterThan(30); expect(b.origins.every((o) => new Date(o + "T00:00:00Z").getUTCDay() === 1)).toBe(true);
    expect(b.total.length).toBe(LAYERS.length);
  });
  test("the earned (walk-forward) policy is never worse than the record by more than noise", () => { expect(wape(b.total[4]!)).toBeLessThanOrEqual(wape(b.total[0]!) + 0.05); });
  test("learning pays where something real changed: the client gain on G103", () => {
    const g = (b.byGateOrigin.get(PLANT.levelShift) ?? []).filter((x) => x.origin >= "2026-06-22" && x.origin <= "2026-08-17");
    expect(g.reduce((s, x) => s + x.proposal, 0)).toBeLessThan(g.reduce((s, x) => s + x.record, 0));
  });
  test("a gate with a confirmed recent shift is allowed to learn", () => {
    const mid = replay(w.extract.filter((r) => r.date <= "2026-07-31"), w.events, "2026-07-31");
    expect(learningPolicy(w.extract.filter((r) => r.date <= "2026-07-31"), mid).has(PLANT.levelShift)).toBe(true);
  }, 120_000);
});

describe("earning auto-approval", () => {
  test("eligibility follows the stated rule exactly", () => {
    for (const e of earning(b)) { const ok = e.windows >= 6 && e.wins / e.windows >= EARN.winShare && e.worst_loss_pts <= EARN.maxLossPts; expect(e.eligible).toBe(ok); }
    expect(earning(b).length).toBe(GATES.length);
  });
});

describe("forward check: the 4 October proposal against what happened", () => {
  test("the corroborated onboarding and the calendar signal helped", () => { expect(item("SG-002").verdict).toBe("helped"); expect(item("SG-008").verdict).toBe("helped"); });
  test("the rumor would have hurt: keeping it off was right", () => { expect(item("SG-004").kind).toBe("counterfactual"); expect(item("SG-004").fva_pts).toBeLessThan(0); });
  test("the reviewer's edit against the migration is scored, and it hurt", () => { expect(item("edit").kind).toBe("human edit"); expect(item("edit").fva_pts).toBeLessThan(0); });
  test("adding the applied signals improves the estate's forward accuracy", () => {
    const L = (n: string) => fwd.layers.find((l) => l.layer === n)!.wape; expect(L("+ applied signals")).toBeLessThan(L("+ migration ratio"));
  });
});

test("event-effect library: storms raise volume and handle time on the day, for every product", () => {
  for (const e of effectLibrary(w.extract, w.events).filter((x) => x.type === "weather")) { expect(e.vol_day0).toBeGreaterThan(5); expect(e.aht_day0).toBeGreaterThan(3); }
});
