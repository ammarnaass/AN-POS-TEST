# دليل التثبيت المخصص وشاشة الإعداد الأولي — AN POS
> توثيق شامل لتجربة تثبيت تطبيق AN POS المخصصة (NSIS) وإعداد بيئة التشغيل تلقائياً (First-Run Onboarding)

---

## 1. نظرة عامة والهدف (Objective)

تم تصميم وبناء تجربة تثبيت احترافية ومخصصة لتطبيق **AN POS Desktop (Electron / electron-builder)** تضمن:
1. **هوية بصرية متكاملة (Branded Visual Identity):** أيقونة مخصصة واضحة وعالية الدقة في جميع نقاط التلامس، مع لافتات رسومية مخصصة لشاشات معالج التثبيت NSIS.
2. **حرية اختيار مسار التثبيت (Custom Installation Directory):** إتاحة تغيير مسار التثبيت للمستخدم مع اقتراح مسار افتراضي بسيط ومنطقي (`C:\AN POS`) بدلاً من المسارات الطويلة المعقدة.
3. **تجهيز بيئة العمل تلقائياً (Zero Manual Setup):** فور اكتمال التثبيت وتشغيل البرنامج لأول مرة، يتولى التطبيق تلقائياً تهيئة مجلد بيانات المستخدم، تشغيل هجرات قاعدة البيانات (Drizzle Auto-Migrations)، كتابة ملف الإعدادات `config.json`، وعرض شاشة "الإعداد الأول" (First-Run Wizard) لتخصيص بيانات المتجر في خطوة واحدة.
4. **حماية بيانات العملاء (Zero Data Loss):** أثناء التحديثات أو إعادة التثبيت، تُحفظ بيانات المستخدم وقاعدة البيانات بالكامل؛ وعند إلغاء التثبيت، يُسأل المستخدم صراحةً مع جعل خيار الإبقاء على البيانات هو الخيار الافتراضي الآمن.

---

## 2. الهوية البصرية للأيقونات والمثبِّت (Branding Assets)

تم إنشاء وتجهيز الموارد الرسومية داخل مجلد `build/`:

| الملف | المقاسات / الصيغة | الاستخدام |
| :--- | :--- | :--- |
| `build/icon.ico` | متعدد المقاسات (16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256) | أيقونة البرنامج الرئيسية، ملف `.exe`، شريط المهام، نافذة التطبيق |
| `build/installer.ico` | ملف ICO متعدد المقاسات | أيقونة ملف مثبت البرنامج (Setup `.exe`) وأيقونة ترويسة معالج التثبيت |
| `build/uninstaller.ico` | ملف ICO متعدد المقاسات | أيقونة برنامج إلغاء التثبيت في لوحة تحكم ويندوز |
| `build/installerHeader.bmp` | 150 × 57 بكسل (24-bit BMP) | الشعار العلوي لشاشات معالج NSIS |
| `build/installerSidebar.bmp` | 164 × 314 بكسل (24-bit BMP) | الشريط الجانبي الترحيبي والختامي لمعالج NSIS |

---

## 3. إعدادات المثبِّت في `package.json`

تم ضبط تكوين `build.win` و `build.nsis` في `package.json` على النحو التالي:

```json
"win": {
  "target": [
    "nsis",
    "portable"
  ],
  "icon": "build/icon.ico",
  "signExecutable": false,
  "requestedExecutionLevel": "requireAdministrator"
},
"nsis": {
  "oneClick": false,
  "perMachine": true,
  "allowToChangeInstallationDirectory": true,
  "allowElevation": true,
  "installerIcon": "build/installer.ico",
  "uninstallerIcon": "build/uninstaller.ico",
  "installerHeaderIcon": "build/installer.ico",
  "installerHeader": "build/installerHeader.bmp",
  "installerSidebar": "build/installerSidebar.bmp",
  "uninstallerSidebar": "build/installerSidebar.bmp",
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true,
  "shortcutName": "AN POS",
  "uninstallDisplayName": "AN POS",
  "deleteAppDataOnUninstall": false,
  "runAfterFinish": true,
  "include": "electron/installer.nsh",
  "artifactName": "${productName}-Setup-${version}-${arch}.exe"
}
```

