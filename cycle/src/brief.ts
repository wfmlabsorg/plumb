/**
 * brief.ts — the daily brief: one page on top of every report the cycle writes.
 *
 * Answer first. Five headline lines (yesterday, today's forecast change, the staffing risk ahead,
 * what is due, how accurate the record has been), then every decision the cycle needs from a person,
 * each with an owner, a due date and the evidence; the risks ahead; what the cycle did on its own;
 * and three small trends. Built only from what the run already computed; it decides nothing itself.
 *   buildBrief(...) → Brief (plumb.brief/1) · briefMarkdown(b) · briefHtml(b, css) · decisionsCsv(b)
 */
import type { PdpReport } from "./pdp";
import type { CycleState, ProposedRow, WeekRow } from "./reforecast";
import type { Signal, Overlay } from "./signals";
import type { Packet } from "./review";
import type { Backtest, Earned, Forward } from "./learn";
import type { MonthlyLock, WeeklyRefresh } from "./cadence";
import type { ExtractRow, LoggedEvent } from "./world";
import { addDays } from "./world";

export type Urgency = "overdue" | "today" | "this week" | "later";
export interface BriefDecision { id: string; kind: "sign-reforecast" | "confirm-signal" | "explain-flag" | "hire" | "lock" | "redeploy"; what: string; why: string; owner: string; due: string; urgency: Urgency; see: string }
export interface BriefRisk { what: string; when: string; size: string; see: string }
export interface Brief {
  schema: "plumb.brief/1"; asOf: string; through: string; status: string;
  headline: { label: string; text: string; tone: "good" | "warn" | "bad" | "info" }[];
  decisions: BriefDecision[]; risks: BriefRisk[]; automatic: string[];
  trends: { sl: { date: string; sl: number; target: number }[]; accuracy: { origin: string; record: number; proposal: number }[]; outlook: { week: string; req: number; p90: number; staff: number }[] };
  learned: string[];
}
export interface BriefInput {
  asOf: string; through: string; pdp: PdpReport; state: CycleState; rows: ProposedRow[]; packet: Packet; signals: Signal[]; overlays: Overlay[];
  earned: Earned[]; backtest: Backtest; weekly: WeeklyRefresh; monthly: MonthlyLock; extract: ExtractRow[]; events: LoggedEvent[]; learning: Set<string>; forward: Forward | null;
}

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const sgn = (x: number, d = 1) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(d)}`;
const days = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const urgency = (asOf: string, due: string): Urgency => (due < asOf ? "overdue" : due === asOf ? "today" : days(asOf, due) <= 7 ? "this week" : "later");
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2) : 0; };
const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const ORDER: Record<Urgency, number> = { overdue: 0, today: 1, "this week": 2, later: 3 };

export function buildBrief(i: BriefInput): Brief {
  const D: BriefDecision[] = []; let n = 0; const id = () => `D${String(++n).padStart(2, "0")}`;

  // 1. sign today's reforecast: what can pass on its record, what needs eyes
  const eligible = new Set(i.earned.filter((e) => e.eligible).map((e) => e.gate));
  const moved = i.packet.gates.filter((g) => Math.abs(g.change_pct) >= 1);
  const auto = i.packet.gates.filter((g) => Math.abs(g.change_pct) < 1 && eligible.has(g.gate) && !g.flags.length);
  const look = i.packet.gates.filter((g) => !auto.includes(g));
  const top = [...moved].sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct)).slice(0, 3).map((g) => `${g.gate} ${sgn(g.change_pct)}%`);
  const flagged = look.filter((g) => g.flags.length).length; const unearned = look.length - moved.filter((g) => look.includes(g)).length - flagged;
  D.push({ id: id(), kind: "sign-reforecast", what: `Review and sign today's reforecast: ${look.length} queues to look at, ${auto.length} can be approved on their record`,
    why: `${moved.length} of ${i.packet.gates.length} queues moved 1% or more${top.length ? ` (largest: ${top.join(", ")})` : ""}${flagged ? `; ${flagged} carry a flag` : ""}${unearned > 0 ? `; ${unearned} moved less but have not earned auto-approval` : ""}; ${eligible.size} queues have earned auto-approval, and the ${auto.length} that moved under 1% with no flag can pass on it. Publishing is refused until every queue is decided and the review is signed`, owner: "forecast owner", due: i.asOf, urgency: "today", see: "review" });

  // 2. signals waiting on a person: before they bite
  // a waiting signal whose start has passed is history: the actuals show what happened and learning scores it
  const waiting = i.signals.filter((s) => s.kind === "forward" && ["proposed", "rumor"].includes(s.status));
  const lapsed = waiting.filter((s) => s.start <= i.through);
  for (const s of waiting.filter((s) => s.start > i.through)) {
    const due = s.start <= addDays(i.asOf, 7) ? i.asOf : addDays(s.start, -7) < i.asOf ? i.asOf : addDays(s.start, -7);
    const size = s.pct !== null && s.direction ? `${s.direction === "up" ? "+" : "−"}${s.pct}%` : "size unknown";
    D.push({ id: id(), kind: "confirm-signal", what: s.status === "rumor" ? `Find an owner for, or drop, the unattributed ${s.type} claim (${size} from ${s.start})` : `Confirm or reject the ${s.type} signal: ${size} on ${s.gates.length ? s.gates.length + " queue" + (s.gates.length > 1 ? "s" : "") : "unnamed queues"} from ${s.start}`,
      why: `${s.id}, from ${s.author_role} (${s.source_kind}); needs ${s.needs || "a decision"}${s.status === "rumor" ? "" : /stand-up|several|unknown|forwarded/i.test(s.author_role) ? "; confirm with whoever raised it" : `; confirm with the ${s.author_role}`}`, owner: "forecast owner", due, urgency: urgency(i.asOf, due), see: "intake" });
  }

  // 3. flags nobody has explained: yesterday's anomalies, the last week's suspected absences
  const recent = i.state.detected.filter((d) => d.date === i.through || (d.kind === "suspected-absence" && d.date >= addDays(i.through, -6)));
  for (const d of recent) D.push({ id: id(), kind: "explain-flag", what: `Explain or log the ${d.kind.replace("suspected-", "suspected ")} on ${d.gates.length > 3 ? d.gates.length + " queues" : d.gates.join(", ")}${d.channel ? " " + d.channel : ""} (${d.date})`,
    why: `${d.detail.slice(0, 140)}; an unexplained day is kept out of learning, and a logged one becomes part of the event-effect library`, owner: d.kind === "suspected-absence" ? "real-time lead" : "forecast owner", due: i.asOf, urgency: "today", see: "reforecast" });

  // 4. hiring: one decision per product, due at its earliest hire-by date
  for (const p of [...new Set(i.monthly.hires.map((h) => h.product))].sort()) {
    const hs = i.monthly.hires.filter((h) => h.product === p).sort((a, b) => a.hire_by.localeCompare(b.hire_by)); const heads = hs.reduce((s, h) => s + h.need_hc, 0); const late = hs.filter((h) => h.late).length;
    D.push({ id: id(), kind: "hire", what: `Open requisitions for product ${p}: ${Math.round(heads)} heads across ${hs.length} queue${hs.length > 1 ? "s" : ""}, first needed ${hs[0]!.month}`,
      why: `the runway after attrition falls below the P50 requirement${late ? `; ${late} ask${late > 1 ? "s are" : " is"} already past hire-by` : ""}`, owner: "capacity planning", due: hs[0]!.hire_by, urgency: urgency(i.asOf, hs[0]!.hire_by), see: "monthly" });
  }

  // 5. the monthly lock and what to do with surplus
  const monthStart = `${i.monthly.month}-01`; const lockDue = addDays(monthStart, -1);
  D.push({ id: id(), kind: "lock", what: `Sign the monthly lock for ${i.monthly.month} (version ${i.monthly.version})`, why: `${i.monthly.lock.length} queue-weeks locked; the version of record for the month`, owner: "capacity planning lead", due: lockDue, urgency: urgency(i.asOf, lockDue), see: "monthly" });
  if (i.monthly.surplus.length) { const fte = i.monthly.surplus.reduce((s, x) => s + x.surplus_fte, 0);
    D.push({ id: id(), kind: "redeploy", what: `Decide where ${fte.toFixed(0)} FTE of surplus goes in ${i.monthly.month} (${i.monthly.surplus.length} queues above P90 by more than 10%)`, why: `largest: ${i.monthly.surplus.slice(0, 2).map((s) => `${s.gate} ${s.surplus_fte.toFixed(1)} FTE`).join(", ")}`, owner: "capacity planning", due: lockDue, urgency: urgency(i.asOf, lockDue), see: "monthly" }); }
  D.sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency] || a.due.localeCompare(b.due) || a.id.localeCompare(b.id));

  // risks ahead
  const R: BriefRisk[] = [];
  const estate = new Map<string, { req: number; p90: number; staff: number }>();
  for (const w of i.weekly.products) { const e = estate.get(w.week) ?? { req: 0, p90: 0, staff: 0 }; e.req += w.req; e.p90 += w.req_p90; e.staff += w.sched; estate.set(w.week, e); }
  const outlook = [...estate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, v]) => ({ week, req: +v.req.toFixed(1), p90: +v.p90.toFixed(1), staff: +v.staff.toFixed(1) }));
  for (const p of [...new Set(i.weekly.products.map((w) => w.key))].sort()) {
    const ws = i.weekly.products.filter((w) => w.key === p); const worst = ws.reduce((a, b) => (b.over_under < a.over_under ? b : a));
    if (worst.over_under < 0) R.push({ what: `Product ${p} runs short at P50`, when: `week of ${worst.week}`, size: `${Math.abs(worst.over_under).toFixed(1)} FTE short (${Math.abs(worst.over_under_pct).toFixed(1)}%); ${ws.filter((w) => w.over_under < 0).length} of ${ws.length} weeks short`, see: "weekly" });
  }
  for (const e of i.events.filter((e) => e.start > i.through && e.type === "migration").sort((a, b) => a.start.localeCompare(b.start)).slice(0, 1))
    R.push({ what: "Next migration wave", when: e.start, size: e.description.slice(0, 90), see: "reforecast" });
  for (const o of i.overlays.filter((o) => o.from > i.through && o.from <= addDays(i.asOf, 45)).sort((a, b) => a.from.localeCompare(b.from)))
    R.push({ what: `${((t) => t.charAt(0).toUpperCase() + t.slice(1))(i.signals.find((s) => s.id === o.signals[0])?.type ?? "applied")} change on ${o.gates.length} queue${o.gates.length > 1 ? "s" : ""}${o.channels.length ? " (" + o.channels.join(", ") + ")" : ""}`, when: o.to && o.to !== o.from ? `${o.from} to ${o.to}` : o.to ? o.from : `from ${o.from}`, size: `${sgn((o.factor - 1) * 100, 0)}% volume, from ${o.signals.join(" + ")}`, see: "intake" });
  const lateHires = i.monthly.hires.filter((h) => h.late).length;
  if (lateHires) R.push({ what: "Hiring asks already past their hire-by date", when: "now", size: `${lateHires}; their gaps close later than the plan needs`, see: "monthly" });

  // trends
  const last28 = addDays(i.through, -27); const sl = new Map<string, { s: number; o: number; t: number }>();
  for (const r of i.extract) if (r.date >= last28 && r.date <= i.through) { const v = sl.get(r.date) ?? { s: 0, o: 0, t: 0 }; v.s += r.answered_in_sl; v.o += r.offered; v.t += r.target_sl * r.offered; sl.set(r.date, v); }
  const slTrend = [...sl.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, sl: v.o ? v.s / v.o : 0, target: v.o ? v.t / v.o : 0 }));
  const accuracy = i.backtest.origins.map((origin) => { const rec: number[] = [], pro: number[] = []; for (const xs of i.backtest.byGateOrigin.values()) { const x = xs.find((y) => y.origin === origin); if (x) { rec.push(x.record); pro.push(x.proposal); } } return { origin, record: +median(rec).toFixed(2), proposal: +median(pro).toFixed(2) }; });

  // headline
  const est = i.pdp.products.reduce((a, p) => ({ fc: a.fc + p.fc_volume, act: a.act + p.act_volume, below: a.below + p.below_target }), { fc: 0, act: 0, below: 0 });
  const y = slTrend[slTrend.length - 1]; const belowGates = i.pdp.gates.filter((g) => g.below_target > 0).length;
  const next4 = addDays(i.asOf, 28); const rec4 = i.rows.filter((r) => r.date > i.through && r.date <= next4).reduce((s, r) => s + r.fc_req_fte, 0); const pro4 = i.rows.filter((r) => r.date > i.through && r.date <= next4).reduce((s, r) => s + r.req_proposed_fte, 0);
  const worstWeek = outlook.reduce<(typeof outlook)[number] | null>((a, w) => (!a || w.staff - w.req < a.staff - a.req ? w : a), null);
  const due = { overdue: D.filter((d) => d.urgency === "overdue").length, today: D.filter((d) => d.urgency === "today").length, week: D.filter((d) => d.urgency === "this week").length };
  const recent4 = accuracy.slice(-4); const recWape = median(recent4.map((a) => a.record)); const yrWape = median(accuracy.map((a) => a.record));
  const H: Brief["headline"] = [
    { label: "Yesterday", text: y ? `Service level ${pct(y.sl)} against a ${pct(y.target, 0)} target; ${belowGates} of ${i.pdp.gates.length} queues missed target on at least one channel. Volume ${sgn(((est.act - est.fc) / (est.fc || 1)) * 100)}% against forecast.` : "No prior-day data.", tone: y && y.sl >= y.target ? "good" : y && y.sl >= y.target - 0.05 ? "warn" : "bad" },
    { label: "Forecast", text: `${moved.length} queues moved 1% or more today; requirement over the next four weeks ${sgn(((pro4 - rec4) / (rec4 || 1)) * 100)}% against the record.`, tone: moved.length > i.packet.gates.length / 3 ? "warn" : "info" },
    { label: "Staffing", text: worstWeek && worstWeek.staff < worstWeek.req ? `Tightest week ahead is the week of ${worstWeek.week}: ${(worstWeek.req - worstWeek.staff).toFixed(0)} FTE short of a ${worstWeek.req.toFixed(0)} FTE requirement at P50.` : "Planned staff covers the P50 requirement in every week of the outlook.", tone: worstWeek && worstWeek.staff < worstWeek.req * 0.97 ? "bad" : worstWeek && worstWeek.staff < worstWeek.req ? "warn" : "good" },
    { label: "Decisions", text: `${due.today} due today, ${due.week} this week${due.overdue ? `, ${due.overdue} overdue` : ""}; ${D.length} open in all.`, tone: due.overdue ? "bad" : due.today ? "warn" : "good" },
    { label: "Accuracy", text: i.forward ? `The forecast published on ${i.forward.asOf} scored ${i.forward.layers[i.forward.layers.length - 1]!.wape}% volume WAPE against actuals through ${i.forward.through} (the record alone: ${i.forward.layers[0]!.wape}%).` : `Median queue error over the last four weeks ${recWape.toFixed(1)}% (28-day workload WAPE), against ${yrWape.toFixed(1)}% for the year.`, tone: "info" },
  ];

  const applied = i.signals.filter((s) => ["applied", "accepted"].includes(s.status)).length; const corro = i.signals.filter((s) => s.status === "corroborating").length;
  const automatic = [
    `Read ${i.extract.length.toLocaleString("en-US")} queue-channel-days of history and yesterday's performance on ${i.pdp.gates.length} queues.`,
    `Graded ${i.signals.length} signals from intake: ${applied} applied as dated overlays${corro ? `, ${corro} corroborating` : ""}, the rest held for a person.`,
    `Kept ${i.state.explained.toLocaleString("en-US")} explained and ${i.state.excluded.toLocaleString("en-US")} flagged queue-channel-days out of learning; ${i.learning.size} queue${i.learning.size === 1 ? " is" : "s are"} learning on an earned record.`,
    `Proposed a reforecast for ${i.packet.gates.length} queues; ${auto.length} meet the earned auto-approval rule.`,
    ...(lapsed.length ? [`Closed ${lapsed.length} signal${lapsed.length > 1 ? "s" : ""} that reached ${lapsed.length > 1 ? "their" : "its"} start date unconfirmed (${lapsed.map((s) => s.id).join(", ")}); the learning report scores what ${lapsed.length > 1 ? "they" : "it"} would have done.`] : []),
    `Refreshed the 26-week outlook and drafted the ${i.monthly.month} lock with ${i.monthly.hires.length} hiring asks.`,
  ];
  const learned = i.forward ? i.forward.layers.map((l) => `${l.layer}: ${l.wape}% WAPE, bias ${l.bias}%`) : [];
  return { schema: "plumb.brief/1", asOf: i.asOf, through: i.through, status: "Reforecast proposed, awaiting the forecast owner's signature", headline: H, decisions: D, risks: R, automatic, trends: { sl: slTrend, accuracy, outlook }, learned };
}

