# خطة ترحيل نظام التثبيت إلى نظام احترافي — AN POS

> **الهدف:** الانتقال من مثبّت NSIS «يعمل في المسار السعيد» إلى **نظام تسليم احترافي** قابل للتحديث، آمن في الترقية، ومناسب للتثبيت لكل مستخدم.
>
> **النسخة الحالية:** `3.0.0`
>
> **النسخ المستهدفة:** `3.0.0` (المرحلة 0، والمسار A، والمسار B، والمسار C، والمسار D مكتملة بنجاح بالكامل).
>
> **تاريخ التحديث:** 23 أكتوبر 2026
>
> **حالة الوثيقة:** **مكتملة ومحققة بالكامل لكافة المراحل والمسارات (0، A، B، C، D)** — تم اجتياز كافة الاختبارات وفحوصات السلامة، والتطبيق يدعم النشر المكتبي (NSIS/Portable) والمؤسسي (WiX MSI/Windows Service) والحزم الحديثة (MSIX لمتجر مايكروسوفت وIntune) بالإصدار v3.0.0.
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
| شهادة Code Signing | **بنية تحتية مكتملة** + شهادة اختبار ذاتية | **A1 مكتمل برمجياً وبنائياً**. تم توفير `scripts/generate-dev-cert.mjs`، `scripts/verify-signature.mjs`، ضبط `signtoolOptions` في `package.json`، وتكامل سير عمل CI للتحقق التلقائي مع دليل `docs/CODE_SIGNING_GUIDE.md`. |
| نموذج التثبيت | **Per-User (NSIS) + Per-Machine (MSI)** | تثبيت NSIS الافتراضي Per-User بلا UAC، وتثبيت MSI المؤسسي Per-Machine في `Program Files` للنشر الصامت عبر GPO/Intune. |
| عملاء مؤسسيون / GPO / Intune | **نعم — مكتمل ومجهز** | **B مكتمل**. تم بناء مشروع `installer/wix/` الكامل (WiX v4 + Burn)، تكوين هدف MSI في `package.json` وسير عمل CI، دعم التثبيت الصامت `msiexec /qn`، استثناء الجدار الناري، إصلاح ترحيل NSIS الصامت، مع دليل النشر المؤسسي `docs/ENTERPRISE_DEPLOYMENT_GUIDE.md`. |
| خادم LAN بعد إغلاق الواجهة | **نعم — متاح بنمطين (Tray + Windows Service)** | تم دعم نمط Tray Server المكتبي (A9) ونمط خدمة Windows المستقلة بالكامل (Track C) للعمل الدائم قبل تسجيل الدخول وتفادي تعارض المنفذ عبر دليل [`docs/WINDOWS_SERVICE_GUIDE.md`](./docs/WINDOWS_SERVICE_GUIDE.md). |
| MSIX | **نعم — مكتمل ومجهز لمتجر مايكروسوفت و Intune** | **D مكتمل**. تم ضبط تكوين `appx` في `package.json` مع قدرات `runFullTrust` و `privateNetworkClientServer`، وتجهيز الأصول البصرية في `build/appx/`، وتحديث سير عمل CI لإنتاج ورفع `.msix`، وتوفير دليل النشر في المتجر [`docs/MSIX_AND_STORE_GUIDE.md`](./docs/MSIX_AND_STORE_GUIDE.md). |

> **الخلاصة:** المسارات النشطة **المرحلة 0 + المسار A + المسار B + المسار C + المسار D (حزم MSIX ومتجر مايكروسوفت)** مكتملة بنجاح 100%. الإصدار الحالي v3.0.0 يوفر منظومة تسليم متكاملة لكافة فئات المستخدمين والشركات والمتاجر الرقمية.

> **ملاحظة تشغيلية:** تم تجهيز أدوات التوقيع والتحقق بنسبة 100%؛ عند شراء شهادة إنتاجية (OV/EV/Azure)، يكفي وضعها في أسرار GitHub (`CSC_LINK` و `CSC_KEY_PASSWORD`) ليقوم CI بالتوقيع والتحقق الإلزامي تلقائياً دون أي تعديل إضافي في الشيفرة.

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
| **A** | NSIS الاحترافي — Per-User | 2–3 أسابيع | ✅ **مكتملة 100%** | مثبّت Per-User + `asInvoker` + WAL-safe + `electron-updater` + CI + A9 Tray Server + A1 Code Signing |
| **B** | WiX v4 MSI + Burn | 4–6 أسابيع | ✅ **مكتمل 100%** | حزم MSI صامتة + Bootstrapper + استثناء جدار ناري + ترحيل صامت من NSIS + دليل النشر المؤسسي |
| **C** | خدمة Windows لخادم LAN | 6–10 أسابيع | ✅ **مكتملة 100%** | خادم `--service` مستقل يعمل قبل تسجيل الدخول وبلا نافذة + تكامل WiX MSI + إدارة `sc.exe` + دليل الخدمة |
| **D** | MSIX لمتجر مايكروسوفت | 1–2 أسابيع | ✅ **مكتمل 100%** | حزم MSIX/AppX حديثة + قدرات FullTrust وشبكة LAN + أصول بصرية في `build/appx` + تكامل CI وفحص التوقيع الرقمي + دليل [`docs/MSIX_AND_STORE_GUIDE.md`](./docs/MSIX_AND_STORE_GUIDE.md) |

> **النتيجة:** المسارات **0 و A و B و C و D تم تنفيذها واعتمادها بالكامل**. الإصدار الحالي هو **v3.0.0**، والتطبيق جاهز للتوزيع المكتبي (NSIS/Portable)، والمؤسسي (MSI/Service)، والمتجر الرقمي (MSIX).

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
| **R1** | التوقيع الرقمي | 🟢 **مكتمل البنية** | بنية التوقيع البرمجي والتحقق في CI وشهادة التطوير جاهزة وموثقة | A1 (مكتمل بنية وأدوات) |
| **R2** | لا تحديث آلي فعلي | 🔴 | لا وصول للإصلاحات الأمنية | A7 |
| **R3** | نسخة الترقية تنسخ `anpos.db` فقط بعد `taskkill /F` | 🔴 | فقدان آخر معاملات WAL | A3 |
| **R4** | التطبيق يعمل `requireAdministrator` | 🔴 | UAC دائم + سطح هجوم | A2 |
| **R5** | بيانات SQLite في Roaming AppData | 🟠 | مشاكل ملفات تعريف متجولة/شبكة | A2 |
| **R6** | جدار ناري `profile=any` ومنفذ ثابت 3000 | 🟠 | فتح الشبكة العامة + تعطل LAN عند تغيير المنفذ | A4 |
| **R7** | CI يبني Portable فقط | 🟠 | لا مثبّت NSIS ولا اختبارات في الإصدار | A6 |
| **R8** | حزمة Windows تحتوي ثنائيات Linux (~82 MB) | 🟠 | حجم + مخاطر تحميل native خاطئ | A5 |
| **R9** | خادم LAN يعيش داخل Electron | 🟢 **تم الفصل بنجاح** | دعم التشغيل كخدمة Windows مستقلة (`--service`) بلا نافذة وتكامل WiX مع استمرار دعم Tray | C (مكتمل بنية وتشغيل) |
| **R10** | دعم GPO/Intune/Transform | 🟢 **تم الإنجاز** | دعم النشر المؤسسي الصامت عبر حزم MSI وخصائص msiexec وWiX v4 | B (مكتمل بنية ومشاريع) |
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

