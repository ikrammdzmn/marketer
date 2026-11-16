# setup-schedule.ps1 - register daily Task Scheduler jobs (local only).
#
# Creates (idempotent, overwrites same names):
#   TikTokSync-Morning  - daily 08:00 -> run-scheduled.ps1 --all --days 7
#   TikTokSync-Evening  - daily 17:00 -> run-scheduled.ps1 --all --days 7
#   TikTokSync-Night    - daily 23:00 -> run-scheduled.ps1 --all --days 7
#   PCShutdown-1AM      - daily 01:00 -> shutdown /s /f /t 120
#   TikTokDashboard-Autostart - at logon -> dashboard.py (so /schedule is live)
#
# Power ON at 07:00 cannot be done by Task Scheduler when the PC is fully
# shut down. Set it in BIOS/UEFI: RTC Alarm / Automatic Power On -> Everyday
# 07:00 (see BIOS_STEPS below). If BIOS has no RTC option, use Sleep instead
# of Shutdown - the three sync tasks have WakeToRun enabled.
#
# Run once from an elevated PowerShell:
#   powershell -ExecutionPolicy Bypass -File setup-schedule.ps1
# ASCII-only by folder rule (no unicode in this file).
$ErrorActionPreference = 'Stop'
$SyncDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Wrapper = Join-Path $SyncDir 'run-scheduled.ps1'
$MorningTime = '08:00'
$EveningTime = '17:00'
$NightTime = '23:00'
$ShutdownTime = '01:00'

function Register-DailyTask([string]$Name, [string]$ActionExe, [string]$ActionArgs, [string]$At, [bool]$Wake) {
  $action = New-ScheduledTaskAction -Execute $ActionExe -Argument $ActionArgs
  $trigger = New-ScheduledTaskTrigger -Daily -At $At
  $settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -WakeToRun:$Wake `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)
  try {
    Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger `
      -Settings $settings -Force | Out-Null
    Write-Host ("OK: {0} daily {1}" -f $Name, $At) -ForegroundColor Green
  } catch {
    Write-Host ("FAIL: {0} - {1}" -f $Name, $_.Exception.Message) -ForegroundColor Red
    throw
  }
}

if (-not (Test-Path -LiteralPath $Wrapper)) {
  Write-Host ("Wrapper not found: {0}" -f $Wrapper) -ForegroundColor Red
  exit 1
}
$SyncArgs = '-NoProfile -ExecutionPolicy Bypass -File "{0}" --all --days 7' -f $Wrapper
Register-DailyTask 'TikTokSync-Morning' 'powershell.exe' $SyncArgs $MorningTime $true
Register-DailyTask 'TikTokSync-Evening' 'powershell.exe' $SyncArgs $EveningTime $true
Register-DailyTask 'TikTokSync-Night' 'powershell.exe' $SyncArgs $NightTime $true

$ShutArgs = '/s /f /t 120 /c "Scheduled nightly shutdown - save your work."'
Register-DailyTask 'PCShutdown-1AM' "$env:SystemRoot\System32\shutdown.exe" $ShutArgs $ShutdownTime $false

$DashPy = Join-Path (Split-Path -Parent $SyncDir) 'dashboard\dashboard.py'
$PyExe = 'python.exe'
try { $p = (Get-Command python -ErrorAction Stop).Source; if ($p) { $PyExe = $p } } catch { }
$DashCmd = '{0} {1}' -f $PyExe, $DashPy
& schtasks /create /tn TikTokDashboard-Autostart /sc onlogon /tr "$DashCmd" /f | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host 'OK: TikTokDashboard-Autostart at logon' -ForegroundColor Green
} else {
  $Startup = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
  $CmdFile = Join-Path $Startup 'TikTokDashboard.cmd'
  '@echo off' | Set-Content -LiteralPath $CmdFile -Encoding Ascii
  Add-Content -LiteralPath $CmdFile -Value ('start "" /min {0} "{1}"' -f $PyExe, $DashPy)
  Write-Host ("OK: schtasks needs admin, used Startup fallback: {0}" -f $CmdFile) -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Done. Verify with: schtasks /query /tn TikTokSync-Morning'
Write-Host '  schtasks /query /tn TikTokSync-Evening'
Write-Host '  schtasks /query /tn TikTokSync-Night'
Write-Host '  schtasks /query /tn PCShutdown-1AM'
Write-Host '  schtasks /query /tn TikTokDashboard-Autostart'
Write-Host '  Open http://127.0.0.1:8080/schedule for status.'
Write-Host ''
Write-Host 'BIOS auto power-ON (07:00 everyday) - do once manually:'
Write-Host '  1) Reboot -> press DEL/F2/F12 into BIOS/UEFI Setup.'
Write-Host '  2) Find Power Management / APM / Advanced: RTC Alarm,'
Write-Host '     Automatic Power On, or Wake on RTC. Enable it.'
Write-Host '  3) Set time 07:00, Everyday. Save and Exit.'
Write-Host '  4) Windows: Power Options -> allow Wake Timers (for Sleep case).'
Write-Host '  Note: if your board has no RTC option, leave the PC in Sleep'
Write-Host '  instead of Shutdown - the sync tasks will wake it.'
