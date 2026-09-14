# تقييم المعمارية الشامل لتطبيق سطح المكتب (AN POS Desktop Architecture Evaluation)
## تحليل هندسي معماري متكامل: القدرات، نقاط الضعف، الأخطاء والديون التقنية، وخطة التطوير

---

## 1. المقدمة ونظرة عامة على النظام (Executive Architecture Overview)

يعتمد تطبيق سطح المكتب **AN POS** على إطار عمل **Electron (إصدار 43+)** مدمجاً مع بيئة **Node.js 22+**، وواجهة أمامية حديثة مبنية بـ **React 19** و **TypeScript** و **Vite**، مع خادم شبكة محلية خفيف **Fastify** مدمج للربط الآني مع تطبيق الهاتف المحمول (**React Native**).

يهدف النظام إلى توفير نقطة بيع وإدارة مخزون وحسابات فائقة السرعة، تعمل بكفاءة مطلقة **دون الحاجة للإنترنت (Offline-First)**، وتدعم مختلف ملحقات العتاد التجاري (طابعات الفواتير الحرارية ESC/POS، قوارئ الباركود USB، وشاشات العملاء).

---

## 2. الطبقات المعمارية الحالية لتطبيق سطح المكتب (Current Architectural Blueprint)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        تطبيق الهاتف المحمول (React Native)                              │
│              [ماسح الباركود السريع | جرد المخزون | مساعد الكاشير اللاسلكي]               │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          │ اتصال LAN (HTTP REST + SSE + Bonjour/UDP)
┌─────────────────────────────────────────▼──────────────────────────────────────────────┐
│                                  ELECTRON MAIN PROCESS                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 1. خادم الشبكة المحلية المدمج (Fastify LAN Server)                                │  │
│  │    ├── routes/ (auth, crud, sales, cash, categories, pair, sync, devices, pos)  │  │
│  │    ├── discoveryBonjour.ts (mDNS Advertisements) & discoveryUdp.ts (Broadcast)  │  │
│  │    └── SSE Stream (بث أحداث مسح الباركود من الهاتف للكاشير مباشرة)                 │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ 2. محرك قاعدة البيانات المحلي (Embedded SQLite Engine)                            │  │
│  │    ├── node:sqlite (DatabaseSync) — محرك SQLite أصلي فائق السرعة بدون C++ addons │  │
│  │    ├── drizzle-orm/sqlite-proxy — طبقة تمثيل الكيانات والاستعلامات               │  │
│  │    ├── statementCache (LRU Cache حتى 300 Prepared Statement مُجمّع مسبقاً)      │  │
│  │    └── schema-init.ts & seed.ts — تهيئة الجداول والبيانات الأولية                │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ 3. محرك العتاد والطباعة (Hardware & Printing Engine)                             │  │
│  │    ├── printing/ (ESC/POS Raw Thermal Commands, Thermal Templates, Auto-Cut)    │  │
│  │    └── window management & OS native handlers                                    │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ 4. مسجلات قنوات الاتصال الداخلي (IPC Handlers)                                    │  │
│  │    └── ipc/register.ts & handlers/ (db, auth, products, sales, cash, etc.)       │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────▲──────────────────────────────────────────────┘
                                          │ قنوات IPC الآمنة (contextBridge / preload)
┌─────────────────────────────────────────▼──────────────────────────────────────────────┐
│                              ELECTRON RENDERER PROCESS                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 1. طبقة واجهة التجسير التوافقية (Dexie-Compatible IPC Proxy Shim)                  │  │
│  │    └── src/lib/db.ts — محاكاة واجهة Dexie عبر JS Proxy وتنسيق camel/snake_case   │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ 2. طبقة إدارة الحالة وتخزين الكاش (State Management & Caching)                   │  │
│  │    ├── TanStack React Query (استعلامات المنتجات، الفواتير، الجلسات، التصنيفات)     │  │
│  │    └── Zustand Stores (سلة البيع، جلسات الكاشير، التفضيلات، الصلاحيات)           │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ 3. الوحدات الوظيفية النمطية النظيفة (Modular Feature Domains)                    │  │
│  │    ├── pos/ (نقطة البيع الكلاسيكية ونقطة البيع السريعة Quick POS)                │  │
│  │    ├── inventory/ (إدارة المخزون والتعديل السريع وحركات الجرد)                   │  │
│  │    ├── customers/ & suppliers/ (الديون، كشوفات الحسابات، تسديد الدفعات)          │  │
│  │    ├── favorites/ & packs/ (العبوات السريعة، الحزم، والعروض الترويجية)           │  │
│  │    └── barcode/ (استوديو وتصميم وطباعة الباركود والملصقات)                       │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ميزات ونقاط قوة المعمارية الحالية (Key Strengths & Architectural Merits)