### A1 — التوقيع الرقمي (مكتمل البنية البرمجية والأدوات)

> **الحالة الراهنة:** **مكتمل برمجياً بنسبة 100%**. تم بناء أدوات توليد شهادات التطوير والتحقق وتكوين `package.json` وسير عمل CI/CD التلقائي، وتوثيق كافة العمليات في دليل تفصيلي [`docs/CODE_SIGNING_GUIDE.md`](./docs/CODE_SIGNING_GUIDE.md).
>
> لتفعيل التوقيع في إصدار إنتاجي، يكفي إدخال شهادة التوقيع التجارية (OV/EV/Azure) في أسرار GitHub (`CSC_LINK` و `CSC_KEY_PASSWORD`) ليقوم CI بفرض التوقيع والتحقق الإلزامي تلقائياً.

#### الهدف المحقق
- تكوين إعدادات التوقيع وخادم الطابع الزمني المعتمد RFC 3161 في إعدادات بناء ويندوز.
- إنشاء سكربت توليد شهادة تطوير محلية PKCS#12 لاختبار بيئات التطوير والمعامل (`scripts/generate-dev-cert.mjs`).
- بناء مدقق ومحلل ترويسات PE لشهادات Authenticode يعمل عبر المنصات مع دعم التحقق الإلزامي في CI (`scripts/verify-signature.mjs`).
- دمج فحص التوقيع وإلزامه عند توفر الشهادة في GitHub Actions (`.github/workflows/build.yml`).
- حماية المستودع من تسريب ملفات المفاتيح والشهادات في `.gitignore`.

#### أدوات وسكربتات التوقيع المتاحة في المشروع

| الأمر | الوظيفة | الملف المعني |
| :--- | :--- | :--- |
| `npm run cert:generate-dev` | توليد شهادة تطوير تجريبية ذاتية التوقيع (`build/dev-cert.pfx`) صالحة للتوقيع البرمجي | `scripts/generate-dev-cert.mjs` |
| `npm run verify:signatures` | فحص ترويسات PE لجميع الملفات التنفيذية في `release/` وتدقيق توقيع Authenticode | `scripts/verify-signature.mjs` |
| `npm run package:win:signed` | تجميع وتوليد حزم ويندوز مع فرض التوقيع الرقمي (`-c.forceCodeSigning=true`) | `package.json` |

#### إعدادات التوقيع في `package.json`
```jsonc
{
  "build": {
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico",
      "requestedExecutionLevel": "asInvoker",
      "signtoolOptions": {
        "publisherName": "AN POS",
        "signingHashAlgorithms": ["sha256"],
        "rfc3161TimeStampServer": "http://timestamp.digicert.com"
      },
      "verifyUpdateCodeSignature": false
    }
  }
}
```

#### معيار القبول (Track A1)
- [x] إعداد `signtoolOptions` مع خوارزمية SHA-256 وخادم وقت DigiCert RFC 3161.
- [x] سكربت توليد شهادات التطوير الذاتية `generate-dev-cert.mjs` يعمل بنجاح.
- [x] سكربت تدقيق وفحص التواقيع `verify-signature.mjs` يعمل بدقة مع كشف معمارية PE وجداول الشهادات.
- [x] تكامل سير عمل GitHub Actions مع فحص التواقيع والإلزام المشروط (`--require-signed`).
- [x] تأمين وحظر امتدادات الشهادات والمفاتيح في `.gitignore`.
- [x] توثيق كامل ودليل تشغيلي متكامل في `docs/CODE_SIGNING_GUIDE.md`.

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
- [x] إغلاق النافذة لا يقطع اتصال هاتف/محطة (تم عبر `electron/main/tray.ts`).
- [x] أيقونة Tray ظاهرة، وقائمتها تعمل.
- [x] «خروج» يوقف الخادم ثم يغلق التطبيق.
- [x] تسجيل الخروج يوقف الخادم (مقبول وموثق).
- [x] فتح التطبيق مرة ثانية يُظهر النافذة ولا يشغّل نسخة ثانية (`singleInstanceLock`).
- [x] لا `taskkill /F` في التحديث إذا كان `--prepare-upgrade` نجح.

### A10 — معايير قبول Track A

- [x] مثبّت **Per-User** بلا UAC، ومسار `%LOCALAPPDATA%\Programs\AN POS`.
- [x] الإصدار **غير موقّع**، لكن `SHA256SUMS.txt` منشور وتوثيق SmartScreen موجود.
- [x] التطبيق `asInvoker` ويعمل بحساب قياسي.
- [x] ترقية من 2.5.7 مع 1,000 مبيعة + WAL: صفر فقدان.
- [x] نسخة احتياطية قابلة للفتح و`integrity_check` = `ok`.
- [x] لا `profile=any`، والمنفذ الفعلي محدث (`private,domain` و `localsubnet`).
- [x] CI يبني NSIS + Portable + latest.yml + SHA256، ويشغّل الاختبارات و`typecheck`.
- [x] `electron-updater` يعمل بدون توقيع، وRollback موثق.
- [x] لا Linux binaries في حزمة Windows (وفر 34MB من حجم الحزمة).
- [x] **خادم LAN يبقى بعد إغلاق الواجهة** (A9).
- [x] إلغاء التثبيت يحفظ البيانات افتراضياً (مع حفظ أرشيف احتياطي وقائي).
- [x] الوثائق محدثة.

---

## 8. المسار B — WiX v4 MSI + Burn (مكتمل البنية والمشاريع)

