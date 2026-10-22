# Manual three-model exploratory smoke test

This is a new, separate smoke test, not execution of the frozen 48-call pilot. It uses one proposed synthetic deployment task and PLAIN transfer: DeepSeek V4.1 Flash sender → Qwen3.8 Flash recipient → GLM-5.3 advisory review. Primary assessment is NOT_ADJUDICATED. There is no model/human-benefit or Language-advantage claim.

Requirements: existing Node/dependencies; OPENCODE_API_KEY set in your current PowerShell process. The script never loads .env or saved authentication. Do not put your key in a script or command that will be committed.

Preview without inference:

```powershell
cd C:\Projects\project-language
node --experimental-transform-types experiments/communication-transfer-v1/src/local-three-model.mjs
```

Run intentionally (maximum three requests, 2,048 completion tokens each, 60 seconds per request, no retry/fallback):

```powershell
cd C:\Projects\project-language
$run = "experiments/communication-transfer-v1/artifacts/live-smoke-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
node --experimental-transform-types experiments/communication-transfer-v1/src/local-three-model.mjs --execute --exploratory-unadjudicated --accept-installed-routes --budget-usd 1 --output $run
Invoke-Item (Join-Path $run 'viewer.html')
```

The explicit flags acknowledge unadjudicated material and the installed legacy /zen/go API paths. Current published endpoint paths differ. This test intentionally observes whether the installed routes work; a failure stops the sequence without changing routes/models or probing alternatives. Qwen uses the installed Messages adapter/x-api-key; the others use Chat Completions/Bearer. The reserved US$1 allowance is an estimate ceiling, not a guarantee about external billing. Every call reserves its full estimated maximum before sending; failed reservations do not send a request. No automatic retries, repair, endpoint substitution, full corpus or negotiation run.

Results go into a new directory: role request/response receipts, results.json, viewer.html and SHA-256 manifest. Failed raw provider/error text is withheld; HTTP status and error hash are retained. Exact request bodies exclude host answer keys. A sender that cannot meet the bounded channel contract stops the test. C's opinion remains advisory. Historical evidence, source locks and reports are unchanged.

Implementation verification used injected HTTP only; the agent did not make real calls. The existing human-review and qualification gates still apply to the comparative scientific pilot.
