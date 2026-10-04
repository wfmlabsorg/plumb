import { describe, expect, test } from "bun:test";
import { agentsFor, erlangA, erlangCASA, erlangCSL, erlangCWait } from "../src/erlang";

describe("Erlang C against textbook values", () => {
  // classic example: 100 calls / 30 min, AHT 180 s → a = 10 Erlangs; 11 agents → P(wait) ≈ 0.682
  test("P(wait) a=10, n=11", () => expect(erlangCWait(10, 11)).toBeCloseTo(0.6821, 3));
  test("P(wait) a=10, n=13 ≈ 0.2853", () => expect(erlangCWait(10, 13)).toBeCloseTo(0.2853, 3));
  test("SL 20s, a=10, n=13, AHT 180 = 1 − 0.2853·e^(−1/3) ≈ 0.7956", () => expect(erlangCSL(10, 13, 180, 20)).toBeCloseTo(0.7956, 3));
  test("ASA a=10, n=13, AHT 180 ≈ 17.1s", () => expect(erlangCASA(10, 13, 180)).toBeCloseTo(17.1, 0));
  test("agents for 80/20 at a=10, AHT 180 is between 13 and 14 (13 gives 79.6%)", () => { const n = agentsFor(10, 180, 0.8, 20); expect(n).toBeGreaterThan(13); expect(n).toBeLessThanOrEqual(14); });
  test("overloaded queue has SL 0", () => expect(erlangCSL(10, 9, 180, 20)).toBe(0));
});

describe("Erlang A behaves", () => {
  const lam = 10 / 180; // 10 Erlangs at AHT 180
  test("more agents → higher SL, fewer abandons", () => {
    const a = erlangA(lam, 180, 11, 120, 20), b = erlangA(lam, 180, 14, 120, 20);
    expect(b.sl).toBeGreaterThan(a.sl); expect(b.abandon).toBeLessThan(a.abandon);
  });
  test("an understaffed queue still answers some calls (abandonment keeps it stable)", () => {
    const r = erlangA(lam, 180, 8, 120, 20); expect(r.sl).toBeGreaterThan(0); expect(r.abandon).toBeGreaterThan(0.1); expect(r.abandon).toBeLessThan(0.6);
  });
  test("well staffed: abandons near zero, SL near Erlang C", () => {
    const r = erlangA(lam, 180, 16, 120, 20); expect(r.abandon).toBeLessThan(0.01); expect(Math.abs(r.sl - erlangCSL(10, 16, 180, 20))).toBeLessThan(0.05);
  });
});
