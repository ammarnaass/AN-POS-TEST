# خطة تنفيذ وحدة طباعة الفواتير وقوالب الطباعة المتقدمة

**POS-PRINT-001 | V1 | المدة: 12-14 أسبوع**

---

## 📊 ملخص المشروع

| البند | التفاصيل |
|-------|----------|
| المعرّف | POS-PRINT-001 |
| الوحدة | نقطة البيع (POS) → الطباعة والفواتير |
| الإصدار | V1 |
| المدة التقديرية | 12-14 أسبوع (~97 يوم) |
| إجمالي الساعات | 464 ساعة |
| تاريخ البدء | 2026-07-06 |
| تاريخ الانتهاء | 2026-10-11 |
| عدد الـ Sprints | 8 |

---

## 🏗️ تحليل الوضع الحالي — ما تم تنفيذه فعلياً

> ⚠️ **تنبيه واقعي**: الكود الموجود يغطي أكثر من **80%** من الخطة أدناه. ما تبقى يمكن إنهاؤه في **1-2 أسبوع** وليس 12-14.

| Sprint | الحالة | ملاحظات |
|--------|--------|---------|
| **Sprint 1** التأسيس وقاعدة البيانات | ✅ منفّذ بالكامل | `print_templates` + `template_assignments` + `print_history` موجودة في Dexie و SQLite |
| **Sprint 2** محرك القوالب | ✅ منفّذ بالكامل | Block-based engine في `renderTemplate.ts`، يدعم Text/Image/Row/Column/Table/Separator/QR/Barcode |
| **Sprint 3** القوالب الافتراضية | ✅ منفّذ بالكامل | Thermal 80mm، A4، A5 في `defaultTemplates.ts` |
| **Sprint 4** واجهة تخصيص القوالب | ✅ 80% منفّذ | `TemplateEditor.tsx` كامل بتبويبات الإعدادات/المظهر/العناصر/المعاينة، لكن **المعاينة المباشرة غير مكتملة** |
| **Sprint 5** تكامل الطباعة | ✅ منفّذ بالكامل | `printService.ts` + API endpoints + `PrintPreviewModal.tsx` + `ReprintModal.tsx` |
| **Sprint 6** QR Code والباركود | ✅ منفّذ | QR placeholder مع CDN، Barcode SVG |
| **Sprint 7** الصلاحيات والأمان | ✅ منفّذ بالكامل | `permissions.ts` + Middleware + Business Rules |
| **Sprint 8** الاختبار والتحسين | ✅ 70% منفّذ | 6 ملفات اختبار (588 سطر)، ينقصها UAT والتوثيق |

### الملفات المنفّذة:

#### Frontend (`src/`)
- `src/types/invoicePrint.ts` — Types
- `src/services/print/renderTemplate.ts` — Template Engine
- `src/services/print/defaultTemplates.ts` — Default Templates
- `src/services/print/printService.ts` — Print Service
- `src/services/print/templateService.ts` — Template CRUD
- `src/services/print/permissions.ts` — Permissions
- `src/services/print/paperSizes.ts` — Paper Sizes
- `src/services/print/usePrint.ts` — React Hooks
- `src/services/print/__tests__/` — 6 test files
- `src/components/print/TemplateEditor.tsx` — Editor (ناقص Live Preview)
- `src/components/print/PrintPreviewModal.tsx` — Preview Modal
- `src/components/print/ReprintModal.tsx` — Reprint Modal
- `src/components/print/PrintHistoryPanel.tsx` — History Panel
- `src/components/print/TemplateAssignmentManager.tsx` — Assignment Manager
- `src/features/print/PrintTemplatesPage.tsx` — Full Page

#### Backend (`server/`)
- `server/src/print/print.routes.ts` — 11 REST endpoints

### البنود المتبقية:
1. إكمال **Live Preview** في TemplateEditor (ربطه بـ `previewDocument` مع بيانات تجريبية)
2. اختبارات UAT
3. توثيق فني + توثيق مستخدم
4. (اختياري) طباعة مباشرة ESC/POS في الإصدار V2

---

## 🗓️ خارطة الزمنية — الأصلية

