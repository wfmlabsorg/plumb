# PLUMB Learnings

*Accumulated insights from consulting engagements. Updated after each engagement closeout.*

---

## Initial Seed

### WFM Maturity Assessments
**Source:** Framework development
**Learning:** WFM maturity assessments benefit from combining quantitative scorecards with qualitative interview synthesis. Numbers tell you what's happening; interviews tell you why.

### Simpson's Paradox in Operational Data
**Source:** Analytical framework development
**Learning:** Always check within-team vs. between-team correlations before claiming effects. Aggregate contact center data regularly masks site-level dynamics — a positive correlation at the aggregate level can reverse at the site level when confounders (staffing, tenure, technology) are controlled.

### Observer Timing in Agent Pipelines
**Source:** Pipeline simulation
**Learning:** Background observer agents must not read pipeline state before analytical agents finish writing to it. Enforce dependency ordering at dispatch time or poll for completion before assessment.

---

*Add new learnings after each engagement using the format: Source, Learning, Application context.*
