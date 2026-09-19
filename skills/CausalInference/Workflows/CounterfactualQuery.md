# CounterfactualQuery Workflow

Answer individual-level "what if" questions using structural causal models.

---

## When to Use

- Rung 3 questions: "What would have happened if...?"
- Individual attribution: "Was X responsible for Y in this case?"
- Policy evaluation for specific units
- Hindsight analysis (outcome already observed)

## Input
- Structural Causal Model (SCM) with equations
- Evidence: observed values for the individual
- Query: counterfactual condition

## Output
- Counterfactual outcome (point estimate or distribution)
- Probability statement if model partially specified

---

## The Three-Step Procedure

### Step 1: ABDUCTION
Update beliefs about exogenous variables (U) given evidence.

**What it does:** Uses observed data to infer the individual's "idiosyncrasies" — factors that make them unique.

**Example:**
```
Given: Alice has ED=0, EX=6, S=$81,000
Model: EX = 10 - 4·ED + U_EX
       S = 65000 + 2500·EX + 5000·ED + U_S

Compute:
U_EX = EX - (10 - 4·ED) = 6 - 10 = -4
U_S = S - (65000 + 2500·6 + 5000·0) = 81000 - 80000 = 1000
```

### Step 2: ACTION
Modify the model to reflect the counterfactual intervention.