### 1. الاستغناء التام عن الاعتماديات الأصلية التجميعية (Native C++ Rebuild Elimination)
- **الميزة**: تم ترحيل التطبيق للاعتماد على `node:sqlite` المدمج افتراضياً في بيئة Node.js 22+ و Electron الحديثة.
- **الفائدة الهندسية**: القضاء النهائي على مشاكل أخطاء التجميع الشهيرة (`node-gyp`، تضارب إصدارات ABI بين Node و Electron، وصعوبة البناء على منصات لينكس وويندوز المختلفة).

### 2. معمارية التشغيل المحلي المنعزل (100% Offline-First Architecture)
- **الميزة**: لا يعتمد التطبيق على أي سحابة خارجية لتنفيذ المعاملات أو تشغيل جلسات الصندوق أو التحقق من المخزون.
- **الفائدة الهندسية**: موثوقية تشغيلية بنسبة 100% في المتاجر ونقاط البيع التي تعاني من انقطاع الإنترنت أو التذبذب، مع استجابة فورية للأوامر (زمن تنفيذ الاستعلام أقل من 2ms).

### 3. التفكيك النمطي وفق المعمارية النظيفة (Clean Architecture Modularization)
- **الميزة**: تم بنجاح تفكيك الشاشات الأحادية المتضخمة (`QuickPOSPage`, `InventoryPage`, `CustomersPage`, `SuppliersPage`, `FavoritesPage`, `BarcodeLabelsPage`, `PacksPage`) إلى طبقات معيارية مستقلة:
  - **طبقة الخدمات الصرفة (`services/`)**: خوارزميات الحسابات، توليد الباركود، تنسيق كشوف الحسابات.
  - **طبقة الخطافات المخصصة (`hooks/`)**: استعلامات React Query، وإدارة الحالات المحلية، ومصائد الأحداث.
  - **طبقة المكونات العرضية (`components/`)**: بطاقات، شاشات تصفية، أشرطة إحصاءات، جداول مقسمة.
  - **طبقة النوافذ التفاعلية (`modals/`)**: استمارات الإضافة والتعديل والتسديد المعزولة.
- **الفائدة الهندسية**: انخفاض زمن رندر المكونات (Zero Unnecessary Re-renders)، وسهولة كتابة اختبارات الوحدة، وتسهيل الصيانة الجماعية.

### 4. التزامن المحلي الهجين مع الهاتف المحمول (Local LAN SSE + Fastify Ecosystem)
- **الميزة**: يحتوي `electron/main` على خادم Fastify متقدم يعمل عبر الشبكة المحلية (LAN) ويدعم تقنيات الاكتشاف التلقائي عبر **Bonjour (mDNS)** و **UDP Broadcast**.
- **الفائدة الهندسية**: تحويل أي هاتف ذكي على نفس شبكة Wi-Fi إلى قارئ باركود ليزري لاسلكي سريع يبث الرموز مباشرة لسلة الكاشير عبر Server-Sent Events (SSE) دون أي وسيط خارجي.

### 5. أمان سياق العرض (Context Isolation & Preload Sandboxing)
- **الميزة**: تفعيل `contextIsolation: true` وحظر `nodeIntegration: false` بالكامل في نوافذ Electron، وحصر وصول الواجهة لواجهات النظام عبر `preload/index.ts`.
- **الفائدة الهندسية**: حماية التطبيق من ثغرات XSS أو Remote Code Execution، وحماية محرك قاعدة البيانات ونظام الملفات من أي عبث مباشر من طرف الواجهة.

