import { describe, expect, test } from "bun:test";
import { buildBrief, briefHtml, briefMarkdown, decisionsCsv, type BriefInput } from "../src/brief";

const card = (gate: string, change_pct: number, flags: string[] = []) => ({ gate, name: gate, product: "A", segment: "A-S01", channels: ["voice"], order: 0, change_pct, record_avg: 10, proposed_avg: 10, why: [], weeks: [], flags, signals: [] });
const earned = (gate: string, eligible: boolean) => ({ gate, product: "A", windows: 12, wins: 12, worst_loss_pts: 0, record_wape: 10, proposal_wape: 10, eligible, why: "" });
const sig = (id: string, status: string, start: string, author_role = "account lead") => ({ id, item: "IT-1", received: "2026-10-01", author_role, source_kind: "email", clause: "", kind: "forward", type: "client", gates: ["G1"], channels: [], start, end: null, direction: "up", pct: 10, grade: "E", status, needs: "owner confirmation", corroborates: null, explains: [] });
const week = (week: string, req: number, sched: number) => ({ week, key: "A", req, req_p10: req * 0.9, req_p90: req * 1.1, sched, over_under: sched - req, over_under_pct: ((sched - req) / req) * 100, sl: 0.8 });

function input(over: Partial<BriefInput> = {}): BriefInput {
  return {
    asOf: "2026-10-04", through: "2026-10-03",
    pdp: { date: "2026-10-03", lines: [], gates: [{ below_target: 1 }, { below_target: 0 }, { below_target: 0 }] as any, segments: [], products: [{ fc_volume: 1000, act_volume: 1050, below_target: 1 }] as any, missing: [], failed: [] },
    state: { asOf: "2026-10-04", series: new Map(), migrations: [], detected: [{ date: "2026-10-03", kind: "anomaly", gates: ["G2"], channel: "email", detail: "volume -40%" }], explained: 5, excluded: 2 } as any,
    rows: [{ date: "2026-10-05", gate: "G1", channel: "voice", fc_req_fte: 10, req_proposed_fte: 11 }] as any,
    packet: { schema: "plumb.review/1", asOf: "2026-10-04", created: "", weeks: 26, hash: "h", gates: [card("G1", 5), card("G2", 0.2), card("G3", 0.1, ["anomaly"])] },
    signals: [sig("SG-1", "proposed", "2026-10-30"), sig("SG-2", "proposed", "2026-10-06", "stand-up (several speakers)"), sig("SG-3", "applied", "2026-10-20")] as any,
    overlays: [{ signals: ["SG-3"], gates: ["G1"], channels: [], from: "2026-10-20", to: null, factor: 1.1 }],
    earned: [earned("G1", true), earned("G2", true), earned("G3", true)],
    backtest: { origins: ["2026-09-07", "2026-09-14"], horizonDays: 28, total: [], byProduct: new Map(), byGateOrigin: new Map([["G1", [{ origin: "2026-09-07", record: 10, proposal: 9 }, { origin: "2026-09-14", record: 12, proposal: 11 }]]]) },
    weekly: { products: [week("2026-10-04", 100, 104), week("2026-10-11", 100, 90)] } as any,
    monthly: { asOf: "2026-10-04", month: "2026-11", version: "2026-11@2026-10-04", lock: [{}] as any, trend: [], runway: [],
      hires: [{ gate: "G1", product: "A", segment: "A-S01", month: "2027-01", need_hc: 4, hire_by: "2026-09-20", late: true }, { gate: "G2", product: "A", segment: "A-S01", month: "2027-02", need_hc: 2.5, hire_by: "2026-11-02", late: false }], surplus: [] },
    extract: [{ date: "2026-10-03", gate: "G1", channel: "voice", offered: 100, answered_in_sl: 70, target_sl: 0.8 }] as any,
    events: [{ id: "MIG-W3", start: "2027-02-01", end: "2027-02-01", gates: "G1;G2", channels: "voice", type: "migration", description: "wave 3", source: "", params: "" }],
    learning: new Set(["G1"]), forward: null, ...over,
  };
}

