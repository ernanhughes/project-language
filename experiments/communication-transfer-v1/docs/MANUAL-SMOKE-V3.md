# Manual exploratory launcher v3

User-selected settings: 16,384 completion tokens per attempt and up to three retries per model (four attempts including the first). Across A/B/C that is at most twelve requests. The SDK itself still retries zero times; the visible outer loop records each attempt separately. Delay before retries is 1, 2 and 4 seconds. A successful schema-valid answer is not retried to improve its score. No fallback model/endpoint or changed prompt is used.

Each attempt reserves its full estimated input/output cost before sending. Budget exhaustion, authentication denial and sensitive output stop early. The explicit US$1 estimate allowance remains; it is not a guaranteed provider invoice. Timeout remains 60 seconds per attempt. Parsed output is capped at 128 KiB; total SSE framing at 16 MiB, independently of the token cap. Earlier v1/v2 source and failed receipts are unchanged. This is a new manual engineering version, not a change to frozen comparison protocols.

With OPENCODE_API_KEY already set in the current PowerShell process:

```powershell
cd C:\Projects\project-language
$run = "experiments/communication-transfer-v1/artifacts/live-smoke-v3-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
node --experimental-transform-types experiments/communication-transfer-v1/src/local-three-model-v3.mjs --execute --exploratory-unadjudicated --accept-installed-routes --budget-usd 1 --output $run
Invoke-Item (Join-Path $run 'viewer.html')
```

No live calls were made during implementation. The comparative pilot remains HUMAN_REVIEW_PENDING and LIVE_EXECUTION_NOT_AUTHORIZED. This command is a separately intentional exploratory smoke run, using proposed labels without independent scoring. Do not use it to run or claim completion of the comparative pilot.
