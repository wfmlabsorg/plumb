/**
 * registry.ts — Stage 0: the gate registry, as a hierarchy: product → segment → gate.
 *
 * A gate is the unit the WFM platform plans for (a CT that may span skills). Real estates run to
 * ~1,500 gates averaging about 12 agents, with a few shared pools of 50–100. This synthetic estate
 * keeps those proportions at prototype scale. Code-named: products A/C/D/E, segments by number.
 *   A — managed service, highly customized, many small gates
 *   C — legacy book, highly segmented, migrating
 *   D — public-sector agencies: larger gates plus a 24-hour emergency service center spanning them
 *   E — online, more automation, moderate gates, chat-heavy, shorter handle times
 */
import { Rng } from "./rng";

export type Channel = "voice" | "chat" | "email";
export type Product = "A" | "C" | "D" | "E";
export interface ChannelSpec {
  channel: Channel; baseDaily: number; ahtSec: number; ahtBasis: "worked" | "elapsed"; concurrency: number;
  targetSL: number; thresholdSec: number; patienceSec: number; noiseCv: number;
}
export interface Gate {
  id: string; name: string; product: Product; segment: string; region: "NA" | "EMEA" | "APAC";
  pooled: boolean;            // a shared pool serving several segments
  sizeFte: number;            // design size: productive FTE required on an average weekday
  openHours: [number, number]; weatherSensitivity: number; trendPerYear: number; reviewThresholdPct: number;
  channels: ChannelSpec[];
}
export const PRODUCTIVE_HOURS_PER_FTE_DAY = 7.5;

const CH = {
  voice: (aht: number, o: Partial<ChannelSpec> = {}): ChannelSpec => ({ channel: "voice", baseDaily: 0, ahtSec: aht, ahtBasis: "worked", concurrency: 1, targetSL: 0.8, thresholdSec: 20, patienceSec: 480, noiseCv: 0.06, ...o }), // long-patience callers
  chat: (aht: number, o: Partial<ChannelSpec> = {}): ChannelSpec => ({ channel: "chat", baseDaily: 0, ahtSec: aht, ahtBasis: "elapsed", concurrency: 1.7, targetSL: 0.8, thresholdSec: 180, patienceSec: 420, noiseCv: 0.08, ...o }),
  email: (aht: number, o: Partial<ChannelSpec> = {}): ChannelSpec => ({ channel: "email", baseDaily: 0, ahtSec: aht, ahtBasis: "worked", concurrency: 1, targetSL: 0.9, thresholdSec: 7200, patienceSec: 0, noiseCv: 0.1, ...o }),
};

/** Daily volume that keeps a gate of `fte` busy on `share` of its time. Small pools run at lower occupancy. */
function sizeChannels(fte: number, chans: [ChannelSpec, number][]): ChannelSpec[] {
  const occ = Math.min(0.88, 0.45 + 0.1 * Math.log(fte + 1));
  return chans.map(([c, share]) => ({ ...c, baseDaily: Math.max(8, Math.round((fte * share * PRODUCTIVE_HOURS_PER_FTE_DAY * 3600 * (c.channel === "email" ? 0.85 : occ)) / (c.ahtSec / c.concurrency))) }));
}

const G = (id: string, name: string, product: Product, segment: string, sizeFte: number, chans: [ChannelSpec, number][], o: Partial<Gate> = {}): Gate => ({
  id, name, product, segment, region: "NA", pooled: false, sizeFte, openHours: [6, 22], weatherSensitivity: 0.7, trendPerYear: 0.03, reviewThresholdPct: 5,
  channels: sizeChannels(sizeFte, chans), ...o,
});

/** Anchor gates carry the planted truth; the rest of the estate is generated around them. */
const ANCHORS: Gate[] = [
  G("G101", "Online · NA", "E", "E-S01", 28, [[CH.voice(1080), 0.45], [CH.chat(1800, { concurrency: 1.8 }), 0.4], [CH.email(780), 0.15]], { trendPerYear: 0.08 }),
  G("G102", "Legacy client book · NA", "C", "C-S01", 18, [[CH.voice(1560), 0.6], [CH.chat(2400), 0.2], [CH.email(1140), 0.2]], { trendPerYear: 0 }),
  G("G103", "Managed service · client group · NA", "A", "A-S01", 20, [[CH.voice(1680), 0.75], [CH.email(1200), 0.25]]),
  G("G104", "Emergency service center (24h, all agencies)", "D", "D-ESC", 90, [[CH.voice(1440, { patienceSec: 600 }), 1]], { pooled: true, openHours: [0, 24], weatherSensitivity: 1, trendPerYear: 0.01, reviewThresholdPct: 8 }),
  G("G105", "After-hours shared pool · A", "A", "A-POOL", 55, [[CH.voice(1740, { patienceSec: 600 }), 1]], { pooled: true, openHours: [0, 24], weatherSensitivity: 0.9, reviewThresholdPct: 8 }),
  G("G106", "Managed service · small client · NA", "A", "A-S02", 6, [[CH.voice(1620), 0.8], [CH.email(1140), 0.2]]),
];
export const PLANT = { migrationTo: "G101", migrationFrom: "G102", levelShift: "G103", esc: "G104", afterHours: "G105", smallAbsence: "G106", fakeSignal: "G103", outage: "G101" } as const;

