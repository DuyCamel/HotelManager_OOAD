@echo off
rem Tao cau hinh rieng cho may nay; khong ghi de file da co.
setlocal
cd /d "%~dp0"
if not exist config\database.properties (
 copy config\database.example.properties config\database.properties >nul
 if errorlevel 1 (echo Khong tao duoc file cau hinh. & pause & exit /b 1)
)
echo Sua db.url, db.user, db.password theo SQL Server tren may cua ban.
echo File nay da duoc gitignore. Xem database\README.md truoc khi ket noi.
notepad config\database.properties