```
Sprint 1  [████████████]  التأسيس وتصميم قاعدة البيانات     06/07 → 19/07
Sprint 2  [████████████]  محرك القوالب الأساسي              20/07 → 02/08
Sprint 3  [████████████]  القوالب الافتراضية                  03/08 → 16/08
Sprint 4  [████████████]  واجهة تخصيص القوالب                 17/08 → 30/08
Sprint 5  [████████████]  تكامل الطباعة                       31/08 → 13/09
Sprint 6  [██████]      QR Code والباركود                   14/09 → 20/09
Sprint 7  [██████]      الصلاحيات والأمان                     21/09 → 27/09
Sprint 8  [████████████]  الاختبار والتحسين                   28/09 → 11/10
```

---

## 🏗️ Sprint 1: التأسيس وتصميم قاعدة البيانات
**المدة: أسبوعان (06/07/2026 → 19/07/2026) | إجمالي الساعات: 48 ساعة**
> ✅ **منفّذ بالكامل**

### 🎯 الأهداف
- تصميم وإنشاء قاعدة البيانات
- إعداد بيئة التطوير
- تعريف الهيكل الأساسي للمشروع

### 🗄️ هيكل قاعدة البيانات (ERD)

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│     users       │     │   print_templates   │     │   template_     │
│                 │     │                     │     │   assignments   │
├─────────────────┤     ├─────────────────────┤     ├─────────────────┤
│ id (PK)         │◄────┤ created_by (FK)     │     │ id (PK)         │
│ name            │     │ id (PK)             │     │ document_type   │
│ role            │     │ name                │     │ template_id(FK) │
│ ...             │     │ description         │     │ is_default      │
└─────────────────┘     │ paper_size          │     │ created_at      │
                        │ orientation         │     └─────────────────┘
                        │ header_config (JSON)│            │
                        │ body_config (JSON)  │            ▼
                        │ footer_config (JSON)│     ┌─────────────────┐
                        │ styles (JSON)       │     │ print_templates │
                        │ is_default          │     │ (referenced)    │
                        │ is_system           │     └─────────────────┘
                        │ created_at          │
                        │ updated_at          │
                        └──────────────────────────┐
                                 │                 │
                                 ▼                 ▼
                        ┌─────────────────────┐
                        │   print_history     │
                        ├─────────────────────┤
                        │ id (PK)             │
                        │ invoice_id (FK)     │
                        │ template_id (FK)    │
                        │ printed_by (FK)     │
                        │ printed_at          │
                        │ copies              │
                        │ printer_name        │
                        │ print_status        │
                        │ error_message       │
                        └─────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────────┐
                        │ template_visibilities│
                        ├─────────────────────┤
                        │ id (PK)             │
                        │ template_id (FK)    │
                        │ element_name        │
                        │ is_visible          │
                        │ display_order       │
                        └─────────────────────┘