// ---------------- renderers ----------------
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
export function decisionsCsv(b: Brief): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return ["id,urgency,due,owner,kind,decision,evidence", ...b.decisions.map((d) => [d.id, d.urgency, d.due, q(d.owner), d.kind, q(d.what), q(d.why)].join(","))].join("\n") + "\n";
}
export function briefMarkdown(b: Brief): string {
  return [`# Daily brief · ${fmtDate(b.asOf)}`, "", `*${b.status}. Data through ${b.through}.*`, "",
    ...b.headline.map((h) => `- **${h.label}.** ${h.text}`), "",
    `## Decisions (${b.decisions.length})`, "", "| | Decision | Owner | Due | Evidence |", "|---|---|---|---|---|",
    ...b.decisions.map((d) => `| ${d.urgency} | ${d.what} | ${d.owner} | ${d.due} | ${d.why.replace(/\|/g, "/")} |`), "",
    "## Risks ahead", "", "| Risk | When | Size |", "|---|---|---|", ...b.risks.map((r) => `| ${r.what} | ${r.when} | ${r.size} |`), "",
    "## What the cycle did on its own", "", ...b.automatic.map((a) => `- ${a}`), "",
    ...(b.learned.length ? ["## What the last published forecast taught us", "", ...b.learned.map((l) => `- ${l}`), ""] : []),
    "*Every number is computed by the cycle from the run's own outputs; the brief decides nothing. Each decision links to the report that holds its evidence.*"].join("\n");
}

