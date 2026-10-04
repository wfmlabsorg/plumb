/**
 * cycle/run.ts — the daily-cycle CLI.
 *   bun run cycle/run.ts world [--seed N] [--end yyyy-mm-dd]   build the synthetic world into cycle/world/
 *   bun run cycle/run.ts pdp [--date yyyy-mm-dd]                PDP for one day (default: the last day of history)
 *   bun run cycle/run.ts reforecast [--weeks 12|26]             replay history, propose the outlook, write the note
 *   bun run cycle/run.ts weekly [--weeks 26]                    26-week refresh in weekly buckets + what changed since last week
 *   bun run cycle/run.ts monthly [--month yyyy-mm] [--relock]   lock next month: trend, runway under attrition, hiring asks, surplus
 *   bun run cycle/run.ts intake                                 demo intake → graded signals → overlays (read by reforecast/weekly/monthly)
 *   bun run cycle/run.ts intake add --kind chat --role "…" --date yyyy-mm-dd --text "…"
 *   bun run cycle/run.ts intake accept|reject SG-…
 *   bun run cycle/run.ts review                                 today's review packet + the review screen with it embedded
 *   bun run cycle/run.ts publish --decisions decisions.json     publish the signed review as the new forecast of record
 *   bun run cycle/run.ts learn [--actuals-through yyyy-mm-dd]   backtest by layer, earning, forward check, event effects
 * The planted truth goes to cycle/world/_truth/ and is never read by the cycle stages.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildWorld, type ExtractRow, type LoggedEvent } from "./src/world";
import { GATES } from "./src/registry";
import { fromCsv, toCsv } from "./src/csv";
import { pdpFor, pdpMarkdown } from "./src/pdp";
import { propose, replay } from "./src/reforecast";
import { reforecastMarkdown } from "./src/reforecast-report";
import { monthlyLock, monthlyMarkdown, weeklyMarkdown, weeklyRefresh } from "./src/cadence";
import { materials, type Item } from "./src/materials";
import { extract as extractSignals, gate as gateSignals, type Overlay } from "./src/signals";
import { intakeMarkdown } from "./src/intake-report";
import { buildPacket, publish, wfmExport, type Decisions, type Packet } from "./src/review";
import { learningPolicy, backtest, earning, forwardCheck, effectLibrary } from "./src/learn";
import { learnMarkdown } from "./src/learn-report";
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import type { OutlookRow } from "./src/world";

const dir = import.meta.dir, W = join(dir, "world"), OUT = join(dir, "out");
const [cmd, ...rest] = process.argv.slice(2);
const flag = (n: string) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };

if (cmd === "world") {
  const w = buildWorld({ seed: flag("seed") ? +flag("seed")! : undefined, end: flag("end") });
  mkdirSync(join(W, "_truth"), { recursive: true });
  writeFileSync(join(W, "registry.json"), JSON.stringify(GATES, null, 2));
  writeFileSync(join(W, "extract_daily.csv"), toCsv(w.extract as any));
  writeFileSync(join(W, "events_logged.csv"), toCsv(w.events as any));
  writeFileSync(join(W, "outlook_record.csv"), toCsv(w.outlook as any));
  writeFileSync(join(W, "_truth", "truth.json"), JSON.stringify(w.truth, null, 2));
  const mat = materials(); mkdirSync(join(W, "intake"), { recursive: true });
  writeFileSync(join(W, "intake", "items.json"), JSON.stringify(mat.items, null, 2));
  writeFileSync(join(W, "intake", "decisions.json"), "{}\n");
  writeFileSync(join(W, "_truth", "intake_labels.json"), JSON.stringify(mat.labels, null, 2));
  console.log(`world: ${w.extract.length} gate-channel-days to ${w.truth.end} · ${w.events.length} logged events · outlook ${w.outlook.length} rows from ${w.outlook[0]?.as_of} · truth in world/_truth/`);
} else if (cmd === "intake" && ["add", "accept", "reject"].includes(rest[0] ?? "")) {
  const I = join(W, "intake"); const sub = rest[0]!;
  if (sub === "add") {
    const items = JSON.parse(readFileSync(join(I, "items.json"), "utf8")) as Item[];
    const text = flag("text"); if (!text) { console.error("--text required"); process.exit(1); }
    const id = `IT-${String(items.length + 1).padStart(3, "0")}`;
    items.push({ id, received: flag("date") ?? new Date().toISOString().slice(0, 10), source_kind: (flag("kind") ?? "note") as Item["source_kind"], author_role: flag("role") ?? "unknown", subject: flag("subject") ?? "", text });
    writeFileSync(join(I, "items.json"), JSON.stringify(items, null, 2)); console.log(`${id} added; run bun run cycle:intake to process`);
  } else {
    const d = JSON.parse(readFileSync(join(I, "decisions.json"), "utf8")); const id = rest[1]; if (!id) { console.error(`intake ${sub} SG-…`); process.exit(1); }
    d[id] = sub; writeFileSync(join(I, "decisions.json"), JSON.stringify(d, null, 2)); console.log(`${id} → ${sub}; run bun run cycle:intake to apply`);
  }
} else if (cmd === "pdp" || cmd === "reforecast" || cmd === "weekly" || cmd === "monthly" || cmd === "intake" || cmd === "review" || cmd === "publish" || cmd === "learn") {
  const num = (r: Record<string, string>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, ["date", "gate", "channel", "as_of"].includes(k) ? v : v === "" ? null : +v]));
  const extract = fromCsv(readFileSync(join(W, "extract_daily.csv"), "utf8")).map(num) as unknown as ExtractRow[];
  const events = fromCsv(readFileSync(join(W, "events_logged.csv"), "utf8")) as unknown as LoggedEvent[];
  mkdirSync(OUT, { recursive: true });
  const OV = join(W, "intake", "overlays.json");
  const overlays: Overlay[] = existsSync(OV) ? JSON.parse(readFileSync(OV, "utf8")) : [];
  if (cmd === "learn") {
    const outlook = fromCsv(readFileSync(join(W, "outlook_record.csv"), "utf8")).map(num) as unknown as OutlookRow[];
    const through = extract[extract.length - 1]!.date; const st = replay(extract, events, through); const policy = learningPolicy(extract, st);
    const rows = propose(st, outlook, overlays, policy); const b = backtest(extract, st); const earned = earning(b);
    const items = existsSync(join(W, "intake", "items.json")) ? (JSON.parse(readFileSync(join(W, "intake", "items.json"), "utf8")) as Item[]) : [];
    const sigDec = existsSync(join(W, "intake", "decisions.json")) ? JSON.parse(readFileSync(join(W, "intake", "decisions.json"), "utf8")) : {};
    const signals = gateSignals(extractSignals(items), events, st.detected, sigDec).signals;
    const R = join(OUT, "record"); const editsFile = existsSync(R) ? readdirSync(R).filter((f) => f.startsWith(`human_overlays-${st.asOf}`)).sort().pop() : undefined;
    const edits = editsFile ? JSON.parse(readFileSync(join(R, editsFile), "utf8")) : [];
    // time passing: in production the actuals simply arrive; here the synthetic world is run on past the as-of date
    const until = flag("actuals-through") ?? "2026-12-05";
    const future = buildWorld({ end: until }).extract.filter((r) => r.date >= st.asOf); // synthetic registry is the default in the CLI
    const fwd = future.length ? forwardCheck(rows, future, overlays, signals, edits) : null;
    const effects = effectLibrary(extract, events);
    writeFileSync(join(OUT, `learn-${st.asOf}.md`), learnMarkdown(st.asOf, b, earned, fwd, effects, policy));
    writeFileSync(join(OUT, `earned-${st.asOf}.csv`), toCsv(earned as any));
    writeFileSync(join(OUT, `backtest-${st.asOf}.csv`), toCsv([...b.byGateOrigin].flatMap(([g, xs]) => xs.map((x) => ({ gate: g, ...x }))) as any));
    if (fwd) writeFileSync(join(OUT, `attribution-${st.asOf}.csv`), toCsv(fwd.attributions as any));
    console.log(`learn ${st.asOf}: backtest ${b.origins.length} origins · ${earned.filter((e) => e.eligible).length} gates earned auto-approval · ${policy.size} gates learning · forward check ${fwd ? `through ${fwd.through}, ${fwd.attributions.length} items scored` : "skipped"} · edits from ${editsFile ?? "none"} · out/learn-${st.asOf}.md`);
    process.exit(0);
  }
  if (cmd === "review" || cmd === "publish") {
    const outlook = fromCsv(readFileSync(join(W, "outlook_record.csv"), "utf8")).map(num) as unknown as OutlookRow[];
    const through = extract[extract.length - 1]!.date; const st = replay(extract, events, through); const rows = propose(st, outlook, overlays, learningPolicy(extract, st));
    if (cmd === "review") {
      const items = existsSync(join(W, "intake", "items.json")) ? (JSON.parse(readFileSync(join(W, "intake", "items.json"), "utf8")) as Item[]) : [];
      const decisionsSig = existsSync(join(W, "intake", "decisions.json")) ? JSON.parse(readFileSync(join(W, "intake", "decisions.json"), "utf8")) : {};
      const sig = gateSignals(extractSignals(items), events, st.detected, decisionsSig).signals;
      const packet = buildPacket(st, rows, sig, +(flag("weeks") ?? 26));
      const pp = join(OUT, `review-packet-${st.asOf}.json`); writeFileSync(pp, JSON.stringify(packet, null, 1));
      const html = join(OUT, `review-${st.asOf}.html`); const b = spawnSync("bun", ["run", join(dir, "review", "build.ts"), pp, html], { encoding: "utf8" });
      if (b.status !== 0) { console.error(b.stderr); process.exit(1); }
      console.log(`review ${st.asOf}: ${packet.gates.length} gates, biggest movers first · packet ${packet.hash} · open out/review-${st.asOf}.html, decide every gate, sign, then: bun run cycle:publish --decisions <file>`);
    } else {
      const file = flag("decisions"); if (!file) { console.error("--decisions <file> required"); process.exit(1); }
      const d = JSON.parse(readFileSync(file, "utf8")) as Decisions;
      const packet = JSON.parse(readFileSync(flag("packet") ?? join(OUT, `review-packet-${st.asOf}.json`), "utf8")) as Packet;
      const res = publish(packet, d, rows);
      if (!res.ok) { console.error(`NOT PUBLISHED:\n  - ${res.problems.join("\n  - ")}`); process.exit(2); }
      const R = join(OUT, "record"); mkdirSync(R, { recursive: true }); const tag = res.version!.replace(/[:@]/g, "-");
      writeFileSync(join(R, `record-${tag}.csv`), toCsv(res.rows as any));
      writeFileSync(join(R, `wfm_export-${tag}.csv`), toCsv(wfmExport(res.rows!) as any));
      writeFileSync(join(R, `human_overlays-${tag}.json`), JSON.stringify(d.decisions.filter((x) => x.action !== "approve"), null, 2));
      appendFileSync(join(R, "publish-log.jsonl"), JSON.stringify({ version: res.version, packet: packet.hash, signer: res.summary!.signer, at: d.signature!.at, ...res.summary, bulk_approved: d.signature!.bulk_approved.length }) + "\n");
      console.log(`published ${res.version}: ${res.summary!.approved} approved · ${res.summary!.edited} edited · ${res.summary!.rejected} rejected · signed by ${res.summary!.signer} · out/record/record-${tag}.csv + wfm_export`);
    }
    process.exit(0);
  }
  if (cmd === "intake") {
    const outlook = fromCsv(readFileSync(join(W, "outlook_record.csv"), "utf8")).map(num) as unknown as OutlookRow[];
    const items = JSON.parse(readFileSync(join(W, "intake", "items.json"), "utf8")) as Item[];
    const decisions = JSON.parse(readFileSync(join(W, "intake", "decisions.json"), "utf8"));
    const through = extract[extract.length - 1]!.date; const st = replay(extract, events, through);
    const g = gateSignals(extractSignals(items), events, st.detected, decisions);
    writeFileSync(OV, JSON.stringify(g.overlays, null, 2));
    const rows = propose(st, outlook, g.overlays, learningPolicy(extract, st));
    writeFileSync(join(OUT, `intake-${st.asOf}.md`), intakeMarkdown(st.asOf, items, g.signals, g.overlays, rows));
    writeFileSync(join(OUT, `signals-${st.asOf}.csv`), toCsv(g.signals.map((x) => ({ ...x, gates: x.gates.join(";"), channels: x.channels.join(";"), explains: x.explains.join(" | ") })) as any));
    console.log(`intake ${st.asOf}: ${items.length} items · ${g.signals.length} signals · ${g.overlays.length} overlays applied (world/intake/overlays.json, read by reforecast/weekly/monthly) · out/intake-${st.asOf}.md`);
    process.exit(0);
  }
  if (cmd === "weekly" || cmd === "monthly") {
    const outlook = fromCsv(readFileSync(join(W, "outlook_record.csv"), "utf8")).map(num) as unknown as OutlookRow[];
    if (cmd === "weekly") {
      const weeks = +(flag("weeks") ?? 26); const wr = weeklyRefresh(extract, events, outlook, weeks, undefined, overlays, (s, t) => learningPolicy(extract.filter((r) => r.date <= t), s));
      writeFileSync(join(OUT, `weekly-${wr.asOf}.md`), weeklyMarkdown(wr, weeks));
      writeFileSync(join(OUT, `weekly_outlook-${wr.asOf}.csv`), toCsv(wr.gates as any));
      console.log(`weekly ${wr.asOf}: ${wr.gates.length} gate-weeks · ${wr.changes.filter((c) => Math.abs(c.change_pct) >= 1).length} gates moved ≥1% since last week · out/weekly-${wr.asOf}.md`);
    } else {
      const through = extract[extract.length - 1]!.date; const st = replay(extract, events, through); const rows = propose(st, outlook, overlays, learningPolicy(extract, st));
      const ml = monthlyLock(extract, rows, st.asOf, flag("month"), 6, st);
      const L = join(OUT, "locks"); mkdirSync(L, { recursive: true });
      const existing = readdirSync(L).filter((f) => f.startsWith(`lock-${ml.month}`) && f.endsWith(".csv"));
      if (existing.length && !rest.includes("--relock")) { console.error(`${ml.month} is already locked (${existing.join(", ")}). Nothing overwritten; pass --relock to write a new version beside it.`); process.exit(2); }
      const file = existing.length ? `lock-${ml.month}-r${existing.length + 1}.csv` : `lock-${ml.month}.csv`;
      writeFileSync(join(L, file), toCsv(ml.lock as any));
      writeFileSync(join(OUT, `monthly-${ml.month}.md`), monthlyMarkdown(ml));
      writeFileSync(join(OUT, `runway-${ml.month}.csv`), toCsv(ml.runway.flatMap((r) => r.months.map((x) => ({ gate: r.gate, product: r.product, segment: r.segment, hc_now: r.hc_now, ...x }))) as any));
      writeFileSync(join(OUT, `hires-${ml.month}.csv`), toCsv((ml.hires.length ? ml.hires : [{ gate: "", product: "", segment: "", month: "", need_hc: 0, hire_by: "", late: false }]) as any));
      console.log(`monthly lock ${ml.month} (${ml.version}): ${ml.lock.length} gate-weeks locked to locks/${file} · ${ml.hires.length} hiring asks (${ml.hires.filter((h) => h.late).length} late) · ${ml.surplus.length} gates in surplus · out/monthly-${ml.month}.md`);
    }
    process.exit(0);
  }
  if (cmd === "reforecast") {
    const weeks = +(flag("weeks") ?? 12); const through = extract[extract.length - 1]!.date;
    const outlook = fromCsv(readFileSync(join(W, "outlook_record.csv"), "utf8")).map(num) as unknown as OutlookRow[];
    const st = replay(extract, events, through); const rows = propose(st, outlook, overlays, learningPolicy(extract, st));
    const { md, review } = reforecastMarkdown(st, rows, events, weeks);
    writeFileSync(join(OUT, `reforecast-${st.asOf}.md`), md);
    writeFileSync(join(OUT, `outlook_proposed-${st.asOf}.csv`), toCsv(rows as any));
    writeFileSync(join(OUT, `review-${st.asOf}.csv`), toCsv(review as any));
    writeFileSync(join(OUT, `ledger-${st.asOf}.csv`), toCsv(st.detected.map((d) => ({ ...d, gates: d.gates.join(";") })) as any));
    console.log(`reforecast as of ${st.asOf}: ${rows.length} outlook rows · ${review.filter((r) => Math.abs(r.workload_change_pct) >= 5).length} gates moved ≥5% · ${st.detected.length} flags in history · out/reforecast-${st.asOf}.md`);
    process.exit(0);
  }
  const date = flag("date") ?? extract[extract.length - 1]!.date;
  const p = pdpFor(date, extract, events);
  writeFileSync(join(OUT, `pdp-${date}.md`), pdpMarkdown(p));
  writeFileSync(join(OUT, `pdp-${date}.csv`), toCsv(p.lines.map((l) => ({ ...l, events: l.events.join(" | "), checks: l.checks.join(" | ") })) as any));
  console.log(`pdp ${date}: ${p.lines.length} gate-channels · ${p.lines.filter((l) => l.sl_gap_pts < -5).length} below target · ${p.failed.length} failed checks · out/pdp-${date}.md`);
} else {
  console.error("usage: bun run cycle/run.ts world|pdp|reforecast|weekly|monthly [--date yyyy-mm-dd] [--weeks 12|26] [--month yyyy-mm] [--relock]"); process.exit(1);
}