```

### 📋 تفاصيل الجداول

#### جدول print_templates

| العمود | النوع | Nullable | Default | وصف |
|--------|-------|----------|---------|-----|
| id | UUID | لا | auto | المفتاح الأساسي |
| name | VARCHAR(255) | لا | - | اسم القالب |
| description | TEXT | نعم | - | وصف القالب |
| paper_size | ENUM | لا | - | 80mm, A4, A5, custom |
| orientation | ENUM | لا | portrait | portrait/landscape |
| header_config | JSON | لا | {} | إعدادات الترويسة |
| body_config | JSON | لا | {} | إعدادات الجسم |
| footer_config | JSON | لا | {} | إعدادات التذييل |
| styles | JSON | لا | {} | CSS styles |
| is_default | BOOLEAN | نعم | false | هل هو القالب الافتراضي |
| is_system | BOOLEAN | نعم | false | قالب نظام (غير قابل للحذف) |
| created_by | UUID | نعم | - | المستخدم المنشئ |
| created_at | TIMESTAMP | نعم | CURRENT_TIMESTAMP | تاريخ الإنشاء |
| updated_at | TIMESTAMP | نعم | CURRENT_TIMESTAMP | تاريخ التحديث |

#### جدول template_assignments

| العمود | النوع | Nullable | Default | وصف |
|--------|-------|----------|---------|-----|
| id | UUID | لا | auto | المفتاح الأساسي |
| document_type | ENUM | لا | - | نوع الوثيقة |
| template_id | UUID | لا | - | معرّف القالب |
| is_default | BOOLEAN | نعم | false | هل هو الافتراضي لهذا النوع |
| created_at | TIMESTAMP | نعم | CURRENT_TIMESTAMP | تاريخ الإنشاء |

**أنواع الوثائق:** thermal_receipt, sales_invoice, proforma, devis, delivery_receipt, return_invoice, purchase_invoice, customer_statement, supplier_statement

#### جدول print_history

| العمود | النوع | Nullable | Default | وصف |
|--------|-------|----------|---------|-----|
| id | UUID | لا | auto | المفتاح الأساسي |
| invoice_id | UUID | لا | - | معرّف الفاتورة |
| template_id | UUID | لا | - | معرّف القالب المستخدم |
| printed_by | UUID | لا | - | المستخدم الذي طبع |
| printed_at | TIMESTAMP | نعم | CURRENT_TIMESTAMP | وقت الطباعة |
| copies | INTEGER | نعم | 1 | عدد النسخ |
| printer_name | VARCHAR(255) | نعم | - | اسم الطابعة |
| print_status | ENUM | نعم | pending | success/failed/pending |
| error_message | TEXT | نعم | - | رسالة الخطأ |

#### جدول template_visibilities

| العمود | النوع | Nullable | Default | وصف |
|--------|-------|----------|---------|-----|
| id | UUID | لا | auto | المفتاح الأساسي |
| template_id | UUID | لا | - | معرّف القالب |
| element_name | VARCHAR(100) | لا | - | اسم العنصر |
| is_visible | BOOLEAN | نعم | true | هل ظاهر |
| display_order | INTEGER | نعم | - | ترتيب العرض |

### ✅ المهام

| المعرف | المهمة | الساعات | المسؤول |
|--------|--------|---------|---------|
| S1-T1 | تصميم ERD لقاعدة البيانات | 16 | Database Architect |
| S1-T2 | إنشاء migration files | 8 | Backend Developer |
| S1-T3 | إعداد بيئة التطوير المحلية | 4 | DevOps |
| S1-T4 | تعريف enums و constants | 4 | Backend Developer |
| S1-T5 | إعداد seed data للقوالب الافتراضية | 8 | Backend Developer |
| S1-T6 | مراجعة التصميم والموافقة | 8 | Tech Lead |

---

## ⚙️ Sprint 2: محرك القوالب الأساسي
**المدة: أسبوعان (20/07/2026 → 02/08/2026) | إجمالي الساعات: 60 ساعة**
> ✅ **منفّذ بالكامل**

### 🎯 الأهداف
- بناء محرك القوالب
- دعم المتغيرات الديناميكية
- معالجة RTL للعربية

### 🏗️ بنية المحرك

```
┌─────────────────────────────────────────────────────────────┐
│                    Template Engine Architecture               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐ │
│  │ Invoice Data │───▶│   Variable   │───▶│  Template   │ │
│  │   (JSON)     │    │  Resolver    │    │   Engine    │ │
│  └──────────────┘    └──────────────┘    └──────┬──────┘ │
│                                                   │        │
│                              ┌────────────────────┘        │
│                              ▼                             │
│                    ┌──────────────────┐                    │
│                    │ Selected Template │                    │
│                    └────────┬─────────┘                    │
│                             ▼                              │
│                    ┌──────────────────┐                    │
│                    │  RTL Handler     │                    │
│                    │  (if lang=ar)    │                    │
│                    └────────┬─────────┘                    │
│                             ▼                              │
│                    ┌──────────────────┐                    │
│                    │ Printable HTML   │                    │
│                    │ Document         │                    │
│                    └──────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### 🔧 المتغيرات الديناميكية المدعومة

