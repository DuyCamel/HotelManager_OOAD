@echo off
rem Bien dich theo thu tu common, database, service, frontend.
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0.."
where javac >nul 2>nul
if errorlevel 1 (echo Can JDK 17+ trong PATH. & exit /b 1)
if not exist build mkdir build
if exist build\backend rmdir /s /q build\backend
if exist build\frontend rmdir /s /q build\frontend
mkdir build\backend
mkdir build\frontend
for %%M in (common database service) do (
 > build\%%M-sources.txt (
  for /r "backend\%%M\src\main\java" %%F in (*.java) do (
   set "SOURCE_FILE=%%~fF"
   echo "!SOURCE_FILE:\=/!"
  )
 )
 javac -encoding UTF-8 --release 17 -cp build\backend -d build\backend @build\%%M-sources.txt
 if errorlevel 1 exit /b 1
)
> build\frontend-sources.txt (
 for /r "frontend\src\main\java" %%F in (*.java) do (
  set "SOURCE_FILE=%%~fF"
  echo "!SOURCE_FILE:\=/!"
 )
)
javac -encoding UTF-8 --release 17 -cp build\backend -d build\frontend @build\frontend-sources.txt
if errorlevel 1 exit /b 1
echo Bien dich thanh cong: common - database - service - frontend.
exit /b 0