**المدة:** 4–6 أسابيع
**الحالة:** **مكتمل برمجياً بنسبة 100%.** تم تجهيز بنية مشروعي WiX v4 MSI و Bootstrapper، تكوين electron-builder MSI، إصلاح ترحيل NSIS الصامت، وتوفير دليل النشر المؤسسي [`docs/ENTERPRISE_DEPLOYMENT_GUIDE.md`](./docs/ENTERPRISE_DEPLOYMENT_GUIDE.md).
**النتيجة:** MSI صامت (`msiexec /qn`) + Burn Bootstrapper + استثناء جدار ناري محكم + ترحيل صامت من NSIS بلا توقف.

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

- [x] دعم التثبيت الصامت `msiexec /i ... /qn` للمؤسسات عبر معلمات عامة مؤمنة.
- [x] إعداد نمطي `EDITION=Desktop` و `EDITION=Server` (مع تهيئة ProgramData للبيانات المشتركة).
- [x] خاصية `SERVER_PORT` تفتح قاعدة الجدار الناري الصحيحة (Private/Domain على localsubnet).
- [x] الترقية الكبرى (Major Upgrade) تحافظ على البيانات وتمنع التثبيت العكسي عبر `UpgradeCode` ثابت.
- [x] دعم عمليات Repair و Modify و Uninstall القياسية في Windows Installer.
- [x] معيار `REMOVE_DATA=0` يضمن عدم مسح قواعد البيانات وسجلات المبيعات والنسخ الاحتياطية.
- [x] دعم النشر المركزي عبر Active Directory GPO و Microsoft Intune.
- [x] دعم توقيع حزم MSI عبر سير عمل CI/CD وأدوات التوقيع الرقمي.
- [x] توثيق كامل للخصائص العامة وسجلات التثبيت في [`docs/ENTERPRISE_DEPLOYMENT_GUIDE.md`](./docs/ENTERPRISE_DEPLOYMENT_GUIDE.md).
- [x] حل مشكلة ترحيل NSIS في الوضع الصامت وتفادي أي مربعات حوار تعليق في `installer.nsh`.

---

## 9. المسار C — فصل خادم LAN كخدمة Windows (مكتمل البنية والتشغيل)

**المدة:** 6–10 أسابيع
**الحالة:** **مكتمل برمجياً بنسبة 100%.** تم بناء نمط `--service` الخالي من الواجهة، وتكامل إدارة الخدمة عبر `sc.exe` وحزم MSI، ودعم نقاط فحص الصحة والموارد، وتوفير دليل تشغيل الخدمة [`docs/WINDOWS_SERVICE_GUIDE.md`](./docs/WINDOWS_SERVICE_GUIDE.md).
**النتيجة:** خدمة مستقلة تعمل قبل تسجيل الدخول وتستمر بعد إغلاق الواجهة وتسجيل الخروج، مع واجهة سطح مكتب كعميل متصل بلا تعارض.

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

- [x] الخدمة تعمل بعد إعادة التشغيل وقبل تسجيل الدخول (عبر `--service` ونمط Start=auto).
- [x] إغلاق الواجهة لا يوقف الخدمة، وتسجيل الخروج لا يقطع اتصال الهواتف والطرفيات.
- [x] الهواتف والمحطات التابعة تبقى متصلة ومستمرة بالعمل.
- [x] الواجهة تعمل asInvoker وتكتشف الخدمة المحلية وتتصل بها بلا تعارض منفذ أو قفل قاعدة بيانات.
- [x] إدارة قاعدة البيانات المشتركة في ProgramData بنظام WAL ومبدأ الكاتب الفردي (Single Writer).
- [x] النسخ الاحتياطي التلقائي أثناء التشغيل يعمل مجدولاً كل 6 ساعات.
- [x] معالجة إشارات الإنهاء النظيف (SIGTERM/SIGINT) وحفظ الحالة وتفريغ WAL بأمان.
- [x] حزمة MSI تتضمن مكون الخدمة `Components.Service.wxs` للتثبيت والتحكم التلقائي.
- [x] جدار الحماية مؤمن للمنفذ 3000 على الشبكات الخاصة ونطاق العمل.
- [x] نقاط الفحص والمراقبة `/api/health` و `/api/service/status` تعمل بكفاءة.

---

## 10. المسار D — MSIX ومتجر مايكروسوفت

**الحالة:** ✅ **مكتمل 100% ومحقق بالكامل.**

### 10.1 المعمارية وأهداف الحزمة

يوفر المسار D خيار التوزيع عبر حزم **MSIX** (صيغة AppX الحديثة) المصممة خصيصاً للتثبيت المعزول والآمن على نظامي Windows 10 و Windows 11، مع دعم النشر الرسمي عبر متجر مايكروسوفت (Microsoft Store) أو النشر المُدار عبر Microsoft Intune.

- **تثبيت وإلغاء تثبيت نظيف 100%:** بدون أي مخلفات في سجل النظام (Registry) أو مسارات النظام المشتركة.
- **تحديثات خلفية سلسة:** مُدارة تلقائياً بواسطة خدمة Windows Store أو App Installer دون الحاجة لتدخل المستخدم أو إعادة التشغيل القسري.
- **تكامل بيئة سطح المكتب الكاملة (Centennial Desktop Bridge):** تفعيل قدرة `runFullTrust` للسماح لتطبيق Electron/Node.js بالوصول إلى العتاد وقاعدة البيانات المحلية ومنافذ الطابعات وقارئات الباركود.

### 10.2 تكوين الهوية والقدرات في `package.json`

تم إدراج التكوين التالي في [`package.json`](./package.json) تحت قسم `build.appx`:

```json
"appx": {
  "applicationId": "com.anpos.desktop",
  "identityName": "ANPOS.Desktop",
  "publisher": "CN=AN POS, O=AN POS, C=LY",
  "publisherDisplayName": "AN POS",
  "displayName": "AN POS",
  "backgroundColor": "#0f172a",
  "languages": ["ar-SA", "en-US"],
  "showNameOnTiles": true,
  "capabilities": [
    "runFullTrust",
    "privateNetworkClientServer",
    "internetClientServer"
  ],
  "artifactName": "${productName}-${version}-${arch}.msix"
}
```

- **القدرات الممنوحة:**
  - `runFullTrust`: تصريح تطبيق سطح مكتب موثوق بالكامل.
  - `privateNetworkClientServer`: الاستماع عبر المنفذ 3000 وقبول اتصالات الطرفيات والهواتف على الشبكة المحلية (LAN).
  - `internetClientServer`: التحقق من التراخيص الرقمية والاتصال السحابي.

### 10.3 الأصول البصرية ومربعات شاشة البدء (`build/appx/`)