| المتغير | الوصف | مثال |
|---------|-------|------|
| `{{invoice.number}}` | رقم الفاتورة | INV-2024-0001 |
| `{{invoice.date}}` | تاريخ الفاتورة | 2026-07-05 |
| `{{invoice.total}}` | المجموع الكلي | 1,500.00 DZD |
| `{{invoice.subtotal}}` | المجموع الفرعي | 1,250.00 DZD |
| `{{invoice.tax}}` | قيمة الضريبة | 250.00 DZD |
| `{{customer.name}}` | اسم الزبون | أحمد محمد |
| `{{customer.phone}}` | هاتف الزبون | 0555 123 456 |
| `{{customer.address}}` | عنوان الزبون | الجزائر العاصمة |
| `{{seller.name}}` | اسم البائع | خالد بن علي |
| `{{cashier.name}}` | اسم الكاشير | فاطمة زهرة |
| `{{payment.method}}` | طريقة الدفع | نقداً / بطاقة |
| `{{company.logo}}` | شعار المحل | [base64 image] |
| `{{company.name}}` | اسم المحل | سوبرماركت الأمل |
| `{{company.phone}}` | هاتف المحل | 023 45 67 89 |
| `{{company.email}}` | بريد المحل | info@example.com |
| `{{company.address}}` | عنوان المحل | حي البدر، الجزائر |
| `{{company.rc}}` | السجل التجاري | 16/B/123456 |
| `{{company.nif}}` | الرقم الجبائي | 1234567890123 |
| `{{company.ai}}` | رقم AI | 1234567890 |
| `{{company.art}}` | رقم المادة الجبائية | ART-001 |

### 🔄 معالجة RTL

```css
/* RTL Base Styles */
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

[dir="rtl"] table {
  direction: rtl;
}

/* Logical Properties */
.invoice-container {
  margin-inline-start: 20px;
  margin-inline-end: 20px;
}
```

**الخطوط الموصى بها للعربية:**
- Cairo — حديث ونظيف
- Tajawal — مدمج وممتاز للواجهات
- IBM Plex Arabic — احترافي
- Noto Sans Arabic — تغطية Unicode ممتازة

### ✅ المهام

| المعرف | المهمة | الساعات | المسؤول |
|--------|--------|---------|---------|
| S2-T1 | تنفيذ Template Engine الأساسي | 24 | Frontend Lead |
| S2-T2 | بناء Variable Resolver | 16 | Frontend Developer |
| S2-T3 | دعم RTL للعربية | 12 | Frontend Developer |
| S2-T4 | اختبار وحدة لمحرك القوالب | 8 | QA Engineer |

---

## 🎨 Sprint 3: القوالب الافتراضية
**المدة: أسبوعان (03/08/2026 → 16/08/2026) | إجمالي الساعات: 64 ساعة**
> ✅ **منفّذ بالكامل**

### 🎯 الأهداف
- إنشاء قوالب 80mm الحرارية
- إنشاء قالب A4
- إنشاء قالب A5

### 📄 القوالب الافتراضية

#### 1. قالب Thermal-80 (الحراري 80mm)

```
┌────────────────────────────┐
│        [الشعار]             │
│      اسم المحل التجاري      │
│    الهاتف | العنوان | RC    │
├────────────────────────────┤
│ رقم الفاتورة: INV-001      │
│ التاريخ: 05/07/2026        │
│ الزبون: أحمد محمد          │
├────────────────────────────┤
│ المنتج    الكمية   السعر   │
│ ─────────────────────────  │
│ حليب      2      200.00   │
│ خبز       5      150.00   │
├────────────────────────────┤
│ المجموع:         350.00    │
│ TVA (19%):       66.50    │
│ المجموع الكلي:   416.50    │
│ طريقة الدفع:     نقداً     │
├────────────────────────────┤
│  شكراً لزيارتكم!           │
│ البضاعة المباعة لا ترد...  │
│       [BARCODE]            │
└────────────────────────────┘
```

#### 2. قالب Invoice-A4 (A4 الكامل)

```
┌─────────────────────────────────────────────────────────────┐
│  [شعار]              فاتورة بيع رقم: INV-2024-001            │
│  اسم المحل              التاريخ: 05/07/2022                   │
│  العنوان: ...            الزبون: أحمد محمد                      │
│  RC: ... | NIF: ...      العنوان: الجزائر العاصمة             │
├─────────────────────────────────────────────────────────────┤
│  #   المنتج          الوحدة   الكمية   سعر الوحدة   المجموع  │
│  ─────────────────────────────────────────────────────────  │
│  1   حليب كامل الدسم   لتر      10      100.00     1000.00  │
│  2   خبز فرنسي        قطعة      20       30.00      600.00  │
├─────────────────────────────────────────────────────────────┤
│                              المجموع الفرعي:    5,000.00    │
│                              خصم (5%):           -250.00    │
│                              المجموع بعد الخصم:   4,750.00    │
│                              TVA (19%):           902.50    │
│                              المجموع الكلي:     5,652.50    │
├─────────────────────────────────────────────────────────────┤
│  توقيع البائع: _________    توقيع الزبون: _________         │
│                    [QR CODE]                                 │
│  البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة            │
└─────────────────────────────────────────────────────────────┘
```

