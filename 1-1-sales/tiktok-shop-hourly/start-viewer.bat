@echo off
rem Marketer - double-click to view the Shop Hourly Report.
rem No IDE / Live Server needed. Keep this window open while using the page;
rem closing it stops the server.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python not found. Install Python 3, tick "Add to PATH", then retry.
  pause
  exit /b 1
)
echo Starting Shop Hourly viewer at http://127.0.0.1:8130/index.html ...
echo (Keep this window open. Closing it stops the server.)
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8130/index.html"
python -m http.server 8130 -b 127.0.0.1
pause
