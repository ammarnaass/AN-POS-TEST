@echo off
setlocal
title AN POS - معالج التثبيت الذري
chcp 65001 >nul

echo ========================================================
echo        AN POS - جاري تثبيت النظام الذري (نقرة واحدة)
echo ========================================================
echo.

if exist "%~dp0splash\show-splash.ps1" (
    start "" /b powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0splash\show-splash.ps1"
    exit /b 0
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-cold.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ فشل التثبيت! يرجى مراجعة رسائل الخطأ أعلاه.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ✅ تم التثبيت بنجاح. سيتم فتح البرنامج الآن.
timeout /t 2 >nul
exit /b 0
