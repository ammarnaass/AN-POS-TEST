@echo off
REM منظومة النشر السريع AN POS لنظام Windows
REM الاستخدام:
REM   release.bat               (تفاعلي مع قائمة خيارات)
REM   release.bat patch         (ترقية patch ونشر فوري)
REM   release.bat minor         (ترقية minor ونشر فوري)
REM   release.bat major         (ترقية major ونشر فوري)
REM   release.bat --current     (إعادة نشر الإصدار الحالي)

cd /d "%~dp0"
node scripts/publish-release.mjs %*
