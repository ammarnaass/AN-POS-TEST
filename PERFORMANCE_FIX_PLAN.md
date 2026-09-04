# خطة الحل المتكاملة لتحسين وتسريع أداء نظام AN POS

تهدف هذه الخطة إلى القضاء التام على أسباب البطء وتجميد الواجهة (UI Freezing) واستهلاك الذاكرة والمعالج في تطبيق **AN POS**، من خلال معالجة المشاكل الجذرية على مستوى محرك Electron، وقاعدة بيانات SQLite، وقنوات IPC، وإدارة حالة وتصيير React.

---

## 1. ملخص القرارات والتغييرات الجوهرية (User Review Required)

> [!IMPORTANT]
> **تفعيل تسريع الرسوميات (GPU Acceleration):**
> تم في مرحلة سابقة إضافة أوامر صريحة لتعطيل تسريع العتاد بالكامل (`app.disableHardwareAcceleration()` و `disable-gpu`). سنقوم بإلغاء هذا التعطيل ليتم تفعيل GPU تلقائياً على أنظمة التشغيل العادية (Windows, macOS, Linux desktop)، مع الإبقاء على خيار التعطيل فقط عند تمرير متغير بيئي صريح (مثل `HEADLESS=true` أو بيئات CI/VNC بدون كرت شاشة).

> [!WARNING]
> **إلغاء التحديث الدوري التلقائي (Aggressive Polling) واستبداله بالأحداث:**
> سيتم إيقاف `refetchInterval: 3000` في شاشات المخزن والفواتير، والاعتماد بالكامل على حدث الـ IPC المتوفر مسبقاً (`db:table-updated`). أي تعديل في قاعدة البيانات سينعكس فورياً في الواجهة دون الحاجة لإعادة جلب الجداول كل 3 ثوانٍ.

---

## 2. مراحل التنفيذ التفصيلية (Proposed Changes)

---

### المرحلة 1: معمارية محرك Electron ومحرك SQLite

تسريع محرك العرض الرسومي ومضاعفة سرعة قراءة وكتابة قاعدة البيانات المحلية.

#### [MODIFY] [electron/main/index.ts](file:///home/ammar/AN-POS-TEST/electron/main/index.ts)
* إزالة أوامر التعطيل القسري لكرت الشاشة (`disable-gpu`, `disable-software-rasterizer`, `disable-gpu-compositing`, `app.disableHardwareAcceleration()`).
* وضع شرط لتشغيل التعطيل فقط عند الضرورة القصوى في بيئات الـ headless:
  ```typescript
  if (process.env.HEADLESS === 'true' || process.env.DISABLE_GPU === 'true') {
    app.disableHardwareAcceleration();
  }
  ```

#### [MODIFY] [electron/main/database.ts](file:///home/ammar/AN-POS-TEST/electron/main/database.ts)
* تفعيل حزمة الـ PRAGMAs الخاصة بالأداء العالي في SQLite:
  * `PRAGMA synchronous = NORMAL;` (يضاعف سرعة المعاملات 10x-20x مع بقائه آمناً في وضع WAL).
  * `PRAGMA cache_size = -64000;` (تخصيص 64MB لذاكرة الكاش الفوري بدلاً من 2MB).
  * `PRAGMA temp_store = MEMORY;` (الفرز وجداول الدمج المؤقتة في الرام).
  * `PRAGMA mmap_size = 268435456;` (استخدام 256MB للـ Memory-Mapped I/O لقراءة فائقة السرعة).

#### [MODIFY] [electron/main/handlers/db-utils.ts](file:///home/ammar/AN-POS-TEST/electron/main/handlers/db-utils.ts)
* إنشاء كاش للاستعلامات المجهزة (`Statement Cache` عبر `Map<string, StatementSync>`):
  * منع إعادة عمل `db.prepare(sql)` لكل استعلام متكرر في التطبيق، واسترجاع الـ Statement الجاهزة فوراً.

---

### المرحلة 2: إصلاح قنوات الـ IPC ومحاكي قاعدة البيانات (Database Shim)

القضاء على مشكلة نقل كامل بيانات الجداول (Full Table Transfer) إلى الواجهة.

