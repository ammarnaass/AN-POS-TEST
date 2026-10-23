; ==============================================================================
; AN POS - NSIS Custom Installer Script
; يدعم أنظمة Windows 10 و Windows 11 (الحد الأدنى لـ Electron 40+ و Node 22+)
; للمعماريات: x64 (64-bit)
; يتولى:
; 1. التحقق من توافق نظام التشغيل (Windows 10+ 64-bit)
; 2. إظهار تفاصيل الملفات المستخرجة وسجل التثبيت تلقائياً
; 3. إظهار النسبة المئوية لتقدم التثبيت في شريط العنوان وسجل التفاصيل
; 4. تخصيص مسار التثبيت الافتراضي C:\AN POS للتثبيت الجديد
; 5. تجهيز البيئة، إنشاء مجلدات قاعدة البيانات، ضبط جدار حماية ويندوز (Private/Domain)
; 6. أخذ نسخة احتياطية وقائية فورية تشمل ملفات WAL و SHM قبل الترقية
; 7. حماية البيانات والنسخ الاحتياطية وملف الترخيص عند إلغاء التثبيت
; ==============================================================================

!include "LogicLib.nsh"
!include "WinVer.nsh"

; --- إعدادات واجهة التثبيت وإظهار تفاصيل الملفات والتقدم ---
!macro customHeader
  ; إظهار تفاصيل استخراج الملفات وسجل التثبيت تلقائياً للمستخدم دون الحاجة للضغط على Show Details
  ShowInstDetails show
  ShowUninstDetails show
  InstProgressFlags smooth
!macroend

!macro customInit
  ; 1. التحقق من توافق نظام التشغيل: Windows 10 / Windows 11 أو أحدث (M12)
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "يتطلب نظام AN POS العمل على نظام تشغيل Windows 10 أو Windows 11 أو أحدث (64-bit).$\n$\nالإصدار الحالي من Windows غير مدعوم لتشغيل محرك قاعدة البيانات والتقنيات الحديثة للنظام."
    Quit
  ${EndIf}

  ; 2. تحديد مسار التثبيت الافتراضي:
  ; في نموذج التثبيت لكل مستخدم (Per-User)، التثبيت الافتراضي في مجلد برامج المستخدم المحلي لتفادي UAC
  ; وفي حال وجود تثبيت قديم في C:\AN POS يتم الحفاظ على مساره
  ${IfNot} ${isUpdated}
    ${If} ${FileExists} "C:\AN POS\AN POS.exe"
      StrCpy $INSTDIR "C:\AN POS"
    ${Else}
      StrCpy $INSTDIR "$LOCALAPPDATA\Programs\AN POS"
    ${EndIf}
  ${EndIf}

  ; 3. محاولة إجراء تفريغ سجل المعاملات والنسخ الذري قبل إغلاق التطبيق (CLI A3: --prepare-upgrade)
  ${If} ${FileExists} "$INSTDIR\AN POS.exe"
    nsExec::Exec '"$INSTDIR\AN POS.exe" --prepare-upgrade "$APPDATA\an-pos\backups"'
  ${EndIf}

  ; 4. إغلاق أي نسخة نشطة قيد التشغيل بأمان لتفادي أخطاء قفل الملفات (File Lock) أثناء التحديث
  nsExec::Exec 'taskkill /IM "AN POS.exe"'
  Sleep 500
  nsExec::Exec 'taskkill /F /IM "AN POS.exe" /T'
!macroend

