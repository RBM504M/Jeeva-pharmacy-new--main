@echo off
setlocal
echo ============================================================
echo   Installing Jeeva Pharmacy Certificate as Trusted Root
echo ============================================================
echo.

:: Check for Administrator permissions
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This script must be run as Administrator!
    echo Please right-click this file and select 'Run as administrator'.
    echo.
    pause
    exit /b 1
)

set CER_FILE=%~dp0JeevaPharmacy.cer

if not exist "%CER_FILE%" (
    echo [ERROR] JeevaPharmacy.cer was not found in: %~dp0
    echo Please ensure JeevaPharmacy.cer is located in the same folder.
    echo.
    pause
    exit /b 1
)

echo [+] Importing into Trusted Root Certification Authorities...
certutil -addstore -f "Root" "%CER_FILE%"

echo.
echo [+] Importing into Trusted Publishers...
certutil -addstore -f "TrustedPublisher" "%CER_FILE%"

echo.
echo ============================================================
echo   Certificate successfully installed!
echo   Jeeva Pharmacy executables will now run without
echo   Windows Defender SmartScreen blocks on this machine.
echo ============================================================
echo.
pause
