; ==============================================================================
; AN POS - NSIS Custom Installer Script
; يدعم أنظمة Windows 7 (SP1), Windows 8, Windows 8.1, Windows 10, Windows 11
; للمعماريات: x64 (64-bit) و x86 / ia32 (32-bit)
; يتولى: تجهيز البيئة، إنشاء مجلدات قاعدة البيانات، ضبط جدار حماية ويندوز،
; وكتابة ملف إعدادات البيئة an-pos-env.json وحماية البيانات عند التحديث أو الحذف.
; ==============================================================================

!macro customInstall
  DetailPrint "جاري تجهيز بيئة تشغيل AN POS وقاعدة البيانات..."

  ; 1. إنشاء مجلدات العمل وقاعدة البيانات والنسخ الاحتياطي في AppData
  ; يعمل بشكل متطابق على جميع إصدارات Windows (7, 8, 10, 11) لنطاق المستخدم الحالي
  CreateDirectory "$APPDATA\an-pos"
  CreateDirectory "$APPDATA\an-pos\backups"
  CreateDirectory "$APPDATA\an-pos\logs"

  ; 2. إنشاء ملف تهيئة البيئة an-pos-env.json إذا لم يكن موجوداً
  ${IfNot} ${FileExists} "$APPDATA\an-pos\an-pos-env.json"
    FileOpen $0 "$APPDATA\an-pos\an-pos-env.json" w
    FileWrite $0 '{"installPath":"$INSTDIR","dataDirectory":"$APPDATA\\an-pos","dbPath":"$APPDATA\\an-pos\\an-pos.db","serverPort":3000,"environment":"production"}'
    FileClose $0
    DetailPrint "تم إنشاء ملف تهيئة البيئة: $APPDATA\an-pos\an-pos-env.json"
  ${EndIf}

  ; 3. إضافة استثناء في جدار حماية ويندوز (Windows Defender Firewall)
  ; لفتح المنفذ 3000 لخدمة Fastify LAN لربط أجهزة الكاشير وهواتف المبيعات دون ظهور نوافذ تحذير
  ; أمر netsh advfirewall مدعوم قياسياً على Windows 7 و 8 و 10 و 11
  DetailPrint "تجهيز استثناء جدار حماية ويندوز لخدمة الشبكة المحلية (Port 3000)..."
  nsExec::Exec 'netsh advfirewall firewall delete rule name="AN POS LAN Server"'
  nsExec::Exec 'netsh advfirewall firewall add rule name="AN POS LAN Server" dir=in action=allow protocol=TCP localport=3000 profile=any'

!macroend

!macro customUnInstall
  ; 1. حذف قاعدة جدار الحماية عند إزالة التثبيت
  nsExec::Exec 'netsh advfirewall firewall delete rule name="AN POS LAN Server"'

  ; 2. رسالة إشعار للعميل لحماية البيانات وعدم القلق بشأن المبيعات
  MessageBox MB_ICONINFORMATION|MB_OK "تمت إزالة ملفات برنامج AN POS بنجاح.$\n$\nملاحظة أمان هامة: تم الحفاظ على قاعدة البيانات وسجلات المبيعات والنسخ الاحتياطية بأمان في المسار:$\n$APPDATA\an-pos$\nوذلك لحماية بيانات متجرك وحساباتك من الفقدان العرضي."
!macroend
