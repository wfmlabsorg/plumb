# Standard — Human Checkpoints

PLUMB proposes. A person decides. This standard says where the person sits and what they are
shown.

HORIZON had a gate before every write and it made the system slow to operate without making it
more correct. PLUMB has **two** checkpoints and no gate machinery — a checkpoint is a prompt and
a clear presentation, not a state machine.

## Checkpoint 1 — A New Mapping

**Trigger:** a planner document arrives with no mapping file.

**Show them, together:**
1. The proposed mapping file, in full
2. Every source column, marked mapped / constant / ignored
3. The units you inferred, called out explicitly — AHT in minutes and shrinkage as a percentage
   are the two that bite
4. What `constant:` asserts, because nothing downstream can detect a mislabeled sheet

**Ask:** "Is this what these columns mean?"

This is the highest-value checkpoint in the system. Everything downstream inherits from it, and a
mapping error is invisible in the output — the numbers look fine and are wrong.

## Checkpoint 2 — Before a Report Publishes

**Trigger:** REPORT phase, before anything leaves `05-reports/`.

**Show them:**
1. The title sentence — the answer, graded
2. The gap register, ranked
3. Any `[A]` number doing load-bearing work
4. Which parameters are `prior_only`, and therefore what the band is really worth
5. The decision being requested, and of whom

**Ask:** "Does this go out?"

## Not Checkpoints

Do not stop for these. Stopping for everything is how a gate becomes a rubber stamp:

- Running the deterministic model
- Running the simulation
- Re-running an existing mapping on a new file of the same shape
- Updating `MODEL-STATE.md` from actuals
- Writing to the gap register

## The Rule

> Propose; never approve on their behalf.

Present the proposal and the question. Do not present three options and ask which one they like —
make the call, show the reasoning, and let them overrule it. A checkpoint is where a person can
say no cheaply, not where the system offloads a judgment it should have made.

## When a Checkpoint Is Skipped

If a run proceeds without a checkpoint that was due — an automated cycle, an explicit instruction
to proceed — the output says so, at the top:

> *Published without review. Mapping `halcyon-daily-planner` v2 was not confirmed by a human.*
