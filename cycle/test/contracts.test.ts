import { beforeAll, describe, expect, test } from "bun:test";
import { buildWorld, type World } from "../src/world";
import { GATES, useSyntheticRegistry } from "../src/registry";
import { toCsv } from "../src/csv";
import { IEX_PDP_MAPPING, loadDataset, mapExport, parseContract } from "../src/contracts";
import { iexStyleExport } from "../src/iex-sample";
import { registryCsv } from "../src/pipeline";

let w: World, texts: { registry: string; extract: string; events: string; outlook: string };
beforeAll(() => { useSyntheticRegistry(); w = buildWorld(); texts = { registry: registryCsv(GATES), extract: mapExport(iexStyleExport(w.extract), IEX_PDP_MAPPING).csv, events: toCsv(w.events as any), outlook: toCsv(w.outlook as any) }; }, 120_000);

describe("mapping an IEX-style export", () => {
  test("round trip is lossless: export → mapping → contract reproduces the original extract", () => {
    const r = loadDataset(texts); expect(r.problems).toEqual([]); expect(r.data!.extract.length).toBe(w.extract.length);
    const a = r.data!.extract, b = w.extract;
    for (let i = 0; i < a.length; i += 97) expect(a[i]).toEqual(b[i] as never);
  });
  test("mm:ss, percentages and US dates are converted", () => {
    const m = mapExport("Date,CT,Queue Type,Fcst Contacts,Act Contacts,Fcst AHT,Act AHT,Fcst Req,Sched Open,Act Req,Act Open,Offered,Handled,Ans in SL,Abandoned,SL %,ASA\n3/7/2026,G101,VOICE,100,110,25:30,1:02:03,10,11,12,11,110,105,90,5,81.8%,0:45\n", IEX_PDP_MAPPING);
    const row = parseContract("extract", m.csv).rows[0]!;
    expect([row.date, row.channel, row.fc_aht_sec, row.act_aht_sec, row.sl, row.asa_sec]).toEqual(["2026-03-07", "voice", 1530, 3723, 0.818, 45]);
  });
  test("a renamed export column is reported, not guessed", () => {
    const m = mapExport(iexStyleExport(w.extract.slice(0, 3)).replace("Sched Open", "Scheduled"), IEX_PDP_MAPPING);
    expect(m.problems.some((p) => p.message.includes('"Sched Open"'))).toBe(true);
  });
});

describe("the validator catches what would corrupt the cycle", () => {
  const without = (csv: string, col: string) => { const [h, ...b] = csv.trim().split("\n"); const i = h!.split(",").indexOf(col); return [h, ...b].map((l) => l!.split(",").filter((_, k) => k !== i).join(",")).join("\n") + "\n"; };
  test("a missing required column", () => { expect(loadDataset({ ...texts, extract: without(texts.extract, "act_fte") }).problems.some((p) => p.column === "act_fte")).toBe(true); });
  test("answered-in-threshold above handled (the 'chat answered' error)", () => {
    const [h, first, ...rest] = texts.extract.trim().split("\n"); const cols = h!.split(","); const v = first!.split(","); v[cols.indexOf("answered_in_sl")] = String(+v[cols.indexOf("handled")]! + 5);
    const r = loadDataset({ ...texts, extract: [h, v.join(","), ...rest].join("\n") + "\n" }); expect(r.data).toBeNull(); expect(r.problems.some((p) => p.message.includes("exceeds handled"))).toBe(true);
  });
  test("a gate the registry does not know, a duplicate day, and a missing day", () => {
    const lines = texts.extract.trim().split("\n");
    expect(loadDataset({ ...texts, extract: lines.join("\n").replace(/,G101,voice,/, ",G999,voice,") + "\n" }).problems.some((p) => p.message.includes("not in the registry"))).toBe(true);
    expect(loadDataset({ ...texts, extract: [...lines, lines[1]].join("\n") + "\n" }).problems.some((p) => p.message.startsWith("duplicate"))).toBe(true);
    const day = lines[1]!.split(",")[0]!; const gap = lines.filter((l, i) => i === 0 || !l.startsWith(day.replace(/01$/, "02")));
    expect(loadDataset({ ...texts, extract: gap.join("\n") + "\n" }).problems.some((p) => p.message.startsWith("missing days"))).toBe(true);
  });
  test("a forecast of record dated before the history ends", () => {
    expect(loadDataset({ ...texts, outlook: texts.outlook.replace(/2026-10-04,/g, "2026-09-01,") }).problems.some((p) => p.column === "as_of")).toBe(true);
  });
});

test("the synthetic generator refuses a registry loaded from real files (it would produce a world of zeros)", async () => {
  const { useRegistry } = await import("../src/registry"); const { gatesFromRegistry } = await import("../src/contracts");
  useRegistry(gatesFromRegistry(parseContract("registry", texts.registry).rows)); expect(() => buildWorld()).toThrow(/synthetic registry/); useSyntheticRegistry();
});
