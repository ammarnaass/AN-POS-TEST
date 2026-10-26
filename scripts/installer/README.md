# محرك التثبيت الذري والتعافي التلقائي لـ AN POS
**مواصفة وتطبيق المعمارية فائقة الاعتمادية (Zero-Touch & Self-Healing Installer)**

هذا الدليل يشرح كيفية عمل واستخدام الكود والسكريبتات التنفيذية التي تم بناؤها استناداً إلى وثيقة [APPLICATION_INSTALLATION_SYSTEM_SPEC.md](../../APPLICATION_INSTALLATION_SYSTEM_SPEC.md).

---

## 📁 هيكلية الملفات المضافة

| المسار | الوظيفة التقنية |
| :--- | :--- |
| [`scripts/installer/slot-manager.ps1`](./slot-manager.ps1) | محرك إدارة الفتحات المزدوجة A/B والتبديل الذري عبر Junction Link بأقل من 15ms |
| [`scripts/installer/install-cold.ps1`](./install-cold.ps1) | معالج التثبيت الذري الأولي الصامت في مساحة المستخدم (`%LOCALAPPDATA%`) بنقرة واحدة |
| [`scripts/installer/install.bat`](./install.bat) | مشغل باتش مباشر للمستخدم النهائي بنقرتين دون الحاجة لكتابة أوامر أو طلب صلاحيات UAC |
| [`electron/main/installer/slotManager.ts`](../../electron/main/installer/slotManager.ts) | وحدة إدارة الفتحات المدمجة داخل بيئة Electron لتنفيذ الـ Swap والـ Rollback برمجياً |
| [`electron/main/installer/bootWatchdog.ts`](../../electron/main/installer/bootWatchdog.ts) | مراقب الإقلاع الذاتي (Canary Watchdog) لحماية أول 5 ثوانٍ وإجراء التراجع الفوري عند الكراش |

---

## 🛠️ كيف تعمل المنظومة عملياً؟

### 1. التثبيت الأولي (Cold Install)
- يقوم المستخدم بالنقر المزدوج على `install.bat`.
- ينشئ السكريبت مجلدات `SystemVault` و `DataVault`.
- يتم استخراج الحزمة إلى الفتحة الخاملة (`slot_a`).
- يتم التحقق من مطابقة بصمة الملفات SHA-256.
- يتم إنشاء رابط تشعبي ذري:
  ```cmd
  %LOCALAPPDATA%\Programs\AN POS\SystemVault\current  --->  ...\slot_a
  ```
- يتم إنشاء اختصارات سطح المكتب وقائمة ابدأ المشيرة إلى `current\AN POS.exe`.
- يفتح التطبيق فوراً دون إعادة تشغيل أو أسئلة للمستخدم.

---

### 2. التبديل الذري (Atomic Swap) أثناء التحديث
عند وصول تحديث جديد:
1. يقوم التطبيق بفك وتجهيز ملفات الإصدار الجديد داخل الفتحة الخاملة `slot_b` في الخلفية ودون قفل الملفات النشطة.
2. عند التبديل، يتم تنفيذ أمر التحويل الذري في جزء من الثانية:
   ```powershell
   Switch-ActiveSlot -TargetSlot "slot_b"
   ```
3. يوجه الرابط `current` فوراً إلى `slot_b`.

---

### 3. مراقب الإقلاع الذاتي والتراجع التلقائي (Canary Watchdog & Auto-Rollback)
- عند تشغيل الإصدار الجديد، يفعّل ملف [`bootWatchdog.ts`](../../electron/main/installer/bootWatchdog.ts) مؤقتاً لمدة 5000 ميلي ثانية.
- يقوم المراقب بالتحقق من:
  1. سلامة واستجابة قاعدة البيانات (`SELECT 1 as ping`).
  2. اكتمال تحميل واجهة المستخدم الرسومية (`did-finish-load`).
  3. خلو العملية من أي استثناءات غير معالجة (`uncaughtException`).
- **في حال حدوث كراش أو خطأ قاتل خلال الـ 5 ثوانٍ:**
  - يتم استدعاء `rollbackSlot()`.
  - يُعاد الرابط `current` فوراً إلى الفتحة السابقة المستقرة `slot_a`.
  - يُسجل الخطأ في `DataVault\logs\rollback.log`.
  - يُعاد تشغيل النسخة المستقرة فوراً مع إغلاق العملية المنهارة.
- **في حال نجاح الإقلاع:**
  - يتم تصنيف النسخة كـ `HEALTHY` في `status_slot.json` ويُعطّل المراقب بأمان.