---

## 4. تقييم الأخطاء ونقاط الضعف والديون التقنية (Identified Flaws & Technical Debt)

على الرغم من قوة المعمارية وسرعتها، إلا أن التحليل المعمق كشف عن عدة نقاط ضعف حرجة تتطلب معالجة هندسية:

---

### الخطأ الأول: الاعتماد على محاكي واجهة Dexie الزائف (`src/lib/db.ts Proxy Shim`)

#### الوصف المعماري للمشكلة:
عند ترحيل المشروع من IndexedDB/Dexie إلى SQLite، تم إنشاء Proxy معقد في [src/lib/db.ts](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/src/lib/db.ts) يحاكي واجهة Dexie القديمة (`db.products.toArray()`, `db.sales.add()`). يقوم هذا الـ Proxy باعتراض كل نداء، وإجراء تحويلات نصية ثنائية متكررة بين `camelCase` و `snake_case` عبر Regular Expressions و Map Caches، ثم إرسال رسالة IPC إلى Electron Main.

#### الأثر السلبي:
1. **استهلاك موارد غير مبرر (Serialization & Conversion Overhead)**: عند جلب 5,000 صنف، يتم تحويل كل خاصية لكل صنف مرتين (في الإرسال والاستقبال) عبر الـ Proxy.
2. **إخفاء قدرات SQL الحقيقية**: الواجهة تتعامل مع قاعدة البيانات كأنها مخزن وثائق (NoSQL Key-Value / Object Store)، وتحرم المطورين من استخدام قوة استعلامات SQL الحقيقية (مثل `JOINs`, `GROUP BY`, `Aggregations`, `Subqueries`)، مما يضطر الواجهة لجلب جداول كاملة وإجراء التصفية والحسابات في الذاكرة بالمتصفح!
3. **صعوبة تتبع الأخطاء (Stack Trace Obfuscation)**: عند فشل استعلام، تصبح رسائل الخطأ غامضة لأنها تمر عبر طبقة الـ Proxy غير المباشرة.

---

### الخطأ الثاني: حظر المعالج الرئيسي لـ Electron عبر الاستعلامات المتزامنة (`DatabaseSync Block`)

#### الوصف المعماري للمشكلة:
يستخدم المشروع مكتبة `node:sqlite` عبر صنفها المتزامن:
```typescript
import { DatabaseSync } from 'node:sqlite';
```
في ملف [electron/main/database.ts](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/electron/main/database.ts).
تُنفذ جميع استعلامات قاعدة البيانات مباشرة في **Node.js Main Event Loop** الخاص بـ Electron Main Process.

#### الأثر السلبي:
1. **تجميد واجهة المستخدم (UI Frame Drops & Jank)**: عندما يقوم المستخدم بتصدير تقرير مالي ضخم، أو استيراد ملف Excel يحتوي على آلاف المنتجات، أو إنشاء كشف حساب سنوي، تتوقف دورة الأحداث في المعالج الرئيسي حتى ينتهي استعلام SQLite، مما يؤدي لتأخر استجابة نافذة التطبيق وشريط العنوان.
2. **انقطاع اتصالات الهاتف (Dropped LAN SSE Packets)**: خادم Fastify يعمل أيضاً على نفس المعالج الرئيسي، لذا فإن أي استعلام ثقيل يؤخر الرد على طلبات تطبيق الهاتف المحمول.

---

### الخطأ الثالث: غياب محرك هجرات احترافي لقاعدة البيانات (`Schema Evolution Debt`)

#### الوصف المعماري للمشكلة:
يتم إنشاء وتعديل بنية قاعدة البيانات عبر ملف واحد ضخم [electron/main/schema-init.ts](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/electron/main/schema-init.ts) (يتجاوز **33 كيلوبايت** و **900 سطر**!).
يعتمد الملف على أسلوب يدوي هش:
- تنفيذ `CREATE TABLE IF NOT EXISTS` لعشرات الجداول.
- استخدام عشرات الكتل من نمط `try { execute("ALTER TABLE ... ADD COLUMN ..."); } catch {}` لإضافة الأعمدة الجديدة.

