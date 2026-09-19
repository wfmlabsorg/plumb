# ApproachChallenge Workflow

Challenge whether the right methodology was chosen for the question.

---

## Purpose

Before examining execution details, challenge whether the chosen methodology was appropriate for the question being answered. Steel-man alternative approaches and make the analyst defend their choice.

---

## Input
- The question being answered
- The methodology/skills used
- Optional: Constraints (data availability, time, expertise)

## Output
- Question type classification
- Methodology match assessment
- Steel-manned alternatives
- Justification requirements

---

## Procedure

### Step 1: Classify the Question

**Determine the fundamental question type:**

#### Descriptive Questions
"What is X?" / "What happened?"
- Summarizing data
- Describing patterns
- Documenting current state

**Appropriate methodologies:**
- DataAnalysis (ETL, summary statistics)
- Research (literature review, source synthesis)
- Basic visualization

#### Predictive Questions
"What will X be?" / "What will happen?"
- Forecasting future values
- Predicting outcomes
- Classification/regression

**Appropriate methodologies:**
- Time series analysis
- Machine learning models
- Statistical forecasting
- MeasureAnything (calibrated estimates)

#### Causal Questions
"Does X cause Y?" / "What would happen if we did X?"
- Effect estimation
- Policy evaluation
- Attribution

**Appropriate methodologies:**
- CausalInference (with BookOfWhy framework)
- Experimental design
- Quasi-experimental methods
- Counterfactual analysis

**Classify the current analysis:**
```
Question: [Exact question being answered]

Type: [Descriptive / Predictive / Causal / Mixed]

Justification: [Why this classification]

Warning Signs of Misclassification:
- [ ] Uses causal language but only has correlational evidence
- [ ] Makes predictions without predictive validation
- [ ] Describes data but draws causal conclusions
```

### Step 2: Assess Methodology Match

**Compare question type to methodology used:**

```
Question Type: [Type]
Methodology Used: [Skills/methods]

Match Assessment: [Strong Match / Acceptable / Weak Match / Mismatch]

Explanation:
[Why the methodology does or doesn't fit the question]
```

#### Common Mismatches to Flag

| Question Type | Methodology | Problem |
|---------------|-------------|---------|
| Causal | Correlation analysis | Can't establish causation from association |
| Causal | Regression without DAG | Omitted variable bias, wrong controls |
| Predictive | Explanatory model | Optimized for fit, not prediction |
| Descriptive | Complex modeling | Over-engineering for summary task |
| Predictive | Historical average | Ignores trends, seasonality |

### Step 3: Steel-Man Alternatives

**For each major methodology choice, argue FOR the best alternative:**

**Alternative Methodology Assessment:**

```
Current Choice: [Methodology A]
Best Alternative: [Methodology B]

Steel-Man Case for Alternative:

1. **What it would do better:**
   [Specific advantages of alternative]

2. **When it's more appropriate:**
   [Conditions favoring alternative]

3. **What risks it avoids:**
   [Problems with current approach that alternative doesn't have]

4. **Why a skeptical reviewer might prefer it:**
   [Perspective of critical expert]

---

Counter-argument (why current choice might still be right):
[Defense of current approach]

Verdict: [Alternative is clearly better / Alternative has merit / Current choice is defensible]
```

### Step 4: Challenge Specific Methodology Choices

#### If Causal Analysis Was Used

**Challenge the causal framing:**
- Is the causal question well-posed?
- Is there a plausible mechanism?
- Is the treatment/intervention clearly defined?
- Is the counterfactual well-defined?

**Alternative: Could this be answered with:**
- A descriptive analysis? (Just report what happened)
- A predictive model? (Forecast without causal claims)
- A qualitative assessment? (Expert judgment)

#### If Statistical Modeling Was Used

**Challenge the model choice:**
- Why this model vs. alternatives?
- Were simpler models tried first?
- Is the model complexity justified?
- Are model assumptions met?

