# Do-Calculus and Identification

**Source:** Chapter 7, The Book of Why

Do-calculus provides a complete set of rules for determining when causal effects can be computed from observational data, and how to compute them.

---

## The Do-Operator

**do(X=x)** represents an intervention that sets X to value x, regardless of X's natural causes.

### Graphical Interpretation
do(X=x) means:
1. Delete all arrows pointing INTO X
2. Set X = x

This "graph surgery" simulates an experiment where we force X to take a specific value.

### Key Distinction

| Expression | Meaning |
|------------|---------|
| P(Y\|X=x) | Probability of Y given we **observed** X=x |
| P(Y\|do(X=x)) | Probability of Y given we **set** X=x |

These are equal ONLY when there are no confounders of X and Y.

---

## The Three Rules of Do-Calculus

### Rule 1: Insertion/Deletion of Observations

```
P(Y | do(X), Z, W) = P(Y | do(X), Z)  if Y ⊥ W | X, Z in G_X̄
```

**Plain English:** We can ignore observations W if they're independent of Y once we've intervened on X and conditioned on Z.

**When to use:** Simplifying expressions by removing irrelevant observations.

### Rule 2: Action/Observation Exchange

```
P(Y | do(X), do(Z), W) = P(Y | do(X), Z, W)  if Y ⊥ Z | X, W in G_X̄Z̲
```

**Plain English:** We can replace do(Z) with observing Z if Z has no backdoor effect on Y in the modified graph.

**When to use:** Converting interventions to observations (the key step for identification).

### Rule 3: Insertion/Deletion of Actions

```
P(Y | do(X), do(Z), W) = P(Y | do(X), W)  if Y ⊥ Z | X, W in G_X̄Z̄(W)
```

**Plain English:** We can ignore intervention do(Z) if Z has no causal effect on Y in the modified graph.

**When to use:** Removing unnecessary interventions.

---

## Graph Notation

| Symbol | Meaning |
|--------|---------|
| G | Original causal graph |
| G_X̄ | Graph with arrows INTO X deleted |
| G_X̲ | Graph with arrows OUT OF X deleted |
| G_X̄Z̲ | Graph with arrows into X and out of Z deleted |

---

## Backdoor Criterion

The most commonly used identification method.

### Definition
A set Z satisfies the backdoor criterion relative to (X, Y) if:
1. No node in Z is a descendant of X
2. Z blocks all backdoor paths from X to Y

### Backdoor Adjustment Formula
If Z satisfies the backdoor criterion:

```
P(Y | do(X)) = Σ_z P(Y | X, Z=z) P(Z=z)
```

**Plain English:** Weight the conditional probability by the distribution of confounders.

### Example
```
      Z
     ↙ ↘
    X → Y
```
Z is a confounder. Adjusting for Z:
```
P(Y | do(X)) = Σ_z P(Y | X, Z=z) P(Z=z)
```

### What NOT to Adjust For
- Descendants of X (blocks causal effect)
- Colliders (opens spurious paths)
- Mediators (blocks indirect effect)

---

## Frontdoor Criterion

Used when backdoor paths cannot be blocked.

### Definition
A set M satisfies the frontdoor criterion relative to (X, Y) if:
1. M intercepts all directed paths from X to Y
2. There is no unblocked backdoor path from X to M
3. All backdoor paths from M to Y are blocked by X

### Frontdoor Adjustment Formula
```
P(Y | do(X)) = Σ_m P(M=m | X) Σ_x' P(Y | X=x', M=m) P(X=x')
```

### Example: Smoking → Tar → Cancer
```
      U
     ↙ ↘
    X   Y
    ↓   ↑
    M───┘
```
- U (smoking gene) confounds X (smoking) and Y (cancer)
- M (tar) is a mediator shielded from U
- Can estimate P(Y|do(X)) without measuring U

---

## Instrumental Variables

### Definition
Z is an instrumental variable for X → Y if:
1. Z is associated with X
2. Z affects Y only through X
3. Z is independent of confounders of X-Y

### Pattern
```
    Z → X → Y
        ↑   ↑
        └─U─┘
```

### Estimation (Linear Case)
```
Causal effect = Cov(Z,Y) / Cov(Z,X)
```

### Example: John Snow's Cholera Study
- Z = Water company (random assignment of customers)
- X = Water purity
- U = Poverty, location (confounders)
- Y = Cholera

---

## Completeness of Do-Calculus

**Theorem (Huang & Valtorta, 2006; Shpitser & Pearl, 2006):**
The three rules of do-calculus are complete. If a causal effect is identifiable from a causal diagram, then the rules can derive an expression for it. If the rules fail, no method can identify the effect.

### Implications
1. There's an algorithm to determine identifiability
2. If not identifiable, we know for certain
3. No need to search for "new tricks" beyond do-calculus

---

## Identification Algorithm (Simplified)

Given a query P(Y|do(X)):

1. **Check backdoor criterion** — Find Z that blocks all backdoor paths without including descendants of X
2. **If backdoor works** → Use backdoor adjustment formula
3. **If backdoor fails** — Check frontdoor criterion
4. **If frontdoor works** → Use frontdoor adjustment formula
5. **Check instrumental variables** — Find Z satisfying IV conditions
6. **If all fail** — Apply do-calculus rules exhaustively
7. **If still fails** — Effect is not identifiable from observational data alone

---

## Practical Guidance

### When to Use Each Method

| Situation | Method |
|-----------|--------|
| Confounders all observed | Backdoor adjustment |
| Unobserved confounder but shielded mediator exists | Frontdoor adjustment |
| Have random/exogenous variation in something affecting X | Instrumental variables |
| Complex structure | Full do-calculus |

### Common Mistakes
1. **Adjusting for colliders** — Opens paths instead of blocking them
2. **Adjusting for mediators** — Blocks the causal effect you're trying to estimate
3. **Missing confounders** — Effect appears identified but isn't
4. **Assuming linearity** — Formulas differ for non-linear models

### Red Flags
- "We controlled for everything" — Did you check for colliders?
- "We found X correlates with Y" — Is that seeing or doing?
- "The effect disappeared after adjustment" — Did you adjust for a mediator?
