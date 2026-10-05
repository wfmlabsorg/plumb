# Running PLUMB inside the walls

*For the work laptop. Nothing to install, nothing uploaded: the runner is one HTML file that runs in the browser.*

## The rule

**Method crosses; data stays.**
- **What crosses in.** The runner, the review screen and these instructions are built outside on synthetic, code-named data, then carried in as files.
- **What stays.** Real exports, reports, review decisions and published records stay on the work laptop or company storage.
- **What may come back out.** Only code-named shape files (for example an intake packet made with the intake-packet instructions), never raw exports.

## What you need from the WFM platform

| File | From | How often |
|---|---|---|
| `registry.csv` | built once from the gate (CT) list: product, segment, open hours, channel targets | when gates change |
| Daily performance export | the PDP report (forecast vs actual volume and AHT, required, scheduled open, actual staff, SL, ASA, abandons) by gate × channel × day | daily, for all history the first time |
| `outlook_record.csv` | the forecast of record and the supply plan, forward | when the record is republished |
| `events.csv` | incidents, weather, holidays, migration waves from operations | as they are logged |

Column definitions are in `CONTRACTS.md`.

## First time: fit the mapping to your export (about 15 minutes, with Claude Desktop)

1. Export a week of the PDP report as CSV.
2. In Claude Desktop, attach the CSV and `CONTRACTS.md`, and ask: *"Write a mapping.json in this format that maps my export's columns onto the extract contract. Use transform mmss for h:mm:ss times, pct for percentages, mdy for US dates. List any contract column my export does not have."*
3. Save the result as `mapping.json`.
4. Open `plumb-runner.html`, load the files and the mapping, and press **Check against the contracts**. Fix whatever it lists, usually a column name or a date format, until it says **Ready to run**.

## Every morning

1. Add yesterday's export to the history. Open the runner, load the files, and press **Run the cycle**. That is about a minute on two years of history.
2. Read the **prior-day performance** tab, then the **daily reforecast** tab.
3. Press **Open the review screen**:
   - Decide every gate. Bulk-approve the ones that did not move, and give a reason for every edit and every reject.
   - Sign. The decisions file downloads.
4. Load the decisions file under **Review and publish**, then download `record.csv` and the WFM export.
   - Load the WFM export into the platform. Start **read-only**: compare before you let it write.
   - It is refused if unsigned, incomplete, or if the data changed after the review.

## Weekly and monthly

- **Weekly:** the **weekly outlook refresh** tab is the 26-week view in weekly buckets, with what changed since last week and why.
- **Monthly:** the **monthly lock** tab holds next month's plan, the headcount runway under attrition, hiring asks with hire-by dates, and surplus advice.
  - Keep the downloaded lock file: it is the version of record for the month.

## Learning

Load a previously published `record.csv` and its decisions under the optional inputs. The **learning** tab then scores that record against the actuals that arrived since: each layer, each signal and each human edit. It also shows which gates have earned auto-approval.

## When something looks wrong

- **The check lists problems.** The message names the file, row and column. Fix the export or the mapping, never the numbers.
- **A gate swings and nobody knows why.** Look at its flags in the review screen. Unlogged storms and staffing shortfalls are flagged there, and are never learned from.
- **Anything you want help with outside the walls.** Make a code-named intake packet with the intake-packet instructions and send that, not the export.
