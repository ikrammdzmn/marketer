# run-sync.ps1 - interactive launcher for sheet-sync.py (local only).
#
# Right-click -> "Run with PowerShell" (or double-click with .ps1 association),
# answer 2-3 prompts, done. No TTY / piped input -> safe default (--all --days 7).
# Explicit args are forwarded straight to the engine (scheduler-friendly):
#   .\run-sync.ps1 --all --today --dry-run
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Forward
)

$ErrorActionPreference = 'Stop'

$SyncDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MarketerRoot = Split-Path -Parent (Split-Path -Parent $SyncDir)
$ToolsMcp = Join-Path (Split-Path -Parent $MarketerRoot) 'tools\spreadsheet-mcp'
$Engine = Join-Path $SyncDir 'sheet-sync.py'
$AccountsJson = Join-Path $MarketerRoot 'tiktok-creative-analysis\data\accounts.json'

function Test-Interactive {
  try {
    return [Environment]::UserInteractive -and -not [Console]::IsInputRedirected
  } catch {
    return $false
  }
}

function Stop-WithPause([int]$Code) {
  # Every exit funnels here so an Explorer-launched window never vanishes
  # on an error. Scheduler/pipe runs (non-interactive) exit silently.
  if (Test-Interactive) {
    if ($Code -ne 0) {
      Write-Host "Exit code $Code - read the error above before closing." -ForegroundColor Red
    }
    [void](Read-Host 'Press Enter to close')
  }
  exit $Code
}

# Any unexpected terminating error: show it, pause, then exit 1.
trap {
  Write-Host ("ERROR: " + $_.Exception.Message) -ForegroundColor Red
  Stop-WithPause 1
}