#### الأثر السلبي:
1. **انعدام آلية التراجع (No Migration Rollbacks)**: في حال فشل تعديل جدول أثناء التحديث لدى العميل، تظل قاعدة البيانات في حالة هجينة تالفة.
2. **انعدام سجل التعديلات (No Migration Journaling / Locks)**: لا توجد آلية لمعرفة الإصدار الحالي لمخطط قاعدة البيانات أو تطبيق التعديلات التراكمية بترتيب زمني منضبط.
3. **صعوبة التطوير التشاركي**: أي إضافة لحقل جديد تتطلب تعديل ملف ضخم متعدد المسؤوليات.

---

### الخطأ الرابع: ثغرات الأمان والبروتوكول غير المشفر لخادم الشبكة المحلية (`LAN Plain HTTP`)

#### الوصف المعماري للمشكلة:
يعمل خادم Fastify الداخلي افتراضياً عبر بروتوكول **HTTP غير مشفر** على المنفذ `3000` (مستمعاً لجميع العناوين `0.0.0.0`) عبر ملف [electron/main/server/index.ts](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/electron/main/server/index.ts).

#### الأثر السلبي:
1. **نقل التوكن وبيانات الجلسات بنص واضح (Cleartext Credentials)**: تمر رموز الجلسات (`x-session-token`) وأرقام الـ PIN عبر شبكة الـ Wi-Fi المحلية غير المشفرة، مما يسمح لأي جهاز على الشبكة باعتراضها عبر تقنيات Packet Sniffing.
2. **غياب معدل الحماية من التخمين المتسلسل (No Brute-Force Rate Limiting)**: رغم وجود فحص لرمز الاتصال `connection_key`، لا توجد قيود صارمة على عدد المحاولات المتكررة لربط أجهزة دخيلة بالخادم المحلي.

---

### الخطأ الخامس: تباين تحديث الذاكرة المخبأة بين الهاتف وسطح المكتب (`Cache Invalidation Gaps`)

#### الوصف المعماري للمشكلة:
عندما يقوم مستخدم الهاتف بتعديل كمية منتج أو تغيير سعر بيع من خلال تطبيق الهاتف المحمول:
1. يستقبل خادم Fastify الطلب ويعدل قاعدة بيانات SQLite مباشرة.
2. يقوم الخادم باستدعاء `notifyTableChange(table)`.
3. يُرسل حدث IPC للواجهة `ipcRenderer.send('db:table-updated', ...)`.
4. **المشكلة**: لا ترتبط كل استعلامات React Query في الواجهة بهذا الحدث العام بشكل تلقائي وموثوق، مما يضطر بعض الشاشات في سطح المكتب للبقاء ببيانات قديمة (Stale Data) حتى يقوم المستخدم بالخروج والدخول مجدداً أو إعادة تحميل الصفحة يدوياً.

---

### الخطأ السادس: غياب الغلاف الموحد لأخطاء واستجابات IPC (`IPC Result Envelope Absence`)

#### الوصف المعماري للمشكلة:
تختلف قنوات IPC في طريقة إعادة النتائج:
- بعض القنوات تُرجع مصفوفات خالية `[]` عند الخطأ.
- بعض القنوات تُلقي استثناءات غير متوقعة `throw new Error(...)`.
- بعض القنوات تُرجع `{ error: 'string' }` أو كائنات مخصصة.

#### الأثر السلبي:
غياب عقد موحد يُلزم كافة القنوات بنمط:
```typescript
type IpcResponse<T> = 
  | { success: true; data: T; timestamp: string }
  | { success: false; error: { code: string; message: string; details?: unknown } };
```
مما يؤدي لكتابة كتل `try/catch` متكررة وغير متناسقة في طبقة الـ Frontend.

---

## 5. مصفوفة التقييم المعماري الشاملة (Architecture Scorecard)

