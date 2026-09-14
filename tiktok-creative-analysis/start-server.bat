@echo off
rem Marketer — double-click to serve the TikTok Creative Analysis tool.
rem No IDE / Live Server needed. Keep this window open while using the page;
rem closing it stops the server.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python not found. Install Python 3, tick "Add to PATH", then retry.
  pause
  exit /b 1
)
echo Starting Marketer server at http://localhost:8000 ...
echo (Keep this window open. Closing it stops the server.)
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000"
python server.py
pause