**Alternative: Could this be answered with:**
- Simple summary statistics?
- A non-parametric approach?
- A different model family?

#### If Research/Synthesis Was Used

**Challenge the scope:**
- Is the source selection systematic?
- Are all relevant perspectives included?
- Is the synthesis method appropriate?

**Alternative: Could this be answered with:**
- A narrower, deeper dive?
- A broader, shallower survey?
- Primary data collection?

### Step 5: Examine Constraints

**Consider legitimate constraints that influenced methodology choice:**

```
Constraint Assessment:

Data Constraints:
- Available data: [Description]
- Missing data: [What's not available]
- Impact on methodology: [How it limited choices]

Time Constraints:
- Available time: [Duration]
- Impact on methodology: [What couldn't be done]

Expertise Constraints:
- Available expertise: [Skills]
- Impact on methodology: [What wasn't feasible]

Resource Constraints:
- Budget/tools: [Limitations]
- Impact on methodology: [What wasn't possible]

Given these constraints, was the methodology choice reasonable?
[Assessment]
```

### Step 6: Generate Justification Requirements

**List questions the analyst must answer to defend their approach:**

```
Methodology Justification Questions:

1. Why was [Methodology A] chosen over [Alternative B]?
   - Required answer depth: [Brief/Detailed]
   - Acceptable responses: [What would satisfy]

2. How does the question type ([Type]) match the methodology?
   - Required answer depth: [Brief/Detailed]
   - Acceptable responses: [What would satisfy]

3. What would change if [Alternative] had been used?
   - Required answer depth: [Brief/Detailed]
   - Acceptable responses: [What would satisfy]

4. What limitations does this methodology introduce?
   - Required answer depth: [Brief/Detailed]
   - Acceptable responses: [What would satisfy]
```

---

## Output Template

```markdown
## Approach Challenge Report

### Question Under Analysis
**Exact question:** [Question]
**Question type:** [Descriptive/Predictive/Causal]

### Methodology Used
- **Primary approach:** [Description]
- **Skills invoked:** [List]
- **Key methods:** [List]

### Question-Methodology Match

**Assessment:** [Strong Match / Acceptable / Weak Match / Mismatch]

**Explanation:**
[Why the methodology does or doesn't fit]

**Warning signs identified:**
- [Sign 1]
- [Sign 2]

### Steel-Manned Alternatives

#### Alternative 1: [Name]
**Argument FOR this alternative:**
[Strong case for why it might be better]

**Why analyst should consider it:**
[Specific benefits]

**Counter-argument:**
[Defense of current choice]

**Verdict:** [Better / Has merit / Current choice defensible]

#### Alternative 2: [Name]
...

### Constraint Analysis

| Constraint Type | Description | Impact on Choice |
|-----------------|-------------|------------------|
| Data | [Description] | [Impact] |
| Time | [Description] | [Impact] |
| Expertise | [Description] | [Impact] |

**Overall:** [Constraints justify choice / Choice seems arbitrary]

### Justification Questions

The analyst must explicitly address:

1. [Question 1]
2. [Question 2]
3. [Question 3]

### Verdict

**Methodology Choice:** [Appropriate / Questionable / Inappropriate]

**Confidence:** [High/Medium/Low]

**Key Concern:** [Main issue if any]

**Recommendation:** [Accept / Justify / Reconsider / Redo]
```

---

## Common Challenges by Domain

### Workforce Management Analysis
- Are service level deviations treated as descriptive or causal?
- Is forecast accuracy analysis predictive or diagnostic?
- Are staffing recommendations based on causal models?

### Customer Experience Analysis
- Are satisfaction drivers correlation or causation?
- Is complaint analysis descriptive or inferential?
- Are intervention effects properly identified?

### Financial Analysis
- Are ROI calculations causal or correlational?
- Are projections based on predictive models or extrapolation?
- Is attribution analysis properly controlling for confounds?