### ✅ المهام

| المعرف | المهمة | الساعات | المسؤول |
|--------|--------|---------|---------|
| S3-T1 | تصميم قالب Thermal-80 | 20 | UI/UX Designer + Frontend |
| S3-T2 | تصميم قالب Invoice-A4 | 20 | UI/UX Designer + Frontend |
| S3-T3 | تصميم قالب Compact-A5 | 12 | UI/UX Designer + Frontend |
| S3-T4 | اختبار القوالب ببيانات حقيقية | 12 | QA Engineer |

---

## 🖥️ Sprint 4: واجهة تخصيص القوالب
**المدة: أسبوعان (17/08/2026 → 30/08/2026) | إجمالي الساعات: 76 ساعة**
> ✅ **80% منفّذ — ينقص Live Preview فقط**

### 🎯 الأهداف
- بناء واجهة إدارة القوالب
- دعم تخصيص الهوية البصرية
- معاينة مباشرة (Live Preview)

### 🎛️ مكونات واجهة المستخدم

#### 1. قائمة القوالب

```
┌─────────────────────────────────────────────────────────────┐
│  القوالب                              [+ قالب جديد]        │
├─────────────────────────────────────────────────────────────┤
│  ☑  الاسم        الحجم    النوع      افتراضي    إجراءات   │
│  ⭐ إيصال حراري  80mm    حراري      ✓         [تعديل][حذف]│
│  ⭐ فاتورة A4    A4      فاتورة     ✓         [تعديل][حذف]│
│     فاتورة A5    A5      فاتورة     -         [تعديل][حذف]│
└─────────────────────────────────────────────────────────────┘
```

#### 2. محرر القوالب — التبويبات

| التبويب | الحقول |
|---------|--------|
| الهوية البصرية | شعار، اسم المحل، هاتف، بريد، عنوان، سجل تجاري، رقم جبائي، NIF، AI، رقم مادة جبائية |
| الخطوط | نوع الخط، حجم الخط، وزن الخط |
| الألوان | لون الرأس، لون التذييل، لون الجداول، لون الشعار |
| الترويسة | إظهار/إخفاء: الشعار، اسم المحل، معلومات الاتصال، معلومات قانونية |
| التذييل | رسالة شكر، شروط البيع، باركود، QR Code، توقيع، ختم |
| عناصر الفاتورة | 16 عنصر قابل للإظهار/الإخفاء |

#### 3. المعاينة المباشرة
- تحديث فوري عند تغيير أي إعداد
- تبديل بين القوالب
- تصدير PDF للمعاينة

### ✅ المهام

| المعرف | المهمة | الساعات | المسؤول |
|--------|--------|---------|---------|
| S4-T1 | بناء Template List Component | 16 | Frontend Developer |
| S4-T2 | بناء Template Editor Form | 24 | Frontend Developer |
| S4-T3 | تنفيذ Live Preview | 16 | Frontend Developer |
| S4-T4 | ربط الواجهة بالـ API | 12 | Fullstack Developer |
| S4-T5 | اختبار واجهة المستخدم | 8 | QA Engineer |

---

## 🖨️ Sprint 5: تكامل الطباعة
**المدة: أسبوعان (31/08/2026 → 13/09/2026) | إجمالي الساعات: 64 ساعة**
> ✅ **منفّذ بالكامل**

### 🎯 الأهداف
- ربط نقطة البيع بوحدة الطباعة
- تنفيذ سير عمل الطباعة
- دعم إعادة الطباعة

### 🔄 سير عمل الطباعة الكامل

```
┌──────────────┐     ┌────────────────────┐     ┌────────────────────┐
│ 1. إتمام البيع│────▶│ 2. حفظ الفاتورة   │────▶│ 3. توليد رقم فريد │
│  (كاشير/بائع)│     │  ✅ BR-PRINT-001    │     │  ✅ BR-PRINT-002   │
└──────────────┘     └────────────────────┘     └────────────────────┘
                                                          │
┌────────────────────┐     ┌────────────────────────────┐ │
│ 8. تسجيل الطباعة  │◄────│ 7. فتح نافذة الطباعة      │◄┘
│   print_history   │     │   window.print()           │
└────────────────────┘     └────────────────────────────┘
         ▲                          ▲
         │                          │
┌────────────────────┐     ┌────────────────────────────┐
│ 6. توليد المستند  │◄────│ 5. اختيار القالب الافتراضي │
│  (Template Engine)│     │   بناءً على نوع الوثيقة    │
└────────────────────┘     └────────────────────────────┘
         ▲
         │
┌────────────────────┐
│ 4. إنشاء سجل البيع│
│    (النظام)       │
└────────────────────┘
```

