# Identify Causal Structure

Map a real-world scenario to a causal diagram.

---

## Input
A description of a system with variables and relationships.

## Output
- Causal diagram (DAG)
- Classification of each relationship (confounder, mediator, collider)
- Identification of adjustment sets

---

## Procedure

### Step 1: List Variables
Extract all variables mentioned or implied:
- Treatment/exposure variables
- Outcome variables
- Potential confounders (common causes)
- Potential mediators (intermediate variables)
- Potential colliders (common effects)

### Step 2: Identify Direct Causal Relationships
For each pair of variables, ask:
- "Does A directly cause B?" (not through another variable)
- "Does B directly cause A?"
- "Is there a common cause C?"

### Step 3: Draw the DAG
```
Rules:
- Arrow from cause to effect
- No arrow = no direct causal relationship
- No cycles allowed (acyclic)
- Mark unobserved variables with U
```

### Step 4: Classify Structures

For each non-adjacent pair (X, Y), identify paths:

**Chain (X → M → Y):**
- M is a mediator
- Path is open
- Conditioning on M blocks it

**Fork (X ← Z → Y):**
- Z is a confounder
- Path is open
- Conditioning on Z blocks it

**Collider (X → Z ← Y):**
- Z is a collider
- Path is blocked
- Conditioning on Z opens it

### Step 5: Identify Backdoor Paths
List all paths from X to Y that start with an arrow INTO X.

### Step 6: Determine Adjustment Set
Find set Z that:
1. Blocks all backdoor paths
2. Contains no descendants of X
3. Contains no colliders (unless necessary)

---

## Example: Does Education Affect Income?

**Variables:**
- X: Education level
- Y: Income
- Ability (unobserved)
- Family background
- Job type

**DAG:**
```
    Ability (U)
      ↙    ↘
   X:Edu → Y:Income
     ↓       ↑
   Job Type──┘
      ↑
  Family Background
      ↓
   X:Edu
```

Simplified:
```
       U (Ability)
      ↙    ↘
    Edu → Income
    ↓  ↘   ↗
   Job → ─┘
```

**Analysis:**
- Ability is a confounder (unobserved)
- Job Type is a mediator
- Family Background affects Education

**Adjustment:**
- Cannot adjust for Ability (unobserved)
- Should NOT adjust for Job Type (mediator)
- May need instrumental variable or frontdoor approach

---

## Common Patterns to Recognize

### The Classic Confounder
```
Question: "Does X affect Y?"
Reality: Z causes both X and Y

    Z
   ↙ ↘
  X   Y
```
Solution: Adjust for Z

### The Selection Bias
```
Question: "Does X affect Y among selected population?"
Reality: Selection S depends on both X and Y

  X → S ← Y
```
Solution: Don't condition on S (if possible)

### The Mediator Trap
```
Question: "Does X affect Y?"
Mistake: "Let me control for M"

  X → M → Y
```
Solution: Don't adjust for M (for total effect)

### The Unobserved Confounder
```
Question: "Does X affect Y?"
Reality: Unobserved U confounds

    U
   ↙ ↘
  X   Y
```
Solution: Find instrument, frontdoor, or bound the effect

---

## Checklist

- [ ] All relevant variables listed
- [ ] Each arrow justified by domain knowledge
- [ ] Each missing arrow justified (no direct effect)
- [ ] Unobserved variables marked
- [ ] No cycles
- [ ] Backdoor paths identified
- [ ] Adjustment set determined
- [ ] Checked for colliders in adjustment set
- [ ] Checked for mediators in adjustment set
