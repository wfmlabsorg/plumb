# Recommendation Template

## Structure

```markdown
## Recommendation [#]: [Title]

**Priority Tier:** [1/2/3] | **Effort:** [Low/Medium/High] | **Impact:** [Low/Medium/High]
**Timeline:** [X-Y months] | **Dependencies:** [None / Rec #X]

### Problem Statement

[What specific problem does this address? Reference findings from assessment sections. Be specific about the current pain points and their business impact.]

### Recommended Solution

[Clear description of what to do. Be specific and actionable. This should answer "what exactly should we implement?"]

### Implementation Approach

**Phase 1: [Phase Name] (Weeks 1-X)**
- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]

**Phase 2: [Phase Name] (Weeks X-Y)**
- [ ] [Action item 4]
- [ ] [Action item 5]
- [ ] [Action item 6]

**Phase 3: [Phase Name] (Weeks Y-Z)**
- [ ] [Action item 7]
- [ ] [Action item 8]

### Expected Benefits

**Quantitative:**
- [Specific metric improvement, e.g., "Reduce forecast error from 15% to 8%"]
- [Cost savings, e.g., "Reduce overtime spend by $X/month"]
- [Efficiency gain, e.g., "Save X hours/week in manual reconciliation"]

**Qualitative:**
- [Operational improvement]
- [Employee experience improvement]
- [Strategic capability gain]

### Dependencies

**Requires:**
- [Other recommendations that should come first]
- [Prerequisites like technology, budget, or approvals]
- [Skills or resources needed]

**Blocked by:**
- [External constraints]
- [Timing considerations]

### Success Metrics

| Metric | Current | Target | Measurement Frequency |
|--------|---------|--------|----------------------|
| [Metric 1] | [Value] | [Value] | [Weekly/Monthly] |
| [Metric 2] | [Value] | [Value] | [Weekly/Monthly] |
| [Metric 3] | [Value] | [Value] | [Weekly/Monthly] |

### Risk Considerations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | [Low/Med/High] | [Low/Med/High] | [How to address] |
| [Risk 2] | [Low/Med/High] | [Low/Med/High] | [How to address] |
```

---

## Priority Tier Definitions

| Tier | Criteria | Timeline |
|------|----------|----------|
| **Tier 1** | Critical foundation, high impact, blocks other work | Immediate start (0-3 months) |
| **Tier 2** | Important improvement, moderate dependencies | Near-term (3-6 months) |
| **Tier 3** | Enhancement, can wait for foundation | Medium-term (6-12 months) |

---

## Effort/Impact Matrix

```
                    IMPACT
                Low    Medium    High
         ┌───────┬─────────┬─────────┐
    Low  │ Tier 3│  Tier 3 │  Tier 2 │  Quick Win
  E      ├───────┼─────────┼─────────┤
  F Med  │ Tier 3│  Tier 2 │  Tier 1 │
  F      ├───────┼─────────┼─────────┤
  O High │  Skip │  Tier 2 │  Tier 1 │  Major Project
  R      └───────┴─────────┴─────────┘
  T
```

---

## Writing Guidelines

### Problem Statement
- Reference specific findings from assessment
- Include business impact (cost, time, risk)
- Be specific about who is affected
- Avoid being vague ("improve communication")

### Recommended Solution
- Be prescriptive and specific
- Describe the end state clearly
- Include enough detail to estimate effort
- Avoid technology-specific unless necessary

### Implementation Approach
- Break into manageable phases
- Include specific action items
- Assign approximate timeframes
- Identify key milestones

### Expected Benefits
- Quantify when possible
- Be realistic (don't overpromise)
- Connect to client's stated goals
- Include both hard and soft benefits

---

## Common Recommendation Categories

1. **Process** — New procedures, workflows, governance
2. **Technology** — System improvements, integrations, automation
3. **People** — Training, roles, organizational changes
4. **Data** — Analytics, reporting, visibility improvements
5. **Culture** — Mindset shifts, collaboration, communication
