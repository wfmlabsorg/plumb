# Standard — The Mapping Convention

A mapping file translates one planner document shape into the canonical schema. Written once per
source, reviewed by a human, reused forever.

**The mapping file is the memory of how that source is shaped.** It is the artifact that makes
"drop any planner document in" work without guessing.

## Formats

`.csv` and `.xlsx` (or `.xlsm`). The reader dispatches on the extension and everything downstream
sees the same grid, so a mapping differs between the two only by `sheet:`.

A spreadsheet does two things a CSV cannot, both handled for you:

- **Date cells** arrive as real dates, not text. Excel stores them without a timezone, so the ISO
  date is read from the UTC parts — taking it from local time shifts every date by a day west of
  Greenwich.
- **Formula cells** arrive with their cached result, which is what the person who sent you the file
  was looking at.

Anything else — `.pdf`, `.docx`, a Google Sheet — has to be exported first. PLUMB will say so
rather than guess.

## Location

`books/<client>/mappings/<source>.yaml`

One file per *document shape*, not per document. A daily planner that arrives every morning in the
same layout needs one mapping, not one a day.

## Shape

```yaml
source: halcyon-daily-planner       # the id used on the command line
sheet: "MTD Summary"                # omit for CSV
header_row: 3                       # 1-indexed; where the column names actually are
date_column: "Date"

constant:                           # values the document implies but does not state
  segment: north
  channel: voice

columns:                            # canonical_name: source column
  transactions:      "Bookings"
  contacts_offered:  "Offered"
  contacts_handled:  "Answered"
  aht_seconds:       {from: "AHT (min)", transform: "minutes_to_seconds"}
  productive_hours:  "Prod Hrs"

unmapped_ok:                        # source columns deliberately ignored
  - "Notes"
  - "Owner"
  - "RAG"
```

## Transforms

| Transform | Does |
|---|---|
| `minutes_to_seconds` | × 60 |
| `hours_to_seconds` | × 3600 |
| `percent_to_fraction` | ÷ 100 when the value exceeds 1 |
| `strip_commas` | "1,240" → 1240 |
| `blank_as_zero` | empty → 0 — **use sparingly**, see below |
| `percent_of` | a percentage against another column: `{from: "Shrink %", transform: percent_of, of: "Sched Hrs"}` |
| `lookup` | a source label → a canonical value, via a `values:` map |

`blank_as_zero` asserts that a blank genuinely means zero rather than missing. On volume it is
usually right; on shrinkage or AHT it is almost always wrong and will silently understate the
requirement.

### `lookup`

Canonical enums are matched **exactly**, and real exports use human labels. Without a lookup,
`"Offer Accepted"` silently drops out of every rate that depends on it — the ingest passes, the
row is counted nowhere, and the fill rate is quietly wrong.

```yaml
event:
  from: "Milestone"
  transform: lookup
  values:
    "Req Opened":     req_opened
    "Offer Accepted": offer_accepted
    "Graduated":      graduated
```

**An unlisted value is an error, never a pass-through.** A new milestone appearing in next month's
extract has to be noticed, not absorbed.

## The Rules

1. **Never invent a mapping at run time.** No mapping for a document → write one and show it to a
   human before running it. Guessing at column meanings produces numbers nobody can defend six
   weeks later when someone asks where they came from.

2. **Every source column is either mapped or in `unmapped_ok`.** A column that is neither raises a
   warning into `INTAKE-GAPS.md`. This is how a new column appearing in next month's export gets
   noticed instead of ignored.

3. **`constant:` is for what the document implies.** A voice-only regional sheet does not carry a
   channel column; the mapping supplies it. Anything asserted this way is `[A]` at source — if the
   sheet is mislabeled, the mapping is wrong and nothing downstream can tell.

4. **Do not map a column to make a number appear.** If the document has no shrinkage, leave it
   unmapped and let the gap register say so. A fabricated input is worse than a missing one,
   because the gap register cannot flag what it was never told about.

5. **Mappings are committed.** They are reviewable source, not scratch.

## Writing One

1. Open the document; find the real header row.
2. List every column. Decide: canonical, constant, or `unmapped_ok`.
3. Check units — AHT in minutes and shrinkage as a percentage are the two that bite.
4. Run the ingest. Read `INTAKE-GAPS.md` before reading any model output.
5. Show the mapping and the gap register to a human together. The gaps are the interesting half.
