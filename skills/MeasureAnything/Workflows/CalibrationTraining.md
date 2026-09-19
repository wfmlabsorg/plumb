# Calibration Training Workflow

## Purpose
Improve estimation accuracy through structured calibration exercises.

---

## Why Calibration Matters

**Calibrated estimator:** When they say they're 90% confident, they're right ~90% of the time.

Research shows:
- Most people are overconfident (ranges too narrow)
- Some are underconfident (ranges too wide)
- Calibration is a learnable skill
- Training improves accuracy significantly

---

## Types of Calibration Exercises

### Type 1: Trivia Questions with 90% CI
Estimate ranges for questions where you don't know the exact answer.

**Instructions:**
- Provide lower and upper bounds
- You should be 90% confident the answer is within your range
- Getting 9/10 within range = well calibrated
- Getting 6/10 = overconfident
- Getting 10/10 every time = underconfident

### Type 2: Binary Questions with Confidence
True/False questions where you state your confidence.

**Instructions:**
- Answer True or False
- State your confidence (50% = guessing, 100% = certain)
- Compare actual accuracy to stated confidence
- If you say 80% confident, should get ~80% right

---

## Calibration Exercise Set

### 90% CI Questions (10 questions)

For each, provide LB (lower bound) and UB (upper bound):

1. Year the first iPhone was released: LB___ UB___
2. Height of the Statue of Liberty in feet (to torch): LB___ UB___
3. Number of bones in the adult human body: LB___ UB___
4. Year Amazon was founded: LB___ UB___
5. Population of Canada (millions): LB___ UB___
6. Length of the Great Wall of China in miles: LB___ UB___
7. Speed of sound in mph (at sea level): LB___ UB___
8. Year the first email was sent: LB___ UB___
9. Number of countries in Africa: LB___ UB___
10. Height of Mount Everest in feet: LB___ UB___

### Binary Questions with Confidence (10 questions)

Answer T/F and state confidence (50-100%):

1. The Pacific Ocean is larger than the Atlantic Ocean. T/F ___% confident
2. Penguins can be found in the Northern Hemisphere in the wild. T/F ___% confident
3. The human brain uses about 20% of the body's energy. T/F ___% confident
4. Coffee is the most traded commodity in the world after oil. T/F ___% confident
5. Venus is the closest planet to the Sun. T/F ___% confident
6. The Great Pyramid of Giza was the tallest man-made structure for over 3,800 years. T/F ___% confident
7. Octopuses have three hearts. T/F ___% confident
8. Sanskrit is the oldest known written language. T/F ___% confident
9. The Amazon River is longer than the Nile. T/F ___% confident
10. Bananas are berries, but strawberries are not. T/F ___% confident

---

## Scoring Your Calibration

### 90% CI Scoring

| Answers in Range | Interpretation |
|------------------|----------------|
| 10/10 | Underconfident - narrow your ranges |
| 9/10 | Well calibrated |
| 8/10 | Slightly overconfident |
| 6-7/10 | Overconfident - widen your ranges |
| <6/10 | Very overconfident - significantly widen ranges |

### Binary Question Scoring

Calculate expected vs. actual:
- Sum your confidence percentages
- Divide by 100 to get expected correct
- Compare to actual correct

**Example:**
- Stated confidences: 70%, 80%, 60%, 90%, 75%, 85%, 70%, 65%, 80%, 75%
- Sum = 750 → Expected correct = 7.5
- If you got 8 correct → Well calibrated
- If you got 5 correct → Overconfident

---

## Calibration Improvement Techniques

### 1. Equivalent Bet Test
Before finalizing, ask: "Would I bet on this range vs. spinning a 90% wheel?"
- Prefer wheel → Widen range
- Prefer bet → Narrow range
- Indifferent → Calibrated

### 2. Consider the Opposite
Before answering, spend 10 seconds thinking about why the opposite might be true.

### 3. Reference Class Forecasting
"What happened in similar situations?" Find base rates before adjusting for specifics.

### 4. Pre-mortem
Imagine your estimate was wrong. What would have caused that? Adjust accordingly.

### 5. Track Record
Keep a log of your estimates and actual outcomes. Review monthly.

---

## Answers (for self-check)

### 90% CI Answers
1. iPhone release: 2007
2. Statue of Liberty height: 305 feet
3. Bones in adult body: 206
4. Amazon founded: 1994
5. Canada population: ~40 million (2024)
6. Great Wall length: ~13,171 miles
7. Speed of sound: 767 mph
8. First email: 1971
9. Countries in Africa: 54
10. Mount Everest height: 29,032 feet

### Binary Answers
1. Pacific larger than Atlantic: TRUE
2. Penguins in Northern Hemisphere wild: FALSE
3. Brain uses 20% of energy: TRUE
4. Coffee most traded after oil: FALSE (it's coffee after oil by some measures, but this is debated)
5. Venus closest to Sun: FALSE (Mercury is)
6. Great Pyramid tallest for 3,800+ years: TRUE
7. Octopuses have three hearts: TRUE
8. Sanskrit oldest written language: FALSE (Sumerian is older)
9. Amazon longer than Nile: FALSE (Nile is slightly longer)
10. Bananas are berries, strawberries not: TRUE

---

## Running a Workshop

### Half-Day Calibration Workshop Agenda

**Hour 1: Introduction (60 min)**
- Why calibration matters
- Definition of 90% CI
- First quiz (10 CI + 10 binary)
- Score and discuss results

**Hour 2: Techniques (60 min)**
- Equivalent bet test
- Consider the opposite
- Reference class forecasting
- Practice with 5 questions using techniques

**Hour 3: Practice Rounds (60 min)**
- Second quiz with techniques
- Score and compare to first quiz
- Third quiz (work context questions)
- Score and discuss improvement

**Hour 4: Application (60 min)**
- Apply to real business estimates
- Practice on upcoming decisions
- Create personal calibration tracking plan
- Q&A

---

## Calibration Log Template

Track your estimates over time:

```markdown
## Calibration Log

| Date | Estimate Topic | 90% CI | Actual | In Range? |
|------|---------------|--------|--------|-----------|
| 2026-01-15 | Q1 sales forecast | 800K-1.2M | 950K | Y |
| 2026-01-15 | Project completion date | Feb 15-Mar 10 | Feb 28 | Y |
| 2026-01-20 | Customer churn rate | 2%-5% | 6.2% | N |

**Running Score:** 7/10 (70%) - Slightly overconfident
**Adjustment needed:** Widen ranges by ~20%
```
