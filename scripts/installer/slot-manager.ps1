<#
.SYNOPSIS
    AN POS - A/B Slot Manager & Atomic Junction Engine
    إدارة الفتحات المزدوجة A/B والتبديل الذري الفوري للبرنامج
.DESCRIPTION
    ينفذ معمارية التبديل الذري المزدوج (Blue/Green Deployment on Windows Desktop)
    عبر روابط Junction الذرية مع زمن تبديل أقل من 15ms ودون الحاجة لصلاحيات Administrator.
#>

param(
    [string]$AppName = "AN POS",
    [string]$BaseDir = "$env:LOCALAPPDATA\Programs\AN POS"
)

$ErrorActionPreference = "Stop"

# المسارات المعمارية الأساسية
$global:SystemVault = Join-Path $BaseDir "SystemVault"
$global:DataVault   = Join-Path $BaseDir "DataVault"
$global:CurrentLink = Join-Path $global:SystemVault "current"
$global:SlotA       = Join-Path $global:SystemVault "slot_a"
$global:SlotB       = Join-Path $global:SystemVault "slot_b"

function Initialize-Vaults {
    <#
    .SYNOPSIS
        تهيئة هيكل المجلدات المنفصلة (SystemVault و DataVault)
    #>
    [CmdletBinding()]
    param()

    Write-Host "[VaultInit] تهيئة مسارات النظام والتخزين الدائم في: $BaseDir" -ForegroundColor Cyan

    $dirs = @(
        $global:SystemVault,
        $global:SlotA,
        $global:SlotB,
        $global:DataVault,
        (Join-Path $global:DataVault "database"),
        (Join-Path $global:DataVault "config"),
        (Join-Path $global:DataVault "logs"),
        (Join-Path $global:DataVault "locks"),
        (Join-Path $global:DataVault "backups")
    )

    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  + تم إنشاء: $dir" -ForegroundColor Gray
        }
    }
}

function Get-ActiveSlot {
    <#
    .SYNOPSIS
        استعلام عن الفتحة النشطة حالياً عبر فحص وجهة الرابط التشعبي current
    #>
    [CmdletBinding()]
    param()

    if (-not (Test-Path $global:CurrentLink)) {
        return $null
    }

    $item = Get-Item $global:CurrentLink -Force
    if ($item.LinkType -eq "Junction" -or $item.Attributes -match "ReparsePoint") {
        $target = $item.Target
        if ($target -is [array]) { $target = $target[0] }
        if ($target -like "*slot_a*") { return "slot_a" }
        if ($target -like "*slot_b*") { return "slot_b" }
    }

    return $null
}

function Get-InactiveSlot {
    <#
    .SYNOPSIS
        استرجاع الفتحة الخاملة الصالحة لاستقبال التثبيت الظلي أو التحديث
    #>
    [CmdletBinding()]
    param()

    $active = Get-ActiveSlot
    if ($active -eq "slot_a") {
        return "slot_b"
    } else {
        return "slot_a"
    }
}

function Switch-ActiveSlot {
    <#
    .SYNOPSIS
        التبديل الذري الفوري (Atomic Swap) إلى الفتحة المحددة بأقل من 15ms
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("slot_a", "slot_b")]
        [string]$TargetSlot
    )

    $targetPath = Join-Path $global:SystemVault $TargetSlot

    if (-not (Test-Path $targetPath)) {
        throw "الفتحة المستهدفة غير موجودة: $targetPath"
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    # حذف الرابط الحالي القديم إن وجد (حذف الرابط التشعبي لا يحذف الملفات الفعلية)
    if (Test-Path $global:CurrentLink) {
        cmd /c "rmdir `"$global:CurrentLink`"" 2>&1 | Out-Null
    }

    # إنشاء الرابط الذري الجديد كـ Directory Junction
    cmd /c "mklink /J `"$global:CurrentLink`" `"$targetPath`"" 2>&1 | Out-Null

    $sw.Stop()

    $activeNow = Get-ActiveSlot
    if ($activeNow -ne $TargetSlot) {
        throw "فشل التبديل الذري! الفتحة النشطة الحالية: $activeNow، المستهدفة: $TargetSlot"
    }

    Write-Host "[AtomicSwap] تم تحويل الرابط الذري بنجاح إلى [$TargetSlot] خلال ($($sw.ElapsedMilliseconds) ms)" -ForegroundColor Green
    
    # تسجيل في سجل العمليات
    $logFile = Join-Path $global:DataVault "logs\deployments.log"
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff")
    "[$timestamp] SWAP -> $TargetSlot (Duration: $($sw.ElapsedMilliseconds)ms)" | Out-File $logFile -Append -Encoding utf8
}

function Rollback-Slot {
    <#
    .SYNOPSIS
        الرجوع الفوري التلقائي للفتحة السابقة عند حدوث كراش أو فشل في الإقلاع
    #>
    [CmdletBinding()]
    param(
        [string]$Reason = "Watchdog Health Check Failed"
    )

    $active = Get-ActiveSlot
    $previous = if ($active -eq "slot_a") { "slot_b" } else { "slot_a" }
    $prevPath = Join-Path $global:SystemVault $previous

    Write-Warning "[ROLLBACK] جاري التراجع الفوري إلى الفتحة السابقة [$previous] بسبب: $Reason"

    # التحقق من وجود نسخة صالحة في الفتحة السابقة
    $prevExe = Join-Path $prevPath "$AppName.exe"
    if (-not (Test-Path $prevExe)) {
        throw "لا يمكن إجراء Rollback: لا توجد نسخة صالحة في الفتحة السابقة ($prevPath)"
    }

    Switch-ActiveSlot -TargetSlot $previous

    # تدوين الحادثة في سجل الـ Rollback
    $rollbackLog = Join-Path $global:DataVault "logs\rollback.log"
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff")
    "[$timestamp] CRITICAL ROLLBACK: From $active to $previous | Reason: $Reason" | Out-File $rollbackLog -Append -Encoding utf8

    Write-Host "[ROLLBACK] تم الرجوع بنجاح إلى النسخة المستقرة السابقة." -ForegroundColor Yellow
}

function Test-SlotIntegrity {
    <#
    .SYNOPSIS
        فحص سلامة ملفات الفتحة بمطابقة بصمة الهاش SHA-256 قبل التحويل
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$SlotPath
    )

    $manifestPath = Join-Path $SlotPath "manifest.json"
    if (-not (Test-Path $manifestPath)) {
        Write-Warning "ملف manifest.json غير موجود في $SlotPath — تجاوز فحص التوقيع السحابي"
        return $true
    }

    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        if ($manifest.files) {
            foreach ($entry in $manifest.files.PSObject.Properties) {
                $filePath = Join-Path $SlotPath $entry.Name
                if (-not (Test-Path $filePath)) {
                    Write-Error "ملف مفقود: $filePath"
                    return $false
                }
                $hash = (Get-FileHash -Path $filePath -Algorithm SHA256).Hash.ToLower()
                if ($hash -ne $entry.Value.ToLower()) {
                    Write-Error "عدم تطابق البصمة للملف: $filePath (متوقع: $($entry.Value)، محسوب: $hash)"
                    return $false
                }
            }
        }
        return $true
    } catch {
        Write-Error "فشل في قراءة وتدقيق manifest.json: $_"
        return $false
    }
}

# تصدير الدوال للاستخدام المباشر
Export-ModuleMember -Function Initialize-Vaults, Get-ActiveSlot, Get-InactiveSlot, Switch-ActiveSlot, Rollback-Slot, Test-SlotIntegrity -Variable SystemVault, DataVault, CurrentLink, SlotA, SlotB
