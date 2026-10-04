/** learn-report.ts — the learning note: what each layer, signal and human edit did to accuracy. */
import { GATES } from "./registry";
import { bias, LAYERS, wape, EARN, EARNED, SHIFT_GATE, type Backtest, type Earned, type Effect, type Forward } from "./learn";
import { CFG } from "./reforecast";

const pts = (x: number) => `${x > 0 ? "+" : ""}${x.toFixed(2)}`;
export function learnMarkdown(asOf: string, b: Backtest, earned: Earned[], fwd: Forward | null, effects: Effect[], policy: Set<string>): string {
  const w = b.total.map(wape); const rec = w[0]!;
  const best = LAYERS.map((l, k) => ({ l, v: w[k]! })).sort((a, c) => a.v - c.v)[0]!;
  const prods = [...b.byProduct].sort((a, c) => a[0].localeCompare(c[0]));
  const elig = earned.filter((e) => e.eligible);
  const applied = fwd?.attributions.filter((a) => a.kind === "signal") ?? [], cf = fwd?.attributions.filter((a) => a.kind === "counterfactual") ?? [];
  const out = [
    `# Learning · as of ${asOf}`, "",
    `Backtest: ${b.origins.length} weekly origins (${b.origins[0]} → ${b.origins[b.origins.length - 1]}), ${b.horizonDays}-day horizon, workload (volume × handle time) on every gate-channel-day. The cycle never reads the planted truth.`, "",
    "## What the evidence says", "",
    `- **The record is hard to beat on a quiet estate.** Workload WAPE is ${rec.toFixed(2)}% for the record and ${w[3]!.toFixed(2)}% with every learned correction applied everywhere (${pts(rec - w[3]!)} pts). Most gates have nothing real to learn, so applying corrections everywhere chases noise.`,
    `- **Learning has to be earned, gate by gate.** Under the walk-forward policy (a gate uses its corrections only after they beat the record in earlier windows) the estate scores ${w[4]!.toFixed(2)}% (${pts(rec - w[4]!)} pts). That is the policy the proposal now uses, together with any confirmed shift in the last ${SHIFT_GATE.days} days. ${policy.size} of ${GATES.length} ${policy.size === 1 ? "gate is" : "gates are"} learning today.`,
    `- **The explicit overlays carry the big gains.** ${fwd ? `Of the applied signals, ${applied.filter((a) => a.verdict === "helped").length} of ${applied.length} helped. Of the signals kept off the forecast, ${cf.filter((a) => a.verdict === "hurt").length} would have hurt (kept off correctly) and ${cf.filter((a) => a.verdict === "helped").length} would have helped (held back at a cost). ` : ""}Migration ratios, calendar and client signals are modeled changes with a source. They are not inferred from noise.`,
    fwd ? `- **Human edits are scored like everything else.** ${fwd.attributions.filter((a) => a.kind === "human edit").map((a) => `${a.id}: ${a.verdict} (${pts(a.fva_pts)} pts)`).join("; ") || "none to score"}.` : "",
    `- **Best layer in the backtest:** ${best.l} (${best.v.toFixed(2)}%).`, "",
    "## Backtest by layer (workload WAPE, %)", "",
    `| Scope | ${LAYERS.join(" | ")} |`, `|---|${LAYERS.map(() => "---:").join("|")}|`,
    `| **All gates** | ${w.map((x) => x.toFixed(2)).join(" | ")} |`,
    ...prods.map(([p, a]) => `| Product ${p} | ${a.map((x) => wape(x).toFixed(2)).join(" | ")} |`),
    `| Bias, all gates | ${b.total.map((x) => `${bias(x).toFixed(2)}`).join(" | ")} |`,
    "", "*Forecast value added (FVA) = WAPE of the record − WAPE of the layer, in points; positive means the layer helped.*", "",
    ...(fwd ? [
      `## Forward check · the proposal of ${fwd.asOf} against actuals through ${fwd.through}`, "",
      "| Layer | Volume WAPE | Bias |", "|---|---:|---:|", ...fwd.layers.map((l) => `| ${l.layer} | ${l.wape}% | ${l.bias}% |`), "",
      "### Each signal, counterfactual and human edit, on the gate-days it touched", "",
      "| Item | Kind | What | Gate-days | WAPE without | WAPE with | FVA | Verdict |", "|---|---|---|---:|---:|---:|---:|---|",
      ...fwd.attributions.slice().sort((a, c) => c.fva_pts - a.fva_pts).map((a) => `| ${a.id} | ${a.kind} | ${a.what.replace(/\|/g, "/")} | ${a.gate_days} | ${a.wape_without}% | ${a.wape_with}% | **${pts(a.fva_pts)}** | ${a.kind === "counterfactual" ? (a.verdict === "hurt" ? "would have hurt: kept off correctly" : a.verdict === "helped" ? "would have helped: held back at a cost" : "would have made no difference") : a.verdict} |`), "",
    ] : ["## Forward check", "", "No actuals after the as-of date yet. Run with `--actuals-through yyyy-mm-dd` once they arrive.", ""]),
    `## Auto-approval: earned by ${elig.length} of ${GATES.length} gates`, "",
    `A gate may be approved without review when its proposal moves less than 1% **and** the proposal beat or matched the record in at least ${Math.round(EARN.winShare * 100)}% of its last ${EARN.window} windows, never losing one by more than ${EARN.maxLossPts} points.`, "",
    "| Gate | Product | Windows | Beat or matched | Worst loss | Record WAPE | Proposal WAPE | Status |", "|---|---|---:|---:|---:|---:|---:|---|",
    ...earned.map((e) => `| ${e.gate} | ${e.product} | ${e.windows} | ${e.wins} | ${e.worst_loss_pts} pts | ${e.record_wape}% | ${e.proposal_wape}% | ${e.eligible ? "**earned**" : e.why} |`),
    "", "## Event-effect library (median effect on the day, logged events)", "",
    "| Event | Product | Events | Volume, day of | Volume, day after | Handle time, day of |", "|---|---|---:|---:|---:|---:|",
    ...effects.map((e) => `| ${e.type} | ${e.product} | ${e.events} | ${pts(e.vol_day0)}% | ${pts(e.vol_day1)}% | ${pts(e.aht_day0)}% |`),
    "", "## What the learning phase changed in the cycle", "",
    `- **Learning rate.** The everyday rate dropped to ${CFG.alpha}. At 0.04, corrections chased noise and made the estate worse than the record.`,
    `- **Shift confirmation.** A detector alarm must hold for ${CFG.confirmDays} days (mean error ≥ ${CFG.confirmZ}σ on the same side) before it counts. Across about 130 series, bare alarms were mostly noise.`,
    "- **Shrinkage.** Migration ratios are shrunk toward plan in proportion to their uncertainty, so a noisy channel does not carry its overshoot into the forecast.",
    `- **Earned learning.** Learned corrections apply only to gates that earned them (walk-forward, lookback ${EARNED.lookback} windows, margin ${EARNED.marginPts} pts) or had a confirmed shift in the last ${SHIFT_GATE.days} days.`,
    "", "*Synthetic data. In production the forward check runs every day as actuals arrive, and the earning table updates with it.*", "",
  ];
  return out.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