### الخصائص الرئيسية:
- **`oneClick: false`**: تعطيل التثبيت الصامت الفوري لإظهار خطوات التثبيت الاحترافية.
- **`allowToChangeInstallationDirectory: true`**: إظهار صفحة اختيار مسار التثبيت وتمكين المستخدم من استعراض وتغيير القرص والمجلد.
- **`installerHeader` و `installerSidebar`**: إظهار الهوية البصرية الكاملة لعلامة AN POS.
- **`extraResources`**: تضمين ملفات الأيقونات ومجلد هجرات Drizzle داخل حزمة التثبيت.

---

## 4. تخصيص مسار التثبيت الافتراضي و NSIS Script (`electron/installer.nsh`)

تم تحديث سكريبت NSIS بمكروهات مخصصة تلبي متطلبات التثبيت وإلغاء التثبيت بأمان:

### 1. ضبط المسار الافتراضي إلى `C:\AN POS` (`customInit`)
```nsis
!macro customInit
  ${IfNot} ${isUpdated}
    StrCpy $INSTDIR "$SYSTEMDRIVE\AN POS"
  ${EndIf}
!macroend
```
يضمن هذا الماكرو أن تظهر للمستخدم وجهة التثبيت الافتراضية كـ `C:\AN POS` بشكل نظيف وقصير، مع إمكانية تعديلها بنقرة زر.

### 2. تجهيز البيئة وجدار الحماية (`customInstall`)
- إنشاء مجلدات العمل في `%APPDATA%\an-pos` ومجلدي `backups` و `logs`.
- إنشاء ملف `an-pos-env.json` الذي يشير إلى مسار قاعدة البيانات الثابت `anpos.db`.
- إضافة استثناء في جدار حماية ويندوز لفتح المنفذ `3000` لخدمة الربط المحلي Fastify LAN.

### 3. سؤال المستخدم عند إلغاء التثبيت وحماية البيانات (`customUnInstall`)
```nsis
!macro customUnInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="AN POS LAN Server"'

  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "هل ترغب في حذف بيانات قاعدة البيانات وسجلات المبيعات والنسخ الاحتياطية نهائياً من هذا الجهاز؟$\n$\nتحذير: اختيار (نعم) سيؤدي لحذف جميع سجلات وبيانات AN POS نهائياً.$\nاختيار (لا) سيحافظ على بياناتك في حال أردت إعادة التثبيت لاحقاً." IDNO keepData
    RMDir /r "$APPDATA\an-pos"
    MessageBox MB_ICONINFORMATION|MB_OK "تم حذف ملفات التطبيق وقاعدة البيانات بالكامل."
    Goto doneUnInstall
  keepData:
    MessageBox MB_ICONINFORMATION|MB_OK "تم الحفاظ على قاعدة البيانات وسجلات المبيعات والنسخ الاحتياطية بأمان في المسار:$\n$APPDATA\an-pos"
  doneUnInstall:
!macroend
```
- خيار الزر الثاني (`MB_DEFBUTTON2` - أي "لا") هو الخيار الافتراضي لحماية قاعدة البيانات من أي ضغط عَرَضي للزر Enter.

---

## 5. تجهيز بيئة العمل التلقائية وشاشة الإعداد الأول (First-Run Wizard)

### الآلية الهندسية:
1. **عند إقلاع التطبيق لأول مرة:**
   - تستدعي دالة `createWindow` في `electron/main/index.ts` الدالة `getOrCreateConfigFile()` قبل إنشاء النافذة.
   - يتم التأكد من وجود مجلد `%APPDATA%\an-pos` وإنشاء ملف الإعدادات `config.json` بالقيم الافتراضية.
   - يتم تشغيل `initDatabase()` وتطبيق هجرات Drizzle التلقائية (Auto-Migration) وإنشاء جميع الجداول والبيانات الأساسية.
