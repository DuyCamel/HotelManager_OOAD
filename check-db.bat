@echo off
rem Kiem tra JDBC that; khong mo UI, khong sua du lieu SQL.
setlocal
cd /d "%~dp0"
call scripts\build.bat
if errorlevel 1 (pause & exit /b 1)
java -cp "build\backend;backend\database\lib\*;lib\*" vn.hotel.infrastructure.database.DatabaseConnectionCheck
if errorlevel 1 (pause & exit /b 1)
pause
