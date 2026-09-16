# توثيق المسار المرجعي لإتمام المبيعات (Baseline Sale Flow)

> **الغرض من هذا المستند:**
> توثيق هندسي دقيق وشامل لجميع الخطوات المتتالية التي ينفذها نظام الكاشير عند إتمام عملية بيع، بناءً على الكود الفعلي في:
> 1. [`src/features/pos/hooks/useSaleCompletion.ts`](file:///home/ammar/AN-POS-TEST/src/features/pos/hooks/useSaleCompletion.ts)
> 2. [`electron/main/handlers/sales.ts`](file:///home/ammar/AN-POS-TEST/electron/main/handlers/sales.ts)
> 
> *ملاحظة: هذا المستند هو مرجع توثيقي بحت؛ لم يتم تعديل أو حذف أي كود في المشروع.*

---

## الفهرس
1. [المسار الزمني لإتمام بيع عادي (نقدي - Cash) عبر Electron IPC](#1-المسار-الزمني-لإتمام-بيع-عادي-نقدي---cash-عبر-electron-ipc)
2. [مسار إتمام بيع بمنتج ضمن باقة (Pack)](#2-مسار-إتمام-بيع-بمنتج-ضمن-باقة-pack)
3. [مواضع تحديث كمية المنتج (quantity) في هذا المسار](#3-مواضع-تحديث-كمية-المنتج-quantity-في-هذا-المسار)

---

## 1. المسار الزمني لإتمام بيع عادي (نقدي - Cash) عبر Electron IPC

عند قيام الكاشير بالضغط على زر إتمام البيع النقدي، تمر العملية بالخطوات المتسلسلة التالية من الواجهة (Renderer) وحتى قاعدة البيانات المركزية (Main Process):

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as الكاشير (UI)
    participant Hook as useSaleCompletion (Renderer)
    participant IPC as Electron IPC (sales:create)
    participant Backend as sales.ts (Main Process)
    participant DB as SQLite (sales, products, sessions)
    participant Dexie as Dexie Cache (Local db)
    participant State as React Query & UI

    Cashier->>Hook: إتمام بيع نقدي (completeSale)
    Hook->>Hook: التحقق من التراخيص وفترة التجربة
    Hook->>Hook: حساب الإجماليات، الترقيم، وإثراء السلة
    Hook->>IPC: إرسال الـ Payload عبر electronApi.sales.create
    IPC->>Backend: استدعاء createSale(data)
    rect rgb(240, 248, 255)
        note over Backend,DB: SQLite Transaction (ذرية)
        Backend->>DB: INSERT INTO sales
        Backend->>DB: INSERT INTO sale_items
        Backend->>DB: UPDATE products (خصم الكمية)
        Backend->>DB: INSERT INTO stock_movements
        Backend->>DB: UPDATE cash_sessions (زيادة النقدية)
    end
    Backend->>IPC: إرسال إشعارات التغيير (notifyTableChange)
    Backend-->>Hook: إرجاع كائن الفاتورة المنشأة
    Hook->>Dexie: تحديث كاش الفاتورة والمنتجات محلياً (db.products)
    Hook->>State: إبطال الكاش (invalidateQueries) وتفريغ السلة والطباعة
    Hook-->>Cashier: اكتمال العملية بنجاح
```

### تفاصيل الخطوات بالترتيب الدقيق:

#### الخطوة 1: استدعاء الطفرة وفحص الترخيص (Renderer)
- **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 51 - 72)
- يتم استدعاء الدالة `completeSale(params)`.
- فحص حالة الترخيص وفترة التجربة (السطر 69): إذا لم يكن المستخدم مطوراً والرخصة غير مفعلة وانتهت فترة التجربة (7 أيام)، يتم رمي استثناء فوري `انتهت فترة التجربة المجانية` وإيقاف العملية.

#### الخطوة 2: الحسابات المالية وتوليد رقم الفاتورة (Renderer)
- **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 73 - 93)
- استدعاء `calculateSaleTotal(...)` لحساب الإجمالي والمجموع الفرعي والخصومات والضريبة.
- توليد الرقم التسلسلي التالي للفاتورة عبر `SaleRepository.getNextNumber(...)`.
- في البيع النقدي: يتم ضبط المبلغ المدفوع `effectivePaidAmount = saleSummary.total` (السطر 78-81).
- مطابقة بيانات العميل المختار وتحديد نوع المستند (`facture` للبيع العادي أو `wholesale` للجملة).

#### الخطوة 3: إثراء عناصر السلة بالبيانات التكميلية (Renderer)
- **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 95 - 115)
- إنشاء مصفوفة `enrichedCart` من خلال مطابقة عناصر السلة مع المنتجات والباقات لضمان وجود `piecesCount` و `unitName` و `packQty` و `packMode` و `pricingType`.

#### الخطوة 4: تشكيل كائنات الفاتورة والبنود المنفردة (Renderer)
- **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 117 - 152)
- استدعاء `createSale(...)` لتوليد الكائن الأساسي `baseSale` ثم دمج الحقول الإضافية لتكوين كائن `sale`.
- تجهيز مصفوفة `saleItemEntities` الخاصة بجدول البنود `sale_items`.

#### الخطوة 5: إرسال الطلب عبر قناة Electron IPC (Renderer -> Main)
- **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 156 - 184)
- فحص توفر `window.electronAPI.sales.create`.
- تجهيز كائن البيانات `payload` متضمناً: المعرّف، الرقم، التاريخ، العناصر، المجموع، الخصم، الضريبة، طريقة الدفع (`cash`)، المبلغ المدفوع بالكامل، معرف جلسة الصندوق `cashSessionId`، اسم البائع، وخيار المخزون السالب `allowNegativeStock`.
- استدعاء: `const res = await electronApi.sales.create(payload);` (السطر 181).

#### الخطوة 6: استقبال الطلب في المعالج الرئيسي (IPC Router)
- **الملف:** `electron/main/ipc/sales.ts` (السطور 26 - 34)
- يستقبل `ipcMain.handle('sales:create', ...)` الطلب.
- يفحص التراخيص والتلاعب بساعة النظام على مستوى النظام ويزيد عداد مبيعات التجربة إن وُجدت.
- يمرر البيانات إلى دالة المعالجة `createSale(data)` في `electron/main/handlers/sales.ts`.

#### الخطوة 7: بدء المعاملة الذرية (SQLite Transaction) في الباك إند
- **الملف:** `electron/main/handlers/sales.ts` (السطور 75 - 305)
- استخراج المعاملات وإعداد القيم الافتراضية والتحقق التلقائي من جلسة الصندوق المفتوحة `openSess` وإعداد `allowNegativeStock`.
- فتح معاملة ذرية `transaction(() => { ... })` (السطر 131):
  1. **إدراج الفاتورة في جدول المبيعات (السطور 133 - 162):**
     تنفيذ استعلام `INSERT INTO sales (...) VALUES (...)` مع تخزين العناصر كـ JSON مشفر في حقل `items`.
  2. **إدراج البنود في جدول `sale_items` (السطور 214 - 226):**
     تكرار على كل عنصر في الفاتورة وإدراجه بسجل منفصل يحتوي على `sale_id` و `product_id` و `name` و `qty` و `unit_price` و `line_total` و `batch_number`.
  3. **تحديث كمية المخزون وسجل الحركات (السطور 165 - 198، 255 - 258):**
     - يتم حساب التغيير `qtyChange = sign * qty` حيث `sign = -1` في حالة البيع العادي.
     - استدعاء الدالة المساعدة `updateProductAndMovement(productId, qtyChange)` (السطر 257).
     - تحديث كمية المنتج في جدول `products` فوراً مع احترام سياسة المخزون السالب:
       - إذا كان المخزون السالب مسموحاً (`allowNegativeStock`):
         `UPDATE products SET quantity = quantity + ?, updated_at = ? WHERE id = ?` (السطر 169)
       - وإلا يتم قصر المخزون على ألا يقل عن الصفر:
         `UPDATE products SET quantity = MAX(0, quantity + ?), updated_at = ? WHERE id = ?` (السطر 175)
     - إدراج سجل حركة في جدول `stock_movements` بنوع `'sale'` مرتبط برقم الفاتورة كمرجع (السطور 182 - 197).
  4. **فحص رصيد العميل (السطور 263 - 282):**
     - لأن طريقة الدفع نقدية (`cash`)، لا يترتب على العميل أي دين متبقٍ (`unpaidPart = 0`) وبالتالي لا يُعدل رصيد العميل.
  5. **تحديث جلسة الصندوق النقدية المفتوحة (السطور 284 - 303):**
     - لأن البيع نقدي ومسدد بالكامل (`amountPaid > 0`)، يتم زيادة إجمالي المبيعات والرصيد الفعلي للصندوق:
       `UPDATE cash_sessions SET total_sales = total_sales + ?, actual_balance = actual_balance + ?, updated_at = ? WHERE id = ?` (السطر 296).

#### الخطوة 8: إرسال إشعارات التغيير ورد الاستجابة (Main Process)
- **الملف:** `electron/main/handlers/sales.ts` (السطور 307 - 317)
- إطلاق إشعارات التغيير للواجهات:
  - `notifyTableChange('sales', 'create', id)` (السطر 307)
  - `notifyTableChange('products', 'bulk-update')` (السطر 308)
  - `notifyTableChange('cash_sessions', 'update', cashSessionId)` (السطر 313)
- استعلام الفاتورة المسجلة حديثاً وإرجاعها للواجهة `{ data: created ? transformSale(created) : null }` (السطر 316-317).

#### الخطوة 9: التحديث المتزامن المحلي في Dexie (Renderer)
- **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 187 - 219)
- فور استلام الاستجابة الناجحة:
  - حفظ الفاتورة محلياً في IndexedDB: `await db.sales.put(sale as any)`.
  - تحديث كمية المنتج في جدول `products` المحلي داخل Dexie فوراً (السطر 216) لمنع وميض الواجهة أثناء انتظار المزامنة.

#### الخطوة 10: إجراءات ما بعد إتمام البيع (Mutation onSuccess)
- **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 355 - 390)
- إبطال كاش React Query لكافة الجداول المتأثرة (`products`, `sales`, `customers`, `cashSessions`, `stockMovements`).
- إطلاق أمر الطباعة التلقائية عبر `printDocument(...)` إذا كان خيار `autoPrint` مفعلاً.
- تفريغ السلة `clearCart()`.
- استدعاء رد النداء `onSaleSuccess(sale)` لتحديث الواجهة أو إغلاق النوافذ.

---

## 2. مسار إتمام بيع بمنتج ضمن باقة (Pack)

تختلف الباقة (Pack) أو الطرد بالجملة عن المنتج العادي، حيث يتم تسجيل بند البيع باسم الباقة، لكن **المخزون يتم خصمه وتتبعه من المنتجات الفرعية المكونة للباقة (Components)**.

```mermaid
flowchart TD
    A[عنصر باقة في السلة] -->|item.isPack = true| B(useSaleCompletion.ts)
    B -->|إثراء packPiecesCount و packMode| C[إرسال عبر IPC إلى createSale]
    C --> D[إدراج بند الباقة في sale_items]
    D --> E{هل العنصر باقة؟ isPack && packId}
    E -->|نعم| F[استعلام جدول packs: SELECT items FROM packs WHERE id = ?]
    F --> G[فك تشفير مصفوفة المكونات JSON]
    G --> H[حلقة تكرار على كل منتج فرعي comp]
    H --> I[حساب عدد القطع المباعة الفعلية]
    I -->|retail_pieces| J1[totalPieces = qty]
    I -->|wholesale_packs| J2[totalPieces = comp.qty * qty]
    J1 & J2 --> K[updateProductAndMovement للمنتج الفرعي]
    K --> L[خصم مخزون المنتج المكون في products]
    K --> M[تسجيل حركة في stock_movements للمنتج المكون]
    C -->|بعد نجاح IPC| N[تحديث مخزون المكونات محلياً في Dexie]
```

### التفصيل التقني لخطوات بيع الباقة:

1. **التعرف على الباقة وإثرائها في الواجهة (Renderer):**
   - **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 95 - 115)
   - يتم التعرف على الباقة عبر `item.isPack` أو وجود معرّف باقة `item.packId` أو مطابقة مع مصفوفة `packs`.
   - يتم استخراج وحساب:
     - `packPiecesCount`: عدد القطع الكلي داخل الباقة (من تعريف الباقة أو من `packageSize` للمنتج).
     - `packUnit`: اسم وحدة الباقة (مثل "طرد"، "كرتونة").
     - `packQty`: كمية الطرود/الباقات.
     - `packMode`: نمط البيع، إما بيع مفرّق بالقطع من الباقة (`'retail_pieces'`) أو بيع طرود كاملة (`'wholesale_packs'`).

2. **نقل بيانات الباقة في حمولة الـ IPC:**
   - **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 158 - 181)
   - يتم إرسال العنصر متضمناً `isPack: true`، `packId`، و `packMode` إلى الباك إند.

3. **تسجيل بند البيع في جدول البنود `sale_items`:**
   - **الملف:** `electron/main/handlers/sales.ts` (السطور 214 - 226)
   - يُدرج سطر البيع في جدول `sale_items` بمعلومات الباقة (السعر الإجمالي، الكمية، واسم الباقة) ليكون التقرير المالي مطابقاً لما رآه واشتراه العميل.

4. **فك مكونات الباقة وخصم مخزون كل منتج فرعي (Unbundling):**
   - **الملف:** `electron/main/handlers/sales.ts` (السطور 230 - 254)
   - يفحص المعالج الشرط:
     ```typescript
     if (isPack && packId) { ... }
     ```
   - يجلب تعريف الباقة من قاعدة بيانات SQLite (السطر 233):
     ```sql
     SELECT items FROM packs WHERE id = ?
     ```
   - يفك تشفير حقل `items` المخزن كـ JSON، والذي يحتوي مصفوفة بالمكونات الفرعية: `[{ productId, qty }]`.
   - يقوم المعالج بالدوران على كل مكوّن فرعي (`comp`) ويحسب كمية القطع المستهلكة بدقة:
     - إذا كان النمط بالقطع المفرقة (`packMode === 'retail_pieces'`):
       $$\text{totalPiecesSold} = \text{qty}$$
     - إذا كان النمط بالطرود الكاملة (`packMode !== 'retail_pieces'`):
       $$\text{totalPiecesSold} = \text{comp.qty} \times \text{qty}$$
   - تُحسب قيمة التغيير المخزني: `compQtyChange = sign * totalPiecesSold` (تكون سالبة في البيع).
   - يتم استدعاء `updateProductAndMovement(comp.productId, compQtyChange)` (السطر 252) لكل منتج فرعي:
     - يخصم المخزون من جدول `products` للمنتج المكوّن (السطور 169 / 175).
     - يدرج حركة في `stock_movements` للمنتج المكوّن برقم الفاتورة (السطور 182 - 197).

5. **تحديث رصيد المكونات محلياً في مخزن Dexie بالواجهة:**
   - **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 189 - 208)
   - بعد عودة استجابة IPC بالنجاح، يمر الكود على السلة محلياً، وإذا كان العنصر باقة، يقرأ مكوناتها من `packs`، ويحسب `totalPiecesSold` بنفس المعادلة، ثم ينفذ:
     ```typescript
     db.products.update(product.id, { quantity: newQuantity }).catch(() => {});
     ```
     (السطر 205) لكل منتج مكوّن فرعي لتحديث الواجهة فوراً.

6. **المسار الاحتياطي للباقات في بيئة الويب الخالصة (Browser Fallback):**
   - **الملف:** `src/features/pos/hooks/useSaleCompletion.ts` (السطور 241 - 278)
   - في حال عدم تشغيل النظام على بيئة Electron، يتم تنفيذ نفس منطق فك الباقة وخصم كميات المنتجات الفرعية داخل معاملة Dexie (`db.transaction`).

---

## 3. مواضع تحديث كمية المنتج (quantity) في هذا المسار

يوضح الجدول التالي كافة المواضع التي يتم فيها تغيير حقل `quantity` لمنتج في قاعدة البيانات أثناء مسار إتمام البيع، مع ذكر الملف، السطر الدقيق، والسياق البرمجي:

| # | الملف | السطور الدقيقة | البيئة والطبقة | نوع المنتج المستهدف | الكود / الاستعلام المنفذ |
|---|-------|----------------|----------------|---------------------|--------------------------|
| **1** | `electron/main/handlers/sales.ts` | **السطور 168 - 180**<br>(الاستدعاء عند السطر **257**) | Electron Backend<br>(SQLite Transaction) | منتج عادي منفرد | ```sql UPDATE products SET quantity = MAX(0, quantity + ?), updated_at = ? WHERE id = ? ``` *(أو `quantity + ?` إذا فُعّل `allowNegativeStock`)* |
| **2** | `electron/main/handlers/sales.ts` | **السطور 168 - 180**<br>(الاستدعاء عند السطر **252**) | Electron Backend<br>(SQLite Transaction) | كل منتج فرعي داخل باقة (Pack Component) | استدعاء `updateProductAndMovement(comp.productId, compQtyChange)` لكل مكوّن في الباقة، من خلال نفس استعلام الـ SQL الموضح أعلاه. |
| **3** | `src/features/pos/hooks/useSaleCompletion.ts` | **السطور 201 - 206**<br>(التحديث عند السطر **205**) | Renderer Process<br>(Dexie Local Cache) | كل منتج فرعي داخل باقة (Pack Component) | ```typescript db.products.update(product.id, { quantity: newQuantity }).catch(() => {}); ``` |
| **4** | `src/features/pos/hooks/useSaleCompletion.ts` | **السطور 212 - 217**<br>(التحديث عند السطر **216**) | Renderer Process<br>(Dexie Local Cache) | منتج عادي منفرد | ```typescript db.products.update(product.id, { quantity: newQuantity }).catch(() => {}); ``` |
| **5** | `src/features/pos/hooks/useSaleCompletion.ts` | **السطور 255 - 264**<br>(التحديث عند السطر **262**) | Renderer Process<br>(Fallback Dexie Tx) | كل منتج فرعي داخل باقة (Pack Component) | ```typescript await db.products.update(product.id, { quantity: newQuantity }); ``` *(المسار الاحتياطي عند عدم وجود Electron)* |
| **6** | `src/features/pos/hooks/useSaleCompletion.ts` | **السطور 281 - 288**<br>(التحديث عند السطر **286**) | Renderer Process<br>(Fallback Dexie Tx) | منتج عادي منفرد | ```typescript await db.products.update(product.id, { quantity: newQuantity }); ``` *(المسار الاحتياطي عند عدم وجود Electron)* |

---

## خلاصة وضمانات التكامل
- **الذرية (Atomicity):** كافة التحديثات في بيئة سطح المكتب تقع داخل كتلة `transaction` في SQLite داخل `electron/main/handlers/sales.ts` (السطور 131 - 304). فإذا فشل تحديث أي عنصر أو مخزونه يتم التراجع عن كامل الفاتورة تلقائياً.
- **تتبع المخزون للباقات:** الباقة ذاتها لا تمتلك مخزوناً مباشراً في جدول `products`، بل يُخصم استهلاكها تلقائياً من مخزون العناصر الأصلية المكونة لها، سواء بيعت كطرد جملة أو كقطع مفرقة.
- **تزامن الواجهة:** يتم تحديث Dexie في الواجهة فور استلام الرد لمنع أي بطء أو تأخر في ظهور الرصيد المتبقي للمنتج على الشاشة.
