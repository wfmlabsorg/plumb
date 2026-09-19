# Classify Causal Query

Determine which rung of the Ladder of Causation a question belongs to.

---

## Quick Classification

| If the question asks... | Rung | Tools |
|------------------------|------|-------|
| "Is X correlated with Y?" | 1 | Statistics |
| "What predicts Y?" | 1 | Regression, ML |
| "What is the relationship?" | 1 | Correlation |
| "What if we DO/SET/CHANGE X?" | 2 | Do-calculus |
| "What is the EFFECT of X on Y?" | 2 | Backdoor/Frontdoor |
| "Would Y have occurred IF X had been different?" | 3 | Counterfactuals |
| "Was X responsible for Y?" | 3 | PN/PS |
| "What WOULD HAVE happened?" | 3 | SCM |

---

## Decision Tree

```
START: What is the question asking?
│
├─> About correlation/prediction only?
│   └─> RUNG 1: Association
│       Tools: Regression, correlation, ML prediction
│
├─> About effects of actions/interventions?
│   │
│   └─> Does it use hindsight (actual outcome)?
│       │
│       ├─> No: RUNG 2: Intervention
│       │   Tools: RCT, backdoor, frontdoor, IV, do-calculus
│       │
│       └─> Yes: RUNG 3: Counterfactual
│           Tools: SCM, potential outcomes, PN/PS
│
└─> About responsibility/attribution/what-if?
    └─> RUNG 3: Counterfactual
        Tools: SCM, potential outcomes, PN/PS
```

---

## Detailed Classification

### Rung 1 Indicators
- "Is there a relationship between..."
- "What predicts..."
- "Are X and Y correlated?"
- "What's the probability of Y given X?"
- No mention of intervention, causation, or hypotheticals

### Rung 2 Indicators
- "What happens if we..."
- "What is the effect of..."
- "If we increase X, what happens to Y?"
- "Does X cause Y?"
- "Should we do X to improve Y?"
- Forward-looking, no specific outcome yet observed

### Rung 3 Indicators
- "Would Y have occurred if..."
- "What would have happened if..."
- "Was X responsible for Y?"
- "Did X cause Y (this specific instance)?"
- "Why did Y happen?"
- Backward-looking, specific outcome already observed

---

## Examples

### Example 1: "Are smokers more likely to get cancer?"
**Classification:** Ambiguous - could be Rung 1 or 2

- If asking about observed correlation → Rung 1
- If asking about causal effect → Rung 2

**Clarifying question:** "Are you asking about the observed correlation, or whether smoking causes cancer?"

### Example 2: "If we lower prices by 10%, will sales increase?"
**Classification:** Rung 2 (Intervention)

- Forward-looking
- About effect of an action
- No hindsight involved

**Tools:** Backdoor adjustment if observational data, or experiment

### Example 3: "Would this patient have survived if we'd given the drug?"
**Classification:** Rung 3 (Counterfactual)

- Specific patient
- Outcome already observed (death)
- Asking about alternative world

**Tools:** SCM with individual characteristics

### Example 4: "Did the marketing campaign cause the sales spike?"
**Classification:** Rung 3 (Counterfactual)

- Specific event already occurred
- Asking about attribution
- "Did X cause Y" for a specific instance

**Tools:** Probability of Necessity (PN)

### Example 5: "What's the ROI of our training program?"
**Classification:** Rung 2 (Intervention)

- Effect of a policy
- Forward-looking (average effect)
- Not about a specific past outcome

**Tools:** Backdoor adjustment, matching, IV

---

## Common Mistakes

### Treating Rung 2 as Rung 1
**Mistake:** Using regression to answer "Does X cause Y?"
**Problem:** Regression gives correlation, not causation
**Fix:** Use causal diagram + appropriate adjustment

### Treating Rung 3 as Rung 2
**Mistake:** Using average treatment effect for individual attribution
**Problem:** ATE doesn't tell you about specific cases
**Fix:** Use counterfactual reasoning with SCM

### Answering Wrong Question
**Mistake:** Client asks Rung 2, analyst answers Rung 1
**Problem:** "We found X and Y are correlated" doesn't answer "Should we do X?"
**Fix:** Clarify the question before analysis

---

## After Classification

### If Rung 1:
- Standard statistical analysis applies
- No causal claims should be made
- Prediction is valid, attribution is not

### If Rung 2:
1. Draw causal diagram
2. Identify if effect is identifiable
3. Use appropriate method (backdoor, frontdoor, IV, etc.)
4. Interpret as average causal effect

### If Rung 3:
1. Draw causal diagram with structural equations
2. Identify if counterfactual is computable
3. Use 3-step procedure (Abduction, Action, Prediction)
4. Interpret as individual-level or attribution claim
