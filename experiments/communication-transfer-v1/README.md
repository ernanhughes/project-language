# Language — AI-to-AI Communication Transfer (scaffold 0.1)

## Local integration milestone — TRANSFER-01A v0.2

Real isolated Pi 1.0.4 sessions now run against fauxProvider. All responses remain scripted, with zero real model inference. Start with `TRANSFER-01A-REPORT.md` and `docs/TRANSFER-01A-PROTOCOL.md`; the original v0.1 scaffold description below is retained as history.

From `C:\Projects\project-language\experiments\communication-transfer-v1`:

```powershell
npm test
npm run offline -- artifacts/my-new-run
npm run browser -- artifacts/my-new-run/viewer.html artifacts/my-new-browser-check
```

Use NEW output directories. Existing evidence is never overwritten by the v0.2 runner. Open the resulting `viewer.html` directly; no server or key is needed. `artifacts/transfer-01a-004/viewer.html` and `artifacts/browser-004/` record the final browser-verified version. Earlier implementation smoke runs are retained. Tokens are UNKNOWN; bytes are measured. Real execution has no command in this milestone and requires a later approved lock.

**Source-compatible additive experiment** for `ernanhughes/project-language`.
This folder is a runnable **offline scripted scaffold**, not a verified live model experiment or Pi-integrated provider. Copy this directory to `experiments/communication-transfer-v1/` in a local checkout; the existing repository is not modified by the ZIP itself.

## Run the mock trace and interactive visualisation

From the experiment directory (Node 22+):

```powershell
node --test tests/*.test.mjs
node src/demo.mjs
```

Open `artifacts/viewer.html` directly in a browser. The viewer is a **single self-contained HTML** file and needs no server, provider token, network or model. Use the four tabs to inspect which information AI B receives. All outputs are hand-authored, visibly labelled, and provide **zero evidence of communication improvement**.

## Exact handoff to the real project

Host-independent code should remain in `experiments/communication-transfer-v1/` (or an explicitly reviewed core module); Pi model execution belongs in `host-pi/`, using the installed `@earendil-works/pi-ai@1.0.4`, and Pi agent orchestration only when needed. Do **not** duplicate a model client or use a second provider framework.

Reuse existing interfaces after a local API review, not by assuming they do something they don't:

| Existing capability | Potential experiment use | Limitation |
|---|---|---|
| `core/language` + `host-pi/language.ts` | versioned historic conversation projection | Git-backed state verification; not independently true memory and not Chapter 7 record |
| `core/record` | source-linked claims and qualifiers | existing example is hand-authored, not automatic extraction |
| `core/preservation` / `core/verify` | bounded obligation checks and adversarial probes | lexical heuristics miss meaning and can reject faithful paraphrases |
| `core/personal` | scoped current state, expiry, separation of declaration/observation/inference | do not turn a reading of a user into durable profile/authority |
| `core/remembering` | history and retrieval receipts | retrieved evidence does not automatically have permission or standing |
| `core/evidence` / `core/proof` | observation & receipts | code checking never certifies actual communication benefit |
| `host-pi` / `harness/session.ts` | Pi extension and faux model end-to-end testing | faux provider results are not real-model results |

Keep `host-pi` separate from core; don't install a new package without reviewing the pinned package API and its provenance. Any real inference is a later separately authorised milestone.

## Data candidates

**First real corpus:** Hugging Face `pminervini/HaluEval`, `summarization` configuration (`document`, `right_summary`, `hallucinated_summary`), pinned by immutable revision and licence check; an existing historical Hallucination Energy evaluation used this family of data. Old calibration data must **not** be reused as unexamined held-out test. The written summaries are controls, not a ready-made gold for AI-to-AI reconstruction.

**Secondary:** original RAGTruth human-annotated hallucination spans and SciFact, subject to split/licence/source resolution. Do not pretend FEVEROUS document IDs are plain evidence text. Prepare held-out dedup and author-reviewed obligations. Do not download external datasets in the offline milestone.

## Principal experimental confounds

- A receiver with the original source is a strong control and a source-only comparator, **not** an equal-bandwidth model-to-model condition.
- Plain, source-linked and context-enhanced communication require matched or measured transmitted token budgets. Include a source-link-only intermediate arm.
- Three model roles are sender, receiver and an **advisory**, potentially correlated AI judge. Author-reviewed source obligations and deterministic answers are separate.
- Shuffle/rotate sender and receiver model roles; keep the judge blind to condition, role identity, energy and Taint labels.
- Taint remains a **hypothetical co-produced interaction signature**, not identity, preference, compatibility or permission. No Taint candidate is transmitted here.
- Hallucination Energy is **not computed** in this scaffold; import a frozen validated metric as a secondary observation in a later experiment, with calibration checks.
- History/current context are not infinite; expose exact recipient-visible bytes and avoid personal information or evidence leakage.

See `EXPERIMENT.md` for the prospective protocol and run gates.
