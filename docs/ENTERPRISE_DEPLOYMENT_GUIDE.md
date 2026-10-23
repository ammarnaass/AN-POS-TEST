# دليل النشر المؤسسي وحزم MSI (Enterprise Deployment Guide) — AN POS

> **الهدف:** توثيق معايير وخطوات النشر الصامت والمؤسسي لنظام AN POS عبر حزم Windows Installer (MSI) وأداة التمهيد WiX Burn، والتكامل مع أنظمة الإدارة المركزية (Active Directory GPO، Microsoft Intune، SCCM).
>
> **المسار المستهدف:** المسار B ضمن [PROFESSIONAL_INSTALLER_MIGRATION_PLAN.md](../PROFESSIONAL_INSTALLER_MIGRATION_PLAN.md).

---

## 1. لماذا حزم MSI للنشر المؤسسي؟

| الميزة | حزم NSIS التقليدية (EXE) | حزم Windows Installer (MSI) |
| :--- | :--- | :--- |
| **النشر الصامت الموحد** | مفاتيح سطر أوامر مخصصة (`/S`) | قياسي عبر كافة أدوات الإدارة (`msiexec /qn`) |
| **الدعم المؤسسي (GPO)** | غير مدعوم أصلياً في Active Directory | مدعوم أصلياً عبر Group Policy Software Installation |
| **إدارة الإعدادات والتحويل** | غير ممكن إلا بسكربتات إضافية | مدعوم رسمياً عبر ملفات التحويل (MST Transforms) |
| **سجلات التثبيت واستكشاف الأخطاء**| تعتمد على السكربت الداخلي | سجلات موحدة ومفصلة لجميع العمليات (`/l*v`) |
| **التثبيت لكل جهاز (Per-Machine)**| اختياري بحسب السكربت | قياسي في مجلد `Program Files` مع صلاحيات إدارية للمؤسسة |
| **الإصلاح والاستعادة (Repair)** | غير متاح بسهولة | معيار أصلي في Windows Installer (`msiexec /f`) |

---

## 2. الخصائص العامة للحزمة (MSI Public Properties)

تم تصميم حزمة MSI في AN POS لتوفير مرونة كاملة لمديري الأنظمة عند التثبيت بدون واجهة مستخدم:

| الخاصية | القيم المتاحة | القيمة الافتراضية | الوصف |
| :--- | :--- | :--- | :--- |
| `EDITION` | `Desktop` / `Server` | `Desktop` | نمط التثبيت؛ نمط Server يجهز مجلدات البيانات المشتركة في ProgramData |
| `SERVER_PORT` | من 1 إلى 65535 | `3000` | رقم المنفذ لقاعدة جدار الحماية التلقائية لشبكة LAN |
| `INSTALLFOLDER` | مسار محلي صالح | `%ProgramFiles%\AN POS\AN POS` | مسار تثبيت ملفات البرنامج التنفيذية |
| `CREATE_DESKTOP_SHORTCUT` | `1` أو `0` | `1` | إنشاء اختصار على سطح المكتب لجميع المستخدمين |
| `REMOVE_DATA` | `0` أو `1` | `0` | `0` = الحفاظ التام على قواعد البيانات والنسخ الاحتياطية عند الإزالة |
| `AUTOSTART` | `1` أو `0` | `1` | تسجيل التشغيل التلقائي مع بدء النظام (في نمط الخادم) |

---

## 3. أوامر التثبيت والإدارة عبر `msiexec`

### 3.1 تثبيت صامت قياسي مع استخراج سجل مفصل
```cmd
msiexec /i "ANPOS-Setup-3.0.0-x64.msi" /qn /l*v "C:\Logs\anpos_install.log"
```

### 3.2 تثبيت مخصص بنمط الخادم وتحديد منفذ الشبكة
```cmd
msiexec /i "ANPOS-Setup-3.0.0-x64.msi" /qn EDITION=Server SERVER_PORT=3000 CREATE_DESKTOP_SHORTCUT=1 /l*v "C:\Logs\anpos_server_install.log"
```

### 3.3 إصلاح التثبيت التالف (Repair)
يقوم بفحص الملفات المفقودة أو التالفة واستعادتها دون المساس بقاعدة البيانات:
```cmd
msiexec /famus "ANPOS-Setup-3.0.0-x64.msi" /qn /l*v "C:\Logs\anpos_repair.log"
```

### 3.4 إلغاء التثبيت الصامت مع الحفاظ على البيانات (Zero Data Loss)
```cmd
msiexec /x "ANPOS-Setup-3.0.0-x64.msi" /qn REMOVE_DATA=0 /l*v "C:\Logs\anpos_uninstall.log"
```