### 🔄 سير عمل إعادة الطباعة

| الخطوة | الإجراء | ملاحظات |
|--------|---------|---------|
| 1 | البحث عن الفاتورة | كاشير/مدير |
| 2 | اختيار 'إعادة طباعة' | ✅ BR-PRINT-003: لا تنشئ فاتورة جديدة |
| 3 | اختيار القالب (اختياري) | يمكن اختيار قالب مختلف |
| 4 | اختيار نوع النسخة | نسخة العميل / نسخة الأرشيف |
| 5 | توليد المستند | Template Engine |
| 6 | تسجيل في سجل التدقيق | ✅ BR-PRINT-005 |

### ⚠️ معالجة الفشل

```javascript
async function handlePrint(invoiceId, templateId) {
  try {
    // 1. حفظ الفاتورة أولاً (transaction)
    await saveInvoice(invoiceId);
    
    // 2. توليد المستند
    const printDoc = await generatePrintDocument(invoiceId, templateId);
    
    // 3. محاولة الطباعة
    await window.print();
    
    // 4. تسجيل النجاح
    await logPrintHistory({ invoiceId, templateId, status: 'success' });
    
  } catch (error) {
    // 5. تسجيل الفشل
    await logPrintHistory({ 
      invoiceId, templateId, status: 'failed', errorMessage: error.message 
    });
    
    // 6. إشعار المستخدم
    showNotification({
      type: 'error',
      message: 'فشلت الطباعة. الفاتورة محفوظة. يمكنك إعادة المحاولة.',
      actions: ['إعادة المحاولة', 'طباعة لاحقاً']
    });
  }
}
```

### 🔧 API Endpoints

| Method | Endpoint | الوصف | الصلاحيات |
|--------|----------|-------|-----------|
| POST | `/api/print/invoice/{id}` | طباعة فاتورة | cashier, seller, manager |
| POST | `/api/print/reprint/{id}` | إعادة طباعة | cashier, manager |
| GET | `/api/print/history` | سجل الطباعة | manager |
| GET | `/api/print/history/{invoiceId}` | سجل طباعة فاتورة | cashier, manager |

### ✅ المهام

| المعرف | المهمة | الساعات | المسؤول |
|--------|--------|---------|---------|
| S5-T1 | تنفيذ API لسير عمل الطباعة | 20 | Backend Developer |
| S5-T2 | ربط زر الدفع في POS بالطباعة | 12 | Frontend Developer |
| S5-T3 | تنفيذ إعادة الطباعة | 16 | Fullstack Developer |
| S5-T4 | تنفيذ سجل التدقيق | 8 | Backend Developer |
| S5-T5 | اختبار سيناريوهات الفشل | 8 | QA Engineer |

---

## 📱 Sprint 6: QR Code والباركود
**المدة: أسبوع واحد (14/09/2026 → 20/09/2026) | إجمالي الساعات: 32 ساعة**
> ✅ **منفّذ**

### 🎯 الأهداف
- توليد QR Code
- توليد Barcode
- تخصيص محتوى QR Code

### 📱 دعم QR Code

| النوع | التنسيق | الاستخدام |
|-------|---------|-----------|
| رقم الفاتورة | `{{invoice.number}}` | التعريف السريع |
| رابط الفاتورة | `https://domain.com/invoice/{{invoice.number}}` | التحقق الإلكتروني |
| بيانات التحقق | JSON: {invoice, total, date, signature} | التحقق من صحة الفاتورة |
| بيانات ضريبية | JSON: {nif, total, tax_amount, date} | V4 - الفاتورة الإلكترونية |

### 📊 دعم الباركود

| النوع | الاستخدام |
|-------|-----------|
| CODE128 | عام - الفواتير |
| EAN-13 | المنتجات |
| CODE39 | التتبع |

### ✅ المهام