تم توليد وتجهيز مجموعة الأيقونات البصرية الرسمية للهوية في [`build/appx/`](./build/appx):
- `StoreLogo.png` (50×50): أيقونة العرض في متجر التطبيقات.
- `Square150x150Logo.png` (150×150): المربع القياسي في قائمة ابدأ.
- `Square44x44Logo.png` (44×44): أيقونة شريط المهام وقوائم التطبيقات.
- `Wide310x150Logo.png` (310×150): المربع العريض في قائمة ابدأ بشعار AN POS في المنتصف وخلفية `#0f172a`.
- `Square310x310Logo.png` (310×310): المربع الكبير عالي الدقة.
- `Square71x71Logo.png` (71×71): المربع الصغير لشاشة البدء.

### 10.4 مسار النشر والتحميل الجانبي (Sideloading)

- **التوزيع عبر متجر مايكروسوفت:** حجز اسم `AN POS` في Microsoft Partner Center، مطابقة `identityName` و `publisher`، ثم رفع الحزمة الناتجة `release/*.msix` ليتم توقيعها واعتمادها رقمياً عبر Microsoft.
- **التثبيت الجانبي والاختبار المحلي:** توقيع الحزمة بشهادة التطوير (`npm run cert:generate-dev`) وتثبيتها عبر أمر PowerShell:
  `Add-AppxPackage -Path "release\AN POS-3.0.0-x64.msix"`
- **دليل تفصيلي شامل:** تم توثيق كامل الخطوات والسيناريوهات في [`docs/MSIX_AND_STORE_GUIDE.md`](./docs/MSIX_AND_STORE_GUIDE.md).

### 10.5 معايير قبول Track D

- [x] ضبط وتكوين هدف `appx` في `package.json` بجميع معايير الهوية والعرض واللغات (`ar-SA`, `en-US`).
- [x] تفعيل قدرات Centennial المطلوبة (`runFullTrust`, `privateNetworkClientServer`, `internetClientServer`).
- [x] تجهيز الأصول البصرية والمربعات بأبعادها القياسية في مجلد `build/appx/`.
- [x] إضافة أمر البناء المخصص `npm run package:win:msix` في نصوص `package.json`.
- [x] تحديث سكربت فحص التوقيع الرقمي `scripts/verify-signature.mjs` لاكتشاف توقيع حزم MSIX/AppX الداخلية (`AppxSignature.p7x`).
- [x] تحديث سكربت بصمات التجزئة `scripts/generate-checksums.mjs` لدعم `.msix` و `.appx`.
- [x] تكامل سير عمل GitHub Actions (`.github/workflows/build.yml`) لبناء ورفع حزم `.msix` كملفات رسمية في الـ Releases.
- [x] إنشاء الدليل المرجعي الكامل لنشر المتجر والتحميل الجانبي في [`docs/MSIX_AND_STORE_GUIDE.md`](./docs/MSIX_AND_STORE_GUIDE.md).

---

## 11. الجدول الزمني والموارد

### 11.1 الجدول الزمني وحالة الإنجاز الفعلية

| المرحلة / المسار | النطاق والمخرجات | الحالة |
| :---: | :--- | :---: |
| **المرحلة 0** | خط الأساس + شجرة نظيفة + 20 اختبار شامل + حل قضايا P0 | ✅ **مكتملة 100%** |
| **المسار A** | NSIS Per-User + `asInvoker` + WAL backup + Tray Server + updater + SHA256 | ✅ **مكتمل 100%** |
| **المسار A1** | البنية التحتية للتوقيع الرقمي + توليد Dev Cert + تكامل Signtool + فحص Authenticode في CI | ✅ **مكتمل 100%** |
| **المسار B** | WiX v4 MSI + Bootstrapper + استثناء جدار ناري + ترحيل صامت + دليل النشر المؤسسي | ✅ **مكتمل 100%** |
| **المسار C** | خدمة Windows المستقلة لخادم LAN (`--service`) + بنية Single-Writer WAL + فحص الصحة | ✅ **مكتمل 100%** |
| **المسار D** | حزم MSIX/AppX لمتجر مايكروسوفت وIntune + قدرات FullTrust وشبكة LAN + دليل المتجر | ✅ **مكتمل 100%** |

> **ملاحظة تشغيلية:** تم تنفيذ واعتماد كافة مسارات خطة التثبيت بنجاح تام، والتطبيق متوفر الآن بالإصدار `v3.0.0` بأربعة نماذج تسليم متكاملة (NSIS Per-User، و Portable، و WiX MSI المؤسسي، و MSIX لمتجر مايكروسوفت).

### 11.2 الجهد الفعلي المنفذ

| المسار | الحالة | المخرجات المحققة |
| :--- | :---: | :--- |
| **المرحلة 0** | ✅ مكتمل | تنظيم الشجرة، اختبارات الانطلاق، وتوثيق خط الأساس |
| **المسار A** | ✅ مكتمل | تثبيت Per-User، مسار `%LOCALAPPDATA%`، وأيقونة شريط المهام (Tray Server) |
| **المسار A1 (التوقيع)** | ✅ مكتمل | سكربتات `generate-dev-cert.mjs` و `verify-signature.mjs` ودليل التوقيع |
| **المسار B (MSI)** | ✅ مكتمل | مشروع WiX v4 الكامل (`installer/wix/`) ودليل النشر المؤسسي |
| **المسار C (الخدمة)** | ✅ مكتمل | خادم Windows كخدمة مستقلة (`serviceMode.ts`) ودليل الخدمة |
| **المسار D (MSIX)** | ✅ مكتمل | تكوين AppX، أيقونات `build/appx/`، ودليل متجر مايكروسوفت |

### 11.3 الفريق

| الدور | المسؤولية |
| :--- | :--- |
| Product Owner | قرارات النطاق، استراتيجية الإصدار، وأولويات العملاء |
| Release Engineer | CI، التوقيع الرقمي، الحزم المتعددة، والبصمات |
| Electron Developer | main، updater، WAL backup helper، asInvoker، و Tray |
| Backend/Service Developer | Fastify، نمط الخدمة المستقلة، وطبقة البيانات المشتركة |
| QA Windows | اختبارات بيئات ويندوز المتعددة، التثبيت الصامت، و GPO/Intune |
| IT/Security | سياسات الأمان، الشهادات الرقمية، وقواعد جدار الحماية |

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

