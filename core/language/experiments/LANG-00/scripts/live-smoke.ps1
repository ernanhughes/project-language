#!/usr/bin/env pwsh
# LANG-00 one-call live smoke. NOT executed in LANG-00; only --DryRun runs.
#
# Gates (all required for a live run):
#   LANG00_AUTHORIZE_MODEL_CALL=YES
#   LANG00_MODEL=<exact-model-id>
#   LANG00_MAX_OUTPUT_TOKENS=<small positive value, <= 32>
#
# One session, one message (frozen canary request), no retry/fallback,
# bounded timeout, synthetic fixture only, pinned independent observer.
# Exit codes: 0 PASS, 1 FAIL, 2 REFUSED/UNSUPPORTED (nothing submitted).
#
# Usage:
#   .\experiments\LANG-00\scripts\live-smoke.ps1 -DryRun
#   .\experiments\LANG-00\scripts\live-smoke.ps1   # live; requires the gates

[CmdletBinding()]
param(
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSCommandPath)))
$Canary = "CANARY-LANG00-7F3A"

function Refuse([string]$message) {
  Write-Host ""
  Write-Host "LANG00 SMOKE REFUSED: $message" -ForegroundColor Yellow
  exit 2
}

function Fail([string]$message) {
  Write-Host ""
  Write-Host "LANG00 SMOKE FAIL: $message" -ForegroundColor Red
  exit 1
}

$auth = $env:LANG00_AUTHORIZE_MODEL_CALL
$model = $env:LANG00_MODEL
$maxTokens = $env:LANG00_MAX_OUTPUT_TOKENS

if (-not $DryRun) {
  if ($auth -ne "YES") { Refuse "LANG00_AUTHORIZE_MODEL_CALL is not YES." }
  if (-not $model) { Refuse "LANG00_MODEL is not set. No default model exists." }
  if (-not $maxTokens -or -not ($maxTokens -match '^\d+$') -or [int]$maxTokens -le 0 -or [int]$maxTokens -gt 32) {
    Refuse "LANG00_MAX_OUTPUT_TOKENS must be a positive integer <= 32."
  }
} else {
  if (-not $model) { Write-Host "DRY-RUN NOTE: LANG00_MODEL not set (required for live)." -ForegroundColor Yellow }
}

# Pinned instrument check (read-only; never modified).
$instrumentDir = "C:\Projects\project-context-opencode"
$instrumentHead = (& git -C $instrumentDir rev-parse HEAD 2>&1 | Out-String).Trim()
if ($instrumentHead -ne "2d124072dbb3d808a76f4a90187d2aa59244bb8a") {
  if (-not $DryRun) { Fail "instrument HEAD moved ($instrumentHead); re-pin before running." }
  Write-Host "DRY-RUN WARNING: instrument HEAD moved ($instrumentHead)." -ForegroundColor Yellow
}

$opencodeCmd = (Get-Command "opencode" -ErrorAction SilentlyContinue).Source
if (-not $opencodeCmd) { Refuse "opencode is not on PATH." }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$rand = -join ((48..57) + (65..90) | Get-Random -Count 6 | ForEach-Object { [char]$_ })
$workRoot = Join-Path ([System.IO.Path]::GetTempPath()) "lang00-smoke-$stamp-$rand"
$projDir = Join-Path $workRoot "demo project"
$homeDir = Join-Path $workRoot "lang-home"
$cfgDir = Join-Path $workRoot "config"
$spoolDir = Join-Path $workRoot "observer-spool"
New-Item -ItemType Directory -Force -Path $projDir, $homeDir, $cfgDir, $spoolDir | Out-Null
Set-Content -LiteralPath (Join-Path $projDir "README.md") -Value "# lang00 smoke throwaway`n" -Encoding utf8

$pluginSpec = "file:///" + ($RepoRoot -replace "\\", "/")
$observerSpec = "file:///C:/Projects/project-context-opencode"
Set-Content -LiteralPath (Join-Path $cfgDir "opencode.jsonc") -Value ('{"plugins":["' + $pluginSpec + '","' + $observerSpec + '"]}') -Encoding utf8

