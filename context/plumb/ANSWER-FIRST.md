# Standard — Answer-First Outputs

Every PLUMB report opens with the answer. The evidence follows. This is the one output convention
carried over from HORIZON, and it is carried because it is the only one that changed how the
material was read.

## The Shape

```
1. Title sentence     the answer, with its grade
2. What changed       since the last report
3. Where we stand     forecast · staffing · the range
4. Decision requested  one, named, with a date
5. What would change the answer
6. Limitations
```

## 1. The Title Sentence

One sentence. The answer. With a grade. Under 30 words.

> **Voice is 42 FTE short of plan in week 3 [C], and coverage across the horizon is 45% [E].**

Not "Weekly Staffing Status Report". Not "Analysis of Capacity Position". If a reader stops after
the first line, they should have the finding.

Rule names, thresholds, method notes and slugs stay out of the title and go in the tables below.

## 2. What Changed

Against the previous report. If nothing material changed, say that — "no material change since
14 Sep" is a useful sentence, and a report that finds drama every week trains people to ignore it.

## 3. Where We Stand

Three things, in this order:

- **Forecast** — actual against forecast, and the calibrated error. Is the forecast running hot?
- **Staffing** — required productive hours against delivered, gap in hours and FTE.
- **The range** — P10/P50/P90 and the coverage probability. **Never the point estimate alone.**

Where the interactive and pooled coverage differ materially, say so and say what it means. A 52%
interactive against 10% pooled means the exposure is deferrable backlog, not queue failure, and
those have completely different remedies.

## 4. Decision Requested

**One** decision. Named person. Date. What happens if no decision is made.

If there is no decision to request, the report is an update, and it should say so rather than
manufacture an ask. Reports that always ask for something get read as noise.

## 5. What Would Change the Answer

The test, data or measurement that would move the conclusion. A finding with no disconfirming
condition is an assertion.

## 6. Limitations

Every report, every time, in the reader's words:

- Which parameters are still `prior_only` and what that does to the band
- Whether occupancy is a fixed value or the Erlang curve
- That the band is weekly while the plan is daily
- Any `[A]` number doing real work

A model whose limitations are documented survives its first serious challenge. One whose
limitations are discovered by the audience does not.

## Word Discipline

| Field | Cap |
|---|---|
| Title sentence | 30 words, hard |
| Decision requested | 8 words |
| "What changed" bullets | 25 words each |

These caps were measured to hold across 357 rows on the predecessor system. They are achievable,
and the discipline is what makes the report skimmable in two minutes.

## Grades

Every number, everywhere in the report. See `GRADES.md`. **An ungraded number in a report is a
defect**, not a style preference.
