# Human independent review handoff — V2

**Do not run the live evaluation until two independent human reviewers complete this package.**

## Give each reviewer

- `experiments/lc-02-batch20-r2/blind-v2/reviewer-package.md`
- `experiments/lc-02-batch20-r2/blind-v2/response-template.json`

Do **not** give them:

- `experiments/lc-02-batch20-r1/fixtures/` (expected labels)
- `experiments/lc-02-batch20-r2/reviews/` (model-based preflight reviews)
- `experiments/lc-02-batch20-r2/COMPILER-QUALIFICATION.json` or any arm output

## Rules

1. The two human reviewers must work independently and must not see each other’s answers.
2. They must not see the expected labels or the model-based reviews before completing their own.
3. Save the completed files as:
   - `experiments/lc-02-batch20-r2/reviews/human-a.json`
   - `experiments/lc-02-batch20-r2/reviews/human-b.json`
4. Only after both are complete, run:

```powershell
node --experimental-transform-types experiments/lc-02-batch20-r2/compare-human-reviews.mjs `
  --a experiments/lc-02-batch20-r2/reviews/human-a.json `
  --b experiments/lc-02-batch20-r2/reviews/human-b.json
```

5. Read `reviews/HUMAN-COMPARISON.md`. Disagreements and flagged ambiguity notes must be resolved in a new design version before any live request. Do not silently change V2.

## What this review is for

The model-based preflight reviews agreed 16/16 on V1 and 3/3 on the changed V2 cases, but they are not independent human adjudication. This handoff is the step that converts the blind package into independent evidence.
