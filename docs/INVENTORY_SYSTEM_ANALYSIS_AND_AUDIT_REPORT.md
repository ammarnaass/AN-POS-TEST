# تقرير هندسي شامل: تدقيق وتحليل منظومة المخزن والمنتجات في AN POS

> **تاريخ التقرير:** 17 سبتمبر 2026  
> **نطاق التدقيق:** منظومة المخازن، حركات المخزون، عمليات الإضافة والتعديل، جداول المنتجات، ونظام الإشعارات  
> **البيئة التقنية:** Electron + React 19 + TypeScript + SQLite (Node Native / better-sqlite3) + TanStack Query + Zustand  
> **المكونات المفحوصة:**  
> - واجهات المخزن: [`InventoryPage.tsx`](file:///home/ammar/AN-POS-TEST/src/features/inventory/InventoryPage.tsx)، [`ProductFormPage.tsx`](file:///home/ammar/AN-POS-TEST/src/features/products/ProductFormPage.tsx)، [`ProductFormModal.tsx`](file:///home/ammar/AN-POS-TEST/src/features/inventory/components/modals/ProductFormModal.tsx)  
> - خطافات الحالة والبيانات: [`useInventoryData.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/hooks/useInventoryData.ts)، [`useProductFormState.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/hooks/useProductFormState.ts)، [`useInventoryFilter.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/hooks/useInventoryFilter.ts)  
> - طبقة الوساطة والمزامنة: [`src/lib/db.ts`](file:///home/ammar/AN-POS-TEST/src/lib/db.ts)، [`src/lib/products-sync.ts`](file:///home/ammar/AN-POS-TEST/src/lib/products-sync.ts)  
> - معالجات خلفية Electron: [`handlers/products.ts`](file:///home/ammar/AN-POS-TEST/electron/main/handlers/products.ts)، [`handlers/crud.ts`](file:///home/ammar/AN-POS-TEST/electron/main/handlers/crud.ts)  
> - مخططات قواعد البيانات: [`shared/schema/index.ts`](file:///home/ammar/AN-POS-TEST/shared/schema/index.ts)  
> - نظام التنبيهات: [`notificationStore.ts`](file:///home/ammar/AN-POS-TEST/src/store/notificationStore.ts)  

---

## 1. الملخص التنفيذي (Executive Summary)

تم إجراء تدقيق برمجي ومعماري شامل ومعمق لمنظومة المخزن والمنتجات في نظام **AN POS** للإجابة على التساؤلات التشغيلية حول سلامة:
1. **عملية الإضافة (Product Creation & Batch Import)**
2. **عملية التحديث (Product Updates & Stock Adjustment)**
3. **الوظائف والعمليات المخزنية (Warehouse Operations & Movements)**
4. **نظام الإشعارات والتنبيهات (Notifications & Alerting Engine)**
5. **جداول ومخططات المنتجات (Database Schemas & Data Integrity)**

### خلاصة التقييم العام:
| المحور المفحوص | الحالة العامة | أبرز المشاكل المرصودة | درجة الخطورة |
|---|---|---|---|
| **1. عملية الإضافة** | ⚠️ يحوي خللاً معمارياً | ازدواجية الكتابة عبر IPC (`db.products.add` + `syncProductCreate`) مما يسبب خطأ 409 كاذب، وغياب توليد الباركود التلقائي | **عالية (High)** |
| **2. عملية التحديث** | ⚠️ يحوي ثغرة تدقيقية | التعديل السريع للكميات لا يسجل حركة مخزنية، وازدواجية استدعاءات التحديث عبر IPC | **عالية (High)** |
| **3. وظائف المخزن** | ⚠️ تشتت وظيفي | انفصال مستودعات الحركات والجرد (`movementRepo`, `countRepo`) عن شاشة المخزن الرئيسية، وازدواجية جدولي الحركات | **متوسطة (Medium)** |
| **4. نظام الإشعارات** | ❌ شبه معطل في المخزن | غياب تام لإشعارات النجاح/الفشل لعمليات الـ CRUD والاستيراد، وانفصال تنبيهات انخفاض المخزون عن `useNotificationStore` | **عالية (High)** |
| **5. جداول ومخططات المنتجات** | ⚠️ يحتاج لترشيد وتوحيد | تشتت مسميات الأعمدة التكلفة/البيع بين snake و camel، وغياب قيود المفاتيح الأجنبية للفئات | **متوسطة (Medium)** |

---

## 2. المحور الأول: تحليل عملية الإضافة (Product Addition Analysis)

### 2.1. ثغرة الكتابة المزدوجة الزائدة (The Redundant Dual-Write IPC Bug)
عند إضافة منتج جديد في [`useInventoryData.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/hooks/useInventoryData.ts#L74-L88) أو [`ProductFormPage.tsx`](file:///home/ammar/AN-POS-TEST/src/features/products/ProductFormPage.tsx#L147-L151)، يتم تنفيذ الكود التالي:

```typescript
// في useInventoryData.ts:
const addMutation = useMutation({
  mutationFn: async (data: Omit<Product, 'id'>) => {
    const newProduct = {
      id: generateId(),
      ...data,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.products.add(newProduct as any); // الخطوة 1
    // Write-Through → SQLite (for mobile sync)
    await syncProductCreate(newProduct);      // الخطوة 2
    return newProduct;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
});
```

#### مسار الخلل التقني:
1. **الخطوة 1 (`db.products.add`):**
   - في البنية السابقة للتطبيق، كان `db` يمثل IndexedDB محلياً عبر Dexie.
   - بعد ترحيل التطبيق بالكامل إلى SQLite، تم استبدال Dexie بـ IPC Shim داخل [`src/lib/db.ts`](file:///home/ammar/AN-POS-TEST/src/lib/db.ts#L128-L132).
   - هذا الـ Shim يقوم باستدعاء:
     `electronAPI.db.create('products', toSnake(obj))`
   - معالج الخلفية [`electron/main/handlers/crud.ts`](file:///home/ammar/AN-POS-TEST/electron/main/handlers/crud.ts#L303-L332) يقوم فوراً بتنفيذ استعلام:
     `INSERT INTO products (...) VALUES (...)`
   - المنتج أصبح مخزناً بالفعل في قاعدة بيانات SQLite المحلية!
2. **الخطوة 2 (`syncProductCreate`):**
   - مباشرة بعد ذلك، يستدعي الكود [`src/lib/products-sync.ts`](file:///home/ammar/AN-POS-TEST/src/lib/products-sync.ts#L116-L130) الذي ينادي `electronAPI.products.create(product)`.
   - معالج الخلفية المخصص [`electron/main/handlers/products.ts`](file:///home/ammar/AN-POS-TEST/electron/main/handlers/products.ts#L287-L302) يقوم بفحص الباركود:
     ```typescript
     const existing = queryOne('SELECT id FROM products WHERE barcode = ?', [barcode]);
     if (existing) {
       return { data: null, error: { status: 409, detail: 'الباركود مسجل مسبقاً لمنتج آخر' } };
     }
     ```
   - **النتيجة الصادمة:** نظراً لأن المنتج تم إدراجه لتوه في الخطوة 1، فإن فحص الباركود في الخطوة 2 يعثر على نفس المنتج الذي أُدخل لتوه، فيفشل ويعيد الخطأ `409 (Conflict)`!
   - يتم كتم الخطأ في الـ catch وطباعة تحذير في الكونسول: `[products-sync] syncProductCreate failed: Error 409`.
   - **أما إذا كان المنتج بدون باركود (فارغ):** فإن `createProduct` يقوم بتوليد معرف جديد (UUID) وإدخال **نسخة ثانية مكررة** لنفس المنتج في قاعدة البيانات!

### 2.2. غياب أداة توليد الباركود التلقائي (Missing Auto-Barcode Generator)
- في محلات التجزئة والسوبرماركت والأنشطة التجارية، العديد من البضائع (الخضار، الفواكه، المخبوزات، المكسرات، اللوازم السائبة) ليس لها باركود مطبوع من المصنع.
- في نموذج الإضافة [`useProductFormState.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/hooks/useProductFormState.ts)، لا يوجد زر أو دالة لتوليد باركود قياسي (مثل EAN-13 يبدأ بـ 200...، أو باركود داخلي تسلسلي)، مما يجبر المستخدم على تركه فارغاً أو كتابة أرقام عشوائية يدوياً.

### 2.3. مخاطر الاستيراد الجماعي من ملفات Excel (`handleImport`)
في [`InventoryPage.tsx`](file:///home/ammar/AN-POS-TEST/src/features/inventory/InventoryPage.tsx#L128-L159):
```typescript
await db.products.bulkAdd(prepared as any);
// Write-Through → SQLite (for mobile sync)
await syncProductBulkCreate(prepared);
```
- يعاني من نفس مشكلة الكتابة المزدوجة (`bulkAdd` يكتب مباشرة في SQLite عبر الـ IPC ثم `syncProductBulkCreate` يكرر الكتابة).
- لا يوجد فحص مسبق لتكرار الباركودات داخل ملف الإكسل ذاته أو مقارنتها بقاعدة البيانات قبل البدء، مما يؤدي إما إلى توقف العملية أو إدخال سجلات غير مكتملة.

---

## 3. المحور الثاني: تحليل عملية التحديث (Product Update Analysis)

### 3.1. الازدواجية البرمجية في عمليات التحديث
في [`useInventoryData.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/hooks/useInventoryData.ts#L91-L100):
```typescript
const updateMutation = useMutation({
  mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
    const changes = { ...data, updatedAt: new Date().toISOString() };
    await db.products.update(id, changes as any); // كتابة أولى في SQLite
    await syncProductUpdate(id, changes);         // كتابة ثانية في SQLite!
    return changes;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
});
```
- يتم إرسال استعلامي `UPDATE products SET ...` متعاقبين لكل تعديل على أي منتج.
- هذا يسبب إطلاق حدث `notifyTableChange('products', 'update')` مرتين متتاليتين، مما يؤدي إلى قيام الواجهة بإعادة طلب قائمة المنتجات (`refetch`) مرتين في نفس اللحظة واستهلاك غير مبرر لموارد المعالج والذاكرة.

### 3.2. ثغرة تسرب حركة المخزون في التعديل السريع (Stock Movement Audit Trail Leak)
في [`InventoryPage.tsx`](file:///home/ammar/AN-POS-TEST/src/features/inventory/InventoryPage.tsx#L111-L120):
```typescript
const handleQuickAdjust = (product: Product, delta: number) => {
  const newQty = Math.max(0, (product.quantity || 0) + delta);
  updateMutation.mutate({ id: product.id, data: { quantity: newQty } });
};

const handleSaveCustomAdjust = (product: Product, newQuantity: number) => {
  updateMutation.mutate({ id: product.id, data: { quantity: newQuantity } });
  setQuickAdjustProduct(null);
};
```
#### أثر الثغرة:
- عندما يقوم أمين المخزن أو البائع بزيادة الكمية (+1) أو إنقاصها (-1) أو كتابة رصيد جديد مباشرة من الجدول:
  يتم تحديث حقل `quantity` في جدول `products` فوراً، لكن **لا يتم تسجيل أي حركة في جدول `stock_movements` أو `stock_movements_v2` مطلقاً**!
- النتيجة المحاسبية: **فقدان كامل لسجل التدقيق (Audit Trail)**. عند مراجعة حركات الصنف لاحقاً، تظهر فروقات جرد مجهولة السبب دون معرفة من قام بالتعديل، متى، هل هو تالف؟ إرجاع؟ عجز؟ تعديل خطأ؟

### 3.3. تباين مستويات الأسعار بين الواجهة البسيطة والموسعة
- في نافذة `ProductFormModal.tsx` البسيطة، يمكن للمستخدم فقط تعديل: `retailPrice` (سعر التجزئة) و `wholesalePrice` (سعر الجملة).
- بينما تدعم قاعدة بيانات النظام ونافذة `ProductFormPage.tsx` الموسعة: `salePrice1`, `salePrice2`, `salePrice3`, `bottlePrice`, `pricingByZone`.
- في حال تعديل الصنف من النافذة البسيطة، قد تظل أسعار الشرائح القديمة غير محدثة ما لم يتم إدراج منطق إعادة التوليد التلقائي للشرائح السعرية.

---

## 4. المحور الثالث: تحليل الوظائف والعمليات المخزنية (Warehouse Functions)

### 4.1. انفصال بنية إدارة المستودعات المتطورة عن الواجهة الرئيسية
يحتوي المشروع على بنية مخزنية ممتازة واحترافية للغاية مطبقة في طبقة الـ Infrastructure والـ Domain:
1. [`movementRepo.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/infrastructure/repositories/movementRepo.ts): إدارة متكاملة لحركات المخزون (صرف، توريد، تحويل بين مستودعات، تالف، جرد).
2. [`countRepo.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/infrastructure/repositories/countRepo.ts): إدارة عمليات الجرد الفعلي، احتساب الفروقات التلقائية (Variances)، وإقفال الجرد.
3. [`warehouseRepo.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/infrastructure/repositories/warehouseRepo.ts): دعم تعدد المستودعات وفروع التخزين.
4. [`inventoryReportEngine.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/domain/services/inventoryReportEngine.ts): محرك تقارير تقييم المخزون (FIFO / المتوسط المرجح)، معدل الدوران، والأصناف الراكدة.

#### المشكلة الجوهرية:
- **كل هذه القدرات الجبارة معزولة تماماً عن صفحة المخزن الرئيسية [`InventoryPage.tsx`](file:///home/ammar/AN-POS-TEST/src/features/inventory/InventoryPage.tsx)!**
- صفحة `InventoryPage.tsx` تعرض فقط تبويبين: "قائمة المنتجات" و"تقرير الباركود".
- لا يوجد في واجهة المستخدم أي زر أو تبويب للانتقال إلى:
  - سجل حركات المخزون (Stock Movements Journal).
  - شاشة إجراء جرد فعلي (Inventory Audit Session).
  - شاشة التحويل بين المستودعات (Inter-Warehouse Transfers).

### 4.2. ازدواجية وتناقض جدولي الحركات (`stock_movements` مقابل `stock_movements_v2`)
في مخطط قاعدة البيانات [`shared/schema/index.ts`](file:///home/ammar/AN-POS-TEST/shared/schema/index.ts):
- يوجد جدول قديم `stock_movements` بأعمدة: `(id, product_id, type, qty, reference, reason)`.
- ويوجد جدول متقدم `stock_movements_v2` بأعمدة: `(id, movement_number, warehouse_id, item_id, quantity, unit_price, is_reviewed)`.

#### التناقض الميداني:
- نقطة البيع (POS) تسجل المبيعات في `stock_movements_v2`.
- شاشة فواتير المشتريات والتوريد في [`useSupplierMutations.ts`](file:///home/ammar/AN-POS-TEST/src/features/suppliers/hooks/useSupplierMutations.ts#L122-L148) تسجل الحركة في الجداول **معاً** عبر استدعائين منفصلين!
- هذا التشتت يهدد دقة التقارير الإحصائية التي قد تستعلم من جدول وتتجاهل الآخر.

### 4.3. سياسة المخزون السالب (Negative Stock Policy)
- يتيح النظام خيارين:
  1. خيار عام بالمتجر: `settings.allow_negative_stock`
  2. خيار خاص بكل صنف: `products.allow_negative_stock`
- في نقطة البيع تم توحيد هذا الفحص، بينما في المستودعات المباشرة [`movementRepo.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/infrastructure/repositories/movementRepo.ts#L67-L75)، يتم منع الصرف دائماً إذا كانت الكمية غير كافية دون الرجوع إلى خيار `allowNegativeStock` الخاص بالصنف نفسه.

---

## 5. المحور الرابع: تحليل نظام الإشعارات والتنبيهات (Notifications System)

### 5.1. الغياب التام للإشعارات التفاعلية في عمليات المخزن
يمتلك نظام AN POS منظومة إشعارات متقدمة وعالية الجودة مبنية في [`src/store/notificationStore.ts`](file:///home/ammar/AN-POS-TEST/src/store/notificationStore.ts):
- تدعم تنبيهات الصوت الرنانة (`playNotificationChime`).
- تدعم رسائل منبثقة تفاعلية في أسفل الشاشة (`InteractiveToastContainer`).
- تدعم مركز إشعارات دائم ومصنف (`NotificationCenterModal`) مع فئات مخصصة تشمل الفئة `'inventory'`.

#### المفارقة المرصودة في كود المخزن:
- **لا يوجد أي استدعاء لـ `useNotificationStore.addNotification` في دورة حياة المنتجات داخل المخزن!**
- عند **إضافة منتج جديد**: تنتهي العملية بصمت مطبق، دون إشعار نجاح أو تنبيه صوتي خفيف.
- عند **تعديل بيانات منتج**: يتم الحفظ وإغلاق النافذة دون إشعار تأكيدي.
- عند **حذف منتج**: يحذف بصمت بعد رسالة `confirm` المتصفح البدائية.
- عند **استيراد مئات المنتجات من ملف Excel**: تتم العملية في الخلفية دون إشعار المستخدم بنجاح الاستيراد أو إظهار تقرير بعدد الأصناف المضافة والباركودات المكررة.

### 5.2. انفصال تنبيهات انخفاض المخزون (Low Stock Alerts)
- يقوم خطاف [`useInventoryFilter.ts`](file:///home/ammar/AN-POS-TEST/src/features/inventory/hooks/useInventoryFilter.ts#L32-L50) باحتساب الأصناف منخفضة المخزون (`lowStock`) والأصناف المنتهية (`outOfStock`) والأصناف قريبة الانتهاء (`expiringSoonCount`).
- تُعرض هذه الإحصائيات فقط داخل بطاقات الواجهة العلوية (`InventoryStatsCards`).
- **الخلل:** لا يوجد مراقب نشط (Reactive Watcher / Event Listener) يقوم بإطلاق تنبيه حقيقي إلى مركز الإشعارات عندما يصل منتج إلى حد التنبيه بعد حركة بيع أو صرف. لا يعلم المستخدم بنفاد المخزون إلا إذا دخل بنفسه إلى صفحة المخزن ونظر بالعين المجردة إلى الأرقام!

---

## 6. المحور الخامس: تحليل جداول وقواعد بيانات المنتجات (Database Schemas)

### 6.1. تشتت مسميات الأعمدة وازدواجية الترجمة
في المخطط الموحد [`shared/schema/index.ts`](file:///home/ammar/AN-POS-TEST/shared/schema/index.ts#L140-L185):

```sql
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT NOT NULL DEFAULT '',
  cost_price REAL NOT NULL DEFAULT 0,
  average_price REAL NOT NULL DEFAULT 0,
  wholesale_price REAL NOT NULL DEFAULT 0,
  retail_price REAL NOT NULL DEFAULT 0,
  sale_price1 REAL NOT NULL DEFAULT 0,
  sale_price2 REAL NOT NULL DEFAULT 0,
  sale_price3 REAL NOT NULL DEFAULT 0,
  wholesale_min_qty INTEGER NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  allow_negative_stock INTEGER NOT NULL DEFAULT 0,
  category_id TEXT,
  ...
);
```

#### مشكلة التنافر بين الطبقات (Impedance Mismatch):
1. **الواجهة الأمامية (TypeScript Types):** تستخدم `costPrice`, `retailPrice`, `wholesalePrice`, `lowStockThreshold`.
2. **شاشات قديمة:** تستخدم `purchasePrice`, `price`, `price2`, `minStock`.
3. **قاعدة بيانات SQLite:** تستخدم `cost_price`, `retail_price`, `wholesale_price`, `low_stock_threshold`.
- على الرغم من وجود دوال معالجة في [`electron/main/handlers/products.ts`](file:///home/ammar/AN-POS-TEST/electron/main/handlers/products.ts#L96-L211)، فإن الاعتماد على التبديل اليدوي بين هذه المسميات في 4 ملفات مختلفة (`products-sync.ts`, `db.ts`, `crud.ts`, `products.ts`) يزيد من احتمالية فقدان بعض الحقول عند التحديث مستقبلاً.

### 6.2. غياب قيود التكامل المرجعي (Foreign Key Constraints & Orphan Records)
- حقل `category_id` في جدول `products` وحقل `warehouse_id` لا يرتبطان بقيود `FOREIGN KEY ... ON DELETE SET NULL`.
- في حال قيام المستخدم بحذف فئة (Category) من شاشة الفئات، تصبح المنتجات التابعة لها ذات `category_id` يشير إلى معرف غير موجود (Orphan Reference)، مما يؤدي إلى عدم ظهورها في تصفيات الفئات وتناقض في عدادات المنتجات لكل فئة.

### 6.3. ازدواجية الباركود الفردي والمتعدد
- يحتوي جدول `products` على عمود `barcode TEXT NOT NULL DEFAULT ''`.
- وفي نفس الوقت يوجد جدول منفصل [`product_barcodes`](file:///home/ammar/AN-POS-TEST/shared/schema/index.ts#L204-L214) مخصص لدعم الباركودات المتعددة للصنف الواحد (باركود الحبة، باركود الصندوق، والباركودات البديلة).
- **الخلل في شاشة المخزن:** تعتمد شاشة المخزن والبحث السريع حصراً على `products.barcode`، ولا تفحص أو تبحث في جدول `product_barcodes`، مما يعني أن المستخدم لو مسح باركود الكرتونة في المخزن فلن يظهر له الصنف!

---

## 7. مصفوفة المشاكل وخطة المعالجة التقنية المقترحة (Actionable Remediation Matrix)

| # | المشكلة المرصودة | الملفات المتأثرة | الأثر الفعلي | الحل التقني الدقيق الموصى به |
|---|---|---|---|---|
| **1** | **ازدواجية الإدخال والتحديث عبر IPC** | `useInventoryData.ts`<br>`ProductFormPage.tsx` | خطأ 409 كاذب في الكونسول ومضاعفة استهلاك الموارد | إلغاء استدعاءات `syncProductCreate` و `syncProductUpdate` طالما أن `db.products` يكتب مباشرة في SQLite عبر الـ IPC Shim الموحد |
| **2** | **تسرب حركات المخزون في التعديل السريع** | `InventoryPage.tsx`<br>`movementRepo.ts` | ضياع الأثر التدقيقي للمخزون وفروقات جرد مجهولة | تعديل `handleQuickAdjust` و `handleSaveCustomAdjust` لتسجيل حركة فورية بنوع `adjustment` في `stock_movements_v2` |
| **3** | **غياب مولد الباركود التلقائي** | `useProductFormState.ts`<br>`ProductFormModal.tsx` | صعوبة ترقيم البضائع التي ليس لها باركود مصنعي | إضافة زر "توليد باركود تلقائي" يولد كود EAN-13 قياسي بالبادئة 200... مع رقم تحقق (Checksum) صحيح |
| **4** | **غياب إشعارات عمليات المخزن** | `useInventoryData.ts`<br>`InventoryPage.tsx` | انعدام التغذية الراجعة للمستخدم عند الإضافة والتعديل والحذف | ربط `useNotificationStore.addNotification` بجميع الـ Mutations مع نغمات نجاح وأخطاء واضحة |
| **5** | **انفصال تنبيهات نفاد المخزون** | `useInventoryFilter.ts`<br>`useSaleCompletion.ts` | عدم تنبيه المستخدم عند هبوط كمية صنف تحت الحد الحرج | تفعيل مراقب مخزون (Low Stock Observer) يطلق تنبيهاً لمركز الإشعارات فور وصول الكمية إلى `lowStockThreshold` |
| **6** | **عزل شاشات الحركات والجرد** | `InventoryPage.tsx` | عدم استفادة المستخدم من ميزات الجرد وتعدد المستودعات | إضافة تبويبات إضافية في شريط أدوات المخزن: [سجل الحركات] و [جلسات الجرد] |
| **7** | **توحيد جدولي حركات المخزون** | `shared/schema/index.ts`<br>`useSupplierMutations.ts` | تشتت البيانات بين v1 و v2 | توحيد التسجيل والتقارير على `stock_movements_v2` وجعل v1 مجرد View مؤقت للتوافقية |

---

## 8. الخلاصة والتوصيات الهندسية

نظام المخزن في **AN POS** يمتلك قاعدة بيانات متماسكة وأداءً فائق السرعة، ومع ذلك فإن عملية الترحيل السابقة من Dexie إلى SQLite تركت **آثار كتابة مزدوجة (Write-Through Duplication)** أصبحت فائضة عن الحاجة، بالإضافة إلى أن **محرك الإشعارات ومستودعات الحركات المتطورة مبنية بالفعل ولكنها غير موصولة بشكل كامل بواجهة المخزن اليومية**.

إن تطبيق حزمة المعالجات المذكورة في الجدول أعلاه سيعزز من صلابة النظام، ويمنع أي تعارضات غير مرئية، ويمنح المستخدم تجربة متكاملة تبقيه على اطلاع فوري بكل حركة مخزنية.
