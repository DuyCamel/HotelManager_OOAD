@echo off
rem Bien dich utility va kiem tra ket noi SQL Server that, khong mo UI.
setlocal
cd /d "%~dp0"
where javac >nul 2>nul
if errorlevel 1 (echo Can JDK 17+ trong PATH. & pause & exit /b 1)
if not exist build mkdir build
if not exist build\backend mkdir build\backend
dir /s /b backend\src\main\java\*.java > build\backend-sources.txt
javac -encoding UTF-8 --release 17 -d build\backend @build\backend-sources.txt
if errorlevel 1 (pause & exit /b 1)
java -cp "build\backend;lib\*" vn.hotel.infrastructure.database.DatabaseConnectionCheck
if errorlevel 1 (pause & exit /b 1)
pause