!macro customInstall
  SetDetailsPrint both

  ; 1. إنشاء مجلدات العمل وقاعدة البيانات والنسخ الاحتياطي في AppData
  CreateDirectory "$APPDATA\an-pos"
  CreateDirectory "$APPDATA\an-pos\backups"
  CreateDirectory "$APPDATA\an-pos\logs"

  ; 2. فحص نوع التثبيت: تحديث لنسخة قائمة أم تثبيت جديد بالكامل
  ${If} ${FileExists} "$APPDATA\an-pos\anpos.db"
    ; --- مسار تحديث البرنامج (Update / Upgrade Mode) ---
    SendMessage $HWNDPARENT 0x000C 0 "STR:AN POS v${VERSION} - تحديث البرنامج وتأمين قاعدة البيانات (80%)"
    DetailPrint "[80%] تم اكتشاف نسخة سابقة: جاري ترقية البرنامج إلى الإصدار v${VERSION} وتأمين قاعدة البيانات القائمة..."

    ; أخذ نسخة احتياطية وقائية فورية لقاعدة البيانات الحالية لضمان Zero Data Loss
    ; استخدام طابع زمني كامل بالثواني ($6) لمنع الكتابة فوق نسخ احتياطية سابقة (C6 / M2)
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    ClearErrors
    CopyFiles /SILENT "$APPDATA\an-pos\anpos.db" "$APPDATA\an-pos\backups\pre_upgrade_$2$1$0_$4$5$6.db"
    ${If} ${Errors}
      DetailPrint "[85%] تحذير: تعذر نسخ anpos.db احتياطياً (قد يكون القرص ممتلئاً)"
    ${Else}
      DetailPrint "[85%] تم أخذ نسخة احتياطية وقائية: backups\pre_upgrade_$2$1$0_$4$5$6.db"
    ${EndIf}

    ; نسخة احتياطية لملف WAL والذاكرة المشتركة SHM لضمان عدم فقدان أي عمليات غير مفرغة (Uncheckpointed WAL Frames)
    ${If} ${FileExists} "$APPDATA\an-pos\anpos.db-wal"
      CopyFiles /SILENT "$APPDATA\an-pos\anpos.db-wal" "$APPDATA\an-pos\backups\pre_upgrade_$2$1$0_$4$5$6.db-wal"
      CopyFiles /SILENT "$APPDATA\an-pos\anpos.db-wal" "$APPDATA\an-pos\backups\pre_upgrade_backup.db-wal"
      DetailPrint "[85%] تم تأمين ملف سجل المعاملات الحديثة: anpos.db-wal"
    ${EndIf}
    ${If} ${FileExists} "$APPDATA\an-pos\anpos.db-shm"
      CopyFiles /SILENT "$APPDATA\an-pos\anpos.db-shm" "$APPDATA\an-pos\backups\pre_upgrade_$2$1$0_$4$5$6.db-shm"
      CopyFiles /SILENT "$APPDATA\an-pos\anpos.db-shm" "$APPDATA\an-pos\backups\pre_upgrade_backup.db-shm"
    ${EndIf}

    ; نسخة ثابتة الاسم للتوافق مع الاختبارات والمراجع
    CopyFiles /SILENT "$APPDATA\an-pos\anpos.db" "$APPDATA\an-pos\backups\pre_upgrade_backup.db"
  ${ElseIf} ${FileExists} "$APPDATA\an-pos\an-pos.db"
    ; --- مسار ترحيل من إصدار قديم (Legacy Migration Mode) ---
    SendMessage $HWNDPARENT 0x000C 0 "STR:AN POS v${VERSION} - ترحيل وتأمين قاعدة البيانات القديمة (80%)"
    DetailPrint "[80%] تم اكتشاف قاعدة بيانات سابقة an-pos.db: جاري الترحيل الآمن إلى الإصدار v${VERSION}..."
    CopyFiles /SILENT "$APPDATA\an-pos\an-pos.db" "$APPDATA\an-pos\anpos.db"
    CopyFiles /SILENT "$APPDATA\an-pos\an-pos.db" "$APPDATA\an-pos\backups\pre_upgrade_backup.db"
    DetailPrint "[85%] تم ترحيل وتأمين قاعدة البيانات بنجاح في: anpos.db"
  ${Else}
    ; --- مسار التثبيت الجديد بالكامل (Clean / Fresh Install Mode) ---
    SendMessage $HWNDPARENT 0x000C 0 "STR:AN POS v${VERSION} - تجهيز بيئة التشغيل الجديدة (80%)"
    DetailPrint "[80%] تثبيت جديد بالكامل (v${VERSION}): جاري تهيئة مجلدات النظام وقاعدة البيانات..."
  ${EndIf}

  DetailPrint "[90%] مجلد بيانات المستخدم: $APPDATA\an-pos"

  ; 3. إضافة استثناء محكم في جدار حماية ويندوز (Windows Defender Firewall) - شبكات العمل والمنزل الخاصة فقط (H4)
  SendMessage $HWNDPARENT 0x000C 0 "STR:AN POS - ضبط استثناء جدار حماية ويندوز (95%)"
  DetailPrint "[95%] تجهيز استثناء جدار حماية ويندوز لخدمة الشبكة المحلية الآمنة (Port 3000, profile=private,domain, remoteip=localsubnet)..."
  nsExec::Exec 'netsh advfirewall firewall delete rule name="AN POS LAN Server"'
  nsExec::ExecToStack 'netsh advfirewall firewall add rule name="AN POS LAN Server" dir=in action=allow protocol=TCP localport=3000 profile=private,domain remoteip=localsubnet'
  Pop $0
  ${If} $0 == 0
    DetailPrint "[95%] تم تفعيل قاعدة جدار الحماية بنجاح للشبكات الموثوقة (Private/Domain)"
  ${Else}
    DetailPrint "[95%] ملاحظة: لم يتمكن المثبت من إضافة قاعدة جدار الحماية تلقائياً (رمز: $0)"
  ${EndIf}

  SendMessage $HWNDPARENT 0x000C 0 "STR:AN POS v${VERSION} - اكتملت العملية بنجاح (100%)"
  DetailPrint "[100%] اكتملت عملية التثبيت والتحديث بنجاح تام! (v${VERSION})"
