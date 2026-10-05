@echo off
rem Marketer — double-click to serve the Metric Scorer tool.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python not found. Install Python 3, tick "Add to PATH", then retry.
  pause
  exit /b 1
)
echo Starting Metric Scorer at http://localhost:8123 ...
echo (Creative tool keeps :8000, scorer uses :8123 so both run side by side.)
timeout /t 2 /nobreak >nul
start "" "http://localhost:8123"
python server.py 8123
pause
