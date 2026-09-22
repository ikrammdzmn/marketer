@echo off
REM GMV Max P0 scheduled pull — every 30m via Windows Task Scheduler.
REM Closed-window T-2h + quiet-hours 02:00-06:00 skip live in collector.py.
cd /d "C:\Users\PC CUSTOM\Documents\github\marketer"
C:\Python314\python.exe gmvmax-auto\collector.py >> gmvmax-auto\cache\task.log 2>&1
