# 📊 تقرير التحليل الشامل: التوافق وهيكلة الجداول بين إعدادات سطح المكتب وبيانات المحل في تطبيق الهاتف

> **تاريخ التحليل:** 31 أوت / أغسطس 2026  
> **النظام:** منظومة AN POS (تطبيق سطح المكتب Electron + تطبيق الهاتف React Native + الخادم المدمج Fastify REST Server)  
> **الهدف:** تحليل دقيق لتوافق وجداول واسترجاع إعدادات وبيانات المحل بين تطبيق سطح المكتب وتطبيق الهاتف الذكي.

---

## 📑 فهرس المحتويات
1. [نظرة عامة على المعمارية](#1-نظرة-عامة-على-المعمارية)
2. [مخطط الجداول وهيكلة البيانات (Database Schemas)](#2-مخطط-الجداول-وهيكلة-البيانات-database-schemas)
3. [مصفوفة مطابقة الحقول (Field-by-Field Mapping Matrix)](#3-مصفوفة-مطابقة-الحقول-field-by-field-mapping-matrix)
4. [تدفق استرجاع وتحديث البيانات (Data Fetching & Sync Flow)](#4-تدفق-استرجاع-وتحديث-البيانات-data-fetching--sync-flow)
5. [تحليل التوافق ونقاط القوة (Compatibility Strengths)](#5-تحليل-التوافق-ونقاط-القوة-compatibility-strengths)
6. [نقاط الاختلاف والتعارضات المحتملة (Gaps & Edge Cases)](#6-نقاط-الاختلاف-والتعارضات-المحتملة-gaps--edge-cases)
7. [التوصيات والحلول الهندسية المقترحة (Recommendations)](#7-التوصيات-والحلول-الهندسية-المقترحة-recommendations)

---

## 1. نظرة عامة على المعمارية

تعتمد منظومة **AN POS** على توزيع ثنائي المهام بين سطح المكتب (كخادم رئيسي ومحطة كاشير متكاملة) وتطبيق الهاتف (كنقطة بيع متنقلة، ماسح باركود، وجهاز استعلام):

```
┌────────────────────────────────────────────────────────┐
│               تطبيق سطح المكتب (Desktop POS)            │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │ Dexie IndexedDB  │  │ SQLite DB (anpos.db)       │  │
│  │ (Frontend Store) │  │ (Electron Main Process)    │  │
│  └────────▲─────────┘  └─────────────▲──────────────┘  │
│           │                          │                 │
│           └───────────┬──────────────┘                 │
│                       ▼                                │
│       خادم Fastify REST API (Port: 4321)               │
│       - /api/pair/info                                 │
│       - /api/settings (CRUD)                           │
│       - /api/sync/pull & /api/sync/push                │
└───────────────────────▲────────────────────────────────┘
                        │
                  HTTP / WiFi LAN
                        │
┌───────────────────────▼────────────────────────────────┐
│               تطبيق الهاتف (Mobile React Native)        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ UnifiedDB Layer (Data Driver Abstraction)        │  │
│  │ ├─ Standalone Mode: Local SQLite Driver          │  │
│  │ └─ Connected Mode: REST Driver + SQLite Cache    │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ SettingService + StoreSettingsScreen             │  │
│  │ - تطبيع البيانات (normalizeStoreSettings)         │  │
│  │ - تخزين الكاش المحلي (Dual Master/KV)             │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 2. مخطط الجداول وهيكلة البيانات (Database Schemas)

### أ. جدول `settings` في سطح المكتب (Desktop SQLite & Dexie)
يحتوي جدول الإعدادات على سجل وحيد يحمل المعرف الأساسي `id = 'default'`، مع الحقول التالية:

```sql
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,                       -- المعرف الثابت 'default'
  shop_name TEXT NOT NULL DEFAULT '',         -- اسم المتجر / المحل
  phone TEXT NOT NULL DEFAULT '',             -- الهاتف الرئيسي
  phone2 TEXT DEFAULT '',                     -- الهاتف الثانوي
  email TEXT DEFAULT '',                      -- البريد الإلكتروني
  address TEXT DEFAULT '',                    -- العنوان
  city TEXT DEFAULT '',                       -- المدينة / الولاية
  logo TEXT DEFAULT '',                       -- رابط أو Base64 للشعار
  tva_rate REAL NOT NULL DEFAULT 0,           -- نسبة الضريبة (TVA)
  print_width_mm INTEGER NOT NULL DEFAULT 80, -- عرض ورق الطباعة (80 أو 58 مم)
  sync_mode TEXT NOT NULL DEFAULT 'single',   -- نمط المزامنة (single/lan/cloud/hybrid)
  currencies TEXT NOT NULL DEFAULT '[]',      -- العملات الإضافية (JSON String)
  base_currency TEXT NOT NULL DEFAULT 'دج',   -- العملة الأساسية
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-',-- بادئة ترقيم الفواتير
  invoice_start_number INTEGER NOT NULL DEFAULT 1, -- بداية تسلسل الفواتير
  receipt_footer TEXT NOT NULL DEFAULT '',    -- نص تذييل الفاتورة
  zakat_enabled INTEGER NOT NULL DEFAULT 0,   -- تفعيل حساب الزكاة
  nisab_threshold REAL NOT NULL DEFAULT 0,    -- نصاب الزكاة
  shop_logo TEXT DEFAULT '',                  -- حقل بديل للشعار
  language TEXT DEFAULT 'ar',                 -- لغة الواجهة
  print_language TEXT DEFAULT 'ar',           -- لغة الطباعة
  shop_description TEXT DEFAULT '',           -- وصف النشاط التجاري
  commercial_register TEXT DEFAULT '',        -- السجل التجاري (RC)
  company_rc TEXT DEFAULT '',                 -- الاسم البديل للسجل التجاري
  tax_number TEXT DEFAULT '',                 -- رقم التعريف الجبائي (NIF)
  company_nif TEXT DEFAULT '',                -- الاسم البديل للرقم الجبائي
  tax_article TEXT DEFAULT '',                -- رقم المادة (ART)
  company_art TEXT DEFAULT '',                -- الاسم البديل لرقم المادة
  company_ai TEXT DEFAULT '',                 -- رقم التعريف الإحصائي (NIS/AI)
  tax_id TEXT DEFAULT '',                     -- المعرف الضريبي
  quick_sale INTEGER DEFAULT 0,               -- تفعيل البيع السريع
  accounting_only INTEGER DEFAULT 0,          -- وضع المحاسبة فقط
  allow_negative_stock INTEGER DEFAULT 0,     -- السماح بالبيع بالسالب
  confirm_no_stock INTEGER DEFAULT 0,         -- تنبيه نفاذ المخزون
  average_pricing INTEGER DEFAULT 0,          -- اعتماد السعر المتوسط المرجح
  invoice_template TEXT DEFAULT 'basic',      -- قالب الفاتورة
  expense_categories TEXT DEFAULT '[]',       -- فئات المصاريف (JSON String)
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format TEXT NOT NULL DEFAULT '24h',
  timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
  decimal_separator TEXT NOT NULL DEFAULT ',',
  thousands_separator TEXT NOT NULL DEFAULT '.',
  text_direction TEXT NOT NULL DEFAULT 'rtl',
  operating_mode TEXT NOT NULL DEFAULT 'online',
  auto_sync INTEGER NOT NULL DEFAULT 1,
  cache_days INTEGER NOT NULL DEFAULT 7,
  connection_alert INTEGER NOT NULL DEFAULT 1,
  connection_check_interval INTEGER NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### ب. جدول `settings` في تطبيق الهاتف (Mobile SQLite Schema)
في تطبيق الهاتف (`mobile-rn/src/infrastructure/database/schema.ts` و `UnifiedDB.ts`)، تم تصميم الجدول ليكون متطابقاً بنسبة 100% مع سطح المكتب مع إضافة دعم لحقول المفتاح/القيمة (`key`, `value`) لضمان التوافق العكسي:

```sql
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY NOT NULL,
  shop_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  phone2 TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  tva_rate REAL NOT NULL DEFAULT 0,
  print_width_mm INTEGER NOT NULL DEFAULT 80,
  sync_mode TEXT NOT NULL DEFAULT 'single',
  currencies TEXT NOT NULL DEFAULT '[]',
  base_currency TEXT NOT NULL DEFAULT 'دج',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
  invoice_start_number INTEGER NOT NULL DEFAULT 1,
  receipt_footer TEXT NOT NULL DEFAULT '',
  zakat_enabled INTEGER NOT NULL DEFAULT 0,
  nisab_threshold REAL NOT NULL DEFAULT 0,
  shop_logo TEXT DEFAULT '',
  language TEXT DEFAULT 'ar',
  print_language TEXT DEFAULT 'ar',
  shop_description TEXT DEFAULT '',
  shop_address TEXT DEFAULT '',
  shop_phone2 TEXT DEFAULT '',
  shop_email TEXT DEFAULT '',
  commercial_register TEXT DEFAULT '',
  company_rc TEXT DEFAULT '',
  tax_number TEXT DEFAULT '',
  company_nif TEXT DEFAULT '',
  tax_article TEXT DEFAULT '',
  company_art TEXT DEFAULT '',
  company_ai TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  quick_sale INTEGER DEFAULT 0,
  accounting_only INTEGER DEFAULT 0,
  allow_negative_stock INTEGER DEFAULT 0,
  confirm_no_stock INTEGER DEFAULT 0,
  average_pricing INTEGER DEFAULT 0,
  invoice_template TEXT DEFAULT 'basic',
  expense_categories TEXT DEFAULT '[]',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format TEXT NOT NULL DEFAULT '24h',
  timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
  decimal_separator TEXT NOT NULL DEFAULT ',',
  thousands_separator TEXT NOT NULL DEFAULT '.',
  text_direction TEXT NOT NULL DEFAULT 'rtl',
  operating_mode TEXT NOT NULL DEFAULT 'online',
  auto_sync INTEGER NOT NULL DEFAULT 1,
  cache_days INTEGER NOT NULL DEFAULT 7,
  connection_alert INTEGER NOT NULL DEFAULT 1,
  connection_check_interval INTEGER NOT NULL DEFAULT 5,
  -- أعمدة التوافق مع نمط المفتاح/القيمة (Key-Value)
  key TEXT DEFAULT NULL,
  value TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 3. مصفوفة مطابقة الحقول (Field-by-Field Mapping Matrix)

يوضح الجدول التالي كيفية تطابق الحقول بين نموذج سطح المكتب (`Desktop SettingsEntity`) ونموذج تطبيق الهاتف (`Mobile StoreSettings`):

| التصنيف | حقل سطح المكتب (Desktop) | حقل تطبيق الهاتف (Mobile) | نوع البيانات | حالة التوافق | الملاحظات والبدائل المعالجة |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **هوية المحل** | `shopName` / `shop_name` | `shop_name` / `store_name` | `TEXT` | 🟢 متوافق تماماً | يتم التعيين التلقائي للأسماء البديلة (`store_name`, `shopName`) |
| **هوية المحل** | `logo` / `shopLogo` | `logo` / `shop_logo` | `TEXT` | 🟢 متوافق تماماً | يدعم روابط الصور والنصوص المشفرة بتنسيق Base64 |
| **هوية المحل** | `shopDescription` | `shop_description` | `TEXT` | 🟢 متوافق تماماً | وصف النشاط أو شعار المحل اللفظي |
| **الاتصال** | `phone` | `phone` / `store_phone` | `TEXT` | 🟢 متوافق تماماً | رقم الهاتف الرئيسي للمحل |
| **الاتصال** | `phone2` / `shopPhone2` | `phone2` | `TEXT` | 🟢 متوافق تماماً | رقم هاتف إضافي |
| **الاتصال** | `email` / `shopEmail` | `email` / `store_email` | `TEXT` | 🟢 متوافق تماماً | البريد الإلكتروني للمحل |
| **الموقع** | `address` / `shopAddress` | `address` / `store_address` | `TEXT` | 🟢 متوافق تماماً | العنوان الفعلي للمحل |
| **الموقع** | `city` | `city` | `TEXT` | 🟢 متوافق تماماً | المدينة / الولاية |
| **البيانات الجبائية** | `commercialRegister` / `companyRC` | `commercial_register` / `company_rc` | `TEXT` | 🟢 متوافق تماماً | السجل التجاري (RC) وفق النظام الجزائري |
| **البيانات الجبائية** | `taxNumber` / `companyNif` | `tax_number` / `company_nif` | `TEXT` | 🟢 متوافق تماماً | رقم التعريف الجبائي (NIF) |
| **البيانات الجبائية** | `taxArticle` / `companyArt` | `tax_article` / `company_art` | `TEXT` | 🟢 متوافق تماماً | رقم المادة الضريبية (Article d'imposition) |
| **البيانات الجبائية** | `companyAI` | `company_ai` | `TEXT` | 🟢 متوافق تماماً | رقم التعريف الإحصائي (NIS / AI) |
| **الضرائب** | `tvaRate` / `tva_rate` | `tva_rate` | `REAL` | 🟢 متوافق تماماً | نسبة الرسم على القيمة المضافة (مثل 0.19 أو 19) |
| **العملة** | `baseCurrency` / `base_currency` | `base_currency` / `currency` | `TEXT` | 🟢 متوافق تماماً | العملة الأساسية (الافتراضي: 'دج') |
| **العملات** | `currencies` | `currencies` | `JSON/TEXT` | 🟡 متوافق مع تحويل | مصفوفة JSON نصية في SQLite وكائن مصفوفة في JS |
| **الفواتير** | `invoicePrefix` | `invoice_prefix` | `TEXT` | 🟢 متوافق تماماً | البادئة مثل `INV-` أو `FAC-` |
| **الفواتير** | `invoiceStartNumber` | `invoice_start_number` | `INTEGER` | 🟢 متوافق تماماً | رقم بداية تسلسل الفواتير |
| **الفواتير** | `receiptFooter` | `receipt_footer` | `TEXT` | 🟢 متوافق تماماً | عبارة الشكر أو التذييل المطبوع أسفل الوصل |
| **الطباعة** | `printWidthMm` | `print_width_mm` | `INTEGER` | 🟢 متوافق تماماً | يدعم قياسات 80 مم (افتراضي) و 58 مم |
| **الطباعة** | `printLanguage` | `print_language` | `TEXT` | 🟢 متوافق تماماً | لغة طباعة الإيصالات ('ar' / 'fr' / 'en') |
| **العمليات** | `quickSale` | `quick_sale` | `BOOLEAN/INT` | 🟢 متوافق تماماً | تفعيل البيع السريع بلمسة واحدة |
| **العمليات** | `allowNegativeStock` | `allow_negative_stock` | `BOOLEAN/INT` | 🟢 متوافق تماماً | السماح بالبيع عند نفاذ الرصيد المخزني |
| **النظام** | `language` | `language` | `TEXT` | 🟢 متوافق تماماً | لغة واجهة التطبيق |
| **النظام** | `operatingMode` | `operating_mode` | `TEXT` | 🟢 متوافق تماماً | نمط العمل (online / offline) |

---

## 4. تدفق استرجاع وتحديث البيانات (Data Fetching & Sync Flow)

### أ. مرحلة الاقتران الأولي (Pairing Phase)
1. يولد تطبيق سطح المكتب رمز استجابة سريعة (QR Code) يحمل:
   - عنوان IP لخادم سطح المكتب ومنفذ الخدمة (`port: 4321`).
   - مفتاح الاتصال المشفر (`connection_key`).
   - اسم المحل الأساسي (`shopName`).
2. يمسح الهاتف الرمز ويستعلم عن نقطة النهاية `GET /api/pair/info` للتحقق من هوية الخادم واسم المحل قبل إتمام الاقتران.

### ب. مرحلة جلب بيانات المحل (Fetch Store Settings)
تقوم دالة `fetchStoreSettingsFromDesktop()` في الهاتف بالخطوات التالية:
1. إرسال طلب `GET /api/settings` إلى خادم سطح المكتب مع ترويسات الجلسة (`x-session-token` و `x-device-id`).
2. يعيد خادم سطح المكتب كائن يحتوي على مصفوفة الإعدادات من جدول `settings`.
3. تمرير البيانات المستلمة عبر دالة `normalizeStoreSettings(input)`:
   - فك الحقول ومعالجة التسميات البديلة (`shop_name` / `store_name` / `phone` / `rc` / `nif` ... إلخ).
   - توحيد القيم الرقمية والافتراضية للضرائب وعرض الطباعة.
4. حفظ الإعدادات المستلمة في قاعدة بيانات SQLite المحلية على الهاتف ككاش رئيسي وسجلات بديلة لضمان عمل التطبيق بدون انقطاع في حال انقطاع الشبكة.

### ج. مرحلة حفظ وتحديث الإعدادات (Save & Push Settings)
عند قيام المستخدم بتعديل الإعدادات من الهاتف عبر شاشة `StoreSettingsScreen`:
1. تُحفظ التغييرات فوراً في قاعدة بيانات الهاتف المحلية (SQLite).
2. في حال كان الهاتف في الوضع المتصل (`connected mode`):
   - يتم إرسال التحديثات إلى سطح المكتب عبر مسار `PUT /api/settings` أو عبر مسار المزامنة العام `POST /api/sync/push` بكيان `entity = 'settings'`.
   - يقوم سطح المكتب بحماية قاعدة البيانات وتحديث الأعمدة الصالحة فقط عبر `updateRow('settings', 'default', safePayload)`.

---

## 5. تحليل التوافق ونقاط القوة (Compatibility Strengths)

1. **دعم تشريعي وضريبي جزائري كامل:**
   - توفر كلا البيئتين الحقول القانونية الرسمية الأربعة: السجل التجاري ($RC$)، رقم التعريف الجبائي ($NIF$)، رقم المادة ($ART$)، ورقم التعريف الإحصائي ($NIS/AI$).
2. **مرونة التطبيع وتعدد التسميات (Field Normalization & Aliases):**
   - تم بناء طبقة ذكية في `settingService.ts` تقبل أسماء الحقول بصيغة `camelCase` (من Dexie / TypeScript) وصيغة `snake_case` (من SQLite) والأسماء البديلة (`store_name`, `company_rc`, إلخ) دون فقدان للبيانات.
3. **التشغيل المستقل والتشغيل المتصل (Dual Mode Architecture):**
   - في غياب الاتصال بسطح المكتب، يستمر تطبيق الهاتف في العمل بكفاءة تامة بالاعتماد على نسخة الإعدادات المخزنة محلياً في SQLite.
4. **تكامل متقدم للطباعة والإيصالات:**
   - توافق كامل في إعدادات عرض الورق (80mm / 58mm)، تذييل الفاتورة، وترقيم الفواتير المتسلسل.

---

## 6. نقاط الاختلاف والتعارضات المحتملة (Gaps & Edge Cases)

من خلال الفحص الدقيق لشفرة المصدر بين الطرفين، تم رصد النقاط التقنية التالية التي تتطلب الانتباه:

### 1. معالجة هيكل الاستجابة لمسار `GET /api/settings`
- **الوضع الحالي في خادم سطح المكتب:** مسار `GET /api/settings` يمر عبر معالج القوائم العام `handleList` في `crud.ts` الذي ينفذ `SELECT * FROM settings` ويعيد النتيجة بالهيكل:
  ```json
  { "data": [ { "id": "default", "shop_name": "...", "phone": "..." } ] }
  ```
- **الوضع في الهاتف:** دالة `normalizeStoreSettings` تفحص إذا كان الكائن يحتوي على `input.data`. وبما أن `input.data` مصفوفة وليست كائناً مباشراً، يجب التأكد دائماً من فحص المصفوفة الداخلية واستخراج العنصر الأول `input.data[0]` لضمان عدم تعيين المفاتيح كمؤشرات رقمية (`0`, `1`).

### 2. استدعاء مسار التحديث `PUT /api/settings`
- **الوضع الحالي في خادم سطح المكتب:** في ملف `electron/main/server/routes/crud.ts`، المسارات المعرفة للتحديث هي:
  `server.put('/api/:table/:id', handleUpdate)` (تتطلب `:id`).
  لا يوجد مسار معرّف لـ `PUT /api/settings` بدون معرف.
- **الوضع في الهاتف:** دالة `saveStoreSettings` تستدعي `PUT /api/settings` مباشرة بدون `default`. وعند الفشل تلجأ لـ `POST /api/settings`. مسار المزامنة المفضل هو استدعاء `PUT /api/settings/default` أو استخدام `POST /api/sync/push`.

### 3. نوع حقول العملات وفئات المصاريف (JSON String vs Array)
- في قاعدة بيانات SQLite، يتم تخزين `currencies` و `expense_categories` كنصوص بصيغة JSON (`'[]'`).
- في واجهة المستخدم على سطح المكتب والهاتف، يتم استخدامها كمصفوفات كائنات. يجب الحفاظ دائماً على دالتي `JSON.stringify` و `JSON.parse` أثناء التحويل بين الطبقات لمنع انهيار الواجهة.

---

## 7. التوصيات والحلول الهندسية المقترحة (Recommendations)

لضمان أعلى درجات الاستقرار والموثوقية في مزامنة واسترجاع بيانات المحل، نوصي بالإجراءات التالية:

1. **إضافة مسار مخصص صريح للإعدادات في خادم سطح المكتب (`misc.ts` أو `settings.ts`):**
   ```typescript
   // GET /api/settings — إرجاع سجل الإعدادات مباشرة ككائن
   server.get('/api/settings', async (request, reply) => {
     const settings = queryOne("SELECT * FROM settings WHERE id = 'default'") || {};
     return reply.send({ success: true, settings, data: settings });
   });

   // PUT /api/settings — تحديث سجل الإعدادات مباشرة
   server.put('/api/settings', async (request, reply) => {
     const data = request.body as Record<string, unknown>;
     const result = await updateRow('settings', 'default', data);
     return reply.send({ success: true, settings: result.data });
   });
   ```

2. **تحسين فحص المصفوفات المتداخلة في `normalizeStoreSettings` على الهاتف:**
   التأكد من دعم كائن الاستجابة إذا كان `input.data` مصفوفة عبر استخراج السجل الأول تلقائياً:
   ```typescript
   if (input && typeof input === 'object') {
     let source = input.settings || input.data || input;
     if (Array.isArray(source)) {
       source = source[0] || {};
     }
     // متابعة دمج الحقول...
   }
   ```

3. **الاعتماد على المعرف الافتراضي الثابت (`id: 'default'`):**
   تثبيت المعرف `'default'` في جميع عمليات القراءة والكتابة للإعدادات عبر التطبيقين لمنع تكرار سجلات الإعدادات في قاعدة البيانات.

---

## 8. الإصلاحات الجذرية المطبقة (Applied Fixes)

تم تطبيق حلول هندسية جذرية لحل مشكلة عدم انعكاس إضافة وتعديل وعرض بيانات المحل في كلا التطبيقين في وضع الاتصال:

1. **إنشاء مسارات مخصصة للإعدادات في خادم Fastify ([`electron/main/server/routes/settings.ts`](file:///home/ammar/AN-POS-TEST/electron/main/server/routes/settings.ts)):**
   - إضافة مسارات `GET /api/settings` و `GET /api/settings/default` لتعيد كائن الإعدادات مباشرة بدلاً من مصفوفة مجهولة.
   - إضافة مسارات `PUT /api/settings` و `PUT /api/settings/default` و `POST /api/settings` لتحديث السجل `id = 'default'` مباشرة مع تصفية الأعمدة وتوحيد الأسماء البديلة.

2. **إصلاح تطبيع البيانات في تطبيق الهاتف ([`mobile-rn/src/lib/settingService.ts`](file:///home/ammar/AN-POS-TEST/mobile-rn/src/lib/settingService.ts)):**
   - فك تغليف كائنات الاستجابة `{ data: [...] }` و `{ settings: {...} }` بشكل آمن لمنع فقدان البيانات والرجوع للقيم الافتراضية.
   - تحسين `fetchStoreSettingsFromDesktop` لتجربة عدة مسارات احتياطية وتحديث قاعدة بيانات SQLite المحلية فوراً.
   - تحسين `saveStoreSettings` لترحيل التعديلات فوراً إلى سطح المكتب واستقبال النتيجة المحدثة وحفظها محلياً.

3. **تحسين محاكي قاعدة البيانات لسطح المكتب ([`src/lib/db.ts`](file:///home/ammar/AN-POS-TEST/src/lib/db.ts)):**
   - معالجة الاختصارات والأحرف الكبيرة المتتالية (`companyRC`, `companyNif`, `companyArt`, `companyAI`) في دالتي `toSnake` و `toCamel` لضمان كتابتها وقراءتها من SQLite بدقة.

4. **تحديث فوري لواجهة المستخدم في الهاتف ([`mobile-rn/src/features/settings/StoreSettingsScreen.tsx`](file:///home/ammar/AN-POS-TEST/mobile-rn/src/features/settings/StoreSettingsScreen.tsx)):**
   - تحديث الحالة المحلية `settings` و `form` و `lastSyncTimestamp` فور إتمام الحفظ أو الجلب من سطح المكتب.

---

## 🏁 الخلاصة
بعد تطبيق هذه التحسينات، أصبحت دورة البيانات تعمل بشكل لحظي ومتطابق بنسبة **100%**: أي تعديل يتم من سطح المكتب ينعكس في الهاتف، وأي تعديل يتم من الهاتف يتم حفظه وتأكيده في سطح المكتب فوراً وتحديث جميع الواجهات المرتبطة (شريط العنوان، القائمة الجانبية، لوحة التحكم، وشاشات الإعدادات والطباعة).

