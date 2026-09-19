# MEMORY System
## PLUMB's Persistent Learning Architecture

*Three-tier system for capturing, synthesizing, and applying engagement learnings.*

---

## Architecture

```
MEMORY/
├── Work/           # CAPTURE (Hot) - Active engagement tracking
├── Learning/       # SYNTHESIS (Warm) - Phase-based learnings
├── State/          # Operational metrics
└── Signals/        # Pattern detection
```

---

## The Three Tiers

### CAPTURE (Hot) — `Work/`

Active work directories for ongoing engagements. Each engagement gets its own folder.

**Structure:**
```
Work/
├── [engagement-name]/
│   ├── context.md      # Engagement context and goals
│   ├── progress.md     # Execution log
│   ├── decisions.md    # Decisions made with rationale
│   └── artifacts/      # Generated intermediate files
```

**Lifecycle:**
1. Engagement starts → Create directory
2. During work → Log progress, decisions, artifacts
3. Engagement ends → Extract learnings → Archive

---

### SYNTHESIS (Warm) — `Learning/`

Curated learnings organized by Algorithm phase. Raw experience transformed into actionable insights.

**Structure:**
```
Learning/
├── OBSERVE/    # Learnings about gathering context
├── THINK/      # Learnings about generating hypotheses
├── PLAN/       # Learnings about selecting approaches
├── BUILD/      # Learnings about defining success criteria
├── EXECUTE/    # Learnings about implementation
├── VERIFY/     # Learnings about validation
├── LEARN/      # Learnings about extracting insights
└── ALGORITHM/  # Meta-learnings about the process itself
```

**Each learning file contains:**
- What happened
- What was learned
- How to apply it
- When it applies

---

## Supporting Systems

### State/ — Operational Metrics
- `stats.json` — Session and engagement counts

### Signals/ — Pattern Detection
- `failures.jsonl` — Things that didn't work
- `loopbacks.jsonl` — Repeated mistakes
- `patterns.jsonl` — Detected analytical patterns
- `ratings.jsonl` — Engagement quality ratings

---

## Usage Patterns

### Starting New Engagement
```
1. Create Work/[engagement-name]/
2. Write context.md with SOW summary and goals
3. Log progress as analysis proceeds
4. Record all decisions with rationale
```

### Completing Engagement
```
1. Review what happened across all phases
2. Extract learnings (minimum 3 per engagement)
3. Categorize by Algorithm phase
4. Write to Learning/[PHASE]/
5. Update stats.json
6. Delete Work/[engagement-name]/
```

### Before Starting Similar Engagement
```
1. Check Learning/ for relevant insights
2. Check Signals/failures.jsonl for patterns to avoid
3. Apply learnings to new engagement
```

---

*The goal: Every engagement makes the next one better.*
