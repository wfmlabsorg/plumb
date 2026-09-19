---
fact: contact-rate-drift-north
grade: M
date: 2026-08-10
source: daily_demand.csv, MODEL-STATE.md posterior CR[NORTH]
applies_to: {segment: NORTH}
---
NORTH contact rate drifted from 0.42 to 0.55 (+31%) between 2026-06-29 and 2026-08-10, then held.
SOUTH did not move: it sits at 0.30 throughout.

**The composition trap:** the book-level contact rate rose only +14% over the same window, because
SOUTH is the larger and lower-contact segment. Anyone reading the whole-book number alone would
conclude the move was half what it actually was on the segment that moved.

The learned posterior `CR[NORTH]` now stands at 0.5475 with 546 observations, and `CR[SOUTH]` at
0.3015 — the control held, which is what gives confidence the updating is tracking evidence rather
than drifting on its own.
