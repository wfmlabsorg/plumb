# Check Identifiability

Determine if a causal effect can be estimated from observational data.

---

## Input
- Causal diagram (DAG)
- Query: P(Y|do(X)) or specific causal effect

## Output
- Yes/No: Is the effect identifiable?
- If yes: Which method and formula to use
- If no: What additional data or assumptions needed

---

## Algorithm

### Step 1: Check for Backdoor Path
List all paths from X to Y that start with an arrow INTO X.

If no backdoor paths → Effect is identifiable via simple observation
```
P(Y|do(X)) = P(Y|X)
```

### Step 2: Try Backdoor Criterion
Find set Z that:
1. Blocks all backdoor paths
2. Contains no descendants of X

If Z exists and all variables in Z are observed → Use backdoor adjustment
```
P(Y|do(X)) = Σ_z P(Y|X,Z=z)P(Z=z)
```

### Step 3: Try Frontdoor Criterion
Find set M that:
1. Intercepts all directed paths from X to Y
2. No unblocked backdoor from X to M
3. All backdoor paths from M to Y blocked by X

If M exists and observed → Use frontdoor adjustment
```
P(Y|do(X)) = Σ_m P(M=m|X) Σ_x' P(Y|X=x',M=m)P(X=x')
```

### Step 4: Check for Instrumental Variables
Find Z that:
1. Z → X (associated with X)
2. Z affects Y only through X
3. Z independent of X-Y confounders

If Z exists → Use IV estimation

### Step 5: Apply Do-Calculus
If above fail, apply Rules 1-3 exhaustively to try to eliminate do-operator.

### Step 6: Conclude
If all methods fail → Effect is not identifiable from observational data alone

---

## Quick Reference: Common Structures

### Identifiable: Simple Chain
```
X → Y
```
No confounding → P(Y|do(X)) = P(Y|X)

### Identifiable: Observed Confounder
```
    Z
   ↙ ↘
  X → Y
```
Adjust for Z → P(Y|do(X)) = Σ_z P(Y|X,Z)P(Z)

### Identifiable: Frontdoor Structure
```
    U
   ↙ ↘
  X   Y
  ↓   ↑
  M───┘
```
Use frontdoor via M

### NOT Identifiable: Unobserved Confounder, No Frontdoor
```
    U (unobserved)
   ↙ ↘
  X → Y
```
No method works without additional assumptions

### Identifiable with IV
```
Z → X → Y
    ↑   ↑
    └─U─┘
```
Use Z as instrument

---

## Worked Example

**Question:** Can we estimate the effect of Smoking on Cancer from observational data?

**Diagram:**
```
     Smoking Gene (U, unobserved)
           ↙           ↘
    Smoking    →     Cancer
         ↓              ↑
        Tar ────────────┘
```

**Analysis:**

Step 1: Backdoor paths?
- Smoking ← U → Cancer (open, U unobserved)

Step 2: Backdoor criterion?
- Need to block Smoking ← U → Cancer
- U not observed, cannot adjust
- **Backdoor fails**

Step 3: Frontdoor criterion?
- M = Tar
- Check: Smoking → Tar → Cancer intercepts all paths? **Yes**
- Check: No backdoor from Smoking to Tar? **Yes** (U doesn't affect Tar)
- Check: Backdoor Tar ← Smoking ← U → Cancer blocked by Smoking? **Yes**
- **Frontdoor works!**

**Result:** Identifiable via frontdoor adjustment through Tar.

---

## When NOT Identifiable

If none of the following exist:
1. Valid backdoor adjustment set
2. Valid frontdoor adjustment set
3. Valid instrumental variable
4. Do-calculus derivation

Then the effect cannot be identified from observational data.

**Options:**
1. Run a randomized experiment
2. Find additional observed variables
3. Make stronger assumptions (e.g., linearity)
4. Compute bounds instead of point estimate

---

## Bounds When Not Identifiable

Even if point identification fails, we can often compute bounds.

### Natural Bounds
```
P(Y|do(X)) ∈ [0, 1]
```

### Tighter Bounds
Using partial information from data, bounds can often be narrowed significantly.

### Sensitivity Analysis
Assume different strengths of unmeasured confounding, see how estimates change.

---

## Checklist

- [ ] Drew complete causal diagram
- [ ] Listed all backdoor paths
- [ ] Checked backdoor criterion
- [ ] Checked frontdoor criterion
- [ ] Checked for instrumental variables
- [ ] Applied do-calculus if needed
- [ ] Verified all required variables are observed
- [ ] Documented assumptions made