**What it does:** Applies do(X=x') by:
1. Deleting arrows into X
2. Setting X to counterfactual value x'

**Example:**
```
Intervention: do(ED=1)  [What if Alice had college degree?]

Modified model:
- ED = 1 (set by intervention, ignores original equation)
- EX = 10 - 4·ED + U_EX  (unchanged)
- S = 65000 + 2500·EX + 5000·ED + U_S  (unchanged)
```

### Step 3: PREDICTION
Compute the outcome in the modified model using the inferred U values.

**Example:**
```
With U_EX = -4, U_S = 1000, ED = 1:

EX' = 10 - 4·(1) + (-4) = 2 years
S' = 65000 + 2500·(2) + 5000·(1) + 1000 = $76,000

Answer: Alice would earn $76,000 if she had a college degree.
```

---

## Code Implementation

```python
class StructuralCausalModel:
    """
    Simple SCM for counterfactual computation.
    """

    def __init__(self, equations, exogenous_distributions=None):
        """
        Args:
            equations: dict mapping variable -> function(parents, u)
            exogenous_distributions: dict mapping u -> distribution
        """
        self.equations = equations
        self.exogenous = exogenous_distributions or {}

    def abduction(self, evidence):
        """
        Step 1: Infer exogenous variables from evidence.
        Returns dict of U values.
        """
        u_values = {}
        # For linear models, solve for U
        # For general models, use inference
        for var, observed in evidence.items():
            if f'u_{var}' in self.equations:
                # Inverse function to get U
                u_values[f'u_{var}'] = self._solve_for_u(var, observed, evidence)
        return u_values

    def action(self, intervention):
        """
        Step 2: Modify model with intervention.
        Returns modified equations.
        """
        modified = self.equations.copy()
        for var, value in intervention.items():
            # Replace equation with constant
            modified[var] = lambda parents, u, v=value: v
        return modified

    def prediction(self, modified_equations, u_values):
        """
        Step 3: Compute outcome in modified model.
        """
        # Topological sort and compute
        values = {}
        for var in self._topological_order():
            parents = self._get_parents(var)
            parent_values = {p: values[p] for p in parents}
            u = u_values.get(f'u_{var}', 0)
            values[var] = modified_equations[var](parent_values, u)
        return values

    def counterfactual(self, evidence, intervention, query_var):
        """
        Full counterfactual computation.
        """
        # Step 1: Abduction
        u_values = self.abduction(evidence)

        # Step 2: Action
        modified = self.action(intervention)

        # Step 3: Prediction
        outcomes = self.prediction(modified, u_values)

        return outcomes[query_var]
```

---

## Example: Alice's Counterfactual Salary

```python
# Define SCM
equations = {
    'ED': lambda p, u: u,  # Exogenous
    'EX': lambda p, u: 10 - 4*p['ED'] + u,
    'S': lambda p, u: 65000 + 2500*p['EX'] + 5000*p['ED'] + u
}

scm = StructuralCausalModel(equations)

# Evidence
evidence = {'ED': 0, 'EX': 6, 'S': 81000}

# Query: What if ED=1?
intervention = {'ED': 1}

# Compute
counterfactual_salary = scm.counterfactual(
    evidence=evidence,
    intervention=intervention,
    query_var='S'
)

print(f"Alice's salary if she had college: ${counterfactual_salary:,.0f}")
# Output: Alice's salary if she had college: $76,000
```

---

## Types of Counterfactual Queries

### 1. Effect of Treatment on the Treated (ETT)
"What would have happened to treated individuals if they hadn't been treated?"

```
ETT = E[Y₁ - Y₀ | X=1]
```

Different from ATE because it focuses on those who actually received treatment.

### 2. Individual Treatment Effect (ITE)
"What is the effect for this specific individual?"

```
ITE(u) = Y₁(u) - Y₀(u)
```

Requires fully specified SCM to compute.

### 3. Probability of Necessity (PN)
"Given X=1 and Y=1, what's the probability Y would be 0 if X had been 0?"

```
PN = P(Y₀=0 | X=1, Y=1)
```

See `AttributionAnalysis.md` for computation.

### 4. Probability of Sufficiency (PS)
"Given X=0 and Y=0, what's the probability Y would be 1 if X had been 1?"

```
PS = P(Y₁=1 | X=0, Y=0)
```

---

## Partial Identification

When SCM is not fully specified (unknown functional forms):

### Bounds Approach
```python
def counterfactual_bounds(model, evidence, intervention, query_var):
    """
    Compute bounds on counterfactual when model partially specified.
    """
    # Natural bounds
    lower = 0  # or domain minimum
    upper = 1  # or domain maximum

    # Tighten using:
    # 1. Observational data
    # 2. Experimental data (if available)
    # 3. Monotonicity assumptions

    return lower, upper
```

### Example: Binary Treatment and Outcome
With observational data only:
- PN ∈ [max(0, P(Y=1|X=1) - P(Y=1|X=0)), P(Y=1|X=1)]
- PS ∈ [max(0, P(Y=1|X=1) - P(Y=1|X=0)), P(Y=0|X=0)]

With experimental data (RCT):
- Bounds tighten significantly
- May achieve point identification

---

## Validation

### Consistency Check
The observed outcome should match the counterfactual under the observed treatment:

```python
def validate_scm(scm, evidence):
    """
    Check that SCM reproduces observed data.
    """
    # Counterfactual under observed treatment should equal observed outcome
    observed_treatment = {k: v for k, v in evidence.items()
                         if k in scm.treatment_vars}

    cf_outcome = scm.counterfactual(evidence, observed_treatment, 'Y')

    assert cf_outcome == evidence['Y'], "SCM fails consistency check"
```

### Sensitivity Analysis
Test how results change with model assumptions:

```python
def sensitivity_to_functional_form(scm, evidence, intervention, forms):
    """
    Test counterfactual under different functional forms.
    """
    results = []
    for form in forms:
        modified_scm = scm.with_functional_form(form)
        cf = modified_scm.counterfactual(evidence, intervention, 'Y')
        results.append((form, cf))
    return results
```

---

## Output Template

```markdown
# Counterfactual Analysis Report

## Query
**Individual:** {ID or description}
**Evidence:** {observed values}
**Counterfactual condition:** "What if {X} had been {x'}?"

## Model
**Structural equations:**
- {V1} = f({parents}, U₁)
- {V2} = f({parents}, U₂)
- ...

## Computation

### Step 1: Abduction
Inferred exogenous values:
| Variable | Value | Interpretation |
|----------|-------|----------------|
| U₁ | {value} | {interpretation} |
| ... | ... | ... |

### Step 2: Action
Intervention: do({X}={x'})
Modified equations: {list changes}

### Step 3: Prediction
Counterfactual outcome: {Y} = {value}

## Result
**Point estimate:** {Y}_{X=x'} = {value}
**Interpretation:** {Plain language}

## Uncertainty
- Model specification uncertainty: {range or discussion}
- If bounds: [{lower}, {upper}]

## Limitations
1. Assumes functional form is correct
2. Assumes no model misspecification
3. {Other limitations}
```
