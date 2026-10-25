# Blind review package

This directory contains reviewer-facing material only: original communications, questions, declared context, question scope, answer choices and blank response fields. It contains no expected labels, arm identities, hypothesis or previous model outputs.

Give `reviewer-package.md` (or the per-case files) and `response-template.json` to each reviewer. Each reviewer must work independently.

For **human independent review**, save the completed files as `../reviews/human-a.json` and `../reviews/human-b.json`, then run `../compare-human-reviews.mjs`. Do not show the reviewers `../reviews/` or any expected labels before both are complete.

For **model-based provisional review**, save as `../reviews/reviewer-a.json` and `../reviews/reviewer-b.json` and run `../compare-reviews.mjs`; label the findings provisional, not human adjudication.

Do not add expected answers to this directory. Do not show one reviewer the other reviewer’s response before both are complete.
