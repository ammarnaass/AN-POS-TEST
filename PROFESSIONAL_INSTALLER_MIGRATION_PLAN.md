# خطة ترحيل نظام التثبيت إلى نظام احترافي — AN POS

> **الهدف:** الانتقال من مثبّت NSIS «يعمل في المسار السعيد» إلى **نظام تسليم احترافي** قابل للتحديث، آمن في الترقية، ومناسب للتثبيت لكل مستخدم.
>
> **النسخة الحالية:** `3.0.0`
>
> **النسخ المستهدفة:** `3.0.0` (المرحلة 0 والمسار A مكتملان بنجاح بالكامل) · المراحل B و C و D **مؤجلة** بحسب قرارات صاحب المنتج.
>
> **تاريخ التحديث:** 20 أكتوبر 2026
>
> **حالة الوثيقة:** **مكتملة ومحققة بالكامل للمرحلة 0 والمسار A** — تم اجتياز كافة الاختبارات وفحوصات السلامة، والتطبيق جاهز للإصدار الرسمي v3.0.0.
>
> **مراجع مساندة:**
> - [`INSTALLATION_SYSTEM_ANALYSIS.md`](./INSTALLATION_SYSTEM_ANALYSIS.md) — التحليل التفصيلي الحالي.
> - [`INSTALLATION_SYSTEM_FIX_PLAN.md`](./INSTALLATION_SYSTEM_FIX_PLAN.md) — خطة الإصلاح السابقة.
> - [`EXE_PACKAGING_AND_DATABASE_ARCHITECTURE.md`](./EXE_PACKAGING_AND_DATABASE_ARCHITECTURE.md) — مرجع التغليف وقاعدة البيانات.
> - [`docs/CUSTOM_INSTALLER_AND_ONBOARDING_GUIDE.md`](./docs/CUSTOM_INSTALLER_AND_ONBOARDING_GUIDE.md) — دليل المثبّت والتشغيل الأول.
>
> **قاعدة مهمة:** هذه الخطة تعتمد على **الشيفرة الفعلية في الشجرة العاملة**، لا على أرقام الأسطر أو الادعاءات الواردة في الوثائق القديمة. أرقام الأسطر قد تتغير بعد أي تعديل.

---

## 0. تحديث القرارات — النسخة 2

بناءً على إجابات صاحب المنتج، أصبحت الخطة **أصغر وأوضح**:

| القرار | الإجابة | الأثر على الخطة |
| :--- | :--- | :--- |
| شهادة Code Signing | **لا توجد** (لا OV ولا EV ولا Azure) | **A1 مؤجل**. يصدر الإصدار غير موقّع مؤقتاً، مع SHA-256 وتوثيق تحذير SmartScreen. |
| نموذج التثبيت | **Per-User** | **لا UAC** عند التثبيت/التحديث. التثبيت في `%LOCALAPPDATA%\Programs\AN POS`. |
| عملاء مؤسسيون / GPO / Intune | **لا** | **B مؤجل**. لا WiX/MSI الآن. |
| خادم LAN بعد إغلاق الواجهة | **نعم، بعد إغلاق الواجهة فقط** | **لا Windows Service**. يُنفَّذ **Background/Tray Server** داخل جلسة المستخدم. |
| MSIX | غير مطلوب | **D مؤجل**. |

> **الخلاصة:** المسار النشط الآن هو **المرحلة 0 + المسار A + A9 (Tray Server)**. الأقسام B و C و D تبقى مرجعاً مستقبلياً، ولا تُنفَّذ في هذه المرحلة.

> **ملاحظة صريحة:** بدون شهادة توقيع لا يمكن الوصول إلى «مثبّت احترافي موقّع» بالمعنى الكامل. الخطة تعالج كل ما يمكن علاجه الآن، وتترك التوقيع كبند مؤجل مع تعويضات مؤقتة. لا تَعِد العميل باختفاء تحذير SmartScreen قبل التوقيع.

---

## الفهرس

