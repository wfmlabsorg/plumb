/** Writes CONTRACTS.md from the same spec the validator enforces, so the document cannot drift from the code. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTRACTS, IEX_PDP_MAPPING } from "../src/contracts";
const out = ["# PLUMB contracts", "", "*Generated from `cycle/src/contracts.ts` by `bun run cycle/docs/build-contracts.ts`. The validator in the runner and the CLI enforces exactly this.*", "",
  "Four files feed the cycle. Dates are `yyyy-mm-dd`. Shares may be written `0.8` or `80%`. FTE are productive FTE. A WFM export with its own column names is mapped onto the `extract` contract by a mapping file (below).", ""];
for (const [k, c] of Object.entries(CONTRACTS)) {
  out.push(`## \`${k}\`: ${c.purpose}`, "", `*Grain: ${c.grain}.*`, "", "| Column | Required | Type | Note |", "|---|---|---|---|", ...c.cols.map((x) => `| \`${x.name}\` | ${x.required ? "yes" : "no"} | ${x.type} | ${x.note || "—"} |`), "");
}
out.push("## Checks across files", "",
  "- **Registry coverage.** Every extract and outlook gate × channel must be in the registry.",
  "- **Duplicates and gaps.** No duplicate date × gate × channel, and no missing days in the extract.",
  "- **Handled, not answered-in-threshold.** `answered_in_sl ≤ handled ≤ offered` on every row. Publishing answered-in-threshold as handled understates workload exactly when the operation is worst.",
  "- **Record dating.** The outlook has one `as_of`, and it falls after the last extract day.", "",
  "## Mapping a WFM export onto `extract`", "", "Edit the right-hand side to your export's column names. Transforms: `mmss` (`25:30` or `1:02:03` → seconds), `pct` (`81.8%` → 0.818), `mdy` (`3/7/2026` → 2026-03-07), `lower`.", "",
  "```json", JSON.stringify(IEX_PDP_MAPPING, null, 2), "```", "");
writeFileSync(join(import.meta.dir, "CONTRACTS.md"), out.join("\n")); console.log("wrote cycle/docs/CONTRACTS.md");
