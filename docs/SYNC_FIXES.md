# 📝 سجل تتبع إصلاحات وتحسينات محرك المزامنة (AN POS Sync Fixes Changelog)

> توثيق تاريخي وهندسي مفصل لكافة التعديلات والإصلاحات البرمجية المنفذة على محرك المزامنة ومسارات البيانات وقواعد البيانات بين تطبيق سطح المكتب وتطبيق الهاتف.

---

## 📅 الإصدار 1.0.0 — خطة الإصلاحات الشاملة المعتمدة (2026-08-30)

### 🔹 المرحلة 0: الإعدادات والنسخ الاحتياطي (Pre-Fix Preparations)
- إنشاء وثائق المعايير والتدقيق الشامل [`SYNC_CRITERIA_AND_ARCHITECTURE_PLAN.md`](file:///home/ammar/AN-POS-TEST/docs/SYNC_CRITERIA_AND_ARCHITECTURE_PLAN.md) و [`SYNC_ENGINE_AND_TABLES_COMPATIBILITY_AUDIT.md`](file:///home/ammar/AN-POS-TEST/docs/SYNC_ENGINE_AND_TABLES_COMPATIBILITY_AUDIT.md).
- إنشاء ملف سجل التغييرات [`SYNC_FIXES.md`](file:///home/ammar/AN-POS-TEST/docs/SYNC_FIXES.md).

### 🔹 المرحلة 1: طبقة التطبيع الموحدة (`normalizeFields` Middleware)
- إنشاء Middleware موحد [`normalizeFields.ts`](file:///home/ammar/AN-POS-TEST/electron/main/server/middleware/normalizeFields.ts) لمعالجة التحويل الذكي بين `snake_case` و `camelCase`.
- تسجيل الـ Middleware على مسارات `/api/sync/push` و `/api/sales` و `/api/cash`.
- ضمان تطبيع `customer_id`, `cash_session_id`, `amount_paid`, `doc_type`, `sold_by`, `discount_type`, `tva_amount`.

### 🔹 المرحلة 2: القضاء على ازدواجية بنود الفواتير وخصم المخزون
- تحديث [`mobile-rn/src/lib/saleService.ts`](file:///home/ammar/AN-POS-TEST/mobile-rn/src/lib/saleService.ts) بحيث يُرسل عملية Outbox واحدة للفاتورة مع تضمين `items[]` بداخلها، ومنع إدراج عمليات `sale_items` منفصلة في الـ `sync_queue` عند إنشاء الفواتير.
- إضافة فحص الـ Idempotency في السيرفر لمنع تكرار معالجة الفاتورة وبنودها.

### 🔹 المرحلة 3: معالجة ومزامنة الإعدادات (`settings`)
- بناء دالة تحويل آمنة لـ `settings` من نمط الصف الواحد إلى نمط Key-Value والعكس.
- تأمين تحديث الإعدادات بسطح المكتب بفحص صحة الأعمدة عبر `PRAGMA table_info(settings)`.

### 🔹 المرحلة 4: جدول تتبع المحذوفات (`sync_tombstones`) للحذف الصلب
- إضافة جدول `sync_tombstones` مع فهرس `idx_tombstones_lookup(table_name, deleted_at)`.
- تسجيل المعرفات المحذوفة تلقائياً عند استدعاء `removeRow` و `removeSale`.
- ربط مسار `POST /api/sync/pull` بإرسال المحذوفات للهاتف كـ `operation: 'delete'` لحذفها محلياً.

### 🔹 المرحلة 5: توسيع مصفوفة الجداول القابلة للمزامنة
- توسيع `SYNCABLE_TABLES` و `TABLE_PULL_ORDER` لتشمل كافة الجداول الـ 34 بالترتيب الطوبولوجي.

### 🔹 المرحلة 6: عزل مسارات المستخدمين والصلاحيات والرقابة
- مسار `/api/sync/users-readonly` للقراءة فقط مع استبعاد كلمات المرور والـ PINs.
- تحديد `user_activities` و `audit_logs` كـ Push-Only للأرشفة بسطح المكتب.
