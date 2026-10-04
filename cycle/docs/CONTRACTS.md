# PLUMB contracts

*Generated from `cycle/src/contracts.ts` by `bun run cycle/docs/build-contracts.ts`. The validator in the runner and the CLI enforces exactly this.*

Four files feed the cycle. Dates are `yyyy-mm-dd`. Shares may be written `0.8` or `80%`. FTE are productive FTE. A WFM export with its own column names is mapped onto the `extract` contract by a mapping file (below).

## `registry`: the gates the WFM platform plans for, and how each channel is served

*Grain: one row per gate × channel.*

| Column | Required | Type | Note |
|---|---|---|---|
| `gate` | yes | text | the planning gate (CT) id |
| `name` | no | text | display name |
| `product` | yes | text | A, C, D or E (the product the gate rolls up to) |
| `segment` | yes | text | segment code |
| `region` | no | text | NA, EMEA or APAC (holidays) |
| `pooled` | no | yn | y for a shared pool |
| `open_start` | yes | int | first open hour (0–23) |
| `open_end` | yes | int | hour it closes (1–24) |
| `channel` | yes | channel | voice, chat or email |
| `target_sl` | yes | share | service-level target (0.8 or 80%) |
| `threshold_sec` | yes | int | answer threshold in seconds |
| `concurrency` | no | num | chat sessions per agent (1 otherwise) |
| `patience_sec` | no | int | mean caller patience (voice/chat) |
| `aht_basis` | no | text | worked or elapsed (declared once, here) |

## `extract`: prior-day performance: what was forecast, what happened, how it was staffed and how it performed

*Grain: one row per date × gate × channel.*

| Column | Required | Type | Note |
|---|---|---|---|
| `date` | yes | date | yyyy-mm-dd |
| `gate` | yes | text | — |
| `channel` | yes | channel | — |
| `fc_volume` | yes | int | forecast contacts |
| `act_volume` | yes | int | actual contacts offered |
| `fc_aht_sec` | yes | num | forecast handle time (s) |
| `act_aht_sec` | yes | num | actual handle time (s) |
| `fc_req_fte` | yes | num | forecast required (productive FTE) |
| `sched_open_fte` | yes | num | scheduled open (productive FTE) |
| `act_req_fte` | yes | num | actual required (from actual volume and AHT) |
| `act_fte` | yes | num | actual staff (productive FTE) |
| `offered` | yes | int | — |
| `handled` | yes | int | handled, never answered-in-threshold |
| `answered_in_sl` | yes | int | — |
| `abandoned` | yes | int | — |
| `sl` | yes | share | answered in threshold ÷ offered |
| `asa_sec` | no | num | — |
| `target_sl` | no | share | defaults to the registry |

## `events`: what operations logged: weather, outages, absence, holidays, migrations

*Grain: one row per event.*

| Column | Required | Type | Note |
|---|---|---|---|
| `id` | yes | text | — |
| `start` | yes | date | — |
| `end` | yes | date | — |
| `gates` | yes | text | * or gate ids separated by ; |
| `channels` | no | text | voice;chat;email by default |
| `type` | yes | text | weather, outage, absence, holiday, migration or other |
| `description` | no | text | — |
| `source` | no | text | — |
| `params` | no | text | migration: from=…;to=…;share=…;planned_ratio=… |

## `outlook`: the forecast of record and the supply plan, forward

*Grain: one row per date × gate × channel.*

| Column | Required | Type | Note |
|---|---|---|---|
| `as_of` | yes | date | the day the record was published |
| `date` | yes | date | — |
| `gate` | yes | text | — |
| `channel` | yes | channel | — |
| `fc_volume` | yes | int | — |
| `fc_aht_sec` | yes | num | — |
| `fc_req_fte` | no | num | recomputed if absent |
| `planned_sched_fte` | yes | num | the supply plan |

## Checks across files

- **Registry coverage.** Every extract and outlook gate × channel must be in the registry.
- **Duplicates and gaps.** No duplicate date × gate × channel, and no missing days in the extract.
- **Handled, not answered-in-threshold.** `answered_in_sl ≤ handled ≤ offered` on every row. Publishing answered-in-threshold as handled understates workload exactly when the operation is worst.
- **Record dating.** The outlook has one `as_of`, and it falls after the last extract day.

## Mapping a WFM export onto `extract`

Edit the right-hand side to your export's column names. Transforms: `mmss` (`25:30` or `1:02:03` → seconds), `pct` (`81.8%` → 0.818), `mdy` (`3/7/2026` → 2026-03-07), `lower`.

```json
{
  "contract": "extract",
  "columns": {
    "date": {
      "from": "Date",
      "transform": "mdy"
    },
    "gate": "CT",
    "channel": {
      "from": "Queue Type",
      "transform": "lower"
    },
    "fc_volume": "Fcst Contacts",
    "act_volume": "Act Contacts",
    "fc_aht_sec": {
      "from": "Fcst AHT",
      "transform": "mmss"
    },
    "act_aht_sec": {
      "from": "Act AHT",
      "transform": "mmss"
    },
    "fc_req_fte": "Fcst Req",
    "sched_open_fte": "Sched Open",
    "act_req_fte": "Act Req",
    "act_fte": "Act Open",
    "offered": "Offered",
    "handled": "Handled",
    "answered_in_sl": "Ans in SL",
    "abandoned": "Abandoned",
    "sl": {
      "from": "SL %",
      "transform": "pct"
    },
    "asa_sec": {
      "from": "ASA",
      "transform": "mmss"
    }
  }
}
```
