<#
.SYNOPSIS
    AN POS - Zero-Touch Cold Installer
    المثبت الذري الأولي بنقرة واحدة (Per-User Scope)
.DESCRIPTION
    يقوم بتثبيت AN POS بالكامل في مساحة المستخدم دون طلب أي صلاحيات إدارية (No UAC)،
    ويهيئ معمارية الفتحات المزدوجة (SystemVault و DataVault) مع اختصارات سطح المكتب.
#>

param(
    [string]$SourcePayloadDir = "$PSScriptRoot\..\..\out\win-unpacked",
    [string]$AppName = "AN POS",
    [switch]$LaunchAfterInstall = $true
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         AN POS - معالج التثبيت الذري فائق الاعتمادية        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# استيراد محرك الفتحات المزدوجة
$slotManagerModule = Join-Path $PSScriptRoot "slot-manager.ps1"
if (-not (Test-Path $slotManagerModule)) {
    throw "تعذر العثور على محرك الفتحات: $slotManagerModule"
}
. $slotManagerModule

# 1. تهيئة مساحات التخزين المعزولة
Write-Host "`n[1/5] تهيئة مساحة التخزين المعزولة (SystemVault و DataVault)..." -ForegroundColor Yellow
Initialize-Vaults

# 2. فحص الفتحة المستهدفة
$targetSlot = Get-InactiveSlot
if (-not $targetSlot) { $targetSlot = "slot_a" }
$targetSlotPath = Join-Path $global:SystemVault $targetSlot

Write-Host "[2/5] تجهيز الفتحة الظلية المستهدفة: [$targetSlot]" -ForegroundColor Yellow

# تنظيف الفتحة المستهدفة من أي بقايا سابقة
if (Test-Path $targetSlotPath) {
    Remove-Item -Path $targetSlotPath -Recurse -Force | Out-Null
}
New-Item -ItemType Directory -Path $targetSlotPath -Force | Out-Null

# 3. فك / نقل ملفات الحزمة إلى الفتحة الخاملة
Write-Host "[3/5] نسخ حزمة البرنامج المدمجة بالكامل إلى الفتحة الخاملة..." -ForegroundColor Yellow
if (-not (Test-Path $SourcePayloadDir)) {
    # مسار بديل إن كان المثبت حزمة مضغوطة zip
    $zipArchive = Join-Path $PSScriptRoot "payload.zip"
    if (Test-Path $zipArchive) {
        Write-Host "  -> فك ضغط الأرشيف الذاتي payload.zip..." -ForegroundColor Gray
        Expand-Archive -Path $zipArchive -DestinationPath $targetSlotPath -Force
    } else {
        Write-Warning "تحذير: مجلد الحزمة المصدرية غير موجود في $SourcePayloadDir — تم إنشاء مجلد الفتحة للتجربة."
    }
} else {
    Copy-Item -Path "$SourcePayloadDir\*" -Destination $targetSlotPath -Recurse -Force
}

# 4. فحص سلامة الملفات (Integrity Verification)
Write-Host "[4/5] التحقق من سلامة البصمات وتكامل الحزمة..." -ForegroundColor Yellow
$integrityOk = Test-SlotIntegrity -SlotPath $targetSlotPath
if (-not $integrityOk) {
    Write-Error "فشل فحص سلامة الملفات! إلغاء التثبيت النظيف وتنظيف الفتحة."
    Remove-Item -Path $targetSlotPath -Recurse -Force
    exit 1
}

# 5. التبديل الذري (Atomic Symlink Flip) وإنشاء الاختصارات
Write-Host "[5/5] تفعيل الرابط التشعبي الذري وإنشاء اختصارات التشغيل..." -ForegroundColor Yellow
Switch-ActiveSlot -TargetSlot $targetSlot

# مسار التطبيق التنفيذي عبر الرابط الذري current
$currentExePath = Join-Path $global:CurrentLink "$AppName.exe"

# إنشاء اختصار سطح المكتب (Desktop Shortcut)
$wshShell = New-Object -ComObject WScript.Shell
$desktopDir = [System.Environment]::GetFolderPath('Desktop')
$desktopLnk = Join-Path $desktopDir "$AppName.lnk"
$shortcut = $wshShell.CreateShortcut($desktopLnk)
$shortcut.TargetPath = $currentExePath
$shortcut.WorkingDirectory = $global:CurrentLink
$shortcut.IconLocation = "$currentExePath,0"
$shortcut.Description = "نظام إدارة نقاط البيع AN POS"
$shortcut.Save()

# إنشاء اختصار قائمة ابدأ (Start Menu Shortcut)
$startMenuDir = Join-Path ([System.Environment]::GetFolderPath('StartMenu')) "Programs\$AppName"
if (-not (Test-Path $startMenuDir)) { New-Item -ItemType Directory -Path $startMenuDir -Force | Out-Null }
$startMenuLnk = Join-Path $startMenuDir "$AppName.lnk"
$smShortcut = $wshShell.CreateShortcut($startMenuLnk)
$smShortcut.TargetPath = $currentExePath
$smShortcut.WorkingDirectory = $global:CurrentLink
$smShortcut.IconLocation = "$currentExePath,0"
$smShortcut.Description = "نظام إدارة نقاط البيع AN POS"
$smShortcut.Save()

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "           ✅ اكتمل التثبيت الذري بنجاح وبأمان تام          " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  • المسار النشط: $currentExePath" -ForegroundColor Gray
Write-Host "  • الفتحة النشطة: $targetSlot" -ForegroundColor Gray
Write-Host "  • مجلد البيانات المستقل: $global:DataVault" -ForegroundColor Gray

# 6. التشغيل الفوري إن طُلب
if ($LaunchAfterInstall -and (Test-Path $currentExePath)) {
    Write-Host "`n[+] تشغيل التطبيق فوراً..." -ForegroundColor Cyan
    Start-Process -FilePath $currentExePath
}
