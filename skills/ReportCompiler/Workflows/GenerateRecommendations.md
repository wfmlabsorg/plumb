# Generate Recommendations Workflow

## Purpose
Create actionable recommendations based on assessment findings.

## Inputs

- All assessment section findings
- Score summary
- Client context from outline
- Perspectives/angles from outline

## Process

### Step 1: Review All Findings

Compile findings across all sections:

| Section | Finding | Impact | Root Cause |
|---------|---------|--------|------------|
| Capacity | 38% invisible volume | Inaccurate forecasts | IVR misattribution |
| Process | No variance analysis | Can't learn from errors | No established practice |
| Workforce | 106% attrition | Scheduling instability | Multiple factors |
| ... | ... | ... | ... |

### Step 2: Identify Patterns

Look for:
- **Clusters** — Multiple findings with same root cause
- **Dependencies** — Findings that must be solved in sequence
- **Quick wins** — Low effort, high impact opportunities
- **Foundational gaps** — Things that block other improvements

### Step 3: Draft Recommendations

For each major finding cluster, create a recommendation:

Using Recommendation template:

```markdown
## Recommendation [#]: [Title]

**Priority Tier:** [1/2/3]
**Effort:** [Low/Medium/High]
**Impact:** [Low/Medium/High]
**Timeline:** [X-Y months]

### Problem Statement
[Reference specific findings]

### Recommended Solution
[Clear, actionable description]

### Implementation Approach
[Phased breakdown with actions]

### Expected Benefits
[Quantified where possible]

### Dependencies
[What must come first]

### Success Metrics
[How to measure progress]
```

### Step 4: Prioritize

Apply effort/impact matrix:

```
                    IMPACT
                Low    Medium    High
         ┌───────┬─────────┬─────────┐
    Low  │ Tier 3│  Tier 3 │  Tier 2 │
  E      ├───────┼─────────┼─────────┤
  F Med  │ Tier 3│  Tier 2 │  Tier 1 │
  F      ├───────┼─────────┼─────────┤
  O High │  Skip │  Tier 2 │  Tier 1 │
  R      └───────┴─────────┴─────────┘
  T
```

Assign priority tiers:
- **Tier 1:** Start immediately (0-3 months)
- **Tier 2:** Near-term (3-6 months)
- **Tier 3:** Medium-term (6-12 months)

### Step 5: Map Dependencies

Create dependency diagram:

```
[Rec 1: Variance Analysis] ─────┐
                                 ├───► [Rec 4: Forecasting Automation]
[Rec 2: IVR Attribution] ───────┘

[Rec 3: Attrition Program] ────────► [Rec 5: Schedule Optimization]
```

### Step 6: Create Implementation Roadmap

```markdown
## Implementation Roadmap

### Phase 1: Foundation (Months 1-3)
- Recommendation 1: [Title]
- Recommendation 2: [Title]

### Phase 2: Development (Months 4-6)
- Recommendation 3: [Title]
- Recommendation 4: [Title]

### Phase 3: Optimization (Months 7-12)
- Recommendation 5: [Title]

[VISUAL: Gantt chart showing overlapping timelines and dependencies]
```

## Recommendation Types

### Process Recommendations
- New procedures or workflows
- Governance changes
- Measurement frameworks

### Technology Recommendations
- System implementations
- Integration improvements
- Automation opportunities

### People Recommendations
- Training programs
- Role changes
- Organizational restructuring

### Data Recommendations
- Analytics capabilities
- Reporting improvements
- Data quality initiatives

## Writing Guidelines

### Problem Statement
- Reference specific findings (with section/page)
- Include business impact
- Be specific about scope

### Solution
- Action-oriented language
- Specific enough to estimate effort
- Avoid vague prescriptions

### Implementation
- Realistic timelines
- Manageable phases
- Clear action items

### Benefits
- Quantify when possible
- Realistic expectations
- Both hard and soft benefits

## Quality Checklist

- [ ] Each recommendation traces to specific findings
- [ ] Priority tiers assigned and justified
- [ ] Dependencies mapped
- [ ] Implementation phases realistic
- [ ] Success metrics measurable
- [ ] No orphan findings (every major finding addressed)
- [ ] Recommendations don't contradict each other
