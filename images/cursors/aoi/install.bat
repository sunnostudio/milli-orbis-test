@echo off
REM MilliOrbis Aoi Cursor — Install via INF (Admin required)
REM Right-click this file -> Run as administrator if double-click fails
echo Installing MilliOrbis-Aoi cursor scheme...
rundll32.exe setupapi,InstallHinfSection DefaultInstall 132 "%~dp0install.inf"
if %errorlevel% neq 0 (
  echo Failed. Try right-click install.inf -> Install as Administrator.
  pause
  exit /b 1
)
echo Done. Open Settings -> Bluetooth ^& devices -> Mouse -> Additional mouse settings -> Pointers and select "MilliOrbis-Aoi".
pause
