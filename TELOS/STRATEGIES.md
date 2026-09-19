# PLUMB Strategies

## Operating Patterns

### 1. Write the Mapping Before Reading the Data
When a new planner document arrives, the first artifact is a mapping file, not a number. Guessing
at column meanings at run time produces results nobody can defend six weeks later. Write the
mapping, show it to a human, then run it — and every run after that is deterministic.

### 2. Model on Sparse Data, Name the Gaps
Do not wait for a complete dataset; it never arrives. Run on what exists and record what is
missing in the gap register. Then rank the gaps by variance contribution per unit of effort to
obtain, and confirm the top few by pinning them in the simulation before asking anyone to go
collect data. Asking for everything is how a data request gets ignored.

### 3. Deterministic First, Then the Band
The deterministic plan is the thing people argue with, and it is fast. Produce it first, check it
against what the operation believes, and only then spend the draws. A band around a central case
nobody accepts is wasted computation.

### 4. Never Run ANALYZE Because Data Is Present
Variance decomposition and causal work are invoked by a question, not by a schedule. The default
path is INGEST → MODEL → REPORT. This is the single biggest difference from HORIZON, which ran
every analytical stage every day and generated more findings than any planner could read.

### 5. Escalate the Rung Only When It Is Earned
Run Rung 1 first — variance, accuracy, SPC — across the whole series. Escalate to a DAG only for
findings that survive and matter. Most staffing anomalies have a confounder sitting in plain sight
in the event calendar, and a DAG drawn before looking there is wasted effort.

### 6. State the Weak Joint in the Report
Occupancy as a service-level proxy, the weekly band under a daily plan, the parameters that never
learn — these go in the report, in the limitations section, every time. A model whose weaknesses
are documented survives its first challenge. One whose weaknesses are discovered does not.
