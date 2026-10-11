@echo off
title Athena Library Database Management System
echo ========================================================
echo    Starting Athena Library Database Management System
echo ========================================================
echo.
echo Launching local server on http://localhost:3000 ...
start "" http://localhost:3000
"C:\Users\VIKRAM V\AppData\Roaming\Antigravity\bin\agy-node.cmd" server.js
pause
