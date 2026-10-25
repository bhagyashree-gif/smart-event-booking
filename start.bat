@echo off
title Smart Event & Ticket Booking System
echo ================================================================
echo  Launching Smart Event ^& Ticket Booking System (SQLite DBMS)
echo ================================================================
cd /d "%~dp0"

echo Starting backend server on port 5000 and opening browser ...
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"
npm start
pause
