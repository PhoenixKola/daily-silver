@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (echo Node.js 18+ required. & pause & exit /b 1)
echo.
echo DAILY SILVER - OPTIONAL 251 SPECIES UPGRADE
echo This requires a one-time internet connection to pokeapi.co and GitHub.
echo It does not erase your saves or your existing sprites.
echo.
node tools\expand-roster.mjs
if errorlevel 1 (echo Species expansion failed. Original 135 remain playable. & pause & exit /b 1)
node tools\download-sprites.mjs
if errorlevel 1 (echo Sprite download incomplete. Retry this launcher when online. & pause & exit /b 1)
echo.
echo Upgrade completed. Launch PLAY-ON-WINDOWS.bat to play with 251 species.
pause