describe("daily brief", () => {
  const b = buildBrief(input());
  test("decisions are ordered overdue → today → this week → later, then by due date", () => {
    const order = { overdue: 0, today: 1, "this week": 2, later: 3 } as const;
    expect(b.decisions.map((d) => order[d.urgency])).toEqual([...b.decisions.map((d) => order[d.urgency])].sort((x, y) => x - y));
    expect(b.decisions[0]!.urgency).toBe("overdue"); // the hire already past its hire-by date
  });
  test("auto-approval needs an earned record, a move under 1% and no flag", () => {
    const sign = b.decisions.find((d) => d.kind === "sign-reforecast")!;
    expect(sign.what).toContain("2 queues to look at, 1 can be approved"); // G2 only; G1 moved 5%, G3 carries a flag
    expect(sign.due).toBe("2026-10-04"); expect(sign.owner).toBe("forecast owner");
  });
  test("a waiting signal is due a week before it starts, or today if it starts within a week", () => {
    const due = Object.fromEntries(b.decisions.filter((d) => d.kind === "confirm-signal").map((d) => [d.why.slice(0, 4), d.due]));
    expect(due["SG-1"]).toBe("2026-10-23"); expect(due["SG-2"]).toBe("2026-10-04");
    expect(b.decisions.find((d) => d.why.startsWith("SG-2"))!.why).toContain("confirm with whoever raised it");
    expect(b.decisions.some((d) => d.why.startsWith("SG-3"))).toBe(false); // applied signals need nothing
  });
  test("hiring is one decision per product, due at the earliest hire-by, overdue when late", () => {
    const h = b.decisions.filter((d) => d.kind === "hire"); expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ due: "2026-09-20", urgency: "overdue", owner: "capacity planning" });
    expect(h[0]!.what).toContain("7 heads across 2 queues"); // 4 + 2.5 rounded
  });
  test("yesterday's flag needs an explanation today; the lock is due the day before the month", () => {
    expect(b.decisions.find((d) => d.kind === "explain-flag")).toMatchObject({ due: "2026-10-04", urgency: "today" });
    expect(b.decisions.find((d) => d.kind === "lock")).toMatchObject({ due: "2026-10-31" });
  });
  test("headline names the tightest week and the shortfall; risks carry the next wave and the applied change", () => {
    expect(b.headline.find((h) => h.label === "Staffing")!.text).toContain("week of 2026-10-11: 10 FTE short");
    expect(b.headline.find((h) => h.label === "Yesterday")!.text).toContain("70.0% against a 80% target; 1 of 3 queues missed target on at least one channel");
    expect(b.risks.map((r) => r.what)).toEqual(expect.arrayContaining(["Product A runs short at P50", "Next migration wave", "Client change on 1 queue"]));
  });
  test("renderers: markdown lists every decision, html has three charts and no external references, csv quotes", () => {
    expect(briefMarkdown(b).split("\n").filter((l) => /^\| (overdue|today|this week|later) \|/.test(l))).toHaveLength(b.decisions.length);
    const html = briefHtml(b, ""); expect((html.match(/<figure class="chart">/g) ?? []).length).toBe(3); expect((html.match(/<div class="dec" /g) ?? []).length).toBe(b.decisions.length); expect(html).not.toMatch(/https?:\/\//);
    const csv = decisionsCsv({ ...b, decisions: [{ ...b.decisions[0]!, what: 'a, "b"' }] }); expect(csv.split("\n")[1]).toContain('"a, ""b"""');
  });
  test("a waiting signal whose start date has passed lapses: no decision, reported as closed", () => {
    const l = buildBrief(input({ signals: [sig("SG-9", "proposed", "2026-09-20"), sig("SG-1", "proposed", "2026-10-30")] as any }));
    expect(l.decisions.some((d) => d.why.startsWith("SG-9"))).toBe(false); expect(l.decisions.some((d) => d.why.startsWith("SG-1"))).toBe(true);
    expect(l.automatic.join(" ")).toContain("Closed 1 signal that reached its start date unconfirmed (SG-9)");
  });
  test("with a forward check, the accuracy line reports the published forecast's score", () => {
    const f = buildBrief(input({ forward: { asOf: "2026-10-04", through: "2026-12-05", layers: [{ layer: "record", wape: 10.75, bias: -2 }, { layer: "+ human edits", wape: 10.5, bias: -2 }], attributions: [] } }));
    expect(f.headline.find((h) => h.label === "Accuracy")!.text).toContain("scored 10.5% volume WAPE"); expect(f.learned).toHaveLength(2);
  });
});
