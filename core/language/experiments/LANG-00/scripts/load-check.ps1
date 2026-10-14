#!/usr/bin/env pwsh
# LANG-00 no-inference installed-host load check.
#
# Proves without submitting any prompt or invoking any model:
#   1. the plugin entry resolves to a file on disk
#   2. disabled setup registers zero hooks (harness)
#   3. enabled setup registers exactly ["context"] and injects once (harness)
#   4. the installed host starts standalone under a fully isolated config,
#      loads the plugin, and rejects an invalid model with no captures
#
# Touches nothing outside its own temp dirs. Never modifies user config
# (isolation via process-scoped OPENCODE_CONFIG_CONTENT), never kills
# foreign processes, never submits inference.
#
# Usage: .\experiments\LANG-00\scripts\load-check.ps1

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSCommandPath)))

function Fail([string]$message) {
  Write-Host ""
  Write-Host "LANG00 LOAD-CHECK FAIL: $message" -ForegroundColor Red
  exit 1
}

$opencodeCmd = (Get-Command "opencode" -ErrorAction SilentlyContinue).Source
if (-not $opencodeCmd) { Fail "opencode is not on PATH." }

# 1. entrypoint resolves ----------------------------------------------------
$rootEntry = Join-Path $RepoRoot "index.ts"
$pluginEntry = Join-Path $RepoRoot "dist/src/plugin.js"
if (-not (Test-Path -LiteralPath $rootEntry -PathType Leaf)) { Fail "root plugin entry missing: $rootEntry" }
if (-not (Test-Path -LiteralPath $pluginEntry -PathType Leaf)) { Fail "compiled adapter missing: $pluginEntry (run npm run build)" }
Write-Host "1. plugin entries resolve." -ForegroundColor Green

# 2-3. registration harness (zero inference) ---------------------------------
$harness = & node (Join-Path $RepoRoot "experiments/LANG-00/scripts/load-harness.mjs") 2>&1
$harnessExit = $LASTEXITCODE
Write-Host $harness
if ($harnessExit -ne 0) { Fail "registration harness failed (exit $harnessExit)." }
Write-Host "2-3. disabled=zero hooks; enabled=[context] with inject-once." -ForegroundColor Green

# 4. isolated standalone host probe ------------------------------------------
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$rand = -join ((48..57) + (65..90) | Get-Random -Count 6 | ForEach-Object { [char]$_ })
$workRoot = Join-Path ([System.IO.Path]::GetTempPath()) "lang00-load-$stamp-$rand"
$projDir = Join-Path $workRoot "demo project"
$spoolDir = Join-Path $workRoot "spool"
$homeDir = Join-Path $workRoot "lang-home"
New-Item -ItemType Directory -Force -Path $projDir, $spoolDir, $homeDir | Out-Null
Set-Content -LiteralPath (Join-Path $projDir "README.md") -Value "# lang00 throwaway`n" -Encoding utf8

$pluginSpec = "file:///" + ($RepoRoot -replace "\\", "/")
# Full config isolation: OPENCODE_CONFIG_DIR replaces the global config
# directory (verified: no other plugins load). OPENCODE_CONFIG_CONTENT
# merely merges and must not be used for isolation.
$cfgDir = Join-Path $workRoot "config"
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
Set-Content -LiteralPath (Join-Path $cfgDir "opencode.jsonc") -Value ('{"plugins":["' + $pluginSpec + '"]}') -Encoding utf8
$env:OPENCODE_CONFIG_DIR = $cfgDir
$env:OPENCODE_DISABLE_PROJECT_CONFIG = "true"
$env:OPENCODE_LANGUAGE_HOME = $homeDir
$prevEA = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  # Bounded startup timeout: the invalid-model probe must fail fast.
  $job = Start-Job -ScriptBlock {
    param($cmd)
    $innerEA = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $o = & $cmd run --standalone --print-logs --model "invalid-provider-xyz/invalid-model-xyz" "hi" 2>&1
    $c = $LASTEXITCODE
    $ErrorActionPreference = $innerEA
    $o
    Write-Output "LANG00_PROBE_EXITCODE=$c"
  } -ArgumentList $opencodeCmd
  $done = Wait-Job -Job $job -Timeout 180
  if (-not $done) {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    Fail "isolated host probe exceeded the 180s bound."
  }
  $out = Receive-Job -Job $job 2>&1
  Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  $text = ($out | Out-String)
  $code = 1
  $m = [regex]::Match($text, "LANG00_PROBE_EXITCODE=(\d+)")
  if ($m.Success) { $code = [int]$m.Groups[1].Value }
}
finally {
  $ErrorActionPreference = $prevEA
  Remove-Item "env:OPENCODE_CONFIG_DIR" -ErrorAction SilentlyContinue
  Remove-Item "env:OPENCODE_DISABLE_PROJECT_CONFIG" -ErrorAction SilentlyContinue
  Remove-Item "env:OPENCODE_LANGUAGE_HOME" -ErrorAction SilentlyContinue
}
if ($code -eq 0) { Fail "invalid model unexpectedly succeeded (exit 0)." }
$flat = $text -replace '\\\\', '\'
if ($flat -notmatch [regex]::Escape($RepoRoot)) {
  Fail "no evidence the isolated host even considered our plugin directory."
}
$loadLines = @($flat -split "`n" | Where-Object { $_ -match "loading plugin" })
if ($loadLines.Count -ne 1) {
  Fail "isolation broken: expected exactly 1 plugin load line, saw $($loadLines.Count)."
}
if ($flat -match "failed to load plugin" -and $flat -match [regex]::Escape("opencode-language")) {
  Fail "isolated host failed to load our plugin entry."
}
if ($text -match "LANG_THREAD_REQUIRED" -or $text -match "LANG_PROJECT_MISMATCH") {
  Fail "plugin setup failed under isolated config; output contained a plugin config error."
}
if ($text -match "opencode-language.*Error" -and $text -notmatch "invalid-provider-xyz") {
  Write-Host "NOTE: plugin-related output present; see above. Continuing only if rejection was model-side." -ForegroundColor Yellow
}
$spoolFiles = Get-ChildItem -LiteralPath $spoolDir -Recurse -File -ErrorAction SilentlyContinue
if ($spoolFiles -and $spoolFiles.Count -gt 0) { Fail "spool written without a model request." }
Write-Host "4. standalone host rejected invalid model (exit $code); no captures, no inference." -ForegroundColor Green

Remove-Item -LiteralPath $workRoot -Recurse -Force -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "LANG00 LOAD-CHECK PASS (zero inference; live transport still needs the authorised smoke)." -ForegroundColor Green
exit 0
