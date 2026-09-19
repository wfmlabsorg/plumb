---
name: MeasureAnything
description: Apply calibrated estimation and measurement techniques. USE WHEN user asks how to measure something, needs confidence intervals, wants to quantify intangibles, calculate value of information, run calibration training, or determine if measurement is worth it. Based on Douglas Hubbard's Applied Information Economics methodology.
---

# MeasureAnything

Transform "immeasurable" things into quantified estimates using calibrated judgment and statistical reasoning.

> **Source:** How to Measure Anything by Douglas W. Hubbard
> **Location:** ~/plumb/skills/MeasureAnything/context/

---

## Core Philosophy

**Measurement = a quantitatively expressed reduction of uncertainty based on one or more observations.**

If you care about something enough to make a decision about it, you can measure it. The key is:
1. Define what you mean (clarify the concept)
2. Determine why you care (identify the decision)
3. Start with what you know (calibrated estimates)
4. Reduce uncertainty iteratively (observations)

---

## Workflow Routing

| User Intent | Workflow |
|-------------|----------|
| Generate a calibrated estimate | Workflows/CalibratedEstimate.md |
| Break down an intangible into measurables | Workflows/MeasurementDecomposition.md |
| Calculate if measurement is worth it | Workflows/ValueOfInformation.md |
| Run calibration training exercises | Workflows/CalibrationTraining.md |
| Create full measurement plan (AIE) | Workflows/MeasurementPlan.md |

---

## Quick Commands

```
measure estimate [topic]       → Generate 90% CI for a quantity
measure decompose [intangible] → Break into observable components
measure voi [decision]         → Calculate value of information
measure calibrate              → Run calibration training
measure plan [problem]         → Full AIE methodology
```

---

## Key Frameworks

### Rule of Five
Sample 5 random items → 93.75% chance the median is between the highest and lowest values.

### Four Assumptions
1. Your problem is not as unique as you think
2. You have more data than you think
3. You need less data than you think
4. New observations are more accessible than you think

### Expected Value of Information
- **EOL** = Chance of being wrong × Cost of being wrong
- **EVPI** = EOL before measurement (value of perfect info)
- **EVI** = EOL before - EOL after (value of actual info)

---

## Examples

**Example 1: Estimate an intangible**
```
User: "How do I measure employee morale?"
→ Invokes MeasurementDecomposition workflow
→ Breaks "morale" into observables: turnover intent, discretionary effort, sick days
→ Creates calibrated estimates for each component
```

**Example 2: Should I measure this?**
```
User: "Is it worth surveying customers about the new feature?"
→ Invokes ValueOfInformation workflow
→ Calculates EVPI based on decision stakes
→ Compares to survey cost
→ Returns recommendation with math
```

**Example 3: Quick estimate**
```
User: "measure estimate time employees spend in meetings"
→ Invokes CalibratedEstimate workflow
→ Walks through 90% CI process
→ Returns calibrated range with confidence
```