| البعد المعماري | التقييم الحالي | الحالة | الملاحظات التقييمية |
| :--- | :---: | :---: | :--- |
| **الأداء والسرعة (Performance)** | **8.5 / 10** | 🟢 ممتاز | استخدام `node:sqlite` والتخزين المؤقت للاستعلامات أعطى سرعة استثنائية، يعيبه فقط تنفيذ الاستعلامات في Main Thread. |
| **التشغيل دون إنترنت (Offline Capability)** | **10 / 10** | 🟢 مثالي | اعتماد محلي كامل 100% دون أي تبعيات لخدمات خارجية أو سحابية. |
| **تنظيم كود الواجهة (Frontend Modularity)** | **9.0 / 10** | 🟢 ممتاز | تفكيك الصفحات الأحادية إلى طبقات Clean Architecture نقية وواضحة وسهلة الاختبار. |
| **هندسة طبقة البيانات (Data Layer Architecture)** | **6.0 / 10** | 🟡 يحتاج تحسين | الاعتماد على Dexie Proxy Shim يحجب قدرات SQL ويضيف حمل معالجة وتشفير مستمر. |
| **إدارة هجرات الجداول (Schema Migrations)** | **4.0 / 10** | 🔴 ضعيف | ملف أحادي ضخم (33KB) يعتمد على `ALTER TABLE` اليدوي داخل كتل try/catch بدون سجل تاريخي. |
| **التكامل مع الأجهزة المحمولة (Mobile LAN Sync)** | **8.5 / 10** | 🟢 ممتاز | ربط سريع ومبتكر عبر SSE و Fastify مع اكتشاف تلقائي mDNS و UDP. |
| **أمان الشبكة المحلية (Local LAN Security)** | **5.5 / 10** | 🟡 متوسط | بروتوكول HTTP غير مشفر، وغياب حماية Brute Force على محاولات الاقتران. |
| **اتساق إدارة الأخطاء (Error Handling Consistency)** | **6.5 / 10** | 🟡 متوسط | تباين استجابات IPC وحاجة الواجهة لمعالجات متباينة في كل خطاف. |

---

## 6. خطة التعديلات والتطوير المعماري المقترحة (Proposed Engineering Roadmap)

للارتقاء بتطبيق سطح المكتب إلى أقصى معايير الاستقرار والأداء المؤسسي، نقترح تنفيذ خارطة الطريق التالية على 5 مراحل:

---

### المرحلة 1: نقل عمليات SQLite الثقيلة إلى Worker Thread مخصص (Database Worker Offloading)

#### التعديل المقترح:
عزل استعلامات `node:sqlite` في **Worker Thread** منفصل في بيئة Electron:

```typescript
// electron/main/database-worker.ts
import { parentPort } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(dbPath);

parentPort?.on('message', ({ id, sql, params, method }) => {
  try {
    const stmt = db.prepare(sql);
    const result = stmt[method](...params);
    parentPort?.postMessage({ id, success: true, result });
  } catch (error) {
    parentPort?.postMessage({ id, success: false, error: (error as Error).message });
  }
});
```

#### العائد المعماري:
- بقاء المعالج الرئيسي لـ Electron حراً 100% للرندر وواجهة المستخدم وأحداث النظام.
- عدم تأثر خادم Fastify أو بث الباركود SSE بأي استعلامات تقارير مالية ثقيلة.

---

### المرحلة 2: ترحيل تدريجي من الـ Dexie Proxy Shim إلى مستودعات البيانات المباشرة (Typed Repositories)

#### التعديل المقترح:
بدلاً من محاكاة Dexie عبر `src/lib/db.ts` وتحويل المفاتيح النصية في كل عملية:
1. بناء طبقة **Typed Repositories**:
   ```typescript
   // src/infrastructure/repositories/productRepository.ts
   export const productRepository = {
     list: (params: ProductFilterParams) => window.electronAPI.products.list(params),
     getById: (id: string) => window.electronAPI.products.get(id),
     getByBarcode: (code: string) => window.electronAPI.products.getByBarcode(code),
     updateStock: (id: string, newStock: number) => window.electronAPI.products.updateStock(id, newStock),
   };
   ```