#### [MODIFY] [electron/main/handlers/crud.ts](file:///home/ammar/AN-POS-TEST/electron/main/handlers/crud.ts)
* إضافة دالة `countRows(table, filter)` لتنفيذ `SELECT COUNT(*) FROM table` في SQLite مباشرة.
* دعم الفلترة الدقيقة `filterFields` في `listRows` (مثل البحث عن باركود أو تصنيف محدد بـ `LIMIT 1`).
* إضافة دعم `clearTable(table)` لتنفيذ `DELETE FROM table;` بطلب واحد.

#### [MODIFY] [electron/main/ipc/crud.ts](file:///home/ammar/AN-POS-TEST/electron/main/ipc/crud.ts) & [electron/preload/index.ts](file:///home/ammar/AN-POS-TEST/electron/preload/index.ts)
* تسجيل قنوات IPC جديدة:
  * `db:count` لحساب عدد السجلات في SQLite فوراً.
  * `db:clear` لتفريغ جدول دفعة واحدة.
  * تمرير معايير الفلترة المباشرة `opts.filter` في `db:list`.

#### [MODIFY] [src/lib/db.ts](file:///home/ammar/AN-POS-TEST/src/lib/db.ts)
* **إصلاح `count()`**: استدعاء قناة `db:count` في الباك إند بدلاً من جلب كامل الجدول وقراءة `data.length`.
* **إصلاح `where().equals()`**:
  * استدعاء استعلام محدد `api.list(table, { filter: { [field]: value }, limit: 1 })` ليتم البحث عبر فهرس SQLite في الباك إند ويعود بصف واحد فقط، بدلاً من جلب 10,000 منتج ثم عمل `.find()` في JS.
* **إصلاح `orderBy().reverse().limit(n)`**:
  * تمرير `limit` و `order` مباشرة لقاعدة البيانات ليقوم المحرك بالترتيب والقطع بدلاً من جلب كل السجلات وفرزها في المتصفح.
* **إصلاح `clear()`**: استدعاء `db:clear` لتفريغ الجدول فوراً في معاملة واحدة بدلاً من إرسال آلاف الطلبات المتتالية.
* **تسريع `toCamel` و `toSnake`**: استخدام كاش للمفاتيح المترجمة (Key Mapping Cache) لتفادي تشغيل Regular Expressions ملايين المرات على كائنات النتائج.

---

### المرحلة 3: شاشة الكاشير والمبيعات (POS Layout & Barcode Scanning)

القضاء على تجميد شاشة الكاشير وتسريع الاستجابة للباركود.

#### [MODIFY] [src/features/pos/components/ClassicPOSLayout.tsx](file:///home/ammar/AN-POS-TEST/src/features/pos/components/ClassicPOSLayout.tsx)
* **عزل الساعة (Clock Extraction)**: استخراج مؤقت الساعة `currentTime` في مكون فرعي مستقل معزول `<POSLiveClock />`، مما يمنع إعادة تصيير الشاشة الرئيسية والسلة وأزرار المنتجات كل ثانية.
* **تأمين الفلترة عبر `useMemo`**: وضع `filteredProducts` و `totalItemsCount` داخل `useMemo` لحسابها فقط عند تغير المدخلات أو التصنيف.
* **تحسين جدول السلة**: إلغاء عملية البحث الخطية `products.find(...)` داخل حلقة رسم كل عنصر سلة، واستخدام خريطة سريعة `Map<string, Product>` أو حفظ الباركود في عنصر السلة مباشرة.
* **الحد من عدد أزرار السلع السريعة**: عرض أول 40-50 منتجاً فقط في الشبكة السفلية بدلاً من رسم 2000 زر دفعة واحدة، مع إمكانية التمرير أو التنقل السريع.

#### [MODIFY] [src/services/barcode/parseAndAddScannedCode.ts](file:///home/ammar/AN-POS-TEST/src/services/barcode/parseAndAddScannedCode.ts)
* الفحص أولاً في مصفوفة المنتجات الموجودة بالفعل في الذاكرة `ctx.products` (استجابة فورية 0ms).
* في حال عدم العثور عليها، يتم استدعاء الاستعلام المفهرس السريع بطلب صف واحد عبر الباركود بدلاً من إعادة جلب قاعدة البيانات.

