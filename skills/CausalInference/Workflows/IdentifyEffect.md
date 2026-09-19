# IdentifyEffect Workflow

Determine if a causal effect is identifiable from observational data and which method to use.

---

## Input
- Causal diagram (DAG)
- Treatment variable (X)
- Outcome variable (Y)
- List of observed variables

## Output
- Identifiable: Yes/No
- If yes: Method + adjustment formula
- If no: Options (experiment, more data, bounds)

---

## Algorithm

```
IDENTIFY(DAG, X, Y, observed):

    1. CHECK TRIVIAL PLUMB
       If no backdoor paths from X to Y:
           RETURN "Identifiable: P(Y|do(X)) = P(Y|X)"

    2. TRY BACKDOOR CRITERION
       For each subset Z of observed variables:
           If Z blocks all backdoor paths AND
              Z contains no descendants of X:
               RETURN "Identifiable via backdoor adjustment on Z"

    3. TRY FRONTDOOR CRITERION
       For each subset M of observed variables:
           If M intercepts all X→Y directed paths AND
              No unblocked backdoor X→M AND
              All M→Y backdoor paths blocked by X:
               RETURN "Identifiable via frontdoor adjustment on M"

    4. TRY INSTRUMENTAL VARIABLES
       For each Z in observed variables:
           If Z→X exists AND
              No Z→Y path except through X AND
              Z independent of X-Y confounders:
               RETURN "Identifiable via instrumental variable Z"

    5. APPLY DO-CALCULUS
       Apply Rules 1-3 exhaustively
       If do-operator eliminated:
           RETURN "Identifiable via do-calculus derivation"

    6. NOT IDENTIFIABLE
       RETURN "Not identifiable from observational data"
       SUGGEST: Bounds, sensitivity analysis, experiment
```

---

## Step-by-Step Procedure

### Step 1: List Backdoor Paths

A backdoor path from X to Y is any path that:
- Starts with an arrow INTO X (← or ↔)
- Ends at Y

```
Example: X ← Z → Y is a backdoor path
Example: X ← A → B ← C → Y is a backdoor path (blocked at B)
```

**Action:** List all backdoor paths and note which are blocked/open.

### Step 2: Backdoor Criterion

**Requirements for adjustment set Z:**
1. Z blocks all backdoor paths
2. No variable in Z is a descendant of X

**Check blocking rules:**
- Chain A → B → C: Blocked if B in Z
- Fork A ← B → C: Blocked if B in Z
- Collider A → B ← C: Blocked unless B (or descendant) in Z

**Find minimal sufficient adjustment set:**
```python
from pgmpy.inference import CausalInference
ci = CausalInference(model)
adjustment_sets = ci.get_all_backdoor_adjustment_sets(X, Y)
minimal = min(adjustment_sets, key=len)
```

### Step 3: Frontdoor Criterion

**When to use:** Backdoor blocked by unobserved confounder

**Requirements for mediator set M:**
1. M intercepts all directed paths from X to Y
2. No unblocked backdoor path from X to M
3. All backdoor paths from M to Y are blocked by X

**Pattern:**
```
    U (unobserved)
   ↙    ↘
  X      Y
   ↘    ↗
     M
```

### Step 4: Instrumental Variables

**Requirements for instrument Z:**
1. Relevance: Z is associated with X
2. Exclusion: Z affects Y only through X
3. Independence: Z is independent of X-Y confounders

**Test relevance:** Check correlation Z-X in data
**Test exclusion:** Domain knowledge (no Z→Y path except via X)
**Test independence:** Domain knowledge (Z has no common cause with X-Y confounder)

### Step 5: Do-Calculus (if needed)

Apply the three rules:

**Rule 1 (Observation insertion/deletion):**
```
P(Y|do(X),Z,W) = P(Y|do(X),Z) if Y⊥W|X,Z in G_X̄
```

