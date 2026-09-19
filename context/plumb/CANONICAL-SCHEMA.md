# Standard — The Canonical Schema

Three CSVs in `books/<client>/02-canonical/`. Every planner document, whatever its shape, lands
here. Everything downstream reads only these.

The schema is adopted **verbatim** from the CP-WFM-018 pack so that `Tools/engine/intake.py`
validates it without modification. Do not add, rename or reorder columns without changing the
engine — and if you are about to, read `docs/ENGINE.md` first.

## `daily_demand.csv` — one row per date × segment × channel

| Column | Type | Notes |
|---|---|---|
| `date` | ISO date | |
| `segment` | string | must match a segment key in `params.yaml` |
| `channel` | string | `voice` / `chat` / `email` |
| `transactions` | int | **segment-level, repeated across that segment's channel rows — not divided** |
| `transactions_forecast` | int | |
| `contacts_offered` | int | before abandonment |
| `contacts_handled` | int | |
| `aht_seconds` | float | handled contacts only |
| `concurrency_effective` | float | chat-session-hours ÷ agent-hours *spent handling*; always ≥ 1 |
| `items_resolved` | int | deferrable channels only |
| `productive_hours` | float | logged in and available, idle included |
| `occupancy_achieved` | float | productive-working ÷ productive-available |
| `service_level` | float | |

**Required at load:** `date, segment, channel, transactions, contacts_offered, contacts_handled,
productive_hours, aht_seconds`. Plus `concurrency_effective` if any interactive channel plans
concurrency > 1, and `items_resolved` if any deferrable channel has no planned throughput.

## `daily_supply.csv` — one row per date × site (or cohort)

`date, site, cohort_id, heads_on_roll, heads_scheduled, scheduled_hours, productive_hours,
shrink_planned_hours, shrink_unplanned_hours, weeks_since_graduation, separations,
separations_voluntary`

`cohort_id` is blank for the tenured pool. **Required at load:** `date, scheduled_hours,
productive_hours, shrink_planned_hours, shrink_unplanned_hours`.

## `pipeline_events.csv` — sparse, one row per event

`date, event, cohort_id, count, planned_count, planned_date`

`event` ∈ `req_opened | offer_accepted | class_started | graduated | withdrew`

**The denominator differs by event** and getting it wrong silently corrupts the fill rates:

| Event | `planned_count` means |
|---|---|
| `offer_accepted` | requisitions opened |
| `class_started` | seats planned |
| `graduated` | **class starts** — never seats planned |

## Sparse Is Legal

A planner document carrying only forecast volume and AHT produces rows with the rest empty. That
is a valid ingest. The Modeler runs on what is present and `INTAKE-GAPS.md` names what is not.

What is **not** legal is filling an empty column with a default and saying nothing. An assumed
shrinkage of 30% that nobody chose will be treated as measured by everyone who reads the output.

## Validation

`intake.validate()` runs before any number is computed. Hard failures halt the ingest:

- a `segment` or `channel` that resolves to no key in `params.yaml`
- `contacts_handled > contacts_offered`
- demand and supply `productive_hours` failing to reconcile within 2%
- `shrink_planned + shrink_unplanned > scheduled_hours`
- broken date contiguity
- values outside physical range (`aht_seconds` 1–36,000; `concurrency_effective` 1–20;
  `occupancy_achieved` 0.01–1.0)

Advisories do not halt: prior-band checks and consistency residuals. They land in `INTAKE-GAPS.md`.

## Units — the thing to get right

**Workload hours** are the hours of work that exist. **Productive hours** are the hours people
must be logged in and available to absorb it, idle included. Dividing by occupancy converts one to
the other.

Both demand and supply resolve to **productive hours**, which is what makes them comparable. See
`docs/ENGINE.md` and the shrink-once rule in `GRADES.md`'s companion — shrinkage is netted on the
supply side, once, never on demand.