function lineChart(o: { title: string; x: string[]; series: { name: string; y: number[]; color: string; dash?: boolean }[]; band?: { lo: number[]; hi: number[]; color: string; name: string }; yFmt: (v: number) => string; note: string }): string {
  const W = 340, Hh = 150, L = 40, R = 8, T = 10, B = 22; const all = [...o.series.flatMap((s) => s.y), ...(o.band ? [...o.band.lo, ...o.band.hi] : [])].filter(Number.isFinite);
  let lo = Math.min(...all), hi = Math.max(...all); const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
  const X = (k: number) => L + (k / Math.max(1, o.x.length - 1)) * (W - L - R); const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (Hh - T - B);
  const path = (ys: number[]) => ys.map((v, k) => `${k ? "L" : "M"}${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
  const band = o.band ? `<path d="${path(o.band.hi)}${o.band.lo.map((v, k) => `L${X(o.band!.lo.length - 1 - k).toFixed(1)},${Y(o.band!.lo[o.band!.lo.length - 1 - k]!).toFixed(1)}`).join("")}Z" fill="${o.band.color}" opacity=".18"/>` : "";
  const xl = [0, Math.floor((o.x.length - 1) / 2), o.x.length - 1].map((k) => `<text x="${X(k)}" y="${Hh - 6}" text-anchor="${k === 0 ? "start" : k === o.x.length - 1 ? "end" : "middle"}">${esc(o.x[k]?.slice(5) ?? "")}</text>`).join("");
  return `<figure class="chart"><figcaption>${esc(o.title)}</figcaption><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(o.title)}">
${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 4}" y="${Y(v) + 3}" text-anchor="end">${esc(o.yFmt(v))}</text>`).join("")}${band}
${o.series.map((s) => `<path d="${path(s.y)}" fill="none" stroke="${s.color}" stroke-width="2"${s.dash ? ' stroke-dasharray="4 3"' : ""}/>`).join("")}${xl}</svg>
<div class="legend">${o.series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}${o.band ? `<span><i style="background:${o.band.color};opacity:.35"></i>${esc(o.band.name)}</span>` : ""}</div><p class="note">${esc(o.note)}</p></figure>`;
}

export function briefHtml(b: Brief, css: string, links: Record<string, string> = {}): string {
  const link = (see: string, label = "evidence") => (links[see] ? `<a href="${links[see]}">${label}</a>` : "");
  const tone = { good: "#2e7d32", warn: "#b26a00", bad: "#c62828", info: "#1f5fbf" };
  const urg = { overdue: "#c62828", today: "#b26a00", "this week": "#1f5fbf", later: "#5b6876" };
  const t = b.trends;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Daily Brief</title><style>${css}
.brief h1{margin-bottom:2px}.status{color:var(--muted);margin-top:0}.hl{list-style:none;padding:0;margin:14px 0;display:grid;gap:8px}.hl li{background:var(--card);border:1px solid var(--line);border-left:5px solid;border-radius:8px;padding:9px 12px}.hl b{display:inline-block;min-width:84px}
.pill{display:inline-block;border-radius:999px;padding:1px 8px;font-size:11.5px;font-weight:700;color:#fff;white-space:nowrap}.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.chart{margin:0;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px}
.chart figcaption{font-weight:600;font-size:13px;margin-bottom:4px}.chart svg{width:100%;height:auto;font-size:9px;fill:var(--muted)}.chart .grid{stroke:var(--line);stroke-width:1}.legend{display:flex;flex-wrap:wrap;gap:10px;font-size:11.5px;color:var(--muted)}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}.note{font-size:11.5px;color:var(--muted);margin:4px 0 0}
.decs{display:grid;gap:8px}.dec{background:var(--card);border:1px solid var(--line);border-left:5px solid;border-radius:8px;padding:9px 12px}.dec .meta{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:12.5px;color:var(--muted);margin-bottom:3px}.dec .meta b{color:var(--ink)}.dec .what{font-weight:600}.who{white-space:nowrap}.ev{color:var(--muted);font-size:12.5px}@media print{body{background:#fff}.chart,.hl li,.tw,.dec{break-inside:avoid}a{color:inherit;text-decoration:none}}
</style></head><body><main class="brief">
<h1>Daily brief · ${esc(fmtDate(b.asOf))}</h1><p class="status">${esc(b.status)} · data through ${esc(b.through)}</p>
<ul class="hl">${b.headline.map((h) => `<li style="border-left-color:${tone[h.tone]}"><b>${esc(h.label)}</b> ${esc(h.text)}</li>`).join("")}</ul>
<h2>Decisions (${b.decisions.length})</h2><div class="decs">
${b.decisions.map((d) => `<div class="dec" style="border-left-color:${urg[d.urgency]}"><div class="meta"><span class="pill" style="background:${urg[d.urgency]}">${esc(d.urgency)}</span><span>due <b>${esc(d.due)}</b></span><span>owner <b>${esc(d.owner)}</b></span></div><div class="what">${esc(d.what)}</div><div class="ev">${esc(d.why)} ${link(d.see)}</div></div>`).join("")}</div>
<h2>Risks ahead</h2><div class="tw"><table><thead><tr><th>Risk</th><th>When</th><th>Size</th></tr></thead><tbody>${b.risks.map((r) => `<tr><td>${esc(r.what)} ${link(r.see, "→")}</td><td class="who">${esc(r.when)}</td><td>${esc(r.size)}</td></tr>`).join("")}</tbody></table></div>
<h2>Trends</h2><div class="charts">
${lineChart({ title: "Service level, last 28 days", x: t.sl.map((p) => p.date), series: [{ name: "achieved", y: t.sl.map((p) => p.sl * 100), color: "#1f5fbf" }, { name: "target", y: t.sl.map((p) => p.target * 100), color: "#9aa7b4", dash: true }], yFmt: (v) => `${v.toFixed(0)}%`, note: "Whole estate, answered within threshold over offered." })}
${lineChart({ title: "Forecast error by forecast date", x: t.accuracy.map((p) => p.origin), series: [{ name: "record", y: t.accuracy.map((p) => p.record), color: "#5b6876" }, { name: "cycle's proposal", y: t.accuracy.map((p) => p.proposal), color: "#1f5fbf" }], yFmt: (v) => `${v.toFixed(0)}%`, note: "Median queue, 28-day workload WAPE, walk-forward. Lower is better." })}
${lineChart({ title: "Staff against requirement, next 26 weeks", x: t.outlook.map((p) => p.week), series: [{ name: "planned staff", y: t.outlook.map((p) => p.staff), color: "#2e7d32" }, { name: "required (P50)", y: t.outlook.map((p) => p.req), color: "#1f5fbf" }], band: { lo: t.outlook.map((p) => p.req), hi: t.outlook.map((p) => p.p90), color: "#c62828", name: "P50 to P90" }, yFmt: (v) => v.toFixed(0), note: "Daily average FTE, whole estate. Where green is under blue, the week is short." })}
</div>
${b.learned.length ? `<h2>What the last published forecast taught us</h2><ul>${b.learned.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
<h2>What the cycle did on its own</h2><ul>${b.automatic.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<p class="ev">Every number is computed by the cycle from this run's outputs; the brief decides nothing. ${Object.keys(links).length ? `Full reports: ${Object.entries(links).filter(([k]) => k !== "review").map(([k, v]) => `<a href="${v}">${esc(k)}</a>`).join(" · ")}.` : ""}</p>
</main></body></html>`;
}