---

### المرحلة 4: تحسين دورة الدفع وحساب رقم الفاتورة (Checkout Flow)

إنهاء التجميد الذي يحدث لمدة 2-4 ثوانٍ عند نقر "إتمام البيع".

#### [MODIFY] [src/infrastructure/database/repositories/SaleRepository.ts](file:///home/ammar/AN-POS-TEST/src/infrastructure/database/repositories/SaleRepository.ts)
* **إصلاح `getNextNumber`**:
  * استبدال تحميل كل المبيعات التاريخية `db.sales.toArray()` باستعلام مباشر يجلب آخر رقم فاتورة في أجزاء من الملي ثانية:
    ```typescript
    const lastSale = await window.electronAPI.sales.list({ limit: 1, search: cleanPrefix });
    ```

#### [MODIFY] [src/features/pos/hooks/useSaleCompletion.ts](file:///home/ammar/AN-POS-TEST/src/features/pos/hooks/useSaleCompletion.ts)
* استبدال الـ 30-50 استدعاء IPC المتتالي بطلب واحد موحد إلى معالج الباك إند:
  ```typescript
  await window.electronAPI.sales.create(payload);
  ```
* معالج الباك إند (`electron/main/handlers/sales.ts`) يمتلك بالفعل دالة ذرية `transaction(() => { ... })` تقوم بإدراج الفاتورة، وحفظ البنود، وتحديث كميات المخزون، ورصيد العميل، والصندوق في **معاملة SQLite واحدة وسريعة جداً (<50ms)**.

---

### المرحلة 5: إيقاف الـ Polling العنيف وتفعيل التحديث المبني على الأحداث

#### [MODIFY] [src/features/inventory/InventoryPage.tsx](file:///home/ammar/AN-POS-TEST/src/features/inventory/InventoryPage.tsx)
* حذف `refetchInterval: 3000`.
* ربط الاستماع بحدث `db:table-updated` لتحديث المنتجات فقط عند حدوث إضافة/تعديل/حذف فعلي.

#### [MODIFY] [src/features/sales/InvoicesTab.tsx](file:///home/ammar/AN-POS-TEST/src/features/sales/InvoicesTab.tsx)
* حذف `refetchInterval: 3000`.
* ربط الاستماع بحدث `db:table-updated` لتحديث المبيعات عند تسجيل فاتورة جديدة فقط.

#### [MODIFY] [src/components/layout/Sidebar.tsx](file:///home/ammar/AN-POS-TEST/src/components/layout/Sidebar.tsx)
* حذف `refetchInterval: 5000` لإعدادات المتجر واستبدالها بالتحديث عند الطلب.

---

## 3. خطة التحقق والضمانات (Verification Plan)

### الاختبارات الآلية (Automated Tests)
* تشغيل اختبارات النظام والتحقق من سلامة الأنواع وعدم وجود أخطاء في الـ Build:
  ```bash
  npm run typecheck
  npm run lint
  npm run test
  ```

### التحقق اليدوي والميداني (Manual Verification)
1. **اختبار سلاسة الواجهة (Frame Rate & Responsiveness):**
   * فتح شاشة الكاشير وملاحظة عمل الساعة والتحريك، والتأكد من ثبات معدل الإطارات عند 60 FPS دون استهلاك غير مبرر للمعالج.
2. **اختبار سرعة الباركود والبحث:**
   * مسح عدة باركودات بسرعة والتحقق من ظهورها الفوري في السلة دون أي تأخير.
3. **اختبار سرعة إتمام البيع (Checkout Speed):**
   * إنشاء فاتورة تحتوي 10 مواد، والنقر على "إتمام البيع"، والتأكد من إغلاق النافذة وطباعة الفاتورة في أقل من 100ms.
4. **اختبار التحديث الفوري للأحداث:**
   * تعديل كمية منتج في المخزن والتأكد من انعكاسه فوراً في شاشة الكاشير دون الحاجة للـ polling.
