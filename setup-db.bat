@echo off
title Initialize SQLite Database
echo ================================================================
echo  Initializing Smart Event Booking Database (6 Tables)
echo ================================================================
cd /d "%~dp0"
npm run setup-db
pause
