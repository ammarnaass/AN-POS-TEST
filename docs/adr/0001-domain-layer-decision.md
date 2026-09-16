# ADR 0001: قرار هيكلية طبقات Domain و Application و Infrastructure

* **الحالة:** مقترح (Proposed)
* **التاريخ:** 2026-09-16
* **المؤلف:** Antigravity / Pair Programming
* **السياق:** تقييم المعمارية وتنظيم المجلدات الثلاثة (`src/domain/`، `src/application/`، `src/infrastructure/`) وتحديد ما إذا كان يجب دمجها في `src/features/pos/` وحذفها، أو الإبقاء عليها.

---

## 1. الفحص الفعلي لمحتويات المجلدات الثلاثة والمستخدمين

تم فحص شجرة الملفات الحقيقية والبحث التراكمي (Grep) عن جميع الاستيرادات (`import`) من هذه المسارات في كامل مجلد `src/`:

### أ. مجلد `src/domain/`
* **الملفات الموجودة فعلياً:**
  1. [`src/domain/services/SaleCalculator.ts`](file:///home/ammar/AN-POS-TEST/src/domain/services/SaleCalculator.ts)
* **الاستخدام الفعلي في المشروع:**
  - يتم استيراده في **ملف واحد فقط**: [`src/application/useCases/CreateSale.ts`](file:///home/ammar/AN-POS-TEST/src/application/useCases/CreateSale.ts) (السطر 4).
  - لا يُستخدم إطلاقاً في أي واجهة مستخدم (UI)، ولا في أي ميزة (Feature)، ولا حتى في `useSaleCompletion.ts` (الذي يستورد `calculateSaleTotal` من `@/services`).

---

### ب. مجلد `src/application/`
* **الملفات الموجودة فعلياً:**
  1. [`src/application/useCases/CreateSale.ts`](file:///home/ammar/AN-POS-TEST/src/application/useCases/CreateSale.ts)
* **الاستخدام الفعلي في المشروع:**
  - **صفر استيراد (0 imports)** في كامل الكود المصدري للمشروع.
  - هذا الملف عبارة عن كود غير مستخدم (Dead/Orphaned Code)؛ حيث تعتمد شاشة البيع فعلياً على الخطاف [`src/features/pos/hooks/useSaleCompletion.ts`](file:///home/ammar/AN-POS-TEST/src/features/pos/hooks/useSaleCompletion.ts).

---

### ج. مجلد `src/infrastructure/`
* **الملفات الموجودة فعلياً:**
  1. [`src/infrastructure/database/dexie/db.ts`](file:///home/ammar/AN-POS-TEST/src/infrastructure/database/dexie/db.ts) (قاعدة بيانات Dexie IndexedDB المركزية للواجهة).
  2. [`src/infrastructure/database/repositories/ProductBarcodeRepository.ts`](file:///home/ammar/AN-POS-TEST/src/infrastructure/database/repositories/ProductBarcodeRepository.ts)
  3. [`src/infrastructure/database/repositories/SaleRepository.ts`](file:///home/ammar/AN-POS-TEST/src/infrastructure/database/repositories/SaleRepository.ts)
  4. [`src/infrastructure/database/repositories/__tests__/ProductBarcodeRepository.test.ts`](file:///home/ammar/AN-POS-TEST/src/infrastructure/database/repositories/__tests__/ProductBarcodeRepository.test.ts)

* **الاستخدام الفعلي في المشروع:**
  - **مستخدم بشكل واسع جداً وجوهري عبر أكثر من 10 ميزات (Features) وخدمات عامة** بأكثر من **130 موضع استيراد**:
    - **`src/infrastructure/database/dexie/db.ts`**:
      - `src/lib/syncBridge.ts` (جسر المزامنة الحي بين SQLite و Dexie).
      - `src/features/packs/` (PacksPage, usePackMutations, usePackQueries, packBarcodeService, PackFormModal).
      - `src/features/barcode/` (useBarcodeLabelsData, useBarcodeLabelFilters, searchByBarcode, generateBarcode).
      - `src/features/print/` (templateService, printService, printerService, printQueueService, PrintTemplatesPage).
      - `src/features/pos/` (useSaleCompletion, useProductSearch, POSPage, QuickPOS).
      - `src/features/sales/` (SalesPage, SaleDetails).
      - `src/features/inventory/` (InventoryPage).
      - `src/features/customers/` (CustomersPage).
      - `src/features/suppliers/` (SuppliersPage, SupplierInvoicePdfModal).
      - `src/features/settings/` (إعدادات المتجر، النسخ الاحتياطي).
      - `src/pages/dashboard/` (DashboardPage, ProfitCenterTab, ZakatCalculatorTab).
    - **`src/infrastructure/database/repositories/ProductBarcodeRepository.ts`**:
      - مستخدم في ميزة الباركود [`src/features/barcode/`](file:///home/ammar/AN-POS-TEST/src/features/barcode/) وخدمات الباركود العامة [`src/services/barcode/`](file:///home/ammar/AN-POS-TEST/src/services/barcode/).
    - **`src/infrastructure/database/repositories/SaleRepository.ts`**:
      - مستخدم في [`src/features/pos/hooks/useSaleCompletion.ts`](file:///home/ammar/AN-POS-TEST/src/features/pos/hooks/useSaleCompletion.ts) لتوليد أرقام الفواتير المتسلسلة `getNextNumber`.

---

## 2. دراسة الخيارين المطروحين

### الخيار (أ): دمج هذه الملفات داخل `src/features/pos/` وحذف المجلدات الثلاثة
* **التقييم الفني:**
  - دمج `src/domain/` و `src/application/` داخل `pos` ممكن نظرياً لأنهما خاصان بالمبيعات فقط (مع العلم أن `CreateSale.ts` غير مستخدم أصلاً).
  - **لكن دمج `src/infrastructure/` (وخاصة `db.ts` و `ProductBarcodeRepository.ts`) داخل `src/features/pos/` يُعد خطأ معمارياً فادحاً (Architectural Inverted Dependency)**:
    - سيجعل كافة الميزات الأخرى (الطباعة Print، الباقات Packs، الموردين Suppliers، العملاء Customers، إعدادات المتجر Settings، لوحة المؤشرات Dashboard، إلخ) تستورد قاعدة البيانات من داخل مجلد ميزة الـ `pos`!
    - هذا يكسر مبدأ استقلالية الميزات (Feature-based Modular Architecture) ويخلق اعتمادية دائرية وتشابكاً ضاراً.

### الخيار (ب): الإبقاء عليها كما هي نظراً لأن أكثر من ميزة تستخدمها فعلياً
* **التقييم الفني:**
  - **متحقق بالكامل وبأدلة قاطعة مثبتة عبر الكود**: مجلد `src/infrastructure/` ليس خاصاً بنقطة البيع (POS)، بل هو بنية تحتية مشتركة لكامل النظام (Cross-Cutting Infrastructure) وتعتمد عليه جميع ميزات النظام بلا استثناء.

---

## 3. التوصية المعمارية الحاسمة (Recommendation)

بناءً على نتائج الفحص الفعلي للاستيرادات في الكود:

> **التوصية: اعتماد الخيار (ب) — الإبقاء على الطبقات كما هي وعدم نقلها إلى `src/features/pos/`.**

### التعليل الواقعي والمباشر:
1. **قاعدة البيانات (`db.ts`) بنية تحتية عامة:** مجلد `src/infrastructure/` يضم محرك Dexie ومستودعات الباركود، وتستخدمه أكثر من 10 ميزات و130 ملفاً عبر كامل المشروع. نقله إلى `src/features/pos/` سيحول ميزة الـ POS إلى مستودع مركزي إجباري لباقي أجزاء التطبيق المستقلة.
2. **استقلالية الميزات:** الإبقاء على `src/infrastructure/` يحافظ على معمارية نظيفة تضمن استقلال ميزات مثل الطباعة والمخزون والباقات عن ميزة نقطة البيع.
3. **ملاحظة ملحقة لقرار لاحق (Future Refinement):**
   - بخصوص الملفين `src/application/useCases/CreateSale.ts` و `src/domain/services/SaleCalculator.ts`، تبيّن أنهما لا يُستخدمان في الواجهة الحالية (Dead Code). في حال رغبت الإدارة الهندسية في تنظيفهما مستقبلاً، يمكن حذفهما بشكل منفصل دون المساس بـ `src/infrastructure/`.