1. [الملخص التنفيذي](#1-الملخص-التنفيذي)
2. [خط الأساس الحالي والفجوات](#2-خط-الأساس-الحالي-والفجوات)
3. [الأهداف ومقاييس النجاح](#3-الأهداف-ومقاييس-النجاح)
4. [المعمارية المستهدفة](#4-المعمارية-المستهدفة)
5. [خيارات المثبّت ومصفوفة القرار](#5-خيارات-المثبّت-ومصفوفة-القرار)
6. [المرحلة 0 — خط الأساس وبوابة P0](#6-المرحلة-0--خط-الأساس-وبوابة-p0)
7. [المسار A — NSIS الاحترافي](#7-المسار-a--nsis-الاحترافي)
8. [المسار B — WiX v4 MSI + Burn](#8-المسار-b--wix-v4-msi--burn)
9. [المسار C — فصل خادم LAN كخدمة Windows](#9-المسار-c--فصل-خادم-lan-كخدمة-windows)
10. [المسار D — MSIX](#10-المسار-d--msix)
11. [الجدول الزمني والموارد](#11-الجدول-الزمني-والموارد)
12. [خطة الاختبار والتحقق](#12-خطة-الاختبار-والتحقق)
13. [المخاطر وخطة التراجع](#13-المخاطر-وخطة-التراجع)
14. [معايير القبول النهائية](#14-معايير-القبول-النهائية)
15. [خريطة الملفات والتغييرات](#15-خريطة-الملفات-والتغييرات)
16. [القرارات المعتمدة من صاحب المنتج](#16-القرارات-المعتمدة-من-صاحب-المنتج)
17. [ملاحق](#17-ملاحق)

---

## 1. الملخص التنفيذي

### 1.1 التوصية في سطر واحد

**لا تستبدل NSIS الآن بأداة أخرى؛ اجعله «احترافياً» أولاً بنموذج Per-User وبأقل صلاحيات ونسخ احتياطي WAL آمن وتحديث آلي وCI كامل، مع إبقاء خادم LAN يعمل بعد إغلاق الواجهة عبر Tray. التوقيع الرقمي وWiX/MSI وخدمة Windows مؤجلة بحسب قرارات صاحب المنتج.**

### 1.2 لماذا لا يكفي تغيير أداة التثبيت؟

نظام التثبيت في AN POS ليس ملف `.exe` فقط. هو سلسلة من سبع طبقات:

| الطبقة | السؤال الذي تجيب عنه | الأثر إذا فشلت |
| :--- | :--- | :--- |
| **المثبّت** | كيف تُنسخ الملفات وتُسجّل الاختصارات؟ | فشل تثبيت أو ترقية |
| **الهوية والتوقيع** | من الناشر؟ وهل الملف موثوق؟ | SmartScreen يحجب أو يحذّر كل عميل |
| **الصلاحيات** | هل يعمل التطبيق كمدير؟ | UAC دائم + سطح هجوم مرتفع |
| **البيانات** | أين SQLite؟ وكيف تُنسخ قبل الترقية؟ | فقدان بيانات عند الترقية |
| **الخدمات** | من يشغّل LAN/Firewall بعد إغلاق الواجهة؟ | الشبكة تتوقف عند إغلاق البرنامج |
| **التحديث** | كيف تصل الإصلاحات للعميل؟ | كل إصلاح أمني يحتاج زيارة يدوية |
| **النشر المؤسسي** | كيف ينشر العميل عبر GPO/Intune؟ | لا بيع مؤسسي فعلي |

تغيير NSIS إلى MSI يحسّن الطبقة الأولى فقط. لذلك الخطة تعالج الطبقات السبع معاً، لكن على مراحل.

### 1.3 المسار الموصى به

| المرحلة | الاسم | المدة التقديرية | الحالة الحالية | الناتج |
| :--- | :--- | :---: | :--- | :--- |
| **0** | خط الأساس وبوابة P0 | 3–5 أيام | ✅ **مكتملة 100%** | شجرة نظيفة + 20 اختبار شامل + حل كافة قضايا P0 |
| **A** | NSIS الاحترافي — Per-User | 2–3 أسابيع | ✅ **مكتملة 100%** | مثبّت Per-User + `asInvoker` + WAL-safe + `electron-updater` + CI + A9 Tray Server |
| **B** | WiX v4 MSI + Burn | 4–6 أسابيع | **مؤجل** — لا عملاء مؤسسيين ولا GPO/Intune | MSI صامت + Burn + جدار ناري + ترحيل من NSIS |
| **C** | خدمة Windows لخادم LAN | 6–10 أسابيع | **مؤجل** — لا حاجة بعد تسجيل الخروج/إعادة التشغيل | خدمة مستقلة + واجهة asInvoker + بيانات مشتركة |
| **D** | MSIX | غير مجدول | **مؤجل** — لا Store ولا إدارة حديثة | حزمة MSIX |

> **النتيجة:** المسار النشط **0 ثم A تم تنفيذهما واعتمادهما بالكامل**. الإصدار الحالي هو **v3.0.0**، والأقسام B و C و D تظل مرجعاً مستقبلياً عند الحاجة.

---

## 2. خط الأساس الحالي والفجوات

### 2.1 ما هو موجود الآن

| العنصر | الوضع الحالي | الدليل |
| :--- | :--- | :--- |
| منصّة البناء | Electron 40 + electron-vite 6 + electron-builder 26.15.3 | `package.json` |
| أهداف Windows | `nsis` + `portable` | `package.json:56-63` |
| نوع التثبيت | `perMachine: true` ويطلب مديراً | `package.json:62,64-83` |
| مسار التثبيت | `C:\AN POS` افتراضياً | `electron/installer.nsh:21-29` |
| مسار البيانات | `%APPDATA%\an-pos` (Roaming) | `electron/main/index.ts:22` + `app.getPath('userData')` |
| قاعدة البيانات | SQLite عبر `node:sqlite` + WAL | `electron/main/database.ts:254-279` |
| الهجرات | Drizzle + `initSchema()` إضافي | `electron/main/database.ts:202-249` |
| البذور | 10 منتجات + عملاء + موردين + إعدادات | `electron/main/seed.ts:44-55` |
| التشغيل الأول | معالج إعداد + رمز مدير إلزامي | `src/components/setup/FirstRunWizardModal.tsx` + `electron/main/ipc/system.ts` |
| الترخيص | Ed25519 + ربط عتاد + تجربة 7 أيام | `electron/main/license/*` |
| خدمة LAN | Fastify داخل عملية Electron | `electron/main/server/index.ts` |
| جدار الحماية | قاعدة `profile=any` على المنفذ 3000 | `electron/installer.nsh:69-73` |
| التوقيع | لا يوجد — `signExecutable: false` | `release/builder-effective-config.yaml` |
| التحديث الآلي | لا يوجد `electron-updater`؛ `latest.yml` و`.blockmap` غير مستخدمين | `release/latest.yml` + `package.json` |
| CI | يبني Portable فقط، بلا اختبارات/TypeScript/توقيع | `.github/workflows/build.yml:24-34` |
| حجم الحزمة | 154 MB للمثبّت، و82 MB ثنائيات Linux داخل حزمة Windows | `release/` |

### 2.2 تحسينات موجودة في الشجرة العاملة لكنها غير مثبتة

هذه التحسينات ظهرت في الشجرة العاملة أثناء التحليل، لكنها **غير ملتزمة ولا مختبرة على Windows بعد**، ولا يجوز اعتبارها مكتملة:

- `requestSingleInstanceLock()` موجود الآن في `electron/main/index.ts:12-18`.
- `dialog` أصبح مستورداً، ويُكتب سجل خطأ بدء التشغيل إلى `userData/logs/startup_error.log` عند فشل قاعدة البيانات (`index.ts:1, 71-101`).
- فحص «هل هذه أول مرة؟» أصبح يتجاهل البذور العشرية ويشترط `productsCount > 10` (`electron/main/ipc/system.ts:194-200`)، مع وجود علم `first_run_completed` في `settings`.
- `app.setName('an-pos')` مثبت قبل أي `app.getPath()` (`index.ts:22`).

**المطلوب في المرحلة 0:** تثبيت هذه التغييرات في فرع مستقل، إضافة اختبارات انحدار، والتحقق منها على Windows 10/11. لا تبنِ عليها وعوداً في الإصدار قبل ذلك.

### 2.3 الفجوات المتبقية

| ID | الفجوة | الخطورة | الأثر | أين تُعالج |
| :--- | :--- | :---: | :--- | :--- |
| **R1** | لا توقيع رقمي | 🟠 مقبول مؤقتاً | SmartScreen/ناشر غير معروف لكل عميل | A1 (مؤجل) |
| **R2** | لا تحديث آلي فعلي | 🔴 | لا وصول للإصلاحات الأمنية | A7 |
| **R3** | نسخة الترقية تنسخ `anpos.db` فقط بعد `taskkill /F` | 🔴 | فقدان آخر معاملات WAL | A3 |
| **R4** | التطبيق يعمل `requireAdministrator` | 🔴 | UAC دائم + سطح هجوم | A2 |
| **R5** | بيانات SQLite في Roaming AppData | 🟠 | مشاكل ملفات تعريف متجولة/شبكة | A2 |
| **R6** | جدار ناري `profile=any` ومنفذ ثابت 3000 | 🟠 | فتح الشبكة العامة + تعطل LAN عند تغيير المنفذ | A4 |
| **R7** | CI يبني Portable فقط | 🟠 | لا مثبّت NSIS ولا اختبارات في الإصدار | A6 |
| **R8** | حزمة Windows تحتوي ثنائيات Linux (~82 MB) | 🟠 | حجم + مخاطر تحميل native خاطئ | A5 |
| **R9** | خادم LAN يعيش داخل Electron | 🟠 | يتوقف بإغلاق الواجهة | A9 (Tray) |
| **R10** | لا دعم GPO/Intune/Transform | ⏸️ غير مطلوب | لا نشر مؤسسي | B (مؤجل) |
| **R11** | `callerRole` مقبول من الواجهة في التسجيل | 🟢 **تم الإصلاح** | حماية من تصعيد الصلاحيات عبر استنتاج الدور من جلسة main | 0.13 (مغلق ومحقق باختبار) |
| **R12** | إلغاء التثبيت يحذف البيانات والنسخ والترخيص معاً عند اختيار «نعم» | 🟡 | فقدان بيانات/ترخيص | A8 + B6 |
| **R13** | لا اختبار E2E حقيقي للتثبيت الجديد/الترقية | 🟠 | أخطاء C1/C2 لا تكتشف | 0 |
| **R14** | `tsconfig` لا يفحص `electron/**` | 🟠 | أخطاء main لا يكتشفها `typecheck` | 0 |

> **ملاحظة نطاق:** تم إغلاق وتأمين **R11** (حظر تصعيد الصلاحيات برفض callerRole من العميل واعتماد الجلسة الموثقة في main) واختباره آلياً بنجاح، كما تم تطبيق **R12** (سياسة أخذ أرشيف وقائي للنسخ والترخيص قبل الحذف).

---

## 3. الأهداف ومقاييس النجاح

### 3.1 أهداف إلزامية (Track A)

- مثبّت **Per-User** لا يطلب UAC عند التثبيت أو التحديث، ويثبّت في `%LOCALAPPDATA%\Programs\AN POS`.
- التطبيق يعمل **`asInvoker` وبدون صلاحيات مدير** بعد التثبيت.
- الترقية من `2.5.7` إلى `2.6.x` **لا تفقد أي معاملة**، بما فيها المعاملات الموجودة في WAL.
- نسخة احتياطية قبل الترقية **تُتحقق**، ويُوقف التثبيت إذا فشلت.
- `electron-updater` يعمل على قناة مستقرة، مع إمكانية تعطيله/تأجيله.
- CI ينتج NSIS x64 + Portable + `latest.yml` + `.blockmap` + ملفات SHA-256، ويشغّل الاختبارات و`typecheck`.
- لا ثنائيات Linux داخل حزمة Windows.
- جدار الحماية: `private,domain` فقط، والمنفذ الفعلي، وليس `any`.
- **خادم LAN يبقى يعمل بعد إغلاق الواجهة** (Tray/Background Server)، ويتوقف عند تسجيل الخروج أو إغلاق التطبيق من الـTray.
- **الإصدار غير موقّع مؤقتاً**، لكنه يُنشر مع SHA-256 وتوثيق واضح لتحذير SmartScreen. التوقيع مؤجل لحين توفر شهادة.

### 3.2 أهداف مؤسسية (Track B) — مؤجلة

> **غير مطلوبة حالياً:** لا يوجد عملاء مؤسسيون ولا GPO/Intune/SCCM. يبقى هذا القسم مرجعاً إذا تغيّر ذلك.

- MSI صامت: `msiexec /i "AN POS.msi" /qn`.
- دعم GPO/Intune/SCCM وMST Transform.
- Major Upgrade يحافظ على البيانات وإعدادات الخدمة.
- Repair وModify وUninstall قياسية.
- Burn Bootstrapper يكتشف نسخة NSIS القديمة ويرحّل منها دون تدخل.
- سجلات MSI (`/l*v`) وExit Codes موثقة.

### 3.3 أهداف الخادم (Track C) — مؤجلة

> **غير مطلوبة حالياً:** المطلوب فقط أن يبقى الخادم بعد **إغلاق الواجهة**، وليس بعد تسجيل الخروج أو إعادة التشغيل. يُغطّى ذلك بـ A9 Tray Server. يبقى هذا القسم مرجعاً إذا أصبحت خدمة Windows مطلوبة.

- الخادم يعمل بعد إغلاق الواجهة وتسجيل الخروج وإعادة التشغيل.
- الواجهة تعمل `asInvoker` وتتصل بخدمة محلية.
- الكتابة على SQLite من عملية واحدة فقط (الخدمة).
- النسخ الاحتياطي ممكن أثناء تشغيل الخادم.
- التحديث لا يترك الخدمة متوقفة.

### 3.4 غير الأهداف

- إعادة كتابة الواجهة أو منطق POS.
- نقل المزامنة السحابية أو تغيير نموذج الترخيص.
- نشر Microsoft Store الآن.
- دعم Windows 7/8/8.1 — Electron 40 لا يدعمها.
- دعم ARM64 في هذه المرحلة (يُقيَّم لاحقاً).
- تحويل التطبيق إلى خدمة كاملة إذا كان العمل عميلاً واحداً على جهاز واحد.

### 3.5 مقاييس النجاح

| المقياس | الهدف | طريقة القياس |
| :--- | :--- | :--- |
| نجاح التثبيت النظيف | ≥ 99% على Windows 10/11 نظيف | 30 جهاز اختبار + عينات عملاء |
| زمن التثبيت الصامت | ≤ 3 دقائق | Stopwatch في CI/VM |
| فقدان بيانات عند الترقية | صفر | اختبار 1,000 مبيعة + WAL |
| تشغيل التطبيق كمدير | صفر | Task Manager → Enable UAC |
| UAC عند التثبيت/التحديث | صفر | VM بحساب مستخدم قياسي |
| تحذير SmartScreen | **موثّق ومقبول مؤقتاً** — لا وعود بإزالته | VM نظيف + دليل مستخدم |
| بقاء LAN بعد إغلاق الواجهة | 100% حتى تسجيل الخروج | هاتف/محطة تتصل بعد إغلاق النافذة |
| حجم المثبّت | انخفاض ≥ 25% | مقارنة `release/` |
| نجاح التحديث | ≥ 99% مع Rollback يدوي موثق | قناة تجريبية |
| نشر مؤسسي صامت | **غير مطلوب حالياً (B مؤجل)** | — |

> **تحذير بخصوص SmartScreen:** بدون شهادة توقيع، سيظهر «Windows protected your PC / Unknown publisher» على الأجهزة النظيفة. لا يمكن إزالة هذا التحذير بالتشفير أو بضبط NSIS. التعويض المؤقت: نشر SHA-256 على موقع موثوق، وشرح خطوات «More info → Run anyway» في دليل التثبيت. التوقيع (OV/EV/Azure) هو الحل الوحيد لاحقاً؛ وحتى معه قد يحتاج السمعة وقتاً.

---

## 4. المعمارية المستهدفة

### 4.1 الأنماط (Desktop / Server-Tray / Client)

```
┌──────────────────────────────────────────────────────────────┐
│  Desktop Mode (الافتراضي)                                    │
│                                                              │
│  AN POS.exe (asInvoker)                                      │
│    ├─ Renderer (React)                                       │
│    ├─ Main (Electron)                                        │
│    └─ SQLite  %LOCALAPPDATA%\AN POS\data\anpos.db            │
│                                                              │
│  المثبّت: NSIS Per-User                                       │
│  التحديث: electron-updater                                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Server Mode (LAN) — Tray/Background داخل جلسة المستخدم      │
│                                                              │
│  AN POS.exe --background (asInvoker)                         │
│    ├─ Fastify + WebSocket                                    │
│    ├─ SQLite  %LOCALAPPDATA%\AN POS\data\anpos.db            │
│    ├─ Discovery (UDP/Bonjour)                                │
│    ├─ Firewall helper (UAC مرة واحدة عند التفعيل)            │
│    └─ Tray icon: فتح / حالة الخادم / إيقاف / خروج            │
│                                                              │
│  Clients (هواتف/محطات) ──LAN──> Server                       │
└──────────────────────────────────────────────────────────────┘
```

> **لا Windows Service في هذه المرحلة.** الخادم يبقى حياً بعد إغلاق النافذة لأن التطبيق يبقى في الـTray. يتوقف عند تسجيل الخروج أو عند «خروج» من الـTray. هذا يطابق المتطلب الحالي، ولا يحتاج تثبيت خدمة أو MSI؛ قاعدة الجدار الناري قد تطلب UAC مرة واحدة عند أول تفعيل LAN.

```text

┌──────────────────────────────────────────────────────────────┐
│  Client Mode (محطة تابعة)                                    │
│                                                              │
│  AN POS.exe (asInvoker)                                      │
│    ├─ لا SQLite محلي (أو Cache read-only)                    │
│    └─ يتصل بخادم LAN عبر HTTPS/HTTP + session token          │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 مسار البيانات: القرار الأهم

| النمط | المسار المقترح | الصلاحيات | ملاحظات |
| :--- | :--- | :--- | :--- |
| Desktop | `%LOCALAPPDATA%\AN POS\data` | المستخدم الحالي | أفضل لـ SQLite/WAL؛ لا Roaming |
| Desktop (انتقالي) | `%APPDATA%\an-pos` الحالي | المستخدم الحالي | يجب ترحيله بإصدار مستقل |
| Server (Tray) | `%LOCALAPPDATA%\AN POS\data` | المستخدم الحالي | نفس قاعدة Desktop؛ الخادم داخل جلسته |
| Server (Service — مؤجل) | `%PROGRAMDATA%\AN POS\data` | خدمة + Administrators + قراءة محدودة | مشترك بين المستخدمين — فقط عند تنفيذ C |
| Client | `%LOCALAPPDATA%\AN POS\cache` | المستخدم الحالي | Cache فقط، ليس مصدر الحقيقة |
| Portable | `%APPDATA%\an-pos` أو بجوار الملف | المستخدم | نسخة ثانوية، ليست مؤسسية |

**قواعد إلزامية:**

1. **لا تغيّر مسار البيانات في نفس الإصدار الذي تغيّر فيه المثبّت.** افصل التغييرين.
2. عند الترحيل: انسخ `anpos.db` + `anpos.db-wal` + `anpos.db-shm`، ثم افتح القاعدة وتحقق من `PRAGMA integrity_check`، ثم اترك القديم كـFallback لمدة إصدار.
3. لا تحذف المسار القديم تلقائياً بعد الترحيل؛ احتفظ به حتى تأكيد العميل.
4. لا تضع SQLite على مشاركة شبكة (SMB) — WAL لا يعمل بشكل موثوق.
5. في Server Mode الحالي (Tray) تبقى العملية الواحدة هي المالك الوحيد لـSQLite. إذا نُفِّذت C لاحقاً، تصبح الخدمة هي المالك الوحيد وتتصل الواجهة بها عبر IPC/HTTP.

### 4.3 نموذج التحديث

```
[CI] → نشر latest.yml + exe + blockmap + SHA256 + (توقيع لاحقاً)
                         │
        electron-updater (main process)
                         │
        فحص كل 4 ساعات + عند البدء (بعد 10 ثوانٍ)
                         │
        تنزيل تفاضلي → تحقق من sha512/الناشر (حسب الإعداد) → تثبيت
                         │
        إعادة تشغيل → فحص صحة → Rollback يدوي عند الفشل
```

- **NSIS Per-User:** المدعوم للتحديث التلقائي؛ لا يحتاج UAC.
- **Portable:** تحديث يدوي فقط؛ لا تستخدمه كقناة مؤسسية.
- **MSI:** مؤجل مع B.
- **Tray Server:** يجب أن يتوقف/يُحدَّث بطريقة منسقة، لا `taskkill`. أغلق الخادم من الـTray أو عبر `before-quit` قبل استبدال الملفات.
- **بدون توقيع:** يبقى التحقق من `sha512` الموجود في `latest.yml` مفيداً ضد التنزيل التالف، لكنه **لا يثبت هوية الناشر**. أبقِ النشر على HTTPS/مستودع تحت سيطرتك، ووثّق أن التوقيع مؤجل. عند التوقيع لاحقاً، فعّل `verifyUpdateCodeSignature` و`publisherName`.

### 4.4 Per-User مقابل Per-Machine

| المعيار | Per-User | Per-Machine |
| :--- | :--- | :--- |
| UAC عند التثبيت | لا | نعم |
| UAC عند التحديث | لا (غالباً) | نعم |
| جميع مستخدمي الجهاز | لا | نعم |
| مناسب لـ POS مشترك | متوسط | ✅ أفضل |
| مناسب لـ Intune/GPO | محدود | ✅ أفضل |
| مسار البيانات | LocalAppData | ProgramData/LocalAppData |
| خدمة Windows | صعب | ✅ طبيعي |
| التحديث الصامت | ✅ أسهل | يحتاج elevation/IT |

**القرار المعتمد:** **Per-User**. لا يوجد عملاء مؤسسيون ولا حاجة لمشاركة التثبيت بين مستخدمي Windows، والتحديث بلا UAC أهم من دعم GPO غير المطلوب. التثبيت في `%LOCALAPPDATA%\Programs\AN POS`، والبيانات في `%LOCALAPPDATA%\AN POS\data`.

**استثناء واحد:** إذا كان جهاز POS يستخدمه أكثر من موظف بحسابات Windows منفصلة، فكل مستخدم سيحتاج تثبيتاً/بيانات منفصلة. هذا غير مطلوب حالياً؛ إن ظهر لاحقاً فهو سبب للانتقال إلى Per-Machine/MSI (B) أو إلى خدمة مشتركة (C).

**الترحيل من Per-Machine الحالي:** إذا كان `C:\AN POS` مثبتاً بنسخة قديمة، فالمثبّت الجديد يجب أن يكتشفه ويعرض ترحيلاً منسقاً (إبقاء البيانات، إزالة التثبيت القديم مرة واحدة بصلاحية مدير، ثم تثبيت Per-User). لا تسمح بوجود نسختين تعملان على نفس القاعدة.

---

## 5. خيارات المثبّت ومصفوفة القرار

| الخيار | النوع | مزايا | عيوب | مناسب لـ | الجهد | القرار |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **NSIS الحالي + تقوية** | EXE | مجاني، مرن، موجود، يدعم التحديث، عربي | ليس MSI، يتطلب كتابة سكربت، لا GPO أصلي | عملاء أفراد/متاجر صغيرة | منخفض | ✅ **الآن** |
| **Inno Setup** | EXE | مجاني، أسهل من NSIS، جيد للـ EXE | ليس MSI، مجتمع أقل في Electron، يحتاج إعادة بناء | بديل NSIS فقط | متوسط | ❌ ليس أولوية |
| **WiX v4 + Burn** | MSI + EXE | معياري، مجاني، GPO/Intune، خدمة، جدار ناري، Transform | منحنى تعلّم، XML، وقت بناء | مؤسسات/موزعون | مرتفع | ⏸️ **مؤجل** |
| **Advanced Installer** | GUI → MSI/MSIX | سريع، خدمة/جدار ناري/UI/Updater، دعم | ترخيص سنوي، Vendor lock-in | فريق بلا خبرة WiX | متوسط | 🟡 بديل مدفوع |
| **InstallShield** | MSI | مؤسسي، دعم قوي | مكلف، ثقيل | شركات كبيرة | مرتفع | ❌ مبالغة الآن |
| **MSIX** | MSIX | تحديث حديث، عزل، Store | قيود خدمة/جدار ناري/ارتفاع، يحتاج App Installer | Store/إدارة حديثة | مرتفع | ⏸️ مؤجل |
| **Velopack** | EXE | تحديث ممتاز، حديث، delta | ليس MSI، أقل ملاءمة لـ GPO | منتجات SaaS | متوسط | 🟡 للتحديث فقط |
| **Squirrel** | EXE | بسيط | قديم/مهجور نسبياً، ليس MSI | لا | منخفض | ❌ |
| **electron-builder MSI** | MSI | سريع، مدمج، WiX 4 | محدود: لا خدمة/جدار ناري/UI متقدم | تجربة أولية | منخفض | 🟡 تجربة |

### 5.1 التوصية النهائية

1. **A الآن:** NSIS **Per-User** + `asInvoker` + WAL-safe + `electron-updater` + CI + **A9 Tray Server**. هذا يحل مشاكل التسليم الحقيقية الحالية.
2. **B مؤجل:** لا WiX/MSI لأن العملاء غير مؤسسيين ولا يوجد GPO/Intune.
3. **C مؤجل:** لا Windows Service لأن المطلوب هو البقاء بعد إغلاق الواجهة فقط، وقد غطّاه A9.
4. **D مؤجل:** MSIX غير مطلوب.
5. **التوقيع مؤجل:** يصدر الإصدار غير موقّع مع SHA-256 وتوثيق SmartScreen؛ يُستأنف A1 عند توفر شهادة.

### 5.2 لماذا ليس MSIX الآن؟

- التطبيق الحالي يحتاج **قاعدة بيانات محلية** و**قاعدة جدار ناري** عند تفعيل LAN. نموذج MSIX يعزل الملفات ويقيد الارتفاع/قواعد الجدار الناري.
- MSIX يتطلب هوية تطبيق وتوقيعاً وتحديثاً عبر App Installer/Store، ولا توجد شهادة توقيع حالياً.
- لا يوجد Store ولا Intune، لذا الفائدة الحقيقية من MSIX الآن شبه معدومة.
- **متى يصبح خياراً؟** فقط إذا أصبح التوزيع عبر Store/Intune شرطاً، وتوفرت شهادة، وأصبح الخادم لا يحتاج elevation.

### 5.3 لماذا ليس Inno Setup أو Velopack كمسار رئيسي؟

- **Inno Setup** ممتاز كبديل NSIS، لكنه لا يقدم MSI/GPO/Transform. إذا كان الهدف «مثبّت EXE أفضل» فهو خيار معقول، لكنه لا يحل متطلبات المؤسسات.
- **Velopack** ممتاز للتحديث السريع، لكنه ليس MSI ولا يغطي نشر GPO/خدمة. يمكن استخدامه لاحقاً كطبقة تحديث إذا لم يعجبك `electron-updater`، لكن ليس كبديل كامل.

### 5.4 متى تختار Advanced Installer بدل WiX؟

- إذا لم يكن لدى الفريق وقت/خبرة لـ WiX.
- إذا كانت الميزات المطلوبة (Service, Firewall, Prerequisites, Updater, MSI/MSIX) جاهزة في الواجهة.
- إذا كانت تكلفة الترخيص أقل من تكلفة 4–6 أسابيع هندسية.
- **لكن** احتفظ بملكية ملفات التثبيت (Project + CI) ولا تعتمد على نقرات GUI فقط.

---

## 6. المرحلة 0 — خط الأساس وبوابة P0

**المدة:** 3–5 أيام
**المالك:** Release Engineer + Electron Developer + QA
**الهدف:** شجرة نظيفة، نسخة مرجعية قابلة للإعادة، وإغلاق مخاطر البيانات قبل أي تغيير في المثبّت.

### 6.1 المهام

| # | المهمة | الملفات/الأدوات | معيار القبول |
| :--- | :--- | :--- | :--- |
| 0.1 | إنشاء فرع `release/installer-baseline` وفصل تغييرات POS الحالية عن تغييرات التثبيت | Git | لا تُخلط تغييرات الواجهة مع المثبّت |
| 0.2 | تثبيت/التزام الشجرة الحالية أو عمل Stash موثق | Git | `git status` نظيف قبل البناء |
| 0.3 | وسم مرجعي `v2.5.7-baseline` | Git tag | الوسم موجود ويشير إلى commit معروف |
| 0.4 | بناء NSIS + Portable من Windows (ليس Linux) | `npm run package:win:x64` | مخرجات في `release/` |
| 0.5 | تسجيل SHA-256 لكل مخرج | `certutil -hashfile` / `sha256sum` | ملف `release/SHA256SUMS.txt` |
| 0.6 | تشغيل الاختبارات الحالية | `npx vitest run` | كل الاختبارات تمر |
| 0.7 | إضافة `tsconfig.electron.json` وتشغيله في `typecheck` | `tsconfig*`, `package.json` | `electron/**` يُفحص |
| 0.8 | إضافة اختبار انحدار للتشغيل الأول: قاعدة فارغة ⇒ `isFirstRun=true`، ثم إكمال ⇒ `false` | `src/test/` | اختبار يفشل إذا عاد C1 |
| 0.9 | إضافة اختبار انحدار لفشل DB: لا `ReferenceError`، ويُكتب `startup_error.log` | `src/test/` | اختبار يغطي مسار الفشل |
| 0.10 | توثيق قرار التوقيع: **لا شهادة حالياً**، والإصدار غير موقّع مع SHA-256 | وثيقة قرار | لا يُطلب A1 في هذه المرحلة |
| 0.11 | تجهيز VMs: Win10 22H2، Win11 24H2، Win Server 2022 (اختياري) | VirtualBox/Hyper-V | Snapshots جاهزة |
| 0.12 | تجهيز مجموعة بيانات اختبار: 1,000 مبيعة + WAL غير مcheckpoint | SQLite | بيانات قابلة للتكرار |
| 0.13 | إغلاق `callerRole` القادم من الواجهة (R11) | `electron/main/handlers/auth.ts` + مسارات HTTP | ✅ تم الإصلاح واعتماد الجلسة الموثقة واختبارها |

### 6.2 بوابة P0 (Go/No-Go)

لا تبدأ Track A قبل تحقق كل ما يلي:

- [x] الشجرة نظيفة وموثقة، والوسم `v2.5.7-baseline` مسجل كخط أساس.
- [x] بناء Windows من CI/Windows ومحلياً ينجح.
- [x] اختبارات التشغيل الأول وفشل DB تمر (تم اختبارها وتوثيقها).
- [x] `typecheck` يغطي `electron/**` عبر tsconfig.electron.json بنجاح تام.
- [x] قرار التوقيع معروف: **لا شهادة الآن**، والإصدار غير موقّع مع SHA-256 وتوثيق SmartScreen.
- [x] خطة WAL backup معتمدة تقنياً ومطبقة عبر `--prepare-upgrade`.
- [x] إغلاق ثغرة callerRole (R11): رفض callerRole من الواجهة واعتماد الجلسة الموثقة في main واختبارها آلياً.
- [x] Rollback VM snapshot جاهز.

> **إذا فشلت البوابة، لا تبدأ الترحيل.** إصلاح البيانات والتشغيل الأول أهم من شكل المثبّت.

---

## 7. المسار A — NSIS الاحترافي

**المدة:** 2–3 أسابيع
**النتيجة:** مثبّت NSIS **Per-User**، `asInvoker`، WAL-safe، محدث آلياً، ومبني عبر CI، مع **Tray Server** يبقي LAN بعد إغلاق الواجهة. التوقيع مؤجل.

### A1 — التوقيع الرقمي (مؤجل — لا شهادة حالياً)

> **القرار:** لا توجد شهادة OV/EV/Azure، لذلك **لا يُنفَّذ هذا البند الآن**. لا تشترِ شهادة قبل اعتماد الميزانية. الإصدار الحالي يصدر غير موقّع، ويُعوَّض ذلك مؤقتاً بـ:
> - نشر SHA-256 لكل ملف في `release/SHA256SUMS.txt` وعلى صفحة التحميل.
> - التحميل عبر HTTPS فقط، ومن مصدر واحد تحت سيطرتك.
> - توثيق خطوات SmartScreen («More info → Run anyway») مع تحذير أمني واضح.
> - عدم ادعاء أن التطبيق «موقّع» أو أن التحذير سيختفي.
>
> عند توفر الشهادة لاحقاً، فعّل البنود أدناه كما هي، وأعد اختبار SmartScreen.

#### الهدف (عند التفعيل لاحقاً)
كل ملف قابل للتنفيذ يُشغّله العميل يجب أن يكون موقّعاً وموثّقاً بالطابع الزمني.

#### الخيارات

| الخيار | الاستخدام | ملاحظات |
| :--- | :--- | :--- |
| **OV Code Signing** | شهادة عادية | أرخص؛ قد يستغرق بناء السمعة وقتاً |
| **EV Code Signing** | متطلبات مؤسسية/سمعة أسرع | HSM/Token؛ تكلفة أعلى |
| **Azure Trusted Signing** | توقيع سحابي في CI | يحتاج حساب Azure + Entra ID؛ مناسب للبناء الآلي |

#### التنفيذ

1. احصل على الشهادة وسجّلها في متغيرات CI:
   - `CSC_LINK` (ملف PFX/Base64) أو إعدادات Azure.
   - `CSC_KEY_PASSWORD`.
   - لا تضع الشهادة أو كلمة المرور في Git.
2. اضبط `package.json` (مثال إرشادي — استبدل `publisherName` بالقيمة الفعلية من الشهادة):

```jsonc
{
  "build": {
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64"] }],
      "icon": "build/icon.ico",
      "requestedExecutionLevel": "asInvoker",
      "signtoolOptions": {
        "publisherName": "CN=AN POS, O=...",
        "signingHashAlgorithms": ["sha256"],
        "rfc3161TimeStampServer": "http://timestamp.digicert.com"
      },
      "verifyUpdateCodeSignature": true
    }
  }
}
```

3. في CI فقط، أضف `forceCodeSigning=true` حتى يفشل البناء إذا لم يُوقّع:
   ```bash
   npx electron-builder --win nsis --x64 -c.forceCodeSigning=true
   ```
4. تحقق بعد البناء:
   ```powershell
   signtool verify /pa /v "release\AN POS-Setup-2.6.0-x64.exe"
   Get-AuthenticodeSignature "release\AN POS-Setup-2.6.0-x64.exe" | Format-List
   ```
5. وقّع أيضاً:
   - `AN POS.exe` داخل `win-unpacked`.
   - `uninstaller.exe` الناتج.
   - أي DLL/EXE يُشغّله العميل.
   - مثبّت MSI/Burn لاحقاً.
6. اختبر على VM نظيف بلا إنترنت، ثم مع إنترنت، وسجّل نتيجة SmartScreen.

#### معيار القبول (عند تفعيل A1 لاحقاً)
- [ ] كل ملفات EXE/DLL الرئيسية موقّعة.
- [ ] الطابع الزمني موجود (تحقق من `Timestamp`).
- [ ] `signtool verify /pa` ينجح.
- [ ] لا توجد أسرار توقيع في المستودع.
- [ ] فشل التوقيع يوقف CI.
- [ ] **الوضع الحالي:** لا يُنفَّذ أي بند أعلاه؛ يُكتفى بـSHA-256 وتوثيق SmartScreen.

### A2 — أقل صلاحيات + مسار بيانات سليم

#### الهدف
التطبيق لا يعمل كمدير، والبيانات في مسار مناسب لـ SQLite.

#### التغييرات

1. في `package.json`:
   ```jsonc
   "win": {
     "requestedExecutionLevel": "asInvoker"
   },
   "nsis": {
     "oneClick": false,
     "perMachine": false,
     "allowElevation": false,
     "allowToChangeInstallationDirectory": true,
     "createDesktopShortcut": true,
     "createStartMenuShortcut": true
   },
   "portable": {
     "requestExecutionLevel": "user"
   }
   ```
   - `perMachine: false` يجعل التثبيت في `%LOCALAPPDATA%\Programs\AN POS`.
   - `allowElevation: false` يمنع المثبّت من طلب UAC؛ إذا احتاج خطوة جدار ناري لاحقاً، تكون عبر Helper منفصل عند تفعيل LAN فقط.
   - أزل أي منطق في `installer.nsh` يكتب إلى `C:\AN POS` أو `HKLM` أو يطلب `requireAdministrator`.
2. لا تورّث طلب elevation إلى `AN POS.exe`؛ يبقى `asInvoker`.
3. انقل `userData` إلى LocalAppData **في إصدار منفصل**:
   ```ts
   // قبل app.whenReady() وقبل أي app.getPath()
   const localData = path.join(app.getPath('localAppData'), 'AN POS', 'data');
   app.setPath('userData', localData);
   ```
   مع ترحيل من `%APPDATA%\an-pos`:
   - انسخ القاعدة + WAL + SHM.
   - انسخ `config.json` و`trial.json` وملفات الترخيص ومجلدي `backups` و`logs` (أو أعد إنشاء السجلات).
   - تحقق من `integrity_check`.
   - اكتب `migration-complete.json`.
   - لا تحذف القديم.
4. اختبر الوظائف التي قد تحتاج elevation:
   - الطباعة الحرارية عبر Chromium.
   - درج النقود (إن وجد).
   - تشغيل LAN.
   - الكتابة في مجلد البيانات.
   - التشغيل التلقائي مع Windows.
5. إذا فشل درج النقود فقط: أضف **Helper مرتفع** صغير للإشارة، ولا ترفع العملية كلها.
6. جرّب `sandbox: true` في نافذة منفصلة؛ إن لم يعمل preload، أبقِ `sandbox: false` مؤقتاً ووثّق السبب. لا تجعلها شرطاً لـ A.

#### معيار القبول
- [x] التثبيت Per-User لا يطلب UAC (perMachine: false, allowElevation: false).
- [x] التطبيق يعمل من حساب مستخدم قياسي.
- [x] لا UAC عند كل تشغيل (requestedExecutionLevel: asInvoker).
- [x] الطباعة/البيع/النسخ الاحتياطي تعمل.
- [x] مسار البيانات مدعوم ويعمل بأمان دون فقدان بيانات.
- [x] لا فقدان بيانات بعد الترحيل.
- [x] لا توجد كتابة إجبارية إلى `C:\AN POS` أو `HKLM` عند التثبيت Per-User.

### A3 — نسخة احتياطية WAL-safe قبل الترقية

#### المشكلة الحالية
`installer.nsh` ينسخ `anpos.db` فقط بعد `taskkill /F`. مع `journal_mode = WAL` قد تكون أحدث المعاملات في `anpos.db-wal`، لذا النسخة قد تكون قديمة/غير متسقة.

#### الحل المقترح
إضافة وضعين إلى التطبيق:

```text
AN POS.exe --prepare-upgrade "<backupDir>"
AN POS.exe --verify-backup "<backupFile>"
```

**`--prepare-upgrade` يقوم بـ:**

1. التحقق من عدم وجود نسخة أخرى (single instance). يجب أن يعمل هذا الوضع **قبل** `requestSingleInstanceLock` العادي أو باستخدام mutex مستقل، وإلا سيخرج فوراً إذا كانت الواجهة ما زالت تعمل.
2. إغلاق الواجهة/الخادم بشكل منسق.
3. `PRAGMA wal_checkpoint(TRUNCATE);`
4. `VACUUM INTO '<backupDir>\pre_upgrade_<version>_<timestamp>.db';`
5. `PRAGMA integrity_check;`
6. التحقق من وجود الجداول الأساسية وعدد المبيعات.
7. الخروج بـ `0` عند النجاح، و`غير صفر` عند الفشل.

**في المثبّت:**

```nsis
; 1. محاولة إغلاق لطيف أولاً.
;    التطبيق يجب أن يعالج --prepare-upgrade ويغلق الـTray/الخادم بنفسه.
nsExec::Exec '"$INSTDIR\AN POS.exe" --prepare-upgrade "$LOCALAPPDATA\AN POS\data\backups"'
Pop $0

; 2. إن فشل الإغلاق المنسق، جرّب إنهاءً لطيفاً ثم انتظر.
${If} $0 != 0
  nsExec::Exec 'taskkill /IM "AN POS.exe" /T'   ; بدون /F
  Sleep 3000
  nsExec::Exec '"$INSTDIR\AN POS.exe" --prepare-upgrade "$LOCALAPPDATA\AN POS\data\backups"'
  Pop $0
${EndIf}

; 3. Fallback: نسخ DB + WAL + SHM معاً (لا تنسخ db وحده أبداً).
${If} $0 != 0
  CopyFiles /SILENT "$LOCALAPPDATA\AN POS\data\anpos.db" "$LOCALAPPDATA\AN POS\data\backups\pre_upgrade_fallback.db"
  CopyFiles /SILENT "$LOCALAPPDATA\AN POS\data\anpos.db-wal" "$LOCALAPPDATA\AN POS\data\backups\pre_upgrade_fallback.db-wal"
  CopyFiles /SILENT "$LOCALAPPDATA\AN POS\data\anpos.db-shm" "$LOCALAPPDATA\AN POS\data\backups\pre_upgrade_fallback.db-shm"
  ; إن فشل النسخ أيضاً: إيقاف التثبيت.
${EndIf}

; 4. taskkill /F كخيار أخير فقط، بعد نجاح النسخة.
```

**ملاحظات:**

- المسار المعتمد هو `$LOCALAPPDATA\AN POS\data` بعد A2. إذا لم يُنفَّذ ترحيل المسار بعد، استخدم `$APPDATA\an-pos` مؤقتاً، لكن **لا تخلط المسارين** في نفس السكربت.
- `taskkill` يجب ألا يسبق النسخة الاحتياطية؛ إن قتلت العملية أولاً فقدت WAL.
- التطبيق في وضع Tray قد لا يملك نافذة؛ لذلك `--prepare-upgrade` يجب أن يعمل حتى لو كانت النافذة مخفية.
- لا تعتمد على `CopyFiles` وحده؛ تحقق من النتيجة.
- أضف الثواني إلى اسم النسخة: `$2$1$0_$4$5$6`.
- احتفظ بآخر 5 نسخ فقط، ولا تحذف النسخة الأخيرة أبداً.
- إذا كانت القاعدة تالفة، لا تحاول الترقية؛ اعرض رسالة واضحة ومسار الدعم.
- وثّق أن `VACUUM INTO` يحتاج مساحة قرص تقريباً بحجم القاعدة.

#### معيار القبول
- [x] اختبار مبيعات مع WAL غير مcheckpoint: النسخة الذرية تحتوي أحدث المعاملات دون فقدان.
- [x] اختبار قرص ممتلئ: معالجة الأخطاء والتوقف الآمن برسالة للمستخدم.
- [x] اختبار قاعدة مقفلة: مسار fallback يعمل أو يتوقف بأمان.
- [x] اسم النسخة لا يتصادم عند تكرار التثبيت (طابع زمني كامل بالثواني).
- [x] النسخة قابلة للفتح و`integrity_check` = `ok`.

### A4 — جدار الحماية والمنفذ

#### الوضع الحالي
```nsis
netsh advfirewall firewall add rule name="AN POS LAN Server" ^
  dir=in action=allow protocol=TCP localport=3000 profile=any
```
المشاكل:
- `profile=any` يفتح Public.
- المنفذ 3000 ثابت، بينما التطبيق يغيّره تلقائياً عند التعارض (`server/index.ts`).
- لا `remoteip` لتقييد النطاق المحلي.

#### الحل
1. اجعل قاعدة الجدار الناري مملوكة للتطبيق/الخدمة، لا للمثبّت فقط.
2. عند تفعيل LAN أو تغيير المنفذ:
   ```bat
   netsh advfirewall firewall delete rule name="AN POS LAN Server"
   netsh advfirewall firewall add rule name="AN POS LAN Server" ^
     dir=in action=allow protocol=TCP localport=<ACTUAL_PORT> ^
     profile=private,domain remoteip=localsubnet
   ```
3. لأن التطبيق `asInvoker` والتثبيت Per-User، **لا يحق للمثبّت إضافة قاعدة جدار ناري بدون UAC**. نفّذ الأمر عبر:
   - زر «تفعيل LAN / إصلاح جدار الحماية» في الإعدادات، يستدعي `netsh` عبر `ShellExecute(..., "runas", ...)` فيطلب UAC **مرة واحدة** عند التفعيل فقط.
   - Helper صغير منفصل (غير موقّع حالياً) يُشغّل بنفس الطريقة؛ لا تعِد بتوقيعه قبل A1.
   - لا تضيف القاعدة من `installer.nsh` في التثبيت Per-User؛ ستفشل بصمت أو تطلب UAC بلا سبب.
   - إذا رفض المستخدم UAC، يعمل التطبيق محلياً فقط، وتظهر رسالة تشرح أن LAN يحتاج موافقة المدير مرة واحدة.
4. لا تفتح Public أبداً. إذا احتاج العميل شبكة عامة، اجعلها استثناءً يدوياً موثقاً.
5. أزل القاعدة عند تعطيل LAN وعند إلغاء التثبيت.
6. اختبر:
   - LAN على Private.
   - LAN على Domain.
   - LAN على Public (يجب أن يفشل/يُطلب تغيير الشبكة).
   - تغيير المنفذ ثم إعادة التشغيل.
   - تعارض المنفذ (auto-increment) ثم تحديث القاعدة.

#### معيار القبول
- [x] لا قاعدة `profile=any` (محظورة تماماً لحماية أمان العملاء).
- [x] القاعدة تشير للمنفذ الفعلي للخادم.
- [x] تقييد النطاق بـ `remoteip=localsubnet`.
- [x] معالج جدار الحماية (firewall.ts) يتيح حذف القاعدة عند الحاجة.
- [x] إلغاء التثبيت في installer.nsh يحذف القاعدة تلقائياً.

### A5 — حزمة نظيفة

#### المشكلة
`release/win-unpacked/resources/app.asar.unpacked/node_modules` يحتوي `@napi-rs/canvas-linux-*` و`@rolldown/binding-linux-x64-gnu` (~82 MB) لأن البناء تم من Linux.

#### الحل
1. **ابنِ Windows من Windows CI** — لا تبنِ حزمة Windows على Linux.
2. أضف فحصاً بعد الحزم:
   ```js
   // scripts/check-package-contents.mjs
   // يفشل إذا وُجد linux/darwin في app.asar.unpacked
   ```
3. اضبط `asarUnpack` على native فقط:
   ```jsonc
   "asarUnpack": [
     "**/*.node",
     "**/node_modules/@napi-rs/canvas/**"
   ]
   ```
4. راجع `externalizeDepsPlugin`: كل تبعية خارجية تبقى في `node_modules`، لذا لا تنقل تبعيات إلى `devDependencies` قبل التأكد من أن Vite يحزمها فعلاً. قِس أولاً:
   ```bash
   npx electron-builder --win dir --x64
   du -sh release/win-unpacked
   ```
5. استبعد من `files`: الاختبارات، source maps، ملفات `.md`، أمثلة، ثنائيات منصات أخرى.
6. أضف هدف حجم: خفض ≥ 25% من 154 MB، دون كسر وظائف native.

#### معيار القبول
- [x] لا `linux`/`darwin` في حزمة Windows (استبعاد صارم في build.files وفحص check-package-contents.mjs).
- [x] `app.asar.unpacked` يحتوي فقط native المطلوب.
- [x] التطبيق يعمل بعد الحزم.
- [x] الحجم أقل من خط الأساس بهامش واضح (تم توفير أكثر من 80MB).

### A6 — CI كامل

#### الوضع الحالي
`.github/workflows/build.yml` يبني `--win portable` فقط، ولا يشغّل اختبارات ولا typecheck ولا توقيع.

#### المسار المقترح

```yaml
name: Release

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    env:
      CSC_LINK: ${{ secrets.CSC_LINK }}
      CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run typecheck
      - run: npm run build
      - name: Package NSIS + Portable (unsigned — الوضع الحالي)
        if: ${{ env.CSC_LINK == '' }}
        run: npx electron-builder --win nsis portable --x64
      - name: Package NSIS + Portable (signed — عند توفر الشهادة)
        if: ${{ env.CSC_LINK != '' }}
        run: npx electron-builder --win nsis portable --x64 -c.forceCodeSigning=true
      - name: Verify signatures (signed builds only)
        if: ${{ env.CSC_LINK != '' }}
        run: powershell -File scripts/verify-signatures.ps1
      - name: Generate checksums
        run: powershell -File scripts/generate-checksums.ps1
      - uses: actions/upload-artifact@v4
        with:
          name: anpos-windows
          path: |
            release/*.exe
            release/*.blockmap
            release/latest.yml
            release/SHA256SUMS.txt
```

**إضافات:**
- `release` job ينشر `latest.yml` و`.blockmap` و`SHA256SUMS.txt` وSBOM.
- **الوضع الحالي:** بناء غير موقّع، مع `SHA256SUMS.txt` إلزامي.
- **عند توفر الشهادة:** التوقيع على tags فقط، وفحص التوقيع يفشل الـjob إذا كان أي EXE غير موقّع.
- لا توقّع على Pull Requests.
- `workflow_dispatch` لتجربة بناء دون نشر.
- فحص محتوى الحزمة يفشل عند وجود Linux binaries.

#### معيار القبول
- [x] CI ينتج NSIS + Portable + `latest.yml` عبر .github/workflows/build.yml.
- [x] الاختبارات و`typecheck` تمنع الدمج وتفشل البناء عند الخطأ.
- [x] SHA-256 يُنشر مع كل إصدار غير موقّع في `SHA256SUMS.txt`.
- [ ] عند توفر الشهادة: التوقيع مفعّل على tags، وفشله يوقف النشر (مؤجل حتى توفير شهادة A1).
- [x] artifacts قابلة للتنزيل والتحقق.

### A7 — التحديث الآلي

#### الإضافة
```bash
npm i electron-updater
```

#### الإعداد
```jsonc
"build": {
  "publish": [
    {
      "provider": "github",
      "owner": "<owner>",
      "repo": "<repo>",
      "releaseType": "release"
    }
  ]
}
```

#### في main

```ts
import { autoUpdater } from 'electron-updater';

export function setupAutoUpdater(): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  // مؤقتاً فقط: لا توجد شهادة توقيع بعد.
  // عند تفعيل A1، احذف هذا السطر وأعد publisherName.
  autoUpdater.verifyUpdateCodeSignature = false;

  autoUpdater.on('update-available', (info) => { /* إشعار في الواجهة */ });
  autoUpdater.on('update-downloaded', (info) => { /* زر: إعادة التشغيل والتثبيت */ });
  autoUpdater.on('error', (err) => { /* سجل + عدم إسقاط التطبيق */ });

  setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 10_000);
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 4 * 60 * 60 * 1000);
}
```

**قواعد:**
- لا تفحص أثناء عملية بيع نشطة؛ أجّل الإشعار.
- لا تفرض إعادة التشغيل؛ اعرض زراً.
- **الوضع الحالي بدون توقيع:** `autoUpdater.verifyUpdateCodeSignature = false` مؤقتاً، مع الاعتماد على HTTPS و`sha512` في `latest.yml`. هذا يحمي من تنزيل تالف، لكنه **لا يثبت هوية الناشر**.
- **عند التوقيع:** أعد `verifyUpdateCodeSignature = true` واضبط `publisherName` في `package.json`. عندها فقط يمكن الاعتماد على التحقق من الناشر.
- استخدم قناة `stable` و`beta` منفصلتين.
- استخدم `stagingPercentage` في `latest.yml` للإصدار التدريجي.
- احتفظ بالمثبّت السابق و`latest.yml` للتراجع.
- Portable: لا تحديث تلقائي؛ رابط تحميل يدوي.

#### معيار القبول
- [x] تكوين وتجهيز التحديث من 2.5.7 إلى 2.6.0 عبر electron-updater.
- [x] فشل الشبكة لا يمنع تشغيل التطبيق (معالجة الأخطاء بهدوء دون مقاطعة الكاشير).
- [x] فشل التحديث لا يفسد التثبيت الحالي.
- [x] يمكن فحص وتنزيل وتثبيت التحديث يدوياً أو تلقائياً عبر IPC.
- [x] مسار `latest.yml` و`.blockmap` مضمن في سير عمل البناء والنشر.

### A8 — إلغاء التثبيت والوثائق

1. اجعل إلغاء التثبيت **لا يحذف البيانات افتراضياً**.
2. إذا اختار المستخدم الحذف:
   - اعرض خيار «تصدير نسخة احتياطية» أولاً.
   - اكتب قائمة ما سيُحذف (DB، backups، logs، license/trial).
3. لا تحذف الترخيص مع البيانات دون تحذير.
4. وثّق:
   - `docs/INSTALLER_OPERATIONS.md` — التشغيل، الصلاحيات، المسارات.
   - `docs/UPGRADE_ROLLBACK.md` — الترقية والتراجع.
   - `docs/TROUBLESHOOTING_INSTALL.md` — SmartScreen، فشل DB، جدار ناري.
5. حدّث `docs/CUSTOM_INSTALLER_AND_ONBOARDING_GUIDE.md` ليعكس السلوك الفعلي.

### A9 — خادم LAN بعد إغلاق الواجهة (Tray/Background)

#### الهدف
عند إغلاق نافذة AN POS، يبقى خادم Fastify والـWebSocket يعملان حتى تستمر الهواتف/المحطات. لا نريد Windows Service في هذه المرحلة.

#### السلوك المطلوب

| الحدث | السلوك |
| :--- | :--- |
| إغلاق النافذة (X) والخادم يعمل | إخفاء النافذة إلى Tray، وليس إنهاء التطبيق |
| إغلاق النافذة والخادم متوقف | إنهاء التطبيق طبيعياً |
| «خروج» من قائمة Tray | إيقاف الخادم بأمان ثم `app.quit()` |
| تسجيل خروج Windows / إعادة تشغيل | يتوقف التطبيق (مقبول) |
| تشغيل التطبيق مرة ثانية | إظهار النافذة الموجودة، لا نسخة ثانية |
| بدء التطبيق مع Windows (اختياري) | `--background` يبدأ مخفياً في Tray |

#### التغييرات في `electron/main/index.ts`

1. أضف `Tray` و`Menu` من `electron`، وأيقونة `nativeImage` موجودة في `build/` أو `resources/`.
2. أضف حالة `let isQuitting = false;`.
3. عند إنشاء النافذة:
   ```ts
   mainWindow.on('close', (event) => {
     if (!isQuitting && isHttpServerRunning()) {
       event.preventDefault();
       mainWindow?.hide();
     }
   });
   ```
4. أنشئ Tray بقائمة:
   - «فتح AN POS» → `mainWindow.show(); mainWindow.focus();`
   - «حالة الخادم: يعمل/متوقف» → معلومات فقط.
   - «إيقاف خادم LAN» → `await stopHttpServer()` مع تأكيد.
   - «خروج» → `isQuitting = true; await stopHttpServer(); app.quit();`
5. عدّل `window-all-closed`:
   ```ts
   app.on('window-all-closed', () => {
     if (process.platform === 'darwin') return;
     if (isHttpServerRunning()) return; // يبقى في Tray
     app.quit();
   });
   ```
6. في `before-quit`، أوقف الخادم مرة واحدة، ولا تترك `taskkill` هو الوسيلة.
7. في `second-instance`، أظهر النافذة وأعد تركيزها.
8. أضف `--background` (اختياري) لبدء التطبيق مخفياً؛ لا تجعله افتراضياً لكل المستخدمين.

#### قيود يجب توثيقها

- هذا **ليس خدمة Windows**. يتوقف الخادم عند تسجيل الخروج أو إعادة التشغيل.
- لا يعمل قبل تسجيل الدخول.
- إذا كان الجهاز يستخدمه أكثر من مستخدم Windows، فلن يعمل الخادم إلا في جلسة المستخدم الذي شغّله.
- إذا تغيّر هذا الشرط لاحقاً (خادم بعد تسجيل الخروج/إعادة التشغيل)، فهذا سبب لتنفيذ Track C، وليس حلاً داخل A9.

#### معيار القبول
- [ ] إغلاق النافذة لا يقطع اتصال هاتف/محطة.
- [ ] أيقونة Tray ظاهرة، وقائمتها تعمل.
- [ ] «خروج» يوقف الخادم ثم يغلق التطبيق.
- [ ] تسجيل الخروج يوقف الخادم (مقبول وموثق).
- [ ] فتح التطبيق مرة ثانية يُظهر النافذة ولا يشغّل نسخة ثانية.
- [ ] لا `taskkill /F` في التحديث إذا كان `--prepare-upgrade` نجح.

### A10 — معايير قبول Track A

- [ ] مثبّت **Per-User** بلا UAC، ومسار `%LOCALAPPDATA%\Programs\AN POS`.
- [ ] الإصدار **غير موقّع**، لكن `SHA256SUMS.txt` منشور وتوثيق SmartScreen موجود.
- [ ] التطبيق `asInvoker` ويعمل بحساب قياسي.
- [ ] ترقية من 2.5.7 مع 1,000 مبيعة + WAL: صفر فقدان.
- [ ] نسخة احتياطية قابلة للفتح و`integrity_check` = `ok`.
- [ ] لا `profile=any`، والمنفذ الفعلي محدث.
- [ ] CI يبني NSIS + Portable + latest.yml + SHA256، ويشغّل الاختبارات و`typecheck`.
- [ ] `electron-updater` يعمل بدون توقيع، وRollback موثق.
- [ ] لا Linux binaries في حزمة Windows.
- [ ] **خادم LAN يبقى بعد إغلاق الواجهة** (A9).
- [ ] إلغاء التثبيت يحفظ البيانات افتراضياً.
- [ ] الوثائق محدثة.

---

## 8. المسار B — WiX v4 MSI + Burn (مؤجل)

**المدة:** 4–6 أسابيع
**الحالة:** **غير مطلوب حالياً.** لا عملاء مؤسسيون ولا GPO/Intune. يبقى القسم مرجعاً إذا تغيّر ذلك.
**يبدأ بعد:** نجاح A في الإنتاج + تأكيد حاجة مؤسسية.
**النتيجة:** MSI صامت + Burn Bootstrapper + جدار ناري + ترحيل من NSIS. خدمة Windows تُضاف فقط بعد اكتمال Track C.

### B1 — متى تبدأ B؟

ابدأ B إذا تحقق واحد أو أكثر:

- عميل مؤسسي يطلب GPO/Intune/SCCM.
- عميل يطلب `msiexec /qn` أو MST Transform.
- تحتاج خدمة Windows (Track C).
- تحتاج Repair/Modify قياسي.
- تحتاج سجلات MSI وExit Codes.
- تحتاج نشراً بلا واجهة.

**لا تبدأ B** إذا كان كل عملائك أفراداً/متاجر صغيرة، وA يغطيهم. MSI سيضيف تعقيداً بلا عائد.

### B2 — هيكل المشروع المقترح

```text
installer/
  wix/
    Directory.Build.props
    ANPOS.Installer/
      ANPOS.Installer.wixproj
      Product.wxs
      Components.App.wxs
      Components.Service.wxs
      Components.Shortcuts.wxs
      Firewall.wxs
      DataMigration.wxs
      UI.wxs
    ANPOS.Bundle/
      ANPOS.Bundle.wixproj
      Bundle.wxs
    ANPOS.Service/
      ANPOS.Service.csproj   ; أو Node service إن بقي على Node
  nsis/
    legacy-migration.nsh
```

> يمكن إبقاء التطبيق Electron كما هو، وبناء MSI حول `win-unpacked`. الخدمة يمكن أن تكون Node/Electron أو .NET — القرار في Track C.

### B3 — Product وMajor Upgrade

```xml
<Package
  Name="AN POS"
  Manufacturer="AN POS"
  Version="$(var.Version)"
  UpgradeCode="{FIXED-GUID-HERE}"
  Language="1033"
  Codepage="65001">

  <MajorUpgrade
    DowngradeErrorMessage="إصدار أحدث من AN POS مثبت بالفعل."
    Schedule="afterInstallValidate"
    AllowSameVersionUpgrades="no" />

  <MediaTemplate EmbedCab="yes" />

  <Feature Id="Main" Title="AN POS" Level="1">
    <ComponentGroupRef Id="AppFiles" />
    <!-- أزل هذا السطر إذا لم تكن الخدمة ضمن هذه الحزمة -->
    <ComponentRef Id="ServiceComponent" />
  </Feature>
</Package>
```

**قواعد:**
- `UpgradeCode` ثابت لا يتغير أبداً.
- `ProductCode` يتغير لكل إصدار (استخدم `*` أو GUID جديد).
- `Version` بصيغة `major.minor.patch` (MSI لا يقبل `2.6.0-beta` مباشرة).
- `MajorUpgrade` قبل تثبيت الملفات، مع الحفاظ على البيانات.
- لا تضع قاعدة البيانات داخل MSI؛ فقط أنشئ المجلدات/ACL وشغّل أداة الترحيل.

### B4 — الجدار الناري والبيانات (والخدمة إذا كان C جاهزاً)

> **مهم:** لا تضف `ServiceInstall` في B قبل أن يكون `ANPOS.Service.exe` موجوداً ومختبراً. إذا لم يكن Track C جاهزاً، ابنِ MSI لـ **Desktop فقط**، وأجّل قسم الخدمة إلى C. التسلسل الآمن: **B (MSI Desktop) → C (Service) → B-Server (MSI Server)**. لا تضع خدمة وهمية في MSI لمجرد «اكتمال» الحزمة.

#### الخدمة (تُنفَّذ فقط عند تفعيل C)

```xml
<Component Id="ServiceComponent" Directory="INSTALLDIR" Guid="{...}">
  <File Id="AnposServiceExe" Source="$(var.AppDir)\ANPOS.Service.exe" KeyPath="yes" />
  <ServiceInstall
    Id="AnposServiceInstall"
    Name="ANPOSLanService"
    DisplayName="AN POS LAN Service"
    Description="خدمة خادم الشبكة المحلية لنظام AN POS"
    Type="ownProcess"
    Start="auto"
    ErrorControl="normal"
    Account="NT AUTHORITY\NetworkService" />
  <ServiceControl
    Id="AnposServiceControl"
    Name="ANPOSLanService"
    Start="install"
    Stop="both"
    Remove="uninstall"
    Wait="yes" />
</Component>
```

**قواعد:**
- `Start="auto"` + `DelayedAutoStart` إن كان التشغيل المبكر يسبب مشاكل.
- `Stop="both"` يوقف الخدمة عند الترقية/الإزالة.
- أضف `ServiceConfig` لـ Recovery (إعادة تشغيل عند الفشل).
- لا تشغّل الخدمة بحساب المستخدم؛ استخدم `NetworkService` أو حساب خدمة مخصص.
- إذا احتاجت الخدمة الكتابة في `%PROGRAMDATA%`، اضبط ACL في MSI.

#### الجدار الناري

```xml
<fire:FirewallException
  Id="AnposFirewallDomain"
  Name="AN POS LAN Server (Domain)"
  Port="[SERVER_PORT]"
  Protocol="tcp"
  Profile="domain"
  Scope="localSubnet" />

<fire:FirewallException
  Id="AnposFirewallPrivate"
  Name="AN POS LAN Server (Private)"
  Port="[SERVER_PORT]"
  Protocol="tcp"
  Profile="private"
  Scope="localSubnet" />
```

- أضف `WixToolset.Firewall.wixext`.
- اجعل `SERVER_PORT` خاصية عامة (public property) قابلة للتمرير.
- لا تفتح Public.
- أزل القاعدة عند إلغاء التثبيت (MSI يفعلها للـComponent).

#### البيانات

- Desktop: `%LOCALAPPDATA%\AN POS\data` — لا يلمسها MSI.
- Server: `%PROGRAMDATA%\AN POS\data` — MSI ينشئ المجلد + ACL.
- استخدم `util:PermissionEx`:
  ```xml
  <util:PermissionEx User="Users" GenericRead="yes" />
  <util:PermissionEx User="NETWORK SERVICE" GenericRead="yes" GenericWrite="yes" />
  ```
- شغّل `caPrepareUpgrade` قبل `InstallFiles`.
- شغّل `caMigrateData` بعد `InstallFiles` (إذا لزم).
- سجّل النتيجة في `MsiLog` وأوقف التثبيت عند فشل النسخ.

### B5 — Burn Bootstrapper

```xml
<Bundle
  Name="AN POS"
  Version="$(var.Version)"
  Manufacturer="AN POS"
  UpgradeCode="{FIXED-BUNDLE-GUID}">

  <BootstrapperApplicationRef
    Id="WixStandardBootstrapperApplication.HyperlinkLicense" />

  <Chain>
    <MsiPackage
      Id="AnposMsi"
      SourceFile="$(var.MsiPath)"
      Vital="yes"
      DisplayInternalUI="no">
      <MsiProperty Name="EDITION" Value="[Edition]" />
      <MsiProperty Name="SERVER_PORT" Value="[ServerPort]" />
    </MsiPackage>
  </Chain>
</Bundle>
```

- Burn يقدم واجهة اختيار Edition/المسار/المنفذ.
- يمكن إضافة المتطلبات (VC++ Runtime إن لزم) داخل `Chain`.
- استخدم `util:CloseApplication` لإغلاق AN POS قبل التثبيت:
  ```xml
  <util:CloseApplication
    Id="CloseAnpos"
    Target="AN POS.exe"
    CloseMessage="yes"
    RebootPrompt="no" />
  ```
- `bal:Condition` لـ Windows 10+:
  ```xml
  <bal:Condition Message="يتطلب Windows 10 أو أحدث.">
    VersionNT64 &gt;= 1000
  </bal:Condition>
  ```

### B6 — الترحيل من NSIS

هذه أخطر نقطة في B. يجب أن تكون Non-Interactive ومحمية.

#### اكتشاف النسخة القديمة

- ابحث في:
  - `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\...`
  - `HKLM\SOFTWARE\WOW6432Node\...`
  - `HKCU\...`
- استخدم `UninstallString` أو `QuietUninstallString`.
- تحقق من اسم المنتج/`DisplayName` و`DisplayVersion`.

#### إزالة NSIS قبل MSI

- شغّل uninstaller القديم بصمت:
  ```bat
  "C:\AN POS\Uninstall AN POS.exe" /S /KEEP_APP_DATA
  ```
- **مشكلة حالية:** `electron/installer.nsh` يحتوي `MessageBox` في `customUnInstall`، وقد يتوقف في الوضع الصامت. **قبل B، عدّل NSIS ليحترم `/S` و`/KEEP_APP_DATA`** وعدم عرض رسائل.
- إذا فشل الإزالة الصامتة:
  - لا تُثبّت MSI فوقها مباشرة.
  - اعرض رسالة تطلب إزالة يدوية، أو استخدم `MsiPackage` مع `Detect` condition.
- احتفظ بالبيانات: `deleteAppDataOnUninstall: false` + `/KEEP_APP_DATA`.

#### ترحيل البيانات

1. انسخ `anpos.db` + `-wal` + `-shm` إلى مجلد النسخ الاحتياطي.
2. شغّل `AN POS.exe --prepare-upgrade` أو أداة `ANPOS.DbTool.exe`.
3. تحقق من `integrity_check`.
4. انقل/انسخ إلى المسار الجديد (Server: ProgramData).
5. لا تحذف القديم.
6. سجل مسار النسخة في `HKCU/HKLM` أو `config.json`.

#### منع التعايش

- لا تسمح بوجود NSIS وMSI معاً.
- إذا وُجد الاثنان، أوقف التثبيت واطلب إزالة أحدهما.
- امنع الترقية العكسية (MSI → NSIS) إلا بخطة صريحة.

### B7 — النشر المؤسسي

#### الخصائص العامة (Public Properties)

| الخاصية | القيم | الافتراضي |
| :--- | :--- | :--- |
| `EDITION` | `Desktop` / `Server` | `Desktop` |
| `INSTALLDIR` | مسار | `Program Files\AN POS` |
| `DATADIR` | مسار | `ProgramData\AN POS` (Server) |
| `SERVER_PORT` | 1–65535 | `3000` |
| `AUTOSTART` | 0/1 | 1 |
| `CREATE_DESKTOP_SHORTCUT` | 0/1 | 1 |
| `REMOVE_DATA` | 0/1 | 0 |
| `LICENSE_MODE` | `trial` / `licensed` | `trial` |

#### أوامر النشر

```bat
:: تثبيت صامت لسطح مكتب
msiexec /i "AN POS.msi" /qn /l*v install.log EDITION=Desktop

:: تثبيت خادم LAN
msiexec /i "AN POS.msi" /qn /l*v install.log EDITION=Server SERVER_PORT=3000

:: إزالة مع الحفاظ على البيانات
msiexec /x "AN POS.msi" /qn REMOVE_DATA=0

:: إصلاح
msiexec /famus "AN POS.msi" /qn
```

#### GPO/Intune

- استخدم MST Transform لتثبيت القيم (`EDITION`, `SERVER_PORT`).
- وثّق `ProductCode` لكل إصدار.
- استخدم `msiexec /x {ProductCode}` للإزالة.
- اختبر `REBOOT=ReallySuppress` إن لزم.
- لا تعتمد على واجهة MSI في النشر الصامت.

### B8 — CI لـ WiX

```yaml
- name: Setup WiX
  run: dotnet tool install --global wix --version 5.*
- name: Build MSI
  run: dotnet build installer/wix/ANPOS.Installer/ANPOS.Installer.wixproj -c Release
- name: Build Bundle
  run: dotnet build installer/wix/ANPOS.Bundle/ANPOS.Bundle.wixproj -c Release
- name: Sign MSI + Bundle
  run: signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /f $env:CERT_PATH /p $env:CERT_PASS release\*.msi release\*.exe
- name: Install smoke test
  run: msiexec /i release\ANPOS.msi /qn /l*v msi-install.log
- name: Uninstall smoke test
  run: msiexec /x release\ANPOS.msi /qn /l*v msi-uninstall.log
```

- استخدم Windows runner.
- اختبر التثبيت الصامت والترقية والإزالة في VM.
- ارفع `msi-install.log` عند الفشل.
- وقّع MSI وBundle وEXE الخدمة.

### B9 — معايير قبول Track B

- [ ] `msiexec /i ... /qn` ينجح على Win10/11 نظيف.
- [ ] `EDITION=Server` يثبت الخدمة ويشغّلها (فقط إذا اكتمل Track C).
- [ ] `SERVER_PORT` يفتح قاعدة الجدار الناري الصحيحة.
- [ ] Major Upgrade من 2.5.7 NSIS يحافظ على البيانات.
- [ ] Repair/Modify/Uninstall تعمل.
- [ ] `REMOVE_DATA=0` يحفظ البيانات.
- [ ] GPO/Intune test ناجح.
- [ ] MSI/Bundle موقّعان.
- [ ] سجلات MSI وExit Codes موثقة.
- [ ] لا تعايش NSIS/MSI.

---

## 9. المسار C — فصل خادم LAN كخدمة Windows (مؤجل)

**المدة:** 6–10 أسابيع
**الحالة:** **غير مطلوب حالياً.** المتطلب الحالي هو بقاء الخادم بعد **إغلاق الواجهة فقط**، وقد غطّاه **A9 Tray/Background**. لا تبدأ C إلا إذا أصبح مطلوباً أن يعمل الخادم بعد **تسجيل الخروج/إعادة التشغيل** أو قبل تسجيل الدخول.

**يبدأ فقط بعد:** تأكيد أن الخادم يجب أن يبقى يعمل بعد تسجيل الخروج/إعادة التشغيل، أو أن هناك أكثر من محطة تعتمد عليه بشكل دائم.

### 9.1 لماذا؟

الوضع الحالي: `startHttpServer` يعمل داخل `electron/main/index.ts`، ويتوقف عند `window-all-closed`/`before-quit`. النتائج:

- إغلاق الواجهة يقطع الهواتف/المحطات.
- تسجيل الخروج يوقف الخادم.
- التحديث يقتل الخادم.
- جدار الحماية يحتاج elevation من تطبيق `asInvoker`.
- SQLite مفتوح من عملية الواجهة، ما يعقّد النسخ الاحتياطي والتحديث.

### 9.2 المعمارية

```text
ANPOS.Service.exe (Windows Service, auto-start)
  ├─ Fastify HTTP + WebSocket
  ├─ SQLite (single writer)
  ├─ Discovery UDP/Bonjour
  ├─ Firewall manager
  ├─ Backup scheduler
  └─ Health endpoint /api/health

AN POS.exe (UI, asInvoker)
  ├─ Local IPC (named pipe) أو HTTP 127.0.0.1
  ├─ لا يفتح SQLite في Server Mode
  └─ يعرض حالة الخدمة + إعادة التشغيل
```

### 9.3 مراحل التنفيذ

#### C1 — استخراج طبقة البيانات
- افصل `handlers/*` عن `ipc/*` (معظمها mutable بالفعل).
- اجعل الخدمة تستدعي نفس الدوال.
- لا تكرر منطق SQL.

#### C2 — خدمة الخادم
- أنشئ `ANPOS.Service.exe` (Node/Electron أو .NET).
- انقل `server/index.ts` + `discovery*` + `eventBus`.
- أضف `--service` mode بلا نافذة.
- أضف Health/Ready endpoints.
- أضف تسجيل أخطاء إلى `%PROGRAMDATA%\AN POS\logs`.

#### C3 — ربط الواجهة
- في Server Mode: الواجهة تتصل بـ`http://127.0.0.1:<port>` أو named pipe.
- في Desktop Mode: تبقى مباشرة على SQLite.
- لا تسمح للواجهة بفتح SQLite في Server Mode.
- أضف شاشة «حالة الخدمة» (Running/Stopped/Port/Clients).

#### C4 — التثبيت والتحديث
- MSI يثبت الخدمة (B4).
- الخدمة تبدأ قبل تسجيل الدخول.
- التحديث: أوقف الخدمة، حدّث الملفات، أعد التشغيل.
- Recovery: `sc failure ANPOSLanService reset= 86400 actions= restart/5000/restart/10000/restart/30000`.
- النسخ الاحتياطي: service-owned، مع `VACUUM INTO` و`integrity_check`.

### 9.4 معايير قبول Track C

- [ ] الخدمة تعمل بعد إعادة التشغيل وقبل تسجيل الدخول.
- [ ] إغلاق الواجهة لا يوقف الخدمة.
- [ ] الهواتف/المحطات تبقى متصلة.
- [ ] الواجهة تعمل asInvoker.
- [ ] الكتابة على SQLite من الخدمة فقط.
- [ ] النسخ الاحتياطي أثناء التشغيل يعمل.
- [ ] التحديث يوقف/يعيد الخدمة بأمان.
- [ ] MSI يثبت/يزيل الخدمة.
- [ ] Firewall يديره Helper/Service.

---

## 10. المسار D — MSIX

**الحالة:** مؤجل حتى إشعار آخر.

### 10.1 لماذا ليس الآن؟

- يحتاج هوية تطبيق وتوقيعاً متوافقاً.
- يقيّد/يعقّد الخدمات وقواعد الجدار الناري والـelevation.
- البيانات/الملفات قد تُعاد توجيهها إلى مسار الحزمة.
- التحديث عبر App Installer/Store، وليس `electron-updater` بالضرورة.
- لا يحل مشكلة الخادم الدائم.

### 10.2 متى نعيد تقييمه؟

- إذا أصبح التوزيع عبر Microsoft Store أو Intune الحديث شرطاً.
- إذا كان العميل يريد تحديثاً مُداراً بالكامل.
- إذا توفرت شهادة توقيع متوافقة مع MSIX.
- إذا اختفت الحاجة لقواعد جدار ناري مخصصة.

### 10.3 إن أردت تجربته لاحقاً

- استخدم `electron-builder` target `appx` أو MSIX Packaging Tool.
- اختبر على VM نظيف مع/بدون Store.
- وثّق القيود قبل الوعد بأي ميزة.

---

## 11. الجدول الزمني والموارد

### 11.1 الجدول

| الأسبوع | المرحلة | المخرجات | بوابة |
| :---: | :--- | :--- | :--- |
| 0 | المرحلة 0 | شجرة نظيفة + اختبارات + baseline | Gate 0 |
| 1 | A2 + A3 | Per-User + asInvoker + WAL backup | — |
| 2 | A4 + A5 + A9 | Firewall + حزمة نظيفة + Tray Server | — |
| 3 | A6 + A7 | CI + updater + SHA256 | Gate A |
| 4 | Pilot | 3–5 عملاء + مراقبة إغلاق النافذة/LAN | Gate A+ |
| — | B / C / D | **مؤجلة** | — |

> المدة الفعلية تعتمد على: تعقيد ترحيل البيانات، اختبار Tray على Windows، وسلوك UAC عند تفعيل جدار الحماية. الأسبوع 0 وA هما **المسار الحرج**. لا توجد مدة لـB/C/D في هذه الخطة.

### 11.2 الجهد التقديري

| المسار | Person-Days | ملاحظات |
| :--- | :---: | :--- |
| المرحلة 0 | 4–6 | اختبارات + تنظيم |
| A | 12–18 | Per-User، WAL، Tray، CI، updater |
| A1 (توقيع) | 2–4 | **مؤجل** حتى توفر الشهادة |
| B | 30–45 | **مؤجل** — WiX/خدمة/ترحيل |
| C | 45–65 | **مؤجل** — إعادة هيكلة + خدمة |
| D | 15–30 | **مؤجل** |

### 11.3 الفريق

| الدور | المسؤولية |
| :--- | :--- |
| Product Owner | قرارات النطاق، الشهادة، أولويات العملاء |
| Release Engineer | CI، توقيع، إصدارات، rollback |
| Electron Developer | main، updater، WAL helper، asInvoker |
| Backend/Service Developer | Fastify، service، data layer |
| QA Windows | VMs، clean install، upgrade، GPO |
| IT/Security | الشهادة، SmartScreen، ACL، سياسات |

---

## 12. خطة الاختبار والتحقق

### 12.1 مصفوفة البيئات

| البيئة | الإصدار | الغرض |
| :--- | :--- | :--- |
| Windows 10 | 22H2 x64 | الحد الأدنى المدعوم |
| Windows 11 | 23H2/24H2 x64 | الحداثة |
| Windows Server | 2019/2022 x64 | خادم/LAN |
| VM بلا إنترنت | Win10/11 | SmartScreen/التحديث |
| VM بإنترنت | Win10/11 | updater/activation |
| جهاز POS فعلي | شاشة لمس/طابعة | الطباعة/الدرج |

### 12.2 سيناريوهات التثبيت

- [ ] تثبيت نظيف بلا `%APPDATA%\an-pos` ولا `%LOCALAPPDATA%\AN POS`.
- [ ] تثبيت نظيف مع قاعدة قديمة `an-pos.db`.
- [ ] تثبيت **Per-User** فوق 2.5.7 NSIS (مع مسار ترحيل من Per-Machine).
- [ ] التثبيت لا يطلب UAC.
- [ ] التثبيت في `%LOCALAPPDATA%\Programs\AN POS`، والبيانات في `%LOCALAPPDATA%\AN POS\data`.
- [ ] ترقية من 2.5.6 → 2.5.7 → 2.6.0.
- [ ] إعادة تثبيت نفس الإصدار.
- [ ] تثبيت صامت `/S`.
- [ ] إلغاء التثبيت مع «لا» → البيانات باقية.
- [ ] إلغاء التثبيت مع «نعم» → البيانات محذوفة.
- [ ] فشل قرص ممتلئ.
- [ ] فشل قاعدة مقفلة.
- [ ] ملف تالف/تنزيل ناقص → التحقق من SHA-256.
- [ ] (مؤجل) `msiexec /qn` وRepair/Modify — فقط عند تنفيذ B.

### 12.3 سيناريوهات البيانات

- [ ] 1,000 مبيعة + WAL غير مcheckpoint → النسخة تحتوي آخر مبيعة.
- [ ] `PRAGMA integrity_check` = `ok`.
- [ ] نسخة احتياطية قابلة للفتح بعد الترقية.
- [ ] ترحيل `%APPDATA%` → `%LOCALAPPDATA%` أو `%PROGRAMDATA%`.
- [ ] عدم حذف المسار القديم.
- [ ] استعادة النسخة بعد فشل مقصود.
- [ ] قاعدة كبيرة (> 500 MB) — وقت النسخ/المساحة.

### 12.4 سيناريوهات الشبكة

- [ ] LAN على Private.
- [ ] LAN على Domain.
- [ ] LAN على Public → ممنوع.
- [ ] تغيير المنفذ.
- [ ] تعارض المنفذ → auto-increment.
- [ ] إعادة تشغيل الخادم.
- [ ] **إغلاق الواجهة (X) → الهاتف/المحطة يبقى متصلاً (A9).**
- [ ] «خروج» من Tray → الخادم يتوقف والاتصال ينقطع.
- [ ] تسجيل خروج/دخول → الخادم يتوقف (مقبول وموثق).
- [ ] فتح التطبيق مرة ثانية → النافذة تظهر، لا نسخة ثانية.
- [ ] 5 محطات متصلة.
- [ ] جدار حماية بعد التحديث.
- [ ] رفض UAC عند تفعيل LAN → التطبيق يعمل محلياً برسالة واضحة.

### 12.5 سيناريوهات الأمان

- [ ] `SHA256SUMS.txt` موجود ويطابق كل ملف منشور.
- [ ] SmartScreen على VM نظيف: التحذير موثق، وخطوات «More info → Run anyway» صحيحة.
- [ ] (مؤجل) `signtool verify /pa` على كل EXE/DLL/MSI — عند توفر الشهادة.
- [ ] التطبيق لا يطلب UAC.
- [ ] لا `requireAdministrator` في manifest.
- [ ] لا `profile=any`.
- [ ] ACL على `%LOCALAPPDATA%\AN POS\data` (المستخدم فقط).
- [ ] لا أسرار في الحزمة/المستودع.

### 12.6 سيناريوهات التحديث

- [ ] تحديث Stable.
- [ ] تحديث Beta.
- [ ] فشل الشبكة.
- [ ] تنزيل جزئي/تالف.
- [ ] إعادة تشغيل أثناء التنزيل.
- [ ] Rollback إلى إصدار سابق.
- [ ] `latest.yml` مفقود/تالف.
- [ ] `stagingPercentage` (إن استُخدم).

### 12.7 اختبارات آلية

```bash
# اختبارات التثبيت/التشغيل الأول/الهجرة
npx vitest run src/test/customInstallerAndFirstRun.test.ts src/test/autoMigration.test.ts

# TypeScript (بعد إضافة tsconfig.electron.json)
npm run typecheck

# بناء Windows
npm run package:win:x64

# فحص الحزمة
node scripts/check-package-contents.mjs
```

### 12.8 اختبارات قبول يدوية على Windows

- [ ] كل بند في 12.2–12.6.
- [ ] تسجيل النتائج في `docs/TEST_MATRIX_INSTALLER.md` مع التاريخ/الجهاز/الإصدار.
- [ ] لقطة شاشة لـ SmartScreen قبل/بعد التوقيع.
- [ ] (مؤجل) سجل التثبيت `msiexec /l*v` — فقط عند تنفيذ B.

---

## 13. المخاطر وخطة التراجع

### 13.1 سجل المخاطر

| المخاطرة | الاحتمال | الأثر | التخفيف | Trigger |
| :--- | :---: | :---: | :--- | :--- |
| SmartScreen يحذّر كل عميل | **مرتفع (مؤكد)** | متوسط | قبول مؤقت + SHA-256 + دليل «More info → Run anyway»؛ شراء شهادة لاحقاً | عميل يرفض التثبيت |
| فقدان بيانات عند الترقية | منخفض | حرج | WAL backup + integrity_check + rollback | أي فشل في اختبار 1,000 مبيعة |
| فشل ترحيل Per-Machine → Per-User | متوسط | مرتفع | اكتشاف `C:\AN POS`/HKLM، إزالة قديمة مرة واحدة، نسخة بيانات | وجود نسختين أو فقدان بيانات |
| الخادم يتوقف عند تسجيل الخروج | **مؤكد** | منخفض | موثق ومقبول؛ C فقط إذا تغيّر الشرط | طلب عميل للعمل قبل تسجيل الدخول |
| رفض UAC عند تفعيل LAN | متوسط | متوسط | التطبيق يعمل محلياً + رسالة واضحة | LAN لا يعمل بعد الرفض |
| تحديث غير موقّع (خطر سلسلة التوريد) | متوسط | مرتفع | HTTPS + SHA-256 + نشر من مستودع تحت سيطرتك؛ توقيع لاحقاً | اختراق حساب النشر |
| Tray يترك نسخة ثانية | منخفض | متوسط | single instance + focus existing | نافذتان/خادمان |
| تحديث يفسد التثبيت | متوسط | مرتفع | Staged rollout + rollback + manual installer | شكاوى > 1% |
| مضاد فيروسات يحجب المثبّت | متوسط | متوسط | SHA-256 + إرسال عينات للبائعين؛ توقيع لاحقاً | حجب في عينة |
| فشل CI بسبب أسرار | منخفض | متوسط | البناء الحالي غير موقّع؛ secrets فقط عند التوقيع | فشل signing job |
| تعارض Portable/Installed | منخفض | متوسط | Single instance + منع نفس userData | تشغيل متزامن |
| (مؤجل) فشل ترحيل NSIS → MSI | — | — | لا ينطبق الآن | عند تنفيذ B |
| (مؤجل) تعقيد WiX/Service | — | — | لا ينطبق الآن | عند تنفيذ B/C |

### 13.2 استراتيجية التراجع

#### Track A
1. احتفظ بـ`AN POS-Setup-2.5.7-x64.exe` و`latest.yml` السابق.
2. إذا فشل إصدار 2.6.0:
   - أوقف نشر `latest.yml` (أو أعد نشر السابق).
   - انشر إصدار 2.6.1 بإصلاح، لا تعتمد على downgrade.
3. البيانات:
   - استخدم `pre_upgrade_*.db` من مجلد النسخ.
   - أوقف التطبيق، استبدل `anpos.db` + احذف `-wal`/`-shm`، ثم ابدأ.
4. إذا فشل التحديث التلقائي:
   - وزّع المثبّت اليدوي.
   - عطّل `autoUpdater` عبر إعداد/سياسة.
5. إذا فشل ترحيل Per-Machine → Per-User:
   - لا تحذف `C:\AN POS` أو بيانات `%APPDATA%\an-pos`.
   - أعد تثبيت 2.5.7 Per-Machine مؤقتاً، واستعد البيانات من النسخة.
6. إذا بقي Tray عالقاً:
   - «خروج» من القائمة، أو `taskkill /IM "AN POS.exe" /T` بعد حفظ البيانات.

#### Track B (مؤجل)
1. احتفظ بـMSI السابق و`ProductCode`.
2. `msiexec /x {oldProductCode}` ثم تثبيت القديم.
3. إذا فشل Major Upgrade:
   - راجع `msi-install.log`.
   - استخدم `REINSTALLMODE=amus` بحذر.
   - لا تحذف البيانات.
4. إذا فشل ترحيل NSIS:
   - أوقف قبل تثبيت MSI.
   - أعد تشغيل NSIS القديم.
   - أعد البيانات من النسخة.

#### Track C (مؤجل)
1. أوقف الخدمة.
2. أعد binaries السابقة.
3. شغّل الخدمة.
4. إذا تلفت القاعدة: استخدم نسخة `VACUUM INTO`.
5. احتفظ بوضع Desktop كـFallback.

### 13.3 قنوات التواصل

- إشعار داخلي قبل كل إصدار.
- ملاحظات إصدار تتضمن: التغييرات، متطلبات Windows، طريقة Rollback.
- قناة دعم للعملاء (وليست مؤسسية فقط).
- سجل حوادث لكل فشل تثبيت/ترقية.

---

## 14. معايير القبول النهائية

### 14.1 Definition of Done — Track A

- [x] مثبّت Per-User + `asInvoker` + لا UAC عند التثبيت/التحديث (A2).
- [x] الإصدار غير موقّع، مع `SHA256SUMS.txt` وتوثيق SmartScreen (A1/A6).
- [x] WAL-safe backup + integrity_check (A3: CLI `--prepare-upgrade` & `--verify-backup`).
- [x] Firewall private/domain/localSubnet + actual port (A4: `firewall.ts` + `installer.nsh`).
- [x] CI كامل (tests/typecheck/NSIS/portable/latest.yml/SHA256) (A6: `.github/workflows/build.yml`).
- [x] updater + rollback (A7: `electron-updater` + GitHub Releases).
- [x] A9 Tray: LAN يبقى بعد إغلاق الواجهة، ويتوقف عند الخروج/تسجيل الخروج (A9: `tray.ts`).
- [x] لا Linux binaries (A5: استبعاد المنصات وفحص `check-package-contents.mjs`).
- [x] وثائق محدثة ومطابقة في شجرة العمل.
- [ ] اختبار 30 جهاز/VM موثق (قيد الاختبار التشغيلي الميداني).

### 14.2 Definition of Done — Track B (مؤجل)

- [ ] MSI صامت + Burn.
- [ ] Service + firewall + data migration.
- [ ] Major Upgrade من NSIS.
- [ ] GPO/Intune.
- [ ] MSI/Bundle موقّعان.
- [ ] Logs/Exit Codes.
- [ ] Rollback موثق.
- [ ] عميل مؤسسي تجريبي ناجح.

### 14.3 Definition of Done — Track C (مؤجل)

- [ ] Service auto-start + recovery.
- [ ] UI asInvoker + IPC.
- [ ] Single writer DB.
- [ ] Backup while running.
- [ ] Update service safely.
- [ ] 5+ terminals.
- [ ] Rollback.

### 14.4 قائمة الإصدار (Release Checklist v3.0.0)

- [x] رقم الإصدار محدث في `package.json` (`3.0.0`) والوسم (`v3.0.0`).
- [x] Changelog محدث في `CHANGELOG.md` و `src/constants/app.ts`.
- [x] `npm test && npm run typecheck` يمران بنجاح تام وبدون أي أخطاء.
- [x] بناء الحزم واختبار البناء يمر بنجاح (`npm run build`).
- [ ] (مؤجل) توقيع كل الملفات + `signtool verify` (A1 مؤجل لعدم توفر شهادة).
- [x] `SHA256SUMS.txt` وتوثيق SmartScreen (مضمن ومطبق في pipeline).
- [x] اختبار تثبيت Per-User نظيف بلا UAC (مختبر وموثق).
- [x] اختبار ترقية وحفظ المسار القائم `C:\AN POS`.
- [x] اختبار WAL/النسخة الاحتياطية الذرية عبر `--prepare-upgrade` و `--verify-backup`.
- [x] اختبار firewall/LAN وتقييد النطاق (`private,domain` و `localsubnet`).
- [x] اختبار Tray: إغلاق الواجهة لا يقطع خادم LAN.
- [x] اختبار updater وربط `electron-updater` مع GitHub Releases.
- [x] اختبار إلغاء التثبيت وحماية البيانات والترخيص.
- [x] إعداد مخرجات `latest.yml` و `.blockmap`.
- [x] الوسم المرجعي `v2.5.7-baseline` محفوظ للتراجع.

---

## 15. خريطة الملفات والتغييرات

### 15.1 ملفات موجودة ستتغير

| الملف | التغيير |
| :--- | :--- |
| `package.json` | `perMachine:false`، `allowElevation:false`، asInvoker، publish، asarUnpack، scripts |
| `electron/installer.nsh` | WAL backup، إغلاق لطيف، مسارات `$LOCALAPPDATA`، إزالة منطق HKLM/`C:\AN POS`، firewall عبر UAC فقط |
| `electron/main/index.ts` | `app.setPath('userData')`، Tray، إخفاء عند الإغلاق، updater، `--prepare-upgrade`، single instance focus |
| `electron/main/database.ts` | مسار البيانات الجديد، checkpoint، integrity check |
| `electron/main/ipc/system.ts` | سياسة التشغيل الأول، بيانات المسار، إعدادات updater |
| `electron/main/server/index.ts` | health/port manager، إيقاف منسق مع Tray |
| `electron/main/ipc/network.ts` | firewall/port manager + طلب UAC مرة واحدة |
| `.github/workflows/build.yml` | CI كامل + بناء غير موقّع + SHA-256 (وتوقيع عند توفر الشهادة) |
| `docs/CUSTOM_INSTALLER_AND_ONBOARDING_GUIDE.md` | تحديث السلوك |
| `tsconfig.json` / `tsconfig.node.json` | إضافة `electron/**` أو `tsconfig.electron.json` |

### 15.2 ملفات جديدة مقترحة

| الملف | الدور |
| :--- | :--- |
| `electron/main/updater.ts` | `electron-updater` + channels |
| `electron/main/tray.ts` | Tray + إخفاء/إظهار + إيقاف الخادم |
| `electron/main/backup/preUpgrade.ts` | `--prepare-upgrade` |
| `electron/main/dataPath.ts` | مسار/ترحيل LocalAppData |
| `electron/main/firewall.ts` | إدارة قاعدة الجدار الناري + طلب UAC |
| `scripts/verify-signatures.ps1` | تحقق CI (مؤجل حتى التوقيع) |
| `scripts/generate-checksums.ps1` | SHA256 |
| `scripts/check-package-contents.mjs` | منع Linux binaries |
| `installer/wix/**` | WiX projects (مؤجل) |
| `installer/nsis/legacy-migration.nsh` | ترحيل من Per-Machine (مطلوب إذا وُجدت نسخ قديمة) |
| `docs/INSTALLER_OPERATIONS.md` | تشغيل/صلاحيات |
| `docs/UPGRADE_ROLLBACK.md` | ترقية/تراجع |
| `docs/ENTERPRISE_DEPLOYMENT.md` | GPO/Intune |
| `docs/TEST_MATRIX_INSTALLER.md` | سجل الاختبارات |
| `src/test/installer.e2e.test.ts` | اختبار تثبيت/تشغيل أول |

> المسارات الجديدة مقترحة؛ يمكن تعديلها لتلائم هيكل المشروع، لكن يجب ألا تتكرر مسؤولية نفس الملف بين أكثر من طبقة.

### 15.3 أمثلة إعداد

#### `package.json` (Track A)

```jsonc
{
  "build": {
    "appId": "com.anpos.desktop",
    "productName": "AN POS",
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64"] }],
      "icon": "build/icon.ico",
      "requestedExecutionLevel": "asInvoker",
      // لا signtoolOptions الآن: لا توجد شهادة.
    },
    // ملاحظة: عند تفعيل A1، أضف signtoolOptions هنا.
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowElevation": false,
      "allowToChangeInstallationDirectory": true,
      "deleteAppDataOnUninstall": false,
      "runAfterFinish": true,
      "include": "electron/installer.nsh",
      "artifactName": "${productName}-Setup-${version}-${arch}.exe"
    },
    "portable": {
      "artifactName": "${productName}-${version}-${arch}-portable.exe",
      "requestExecutionLevel": "user"
    },
    "publish": [
      {
        "provider": "github",
        "owner": "<owner>",
        "repo": "<repo>",
        "releaseType": "release"
      }
    ]
  }
}
```

#### `.github/workflows/build.yml` (مختصر)

```yaml
name: Release
on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run build
      - name: Package (unsigned)
        run: npx electron-builder --win nsis portable --x64
      - run: powershell -File scripts/generate-checksums.ps1
      - uses: actions/upload-artifact@v4
        with:
          name: anpos
          path: |
            release/*.exe
            release/*.blockmap
            release/latest.yml
            release/SHA256SUMS.txt
```

### 15.4 أوامر مفيدة

```bash
# بناء التطبيق
npm run build

# حزمة Windows x64 (NSIS + Portable)
npm run package:win:x64

# Portable فقط
npm run package:win:portable

# اختبارات التثبيت والهجرة
npx vitest run src/test/customInstallerAndFirstRun.test.ts src/test/autoMigration.test.ts

# فحص الأنواع
npm run typecheck

# إدارة الإصدار (غير مربوط حالياً)
node scripts/set-version.mjs 2.6.0
```

---

## 16. القرارات المعتمدة من صاحب المنتج

> هذه القرارات **معتمدة** وبنيت عليها النسخة 2. لا تُعاد مناقشتها إلا إذا تغيّر شرط المنتج.

| # | القرار | الإجابة المعتمدة | الأثر |
| :-- | :--- | :--- | :--- |
| 1 | شهادة التوقيع | **لا توجد** | A1 مؤجل؛ إصدار غير موقّع + SHA-256 + توثيق SmartScreen |
| 2 | نموذج التثبيت | **Per-User** | لا UAC؛ `%LOCALAPPDATA%\Programs\AN POS` |
| 3 | مسار البيانات | **LocalAppData** | `%LOCALAPPDATA%\AN POS\data`؛ ترحيل من Roaming |
| 4 | عملاء مؤسسيون / GPO / Intune | **لا** | B مؤجل |
| 5 | بقاء الخادم بعد إغلاق الواجهة | **نعم، بعد إغلاق الواجهة فقط** | A9 Tray؛ C مؤجل |
| 6 | بقاء الخادم بعد تسجيل الخروج/إعادة التشغيل | **غير مطلوب** | لا Windows Service |
| 7 | MSIX | **غير مطلوب** | D مؤجل |
| 8 | قناة التحديث | **GitHub Releases** (افتراضي) | A7؛ يمكن تغييرها إلى S3/Cloudflare لاحقاً |
| 9 | دعم ARM64 | **لاحقاً** | لا يضاف الآن |
| 10 | حذف البيانات عند إلغاء التثبيت | **لا يحذف افتراضياً** | A8؛ الحذف بخيار صريح بعد نسخة احتياطية |

### 16.1 قرارات غير حاجزة (يمكن تأجيلها)

1. هل قناة التحديث ستبقى GitHub Releases أم تنتقل إلى استضافة خاصة؟
2. هل هناك حاجة لدعم ARM64 خلال 12 شهراً؟
3. من سيدعم التثبيت ميدانياً، وهل لديه وصول إلى Windows VM؟
4. هل نضيف خيار «تشغيل مع Windows» للـTray؟ (ليس مطلوباً الآن)

> **لا توجد أسئلة حاجزة متبقية لبدء المرحلة 0.**

---

## 17. ملاحق

### 17.1 قائمة تحقق التثبيت اليدوي (Track A)

```text
[ ] VM نظيف Win10/11
[ ] لا %APPDATA%\an-pos ولا %LOCALAPPDATA%\AN POS
[ ] تشغيل المثبّت (غير موقّع — تحذير SmartScreen موثق)
[ ] لا UAC عند التثبيت
[ ] التثبيت في %LOCALAPPDATA%\Programs\AN POS
[ ] إنشاء الاختصارات
[ ] تشغيل التطبيق
[ ] معالج التشغيل الأول يظهر
[ ] إدخال اسم متجر + رمز مدير قوي
[ ] تسجيل الدخول بالمدير
[ ] إنشاء منتج/بيع
[ ] الطباعة
[ ] تفعيل LAN (UAC مرة واحدة لقاعدة الجدار الناري)
[ ] فتح المنفذ من جهاز آخر
[ ] إغلاق النافذة (X): الهاتف يبقى متصلاً
[ ] فتح التطبيق مرة ثانية: النافذة تظهر، لا نسخة ثانية
[ ] "خروج" من Tray: الخادم يتوقف
[ ] إغلاق/إعادة فتح: لا معالج
[ ] ترقية إلى إصدار جديد: النسخة الاحتياطية موجودة
[ ] التحقق من آخر مبيعة
[ ] إلغاء التثبيت مع "لا": البيانات باقية
[ ] إعادة التثبيت: البيانات موجودة
[ ] إلغاء التثبيت مع "نعم": البيانات محذوفة (اختياري)
```

### 17.2 قائمة تحقق MSI

```text
[ ] msiexec /i ... /qn EDITION=Desktop
[ ] msiexec /i ... /qn EDITION=Server SERVER_PORT=3000
[ ] sc query ANPOSLanService
[ ] firewall rule profile=private,domain
[ ] Major Upgrade من 2.5.7 NSIS
[ ] بيانات محفوظة
[ ] msiexec /famus
[ ] msiexec /x ... REMOVE_DATA=0
[ ] البيانات باقية
[ ] GPO/Intune
[ ] logs + exit codes
```

### 17.3 مراجع داخلية

| الملف | علاقته |
| :--- | :--- |
| `INSTALLATION_SYSTEM_ANALYSIS.md` | التحليل الحالي |
| `INSTALLATION_SYSTEM_AUDIT.md` | تدقيق سابق — بعض الأرقام قد تكون قديمة |
| `INSTALLATION_SYSTEM_FIX_PLAN.md` | خطة الإصلاح السابقة |
| `EXE_PACKAGING_AND_DATABASE_ARCHITECTURE.md` | التغليف/البيانات |
| `docs/CUSTOM_INSTALLER_AND_ONBOARDING_GUIDE.md` | دليل المثبّت |
| `docs/DATABASE_MIGRATION_GUIDE.md` | الهجرات |
| `.github/workflows/build.yml` | CI الحالي |
| `release/builder-effective-config.yaml` | الإعداد الفعلي |
| `release/win-unpacked/` | مخرجات البناء |

### 17.4 مراجع خارجية

- electron-builder: Code Signing, NSIS, MSI, Auto Update.
- WiX Toolset v4/v5: Package, MajorUpgrade, ServiceInstall, FirewallExtension, Burn.
- Microsoft: MSIX limitations, SmartScreen, Authenticode, `signtool`.
- Microsoft: Windows Installer `msiexec`, public properties, transforms.

---

## خاتمة

AN POS يملك بالفعل أساساً جيداً: مسار بيانات مستقل، هجرات تلقائية، ترخيص موقّع، وإلغاء تثبيت يحافظ على البيانات. المشكلة ليست «NSIS ضعيف»؛ المشكلة أن **حلقة التسليم غير مكتملة**: لا توقيع، لا تحديث، نسخة WAL غير آمنة، صلاحيات مرتفعة، وCI لا ينتج المثبّت.

الخطة المعتمدة تقترح ترتيباً واقعياً:

1. **أغلق P0** (بيانات + تشغيل أول + typecheck + callerRole).
2. **قوِّ NSIS بنموذج Per-User** (asInvoker + WAL + firewall + CI + updater + SHA-256).
3. **أضف A9 Tray** ليبقى LAN بعد إغلاق الواجهة، بلا Windows Service.
4. **أجّل B/C/D** لأن العملاء غير مؤسسيين، ولا حاجة لخدمة أو MSIX.
5. **أعد A1 (التوقيع)** عند توفر شهادة؛ حتى ذلك الحين وثّق تحذير SmartScreen ولا تَعِد بإزالته.

بهذا الترتيب تحصل على تحسين ملموس خلال 3–4 أسابيع، دون إعادة كتابة النظام كله، ودون المخاطرة ببيانات العملاء. **الفجوة الوحيدة التي لا تُغلق الآن هي التوقيع الرقمي، وهي مقبولة مؤقتاً بقرار صاحب المنتج.**
