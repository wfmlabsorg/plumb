# Prepare Slides Workflow

## Purpose
Convert report sections into slide concepts for consultant deck development.

## Inputs

- Completed report draft
- Visual suggestions from report
- Executive summary
- All recommendations

## Process

### Step 1: Parse Report

Read completed report markdown and identify:
- Executive summary points
- Each assessment section with scores
- Key findings per section
- All recommendations with priorities
- Visual annotations [VISUAL: ...]

### Step 2: Plan Deck Structure

Standard Maturity Assessment Deck:

| Slide # | Type | Content |
|---------|------|---------|
| 1 | Title | Client name, report title, date |
| 2 | Agenda | Deck overview |
| 3-4 | Exec Summary | Score, strengths, gaps, recommendations |
| 5 | Methodology | Framework explanation |
| 6-N | Assessments | 2-3 slides per area |
| N+1 | Rec Overview | All recommendations with priority |
| N+2+ | Rec Details | 1 slide per major recommendation |
| Last-2 | Roadmap | Implementation timeline |
| Last-1 | Next Steps | Immediate actions |
| Last | Discussion | Q&A slide |

### Step 3: Generate Slide Concepts

For each slide, apply SlideConceptTemplate:

```markdown
## Slide [#]: [Title]

**Type:** [Title / Section / Content / Data / Summary]
**Source:** [Report section]

### Key Message
[One sentence takeaway]

### Headline
[Complete thought, not label]

### Content Elements
- Body points (3-5 max)
- Supporting data
- Source citation

### Visual Suggestion
[VISUAL: Description]
- Type: [Chart type]
- Data source: [Where from]
- Callout: [What to highlight]

### Speaker Notes
[What to say]

### Design Notes
[Layout preferences]
```

### Step 4: Extract Visual Requirements

For each [VISUAL] annotation from report:

| Slide | Visual Type | Data Source | Key Message |
|-------|-------------|-------------|-------------|
| 3 | Score gauge | Scorecard | Overall 2.4/5.0 |
| 4 | Radar chart | All section scores | Balance across areas |
| 7 | Gap bar chart | Capacity section | Current vs target |
| ... | ... | ... | ... |

### Step 5: Write Speaker Notes

For each slide concept:

```markdown
### Speaker Notes

**Opening:** "[First thing to say when slide appears]"

**Key Points:**
- [Point 1 - expand beyond slide content]
- [Point 2 - add context or story]
- [Point 3 - connect to client situation]

**Transition:** "[How to move to next slide]"

**Q&A Prep:**
- Q: [Anticipated question]
  A: [Response]
```

## Output Files

### slide-concepts.md

Full slide-by-slide breakdown of the deck:

```markdown
# [Client] Maturity Assessment Deck
## Slide Concepts

**Total Slides:** [X]
**Estimated Presentation Time:** [X minutes]

---

## Slide 1: Title
[Concept details]

## Slide 2: Agenda
[Concept details]

...
```

### visual-requirements.md

Detailed specs for each visual:

```markdown
# Visual Requirements

## Visuals to Create

### 1. Overall Score Gauge
- **Location:** Slide 3
- **Type:** Gauge/dial chart
- **Data:** 2.4 / 5.0
- **Design:** Show threshold zones (red/yellow/green)

### 2. Assessment Radar Chart
- **Location:** Slide 4
- **Type:** Radar/spider chart
- **Data:** [Area scores from scorecard]
- **Design:** Highlight highest and lowest

...
```

### speaker-notes.md

Consolidated presentation notes:

```markdown
# Speaker Notes: [Client] Presentation

## Slide 1: Title
[Notes]

## Slide 2: Agenda
[Notes]

...

## Appendix: Q&A Preparation
[Common questions and responses]
```

## Slide Count Guidelines

| Report Length | Recommended Slides | Presentation Time |
|---------------|-------------------|-------------------|
| Short (10-15 pages) | 15-20 slides | 30-45 min |
| Medium (20-30 pages) | 25-35 slides | 45-60 min |
| Long (30+ pages) | 35-45 slides | 60-90 min |

## Quality Checklist

- [ ] Every major report section represented
- [ ] Visual suggestions are specific and actionable
- [ ] Speaker notes provide value beyond slide content
- [ ] Deck tells a coherent story
- [ ] Recommendations clearly prioritized
- [ ] Next steps are specific
- [ ] Q&A preparation included
