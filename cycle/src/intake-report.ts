/** intake-report.ts — the demo intake digest: what came in, what it said, what the forecast did with it. */
import type { Item } from "./materials";
import type { Overlay, Signal } from "./signals";
import type { ProposedRow } from "./reforecast";

const STATUS_ORDER = ["applied", "accepted", "corroborating", "proposed", "in-plan", "explanation", "rumor", "rejected"];
const LABEL: Record<string, string> = { applied: "Applied to the forecast", accepted: "Applied (accepted by reviewer)", corroborating: "Corroborates an applied signal", proposed: "Waiting", "in-plan": "Already in the plan of record", explanation: "Explains a past day", rumor: "Rumor: kept on file, never applied", rejected: "Rejected by reviewer" };

export function intakeMarkdown(asOf: string, items: Item[], signals: Signal[], overlays: Overlay[], rows: ProposedRow[]): string {
  const withSig = new Set(signals.map((s) => s.item));
  const effect = (o: Overlay) => { const rs = rows.filter((r) => o.gates.includes(r.gate) && (!o.channels.length || o.channels.includes(r.channel as never)) && r.date >= o.from && (!o.to || r.date <= o.to));
    const days = new Set(rs.map((r) => r.date)).size || 1; const fte = rs.reduce((s, r) => s + (r.fc_volume_proposed ? (r.signal_overlay_volume / r.fc_volume_proposed) * r.req_proposed_fte : 0), 0);
    return { days: new Set(rs.map((r) => r.date)).size, fte: Math.round((fte / days) * 10) / 10 }; };
  const out = [
    `# Demo intake · signals digest · as of ${asOf}`, "",
    `${items.length} items received · ${withSig.size} carried a signal · ${items.length - withSig.size} carried nothing · **${overlays.length} overlays applied to the forecast** · ${signals.filter((s) => s.status === "proposed").length} waiting · ${signals.filter((s) => s.status === "rumor").length} rumor kept off the forecast · ${signals.filter((s) => s.kind === "explanation" && s.explains.length).length} past flags now explained`, "",
    "## Overlays now in the forecast", "",
    ...(overlays.length ? ["| From | To | Gates | Channels | Change | Effect | Because of |", "|---|---|---|---|---:|---:|---|", ...overlays.map((o) => { const e = effect(o); return `| ${o.from} | ${o.to ?? "open"} | ${o.gates.length > 4 ? `${o.gates.length} gates` : o.gates.join(", ")} | ${o.channels.join(", ") || "all"} | ${o.factor > 1 ? "+" : ""}${Math.round((o.factor - 1) * 100)}% | ${e.fte >= 0 ? "+" : ""}${e.fte} FTE/day over ${e.days} ${e.days === 1 ? "day" : "days"} | ${o.signals.join(" + ")} |`; })] : ["None."]),
    "", "## Every signal", "",
    "| Signal | Received | From | Grade | Says | Status | Needs |", "|---|---|---|---|---|---|---|",
    ...signals.slice().sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.id.localeCompare(b.id)).map((s) =>
      `| ${s.id} | ${s.received} | ${s.author_role} (${s.source_kind}) | ${s.grade} | ${s.type}: ${s.gates.length ? (s.gates.length > 4 ? `${s.gates.length} gates` : s.gates.join(", ")) : "—"}${s.channels.length ? ` ${s.channels.join("/")}` : ""} ${s.type === "migration" ? (s.pct !== null ? `${s.pct}% moved` : "") : `${s.direction ? (s.direction === "up" ? "+" : "−") : ""}${s.pct ?? ""}${s.pct !== null ? "%" : ""}`} from ${s.start}${s.end && s.end !== s.start ? ` to ${s.end}` : ""} | ${LABEL[s.status]}${s.corroborates ? ` ${s.corroborates}` : ""}${s.explains.length ? `: ${s.explains.join("; ")}` : ""} | ${s.needs || "—"} |`),
    "", "## Items that carried nothing", "", ...items.filter((i) => !withSig.has(i.id)).map((i) => `- ${i.id} · ${i.received} · ${i.author_role}: “${i.subject || i.text.slice(0, 60)}”`),
    "", "## The rules", "",
    "- **Grades.** V means plan, calendar or system of record. E means a named owner with specifics. I means hedged or unconfirmed. U means rumor or unattributed.",
    "- **What reaches the forecast.** V applies. E applies only when its owner confirms or an independent second source says the same thing. I and U never apply on their own, and nothing applies without a stated size.",
    "- **How it applies.** Every applied signal becomes a dated overlay, kept apart from the learned baseline so later accuracy work can score whether it helped.",
    "- **Explanations.** These attach to past days the reforecast flagged. They explain a flag; they never rewrite history.",
    "- **Extraction.** Here it is deterministic so the demo is free and testable. In production the same schema is filled by an LLM (`cycle/docs/EXTRACTION-PROMPT.md`), and everything after extraction stays the same. Synthetic data.", "",
  ];
  return out.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
