# PLUMB Learned

Accumulated learnings. Seeded from the HORIZON fork and the CP-WFM-018 pack; extended by MEMORY.

## From the HORIZON fork (2026-09-19)

**Ledger machinery is not free.** HORIZON's ten versioned ledgers, four clocks and question
register produced a verified, well-graded system that was too heavy to operate. The grade rule
carried almost all of the epistemic value; the version tree carried almost none of it. PLUMB kept
the grades and dropped the ledgers.

**Every analytical stage running every day produces more findings than anyone reads.** HORIZON's
Scout proposed 39 event candidates over 119 days. A planner will not review that. Analysis has to
be pulled by a question, not pushed by a schedule.

**A demo artifact and an operational tool have different shapes.** 119 committed daily notes prove
the loop runs; they do not make the loop usable. Verification belongs in a test, not in the tree.

## From the CP-WFM-018 pack

**Shrinkage applied twice is the most common defect in this arithmetic**, and because shrink is
sampled, the error grows in exactly the draws that matter. It has a second edge: converting a gap
to FTE must divide by `hours_per_head × (1 − shrink)`, not by scheduled hours.

**Achieved occupancy is algebraically circular as a model input.** It reduces to delivered
productive hours, so the requirement could never exceed what was staffed, and a demand miss would
be undetectable. Reconstruct the requirement at *target* occupancy.

**Simulating demand and supply separately understates tail risk.** They must be drawn together so
a high-volume draw meets the supply that draw produced.

**Occupancy is not a property of an operation, it is a consequence of pooled load** — roughly 83%
at 30 erlangs and 97% at 480. Holding it fixed compresses the very spread the model exists to show.

**Learn the forecast error, not the forecast.** This is what lets a tool calibrate against a
planner document it did not produce.
