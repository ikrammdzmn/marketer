# run-dashboard.ps1 - launcher for dashboard.py with Sheets support.
#
# Right-click -> "Run with PowerShell" (or double-click with .ps1 association).
# Runs under the spreadsheet-mcp uv env so Google Sheets libs are available.
# Stdlib fallback: if uv not found, runs plain python (Sheets features disabled).
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Forward
)

$ErrorActionPreference = 'Stop'

$DashDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MarketerRoot = Split-Path -Parent (Split-Path -Parent $DashDir)
$ToolsMcp = Join-Path (Split-Path -Parent $MarketerRoot) 'tools\spreadsheet-mcp'
$Engine = Join-Path $DashDir 'dashboard.py'

function Test-Interactive {
  try {
    return [Environment]::UserInteractive -and -not [Console]::IsInputRedirected
  } catch {
    return $false
  }
}

function Stop-WithPause([int]$Code) {
  if (Test-Interactive) {
    if ($Code -ne 0) {
      Write-Host "Exit code $Code - read the error above before closing." -ForegroundColor Red
    }
    [void](Read-Host 'Press Enter to close')
  }
  exit $Code
}

trap {
  Write-Host ("ERROR: " + $_.Exception.Message) -ForegroundColor Red
  Stop-WithPause 1
}

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
if ($UvExe) {
  Write-Host "Starting dashboard with Sheets support (uv env)..."
  Write-Host ""
  & $UvExe --directory $ToolsMcp run python $Engine @Forward
  Stop-WithPause $LASTEXITCODE
} else {
  Write-Host "uv not found - running stdlib fallback (Sheets features DISABLED)."
  Write-Host "Install uv for full features: winget install astral-sh.uv"
  Write-Host ""
  python $Engine @Forward
  Stop-WithPause $LASTEXITCODE
}