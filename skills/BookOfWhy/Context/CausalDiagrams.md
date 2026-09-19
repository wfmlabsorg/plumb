# Causal Diagrams

**Source:** Chapters 1, 3, 4 of The Book of Why

Causal diagrams (DAGs - Directed Acyclic Graphs) are the language for representing causal assumptions. They show "who listens to whom" in a system.

---

## Notation

- **Nodes:** Variables (observed or unobserved)
- **Arrows:** Direct causal relationships (X → Y means X directly affects Y)
- **Paths:** Sequences of arrows connecting variables
- **Directed Path:** All arrows point the same direction (X → Z → Y)
- **Backdoor Path:** Path from X to Y that starts with arrow INTO X (X ← Z → Y)

---

## The Three Fundamental Structures

### 1. Chain (Mediator)

```
X → M → Y
```

- M is a **mediator** between X and Y
- X affects Y through M
- The path X → M → Y is **open** (transmits association)
- Conditioning on M **blocks** the path

**Example:** Smoking → Tar → Cancer
- Tar mediates the effect of smoking on cancer

**Rule:** Never condition on a mediator when estimating total effect

---

### 2. Fork (Confounder)

```
X ← Z → Y
```

- Z is a **confounder** of X and Y
- Z is a common cause
- The path X ← Z → Y is **open** (creates spurious association)
- Conditioning on Z **blocks** the path

**Example:** Ice Cream Sales ← Hot Weather → Drownings
- Hot weather confounds ice cream and drowning correlation

**Rule:** Condition on confounders to block backdoor paths

---

### 3. Collider

```
X → Z ← Y
```

- Z is a **collider** on this path
- Z is a common effect
- The path X → Z ← Y is **blocked** (no association flows through)
- Conditioning on Z **opens** the path (creates spurious association!)

**Example:** Talent → Hollywood Success ← Attractiveness
- Among Hollywood actors, talent and attractiveness become negatively correlated

**Rule:** Never condition on colliders (or their descendants)

---

## d-Separation (Path Blocking)

A path is **blocked** if any of these conditions holds:
1. A chain A → B → C where B is conditioned on
2. A fork A ← B → C where B is conditioned on
3. A collider A → B ← C where B is NOT conditioned on (and no descendant of B is conditioned on)

**d-separation:** X and Y are d-separated by Z if all paths between X and Y are blocked by Z

**Implication:** If X and Y are d-separated by Z, then X ⊥ Y | Z (conditional independence)

---

## Identifying Structures

### Confounder Test
Is Z a confounder of X → Y?
1. Z is a cause of X (Z → X or Z → ... → X)
2. Z is a cause of Y (Z → Y or Z → ... → Y)
3. Z is not on any directed path from X to Y

### Mediator Test
Is M a mediator of X → Y?
1. M is on a directed path from X to Y
2. X → ... → M → ... → Y

### Collider Test
Is Z a collider on path P?
1. Two arrows on path P point INTO Z
2. Pattern: ... → Z ← ...

---

## Reading Causal Diagrams

### What the Diagram Tells You
1. **Causal relationships** — Arrows show direct effects
2. **Non-effects** — Absence of arrow means no direct effect
3. **Confounding structure** — Which variables create backdoor paths
4. **What to adjust for** — Which variables block confounding
5. **What NOT to adjust for** — Colliders and mediators

### What the Diagram Doesn't Tell You
1. **Strength of effects** — Arrows don't show magnitude
2. **Functional form** — Linear? Threshold? Interaction?
3. **Direction of causation** — That's your assumption
4. **Completeness** — Missing arrows are assumptions

---

## Common Patterns

### The Basic Confounding Pattern
```
      U
     ↙ ↘
    X   Y
```
U confounds X-Y. If U unobserved, standard adjustment impossible.

### Front-Door Pattern
```
      U
     ↙ ↘
    X   Y
    ↓   ↑
    M───┘
```
U confounds X-Y, but M is a shielded mediator. Use front-door adjustment.

### Instrumental Variable Pattern
```
    Z → X → Y
        ↑   ↑
        └─U─┘
```
Z is an instrument: affects Y only through X, independent of U.

### M-Bias (Butterfly)
```
    U₁   U₂
    ↓ ↘ ↙ ↓
    X  Z  Y
```
Z is a collider. Conditioning on Z opens a backdoor path X ← U₁ → Z ← U₂ → Y.

### Mediator-Confounder Pattern
```
    X → M → Y
        ↑
        U
```
U confounds M-Y. Adjusting for M without adjusting for U biases the estimate.

---

## Practical Guidance

### Building a Causal Diagram
1. List all relevant variables
2. For each pair, ask: "Does A directly cause B?"
3. Draw arrow if yes, no arrow if no
4. Mark unobserved variables (usually U notation)
5. Verify acyclicity (no loops)
6. Check against domain knowledge

### Validating a Causal Diagram
1. **Testable implications:** Find d-separation claims, test in data
2. **Domain review:** Do arrows match expert understanding?
3. **Sensitivity analysis:** What if missing arrows exist?

### Common Mistakes
1. **Treating mediators as confounders** — Conditioning blocks causal effect
2. **Ignoring colliders** — Conditioning opens spurious paths
3. **Omitting unobserved confounders** — Model appears identified but isn't
4. **Assuming no direct effect** — Every missing arrow is an assumption