2. تمكين استعلامات SQL الغنية عبر IPC بدلاً من جلب الجداول كاملة والتصفية في JavaScript.
3. التخلص التدريجي من نداءات `db.table.toArray()` التي تسحب بيانات ضخمة دون داعٍ.

---

### المرحلة 3: اعتماد محرك هجرات منظم لقاعدة البيانات (Drizzle Kit Schema Migrations)

#### التعديل المقترح:
1. استبدال ملف [electron/main/schema-init.ts](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/electron/main/schema-init.ts) اليدوي بمحرك هجرات Drizzle Kit الرسمي.
2. توليد ملفات SQL migration مرقمة زمنياً (`0001_initial.sql`, `0002_add_discount_tiers.sql`).
3. تشغيل `migrator.run()` عند إقلاع Electron مع قفل المعاملات (Migration Lock)، وجدول داخلي `__drizzle_migrations` لتسجيل الإصدار المطبق بدقة متناهية.

---

### المرحلة 4: ناقل أحداث مركزي لتحديث كاش React Query تلقائياً (Reactive Query Bus)

#### التعديل المقترح:
ربط مستمع الحدث الموحد [db:table-updated](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/electron/preload/index.ts) بـ QueryClient المركزي:

```typescript
// src/lib/queryClientSync.ts
import { queryClient } from './queryClient';

const TABLE_QUERY_KEY_MAP: Record<string, string[]> = {
  products: ['products', 'inventory', 'quickPOS'],
  sales: ['sales', 'dashboardStats', 'cashSessions'],
  customers: ['customers', 'debts', 'statements'],
  suppliers: ['suppliers', 'invoices'],
  packs: ['packs', 'favorites'],
};

export function setupQuerySyncBridge() {
  window.electronAPI?.db?.onTableUpdated(({ table }) => {
    const affectedKeys = TABLE_QUERY_KEY_MAP[table];
    if (affectedKeys) {
      affectedKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    }
  });
}
```

#### العائد المعماري:
- تحديث فوري لكافة شاشات سطح المكتب بمجرد قيام الهاتف المحمول بأي عملية بيع أو جرد أو تعديل سعر.

---

### المرحلة 5: تأمين وتشفير قنوات الاتصال المحلي (LAN Hardening)

#### التعديل المقترح:
1. **تشفير الاتصال الداخلي**: توليد شهادة SSL ذاتية التوقيع (Self-signed Certificate) داخل Electron عند أول تشغيل، وفرض بروتوكول **HTTPS** و **WSS (Secure WebSockets)** بين تطبيق الهاتف وخادم سطح المكتب.
2. **تحديد معدل المحاولات (Rate Limiter)**: تفعيل `@fastify/rate-limit` على مسارات الاقتران `/api/pair` لحظر أي محاولة تخمين لكود الاقتران السريع.

---

## 7. الخلاصة والتوصيات الهندسية النهائية (Final Architectural Conclusion)

يمتلك تطبيق سطح المكتب **AN POS** أساساً برمجياً صلباً وعصرياً للغاية؛ حيث استطاع الجمع بين سرعة المحرك المحلي `node:sqlite`، وحداثة واجهات **React 19** المعمارية النظيفة، وميزة الاتصال اللاسلكي اللحظي بالهاتف المحمول دون إنترنت.

تتركز الخطوة التالية للتطوير المؤسسي في:
1. **التخلص من عبء الـ Dexie Proxy Shim** لصالح استعلامات SQL ومستودعات صريحة.
2. **عزل استعلامات SQLite في Worker Thread** لمنع أي تجميد للمعالج الرئيسي نهائياً.
3. **تنظيم هجرات قاعدة البيانات** عبر Drizzle Kit لضمان تحديثات آمنة لقواعد بيانات العملاء.
4. **تفعيل ناقل المزامنة المركزي** لضمان تطابق لحظي بين الهاتف وسطح المكتب.