function Get-UvExe {
  # Bare `uv` resolves after a shell restart (WinGet PATH refresh); older or
  # Explorer-launched shells may lack it - fall back to the package path.
  $c = Get-Command uv -ErrorAction SilentlyContinue
  if ($c) { return 'uv' }
  $pkg = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
  $hit = Get-ChildItem -Path $pkg -Filter 'astral-sh.uv_*' -Directory `
    -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($hit) {
    $exe = Join-Path $hit.FullName 'uv.exe'
    if (Test-Path -LiteralPath $exe) { return $exe }
  }
  return $null
}

function Get-AccountNames {
  try {
    $all = Get-Content -LiteralPath $AccountsJson -Raw | ConvertFrom-Json
    return @($all | Where-Object { $_.active } | Select-Object -First 10 -ExpandProperty name)
  } catch {
    return @()
  }
}

function Read-Date($prompt, $required) {
  while ($true) {
    $v = (Read-Host $prompt).Trim()
    if (-not $v -and -not $required) { return '' }
    if ($v -match '^\d{4}-\d{2}-\d{2}$') {
      try {
        [void][datetime]::ParseExact($v, 'yyyy-MM-dd', $null)
        return $v
      } catch { }
    }
    Write-Host '  Use YYYY-MM-DD (e.g. 2026-09-15).' -ForegroundColor Yellow
  }
}

function Invoke-Engine([string[]]$EngineArgs) {
  Write-Host ''
  Write-Host ('Running: uv --directory "{0}" run python "{1}" {2}' -f $ToolsMcp, $Engine, ($EngineArgs -join ' '))
  Write-Host ''
  & $UvExe --directory $ToolsMcp run python $Engine @EngineArgs
  # NOTE: no `return` here - callers read $LASTEXITCODE directly, and any
  # returned value would print to stdout. $LASTEXITCODE survives Write-Host.
}

$UvExe = Get-UvExe
if (-not $UvExe) {
  Write-Host 'uv not found. Install via: winget install astral-sh.uv' -ForegroundColor Red
  Write-Host 'then close and reopen the terminal (WinGet PATH refresh).' -ForegroundColor Red
  Stop-WithPause 1
}

# --- forwarded args: no menus -------------------------------------------------
# NOTE: call without assignment so engine stdout streams to console.
if ($Forward -and $Forward.Count -gt 0) {
  Invoke-Engine $Forward
  Stop-WithPause $LASTEXITCODE
}

$interactive = Test-Interactive
if (-not $interactive) {
  Write-Host 'Non-interactive shell: running safe default --all --days 7.'
  Invoke-Engine @('--all', '--days', '7')
  Stop-WithPause $LASTEXITCODE
}

# --- interactive menu loop (Repeat same / Main menu / Exit at the end) --------
$skipMenus = $false
while ($true) {
if (-not $skipMenus) {
# --- 1) window ----------------------------------------------------------------
Write-Host '=== TikTok -> Sheets sync ==='
Write-Host '  1) Today only (intraday top-up)'
Write-Host '  2) Yesterday only (missed-day catch-up)'
Write-Host '  3) Last 7 days incl. today (daily routine) [default]'
Write-Host '  4) Custom dates (gap fill)'
Write-Host '  5) All-time backfill (once, ~15-30 min, supervised)'
$choice = (Read-Host 'Window [1-5, Enter=3]').Trim()
if (-not $choice) { $choice = '3' }

$windowArgs = @()
$windowLabel = ''
$confirmFull = $false
switch ($choice) {
  '1' { $windowArgs = @('--today'); $windowLabel = 'today' }
  '2' { $windowArgs = @('--yesterday'); $windowLabel = 'yesterday' }
  '3' { $windowArgs = @('--days', '7'); $windowLabel = 'last 7 days incl. today' }
  '4' {
    while ($true) {
      $since = Read-Date 'Since YYYY-MM-DD (required)' $true
      $until = Read-Date 'Until YYYY-MM-DD (empty = today)' $false
      if (-not $until -or $since -le $until) { break }
      Write-Host '  --since is after --until, try again.' -ForegroundColor Yellow
    }
    $windowArgs = @('--since', $since)
    if ($until) { $windowArgs += @('--until', $until) }
    $windowLabel = if ($until) { "$since..$until" } else { "$since..today" }
  }
  '5' { $windowArgs = @('--full'); $windowLabel = 'ALL TIME'; $confirmFull = $true }
  default {
    Write-Host 'Unknown choice, using default: last 7 days.' -ForegroundColor Yellow
    $windowArgs = @('--days', '7'); $windowLabel = 'last 7 days incl. today'
  }
}

# --- 2) scope ------------------------------------------------------------------
$names = Get-AccountNames
$accountArgs = @('--all')
$scopeLabel = 'all accounts'
if ($names.Count -gt 0) {
  Write-Host ''
  Write-Host 'Scope: [A]ll [default]'
  for ($i = 0; $i -lt $names.Count; $i++) {
    Write-Host ('  {0}) {1}' -f ($i + 1), $names[$i])
  }
  $scope = (Read-Host 'Scope [A, 1-10, B=back, Enter=A]').Trim().ToUpper()
  if ($scope -eq 'B') { Write-Host ''; continue }
  if ($scope -match '^\d+$' -and [int]$scope -ge 1 -and [int]$scope -le $names.Count) {
    $pick = $names[[int]$scope - 1]
    $accountArgs = @('--account', $pick)
    $scopeLabel = $pick
  } elseif ($scope -and $scope -ne 'A') {
    Write-Host 'Unknown scope, using: all accounts.' -ForegroundColor Yellow
  }
} else {
  Write-Host '(accounts.json unreadable: scope locked to --all)' -ForegroundColor Yellow
}
} # end if (-not $skipMenus)
$skipMenus = $false

if ($confirmFull) {
  Write-Host ''
  $sure = (Read-Host 'All-time backfill takes ~15-30 min. Proceed? [y/N]').Trim().ToUpper()
  if ($sure -ne 'Y') { Write-Host 'Cancelled, nothing ran.'; continue }
}

# --- 3) preview then run --------------------------------------------------------
Write-Host ''
Write-Host "Window: $windowLabel | Scope: $scopeLabel" -ForegroundColor Cyan
$preview = (Read-Host 'Dry-run preview first? [y/N]').Trim().ToUpper()
if ($preview -eq 'Y') {
  Invoke-Engine ($accountArgs + $windowArgs + @('--dry-run'))
  $code = $LASTEXITCODE
  if ($code -ne 0) { Write-Host "Preview exited ($code), stopping." -ForegroundColor Red; Stop-WithPause $code }
  Write-Host ''
  $go = (Read-Host 'Proceed for real? [y/N]').Trim().ToUpper()
  if ($go -ne 'Y') { Write-Host 'Cancelled, sheet untouched.'; continue }
}

Invoke-Engine ($accountArgs + $windowArgs)
$code = $LASTEXITCODE
Write-Host ''
if ($code -eq 0) {
  Write-Host 'Done. Check the Dashboard tab for fresh totals.' -ForegroundColor Green
} else {
  Write-Host "Finished with exit code $code (see errors above)." -ForegroundColor Red
}
Write-Host ''
$again = (Read-Host 'Run again? [R]epeat same / [M]ain menu / Enter=exit').Trim().ToUpper()
if ($again -eq 'R') { $skipMenus = $true; Write-Host ''; continue }
if ($again -eq 'M') { Write-Host ''; continue }
Stop-WithPause $code
} # end while menu loop