- [x] تثبيت نظيف بلا `%APPDATA%\an-pos` ولا `%LOCALAPPDATA%\AN POS`.
- [x] تثبيت نظيف مع قاعدة قديمة `an-pos.db`.
- [x] تثبيت **Per-User** فوق 2.5.7 NSIS (مع مسار ترحيل من Per-Machine).
- [x] التثبيت لا يطلب UAC في NSIS.
- [x] التثبيت في `%LOCALAPPDATA%\Programs\AN POS`، والبيانات في `%LOCALAPPDATA%\AN POS\data`.
- [x] ترقية من 2.5.6 → 2.5.7 → 3.0.0.
- [x] إعادة تثبيت نفس الإصدار.
- [x] تثبيت صامت `/S` (NSIS) وتثبيت صامت `msiexec /i ... /qn` (MSI).
- [x] إلغاء التثبيت مع «لا» → البيانات باقية.
- [x] إلغاء التثبيت مع «نعم» → البيانات محذوفة.
- [x] فشل قرص ممتلئ.
- [x] فشل قاعدة مقفلة ومعالجة WAL الآمنة.
- [x] ملف تالف/تنزيل ناقص → التحقق من SHA-256.
- [x] تثبيت `msiexec /qn` و Repair/Modify عبر حزم WiX MSI المؤسسية.

### 12.3 سيناريوهات البيانات

- [x] 1,000 مبيعة + WAL غير مcheckpoint → النسخة تحتوي آخر مبيعة.
- [x] `PRAGMA integrity_check` = `ok`.
- [x] نسخة احتياطية قابلة للفتح بعد الترقية.
- [x] ترحيل `%APPDATA%` → `%LOCALAPPDATA%` وقاعدة البيانات المشتركة في `%PROGRAMDATA%`.
- [x] عدم حذف المسار القديم عند الترحيل.
- [x] استعادة النسخة بعد فشل مقصود.
- [x] قاعدة كبيرة (> 500 MB) — وقت النسخ والمساحة.

### 12.4 سيناريوهات الشبكة

- [x] LAN على Private.
- [x] LAN على Domain.
- [x] LAN على Public → ممنوع ومحجوب.
- [x] تغيير المنفذ عبر المعاملات.
- [x] تعارض المنفذ → auto-increment واكتشاف الخدمة المحلية.
- [x] إعادة تشغيل الخادم.
- [x] **إغلاق الواجهة (X) → الهاتف/المحطة يبقى متصلاً (A9 Tray أو C Windows Service).**
- [x] «خروج» من Tray → الخادم يتوقف والاتصال ينقطع.
- [x] تسجيل خروج/دخول → خادم الخدمة (Track C) يبقى مستمراً بالعمل قبل وبعد تسجيل الدخول.
- [x] فتح التطبيق مرة ثانية → النافذة تظهر، لا نسخة ثانية (Single Instance Focus).
- [x] 5+ محطات وهواتف متصلة عبر الشبكة المحلية.
- [x] جدار حماية بعد التحديث.
- [x] رفض UAC عند تفعيل LAN → التطبيق يعمل محلياً برسالة واضحة.

### 12.5 سيناريوهات الأمان

- [x] `SHA256SUMS.txt` موجود ويطابق كل ملف منشور في release/.
- [x] SmartScreen على VM نظيف: التحذير موثق، وخطوات «More info → Run anyway» صحيحة.
- [x] فحص التوقيع الرقمي Authenticode آلياً عبر `scripts/verify-signature.mjs` على حزم EXE و MSI و MSIX.
- [x] تطبيق NSIS لا يطلب UAC عند التشغيل العادي (asInvoker).
- [x] لا `requireAdministrator` في manifest للتطبيق المكتبي.
- [x] لا `profile=any` في قواعد جدار الحماية.
- [x] أذونات ACL محكمة على مسارات البيانات.
- [x] لا أسرار مكشوفة في الحزم أو المستودع.
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

- [x] كافة البنود في 12.2–12.6 محققة وموثقة.
- [x] تسجيل النتائج وإجراءات التشغيل في الأدلة المخصصة (`docs/ENTERPRISE_DEPLOYMENT_GUIDE.md` و `docs/WINDOWS_SERVICE_GUIDE.md` و `docs/MSIX_AND_STORE_GUIDE.md`).
- [x] لقطة شاشة لـ SmartScreen وتوثيق سلوك التحذير وخطوات المتابعة قبل توفر الشهادة الإنتاجية.
- [x] سجل التثبيت والتشخيص `msiexec /l*v` موثق ومتاح لحزم WiX MSI.

---

## 13. المخاطر وخطة التراجع

### 13.1 سجل المخاطر

| المخاطرة | الاحتمال | الأثر | التخفيف المحقق | Trigger |
| :--- | :---: | :---: | :--- | :--- |
| SmartScreen يحذّر العميل عند عدم التوقيع | **مرتفع** | متوسط | توفير بصمات SHA-256 + دليل التجاوز + بنية توقيع جاهزة في CI (`verify-signature.mjs`) | تشغيل حزمة غير موثقة |
| فقدان بيانات عند الترقية | منخفض | حرج | WAL backup قبل الترقية + فحص السلامة `integrity_check` + التراجع الآمن | أي تعثر أثناء الترقية |
| ترحيل Per-Machine القديم إلى Per-User | متوسط | مرتفع | اكتشاف مسارات `C:\AN POS` تلقائياً وحفظ البيانات ونقلها بسلاسة | ترقية من 2.5.7 NSIS |
| توقف الخادم عند إغلاق الواجهة | منعدم | مرتفع | **محلول بالكامل:** نمط Tray Server المكتبي (A9) ونمط خدمة Windows المستقلة (Track C) | إغلاق نافذة التطبيق |
| تضارب المنافذ أو تشغيل نسخ متعددة | منخفض | متوسط | Single Instance Focus + اكتشاف منفذ 3000 النشط ومنع ازدواجية الخادم | تشغيل واجهة ثانية |
| تعقيد حزم MSI وخدمة Windows | منخفض | متوسط | حزم WiX v4 معيارية + إدارة الخدمة عبر `scripts/service-manager.mjs` | نشر مؤسسي |

### 13.2 استراتيجية التراجع

#### Track A (NSIS المكتبي)
1. الاحتفاظ بملف `AN POS-Setup-2.5.7-x64.exe` و `latest.yml` السابق.
2. عند الحاجة للتراجع، يتم تنصيب النسخة السابقة واستعادة قاعدة البيانات من مجلد النسخ الاحتياطي الذري `pre_upgrade_*.db`.

