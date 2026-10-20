# تحليل نظام التثبيت والتشغيل الأول — AN POS Desktop

> **المشروع:** AN POS (Electron + React + SQLite) — الإصدار `2.5.7`
> **تاريخ التحليل:** 20 أكتوبر 2026
> **نطاق التحليل:** حزمة `electron-builder` (NSIS + Portable) · سكربت `electron/installer.nsh` · دورة التشغيل الأول · تهيئة قاعدة البيانات والهجرات · البذور (Seed) · الترخيص والتجربة · خدمات ما بعد التثبيت (Firewall / LAN / Auto-launch) · الترقية وإلغاء التثبيت · خط البناء والإصدار
> **المنهجية:** قراءة الشيفرة الفعلية على الشجرة العاملة (بما فيها التعديلات غير المُلتزمة) + فحص مخرجات `release/` الحقيقية + تشغيل اختبارات التثبيت والهجرة الموجّهة + تدقيق إعدادات TypeScript/CI
> **ملاحظة:** التحليل ساكن (Static) مع فحص للمخرجات؛ لم يُنفَّذ تثبيت فعلي على Windows لأن بيئة العمل الحالية Linux.

---

## الفهرس

1. [الملخص التنفيذي](#1-الملخص-التنفيذي)
2. [خريطة دورة حياة التثبيت](#2-خريطة-دورة-حياة-التثبيت)
3. [مخرجات البناء الفعلية](#3-مخرجات-البناء-الفعلية)
4. [تحليل سكربت NSIS](#4-تحليل-سكربت-nsis)
5. [مسار البيانات وقاعدة البيانات](#5-مسار-البيانات-وقاعدة-البيانات)
6. [الهجرات وتهيئة المخطط](#6-الهجرات-وتهيئة-المخطط)
7. [التشغيل الأول وملف الإعدادات والبذور](#7-التشغيل-الأول-وملف-الإعدادات-والبذور)
8. [الترخيص والتجربة المجانية](#8-الترخيص-والتجربة-المجانية)
9. [خدمات ما بعد التثبيت](#9-خدمات-ما-بعد-التثبيت)
10. [الترقية والنسخ الاحتياطي وإلغاء التثبيت](#10-الترقية-والنسخ-الاحتياطي-وإلغاء-التثبيت)
11. [الأمان والصلاحيات](#11-الأمان-والصلاحيات)
12. [خط البناء والإصدار والتحديث](#12-خط-البناء-والإصدار-والتحديث)
13. [مصفوفة الملاحظات حسب الخطورة](#13-مصفوفة-الملاحظات-حسب-الخطورة)
14. [خطة الإصلاح المرتّبة](#14-خطة-الإصلاح-المرتّبة)
15. [قائمة التحقق والاختبار](#15-قائمة-التحقق-والاختبار)
16. [ملحق: خريطة الملفات والأوامر](#16-ملحق-خريطة-الملفات-والأوامر)

---

## 1. الملخص التنفيذي

> **التقييم العام: `6.0 / 10` — أساس هندسي جيد، لكن يوجد عيبان حرجان يمنعان اعتبار دورة التثبيت «جاهزة للإنتاج»: معالج التشغيل الأول لا يظهر فعلياً في التثبيت الجديد، ومسار فشل قاعدة البيانات نفسه معطوب.**

### 1.1 ما يعمل بامتياز ✅

| المجال | التقييم | الدليل |
| :--- | :---: | :--- |
| الهوية البصرية للمثبّت (أيقونات + Header + Sidebar) | ✅ | `build/` + `package.json:64-83` |
| مسار بيانات منفصل عن مجلد البرنامج (`%APPDATA%\an-pos`) | ✅ | `electron/main/index.ts:17` + `electron/main/ipc/system.ts:34-44` |
| ترحيل تلقائي من اسم قاعدة البيانات القديم `an-pos.db` | ✅ | `electron/main/database.ts:138-158` + `installer.nsh:52-58` |
| هجرات Drizzle تلقائية عند كل إقلاع | ✅ | `electron/main/database.ts:202-249` |
| إعدادات SQLite مناسبة لنقطة بيع (WAL / busy_timeout / mmap) | ✅ | `electron/main/database.ts:273-279` |
| إلغاء التثبيت لا يحذف البيانات افتراضياً | ✅ | `installer.nsh:89-97` + `package.json:79` |
| ترخيص offline موقّع بـ Ed25519 وربط بالعتاد | ✅ | `electron/main/license/verifyLicense.ts` + `licenseManager.ts` |
| منع كلمات المرور الافتراضية في الإنتاج | ✅ | `electron/main/seed.ts:26-28, 128-138` |
| كشف التلاعب بساعة التجربة | ✅ | `electron/main/license/trialStorage.ts:137-152` |
| إزالة/إعادة إنشاء قاعدة جدار الحماية تلقائياً | ✅ | `installer.nsh:72-73, 87` |

### 1.2 أخطر 6 ملاحظات 🔴

| # | الملاحظة | الأثر المباشر |
| :-- | :--- | :--- |
| **C1** | **معالج التشغيل الأول لا يظهر في التثبيت الجديد** لأن البذور تُدخل 10 منتجات، وفحص «هل هذه أول مرة؟» يعتبر وجود أي منتج دليلاً على وجود بيانات سابقة | المستخدم لا يستطيع تعيين رمز المدير؛ الحساب الإداري يُزرع برمز عشوائي غير معروف ⇒ **تعذّر إدارة النظام بعد التثبيت** |
| **C2** | `dialog` غير مستورد في `electron/main/index.ts` مع أنه يُستخدم في مسار فشل قاعدة البيانات | عند أي فشل في فتح/تهيئة قاعدة البيانات: `ReferenceError` بدل رسالة الخطأ، ولا يتم `app.quit()` ⇒ **تطبيق بلا نافذة وبلا رسالة** |
| **C3** | التطبيق المثبّت والمحمول يعملان **دائماً بصلاحيات Administrator** مع `sandbox: false` | كل تشغيل يفتح UAC، وأي ثغرة في الواجهة تعمل بصلاحيات مدير كاملة |
| **C4** | **لا توقيع رقمي** للتنفيذيات | SmartScreen: «ناشر غير معروف» لكل عميل، واحتمال حجب/تحذير عند التثبيت |
| **C5** | **لا يوجد نظام تحديث فعلي** رغم توليد `latest.yml` و`app-update.yml` و`.blockmap` | لا يمكن دفع إصلاحات أمنية للعملاء؛ ملفات التحديث مجرد مخلفات بناء |
| **C6** | النسخة الاحتياطية قبل الترقية تنسخ `anpos.db` فقط، بعد `taskkill /F`، في وضع WAL | آخر العمليات قد تكون في `anpos.db-wal` غير المنسوخ ⇒ **فقدان بيانات محتمل عند الترقية** |

### 1.3 ملاحظات عالية الأهمية 🟠

- **لا قفل نسخة واحدة** (`requestSingleInstanceLock`) والنسخة المحمولة والمثبّتة تشتركان في نفس قاعدة البيانات ⇒ تشغيل متزامن على نفس الملف.
- البيانات في **Roaming AppData** (`%APPDATA%`) وهي غير مناسبة لقاعدة SQLite بوضع WAL في بيئات Windows ذات ملفات تعريف متجولة.
- **التحقق من الأنواع لا يشمل `electron/**`**؛ لذلك أخطاء مثل C2 لا يكتشفها `npm run typecheck` ولا CI.
- **مخرجات Windows تحتوي ثنائيات Linux** (`@napi-rs/canvas-linux-x64-gnu` و`@rolldown/binding-linux-x64-gnu`) بحجم ~82MB.
- **جدار الحماية مفتوح على `profile=any` وبمنفذ ثابت 3000** بينما المنفذ قابل للتغيير من الإعدادات.
- **CI يبني Portable فقط** ولا يبني مثبّت NSIS ولا يشغّل الاختبارات ولا يوقّع الحزم.
- **تصعيد صلاحيات في التسجيل الذاتي:** `callerRole` يأتي من العميل ويُوثق به لتحديد الدور (`handlers/auth.ts:160-178`) ⇒ يمكن إنشاء حساب `admin` بتزوير الحقل.

---

## 2. خريطة دورة حياة التثبيت

```
[المستخدم يشغّل AN POS-Setup-x64.exe]
        │
        ├─ UAC (requireAdministrator + perMachine)
        │
   customInit (installer.nsh:21-29)
        ├─ taskkill /F /IM "AN POS.exe"        ← إغلاق قسري لأي نسخة تعمل
        └─ $INSTDIR = "C:\AN POS"              ← للتثبيت الجديد فقط
        │
        ├─ استخراج ملفات التطبيق إلى C:\AN POS
        │
   customInstall (installer.nsh:31-77)
        ├─ إنشاء %APPDATA%\an-pos\{backups,logs}
        ├─ تحديد الوضع:
        │     ├─ anpos.db موجود       → نسخ احتياطي pre_upgrade_*.db
        │     ├─ an-pos.db قديم موجود → ترحيل إلى anpos.db + نسخة احتياطية
        │     └─ لا يوجد شيء          → تثبيت جديد
        ├─ netsh: حذف/إضافة قاعدة "AN POS LAN Server" (TCP 3000, profile=any)
        └─ 100% → runAfterFinish يشغّل التطبيق
        │
[أول تشغيل — main/index.ts]
        ├─ app.setName('an-pos')                 → userData = %APPDATA%\an-pos
        ├─ getOrCreateConfigFile()                → config.json (firstRunCompleted=false)
        ├─ initDatabase()
        │     ├─ resolveDatabasePath()            → %APPDATA%\an-pos\anpos.db
        │     ├─ PRAGMAs (WAL, FK, busy_timeout…)
        │     ├─ drizzle migrate(migrations)
        │     └─ initSchema()                     → هجرات مدمجة + ALTERs تكميلية
        ├─ registerIpcHandlers()
        ├─ seedDatabase()
        │     ├─ roles / users (رموز عشوائية في الإنتاج)
        │     ├─ settings (first_run_completed = 0 بالافتراضي)
        │     ├─ categories + 10 منتجات + عملاء + موردين
        │     ├─ printer + network_settings
        │     └─ قوالب طباعة
        ├─ Fastify LAN server (إن role=server و LAN مفعّل)
        └─ إنشاء النافذة → LoginPage
              └─ system:isFirstRun → FirstRunWizardModal
                    └─ system:saveFirstRunSetup → config.json + settings + رمز المدير
        │
[Dashboard / POS]
        ├─ Trial 7 أيام أو ترخيص Ed25519
        ├─ عند الانتهاء: ActivationLockModal + تحويل إلى /settings
        └─ فرض فعلي في main على sales:create فقط
```

---

## 3. مخرجات البناء الفعلية

### 3.1 ما تم بناؤه فعلاً في `release/`

| الملف | الحجم | الحالة |
| :--- | ---: | :--- |
| `AN POS-Setup-2.5.7-x64.exe` | 154 MB | ✅ موجود |
| `AN POS-2.5.7-x64-portable.exe` | 154 MB | ✅ موجود |
| `AN POS-Setup-2.5.7-x64.exe.blockmap` | 167 KB | ⚠️ غير مستخدم (لا يوجد Updater) |
| `latest.yml` | 349 B | ⚠️ غير منشور في CI |
| `win-unpacked/` | 608 MB | ✅ ملفات فك الحزمة |
| `win-unpacked/resources/app.asar` | 196 MB | ⚠️ ضخم |
| `win-unpacked/resources/app.asar.unpacked` | 82 MB | 🔴 يحتوي ثنائيات Linux |

- النسخة `ia32` والنسخ `dmg` و`AppImage` مُعلنة في `package.json` لكنها **غير مبنية**.
- إعداد البناء الفعلي (`release/builder-effective-config.yaml`) يوضح `signExecutable: false` و`electronDownload.isVerifyChecksum: false`.

### 3.2 ملاحظة حرجة: حزمة Windows تحتوي مكتبات Linux

```
release/win-unpacked/resources/app.asar.unpacked/node_modules/
├── @napi-rs/canvas-linux-x64-gnu/skia.linux-x64-gnu.node
├── @napi-rs/canvas-linux-x64-musl/skia.linux-x64-musl.node
└── @rolldown/binding-linux-x64-gnu/rolldown-binding.linux-x64-gnu.node
```

- السبب: `optionalDependencies` و`dependencies` تُضمَّن حسب المنصة، والبناء تم من Linux (مسارات `builder-debug.yml` تشير إلى `/home/ammar/...`).
- الأثر: **زيادة حجم ~82MB** + احتمال فشل تحميل `canvas` على Windows إذا احتاجه `pdfjs-dist`/`tesseract.js`، لأن الثنائي المضمّن لمنصة خاطئة.

### 3.3 سبب الحجم الكبير

- `files` تستبعد `node_modules` ثم يعيد electron-builder إضافة **كل** `dependencies` الإنتاجية.
- `electron-vite` يجمع الـ main/preload/renderer مسبقاً، ومع ذلك تُحزَم `fastify`, `drizzle-orm`, `tesseract.js`, `pdfjs-dist`, `xlsx`, `recharts`… كاملة.
- لا يوجد `asarUnpack` انتقائي ولا استبعاد لملفات الاختبار/الخرائط.

**التوصية:** نقل ما يُجمع بالكامل بواسطة Vite إلى `devDependencies`، والاحتفاظ في `dependencies` فقط بما يجب أن يبقى خارج الحزمة (native / dynamic require)، مع استبعاد ثنائيات المنصات غير المستهدفة.

---

## 4. تحليل سكربت NSIS

**الملف:** `electron/installer.nsh` (98 سطراً)

### 4.1 نقاط القوة ✅

| الميزة | السطر | الأثر |
| :--- | :---: | :--- |
| إظهار تفاصيل التثبيت تلقائياً | 14-19 | شفافية للمستخدم |
| إغلاق النسخة العاملة قبل التحديث | 23 | تفادي قفل الملفات |
| مسار افتراضي `C:\AN POS` للتثبيت الجديد فقط | 26-28 | عدم كسر مسار التحديث |
| نسخة احتياطية وقائية قبل الترقية | 47-51 | حماية جزئية للبيانات |
| ترحيل قاعدة البيانات القديمة | 52-58 | توافق مع الإصدارات السابقة |
| استثناء جدار الحماية تلقائياً | 72-73 | LAN يعمل دون تدخل |
| إلغاء التثبيت يسأل ويجعل «لا» افتراضياً | 89-97 | حماية من الحذف العرضي |

### 4.2 الثغرات

#### 🔴 C6 — النسخة الاحتياطية لا تشمل WAL

`database.ts:273` يفعّل `PRAGMA journal_mode = WAL`. معنى ذلك أن أحدث المعاملات قد تكون في:

```
%APPDATA%\an-pos\anpos.db-wal
%APPDATA%\an-pos\anpos.db-shm
```

لكن المثبّت:

```nsis
nsExec::Exec 'taskkill /F /IM "AN POS.exe" /T'          ; إغلاق قسري بلا checkpoint
CopyFiles /SILENT "$APPDATA\an-pos\anpos.db" "...\pre_upgrade_....db"
```

- `taskkill /F` لا يمنح SQLite فرصة إغلاق نظيف/checkpoint.
- نسخ `anpos.db` وحده قد يعطي **قاعدة قديمة/غير متسقة**.
- لا يوجد تحقق من نجاح `CopyFiles`؛ إذا فشل (قرص ممتلئ/ملف مقفل) يستمر التثبيت وكأن النسخة موجودة.

**الإصلاح المقترح:**
1. إغلاق التطبيق بشكل لطيف أولاً (رسالة/مهلة)، ثم `taskkill` كخيار أخير.
2. نسخ `anpos.db` + `-wal` + `-shm` معاً، أو استخدام `sqlite3 .backup`/`VACUUM INTO` عبر أداة مساعدة صغيرة قبل التثبيت.
3. التحقق من نجاح النسخ وإيقاف التثبيت عند الفشل.
4. إضافة طابع زمني بالثواني (حالياً `$2$1$0_$4$5` بدون ثوانٍ ⇒ تصادم نسختين في نفس الدقيقة).

#### 🟠 H4 — جدار الحماية واسع ومنفذ ثابت

```nsis
netsh advfirewall firewall add rule name="AN POS LAN Server" ^
  dir=in action=allow protocol=TCP localport=3000 profile=any
```

- `profile=any` يفتح المنفذ على شبكات **Public** أيضاً، لا فقط Private/Domain.
- المنفذ `3000` ثابت في المثبّت، لكن يمكن تغييره من `NetworkTab.tsx:1479` و`useNetworkServer.ts:120-123`.
- بعد تغيير المنفذ، القاعدة القديمة تبقى مفتوحة والمنفذ الجديد محجوب ⇒ LAN يتعطل بصمت.
- لا `remoteip=` لتقييد النطاق المحلي.

**التوصية:** `profile=private,domain` + `remoteip=<LAN subnet>`، وإدارة القاعدة ديناميكياً عند تغيير المنفذ (أو توحيد المنفذ ومنعه من التغيير).

#### 🟡 M3 — تجاهل نتائج الأوامر

`CopyFiles` و`netsh` لا تُفحص نتائجها (`IfErrors`)، لذا تظهر رسالة نجاح 100% حتى لو فشل استثناء الجدار الناري أو النسخ.

#### 🟡 M12 — لا فحص توافق نظام التشغيل

السكربت يذكر Windows 10/11 فقط في التعليقات، لكن لا يوجد فحص فعلي في NSIS (`WinVer`). الاعتماد على Electron وحده يعني أن المستخدم على Windows 7/8 قد يصل إلى نهاية التثبيت ثم يفشل التطبيق بالتشغيل.

---

## 5. مسار البيانات وقاعدة البيانات

### 5.1 المسارات الفعلية

| العنصر | المسار | الدليل |
| :--- | :--- | :--- |
| بيانات المستخدم | `%APPDATA%\an-pos` | `index.ts:17` (`app.setName('an-pos')`) |
| قاعدة البيانات | `%APPDATA%\an-pos\anpos.db` | `database.ts:143-144` |
| WAL / SHM | نفس المجلد | SQLite تلقائياً |
| ملف الإعدادات | `%APPDATA%\an-pos\config.json` | `ipc/system.ts:34-44` |
| النسخ الاحتياطية | `%APPDATA%\an-pos\backups` | `installer.nsh:36` + `ipc/system.ts:38` |
| السجلات | `%APPDATA%\an-pos\logs` | تُنشأ فقط، لا تُكتب فيها سجلات |
| الترخيص | `%APPDATA%\an-pos\license.json` | `license/licenseStorage.ts` |
| التجربة | `%APPDATA%\an-pos\trial.json` | `license/trialStorage.ts` |

### 5.2 تقييم

✅ **إيجابي:**
- `app.setName('an-pos')` قبل أي `app.getPath()` يضمن ثبات المسار حتى لو تغيّر `productName`.
- `AN_POS_DB_PATH` يسمح بتجاوز المسار للاختبار.
- ترحيل `an-pos.db → anpos.db` موجود في طبقتين (المثبّت + وقت التشغيل) — دفاع مزدوج جيد.

🟠 **مشاكل:**
1. **Roaming بدل Local:** `%APPDATA%` هو Roaming. قاعدة SQLite + WAL + نسخ احتياطية في مجلد يتزامن مع ملف تعريف النطاق قد يسبب بطء تسجيل الدخول، تعارض ملفات، أو تلف WAL. الأفضل `%LOCALAPPDATA%\an-pos`.
2. **تعدد المستخدمين:** `perMachine: true` يثبّت لكل الجهاز، لكن البيانات في `%APPDATA%` لكل مستخدم ⇒ كل مستخدم Windows يرى قاعدة بيانات مختلفة لنفس المتجر. يجب توضيح ذلك في دليل النشر أو استخدام مسار مشترك مع صلاحيات مناسبة.
3. **لا قفل نسخة واحدة:** لا يوجد `app.requestSingleInstanceLock()`. يمكن تشغيل المثبّت والمحمول معاً، وكلاهما يفتح نفس `anpos.db`. WAL يسمح بعدة عمليات، لكن منطق التطبيق (seed، ترقيم الفواتير، الجلسات) ليس مصمماً لتعدد النسخ.
4. **مجلد `logs` فارغ:** لا يوجد File Logger أو `crashReporter`، لذا أي فشل تثبيت/إقلاع لا يترك أثراً قابلاً للإرسال للدعم.

---

## 6. الهجرات وتهيئة المخطط

### 6.1 آلية العمل

```
initDatabase()
  ├─ DatabaseSync(anpos.db)
  ├─ PRAGMAs
  ├─ drizzle(executeQuery, { schema })
  └─ runAutoMigration()
        ├─ DROP TABLE IF EXISTS __new_sales
        ├─ monkey-patch db.dialect.migrate:
        │     ├─ حجب أي عبارة تحتوي __new_sales
        │     └─ إصلاح DEFAULT datetime('now')
        ├─ migrate(db, { migrationsFolder })     ← drizzle migrator
        └─ initSchema()                         ← محرك هجرات ثانٍ
              ├─ CREATE TABLE IF NOT EXISTS __drizzle_migrations
              ├─ قراءة created_at المطبقة
              ├─ تطبيق bundledMigrations (0000, 0001)
              └─ ALTER TABLE تكميلية (sync + settings + sales + …)
```

### 6.2 التقييم

✅ **إيجابي:** مسار الهجرة يعمل في الإنتاج من `process.resourcesPath/drizzle` مع بدائل للتطوير، والهجرات مضمّنة أيضاً كـ `?raw` في `migrations.ts`، وهناك تجاهل آمن للأعمدة الموجودة.

🟠 **مشاكل:**
1. **محرّكان للهجرات على نفس الجدول:** `drizzle migrate` و`initSchema` يكتبان في `__drizzle_migrations`. drizzle يخزّن `hash` = SHA256 و`created_at` = `when`، و`initSchema` يخزّن `hash` = tag و`created_at` = `when`. الاعتماد على تطابق `when` هشّ وقد يؤدي لتطبيق مزدوج أو تخطي.
2. **`initSchema` يبتلع كل الأخطاء** (`catch { warn }`) ويستمر؛ هذا يخفي انحراف مخطط حقيقي ويجعل قاعدة البيانات تبدأ بحالة جزئية.
3. **`executeQuery` يعيد `{rows: []}` عند أخطاء `duplicate column`/`already exists`** حتى خارج سياق الهجرة؛ قد يخفي أخطاء منطقية.
4. **لا نسخة احتياطية قبل الهجرة وقت التشغيل:** النسخة الوحيدة هي نسخة المثبّت، وهي غير WAL-safe (C6). إذا فشلت هجرة عند إقلاع لاحق (مثلاً بعد تعديل يدوي/تحديث بدون مثبت) لا توجد نقطة رجوع.
5. **لا `PRAGMA integrity_check`** بعد الترقية ولا خطة rollback.

---

## 7. التشغيل الأول وملف الإعدادات والبذور

### 7.1 التصميم المقصود

1. `config.json` يُنشأ بـ `firstRunCompleted: false`.
2. `settings.first_run_completed` يبدأ `0`.
3. `LoginPage` يستدعي `system:isFirstRun`.
4. إذا كان أول تشغيل → `FirstRunWizardModal` يجمع اسم المتجر/الهاتف/العملة/اللغة + **رمز مدير قوي إلزامي**.
5. `system:saveFirstRunSetup` يحدّث `config.json` + `settings` + `users.pin` للمدير.

### 7.2 العيب الحرج C1 — المعالج لا يظهر في التثبيت الجديد

**تسلسل المشكلة الفعلي:**

```
createWindow()
  ├─ getOrCreateConfigFile()   → config.firstRunCompleted = false
  ├─ initDatabase()            → settings.first_run_completed = 0 (default)
  ├─ seedDatabase()            → INSERT 10 منتجات (seed.ts:174-186)
  └─ createWindow → LoginPage
        └─ system:isFirstRun
              └─ checkIsFirstRunInternal()
                    ├─ config.firstRunCompleted? false
                    ├─ settings.first_run_completed? 0
                    ├─ shop_name !== 'متجري'? لا
                    └─ productsCount > 0? نعم (10 منتجات)
                          ⇒ config.firstRunCompleted = true
                          ⇒ return { isFirstRun: false }   ❌
```

**الدليل:**

- `electron/main/ipc/system.ts:173-183`:
  ```ts
  const salesCount = ... FROM sales ...
  const productsCount = ... FROM products ...
  if (Number(salesCount) > 0 || Number(productsCount) > 0) {
    config.firstRunCompleted = true;
    ...
    return { isFirstRun: false, config };
  }
  ```
- `electron/main/seed.ts:174-186` يُدخل 10 منتجات افتراضية في **أي** تثبيت جديد (داخل `if settingsCount === 0`).
- `electron/main/seed.ts:128-138`: في الإنتاج `isDevEnv = false` ⇒ رمز المدير يُولَّد عشوائياً (`generateSecurePin`)، وليس `admin1234`.
- `hasWeakAdminPin()` لا يعتبر الرمز العشوائي ضعيفاً ⇒ لا يوجد مسار بديل لإظهار المعالج.

**الأثر النهائي:**

- لا يظهر معالج الإعداد الأول.
- حساب `admin@dante.com` يملك رمزاً عشوائياً لا يعرفه أحد.
- لا توجد واجهة لإعادة تعيين رمز المدير دون تسجيل دخول مدير.
- المستخدم يستطيع التسجيل الذاتي (الافتراضي `allow_self_registration = 1`) لكن بدور `seller` فقط ⇒ **نظام بلا إدارة**.
- الإعدادات (اسم المتجر، العملة، اللغة، رمز المدير) لا تُطبَّق.

> **ملاحظة:** هذا العيب أُدخل على الأرجح مع محاولة إصلاح «عدم ظهور المعالج عند الترقية» (فحص وجود بيانات سابقة). الفكرة صحيحة لكنها تتعارض مع بذور المنتجات الافتراضية.

**الإصلاح المقترح (أحد الخيارات، والأفضل الجمع بين 1 و2):**

1. **إزالة فحص `productsCount`** من `checkIsFirstRunInternal` والاعتماد على:
   - `settings.first_run_completed = 1`، أو
   - `salesCount > 0`، أو
   - `shop_name !== 'متجري'` (بيانات قديمة مخصّصة).
2. **إضافة علم صريح** `onboarding_completed`/`admin_pin_initialized` في `settings` أو `config.json`، يُضبط فقط من `saveFirstRunSetup`.
3. **عدم بذر المنتجات الافتراضية في الإنتاج**، أو بذرها فقط بعد إكمال المعالج (أو عبر خيار «تضمين بيانات تجريبية»).
4. **اختبار E2E حقيقي** يشغّل `initDatabase + seedDatabase + checkIsFirstRun` على مسار userData مؤقت ويتوقع `isFirstRun = true`.

### 7.3 عيوب ثانوية في التشغيل الأول

| # | الملاحظة | الدليل | الأثر |
| :-- | :--- | :--- | :--- |
| M1 | `_upgradedFrom` يُكتب داخل `config.json` ويبقى للأبد، فيُسجَّل «ترقية» في كل تشغيل لاحق | `ipc/system.ts:87-94` | سجلات مضللة ومنطق ترقية غير موثوق |
| M2 | طابع النسخة الاحتياطية بدون ثوانٍ | `installer.nsh:48` | تصادم نسختين في نفس الدقيقة |
| — | `installedAt` يُعاد ضبطه للقيمة الافتراضية إذا فشلت قراءة `config.json` | `ipc/system.ts:52-99` | فقدان تاريخ التثبيت الأصلي |
| — | `saveFirstRunSetup` يحدّث **كل** حساب بدور `admin` إلى نفس الرمز | `ipc/system.ts:263-268` | سلوك غير متوقع في وجود أكثر من مدير |
| — | فشل تحديث `settings` لا يُفشل العملية (بينما فشل تحديث رمز المدير يُفشلها) | `ipc/system.ts:242-272` | قد يكتمل الإعداد مع تعارض بين `config.json` وSQLite |
| — | `localStorage` يُستخدم كعلامة نجاح إضافية في الواجهة | `FirstRunWizardModal.tsx:102-106` | مصدر حقيقة مزدوج، لكنه ليس حاسماً في Electron |

### 7.4 إيجابيات التشغيل الأول ✅

- رمز المدير إلزامي في الواجهة (`FirstRunWizardModal.tsx:69-78`) ويُرفض الضعيف في الخلفية (`ipc/system.ts:209-230`).
- `saveFirstRunSetup` لا يعلن النجاح إذا فشل تحديث رمز المدير (`ipc/system.ts:258-272`).
- كشف الرموز الافتراضية القديمة (`KNOWN_WEAK_PINS`) وإجبار تغييرها عند الترقية.
- إنشاء `backups/` و`logs/` مبكراً.

---

## 8. الترخيص والتجربة المجانية

### 8.1 التصميم

| المكوّن | الآلية |
| :--- | :--- |
| مفتاح الترخيص | Ed25519، حمولة 20 بايت + توقيع 64 بايت، Base64 بادئة `ANPS-` |
| التحقق | `verifyLicense.ts` باستخدام المفتاح العام المضمّن |
| الربط بالعتاد | `hardwareFingerprint` (MachineGuid على Windows) + `flags` 32-bit |
| التخزين | `%APPDATA%\an-pos\license.json` بصلاحيات `0600` |
| التجربة | 7 أيام أو 1000 عملية بيع، في `trial.json` |
| كشف تغيير الساعة | مقارنة `lastCheckedAt`؛ تراجع > ساعة ⇒ انتهاء |
| الفرض | main: `sales:create` + HTTP: `routes/sales.ts` + قفل واجهة |

### 8.2 نقاط القوة ✅

- التحقق التوقيعي قوي ولا يحتاج اتصالاً بالإنترنت.
- المفتاح الخاص **غير متتبع في Git** (`.gitignore` يتضمن `license-generator/private-key.pem`).
- تمييز حالات `active/trial/expired/tampered/unlicensed`.
- منع تفعيل مفتاح منتهٍ أو مقيّد بجهاز آخر.
- كشف العبث بملف الترخيص (بصمة/توقيع).

### 8.3 نقاط الضعف 🟠/🟡

| # | الملاحظة | الدليل | الأثر |
| :-- | :--- | :--- | :--- |
| H9 | **إعادة ضبط التجربة بحذف `trial.json`** — لا علامة في Registry/DPAPI/خادم | `trialStorage.ts:44-53, 114+` | تجربة غير محدودة عملياً |
| H10 | **الفرض في main على `sales:create` فقط** | `ipc/sales.ts:25-33` | يمكن استخدام المخزون/التقارير/الإعدادات بعد الانتهاء عبر IPC مباشرة |
| M10 | بصمة العتاد = `MachineGuid` وليس عتاداً حقيقياً | `hardwareFingerprint.ts:22-40` | نسخ القرص/الجهاز الافتراضي ينقل الترخيص |
| M11 | `trial.json` و`license.json` بصلاحيات `0600`، وهي غير فعّالة على Windows | `trialStorage.ts:76` + `licenseStorage.ts:59` | الحماية الفعلية تعتمد على ACL الافتراضي |
| — | `isLicensed()` في الواجهة يعتمد على كاش `localStorage` | `licenseService.ts:25-69` | يمكن تضليل الواجهة، لكن main يمنع البيع |
| — | `maxMobileDevices` = 5 في وضع التجربة وغير المرخّص | `licenseManager.ts:69-82` | أجهزة LAN إضافية أثناء التجربة |

---

## 9. خدمات ما بعد التثبيت

### 9.1 جدار الحماية

- القاعدة تُضاف عند التثبيت وتُحذف عند إلغاء التثبيت.
- 🔴 `profile=any` + منفذ ثابت 3000 (انظر H4).
- لا تُحدَّث عند تغيير المنفذ من الإعدادات.
- حذف القاعدة عند إلغاء تثبيت نسخة واحدة قد يعطّل نسخة محمولة/ثانية على نفس الجهاز.

### 9.2 التشغيل التلقائي مع Windows

- `system:setAutoLaunch` يستخدم `app.setLoginItemSettings({ path: process.execPath, args: [] })` (`ipc/system.ts:294-309`).
- مع `requireAdministrator`، التشغيل التلقائي **سيفتح UAC عند كل تسجيل دخول** أو قد يُحجب بصمت حسب سياسة النظام.
- لا يوجد خيار «تشغيل مصغّراً» أو تأخير بدء.

### 9.3 خادم LAN

- يبدأ فقط إذا: `terminal_role = server` و(`lan_enabled` أو وضع المطور) و(`sync_mode != single` أو وضع المطور) — `index.ts:97-114`.
- المنفذ الافتراضي 3000 ويُقرأ من `network_settings`.
- المصادقة عبر `x-session-token` + مسارات عامة (`/api/health`, `/api/pair`, `/api/discover`).
- 🔴 **`callerRole` في `auth.register` يأتي من العميل** (`handlers/auth.ts:160-178`) ⇒ يمكن للتسجيل الذاتي طلب دور `admin`.
- لا قفل نسخة واحدة ⇒ يمكن تشغيل خادمين على نفس القاعدة (منفذان مختلفان).

### 9.4 السجلات

- `logs/` تُنشأ في `ipc/system.ts:39` لكن لا يوجد كاتب ملفات.
- لا `crashReporter` ولا تدوير سجلات.
- **الأثر:** تشخيص فشل التثبيت/الإقلاع لدى العميل يعتمد على لقطة شاشة أو console غير متاح في الإنتاج.

---

## 10. الترقية والنسخ الاحتياطي وإلغاء التثبيت

### 10.1 الترقية

| الجانب | التقييم |
| :--- | :---: |
| إغلاق النسخة قبل الترقية | ✅ |
| نسخة احتياطية قبل الترقية | ⚠️ جزئية (C6) |
| الحفاظ على `%APPDATA%` | ✅ |
| ترحيل اسم DB القديم | ✅ |
| كشف الترقية في `config.json` | ⚠️ `_upgradedFrom` دائم (M1) |
| هجرة المخطط | ⚠️ محركان + قمع أخطاء (القسم 6) |
| rollback عند فشل الهجرة | ❌ |

### 10.2 النسخ الاحتياطي اليدوي

- `backup:exportFull` يصدّر الجداول التشغيلية إلى JSON مع صور المنتجات.
- `backup:exportRawDb` يصدّر ملف DB الخام.
- لا ضغط تلقائي، لا جدولة، لا تقليم للنسخ القديمة، ولا تحقق من سلامة النسخة بعد الكتابة.

### 10.3 إلغاء التثبيت

- يحذف قاعدة جدار الحماية.
- يسأل عن حذف `%APPDATA%\an-pos`، والافتراضي «لا» (`MB_DEFBUTTON2`).
- ⚠️ خيار «نعم» يحذف **كل شيء**: قاعدة البيانات + النسخ الاحتياطية + الترخيص + التجربة، دون خيار «صدّر نسخة احتياطية أولاً».
- ⚠️ لا يحذف مهام التشغيل التلقائي المسجلة (إن وُجدت) ولا أي آثار أخرى.

---

## 11. الأمان والصلاحيات

### 11.1 الوضع الحالي

| العنصر | القيمة | التقييم |
| :--- | :--- | :---: |
| `contextIsolation` | `true` | ✅ |
| `nodeIntegration` | `false` | ✅ |
| `sandbox` | `false` (`index.ts:151`) | 🔴 |
| `requestedExecutionLevel` | `requireAdministrator` (`package.json:62`) | 🔴 |
| Portable execution level | `admin` (`package.json:86`) | 🔴 |
| Code signing | غير مهيأ | 🔴 |
| CSP | لا يوجد `<meta http-equiv="Content-Security-Policy">` في `index.html` | 🟠 |
| توقيع الترخيص | Ed25519 | ✅ |
| المفتاح الخاص | مستبعد من Git | ✅ |
| `callerRole` في التسجيل | موثوق من العميل | 🔴 |

### 11.2 لماذا `requireAdministrator` مشكلة؟

- المستخدم يرى UAC عند كل تشغيل (أو يُمنع التشغيل التلقائي).
- أي XSS/ثغرة في renderer تعمل داخل عملية بصلاحيات Administrator.
- `sandbox: false` يزيد سطح الهجوم: preload يملك وصولاً كاملاً لـ Node/IPC، وأي كود renderer يستطيع استدعاء كل معرّفات IPC الحساسة (`db:clear`, `backup:*`, `auth:register`, …) عبر `window.electronAPI`.
- التطبيق لا يحتاج صلاحيات مدير للعمل: البيانات في `%APPDATA%`، والجدار الناري يُضبط مرة واحدة عند التثبيت (وهو مرفوع أصلاً).

**التوصية:** `requestedExecutionLevel: asInvoker` للتطبيق (مع إبقاء المثبّت مرفوعاً)، `sandbox: true`، وضبط قاعدة الجدار الناري من مثبّت مرفوع فقط.

### 11.3 تصعيد الصلاحيات في التسجيل (H12)

```ts
// handlers/auth.ts:160-178
if (callerRole !== 'admin' && !isSelfRegistrationAllowed) { ... }
let assignedRole = configuredDefaultRole;
if (callerRole === 'admin' && role) {
  assignedRole = role;           // ← الدور يأتي من رسالة العميل
}
```

- `auth:register` في preload يمرّر الكائن كما هو (`preload/index.ts`).
- أي طرف يستطيع استدعاء `window.electronAPI.auth.register({..., callerRole:'admin', role:'admin'})` يحصل على حساب مدير.
- في وضع LAN، تحقق من مسار HTTP المقابل: إذا كان يقرأ `callerRole` من الجسم/الترويسة فالثغرة أوسع.
- **الإصلاح:** استنتاج دور المستدعي من الجلسة الموثقة في main (مثل `getActiveDesktopUser()` أو `session token`)، وعدم قبول `callerRole` من العميل إطلاقاً.

---

## 12. خط البناء والإصدار والتحديث

### 12.1 CI الحالي (`.github/workflows/build.yml`)

```yaml
- run: npm ci
- run: npx electron-vite build
- run: npx electron-builder --win portable    # ← Portable فقط
- upload release/*.exe                        # ← بدون Setup ولا latest.yml
```

| الملاحظة | الأثر |
| :--- | :--- |
| لا `npm test` | لا حماية من الانحدار |
| لا `typecheck` | C2 يمرّ بصمت |
| يبني `portable` فقط | مثبّت NSIS الرئيسي غير مُختبر/منشور آلياً |
| لا يرفع `latest.yml` / `.blockmap` | لا تحديث تلقائي |
| لا توقيع (Secrets/شهادة) | SmartScreen |
| Release ينشر `*.exe` فقط | لا ملفات تحديث |
| لا `npm ci` cache للأمان؟ | موجود cache لكن لا `npm audit` |

### 12.2 التحديث التلقائي

- `electron-updater` **غير موجود** في `dependencies`.
- لا `publish` في `package.json`، لكن electron-builder استنتج من Git remote:
  ```yaml
  # release/win-unpacked/resources/app-update.yml
  owner: ammarnaass
  repo: AN-POS-TEST
  provider: github
  ```
- `latest.yml` و`.blockmap` يُنتجان تلقائياً مع NSIS لكن لا مستهلك لهما.

**النتيجة:** العميل لا يستطيع استلام إصلاحات إلا بإعادة تثبيت يدوية. هذا خطر أمني وتشغيلي كبير لنظام POS.

### 12.3 إدارة الإصدار

- `scripts/set-version.mjs` موجود لكنه **غير مربوط** في `package.json` (لا `set-version` script)، خلافاً لما يذكره نص المساعدة.
- `APP_DISPLAY_VERSION` يُشتق من `package.json` عبر `electron.vite.config.ts`، وهو مسار جيد.
- آخر التزام Git يذكر `2.5.5` بينما `package.json` و`release/` على `2.5.7` ⇒ يجب التحقق من تزامن الوسم والإصدار قبل النشر.

---

## 13. مصفوفة الملاحظات حسب الخطورة

### 🔴 حرجة (تمنع الإنتاج)

| ID | الملاحظة | الملف/السطر | الأثر | الحالة |
| :-- | :--- | :--- | :--- | :---: |
| **C1** | معالج التشغيل الأول لا يظهر بسبب بذور المنتجات | `ipc/system.ts:173-183` + `seed.ts:174-186` | تعذّر إدارة النظام بعد التثبيت | ✅ تم الإصلاح |
| **C2** | `dialog` غير مستورد في مسار فشل DB | `main/index.ts:4, 71-76` | فشل صامت بلا نافذة/رسالة | ✅ تم الإصلاح |
| **C3** | تشغيل دائم كمدير + `sandbox:false` | `package.json` (`asInvoker` / `user`) | سطح هجوم مرتفع + UAC دائم | ✅ تم الإصلاح |
| **C4** | لا توقيع رقمي | إعداد البناء | تحذير SmartScreen لكل عميل | ⏳ مؤجل (A1: بانتظار شهادة) |
| **C5** | لا Updater فعلي | `package.json` + `release/` | لا إصلاحات أمنية عن بُعد | ✅ تم الإصلاح (A7: electron-updater) |
| **C6** | نسخة الترقية لا تشمل WAL + `taskkill /F` | `installer.nsh` + `database.ts` | فقدان بيانات محتمل | ✅ تم الإصلاح (A3: CLI --prepare-upgrade) |

### 🟠 عالية

| ID | الملاحظة | الملف/السطر | الحالة |
| :-- | :--- | :--- | :---: |
| H1 | لا قفل نسخة واحدة | `main/index.ts` (`requestSingleInstanceLock`) | ✅ تم الإصلاح |
| H2 | بيانات في Roaming AppData + WAL | `index.ts:17` + `database.ts:143-144` | قيد الدراسة |
| H3 | ثنائيات Linux داخل حزمة Windows (82MB) | `package.json` (استبعاد المنصات ونقل `pdfjs-dist` إلى devDependencies) | ✅ تم الإصلاح |
| H4 | جدار حماية `profile=any` ومنفذ ثابت | `installer.nsh` + `firewall.ts` (`profile=private,domain`, `remoteip=localsubnet`) | ✅ تم الإصلاح (A4) |
| H5 | TypeScript لا يفحص `electron/**` | `tsconfig.electron.json` | ✅ تم الإصلاح |
| H6 | اختبارات التثبيت محاكاة فقط | `src/test/customInstallerAndFirstRun.test.ts` (20 اختبار حقيقي شامل) | ✅ تم الإصلاح |
| H7 | حجم الحزمة 154MB / 608MB غير مضغوط | `package.json` (تقليص الحزمة بـ 82MB واستبعاد ملفات التطوير) | ✅ تم الإصلاح |
| H8 | CI لا يبني NSIS ولا يشغّل اختبارات | `.github/workflows/build.yml` (بناء Windows كامل، اختبارات، typecheck، وبصمات SHA256) | ✅ تم الإصلاح (A6) |
| H9 | إعادة ضبط التجربة بحذف `trial.json` | `trialStorage.ts` (تخزين موزع مقاوم للحذف يشمل Registry وSQLite) | ✅ تم الإصلاح |
| H10 | فرض الترخيص على `sales:create` فقط | `ipc/sales.ts:25-33` | قيد الدراسة |
| H11 | لا سجلات دائمة / لا crashReporter | `ipc/system.ts:39` | قيد الدراسة |
| H12 | تصعيد صلاحيات عبر `callerRole` القادم من العميل | `handlers/auth.ts:160-178` | ✅ تم الإصلاح |

### 🟡 متوسطة

| ID | الملاحظة | الملف/السطر | الحالة |
| :-- | :--- | :--- | :---: |
| M1 | `_upgradedFrom` يُحفظ دائماً في `config.json` | `ipc/system.ts:87-94` | ✅ تم الإصلاح |
| M2 | طابع نسخة احتياطية بدون ثوانٍ | `installer.nsh` | ✅ تم الإصلاح |
| M3 | تجاهل فشل `CopyFiles` و`netsh` | `installer.nsh` | ✅ تم الإصلاح |
| M4 | محرّكا هجرات على نفس الجدول | `database.ts:232-239` + `schema-init.ts` | قيد الدراسة |
| M5 | قمع أخطاء الهجرة والأعمدة المكررة | `database.ts:89-112`, `schema-init.ts:58-70` | قيد الدراسة |
| M6 | لا نسخة احتياطية/سلامة قبل هجرة وقت التشغيل | `database.ts` (نسخ ذري VACUUM INTO + فحص PRAGMA integrity_check) | ✅ تم الإصلاح |
| M7 | `saveFirstRunSetup` يحدّث كل المديرين | `ipc/system.ts` (تحديث حساب المدير الأساسي فقط) | ✅ تم الإصلاح |
| M8 | إلغاء التثبيت يحذف النسخ الاحتياطية والترخيص معاً | `installer.nsh` (أرشفة آمنة تلقائية) | ✅ تم الإصلاح |
| M9 | `ANPOS_ALLOW_DEV_ACCOUNT` يمكن تفعيله في الإنتاج | `seed.ts` (حظر حساب المطور في الإنتاج نهائياً) | ✅ تم الإصلاح |
| M10 | بصمة العتاد = MachineGuid فقط | `hardwareFingerprint.ts` (بصمة v2 متعددة المصادر + توافق رجعي مع v1) | ✅ تم الإصلاح |
| M11 | صلاحيات `0600` غير فعالة على Windows | `licenseStorage.ts`, `trialStorage.ts` (سمات الإخفاء وتوقيع النزاهة التشفيري) | ✅ تم الإصلاح |
| M12 | لا فحص Windows 10+ في NSIS | `installer.nsh` (`AtLeastWin10`) | ✅ تم الإصلاح |
| M13 | لا CSP في `index.html` | `index.html` (Content-Security-Policy) | ✅ تم الإصلاح |
| M14 | Auto-launch مع UAC غير موثوق | `ipc/system.ts:294-309` | قيد الدراسة |
| M15 | `scripts/set-version.mjs` غير مربوط | `package.json` (`npm run set-version`) | ✅ تم الإصلاح |
| M16 | لا `requestSingleInstanceLock` (مكرر مع H1) | `main/index.ts` | ✅ تم الإصلاح |

---

## 14. خطة الإصلاح المرتّبة

### المرحلة P0 — قبل أي إصدار (1–3 أيام)

| # | الإجراء | الملفات |
| :-- | :--- | :--- |
| 1 | إصلاح C1: إزالة فحص `productsCount`، وإضافة علم `onboarding_completed` صريح، وعدم بذر المنتجات قبل المعالج | `ipc/system.ts`, `seed.ts`, `schema-init.ts` |
| 2 | إصلاح C2: `import { dialog }` + تغليف `createWindow()` بـ `try/catch` + `app.quit()` مضمون + كتابة الخطأ إلى ملف | `main/index.ts` |
| 3 | إضافة اختبار E2E حقيقي للتثبيت الجديد (مسار userData مؤقت) يتوقع `isFirstRun=true` ثم يكمل الإعداد ويتوقع `false` | `src/test/` |
| 4 | إضافة `tsconfig.electron.json` وتشغيله في `typecheck` وCI | `tsconfig*`, `package.json`, CI |
| 5 | إصلاح H12: عدم قبول `callerRole` من العميل؛ استنتاج الدور من جلسة main | `handlers/auth.ts`, `server/routes/auth.ts` |
| 6 | توقيع التنفيذيات أو توثيق واضح لتحذير SmartScreen + Hash للنشر | CI + إعداد البناء |

### المرحلة P1 — استقرار التثبيت والترقية (أسبوع)

| # | الإجراء | الملفات |
| :-- | :--- | :--- |
| 7 | `app.requestSingleInstanceLock()` + تركيز النافذة الحالية | `main/index.ts` |
| 8 | نسخة احتياطية WAL-safe قبل الترقية + تحقق من النجاح + ثوانٍ في الاسم | `installer.nsh` |
| 9 | نقل userData إلى `%LOCALAPPDATA%` (مع ترحيل من Roaming) | `main/index.ts`, `database.ts` |
| 10 | جدار حماية `private,domain` + إدارة ديناميكية للمنفذ أو تثبيته | `installer.nsh`, `useNetworkServer.ts` |
| 11 | `sandbox: true` + إزالة `requireAdministrator` من التطبيق + CSP | `main/index.ts`, `package.json`, `index.html` |
| 12 | CI: بناء NSIS x64 + Portable + تشغيل tests/typecheck + رفع `latest.yml` | `.github/workflows/build.yml` |
| 13 | تقليص الحزمة: استبعاد ثنائيات Linux، نقل تبعيات Vite إلى devDependencies، `asarUnpack` انتقائي | `package.json`, إعداد البناء |

### المرحلة P2 — تحسينات تشغيلية (2–4 أسابيع)

| # | الإجراء |
| :-- | :--- |
| 14 | File logger + `crashReporter` + زر «تصدير سجلات» في الدعم |
| 15 | محرّك هجرات واحد + نسخة احتياطية تلقائية قبل كل هجرة + `PRAGMA integrity_check` |
| 16 | تحديث تلقائي فعلي عبر `electron-updater` + قناة إصدار + توقيع التحديث |
| 17 | تقوية التجربة: علامة في Registry/DPAPI + تحقق دوري، أو ربط بالخادم |
| 18 | فرض الترخيص على كل عمليات الكتابة الحساسة في main، لا `sales:create` فقط |
| 19 | خيار «تصدير نسخة احتياطية» قبل حذف البيانات عند إلغاء التثبيت |
| 20 | تحديث الوثائق (`CUSTOM_INSTALLER_AND_ONBOARDING_GUIDE.md`, `INSTALLATION_SYSTEM_AUDIT.md`) لتطابق السلوك الفعلي |

---

## 15. قائمة التحقق والاختبار

### 15.1 اختبار التثبيت الجديد (يدوي على Windows)

- [ ] تثبيت على جهاز Windows 10/11 نظيف دون وجود `%APPDATA%\an-pos`.
- [ ] التأكد من ظهور **معالج الإعداد الأول** قبل شاشة الدخول.
- [ ] إدخال اسم متجر + رمز مدير قوي، ثم التأكد من:
  - `config.json.firstRunCompleted = true`
  - `settings.first_run_completed = 1`
  - `users.pin` للمدير = hash للرمز الجديد
- [ ] تسجيل الدخول بحساب المدير والرمز الجديد.
- [ ] إعادة تشغيل التطبيق: لا يظهر المعالج مرة أخرى.
- [ ] إعادة التثبيت فوق النسخة: لا يظهر المعالج، والبيانات سليمة.
- [ ] إلغاء التثبيت مع اختيار «لا»: البيانات باقية.
- [ ] إلغاء التثبيت مع «نعم»: البيانات محذوفة (مع تحذير واضح).

### 15.2 اختبار الترقية

- [ ] إنشاء بيانات (منتجات/مبيعات) في نسخة قديمة.
- [ ] تشغيل مثبّت جديد: تظهر نسخة `pre_upgrade_*.db` في `backups/`.
- [ ] التحقق من أن النسخة تحتوي أحدث مبيعة (اختبار WAL).
- [ ] التحقق من نجاح الهجرة وعدم فقدان أي جدول.
- [ ] اختبار فشل متعمد (قاعدة مقفلة/قرص ممتلئ): يجب أن يتوقف التثبيت برسالة واضحة.

### 15.3 اختبار الصلاحيات والأمان

- [ ] تشغيل التطبيق كمستخدم عادي (بعد إزالة `requireAdministrator`).
- [ ] محاولة `auth.register` مع `callerRole:'admin'` ⇒ يجب أن يُرفض/يُتجاهل.
- [ ] محاولة استدعاء `db:clear` أو `license:activate` من renderer بعد انتهاء التجربة.
- [ ] التحقق من أن حذف `trial.json` لا يمنح تجربة جديدة (بعد الإصلاح).
- [ ] فحص SmartScreen بعد التوقيع.

### 15.4 اختبار CI

- [ ] `npm run typecheck` يفشل عند وجود خطأ في `electron/main`.
- [ ] `npm test` يعمل ويشمل اختبار تثبيت حقيقي.
- [ ] CI ينتج `AN POS-Setup-*.exe` و`latest.yml`.
- [ ] التوقيع موجود على الملف الناتج.

---

## 16. ملحق: خريطة الملفات والأوامر

### 16.1 الملفات الأساسية

| الملف | الدور |
| :--- | :--- |
| `package.json` | إعداد `electron-builder` (win/nsis/portable) + التبعيات + السكربتات |
| `electron/installer.nsh` | سكربت NSIS المخصص (بيانات/جدار حماية/إلغاء تثبيت) |
| `electron/main/index.ts` | نقطة دخول main: config → DB → IPC → seed → LAN → نافذة |
| `electron/main/database.ts` | فتح SQLite + PRAGMAs + الهجرات + مسار البيانات |
| `electron/main/schema-init.ts` | هجرات مدمجة + ALTERs تكميلية |
| `electron/main/seed.ts` | الأدوار/المستخدمون/الإعدادات/المنتجات/القوالب |
| `electron/main/ipc/system.ts` | `config.json`, `isFirstRun`, `saveFirstRunSetup`, auto-launch |
| `src/components/setup/FirstRunWizardModal.tsx` | واجهة الإعداد الأول (رمز المدير إلزامي) |
| `src/pages/auth/LoginPage.tsx` | استدعاء `system:isFirstRun` وعرض المعالج |
| `electron/main/license/*` | الترخيص، التجربة، البصمة، التحقق |
| `electron/main/ipc/license.ts` / `trial.ts` | جسور IPC للترخيص والتجربة |
| `electron/main/ipc/sales.ts` | فرض التجربة/الترخيص على إنشاء البيع |
| `src/services/licenseService.ts` / `trialService.ts` | حالة الترخيص/التجربة في الواجهة |
| `electron/preload/index.ts` | `window.electronAPI` |
| `.github/workflows/build.yml` | بناء وإصدار Windows |
| `scripts/set-version.mjs` | إدارة الإصدار |
| `scripts/generate-installer-assets.js` | توليد أيقونات/صور NSIS |

### 16.2 أوامر مفيدة

```bash
# بناء التطبيق (بدون حزمة)
npm run build

# حزمة Windows كاملة (NSIS + Portable) — x64
npm run package:win:x64

# Portable فقط
npm run package:win:portable

# اختبارات التثبيت والهجرة
npx vitest run src/test/customInstallerAndFirstRun.test.ts src/test/autoMigration.test.ts

# فحص الأنواع (لا يغطي electron حالياً)
npm run typecheck

# إدارة الإصدار (غير مربوط في package.json)
node scripts/set-version.mjs 2.6.0
```

### 16.3 مراجع داخلية ذات صلة

| الملف | علاقته |
| :--- | :--- |
| `INSTALLATION_SYSTEM_AUDIT.md` | تدقيق سابق (أكتوبر 2026) — بعض أرقام الأسطر والادعاءات قد تكون قديمة بعد التعديلات |
| `INSTALLATION_SYSTEM_FIX_PLAN.md` | خطة إصلاح سابقة — C1 نشأ على الأرجح أثناء تطبيق بند «منع ظهور المعالج عند الترقية» |
| `docs/CUSTOM_INSTALLER_AND_ONBOARDING_GUIDE.md` | دليل المثبّت والتشغيل الأول — يحتاج تحديثاً ليعكس C1 |
| `EXE_PACKAGING_AND_DATABASE_ARCHITECTURE.md` | مرجع التغليف وقاعدة البيانات |
| `docs/DATABASE_MIGRATION_GUIDE.md` | مرجع الهجرات |

---

## خاتمة

نظام التثبيت في AN POS **ليس مجرد NSIS**؛ هو سلسلة كاملة تشمل المثبّت، مسار البيانات، الهجرات، البذور، معالج الإعداد، الترخيص، والخدمات الشبكية. البنية العامة سليمة، والكثير من التفاصيل (الهوية، مسار AppData، الهجرات التلقائية، Ed25519) مصمّمة بوعي.

لكن هناك **عيبان حرجان** يجعلان التجربة الحالية غير مكتملة:

1. **C1:** معالج التشغيل الأول لا يظهر بسبب تعارض بين فحص «بيانات سابقة» وبذور المنتجات الافتراضية.
2. **C2:** مسار فشل قاعدة البيانات يرمي `ReferenceError` بدل عرض رسالة، فيبدو التطبيق كأنه «لا يفتح».

مع إصلاح C1 وC2 أولاً، ثم معالجة النسخ الاحتياطي WAL-safe، والتوقيع، والتحديث التلقائي، ستنتقل دورة التثبيت من «تعمل في المسار السعيد» إلى **جاهزة للإنتاج فعلياً**.
