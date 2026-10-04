import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildWorld, type World } from "../src/world";
import { propose, replay, type CycleState, type ProposedRow } from "../src/reforecast";
import { buildPacket, proposalHash, publish, wfmExport, type Decisions, type Packet } from "../src/review";
import { GATES, PLANT } from "../src/registry";

let w: World, st: CycleState, rows: ProposedRow[], packet: Packet;
beforeAll(() => { w = buildWorld(); st = replay(w.extract, w.events, w.truth.end); rows = propose(st, w.outlook); packet = buildPacket(st, rows); }, 240_000);
const sign = { name: "T. Reviewer", role: "forecast owner", at: "2026-10-04T12:00:00.000Z", bulk_approved: [] as string[] };
const all = (over: Partial<Record<string, Decisions["decisions"][number]>> = {}): Decisions => ({ schema: "plumb.decisions/1", packet_hash: packet.hash, asOf: packet.asOf, decisions: packet.gates.map((g) => over[g.gate] ?? { gate: g.gate, action: "approve" }), signature: sign });

describe("packet", () => {
  test("every gate, once, biggest movers first, each with 26 weeks and a reason", () => {
    expect(packet.gates.length).toBe(GATES.length); expect(new Set(packet.gates.map((g) => g.gate)).size).toBe(GATES.length);
    for (let i = 1; i < packet.gates.length; i++) expect(Math.abs(packet.gates[i - 1]!.change_pct)).toBeGreaterThanOrEqual(Math.abs(packet.gates[i]!.change_pct));
    for (const g of packet.gates) { expect(g.weeks.length).toBe(26); expect(g.why.length).toBeGreaterThan(0); }
  });
  test("the migration's receiving gate explains itself with the overlay", () => { expect(packet.gates.find((g) => g.gate === PLANT.migrationTo)!.why.some((x) => x.startsWith("migration overlay"))).toBe(true); });
  test("the fingerprint is stable for the same proposal and changes when any proposed number does", () => {
    expect(proposalHash(st.asOf, rows)).toBe(packet.hash);
    const bumped = rows.map((r, i) => (i === 5000 ? { ...r, fc_volume_proposed: r.fc_volume_proposed + 1 } : r)); expect(proposalHash(st.asOf, bumped)).not.toBe(packet.hash);
  });
});

describe("publish refuses", () => {
  test("unsigned", () => { const d = all(); delete d.signature; expect(publish(packet, d, rows).problems.join()).toContain("unsigned"); });
  test("an undecided gate", () => { const d = all(); d.decisions.pop(); expect(publish(packet, d, rows).problems.join()).toContain("undecided"); });
  test("an edit or reject without a reason", () => {
    expect(publish(packet, all({ [PLANT.esc]: { gate: PLANT.esc, action: "reject" } }), rows).problems.join()).toContain("needs a reason");
    expect(publish(packet, all({ [PLANT.esc]: { gate: PLANT.esc, action: "edit", edit: { pct: -5, from: "2026-10-04", to: "2026-10-31" } } }), rows).problems.join()).toContain("needs a reason");
  });
  test("an edit outside ±50% or with a backwards range", () => {
    expect(publish(packet, all({ [PLANT.esc]: { gate: PLANT.esc, action: "edit", reason: "x", edit: { pct: 80, from: "2026-10-04", to: "2026-10-31" } } }), rows).ok).toBe(false);
    expect(publish(packet, all({ [PLANT.esc]: { gate: PLANT.esc, action: "edit", reason: "x", edit: { pct: 5, from: "2026-11-30", to: "2026-10-31" } } }), rows).ok).toBe(false);
  });
  test("decisions made on a different packet, or a proposal that changed after review (stale)", () => {
    expect(publish(packet, { ...all(), packet_hash: "deadbeefdeadbeef" }, rows).problems.join()).toContain("different packet");
    const changed = rows.map((r, i) => (i === 10 ? { ...r, fc_volume_proposed: r.fc_volume_proposed + 3 } : r));
    expect(publish(packet, all(), changed).problems.join()).toContain("changed after review");
  });
});

describe("publish writes the record the decisions describe", () => {
  test("approve takes the proposal; reject keeps the record; edit applies only in its range and channel and recomputes need", () => {
    const res = publish(packet, all({
      [PLANT.esc]: { gate: PLANT.esc, action: "reject", reason: "hold the record" },
      [PLANT.migrationTo]: { gate: PLANT.migrationTo, action: "edit", reason: "training ran short", edit: { pct: -10, from: "2026-10-04", to: "2026-10-31", channel: "voice" } },
    }), rows);
    expect(res.ok).toBe(true); const R = res.rows!; const P = (g: string, c: string, d: string) => rows.find((r) => r.gate === g && r.channel === c && r.date === d)!; const O = (g: string, c: string, d: string) => R.find((r) => r.gate === g && r.channel === c && r.date === d)!;
    expect(O(PLANT.esc, "voice", "2026-11-02").volume).toBe(P(PLANT.esc, "voice", "2026-11-02").fc_volume);
    expect(O(PLANT.migrationTo, "voice", "2026-10-15").volume).toBe(Math.round(P(PLANT.migrationTo, "voice", "2026-10-15").fc_volume_proposed * 0.9));
    expect(O(PLANT.migrationTo, "voice", "2026-10-15").req_fte).toBeLessThan(P(PLANT.migrationTo, "voice", "2026-10-15").req_proposed_fte);
    expect(O(PLANT.migrationTo, "voice", "2026-11-15").volume).toBe(P(PLANT.migrationTo, "voice", "2026-11-15").fc_volume_proposed);
    expect(O(PLANT.migrationTo, "chat", "2026-10-15").volume).toBe(P(PLANT.migrationTo, "chat", "2026-10-15").fc_volume_proposed);
    expect(O("G120", "voice", "2026-10-15").volume).toBe(P("G120", "voice", "2026-10-15").fc_volume_proposed);
    expect(res.summary).toMatchObject({ approved: GATES.length - 2, edited: 1, rejected: 1 });
    expect(wfmExport(R).length).toBe(rows.length);
  });
});

test("the review screen is one self-contained file with no network access", () => {
  const html = readFileSync(join(import.meta.dir, "..", "review", "dist", "review.html"), "utf8");
  expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href=|https?:\/\//);
});