2. **فحص حالة الإعداد الأول عبر IPC (`system:isFirstRun`):**
   - يفحص المعالج ملف `config.json` وجدول `settings` في SQLite.
   - إذا لم يتم إكمال الإعداد الأول من قبل، يتم رفع راية `isFirstRun = true`.
3. **عرض شاشة First-Run Wizard (`FirstRunWizardModal.tsx`):**
   - تظهر الشاشة الأنيقة ذات الطابع المظلم المتناسق للمستخدم فور فتح شاشة تسجيل الدخول.
   - تطلب البيانات الأساسية فقط:
     - **اسم المتجر / النشاط التجاري** (إلزامي).
     - **رقم الهاتف** (اختياري، يظهر في الفواتير).
     - **العملة الأساسية** (دج DZD، ر.س SAR، $ USD، € EUR).
     - **لغة واجهة البرنامج** (العربية، الفرنسية، الإنجليزية).
     - **كلمة مرور المدير** (تغيير أو تأكيد الرقم السري لـ `admin@dante.com`).
4. **حفظ الإعدادات وتسجيل علامة الاكتمال:**
   - عند الضغط على "حفظ وبدء استخدام البرنامج"، يستدعي المعالج `system:saveFirstRunSetup`.
   - يتم تحديث `config.json` بتسجيل `firstRunCompleted: true`.
   - يتم تحديث جدول `settings` في SQLite بالقيم المختارة وتفعيل `first_run_completed = 1`.
   - يتم تخزين علامة `anpos_setup_completed` في `localStorage`.
   - يتم إظهار شاشة نجاح متألقة وتوجيه المستخدم مباشرة لتسجيل الدخول.
5. **عدم تكرار الشاشة:**
   - عند إعادة تشغيل البرنامج أو تحديثه، تكتشف الفحوصات الثلاثية (ملف Config + جدول Settings + LocalStorage) اكتمال الإعداد فلا تظهر الشاشة مجدداً.

---

## 6. أوامر البناء والاختبار (Packaging & Testing Commands)

| الأمر | الوظيفة |
| :--- | :--- |
| `npm run build` | تجميع كود React و Electron باستخدام Vite و Rolldown |
| `npx vitest run src/test/customInstallerAndFirstRun.test.ts` | تشغيل اختبارات التحقق من ملفات الهوية البصرية وإعدادات المثبِّت ودورة حياة الإعداد الأول |
| `npx vitest run src/test/autoMigration.test.ts` | اختبار الهجرة التلقائية وقاعدة البيانات SQLite |
| `npm run package:win` | بناء ملف التثبيت النهائي للويندوز بصيغة NSIS Executable (`release/AN POS-Setup-*.exe`) |
| `npx electron-builder --win --dir` | تجميع مجلد التطبيق القابل للتشغيل `release/win-unpacked` والتحقق من سلامة الموارد والأيقونات |

---

## 7. ملخص معايير الإنجاز (Definition of Done)

- [x] المستخدم يستطيع اختيار مسار تثبيت مخصص أثناء التثبيت، والمسار المقترح الافتراضي هو `C:\AN POS`.
- [x] الأيقونة المخصصة عالية الدقة ظاهرة في: ملف التثبيت، معالج التثبيت، اختصار سطح المكتب، اختصار قائمة ابدأ، شريط المهام، نافذة التطبيق، وأداة إلغاء التثبيت.
- [x] لافتات رسومية مخصصة (Header و Sidebar) تظهر داخل معالج التثبيت NSIS.
- [x] تجهيز بيئة العمل التلقائية وقاعدة بيانات SQLite وملف `config.json` دون أي خطوة يدوية من المستخدم.
- [x] شاشة First-Run Wizard تظهر عند أول تشغيل فقط وتختفي نهائياً في المرات القادمة.
- [x] عند إلغاء التثبيت، يُسأل المستخدم عن رغبته في حفظ أو حذف قاعدة بيانات المتجر لتفادي الفقدان العرضي.
