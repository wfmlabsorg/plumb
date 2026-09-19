# Standard — The Gap Register

`books/<client>/02-canonical/INTAKE-GAPS.md`. One row per input PLUMB needs and does not have.

The register exists because a data request that asks for everything gets ignored. Ranking gaps by
what they are worth is what turns "we need better data" into a request someone will act on.

## The Ranking Rule

> Rank by **variance contribution per unit of effort to obtain** — not by how badly the input is
> missed.

A parameter driving 40% of shortfall variance that takes a day to measure outranks one driving 5%
that takes a quarter. This is a value-of-information calculation, and it routinely inverts the
intuitive order.

## Columns

| Column | Content |
|---|---|
| **Input** | The canonical column or simulation parameter |
| **Status** | `absent` · `proxy` · `disputed definition` |
| **Current treatment** | What the model does now, and its grade |
| **Variance share** | From `mc_staffing.attribution()`, as a percentage |
| **Confirmation** | `pin_check` result, or `not confirmed` |
| **Cost to obtain** | Realistic effort, named owner if known |
| **Rank** | Integer, 1 = do this first |

## Method

1. **List every gap.** Unmapped canonical columns, unmapped source columns, `prior_only`
   parameters, disputed definitions.
2. **Run `attribution()`** to get the variance share. It is a squared-rank-correlation screen
   against shortfall — **screening only, not an effect estimate.**
3. **Confirm the top two or three with `pin_check()`**, which pins the input and re-runs. Rank
   correlation on a screen can mislead; pinning is the real test.
4. **Rank by share ÷ cost.**
5. **Only then ask anyone for data**, and ask for the top three, not the list.

## The Three Statuses

- **`absent`** — the column is not in the document. Honest, easy to fix, easy to flag.
- **`proxy`** — something is standing in for it. The most dangerous status, because output looks
  complete. Name the proxy and the direction of the bias.
- **`disputed definition`** — the number exists but two parties mean different things by it. Chat
  AHT (elapsed vs agent-work) and productive hours are the classic pair. These stay `UNCONFIRMED`
  in `MODEL-STATE.md` until confirmed **in writing**, because a verbal agreement on a metric
  definition has never once survived a quarter.

## What It Is Not

Not a backlog to clear, and not an excuse. A model with a documented gap register is more
trustworthy than one without, because it has said where it is weak. Present it **alongside** the
first model output, never as a reason to delay producing one.

## Example

```markdown
| Input | Status | Current treatment | Variance share | Confirmation | Cost | Rank |
|---|---|---|---|---|---|---|
| `concurrency_effective` | absent | planned 2.0 [A] | 31% | pin_check: 28% | 1 day, platform export | 1 |
| `shrink_unplanned_hours` | proxy | modelled at 5% of schedule [E] | 22% | pin_check: 24% | 2 days, WFM export | 2 |
| chat `aht_seconds` | disputed definition | elapsed, not agent-work [A] | 18% | not confirmed | 1 hour, needs vendor sign-off | 3 |
| `separations_voluntary` | absent | not modelled | 2% | — | 1 week, HR | 7 |
```

Row 3 costs an hour and sits third. Row 4 costs a week and drives 2% — it is on the list so nobody
asks for it twice, not because anyone should go get it.
