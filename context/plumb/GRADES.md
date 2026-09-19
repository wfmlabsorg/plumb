# Standard — The Grade Rule

Every number that appears in any PLUMB artifact carries a grade. No exceptions, and no ungraded
number reaches a report.

## The Four Grades

| Grade | Meaning | Requirement |
|---|---|---|
| **[M]** | **Measured** | Read from a canonical CSV. The definition it was measured under is named. |
| **[C]** | **Computed** | Derived by a stated formula from graded inputs. The formula is written out. |
| **[E]** | **Estimated** | Not measured. A range and the assumption behind it are stated. |
| **[A]** | **Asserted** | One source, unverified. **Never load-bearing alone.** |

## Inheritance

> A computed number inherits the **weakest** grade among its inputs.

`[C]` is only available when the formula is stated *and* every input is `[M]` or `[C]`. Required
hours computed from measured contacts and an asserted AHT is `[A]`, not `[C]`. This rule is what
stops a single unverified benchmark from laundering itself into a defensible-looking plan by
passing through three formulas.

## The Carry Rule

**Anything carried across a platform, channel, vendor or site change drops to `[A]`** until this
operation measures it under the new conditions.

A handle time measured on the old platform is not a measurement of the new one. A contact rate
from another book is `[A]` however confidently it was offered — and if that book had a deflection
bot and this one does not, it is not merely ungraded but wrong by construction.

Relabel the carry explicitly. Write `AHT 452s [A] — carried from Beacon, not yet measured on
Meridian`, never a bare `452s`.

## Simulation Outputs

A simulated quantile is `[C]` when every sampled parameter feeding it is `[M]` or `[C]`, and `[E]`
otherwise — which in practice means most bands are `[E]` until the model has run enough cycles to
learn its parameters.

`MODEL-STATE.md` marks unlearned parameters `prior_only`. **A band resting on a `prior_only`
parameter is `[E]` and must say which parameter and why.** Describing an uncalibrated band as
computed is the most likely way this system misleads someone.

## Writing It

The grade follows the number, in square brackets:

```
Required productive hours 8,410 [C] = contacts 61,200 [M] × AHT 452s [M] / 3600 / occ 0.83 [E]
Coverage 45% [E] — occupancy prior_only, 0 observations
Contact rate 0.35 [A] — carried from the plan of record, not measured on this platform
```

In a table, a `Grade` column. In prose, inline after the figure.

## Violations

These are defects, not style preferences:

- A number in a report with no grade
- `[M]` with no definition named
- `[C]` with no formula stated
- `[E]` with no range
- `[A]` used as the sole support for a recommendation
- A carried value still labelled `[M]`
