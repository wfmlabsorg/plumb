# PLUMB Strategies

## Engagement Approach Patterns

### 1. Start with SOW Parsing and Stakeholder Mapping
Every engagement begins by understanding scope, constraints, and who cares about what. Parse the SOW, identify stakeholders, and map their interests before touching data.

### 2. Build Hypothesis DAG Before Running Analysis
Create a directed acyclic graph (DAG) of hypothesized causal relationships before running statistical tests. This prevents fishing expeditions and anchors analysis in domain theory.

### 3. Statistical First, Then Causal Validation
Run Rung 1 (statistical analysis) across the full dataset first to identify patterns and anomalies. Only then escalate promising findings to Rung 2-3 (causal validation). This prevents wasting analytical effort on noise.

### 4. MethodologyChallenger as QA Gate
Before moving from ANALYSIS to SYNTHESIS, run the MethodologyChallenger agent as an adversarial reviewer. Challenge assumptions, check for confounders, verify statistical validity, and stress-test causal claims.

### 5. Always Identify Next SOW Opportunities
During synthesis, explicitly look for adjacent problems that emerged from the analysis. Document potential follow-on engagements with rough scope and expected value.

### 6. Template-Driven Deliverables
Use standardized templates for all deliverables to ensure consistency and completeness. Templates exist for maturity assessments, root cause analyses, business cases, transformation roadmaps, and quick wins.

### 7. DataScrub as Security Gate
Always run DataScrub before processing client data through AI agents. PII detection and redaction must happen at the pipeline boundary, not as an afterthought.

### 8. Effect Sizes Over P-Values
Statistical significance is necessary but not sufficient. Always report effect sizes and practical significance alongside p-values. A statistically significant but trivially small effect is not actionable.