| المعرف | المهمة | الساعات | المسؤول |
|--------|--------|---------|---------|
| S6-T1 | تنفيذ QR Code Generator | 12 | Frontend Developer |
| S6-T2 | تنفيذ Barcode Generator | 8 | Frontend Developer |
| S6-T3 | إضافة خيارات التخصيص | 8 | Frontend Developer |
| S6-T4 | اختبار QR/Barcode على طابعات مختلفة | 4 | QA Engineer |

---

## 🔐 Sprint 7: الصلاحيات والأمان
**المدة: أسبوع واحد (21/09/2026 → 27/09/2026) | إجمالي الساعات: 44 ساعة**
> ✅ **منفّذ بالكامل**

### 🎯 الأهداف
- تنفيذ نظام الصلاحيات
- تطبيق قواعد الأعمال
- تأمين الفواتير المطبوعة

### 👥 مصفوفة الصلاحيات

| الصلاحية | المدير | الكاشير | البائع |
|----------|--------|---------|--------|
| إنشاء القوالب | ✅ | ❌ | ❌ |
| تعديل القوالب | ✅ | ❌ | ❌ |
| حذف القوالب | ✅ | ❌ | ❌ |
| تعيين القالب الافتراضي | ✅ | ❌ | ❌ |
| الطباعة | ✅ | ✅ | ✅ |
| إعادة الطباعة | ✅ | ✅ | ❌ |
| عرض سجل الطباعة | ✅ | ✅ | ❌ |
| حذف فاتورة مطبوعة | ❌ | ❌ | ❌ |

### 📋 تطبيق قواعد الأعمال

| القاعدة | التنفيذ |
|---------|---------|
| BR-PRINT-001 | Validation: check invoice.status == 'saved' |
| BR-PRINT-002 | Trigger: generate unique number if not exists |
| BR-PRINT-003 | Reprint يستخدم نفس invoice_id |
| BR-PRINT-004 | Soft delete فقط، مع flag is_printed |
| BR-PRINT-005 | Trigger على print_history |
| BR-PRINT-006 | Middleware: role == 'manager' |
| BR-PRINT-007 | CSS: direction: rtl; lang: 'ar' |
| BR-PRINT-008 | CSS: max-width: 80mm |
| BR-PRINT-009 | Validation: mandatory fields |
| BR-PRINT-010 | Transaction: save before print |

### ✅ المهام

| المعرف | المهمة | الساعات | المسؤول |
|--------|--------|---------|---------|
| S7-T1 | تنفيذ Permission Middleware | 12 | Backend Developer |
| S7-T2 | تطبيق قواعد الأعمال | 16 | Backend Developer |
| S7-T3 | اختبار الصلاحيات | 8 | QA Engineer |
| S7-T4 | اختبار قواعد الأعمال | 8 | QA Engineer |

---

## 🧪 Sprint 8: الاختبار والتحسين
**المدة: أسبوعان (28/09/2026 → 11/10/2026) | إجمالي الساعات: 84 ساعة**
> ✅ **70% منفّذ — ينقص UAT والتوثيق**

### 🎯 الأهداف
- اختبار شامل للوحدة
- تحسين الأداء
- توثيق النظام

### 🧪 خطة الاختبار

| النوع | الاختبارات | التغطية |
|-------|-----------|---------|
| Unit Tests | Template Engine, Variable Resolver, QR/Barcode, Permissions | 85-90% |
| Integration Tests | POS→Print, Template→Document, Print→Audit | 5 سيناريوهات |
| E2E Tests | Complete sale, Template customization, Reprint, Failure | 4 سيناريوهات |
| Performance | Generation < 500ms, Preview < 1s, 1000+ items | 4 معايير |

### ✅ معايير القبول

| المعيار | الحالة |
|---------|--------|
| ✅ دعم الطباعة الحرارية 80mm | اختبار على طابعة حقيقية |
| ✅ دعم فواتير A4 | اختبار على طابعة A4 |
| ✅ تخصيص الهوية البصرية | اختبار تغيير الشعار والألوان |
| ✅ تخصيص عناصر الفاتورة | اختبار إخفاء/إظهار |
| ✅ دعم إعادة الطباعة | اختبار إعادة طباعة |
| ✅ دعم قوالب متعددة | اختبار 9 أنواع وثائق |
| ✅ دعم اللغة العربية RTL | اختبار محتوى عربي |
| ✅ دعم الطباعة عبر المتصفح | بدون برامج إضافية |
| ✅ عدم فقدان الفاتورة | اختبار سيناريو الفشل |

