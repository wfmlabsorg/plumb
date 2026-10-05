# PLUMB daily cycle

**See it run:** `bun run cycle:demo` (about 3 min) writes `cycle/out/demo/index.html`. It covers two simulated days, nine weeks apart, through the inside-the-walls path. **Run it on real files:** open `cycle/runner/dist/plumb-runner.html`.

**Read the method.** The WFM Labs wiki explains what this code does and why, in the series *Agentic WFM Protocol*:
- [Agentic WFM Protocol](https://wiki.wfmlabs.org/wiki/Agentic_WFM_Protocol) — the hub: thirteen steps, ten principles, the two-zone rule, the daily cycle
- [Forecast Value Added in Workforce Management](https://wiki.wfmlabs.org/wiki/Forecast_Value_Added_in_Workforce_Management) — the learning phase: scoring each layer, earned learning, earned auto-approval
- [Human Gates and Number Grades](https://wiki.wfmlabs.org/wiki/Human_Gates_and_Number_Grades) — the owner review, guarded publish, and the [source grades on intake signals](https://wiki.wfmlabs.org/wiki/Human_Gates_and_Number_Grades#Source_grades_on_intake_signals)
- [The Short-Term Forecasting Loop with an Agent Team](https://wiki.wfmlabs.org/wiki/The_Short-Term_Forecasting_Loop_with_an_Agent_Team) — the daily clock this cycle implements
- [The Shape File Bridge](https://wiki.wfmlabs.org/wiki/The_Shape_File_Bridge) — contracts and one-file tools that run where the data lives
- [Work Intake for Planning and Analytics Teams](https://wiki.wfmlabs.org/wiki/Work_Intake_for_Planning_and_Analytics_Teams) — where the asks and signals come from

The live end-to-end demo, with an animated flow and the daily brief: https://agentic-demo.wfmlabs.com

PLUMB as an operating process: a daily loop that reads yesterday, learns what was real, adjusts the
forward outlook, and gets the gate owner's signature before anything is published. **Synthetic,
code-named data only.**

| Stage | Status |
|---|---|
| 0 · Gate registry | ✅ `src/registry.ts`: product → segment → gate. 60 gates in 36 segments across products A, C, D and E; median gate 10 FTE; three shared pools of 55–90 FTE, including the 24-hour emergency service center |
| P0 · Synthetic world | ✅ `src/world.ts`: two years of daily history, a 26-week outlook of record and supply plan, planted truth kept apart |
| 1 · Prior-day performance (PDP) | ✅ `src/pdp.ts`: variances, net before and after the day, the walk, setup, outcome, logged events, contract checks |
| 2 + 4 · Events and daily reforecast | ✅ `src/reforecast.ts`, `src/reforecast-report.ts`: replay, learning from clean days only, detection of what nobody logged, migration ratio with uncertainty, proposed 26-week outlook, weekly over/under with P10–P90, review list, watchlist |
| Weekly cadence | ✅ `src/cadence.ts`: the 26-week outlook in weekly buckets by gate and product, P10–P90, gate-weeks short at P50 and P90, and what changed since last week's version and why |
| Monthly lock | ✅ `src/cadence.ts`: locks next month per gate and week (versioned, never silently overwritten); trend of three months actual and six projected; headcount runway under attrition (10% annual by default, a parameter); hiring asks with hire-by dates from recruiting plus training lead time; surplus advice (hold seasonal surplus, redeploy a migration source, let attrition absorb the rest) |
| 3 · Demo intake and signals (P4) | ✅ `src/materials.ts`, `src/signals.ts`, `src/intake-report.ts`: a synthetic intake (emails, notes, chats, a transcript), extraction into graded signals (V/E/I/U), corroboration, gating, explanations linked to the reforecast's flags, applied overlays tracked apart; the production LLM prompt is in `docs/EXTRACTION-PROMPT.md` |
| 5 · Owner review and publish (P5) | ✅ `src/review.ts`, `review/`: a review packet (every gate, biggest movers first, why it moved, 26-week chart, flags, signals, proposal fingerprint); a single-file review screen (approve, edit with a reason, reject with a reason, explicit bulk approval for unmoved gates, sign only when every gate is decided); publish refuses unsigned, incomplete or stale reviews and otherwise writes a versioned forecast of record, a WFM export, human overlays and a publish log |
| 6 · Learn (P6) | ✅ `src/learn.ts`, `src/learn-report.ts`: walk-forward backtest by layer; forward check of a frozen proposal against later actuals (each signal, counterfactual and human edit scored); auto-approval earned per gate; event-effect library. It changed the cycle: learning rate 0.01, one-week shift confirmation, migration ratios shrunk toward plan, learned corrections applied only where earned |
| 7 · Inside the walls (P7) | ✅ `src/contracts.ts` (four file contracts, validator, mapping of a WFM export with mm:ss / % / US dates), `src/pipeline.ts` (the whole cycle as one call), `runner/` (**one HTML file**: load files → check → run the cycle in a worker → reports → review → publish → downloads; nothing installed, nothing uploaded), `docs/CONTRACTS.md`, `docs/INSIDE-THE-WALLS.md` |

```
bun run cycle:world                    # build cycle/world/ (about 2 s)
bun run cycle:pdp [--date 2026-09-29]  # cycle/out/pdp-<date>.md and .csv
bun run cycle:reforecast [--weeks 26]  # cycle/out/reforecast-<as-of>.md, outlook_proposed, review, ledger (about 17 s)
bun run cycle:weekly [--weeks 26]      # cycle/out/weekly-<as-of>.md + weekly_outlook CSV (about 35 s: two replays)
bun run cycle:monthly [--month 2027-01] [--relock]  # cycle/out/monthly-<month>.md, runway, hires; locks/lock-<month>[-rN].csv
bun run cycle:intake                   # demo intake → signals → world/intake/overlays.json (read by reforecast/weekly/monthly)
bun run cycle/run.ts intake add --kind chat --role "team lead" --date 2026-10-03 --text "…"
bun run cycle/run.ts intake accept|reject SG-002-1
bun run cycle:review                   # out/review-packet-<as-of>.json + out/review-<as-of>.html (packet embedded): decide, sign, download
bun run cycle:publish --decisions decisions-<as-of>.json   # out/record/: record, wfm_export, human_overlays, publish-log
bun run cycle:learn [--actuals-through 2026-12-05]          # out/learn-<as-of>.md, earned, backtest, attribution CSVs
bun run cycle:demo                     # the whole thing end to end → cycle/out/demo/index.html
bun run cycle/runner/build.ts          # rebuild the one-file runner (cycle/runner/dist/plumb-runner.html)
bun run cycle:test
```

## The world

- **Estate.** Real estates run to about 1,500 gates averaging around 12 agents. This one keeps those proportions at prototype scale.
  - **A:** many small, customized gates.
  - **C:** a highly segmented legacy book that is migrating.
  - **D:** agency gates plus a 24-hour emergency service center (ESC).
  - **E:** online, more automated, chat-heavy, shorter handle times.
- **Outcomes are realized, not expected.** Arrivals clump hour by hour, and each call lands in or out of threshold by chance around Erlang A. Small gates overflow to backup skills. So small gates are more volatile and miss more often: voice service level averages 76% on small gates against 84% on large pools, and abandons run 4–6%.

- **Shape.** It has a business weekday pattern: Monday and Tuesday busiest, Wednesday down, Thursday and Friday up, weekends low. Seasonality peaks in October, slides through the second half of November, and troughs over the year-end.
- **Disruption.** US holidays, storms and outages are all modeled. Voice handle time runs 20–30 minutes and goes longer in a crisis.
- **Staffing.** Capacity is built for demand six weeks earlier, so peaks go in short and troughs carry overhead.
- **Outcomes.** Service level, abandons and ASA come from Erlang A per open hour.

The cycle is scored against **planted truth** it never sees:
- a real level shift on G103;
- a migration from G102 to G101, at a higher contact ratio than planned;
- an unlogged absence spike on the small gate G106;
- a hurricane run;
- outages;
- unlogged storms and absence spikes;
- a rumor that never happens.

## The PDP walk (an identity)

```
net before = scheduled open − forecast required      how the day was set up
net after  = actual staff  − actual required          how it actually ran
net after − net before = (actual − scheduled) − (actual required − forecast required)
                       =  supply delivery     −  demand surprise
```

## The daily reforecast: how it decides what to learn

| Situation | What the cycle does | Scored against the planted truth |
|---|---|---|
| A logged storm, outage or holiday | Explains the day (and the day after); learns nothing from it | The hurricane moves the ESC correction by less than 1% |
| A spike across many gates that nothing logged explains | Flags a suspected disruption; learns nothing | All 5 unlogged storms are flagged on day one; zero false estate flags |
| A one-series outlier | Flags an anomaly; learns nothing | — |
| A staffing shortfall | Flags suspected absence; never touches demand | The small-gate spike is caught; 95% of flags are real |
| A sustained run of misses | The CUSUM shift detector speeds learning | The G103 client gain is learned within about six weeks |
| A migration | Freezes the receiving gate's level and estimates one pooled contact ratio with its uncertainty; applies it only when clearly above plan, then carries it to the next wave | Voice is 1.32 ± 0.27 against a true 1.25 and is applied; chat is too small to measure and stays at plan |

## Signals: what reaches the forecast

| Grade | Means | Reaches the forecast when |
|---|---|---|
| V | plan, calendar, system of record | always |
| E | a named owner with specifics | the owner confirms, or an independent second source says the same |
| I | hedged or unconfirmed | a reviewer accepts it |
| U | rumor or unattributed | never: kept on file with what would make it actionable |

Nothing applies without a stated size. A rejected claim takes its corroborating twins with it.
Explanations attach to the days the reforecast flagged; they never rewrite history.

## What the learning phase found (and changed)

| Finding | Change |
|---|---|
| Learned corrections applied everywhere made the estate *worse* than the record (10.57% vs 10.46% WAPE): most gates have nothing real to learn | Learn only where earned: walk-forward per gate, or after a confirmed shift in the last 70 days. The estate is now at 10.45% |
| A bare CUSUM across about 130 series fired about 145 times a year, almost all noise | An alarm must hold for a week (mean error ≥ 0.8σ on the same side) to count |
| A noisy migration channel overshot (1.73 against a true 1.25) | Applied ratios are shrunk toward plan by their uncertainty |
| Signals carry the big gains (Columbus +52 pts on its day, onboarding +4 pts); the rumor would have cost 9 pts; both test reviewer actions hurt | Every signal, counterfactual and human edit is scored as actuals arrive; auto-approval is earned per gate |

Time-consistent world: each gate, channel and purpose draws from its own random stream, so running the world
on past the as-of date (`buildWorld({ end })`) never changes history. That is how the forward check gets its actuals.