function generate(seed = 7): Gate[] {
  const rng = new Rng(seed); const out: Gate[] = [...ANCHORS]; let n = 107;
  const size = (median: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, median * rng.lognormal1(0.6))));
  const region = (): Gate["region"] => { const x = rng.next(); return x < 0.8 ? "NA" : x < 0.92 ? "EMEA" : "APAC"; };
  const hours = (r: Gate["region"]): [number, number] => (r === "NA" ? [6, 22] : [7, 19]);
  // A: many small, customized gates (some segments one gate, some several)
  for (let s = 3; s <= 14; s++) { const k = 1 + Math.floor(rng.next() * 3); for (let i = 0; i < k; i++) { const r = region(); out.push(G(`G${n++}`, `Managed service · segment ${s}${k > 1 ? ` · ${i + 1}` : ""}`, "A", `A-S${String(s).padStart(2, "0")}`, size(9, 3, 30), [[CH.voice(1560 + rng.next() * 240), 0.75], [CH.email(1080 + rng.next() * 180), 0.25]], { region: r, openHours: hours(r), weatherSensitivity: r === "NA" ? 0.5 + rng.next() * 0.3 : 0.25, trendPerYear: 0.02 + rng.next() * 0.03 })); } }
  // C: legacy, highly segmented, small gates, some chat
  for (let s = 2; s <= 8; s++) { const k = 1 + Math.floor(rng.next() * 2); for (let i = 0; i < k; i++) { const r = region(); const chat = rng.chance(0.3); out.push(G(`G${n++}`, `Legacy book · segment ${s}${k > 1 ? ` · ${i + 1}` : ""}`, "C", `C-S${String(s).padStart(2, "0")}`, size(10, 3, 28), chat ? [[CH.voice(1500 + rng.next() * 180), 0.6], [CH.chat(2280), 0.2], [CH.email(1080), 0.2]] : [[CH.voice(1500 + rng.next() * 180), 0.75], [CH.email(1080), 0.25]], { region: r, openHours: hours(r), weatherSensitivity: r === "NA" ? 0.6 : 0.25, trendPerYear: -0.02 })); } }
  out.push(G(`G${n++}`, "Legacy shared pool · C", "C", "C-POOL", 60, [[CH.voice(1560), 0.8], [CH.email(1080), 0.2]], { pooled: true, weatherSensitivity: 0.7, trendPerYear: -0.03 }));
  // D: agencies — larger gates (the 24h ESC is an anchor)
  for (let s = 1; s <= 6; s++) { const k = 1 + Math.floor(rng.next() * 2); for (let i = 0; i < k; i++) out.push(G(`G${n++}`, `Agency ${s}${k > 1 ? ` · ${i + 1}` : ""}`, "D", `D-S${String(s).padStart(2, "0")}`, size(18, 6, 45), [[CH.voice(1380 + rng.next() * 180), 0.8], [CH.email(1020), 0.2]], { openHours: [7, 19], weatherSensitivity: 0.4, trendPerYear: 0.01, reviewThresholdPct: 4 })); }
  // E: online, more automation, moderate gates, chat-heavy, shorter handle times
  for (let s = 2; s <= 5; s++) { const k = 1 + Math.floor(rng.next() * 2); for (let i = 0; i < k; i++) { const r = region(); out.push(G(`G${n++}`, `Online · segment ${s}${k > 1 ? ` · ${i + 1}` : ""}`, "E", `E-S${String(s).padStart(2, "0")}`, size(20, 8, 50), [[CH.voice(960 + rng.next() * 180), 0.45], [CH.chat(1680, { concurrency: 1.8 }), 0.45], [CH.email(720), 0.1]], { region: r, openHours: hours(r), weatherSensitivity: r === "NA" ? 0.6 : 0.25, trendPerYear: 0.06 + rng.next() * 0.04 })); } }
  return out;
}

/** The live registry. The synthetic estate by default; real gates replace it in place via useRegistry. */
export const GATES: Gate[] = generate();
let index = new Map(GATES.map((g) => [g.id, g]));
export const gate = (id: string) => { const g = index.get(id); if (!g) throw new Error(`no gate ${id} in the registry`); return g; };
/** Swap the registry for real gates (inside the walls). Every module keeps its reference to GATES. */
export function useRegistry(gates: Gate[]): void { GATES.splice(0, GATES.length, ...gates); index = new Map(GATES.map((g) => [g.id, g])); }
export function useSyntheticRegistry(): void { useRegistry(generate()); }