### ✅ المهام

| المعرف | المهمة | الساعات | المسؤول |
|--------|--------|---------|---------|
| S8-T1 | كتابة Unit Tests | 20 | QA + Developers |
| S8-T2 | كتابة Integration Tests | 16 | QA Engineer |
| S8-T3 | اختبار الأداء | 12 | QA Engineer |
| S8-T4 | اختبار القبول (UAT) | 16 | Product Owner + QA |
| S8-T5 | التوثيق الفني | 12 | Tech Lead |
| S8-T6 | التوثيق للمستخدم | 8 | Technical Writer |

---

## ⚠️ تحليل المخاطر والتبعيات التقنية

### 🔴 المخاطر عالية الخطورة

| المخطر | التأثير | الاحتمال | التخفيف |
|--------|---------|----------|---------|
| عدم توافق طابعات ESC/POS مع المتصفح | عدم القدرة على الطباعة الحرارية | عالٍ | استخدام PDF download كـ fallback، أو POSBridge للاتصال المباشر |
| أداء المحرك مع القوالب الكبيرة | بطء في توليد المستندات | متوسط | استخدام virtual DOM، caching، optimization |
| اكتشاف أخطاء كبيرة في مراحل متأخرة | تأخير في التسليم | متوسط | Daily testing من Sprint 3 |
| تغيير متطلبات قانونية | إعادة تصميم القوالب | منخفض | استخدام بنية مرنة، separation of concerns |

### 🟡 المخاطر متوسطة الخطورة

| المخطر | التأثير | الاحتمال | التخفيف |
|--------|---------|----------|---------|
| QR Code غير قابل للقراءة بعد الطباعة | فقدان التحقق | متوسط | اختبار على طابعات مختلفة، ضبط error correction level |
| تجاوز عرض 80mm | قطع المحتوى | متوسط | CSS: overflow handling، validation |
| عدم توافق RTL مع الجداول المعقدة | مشاكل في العرض | متوسط | استخدام CSS Grid/Flexbox |
| تأخر فتح نافذة الطباعة | تجربة مستخدم سيئة | متوسط | Preload، print media queries |

### 🟢 المخاطر منخفضة الخطورة

| المخطر | التأثير | الاحتمال | التخفيف |
|--------|---------|----------|---------|
| أداء JSON columns | بطء في البحث | منخفض | إضافة indexes |
| عدم تغطية جميع السيناريوهات | أخطاء في الإنتاج | منخفض | Involve users في UAT |

### 🔗 التبعيات التقنية

| التبعية | الاستخدام | البديل |
|---------|-----------|--------|
| Handlebars.js / Mustache.js | محرك القوالب | EJS, Pug |
| qrcode.js | توليد QR Code | QRCode.js |
| JsBarcode | توليد Barcode | bwip-js |
| Google Fonts (Cairo, Tajawal) | خطوط عربية | Local hosting |
| WebRTC / POSBridge | اتصال مباشر بالطابعة | PDF download |
| TypeScript | Type safety | JavaScript + JSDoc |

---

## 📈 ملخص الموارد

| الدور | عدد الأشخاص | إجمالي الساعات |
|-------|-------------|----------------|
| Tech Lead | 1 | 20 |
| Frontend Lead | 1 | 24 |
| Backend Developer | 2 | 80 |
| Frontend Developer | 2 | 120 |
| Fullstack Developer | 1 | 28 |
| UI/UX Designer | 1 | 52 |
| QA Engineer | 1 | 64 |
| Database Architect | 1 | 16 |
| DevOps | 1 | 4 |
| Technical Writer | 1 | 8 |
| Product Owner | 1 | 16 |

---

## 🎯 خارطة الطريق المستقبلية

| الإصدار | الميزات | المدة التقديرية |
|---------|---------|----------------|
| V2 | دعم ESC/POS المباشر، الطباعة الصامتة، طابعات الشبكة | +4 أسابيع |
| V3 | محرر قوالب مرئي Drag & Drop، دعم HTML/CSS Templates | +6 أسابيع |
| V4 | توقيع إلكتروني، فاتورة إلكترونية حكومية، QR ضريبي رسمي | +8 أسابيع |