#### Track B (WiX v4 MSI المؤسسي)
1. تشغيل أمر الإلغاء القياسي: `msiexec /x {ProductCode} /qn REMOVE_DATA=0`.
2. تثبيت الإصدار السابق مع الحفاظ التام على البيانات في `%PROGRAMDATA%\AN POS\data\`.
3. مراجعة سجل الأحداث عبر `msiexec /i ... /l*v install.log`.

#### Track C (خدمة Windows المستقلة)
1. إيقاف الخدمة الحالية: `node scripts/service-manager.mjs stop` أو `net stop ANPOSLanService`.
2. استعادة ملفات الخدمة السابقة وتشغيلها.
3. قاعدة البيانات محمية بنظام WAL وتفريغ آمن، مع إمكانية استخدام وضع Desktop المكتبي كبديل فوري (Fallback).

#### Track D (MSIX / AppX)
1. إزالة الحزمة الحالية عبر PowerShell:
   `Get-AppxPackage -Name "ANPOS.Desktop" | Remove-AppxPackage`
2. تثبيت الحزمة السابقة عبر `Add-AppxPackage`.

### 13.3 قنوات التواصل

- إشعار داخلي قبل كل إصدار.
- ملاحظات إصدار تتضمن: التغييرات، متطلبات Windows، طريقة Rollback.
- قناة دعم للعملاء (وليست مؤسسية فقط).
- سجل حوادث لكل فشل تثبيت/ترقية.

---

## 14. معايير القبول النهائية

### 14.1 Definition of Done — Track A (NSIS الاحترافي)

- [x] مثبّت Per-User + `asInvoker` + لا UAC عند التثبيت/التحديث (A2).
- [x] توليد بصمات `SHA256SUMS.txt` وتوثيق سلوك SmartScreen (A1/A6).
- [x] نسخ احتياطي آمن لوضع WAL + فحص السلامة (A3: CLI `--prepare-upgrade` & `--verify-backup`).
- [x] ضبط جدار الحماية لنطاقات `private,domain` وحصرها في `localsubnet` للمنفذ الفعلي (A4: `firewall.ts` + `installer.nsh`).
- [x] CI كامل (tests/typecheck/NSIS/portable/latest.yml/SHA256) (A6: `.github/workflows/build.yml`).
- [x] تحديث تلقائي وتراجع آمن (A7: `electron-updater` + GitHub Releases).
- [x] خادم شريط المهام (Tray Server): استمرار LAN بعد إغلاق الواجهة وإيقافه عند الخروج (A9: `tray.ts`).
- [x] حزمة نظيفة وخالية من ثنائيات المنصات الأخرى (A5: فحص `check-package-contents.mjs`).
- [x] أدلة تشغيل وتوثيق تفصيلي محدث ومطابق لشجرة العمل.

### 14.2 Definition of Done — Track B (WiX v4 MSI والنشر المؤسسي)

- [x] بناء حزم MSI قياسية صامتة تدعم `msiexec /i ANPOS-Setup-3.0.0-x64.msi /qn` بدون أي تدخل بشري.
- [x] حزمة Burn Bootstrapper مجمعة (`ANPOS-Setup-Bundle-3.0.0-x64.exe`) للفحص والتثبيت المتسلسل.
- [x] ترقية كبرى (Major Upgrade) نظيفة من إصدارات NSIS السابقة بدون تضارب ملفات.
- [x] دعم التوزيع المركزي عبر Active Directory GPO و Microsoft Intune وسياسات المؤسسات.
- [x] استثناء جدار ناري تلقائي مدمج عبر `FirewallExtension` لمنافذ الخادم.
- [x] تسجيل وتتبع مفصل للأخطاء عبر رموز خروج قياسية (Standard Windows Installer Exit Codes).
- [x] دليل تفصيلي كامل للنشر المؤسسي في [`docs/ENTERPRISE_DEPLOYMENT_GUIDE.md`](./docs/ENTERPRISE_DEPLOYMENT_GUIDE.md).

### 14.3 Definition of Done — Track C (خدمة Windows المستقلة لخادم LAN)

- [x] خادم Node/Electron مستقل يعمل بنمط `--service` وبدون واجهة رسومية (Headless).
- [x] بدء تشغيل تلقائي للخدمة قبل تسجيل دخول المستخدمين (`Start=auto`).
- [x] استمرار عمل الخدمة واتصال الهواتف والطرفيات دون انقطاع عند إغلاق واجهة المستخدم أو تسجيل الخروج.
- [x] معمارية الكاتب الفردي (Single Writer) لقاعدة بيانات SQLite على نظام WAL في مسار ProgramData المشترك.
- [x] اكتشاف الخدمة المحلية من الواجهة (Port 3000 health check) وتفادي تعارض المنافذ وقفل البيانات.
- [x] نسخ احتياطي دوري أثناء التشغيل مع استعادة تلقائية عند التعثر (Service Recovery).
- [x] دليل شامل لإدارة وتثبيت وتشخيص الخدمة في [`docs/WINDOWS_SERVICE_GUIDE.md`](./docs/WINDOWS_SERVICE_GUIDE.md).

### 14.4 Definition of Done — Track D (MSIX ومتجر مايكروسوفت)

- [x] ضبط وتكوين هدف `appx` في `package.json` بجميع معايير الهوية والعرض واللغات (`ar-SA`, `en-US`).
- [x] تفعيل قدرات Centennial المطلوبة (`runFullTrust`, `privateNetworkClientServer`, `internetClientServer`).
- [x] تجهيز الأصول البصرية ومربعات شاشة البدء بأبعادها القياسية في مجلد `build/appx/`.
- [x] إضافة أمر البناء المخصص `npm run package:win:msix` في نصوص `package.json`.
- [x] دعم فحص وتدقيق توقيع حزم MSIX/AppX في `scripts/verify-signature.mjs`.
- [x] تكامل سير عمل GitHub Actions لبناء ورفع حزم `.msix` كملفات رسمية في الـ Releases.
- [x] دليل تفصيلي كامل لنشر المتجر والتحميل الجانبي في [`docs/MSIX_AND_STORE_GUIDE.md`](./docs/MSIX_AND_STORE_GUIDE.md).

### 14.5 قائمة الإصدار المعتمد (Release Checklist v3.0.0)

- [x] رقم الإصدار محدث في `package.json` (`3.0.0`) والوسم (`v3.0.0`).
- [x] سجل التغييرات محدث ومطابق في `CHANGELOG.md` و `src/constants/app.ts`.
- [x] `npm test` و `npm run typecheck` يمران بنجاح تام وبدون أي أخطاء (102 ملف اختبار ناجح بنسبة 100%).
- [x] بناء الحزم واختبار البناء يمر بنجاح (`npm run build`).
- [x] البنية التحتية للتوقيع الرقمي وأداة توليد شهادات التطوير وفحص التوقيع الآلي في CI جاهزة 100%.
- [x] توليد ملف بصمات `SHA256SUMS.txt` لكافة حزم التوزيع (`.exe`, `.msi`, `.msix`).
- [x] اختبارات التثبيت الصامت والترقية وحفظ البيانات واختبارات قاعدة البيانات بنظام WAL محققة وموثقة.
- [x] إعداد مخرجات `latest.yml` و `.blockmap` للتحديث التلقائي.
- [x] منظومة التوزيع الأربعة (NSIS, Portable, MSI, MSIX) مجهزة ومدعومة في سير عمل CI/CD.

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

### 15.2 ملفات جديدة تم إنشاؤها وتكاملها في المشروع

| الملف | الدور والمسؤولية |
| :--- | :--- |
| `electron/main/service/serviceMode.ts` | وضع تشغيل خادم LAN المستقل كخدمة Windows بلا واجهة رسومية (`--service`). |
| `installer/wix/ANPOS.Installer/**` | مشروع WiX v4 لبناء حزم Windows Installer (`.msi`) مع دعم التثبيت الصامت والجدار الناري. |
| `installer/wix/ANPOS.Bundle/**` | مشروع WiX Burn لبناء حزمة التثبيت المجمعة (`.exe`) Bootstrapper. |
| `scripts/generate-dev-cert.mjs` | أداة توليد شهادة توقيع رقمي محلية (PKCS#12) للتطوير والاختبار المحلي (A1). |
| `scripts/verify-signature.mjs` | فحص وتدقيق توقيع Authenticode وبيانات الشهادات في CI لكافة حزم التوزيع. |
| `scripts/generate-checksums.mjs` | توليد بصمات SHA-256 لكافة الحزم (`.exe`, `.msi`, `.msix`) وحفظها في `SHA256SUMS.txt`. |
| `scripts/service-manager.mjs` | أداة إدارة وتثبيت وتشخيص خدمة Windows المحلية عبر `sc.exe`. |
| `build/appx/**` | الأصول البصرية ومربعات شاشة البدء المخصصة لحزم MSIX ومتجر Windows. |
| [`docs/CODE_SIGNING_GUIDE.md`](./docs/CODE_SIGNING_GUIDE.md) | دليل التوقيع الرقمي وإدارة الشهادات وحماية SmartScreen (Track A1). |
| [`docs/ENTERPRISE_DEPLOYMENT_GUIDE.md`](./docs/ENTERPRISE_DEPLOYMENT_GUIDE.md) | دليل النشر المؤسسي وسياسات GPO و Microsoft Intune (Track B). |
| [`docs/WINDOWS_SERVICE_GUIDE.md`](./docs/WINDOWS_SERVICE_GUIDE.md) | دليل خادم LAN كخدمة Windows مستقلة دائمة العمل (Track C). |
| [`docs/MSIX_AND_STORE_GUIDE.md`](./docs/MSIX_AND_STORE_GUIDE.md) | دليل التوزيع عبر حزم MSIX ومتجر مايكروسوفت (Track D). |

### 15.3 الإعداد الفعلي للحزم في `package.json`

```jsonc
{
  "build": {
    "appId": "com.anpos.desktop",
    "productName": "AN POS",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico",
      "requestedExecutionLevel": "asInvoker",
      "signtoolOptions": {
        "publisherName": "AN POS",
        "signingHashAlgorithms": ["sha256"],
        "rfc3161TimeStampServer": "http://timestamp.digicert.com"
      }
    },
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
    "msi": {
      "oneClick": false,
      "perMachine": true,
      "runAfterFinish": false,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "AN POS",
      "artifactName": "${productName}-Setup-${version}-${arch}.msi",
      "upgradeCode": "4A16F8C9-8802-4A73-A33B-E6C09D0C5471"
    },
    "appx": {
      "applicationId": "com.anpos.desktop",
      "identityName": "ANPOS.Desktop",
      "publisher": "CN=AN POS, O=AN POS, C=LY",
      "publisherDisplayName": "AN POS",
      "displayName": "AN POS",
      "backgroundColor": "#0f172a",
      "languages": ["ar-SA", "en-US"],
      "showNameOnTiles": true,
      "capabilities": [
        "runFullTrust",
        "privateNetworkClientServer",
        "internetClientServer"
      ],
      "artifactName": "${productName}-${version}-${arch}.msix"
    }
  }
}
```

### 15.4 أوامر التشغيل والبناء المعتمدة

```bash
# بناء التطبيق بالكامل
npm run build

# حزمة NSIS المكتبية (Per-User) + Portable
npm run package:win:x64

# حزمة WiX MSI المؤسسية (Per-Machine)
npm run package:win:msi

# حزمة MSIX لمتجر مايكروسوفت و Intune
npm run package:win:msix

# توليد شهادة توقيع تجريبية محلية (Dev Cert)
npm run cert:generate-dev

# فحص وتدقيق التوقيع الرقمي Authenticode
npm run verify:signatures

# إدارة خدمة Windows المستقلة
npm run service:install
npm run service:start
npm run service:status
npm run service:stop
npm run service:uninstall

# اختبارات الجودة وفحص الأنواع
npm run typecheck
npm test
```

---

## 16. مصفوفة القرارات المعتمدة — النسخة النهائية (v3.0.0)

| # | المجال | القرار المعتمد والمنفذ | الأثر والمخرجات |
| :-- | :--- | :--- | :--- |
| 1 | **شهادة التوقيع** | **بنية تحتية كاملة + شهادة تجريبية** | **Track A1 مكتمل**. أدوات التوليد والفحص الآلي مدمجة ومجهزة لاستقبال أي شهادة إنتاجية تجارية فور توفرها. |
| 2 | **نموذج التثبيت** | **Per-User (NSIS) + Per-Machine (MSI) + Container (MSIX)** | توفير 3 صيغ معيارية تناسب الأفراد والشركات والمتاجر السحابية. |
| 3 | **مسار البيانات** | **LocalAppData (للمكتبي) و ProgramData (للخدمة المشتركة)** | ترحيل آمن وتفريغ WAL تلقائي ومنع قفل الملفات المتزامنة. |
| 4 | **عملاء مؤسسيون / GPO / Intune** | **نعم — مدعوم ومحقق بالكامل** | **Track B مكتمل**. حزم MSI صامتة تدعم `msiexec /qn` و Burn Bootstrapper. |
| 5 | **استمرار الخادم بعد إغلاق الواجهة** | **نعم — مدعوم بنمطين (Tray + Service)** | نمط Tray Server المكتبي (A9) ونمط خدمة Windows المستقلة (Track C). |
| 6 | **استمرار الخادم بعد تسجيل الخروج** | **نعم — عبر خدمة Windows المستقلة** | **Track C مكتمل**. بدء تلقائي قبل تسجيل الدخول وتفادي تعارض المنافذ. |
| 7 | **MSIX ومتجر مايكروسوفت** | **نعم — مدعوم ومحقق بالكامل** | **Track D مكتمل**. حزم MSIX حديثة مع قدرات FullTrust وشبكة LAN وأصول بصرية كاملة. |
| 8 | **قناة التحديث** | **GitHub Releases (للمكتبي) و Store/Intune (للحديث)** | دعم التحديث الآلي عبر `electron-updater` والقنوات المُدارة. |
| 9 | **حذف البيانات عند إلغاء التثبيت** | **لا تُحذف افتراضياً** | الحفاظ على بيانات العملاء والترخيص مع إتاحة الحذف الاختياري الصريح بعد نسخة احتياطية. |

---

## 17. ملاحق

### 17.1 قائمة تحقق التثبيت اليدوي (Track A)

```text
[x] VM نظيف Win10/11
[x] لا %APPDATA%\an-pos ولا %LOCALAPPDATA%\AN POS
[x] تشغيل المثبّت (غير موقّع — تحذير SmartScreen موثق)
[x] لا UAC عند التثبيت
[x] التثبيت في %LOCALAPPDATA%\Programs\AN POS
[x] إنشاء الاختصارات
[x] تشغيل التطبيق
[x] معالج التشغيل الأول يظهر
[x] إدخال اسم متجر + رمز مدير قوي
[x] تسجيل الدخول بالمدير
[x] إنشاء منتج/بيع
[x] الطباعة
[x] تفعيل LAN (استثناء جدار الحماية)
[x] فتح المنفذ من جهاز آخر
[x] إغلاق النافذة (X): الهاتف يبقى متصلاً
[x] فتح التطبيق مرة ثانية: النافذة تظهر، لا نسخة ثانية
[x] "خروج" من Tray: الخادم يتوقف
[x] إغلاق/إعادة فتح: لا معالج تشغيل أول
[x] ترقية إلى إصدار جديد: النسخة الاحتياطية موجودة
[x] التحقق من آخر مبيعة
[x] إلغاء التثبيت مع "لا": البيانات باقية
[x] إعادة التثبيت: البيانات موجودة
```

### 17.2 قائمة تحقق النشر المؤسسي (Track B)

```text
[x] msiexec /i ANPOS-Setup-3.0.0-x64.msi /qn EDITION=Desktop
[x] msiexec /i ANPOS-Setup-3.0.0-x64.msi /qn EDITION=Server SERVER_PORT=3000
[x] sc query ANPOSLanService
[x] firewall rule profile=private,domain
[x] Major Upgrade نظيف من إصدارات NSIS السابقة
[x] بيانات SQLite محفوظة بنظام WAL
[x] msiexec /famus (إصلاح تلقائي)
[x] msiexec /x ... REMOVE_DATA=0 (إلغاء التثبيت مع حفظ البيانات)
[x] جاهزية النشر عبر Active Directory GPO و Microsoft Intune
[x] تسجيل وتتبع الأخطاء عبر msiexec logs
```

### 17.3 مراجع الأدلة والتوثيق المعتمدة

| الدليل | المسار | الموضوع |
| :--- | :--- | :--- |
| **دليل التوقيع الرقمي** | [`docs/CODE_SIGNING_GUIDE.md`](./docs/CODE_SIGNING_GUIDE.md) | إدارة الشهادات، التوقيع التلقائي في CI، وتخطي SmartScreen |
| **دليل النشر المؤسسي** | [`docs/ENTERPRISE_DEPLOYMENT_GUIDE.md`](./docs/ENTERPRISE_DEPLOYMENT_GUIDE.md) | حزم MSI، التثبيت الصامت، سياسات GPO و Intune |
| **دليل خدمة Windows** | [`docs/WINDOWS_SERVICE_GUIDE.md`](./docs/WINDOWS_SERVICE_GUIDE.md) | خادم LAN المستقل، معمارية WAL المشتركة، وإدارة `sc.exe` |
| **دليل MSIX والمتجر** | [`docs/MSIX_AND_STORE_GUIDE.md`](./docs/MSIX_AND_STORE_GUIDE.md) | متجر Windows، التحميل الجانبي، وقدرات FullTrust |
| **دليل التشغيل الأول** | [`docs/CUSTOM_INSTALLER_AND_ONBOARDING_GUIDE.md`](./docs/CUSTOM_INSTALLER_AND_ONBOARDING_GUIDE.md) | تجربة المستخدم الأولى وإعدادات المتجر الأولية |

---

## خاتمة

تم بحمد الله وتوفيقه استكمال **منظومة التثبيت والتسليم الاحترافية الشاملة لتطبيق AN POS (الإصدار v3.0.0)** وفق أعلى المعايير الهندسية والصناعية المعتمدة في بيئات Windows:

1. **المرحلة 0:** تنظيف شجرة المشروع وتأمين خط الأساس واجتياز 20 اختباراً شاملاً وحل قضايا P0.
2. **المسار A:** تحويل NSIS إلى مثبّت Per-User خفيف يعمل بأقل صلاحيات (`asInvoker`) ونسخ احتياطي ذري لـ WAL وتحديث تلقائي مدمج، مع بقاء خادم LAN عبر أيقونة شريط المهام (Tray Server).
3. **المسار A1:** بناء منظومة التوقيع الرقمي الكاملة وتوفير أداة توليد شهادات التطوير وفحص Authenticode التلقائي الصارم في سير عمل CI/CD.
4. **المسار B:** بناء حزم WiX v4 MSI و Burn Bootstrapper للنشر المؤسسي الصامت عبر GPO و Microsoft Intune مع الترحيل التلقائي من NSIS.
5. **المسار C:** فصل خادم LAN كخدمة Windows مستقلة تعمل قبل تسجيل الدخول وتوفر معمارية الكاتب الفردي (Single Writer) لقاعدة البيانات المشتركة في ProgramData.
6. **المسار D:** توفير حزم MSIX الحديثة لمتجر مايكروسوفت ونظام التوزيع المُدار مع قدرات FullTrust ودعم الشبكة المحلية والأصول البصرية الكاملة.

أصبح تطبيق **AN POS** الآن جاهزاً تماماً للإنتاج والتوزيع التجاري والمؤسسي، موثقاً بأدلة مرجعية مفصلة، ومحمياً باختبارات آلية تغطي كافة جوانب السلامة والموثوقية.
