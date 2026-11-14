@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js 18 or newer is required. Visit https://nodejs.org/
 pause
 exit /b 1
)
echo.
echo DAILY SILVER 2.0 - SUMMIT EDITION
echo Verifying your installed Pokemon artwork files...
echo First run needs internet to fetch sprite images. Your existing assets are preserved.
node tools\download-sprites.mjs
if errorlevel 1 (
 echo.
 echo Artwork installation FAILED. Connect to the internet and retry.
 echo The game will not display abstract placeholders instead.
 pause
 exit /b 1
)
echo.
echo All sprite artwork installed. Starting fully local server...
start "Daily Silver Server" cmd /k "node tools\server.mjs"
timeout /t 2 /nobreak >nul
start "" "http://localhost:4182"
echo Daily Silver is running at http://localhost:4182
