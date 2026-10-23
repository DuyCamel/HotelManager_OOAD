@echo off
rem Tao cau hinh rieng; giu nguyen file da co, ho tro cau hinh cu.
setlocal
cd /d "%~dp0"
if not exist backend\database\config\database.properties (
 if exist config\database.properties (
  copy config\database.properties backend\database\config\database.properties >nul
 ) else (
  copy backend\database\config\database.example.properties backend\database\config\database.properties >nul
 )
 if errorlevel 1 (echo Khong tao duoc file cau hinh. & pause & exit /b 1)
)
echo Huong dan: backend\database\HUONG_DAN_KET_NOI.md
echo Sua db.url, db.user, db.password theo SQL Server may cua ban.
notepad backend\database\config\database.properties
