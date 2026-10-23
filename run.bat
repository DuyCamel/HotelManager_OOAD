@echo off
rem Mo ung dung Swing voi repository file hien tai.
setlocal
cd /d "%~dp0"
call scripts\build.bat
if errorlevel 1 (pause & exit /b 1)
java -cp "build\backend;build\frontend" vn.hotel.app.HotelApplication
if errorlevel 1 pause