# Synthetic fixture keyed to the throwaway project (init + one apply via CLI).
$cli = Join-Path $RepoRoot "dist/src/cli.js"
if (-not (Test-Path -LiteralPath $cli -PathType Leaf)) { Fail "compiled CLI missing: $cli (run npm run build)" }
$now = "2026-10-02T00:00:00.000Z"
& node $cli init --project $projDir --thread "smoke-01" --key "smoke-init" --now $now --store-root $homeDir 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "fixture init failed." }
$opsFile = Join-Path $workRoot "ops.json"
$shaOf = { param([string]$s) $h = [System.Security.Cryptography.SHA256]::Create(); [BitConverter]::ToString($h.ComputeHash([Text.Encoding]::UTF8.GetBytes($s))).Replace("-", "").ToLower() }
$op = @{ op = "add"; item = @{ id = "canary-1"; kind = "definition"; text = "The LANG-00 canary value is $Canary."; actor = "user"; standing = "explicit"; scope = "smoke"; sources = @(@{ session_id = "smoke-sess"; message_id = "m1"; sha256 = (& $shaOf "smoke-sess:m1") }) } }
[IO.File]::WriteAllText($opsFile, ("[" + ($op | ConvertTo-Json -Depth 8) + "]"), [Text.UTF8Encoding]::new($false))
$metaRaw = & node $cli show --project $projDir --thread "smoke-01" --store-root $homeDir 2>&1 | Out-String
$parentRev = (& node $cli verify --project $projDir --thread "smoke-01" --store-root $homeDir --json 2>&1 | Out-String | ConvertFrom-Json).revision
& node $cli apply --project $projDir --thread "smoke-01" --key "smoke-add" --parent $parentRev --ops $opsFile --now $now --store-root $homeDir 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "fixture apply failed." }
$expectedPath = Join-Path $workRoot "expected-block.txt"
# PowerShell Out-String rewrites LF to CRLF; normalize back so the frozen
# expected bytes stay canonical (reporting hygiene only, no semantic change).
$rendered = & node $cli render --project $projDir --thread "smoke-01" --store-root $homeDir 2>&1 | Out-String
[IO.File]::WriteAllText($expectedPath, ($rendered -replace "`r`n", "`n"), [Text.UTF8Encoding]::new($false))
$expectedHash = (Get-FileHash -LiteralPath $expectedPath -Algorithm SHA256).Hash.ToLower()

$message = "From the provided communication projection only, repeat the LANG-00 canary value exactly."
$intended = "opencode run --standalone --model <LANG00_MODEL> <canary-message> (cwd=$projDir, timeout 300s, single attempt, no retry flags)"

if ($DryRun) {
  Write-Host "DRY-RUN OK (nothing submitted):" -ForegroundColor Green
  Write-Host "  workRoot: $workRoot"
  Write-Host "  project: $projDir (contains a space)"
  Write-Host "  thread: smoke-01 (explicit)"
  Write-Host "  expected block sha256: $expectedHash"
  Write-Host "  canary: $Canary"
  Write-Host "  instrument: $instrumentDir @ $instrumentHead"
  Write-Host "  intended command: $intended"
  Write-Host "  model authorized: $(if ($model) { $model } else { '<unset>' })"
  Write-Host "  residual risks: single-attempt semantics unverified; hook-before-generation ordering observed only via observer capture."
  Remove-Item -LiteralPath $workRoot -Recurse -Force -ErrorAction SilentlyContinue
  exit 0
}

# Live path below. Separate authorisation required; LANG-00 never reaches here.
$env:OPENCODE_CONFIG_DIR = $cfgDir
$env:OPENCODE_DISABLE_PROJECT_CONFIG = "true"
$env:OPENCODE_LANGUAGE_ENABLED = "1"
$env:OPENCODE_LANGUAGE_THREAD_ID = "smoke-01"
$env:OPENCODE_LANGUAGE_HOME = $homeDir
$env:PROJECT_CONTEXT_CAPTURE = "1"
$env:PROJECT_CONTEXT_SPOOL_DIR = $spoolDir
$prevEA = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  $job = Start-Job -ScriptBlock {
    param($cmd, $proj, $m, $msg)
    Set-Location -LiteralPath $proj
    & $cmd run --standalone --model $m $msg 2>&1
  } -ArgumentList $opencodeCmd, $projDir, $model, $message
  $done = Wait-Job -Job $job -Timeout 300
  $out = Receive-Job -Job $job 2>&1 | Out-String
  Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
}
finally {
  $ErrorActionPreference = $prevEA
  Remove-Item "env:OPENCODE_CONFIG_DIR" -ErrorAction SilentlyContinue
  Remove-Item "env:OPENCODE_DISABLE_PROJECT_CONFIG" -ErrorAction SilentlyContinue
  Remove-Item "env:OPENCODE_LANGUAGE_ENABLED" -ErrorAction SilentlyContinue
  Remove-Item "env:OPENCODE_LANGUAGE_THREAD_ID" -ErrorAction SilentlyContinue
  Remove-Item "env:OPENCODE_LANGUAGE_HOME" -ErrorAction SilentlyContinue
  Remove-Item "env:PROJECT_CONTEXT_CAPTURE" -ErrorAction SilentlyContinue
  Remove-Item "env:PROJECT_CONTEXT_SPOOL_DIR" -ErrorAction SilentlyContinue
}
if (-not $done) { Fail "model call exceeded the 300s bound." }
Set-Content -LiteralPath (Join-Path $workRoot "response.txt") -Value $out -Encoding utf8
Write-Host "Live response captured; reconciliation is a separate admitted step. See protocol.md." -ForegroundColor Yellow
Write-Host "Work preserved at: $workRoot (not cleaned on the live path)."
exit 0
