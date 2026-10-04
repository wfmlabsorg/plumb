/** reforecast-report.ts — the daily reforecast note: what changed and why, then the outlook. */
import { GATES, gate as gateOf } from "./registry";
import { addDays, type LoggedEvent } from "./world";
import { reviewList, weekly, type CycleState, type ProposedRow, type Review } from "./reforecast";

const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pc = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`;

export function reforecastMarkdown(st: CycleState, rows: ProposedRow[], events: LoggedEvent[], weeks = 12): { md: string; review: Review[] } {
  const y = addDays(st.asOf, -1);
  const review = reviewList(st, rows, weeks);
  const product = (r: ProposedRow) => gateOf(r.gate).product;
  const wk = weekly(rows, product, weeks);
  const gw = weekly(rows, (r) => r.gate, weeks);
  const watch = gw.filter((x) => x.over_under_pct < -10 && x.req >= 2).sort((a, b) => a.over_under_pct - b.over_under_pct);
  const yLogged = events.filter((e) => e.start <= y && y <= e.end);
  const yDetected = st.detected.filter((d) => d.date === y);
  const moved = review.filter((r) => Math.abs(r.workload_change_pct) >= gateOf(r.gate).reviewThresholdPct);
  const nextWave = st.migrations.flatMap((m) => m.waves.filter((w) => w.date >= st.asOf).map((w) => ({ m, w })))[0];
  const overlayFte = (from: string, to: string) => rows.filter((r) => r.date >= from && r.date < to && r.overlay_volume).reduce((s, r) => s + (r.overlay_volume / Math.max(r.fc_volume_proposed, 1)) * r.req_proposed_fte, 0);
  const out = [
    `# Daily reforecast · as of ${st.asOf}`, "",
    `Data through ${y} · ${GATES.length} gates reviewed · **${pl(moved.length, "gate", "gates")} moved past ${moved.length === 1 ? "its" : "their"} review threshold** over the next ${weeks} weeks · ${pl(watch.length, "gate-week", "gate-weeks")} short by more than 10% · ${pl(yDetected.length, "flag", "flags")} yesterday that nothing logged explains`, "",
    "## Yesterday", "",
    `- **Logged:** ${yLogged.length ? yLogged.map((e) => `${e.type} (${e.description}; ${e.gates === "*" ? "all gates" : e.gates.split(";").length + " gates"})`).join(" · ") : "nothing"}.`,
    `- **Flagged, not logged:** ${yDetected.length ? yDetected.map((d) => `${d.kind} on ${d.gates.length > 3 ? d.gates.length + " gates" : d.gates.join(", ")}${d.channel ? " " + d.channel : ""}: ${d.detail}`).join(" · ") : "nothing"}.`,
    `- **Learning:** explained or flagged days are never learned from. Over the full history, ${st.explained} gate-channel-days were explained by logged events, ${st.excluded} were excluded as anomalies, and the rest were learned from.`,
    "", "## Migrations", "",
    ...st.migrations.flatMap((m) => [
      `**${m.from} → ${m.to}.** The planned contact ratio on migrated volume is ${m.plannedRatio.toFixed(2)}. The receiving gate's own level is frozen at the first wave (${m.waves[0]?.date}), and the excess is attributed to the migration.`, "",
      "| Channel | Observed ratio | 95% range | Settled days | Used in the outlook |", "|---|---:|---:|---:|---|",
      ...[...m.acc].map(([c, a]) => `| ${c} | ${(m.plannedRatio * a.excess / Math.max(a.planned, 1)).toFixed(2)} | ±${(2 * a.se).toFixed(2)} | ${a.days} | ${a.applied ? "**yes**: clearly above plan" : "no: not yet distinguishable from plan"} |`), "",
    ]),
    nextWave ? `Next wave: **${nextWave.w.date}** takes the move to ${Math.round(nextWave.w.share * 100)}%. At the observed ratios it adds about **${overlayFte(nextWave.w.date, addDays(nextWave.w.date, 7)).toFixed(1)} FTE** of daily work on ${nextWave.m.to} in its first week, beyond what the record plans.` : "",
    "", "## Signals in the outlook", "",
    ...(() => { const sig = rows.filter((r) => r.signal_overlay_volume); if (!sig.length) return ["None applied. Run `bun run cycle:intake` to process the demo intake."];
      const by = new Map<string, { from: string; to: string; vol: number }>(); for (const r of sig) { const x = by.get(r.gate) ?? { from: r.date, to: r.date, vol: 0 }; x.from = x.from < r.date ? x.from : r.date; x.to = x.to > r.date ? x.to : r.date; x.vol += r.signal_overlay_volume; by.set(r.gate, x); }
      return [`Applied signal overlays touch ${by.size} gates (see the intake digest for the source of each).`, "", "| Gate | From | To | Contacts added (+) or removed (−) |", "|---|---|---|---:|", ...[...by].map(([g, x]) => `| ${g} | ${x.from} | ${x.to} | ${x.vol > 0 ? "+" : ""}${x.vol.toLocaleString()} |`)]; })(),
    "", `## Outlook by product · next ${weeks} weeks (daily average FTE)`, "",
    "| Week of | Product | Required (P10–P90) | Planned staff | Over/under | Projected SL |", "|---|---|---:|---:|---:|---:|",
    ...wk.map((x) => `| ${x.week} | ${x.key} | ${x.req} (${x.req_p10}–${x.req_p90}) | ${x.sched} | ${x.over_under >= 0 ? "+" : ""}${x.over_under} (${pc(x.over_under_pct)}) | ${Math.round(x.sl * 100)}% |`),
    "", `## Review list · every gate, biggest movers first (top 20; all ${review.length} in the CSV)`, "",
    "| Gate | Product | Segment | Workload vs record | Volume correction | AHT correction | Migration overlay | Shifts (60 days) | Weeks short | Worst week |", "|---|---|---|---:|---:|---:|---:|---|---:|---:|",
    ...review.slice(0, 20).map((r) => `| ${r.gate} | ${r.product} | ${r.segment} | **${pc(r.workload_change_pct)}** | ${pc(r.vol_correction_pct)} | ${pc(r.aht_correction_pct)} | ${r.overlay ? r.overlay.toLocaleString() + " contacts" : "—"} | ${r.shifts || "—"} | ${r.weeks_short} | ${r.worst_week_over_under} FTE |`),
    "", `## Watchlist · gate-weeks short by more than 10% (${watch.length})`, "",
    ...(watch.length ? ["| Week of | Gate | Required | Planned staff | Short | Projected SL |", "|---|---|---:|---:|---:|---:|", ...watch.slice(0, 25).map((x) => `| ${x.week} | ${x.key} | ${x.req} | ${x.sched} | ${x.over_under} FTE (${pc(x.over_under_pct)}) | ${Math.round(x.sl * 100)}% |`)] : ["None."]),
    "", "## How this was produced", "",
    "- **Corrections.** Each gate-channel carries a learned correction to the forecast of record, for volume and handle time. It is learned slowly from clean days only, capped per day, and sped up only when a sustained run confirms a real shift.",
    "- **Detection.** Single-series outliers, estate-wide spikes and staffing shortfalls that nothing logged explains are flagged and excluded from learning. A staffing shortfall never changes the demand forecast.",
    "- **Migrations.** The receiving gate's level is frozen at the first wave. The migration ratio is estimated as one pooled figure with its uncertainty, and applied only when it is clearly distinguishable from plan.",
    "- **Requirement and outcome.** Required staff is recomputed with Erlang C (concurrency applied once; email as workload). Projected SL is at the planned staff. The P10–P90 range reflects day-to-day noise plus 2% level uncertainty.",
    "- **Status.** This is a proposal. Nothing is published until the gates are reviewed. Synthetic data.", "",
  ];
  return { md: out.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n"), review };
}