---

## 4. النشر عبر Active Directory Group Policy (GPO)

1. **تجهيز مجلد المشاركة الشبكي (Distribution Share):**
   * انسخ ملف `ANPOS-Setup-3.0.0-x64.msi` إلى مجلد مشاركة شبكي للقراءة فقط لجميع حواسيب النطاق (مثال: `\\DC01\SoftwareDeployment\ANPOS\`).
2. **إنشاء كائن سياسة المجموعة (GPO):**
   * افتح وحدة تحكم إدارة سياسات المجموعة (`gpmc.msc`).
   * أنشئ GPO جديد باسم `AN POS Enterprise Deployment`.
3. **تكوين الحزمة:**
   * انتقل إلى: `Computer Configuration -> Policies -> Software Settings -> Software installation`.
   * انقر بزر الفأرة الأيمن -> **New -> Package**.
   * اختر المسار الشبكي الكامل بصيغة UNC للملف `ANPOS-Setup-3.0.0-x64.msi`.
   * اختر نوع النشر: **Assigned**.
4. **تطبيق ملفات التحويل (MST Transforms) — اختياري:**
   * إذا كنت ترغب في تثبيت إعدادات مخصصة افتراضياً (مثل نمط Server أو تعطيل الاختصارات)، استخدم أداة مثل *Orca* لإنشاء ملف `.mst` وتطبيقه في تبويب **Modifications**.
5. **التحديثات التلقائية (Major Upgrades):**
   * بفضل رمز الترقية الثابت `UpgradeCode: {4A16F8C9-8802-4A73-A33B-E6C09D0C5471}`، سيقوم نظام ويندوز تلقائياً بإزالة الإصدار السابق بأمان وتثبيت الإصدار الأحدث عند نشر تحديث جديد.

---

## 5. النشر عبر Microsoft Intune

1. سجل الدخول إلى مركز إدارة [Microsoft Intune](https://intune.microsoft.com/).
2. انتقل إلى **Apps -> Windows -> Add**.
3. اختر نوع التطبيق: **Line-of-business app** أو **Windows app (Win32)**.
4. حدد ملف الحزمة: `ANPOS-Setup-3.0.0-x64.msi`.
5. في قسم **App information**:
   * الاسم: `AN POS`
   * الناشر: `AN POS`
   * سطر أوامر التثبيت (Install command): `msiexec /i "ANPOS-Setup-3.0.0-x64.msi" /qn EDITION=Desktop`
   * شروط الاكتشاف (Detection rule): يتم اكتشافها تلقائياً عبر MSI ProductCode.
6. عيّن المجموعة المستهدفة من الأجهزة واضغط **Create**.

---

## 6. بناء حزم MSI في مستودع AN POS

يوفر المستودع طريقتين متكاملتين لبناء حزم Windows Installer:

### الخيار 1: التوليد المباشر عبر `electron-builder`
مدمج بالكامل وسريع:
```bash
npm run package:win:msi
```
تنتج الحزمة في: `release/AN POS-Setup-3.0.0-x64.msi`.

### الخيار 2: البناء الكامل المتقدم عبر مشروع WiX Toolset v4
مشروع معياري موجود في `installer/wix/` يدعم كافة ملحقات الجدار الناري والمصادقة:
```powershell
# بناء الحزمة الأساسية (MSI)
dotnet build installer/wix/ANPOS.Installer/ANPOS.Installer.wixproj -c Release

# بناء حزمة التمهيد التفاعلية (Bootstrapper EXE Bundle)
dotnet build installer/wix/ANPOS.Bundle/ANPOS.Bundle.wixproj -c Release
```

---

## 7. آلية الترحيل من مثبت NSIS القديم (B6)

* عند تشغيل مثبت MSI على جهاز يحتوي على نسخة مثبتة قديماً بنظام NSIS (في مسار `C:\AN POS`):
  1. يقوم MSI تلقائياً بالبحث في مسار السجل `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\an-pos`.
  2. يتم تشغيل مزيل التثبيت القديم بالوضع الصامت التام:
     ```cmd
     "C:\AN POS\Uninstall AN POS.exe" /S
     ```
  3. بفضل التعديل المطبق في `electron/installer.nsh`، يتم الحفاظ التلقائي على قاعدة البيانات وسجلات المبيعات والترخيص في `%APPDATA%\an-pos` دون مقاطعة التثبيت الصامت بمربعات حوار.
  4. يتم تثبيت حزمة MSI الجديدة بسلاسة وإعادة ربط البيانات تلقائياً.
