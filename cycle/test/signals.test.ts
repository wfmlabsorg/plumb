import { beforeAll, describe, expect, test } from "bun:test";
import { buildWorld, type World } from "../src/world";
import { materials } from "../src/materials";
import { extract, gate, overlayFactor, type Signal } from "../src/signals";
import { propose, replay, type CycleState } from "../src/reforecast";
import { PLANT, GATES } from "../src/registry";

// The intake is scored against labels it never reads.
const { items, labels } = materials();
let w: World, st: CycleState, sig: Signal[];
beforeAll(() => { w = buildWorld(); st = replay(w.extract, w.events, w.truth.end); sig = extract(items); }, 240_000);
const of = (item: string) => sig.filter((s) => s.item === item);

describe("extraction matches the labels", () => {
  test("every labelled signal is extracted with the right kind, type, date, direction, size, grade and gates", () => {
    for (const l of labels.filter((x) => x.kind !== "none")) {
      const s = of(l.item); expect(s.length).toBe(1); const x = s[0]!;
      expect([x.kind, x.type, x.start, x.grade]).toEqual([l.kind as never, l.type!, l.start!, l.grade!]);
      if (l.end) expect(x.end).toBe(l.end);
      if (l.direction) expect(x.direction).toBe(l.direction);
      if (l.pct) expect(x.pct).toBe(l.pct);
      if (l.gates?.length && l.type !== "migration") expect(new Set(x.gates)).toEqual(new Set(l.gates));
    }
  });
  test("chatter carries nothing", () => { for (const l of labels.filter((x) => x.kind === "none")) expect(of(l.item).length).toBe(0); });
  test("'maybe 10 percent' is not read as a date", () => { expect(of("IT-007")[0]!.end ?? of("IT-007")[0]!.start).toBe("2026-10-20"); });
  test("the calendar overlay leaves the 24-hour ESC open", () => { expect(of("IT-008")[0]!.gates).not.toContain(PLANT.esc); });
  test("signal ids are stable: adding an item does not renumber earlier signals", () => {
    const more = extract([...items, { id: "IT-099", received: "2026-10-03", source_kind: "chat", author_role: "team lead", subject: "", text: "client onboarding moved to Nov 16, expect volume up 5% on G120" }]);
    for (const s of sig) expect(more.find((m) => m.id === s.id)?.clause).toBe(s.clause);
  });
});

describe("gating", () => {
  test("applied exactly where the labels say: corroborated owner claim and the calendar; never the rumor or the hedge", () => {
    const g = gate(sig, w.events, st.detected);
    for (const l of labels.filter((x) => x.kind === "forward")) {
      const s = g.signals.find((x) => x.item === l.item)!;
      const inForecast = s.status === "applied" || (s.status === "corroborating" && g.signals.find((o) => o.id === s.corroborates)?.status === "applied");
      expect(inForecast).toBe(l.should_apply!);
    }
    expect(g.signals.find((s) => s.item === "IT-004")!.status).toBe("rumor");
    expect(g.signals.find((s) => s.item === "IT-001")!.status).toBe("in-plan");
  });
  test("one owner alone is not enough: without the corroborating chat, the A-S08 claim waits", () => {
    const g = gate(sig.filter((s) => s.item !== "IT-003"), w.events, st.detected);
    expect(g.signals.find((s) => s.item === "IT-002")!.status).toBe("proposed");
  });
  test("a reviewer can accept a hedged signal, and a rejection takes its corroborating twin with it", () => {
    const acc = gate(sig, w.events, st.detected, { [of("IT-007")[0]!.id]: "accept" }); expect(acc.overlays.some((o) => o.signals.includes(of("IT-007")[0]!.id))).toBe(true);
    const rej = gate(sig, w.events, st.detected, { [of("IT-002")[0]!.id]: "reject" }); expect(rej.signals.filter((s) => s.item === "IT-002" || s.item === "IT-003").every((s) => s.status === "rejected")).toBe(true);
    expect(rej.overlays.some((o) => o.gates.includes("G115"))).toBe(false);
  });
  test("explanations attach to the flags the reforecast raised", () => {
    const g = gate(sig, w.events, st.detected);
    const abs = g.signals.find((s) => s.item === "IT-005")!; expect(abs.explains.filter((e) => e.includes("suspected-absence") && e.includes(PLANT.smallAbsence)).length).toBe(3);
    expect(g.signals.find((s) => s.item === "IT-006")!.explains.some((e) => e.startsWith("2026-01-03"))).toBe(true);
  });
});

describe("into the forecast", () => {
  test("applied overlays change exactly the targeted gate-days, tracked apart from the learned baseline", () => {
    const g = gate(sig, w.events, st.detected);
    const base = propose(st, w.outlook), withSig = propose(st, w.outlook, g.overlays);
    const at = (rows: typeof base, gte: string, d: string) => rows.find((r) => r.gate === gte && r.channel === "voice" && r.date === d)!;
    expect(at(withSig, "G116", "2026-11-16").fc_volume_proposed / at(base, "G116", "2026-11-16").fc_volume_proposed).toBeCloseTo(1.15, 1);
    expect(at(withSig, "G116", "2026-11-02").fc_volume_proposed).toBe(at(base, "G116", "2026-11-02").fc_volume_proposed);
    expect(at(withSig, PLANT.fakeSignal, "2026-10-12").fc_volume_proposed).toBe(at(base, PLANT.fakeSignal, "2026-10-12").fc_volume_proposed); // the rumor changed nothing
    expect(at(withSig, PLANT.esc, "2026-10-12").fc_volume_proposed).toBe(at(base, PLANT.esc, "2026-10-12").fc_volume_proposed);
    expect(at(withSig, "G150", "2026-10-12").signal_overlay_volume).toBeLessThan(0);
    expect(base.every((r) => r.signal_overlay_volume === 0)).toBe(true);
  });
  test("overlay factors compose and respect channels", () => {
    expect(overlayFactor([{ signals: [], gates: ["G101"], channels: ["chat"], from: "2026-10-20", to: null, factor: 1.1 }], "G101", "voice", "2026-11-01")).toBe(1);
    expect(overlayFactor([{ signals: [], gates: ["G101"], channels: [], from: "2026-10-20", to: null, factor: 1.1 }, { signals: [], gates: ["G101"], channels: [], from: "2026-10-01", to: null, factor: 1.2 }], "G101", "chat", "2026-11-01")).toBeCloseTo(1.32);
    expect(GATES.length).toBeGreaterThan(0);
  });
});
