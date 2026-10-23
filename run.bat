@echo off
rem Bien dich va chay desktop Java; can JDK 17+ trong PATH.
setlocal
cd /d "%~dp0"
where javac >nul 2>nul
if errorlevel 1 (echo Can cai JDK 17+ va them bin vao PATH. & pause & exit /b 1)
if not exist build mkdir build
if not exist build\backend mkdir build\backend
if not exist build\frontend mkdir build\frontend
dir /s /b backend\src\main\java\*.java > build\backend-sources.txt
javac -encoding UTF-8 --release 17 -d build\backend @build\backend-sources.txt
if errorlevel 1 (pause & exit /b 1)
dir /s /b frontend\src\main\java\*.java > build\frontend-sources.txt
javac -encoding UTF-8 --release 17 -cp build\backend -d build\frontend @build\frontend-sources.txt
if errorlevel 1 (pause & exit /b 1)
java -cp "build\backend;build\frontend" vn.hotel.app.HotelApplication
if errorlevel 1 pause