**Rule 2 (Action/observation exchange):**
```
P(Y|do(X),do(Z),W) = P(Y|do(X),Z,W) if Y⊥Z|X,W in G_X̄Z̲
```

**Rule 3 (Action insertion/deletion):**
```
P(Y|do(X),do(Z),W) = P(Y|do(X),W) if Y⊥Z|X,W in G_X̄Z̄(W)
```

### Step 6: Report Results

**If identifiable:**
```markdown
## Identification Result: ✓ IDENTIFIABLE

**Method:** Backdoor adjustment

**Adjustment set:** {Z1, Z2}

**Formula:**
P(Y|do(X)) = Σ_{z1,z2} P(Y|X,Z1=z1,Z2=z2) P(Z1=z1,Z2=z2)

**Assumptions required:**
1. DAG correctly specifies causal structure
2. No unmeasured confounders beyond those in DAG
3. Positivity: P(X|Z) > 0 for all Z values

**Proceed to:** EstimateEffect workflow
```

**If not identifiable:**
```markdown
## Identification Result: ✗ NOT IDENTIFIABLE

**Reason:** Unobserved confounder U blocks all adjustment strategies

**Options:**
1. **Run experiment:** Randomize X to break confounding
2. **Find instrument:** Variable affecting X but not Y directly
3. **Measure confounder:** If U can be observed/proxied
4. **Compute bounds:** Partial identification under assumptions
5. **Sensitivity analysis:** How strong must confounding be to nullify effect?

**Proceed to:** Discuss options with user
```

---

## Code Implementation

```python
import dowhy
from dowhy import CausalModel

def identify_effect(data, treatment, outcome, graph):
    """
    Check if causal effect is identifiable.

    Args:
        data: DataFrame with observed variables
        treatment: Name of treatment variable
        outcome: Name of outcome variable
        graph: DOT string specifying causal graph

    Returns:
        dict with identification result and method
    """
    model = CausalModel(
        data=data,
        treatment=treatment,
        outcome=outcome,
        graph=graph
    )

    # Try identification
    identified_estimand = model.identify_effect(
        proceed_when_unidentifiable=True
    )

    result = {
        'identifiable': identified_estimand.estimands is not None,
        'method': identified_estimand.get_backdoor_variables() or 'none',
        'estimand': identified_estimand,
        'assumptions': identified_estimand.get_assumptions()
    }

    return result
```

---

## Decision Tree

```
START
│
├── Any backdoor paths?
│   ├── No → IDENTIFIED (simple)
│   └── Yes → Continue
│
├── All backdoor paths blockable with observed variables?
│   ├── Yes → IDENTIFIED (backdoor)
│   └── No → Continue
│
├── Frontdoor pattern exists with observed mediator?
│   ├── Yes → IDENTIFIED (frontdoor)
│   └── No → Continue
│
├── Valid instrument exists?
│   ├── Yes → IDENTIFIED (IV)
│   └── No → Continue
│
├── Do-calculus derivation exists?
│   ├── Yes → IDENTIFIED (do-calculus)
│   └── No → NOT IDENTIFIED
│
└── NOT IDENTIFIED
    ├── Suggest bounds
    ├── Suggest sensitivity analysis
    └── Suggest experiment
```

---

## Common Patterns

### Pattern 1: Simple Confounder (Identifiable)
```
    Z (observed)
   ↙ ↘
  X → Y
```
**Method:** Adjust for Z

### Pattern 2: Unobserved Confounder (Not Identifiable)
```
    U (unobserved)
   ↙ ↘
  X → Y
```
**Method:** None without additional structure

### Pattern 3: Unobserved Confounder + Mediator (Identifiable)
```
    U (unobserved)
   ↙ ↘
  X   Y
   ↘ ↗
    M (observed)
```
**Method:** Frontdoor via M (if M shielded from U)

### Pattern 4: Instrument Available (Identifiable)
```
  Z → X → Y
      ↑   ↑
      └─U─┘
```
**Method:** Instrumental variable Z
