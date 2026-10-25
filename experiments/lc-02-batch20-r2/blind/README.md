# Blind review package

This directory contains reviewer-facing material only: original communications, questions, declared context, question scope, answer choices and blank response fields. It contains no expected labels, arm identities, hypothesis or previous model outputs.

Give `reviewer-package.md` (or the per-case files) and `response-template.json` to each reviewer. Each reviewer must work independently. Collect the completed JSON as `../reviews/reviewer-a.json` and `../reviews/reviewer-b.json`; only then run `../compare-reviews.mjs`.

Do not add expected answers to this directory. Do not show one reviewer the other reviewer’s response before both are complete.