!macroend

!macro customUnInit
  ; إظهار تفاصيل إزالة التثبيت وحذف الملفات للمستخدم
  SetDetailsPrint both
!macroend

!macro customUnInstall
  DetailPrint "جاري إزالة قواعد جدار الحماية وملفات النظام..."
  ; 1. حذف قاعدة جدار الحماية عند إزالة التثبيت
  nsExec::Exec 'netsh advfirewall firewall delete rule name="AN POS LAN Server"'

  ; 2. فحص الوضع الصامت (Silent Uninstallation) - حماية البيانات تلقائياً ومنع أي توقف (B6 / M8)
  ${If} ${Silent}
    DetailPrint "إلغاء تثبيت صامت: يتم الحفاظ على بيانات المستخدم والترخيص تلقائياً دون مقاطعة."
    Goto doneUnInstall
  ${EndIf}

  ; 3. سؤال المستخدم إن كان يرغب في حذف بيانات قاعدة البيانات أو الإبقاء عليها
  ; زر (لا) هو الافتراضي (MB_DEFBUTTON2) لمنع الحذف العرضي
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "هل ترغب في حذف بيانات قاعدة البيانات وسجلات المبيعات والنسخ الاحتياطية نهائياً من هذا الجهاز؟$\n$\nتحذير: اختيار (نعم) سيؤدي لحذف جميع سجلات وبيانات AN POS نهائياً.$\nاختيار (لا) سيحافظ على بياناتك في حال أردت إعادة التثبيت لاحقاً." IDNO keepData
    ; أخذ نسخة أرشيف للنسخ الاحتياطية والترخيص في مجلد آمن قبل أي مسح
    CreateDirectory "$APPDATA\an-pos-backup-archive"
    ${If} ${FileExists} "$APPDATA\an-pos\license.json"
      CopyFiles /SILENT "$APPDATA\an-pos\license.json" "$APPDATA\an-pos-backup-archive\license.json"
    ${EndIf}
    ${If} ${FileExists} "$APPDATA\an-pos\backups"
      CopyFiles /SILENT "$APPDATA\an-pos\backups\*.*" "$APPDATA\an-pos-backup-archive\"
    ${EndIf}
    RMDir /r "$APPDATA\an-pos"
    ${IfNot} ${Silent}
      MessageBox MB_ICONINFORMATION|MB_OK "تم حذف ملفات التطبيق وقاعدة البيانات بالكامل.$\n(تم الاحتفاظ بنسخة أرشيفية للنسخ الاحتياطية والترخيص في $APPDATA\an-pos-backup-archive للأمان)"
    ${EndIf}
    Goto doneUnInstall
  keepData:
    ${IfNot} ${Silent}
      MessageBox MB_ICONINFORMATION|MB_OK "تم الحفاظ على قاعدة البيانات وسجلات المبيعات والنسخ الاحتياطية بأمان في المسار:$\n$APPDATA\an-pos"
    ${EndIf}
  doneUnInstall:
!macroend
