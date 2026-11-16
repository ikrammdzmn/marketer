# run-scheduled.ps1 - non-interactive wrapper for Task Scheduler (local only).
#
# Runs sheet-sync.py --all --days 7 via the spreadsheet-mcp uv env and
# appends all output to logs/sync-YYYY-MM-DD.log. Exit code preserved.
# Called by the two daily tasks created in setup-schedule.ps1.
# ASCII-only by folder rule (no unicode in this file).
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Forward
)
$ErrorActionPreference = 'Stop'
$SyncDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MarketerRoot = Split-Path -Parent (Split-Path -Parent $SyncDir)
$Level1 = Split-Path -Parent $MarketerRoot
$Level2 = Split-Path -Parent $Level1
$ToolsMcp = $null
foreach ($base in @($Level1, $Level2)) {
  foreach ($rel in @('tools\tools\spreadsheet-mcp', 'tools\spreadsheet-mcp')) {
    if (-not $base) { continue }
    $cand = Join-Path $base $rel
    if (Test-Path -LiteralPath $cand) { $ToolsMcp = $cand; break }
  }
  if ($ToolsMcp) { break }
}
$Engine = Join-Path $SyncDir 'sheet-sync.py'
$LogDir = Join-Path $SyncDir 'logs'
if (-not (Test-Path -LiteralPath $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}
$Stamp = Get-Date -Format 'yyyy-MM-dd'
$LogFile = Join-Path $LogDir ("sync-" + $Stamp + ".log")
function Get-UvExe {
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
$UvExe = Get-UvExe
$Header = "===== {0} scheduled sync start =====" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Add-Content -LiteralPath $LogFile -Value $Header
if (-not $UvExe) {
  Add-Content -LiteralPath $LogFile -Value 'ERROR: uv not found.'
  exit 1
}
if (-not $ToolsMcp) {
  Add-Content -LiteralPath $LogFile -Value 'ERROR: spreadsheet-mcp folder not found.'
  exit 1
}
if (-not $Forward -or $Forward.Count -eq 0) {
  $Forward = @('--all', '--days', '7')
}
$Cmd = '{0} --directory "{1}" run python "{2}" {3}' -f $UvExe, $ToolsMcp, $Engine, ($Forward -join ' ')
Add-Content -LiteralPath $LogFile -Value ("Running: " + $Cmd)
$Out = & $UvExe --directory $ToolsMcp run python $Engine @Forward 2>&1 | Out-String
$Code = $LASTEXITCODE
Add-Content -LiteralPath $LogFile -Value $Out
Add-Content -LiteralPath $LogFile -Value ("===== exit {0} at {1} =====" -f $Code, (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
exit $Code
