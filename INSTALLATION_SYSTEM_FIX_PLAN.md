# 🛠️ خطة إصلاح وتقوية نظام تثبيت التطبيق — AN POS

> **مرجع التشخيص**: [`INSTALLATION_SYSTEM_AUDIT.md`](file:///home/ammar/AN-POS-TEST/INSTALLATION_SYSTEM_AUDIT.md)
> **النسخة المستهدفة**: 2.5.7 → 2.6.0
> **النطاق**: حزمة `electron-builder` (NSIS + Portable) · `electron/installer.nsh` · دورة التشغيل الأول · تهيئة قاعدة البيانات والهجرات · الأمن والصلاحيات · نظام التحديث · خط CI
> **الهدف النهائي**: نظام تثبيت **موقّع، بصلاحيات دنيا، قابل للتحديث الآلي، ومتوافق مع ما يُعلن عنه فعلاً**.

---

## 0. المبدأ الحاكم

الخطة **لا تعيد تصميم** نظام التثبيت — فالمسار الرئيسي (نسخة احتياطية قبل الترقية، مسار بيانات مستقل، إزالة لا تحذف البيانات) سليم. الخطة تُغلق **حلقة ما بعد التثبيت**: التوقيع، الصلاحيات، التحديث، الهجرات، ودقّة التوثيق.

كل بند مصنّف: 🔴 P0 (حرج — قبل أي تسليم) · 🟠 P1 (مهم — خلال إصدار واحد) · 🟡 P2 (صقيلة/تنظيف).

---

## 1. ملخص القرارات والتغييرات الجوهرية (User Review Required)

> [!IMPORTANT]
> **القرار 1 — إزالة `requireAdministrator` من التطبيق (لا من المثبّت):**
> الدليل أن الطباعة تتم بالكامل عبر Chromium/Electron (`webContents.print` + `getPrintersAsync`) في [`silentPrint.ts`](file:///home/ammar/AN-POS-TEST/electron/main/printing/silentPrint.ts)، ولا توجد أي تبعية أصلية للعتاد (`serialport`/`usb`/`escpos` غير موجودة في `package.json`)، والبيانات تُكتب في `%APPDATA%` لا في `Program Files`. أي أن **البرنامج لا يحتاج صلاحيات مدير لأي من وظائفه الحالية**.
> **الأثر**: `asInvoker` للبرنامج + إبقاء الارتفاع على المثبّت فقط (`perMachine` يستدعيه طبيعياً). يلزم **تأكيد ميداني على درج النقود إن وُجد** (بند 2.0).

> [!WARNING]
> **القرار 2 — التوقيع الرقمي يحتاج شهادة Code Signing:**
> لن يُفعَّل التوقيع فعلياً إلا بشهادة (OV/EV). سأجعل التهيئة **جاهزة لكن معطّلة تلقائياً** إن لم تتوفر أسرار الشهادة، حتى لا يتعطّل البناء المحلي. المطلوب منك: هل توجد شهادة؟ وهل تُخزَّن في أسرار GitHub Actions أم محلياً؟

> [!IMPORTANT]
> **القرار 3 — نظام التحديث الآلي:**
> يوجد أثر كامل لنظام تحديث (latest.yml + app-update.yml + blockmap) **بلا محرّك**. الخيار الموصى به: إضافة `electron-updater` وربطه بشاشة «التحديثات» الموجودة في الواجهة، مع نقطة نشر إنتاجية. البديل: إبقاء التحديث يدوياً **مع إشعار داخل التطبيق** يفحص `latest.yml` ويعرض «يتوفر إصدار جديد».

> [!WARNING]
> **القرار 4 — حذف `an-pos-env.json`:**
> المثبّت يكتبه ([`installer.nsh:66-73`](file:///home/ammar/AN-POS-TEST/electron/installer.nsh)) ولا يقرأه أي سطر في المشروع. الحذف هو الحل الأنظف (التهيئة الحقيقية في `config.json`). البديل: تفعيل قراءته في `resolveDatabasePath()`.

> [!IMPORTANT]
> **القرار 5 — تصحيح مصفوفة التوافق:**
> Windows 7 / 8 / 8.1 **غير مدعومة** بواسطة Electron 40. سيُصحَّح الوصف في المثبّت والوثيقة، وتُحذف تحايلات Win7 (أو تُعزل خلف فرع قديم بـ Electron ≤ 22 إن كان هناك عملاء فعليون على Win7).

### جدول القرارات وأثرها على الخطة

| # | القرار | الافتراضي الموصى به | يحجب المرحلة |
| :-- | :--- | :--- | :-- |
| 1 | إزالة ارتفاع التطبيق | ✅ `asInvoker` | 1 و 3 |
| 2 | شهادة التوقيع | ⏳ بانتظار ردّك | 5 |
| 3 | التحديث الآلي | ✅ `electron-updater` | 6 |
| 4 | `an-pos-env.json` | ✅ حذف | 2 |
| 5 | توافق Win7/8 | ✅ إزالة | 1 |

---

## 2. مراحل التنفيذ التفصيلية (Proposed Changes)

---

### المرحلة 0 — تحقق مسبق (Pre-flight) 🔎

صغيرة جداً لكنها تحدد صحة القرار 1.

**0.1 — تأكيد عدم الحاجة لصلاحيات المدير**
- [ ] تشغيل نسخة مبنية بـ `asInvoker` على جهاز نظيف (Windows 10/11) وتنفيذ: طباعة إيصال حراري، فتح درج النقود (إن وُجد)، إضافة منتج، بيع، نسخة احتياطية، تشغيل خادم LAN.
- [ ] إن فشل **درج النقود** فقط: يُنقل إلى **خدمة مساعدة مرتفعة** (`elevate.exe` موجود أصلاً في `resources/`) تُستخدم للحظة الإشارة فقط، لا لترقية العملية كلها.
- [ ] توثيق النتيجة في [`INSTALLATION_SYSTEM_AUDIT.md`](file:///home/ammar/AN-POS-TEST/INSTALLATION_SYSTEM_AUDIT.md) (تحديث القسم 8).

**0.2 — تأكيد توفر `node:sqlite` في Electron 40**
- [ ] لا يوجد أي `--experimental-sqlite` يُمرَّر ([`index.ts:56`](file:///home/ammar/AN-POS-TEST/electron/main/index.ts)). تشغيل النسخة المبنية والتأكد أن `initDatabase()` لا يفشل. إن فشل: إضافة `app.commandLine.appendSwitch('experimental-sqlite')` قبل `app.whenReady()` أو رفع Electron.

---

### المرحلة 1 — الأمن والصلاحيات والتوافق 🔴 P0

#### 1.1 — تقليل صلاحيات التطبيق وإصلاح إعداد التوقيع

#### [MODIFY] [package.json](file:///home/ammar/AN-POS-TEST/package.json)

```diff
   "electronDownload": {
-    "isVerifyChecksum": false
   },
   ...
   "win": {
     "target": ["nsis", "portable"],
     "icon": "build/icon.ico",
-    "signExecutable": false,
-    "requestedExecutionLevel": "requireAdministrator"
+    "requestedExecutionLevel": "asInvoker"
   },
   "portable": {
     "artifactName": "${productName}-${version}-${arch}-portable.exe",
-    "requestExecutionLevel": "admin"
+    "requestExecutionLevel": "user"
   },
```

- حذف `isVerifyChecksum: false` (القيمة الافتراضية `true` آمنة وتتحقق من نزاهة نواة Electron).
- إزالة `signExecutable: false` (غير موثّق كخيار `win` — الموثّق هو `signAndEditExecutable`؛ عملياً لا شهادة مهيّأة ⇒ لا توقيع إطلاقاً).
- **إضافة توقيع مشروط** (لا يعطّل البناء المحلي بلا شهادة):
```jsonc
// يُقترح ضمن "win"
"signtoolOptions": {
  "signingHashAlgorithms": ["sha256"],
  "certificateFile": "${env.CSC_LINK}",
  "certificatePassword": "${env.CSC_KEY_PASSWORD}"
}
```
> لا تُوضع أسرار في الملف؛ تُمرَّر عبر متغيرات البيئة `CSC_LINK` / `CSC_KEY_PASSWORD` (أسرار CI أو متغيرات محلية).

#### 1.2 — تثبيت مسار البيانات صراحةً (تفادي هشاشة اعتماد `productName`)

#### [MODIFY] [electron/main/index.ts](file:///home/ammar/AN-POS-TEST/electron/main/index.ts)

```ts
// قبل أي استخدام لـ app.getPath() — أعلى الملف
app.setName('an-pos'); // يثبّت userData على %APPDATA%\an-pos بشكل صريح
```
> هذا يجعل التطابق بين مجلد المثبّت (`$APPDATA\an-pos`) ومسار قاعدة البيانات **تعاقدياً لا عرضياً**، ويحمي من نقل البيانات لو أُضيف `productName` لاحقاً إلى package.json المحزوم.

#### 1.3 — إزالة تحايلات Windows 7/8 (توافق غير موجود)

#### [MODIFY] [electron/main/index.ts](file:///home/ammar/AN-POS-TEST/electron/main/index.ts) — الأسطر ~19-40

```diff
-// توافقية أنظمة ويندوز القديمة (Windows 7 / 8 / 8.1) ...
-if (process.platform === 'win32') {
-  ...
-  if (isLegacyWindows) {
-    app.commandLine.appendSwitch('disable-gpu-sandbox');
-    ... 'no-sandbox' ...
-  }
-}
+// ملاحظة: Electron 40 لا يدعم Windows 7/8/8.1 (الحد الأدنى ويندوز 10).
+// تمت إزالة تحايلات الأنظمة القديمة لأنها لم تعد قابلة للتشغيل أصلاً.
```
> إن كان لديك عملاء فعليون على Win7: لا تُشِر إلى «إزالة»، بل **افتح فرع إصدار منفصل** بـ Electron ≤ 22 وولّد منه حزمة `legacy`.

#### 1.4 — تصحيح ملف المثبّت

#### [MODIFY] [electron/installer.nsh](file:///home/ammar/AN-POS-TEST/electron/installer.nsh)

```diff
-; يدعم أنظمة Windows 7 (SP1), Windows 8, Windows 8.1, Windows 10, Windows 11
-; للمعماريات: x64 (64-bit) و x86 / ia32 (32-bit)
+; يدعم أنظمة Windows 10 / Windows 11 (الحد الأدنى لـ Electron 40)
+; للمعماريات: x64 (64-bit)
```

- النقطة N4: تضييق `taskkill` بمطابقة مسار التثبيت بدل الاسم فقط:
```nsis
nsExec::Exec 'taskkill /F /IM "AN POS.exe" /T'
; ← يُستحسن التحقق من أن العملية من $INSTDIR (عبر ImagePath) قبل الإنهاء
```

---

### المرحلة 2 — تنظيف المثبّت وخدمات ما بعد التثبيت 🔴 P0 / 🟠 P1

#### 2.1 — حذف الإعداد الميت `an-pos-env.json`

#### [MODIFY] [electron/installer.nsh](file:///home/ammar/AN-POS-TEST/electron/installer.nsh) — الأسطر 65-73

```diff
-  ; 3. إنشاء ملف تهيئة البيئة an-pos-env.json إذا لم يكن موجوداً
-  ${IfNot} ${FileExists} "$APPDATA\an-pos\an-pos-env.json"
-    FileOpen $0 ... '{"installPath":...}'
-    ...
-  ${EndIf}
+  ; (حُذف: an-pos-env.json لم يكن يُقرأ بواسطة البرنامج — التهيئة في config.json)
```

#### 2.2 — قاعدة الجدار الناري: متزامنة مع وضع الخادم والمنفذ الفعلي

المشكلة الحالية ([`installer.nsh:79`](file:///home/ammar/AN-POS-TEST/electron/installer.nsh)): قاعدة دائمة على `profile=any` ومنفذ ثابت `3000`، تُضاف لكل جهاز ولو كان عميلاً.

**الاستراتيجية الجديدة**: إزالة الجدار من المثبّت، وإدارته **من التطبيق** عند تفعيل وضع الخادم فقط.

#### [NEW] `electron/main/net/firewall.ts`
```ts
export function ensureFirewallRule(port: number): void   // netsh delete ثم add بالمنفذ الفعلي + profile=private فقط
export function removeFirewallRule(): void
```
#### [MODIFY] [electron/main/server/index.ts](file:///home/ammar/AN-POS-TEST/electron/main/server/index.ts)
- عند `startHttpServer({ port })` وبعد نجاح الاستماع: `ensureFirewallRule(port)`.
- عند إيقاف الخادم/تعطيل LAN: `removeFirewallRule()`.

#### [MODIFY] [electron/installer.nsh](file:///home/ammar/AN-POS-TEST/electron/installer.nsh)
```diff
-  nsExec::Exec 'netsh advfirewall firewall delete rule name="AN POS LAN Server"'
-  nsExec::Exec 'netsh advfirewall firewall add rule ... localport=3000 profile=any'
+  ; يُدار الاستثناء الآن من التطبيق عند تفعيل وضع الخادم (منفذ ديناميكي)
```
> ملاحظة: تشغيل `netsh` من التطبيق يحتاج مدير. لذلك — بما أننا **أزلنا ارتفاع التطبيق في المرحلة 1** — نستخدم `elevate.exe` الموجود في `resources/` لتشغيل الأمر عند الطلب فقط، أو نطلب من المستخدم الموافقة على UAC مرة واحدة عند تفعيل وضع الخادم.

#### 2.3 — استثناء الجدار في الوضع الصامت + إزالة سلوك حاجب

#### [MODIFY] [electron/installer.nsh](file:///home/ammar/AN-POS-TEST/electron/installer.nsh) — `customUnInstall`
```diff
-  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "..." IDNO keepData
+  IfSilent keepData
+  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "..." IDNO keepData
```
> يمنع تعطّل إزالة التثبيت الصامتة (`/S`) التي تستدعيها بعض أدوات النشر.

---

### المرحلة 3 — أمان البيانات والهجرات 🔴 P0

#### 3.1 — نسخة احتياطية إلزامية قبل الهجرة التلقائية

المشكلة: `runAutoMigration()` تعمل عند كل إقلاع وتعدّل المخطط بلا شبكة أمان ([`database.ts:202`](file:///home/ammar/AN-POS-TEST/electron/main/database.ts)).

#### [MODIFY] [electron/main/database.ts](file:///home/ammar/AN-POS-TEST/electron/main/database.ts)
```ts
export async function runAutoMigration(): Promise<void> {
  const folder = resolveMigrationsFolder();
  // ✅ جديد: نسخة احتياطية قبل أي هجرة (تُكتب في userData/backups)
  try {
    const backupDir = path.join(path.dirname(activeDbPath), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(activeDbPath, path.join(backupDir, `pre_migration_${stamp}.db`));
  } catch (e) { console.warn('[database] تعذر أخذ نسخة احتياطية قبل الهجرة:', e); }
  ...
}
```
- عدم تجاوز NH: يجب أن يمرّ الفشل عبر مسار استرداد — راجع 3.3.

#### 3.2 — إزالة اعتراض الهجرة الخطير

#### [MODIFY] [electron/main/database.ts](file:///home/ammar/AN-POS-TEST/electron/main/database.ts) — الأسطر 222-226

```diff
-    for (const m of migrations) {
-      m.sql = m.sql
-        .filter((s) => !s.includes('__new_sales'))
-        .map((s) => s.replace(/DEFAULT\s+datetime\('now'\)/g, "DEFAULT (datetime('now'))"));
-    }
+    // (أُزيل) لا تُسقط عبارات من ملفات الهجرة. أصلح الملف المصدر بدل الاعتراض.
+    // لا تُعد كتابة DEFAULT datetime('now') بـ regex — صحّح ملف .sql نفسه.
```
- [ ] مراجعة ملفَي الهجرة الحاليين وإصلاح `DEFAULT datetime('now')` → `DEFAULT (datetime('now'))` في المصدر.
- [ ] التأكد أن أي هجرة مستقبلية تُختبر على قاعدة بيانات حقيقية قبل الدمج.
- [ ] تنظيف جدول `__new_sales` المعلّق يبقى كإجراء بدء تشغيل دفاعي (مقبول).

> ⚠️ **هذا البند يمسّ بيانات العملاء** — يجب أن يُنفَّذ مع مراجعة GitNexus impact: `impact({target: "runAutoMigration", direction: "upstream"})` قبل التعديل.

#### 3.3 — مسار استرداد عند فشل الهجرة

#### [MODIFY] [electron/main/index.ts](file:///home/ammar/AN-POS-TEST/electron/main/index.ts) — كتلة `catch (dbErr)`
```ts
// بدل الإغلاق الفوري: عرض خيارين
const choice = dialog.showMessageBoxSync({
  type: 'error',
  title: 'خطأ في قاعدة البيانات (AN POS)',
  message: 'تعذّر تشغيل قاعدة البيانات. يمكنك استعادة آخر نسخة احتياطية.',
  buttons: ['استعادة آخر نسخة احتياطية', 'إغلاق'],
  defaultId: 0, cancelId: 1,
});
if (choice === 0) { restoreLatestBackup(); /* ثم إعادة التهيئة */ }
else app.quit();
```

#### 3.4 — فحص سلامة دوري

#### [NEW] IPC: `system:runIntegrityCheck`
#### [MODIFY] [electron/main/ipc/system.ts](file:///home/ammar/AN-POS-TEST/electron/main/ipc/system.ts)
```ts
ipcMain.handle('system:runIntegrityCheck', () => {
  const row = getSqlite().prepare('PRAGMA integrity_check').get();
  return { ok: (row as any)?.integrity_check === 'ok' };
});
```
- عرض النتيجة في شاشة «حول» / «التشخيص» (غير حاجب للإقلاع).

---

### المرحلة 4 — تشغيل أول آمن (كلمات المرور الافتراضية) 🔴 P0

**الخطر**: كل تثبيت جديد يزرع مديراً بكلمة مرور **`admin1234`**، ومعالج التشغيل الأول **لا يطلب** كلمة مرور (حقل `adminPin` معرّف في الخصائص ولا يُجمع أبداً).

#### 4.1 — فرض تعيين PIN للمدير في المحرر الأول

#### [MODIFY] [src/components/setup/FirstRunWizardModal.tsx](file:///home/ammar/AN-POS-TEST/src/components/setup/FirstRunWizardModal.tsx)
- إضافة حقل إلزامي «كلمة مرور المدير» (4-8 أرقام/أحرف) مع تأكيد.
- إدراجه في `payload`:
```diff
 const payload = {
   shopName: shopName.trim(),
   phone: phone.trim(),
   baseCurrency,
   language,
+  adminPin: adminPin.trim(),
 };
```
- التحقق من الطول والمنع من قيم شائعة (`1234`, `0000`, `admin1234`).

#### 4.2 — رفض القيم الضعيفة وفرض التغيير على القواعد القائمة

#### [MODIFY] [electron/main/ipc/system.ts](file:///home/ammar/AN-POS-TEST/electron/main/ipc/system.ts) — `saveFirstRunSetup`
- رفض الحفظ إن كان `adminPin` فارغاً أو ضعيفاً.
- إضافة علم `mustChangePin` على مستخدمي القواعد القديمة الذين لا يزالون على `admin1234`.

#### [MODIFY] [electron/main/seed.ts](file:///home/ammar/AN-POS-TEST/electron/main/seed.ts)
```diff
-const usersToSeed = DEFAULT_USERS.filter((u) => u.role !== 'developer' || isDevEnv);
+// في الإنتاج: يُنشأ المدير بكلمة مرور عشوائية، ولا يمكن الدخول إلى أن تُغيَّر من المحرر الأول.
```
- توليد PIN عشوائي عند التثبيت الجديد + `must_change_pin = 1`، وإلغاء الوصول بالكلمة الافتراضية.

#### 4.3 — إزالة الاعتماد على `localStorage` كمصدر حقيقة

#### [MODIFY] [src/pages/auth/LoginPage.tsx](file:///home/ammar/AN-POS-TEST/src/pages/auth/LoginPage.tsx) — `checkFirstRunStatus`
- حذف الفرع المتبقّي:
```diff
-      // إذا لم يكن مكتملاً محلياً
-      if (!isCompletedLocally) {
-        setShowFirstRunWizard(true);
-      }
```
- الاعتماد فقط على `system.isFirstRun` (ثلاثي المصادر في `ipc/system.ts`).
- إبقاء `localStorage` كتسريع اختياري فقط لا كقرار.
#### [MODIFY] [src/app/guards/FirstRunGuard.tsx](file:///home/ammar/AN-POS-TEST/src/app/guards/FirstRunGuard.tsx)
- حذف الدوال الميتة `isFirstRun` / `checkDesktopFirstRun` / `completeFirstRun` (الفصل 6.2 في التقرير).

---

### المرحلة 5 — التوقيع وإصدار NSIS في CI 🔴 P0 / 🟠 P1

#### [MODIFY] [.github/workflows/build.yml](file:///home/ammar/AN-POS-TEST/.github/workflows/build.yml)

```diff
 on:
   push:
     branches: [main]
     tags: ['v*']
   workflow_dispatch:

 jobs:
   build-windows:
     runs-on: windows-latest
     steps:
       - uses: actions/checkout@v4
       - uses: actions/setup-node@v4
         with: { node-version: 22, cache: 'npm' }
       - run: npm ci
+      - name: Typecheck & Test
+        run: |
+          npm run typecheck
+          npm run test
       - name: Build
         run: npx electron-vite build
-      - name: Build Windows exe
-        run: npx electron-builder --win portable
+      - name: Build Windows artifacts (NSIS + Portable, x64)
+        run: npx electron-builder --win --x64
+        env:
+          CSC_LINK: ${{ secrets.CSC_LINK }}
+          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
       - uses: actions/upload-artifact@v4
         with:
-          name: AN-POS-Portable
-          path: release/*.exe
+          name: AN-POS-Windows
+          path: |
+            release/*.exe
+            release/latest.yml
+            release/*.blockmap
   release:
     ...
     steps:
       - uses: actions/download-artifact@v4
         with:
-          name: AN-POS-Portable
+          name: AN-POS-Windows
           path: release/
       - uses: softprops/action-gh-release@v2
         with:
-          files: release/*.exe
+          files: |
+            release/*.exe
+            release/latest.yml
           generate_release_notes: true
```

#### [MODIFY] [package.json](file:///home/ammar/AN-POS-TEST/package.json)
- تثبيت إصدارات الأدوات المضافة (pin) لضمان بناء قابل للتكرار.

---

### المرحلة 6 — نظام التحديث الآلي (مقابل خطة يدوية) 🟠 P1

> يعتمد على القرار 3.

#### خيار A (موصى به) — `electron-updater`
- `npm i electron-updater` → إضافته إلى `dependencies` الحقيقية.
- [MODIFY] [package.json](file:///home/ammar/AN-POS-TEST/package.json): إضافة `publish` بمعرّف المستودع **الإنتاجي** (لا `AN-POS-TEST`).
- [NEW] `electron/main/updater.ts`: `autoUpdater.checkForUpdatesAndNotify()` + أحداث `update-available`/`downloaded` إلى العارض.
- [MODIFY] شاشة «التحديثات» في الواجهة: عرض الحالة الحقيقية + زر «تثبيت الآن».

#### خيار B — إشعار يدوي
- [NEW] `electron/main/updater.ts`: جلب `https://github.com/<owner>/<repo>/releases/latest` ومقارنة `version`، وإظهار إشعار «يتوفر إصدار جديد» مع رابط التحميل.

#### مشترك
- [MODIFY] [electron/main/database.ts](file:///home/ammar/AN-POS-TEST/electron/main/database.ts) / updater: التأكد من أن التحديث يعيد تشغيل التطبيق بأمان (إغلاق قاعدة البيانات أولاً).

---

### المرحلة 7 — التنظيف والاتساق 🟡 P2

- [MODIFY] [package.json](file:///home/ammar/AN-POS-TEST/package.json) — إضافة السكربتات المفقودة التي يستدعيها `scripts/set-version.mjs`:
```jsonc
"set-version": "node scripts/set-version.mjs",
"bump:patch": "node scripts/set-version.mjs patch",
"bump:minor": "node scripts/set-version.mjs minor",
"bump:major": "node scripts/set-version.mjs major",
"assets:installer": "node scripts/generate-installer-assets.js"
```
- [MODIFY] ربط `assets:installer` في `prepackage`، أو توثيق أنه يدوي (الأصول مضمّنة حالياً في `build/`).
- [MODIFY] [EXE_PACKAGING_AND_DATABASE_ARCHITECTURE.md](file:///home/ammar/AN-POS-TEST/EXE_PACKAGING_AND_DATABASE_ARCHITECTURE.md) — تصحيح: `anpos.db` لا `an-pos.db`، مسار التثبيت `C:\AN POS`، مصفوفة التوافق، وأنظمة البناء الفعلية.
- [MODIFY] [electron/main/seed.ts](file:///home/ammar/AN-POS-TEST/electron/main/seed.ts) — خيار «تضمين بيانات تجريبية» في معالج الإعداد (افتراضي: لا).
- تقليل حجم الحزمة (~154MB): استبعاد `src/test/**`، ومراجعة إدراج `tesseract.js`/`pdfjs-dist` وموارد `@fontsource` غير المستخدمة.

---

## 3. خطة التحقق والضمانات (Verification Plan)

### 3.1 اختبارات آلية
```bash
npm run typecheck
npm run lint
npm run test        # يتضمن src/test/customInstallerAndFirstRun.test.ts
npm run build
```
- [ ] إضافة/تحديث اختبارات `customInstallerAndFirstRun.test.ts`:
  - رفض `adminPin` الفارغ/الضعيف.
  - إنشاء نسخة احتياطية `pre_migration_*.db` قبل الهجرة.
  - أن `an-pos-env.json` لم يعد مرجعاً مطلوباً.

### 3.2 اختبار حزم فعلي (Windows)
- [ ] تثبيت نظيف → الحزمة تعمل **بدون UAC** (بعد المرحلة 1).
- [ ] التحقق من ظهور نافذة UAC **للمثبّت فقط**.
- [ ] ترقية فوق نسخة قائمة → التأكد من وجود `backups\pre_upgrade_*.db` وسلامة البيانات.
- [ ] تفعيل وضع الخادم → `netsh advfirewall firewall show rule name="AN POS LAN Server"` يعرض المنفذ الفعلي.
- [ ] إزالة التثبيت (`/S` صامتة) → لا تعليق.
- [ ] التحقق: قاعدة البيانات في `%APPDATA%\an-pos\anpos.db`، والصيغة `integrity_check=ok`.
- [ ] تشغيل محرر التشغيل الأول → **إلزام** تعيين كلمة مرور المدير، ورفض `admin1234`.

### 3.3 فحص أثر التغييرات (إلزامي — AGENTS.md)
قبل تحرير أي دالة:
```
impact({ target: "runAutoMigration", direction: "upstream" })
impact({ target: "initDatabase", direction: "upstream" })
impact({ target: "seedDatabase", direction: "upstream" })
impact({ target: "saveFirstRunSetup", direction: "upstream" })
```
وبعد الإنهاء وقبل commit:
```
detect_changes({ scope: "compare", base_ref: "main" })
```

### 3.4 معايير القبول (Definition of Done)
- [ ] لا `requireAdministrator` على التطبيق (المثبّت فقط).
- [ ] `integrity_check` يمرّ + نسخة احتياطية قبل كل هجرة.
- [ ] لا كلمة مرور افتراضية صالحة في أي تثبيت جديد.
- [ ] CI يبني NSIS + Portable، ويُشغّل typecheck/test، وينشر `latest.yml`.
- [ ] لا وجود لـ`an-pos-env.json` ولا لمصفوفة توافق كاذبة.
- [ ] (`electron-updater` إن اعتُمد القرار 3).

---

## 4. مصفوفة التتبع والتقدير

| المرحلة | البند | الأولوية | الملفات | الحجم | مخاطرة |
| :-- | :--- | :---: | :--- | :---: | :---: |
| 1.1 | تقليل الصلاحيات + التوقيع | 🔴 | `package.json` | S | متوسطة (اختبار ميداني) |
| 1.2 | `app.setName` | 🔴 | `index.ts` | XS | منخفضة |
| 1.3 | إزالة توافق Win7 | 🔴 | `index.ts` | S | منخفضة |
| 1.4 | تصحيح ترويسة NSIS | 🔴 | `installer.nsh` | XS | منخفضة |
| 2.1 | حذف env الميت | 🔴 | `installer.nsh` | XS | منخفضة |
| 2.2 | جدار ناري ديناميكي | 🟠 | `installer.nsh` + `server/index.ts` + `net/firewall.ts` | M | متوسطة |
| 2.3 | وضع صامت | 🟡 | `installer.nsh` | XS | منخفضة |
| 3.1 | نسخة قبل الهجرة | 🔴 | `database.ts` | S | منخفضة |
| 3.2 | إزالة اعتراض الهجرة | 🔴 | `database.ts` + ملفات الهجرة | M | **عالية** |
| 3.3 | استرداد عند الفشل | 🟠 | `index.ts` | M | متوسطة |
| 3.4 | فحص سلامة | 🟡 | `ipc/system.ts` | S | منخفضة |
| 4.1 | حقل PIN في المحرر | 🔴 | `FirstRunWizardModal.tsx` | M | منخفضة |
| 4.2 | رفض القيم الضعيفة | 🔴 | `ipc/system.ts` + `seed.ts` | M | متوسطة |
| 4.3 | إزالة اعتماد localStorage | 🟠 | `LoginPage.tsx` + `FirstRunGuard.tsx` | S | منخفضة |
| 5 | CI: NSIS + توقيع + نشر | 🔴 | `build.yml` + `package.json` | M | متوسطة |
| 6 | التحديث الآلي | 🟠 | `updater.ts` + `package.json` + واجهة | L | متوسطة |
| 7 | تنظيف واتساق | 🟡 | متعدد + الوثيقة | M | منخفضة |

**الحجم**: XS ≤ 30 دقيقة · S 1-3 س · M 3-8 س · L 8 س+

---

## 5. المخاطر وخطة التراجع (Rollback)

| المخاطرة | الاحتمال | الأثر | التخفيف / التراجع |
| :--- | :---: | :---: | :--- |
| فشل طباعة/درج النقود بعد إزالة الارتفاع | متوسطة | مرتفع | المرحلة 0 قبل التنفيذ؛ العودة إلى `requireAdministrator` + خدمة مساعدة |
| خطأ في تعديل الهجرة ⇒ بيانات تالفة | منخفضة | **حرج** | نسخة `pre_migration_*.db` إلزامية + اختبار على قاعدة حقيقية + مراجعة impact |
| فقدان وصول المدير بعد فرض تغيير PIN | منخفضة | مرتفع | مسار استرداد بمفتاح استرجاع/Trial + توثيق PIN في تقرير التثبيت |
| تعطّل البناء بسبب غياب الشهادة | متوسطة | متوسط | التوقيع **مشروط** بمتغيرات البيئة (`CSC_LINK`) — البناء المحلي يعمل |
| كسر سلوك التحديث اليدوي الحالي | منخفضة | متوسط | الإبقاء على مسار `Setup.exe` اليدوي كخطة بديلة دائماً |
| نقل مسار البيانات عرضاً | منخفضة | مرتفع | `app.setName('an-pos')` صريح + اختبار مسار `userData` |

### ترتيب التنفيذ الموصى به (مخرجات قابلة للتحقق)
1. **دفعة الأمان (1 + 2.1 + 4):** تقليل الصلاحيات + إزالة الإعداد الميت + إلغاء كلمة المرور الافتراضية.
2. **دفعة البيانات (3):** نسخة قبل الهجرة + إزالة الاعتراض + مسار الاسترداد.
3. **دفعة التوزيع (5 + 2.2):** CI وNSIS والتوقيع والجدار الديناميكي.
4. **دفعة التحديث (6).**
5. **دفعة التنظيف (7 + 2.3).**

---

## 6. ملحق: خريطة الملفات المتأثرة

| الملف | نوع التغيير | المراحل |
| :--- | :--- | :--- |
| `package.json` | تعديل | 1.1 · 5 · 6 · 7 |
| `electron/installer.nsh` | تعديل | 1.4 · 2.1 · 2.2 · 2.3 |
| `electron/main/index.ts` | تعديل | 1.2 · 1.3 · 3.3 |
| `electron/main/database.ts` | تعديل | 3.1 · 3.2 |
| `electron/main/seed.ts` | تعديل | 4.2 · 7 |
| `electron/main/ipc/system.ts` | تعديل | 3.4 · 4.2 |
| `electron/main/server/index.ts` | تعديل | 2.2 |
| `electron/main/net/firewall.ts` | **جديد** | 2.2 |
| `electron/main/updater.ts` | **جديد** | 6 |
| `src/components/setup/FirstRunWizardModal.tsx` | تعديل | 4.1 |
| `src/pages/auth/LoginPage.tsx` | تعديل | 4.3 |
| `src/app/guards/FirstRunGuard.tsx` | تعديل/حذف شيفرة | 4.3 |
| `.github/workflows/build.yml` | تعديل | 5 |
| `EXE_PACKAGING_AND_DATABASE_ARCHITECTURE.md` | تعديل | 7 |
| `electron/drizzle/migrations/*.sql` | تعديل | 3.2 |

---

> **ملاحظة ختامية**: البند 3.2 (اعتراض الهجرة) هو الوحيد عالي الخطورة في الخطة لأنه يلمس بيانات العملاء مباشرة — لا يُنفَّذ دون نسخة احتياطية مُتحقَّق منها ومراجعة أثر كاملة.
