# خطة تنفيذ — نظام إدارة الحسابات (ACC-MGMT-001, V1)

> نطاق هذا المستند: **التخطيط فقط** (Plan-only). لا يتضمن كود ميزات بعد — ينظّم البنية والقرارات والجدول الزمني للتنفيذ اللاحق.
> المصدر: `ACC-MGMT-001-PRD.md` + تقسيم العمل إلى Sprints المرفق.

---

## 0. القرارات المؤكدة (من المراجعة)

| القرار | القيمة | ملاحظة |
|--------|--------|--------|
| النطاق | Plan-only الآن | لا كود ميزات في هذه المرحلة |
| موقع النظام | وحدة جديدة `features/accounting` | منفصلة عن `features/finance` (نقد/مصاريف/ديون) |
| التخزين | **Dexie/IndexedDB** | ⚠️ تعديل: تعذّر تثبيت `sql.js` (لا اتصال بالشبكة في بيئة التطوير). حُول إلى Dexie المتوفر أصلاً — يُبقي التطبيق offline بالكامل ويلغي خطر الطبقة المزدوجة (§11). |
| الأدوار | إضافة دور `accountant` | توسيع `UserEntity.role` عبر التطبيق |

> ⚠️ تعارض معماري: التطبيق 100% offline على Dexie/IndexedDB. اختيار SQLite يُدخل **طبقة تخزين مزدوجة** (Dexie للـ POS/المخزون، SQLite للحسابات). انظر §11.

---

## 1. البنية المعمارية (Clean Architecture)

يطابق النمط الحالي في `ARCHITECTURE.md` (domain → application → infrastructure → presentation).

```
src/features/accounting/
├── domain/
│   ├── entities/         Account, JournalEntry, JournalEntryLine, FiscalPeriod, AuditLog, ExchangeRate
│   ├── services/         DoubleEntryValidator, AccountTreeBuilder, LedgerUpdater, ReportEngine
│   └── errors.ts         AccountingError (UnbalancedEntry, LockedPeriod, ReviewedEntry, ...)
├── application/
│   └── useCases/         CreateJournalEntry, UpdateJournalEntry, ReviewEntry, ClosePeriod,
│                         GenerateReport, PostFromSale
├── infrastructure/
│   └── database/sqlite/  schema.sql, migrations.ts, SqliteClient.ts (غلاف sql.js),
│                         repositories/ (AccountRepo, JournalRepo, PeriodRepo, AuditRepo)
├── components/           AccountTree, JournalEntryForm, EntryLinesTable, ReviewDialog, ReportViewer
├── pages/                ChartOfAccountsPage, JournalEntriesPage, ReportsPage,
│                         FiscalPeriodsPage, AccountingSettingsPage
└── index.ts             تصدير المسارات + عناصر التنقل
```

لا تتصل الصفحات بـ SQLite مباشرة — تمر عبر `useCases` ثم `repositories` (مثل بقية التطبيق).

---

## 2. مخطط SQLite (مُصنّف بالإصدارات)

طاولات تطابق PRD §16 + ERD المرفق بـ Sprint 1:

```sql
CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  ar_name       TEXT,
  en_name       TEXT,
  account_type  TEXT NOT NULL CHECK(account_type IN ('assets','liabilities','equity','revenue','expenses')),
  parent_id     TEXT REFERENCES accounts(id),
  account_number TEXT NOT NULL,
  balance       REAL DEFAULT 0,
  is_active     INTEGER DEFAULT 1,
  created_by    TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
);
-- index: (parent_id), (account_number)

CREATE TABLE journal_entries (
  id            TEXT PRIMARY KEY,
  entry_number  TEXT NOT NULL UNIQUE,
  date          TEXT NOT NULL,
  description   TEXT,
  reference     TEXT NOT NULL,            -- BR-ACC-008
  total_amount  REAL DEFAULT 0,
  is_balanced   INTEGER DEFAULT 0,        -- BR-ACC-001
  is_reviewed   INTEGER DEFAULT 0,        -- BR-ACC-003
  reviewed_by   TEXT,
  reviewed_at   TEXT,
  created_by    TEXT,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_entry_lines (
  id            TEXT PRIMARY KEY,
  entry_id      TEXT NOT NULL REFERENCES journal_entries(id),
  account_id    TEXT NOT NULL REFERENCES accounts(id),
  debit_amount  REAL DEFAULT 0,
  credit_amount REAL DEFAULT 0,
  description   TEXT,
  line_number   INTEGER
);
-- index: (entry_id, account_id)

CREATE TABLE fiscal_periods (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  start_date    TEXT NOT NULL,
  end_date      TEXT NOT NULL,
  is_closed     INTEGER DEFAULT 0,        -- BR-ACC-004
  closed_by     TEXT,
  closed_at     TEXT
);

CREATE TABLE audit_logs (
  id            TEXT PRIMARY KEY,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  old_value     TEXT,                      -- JSON
  new_value     TEXT,                      -- JSON
  performed_by  TEXT,
  performed_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exchange_rates (
  id            TEXT PRIMARY KEY,
  currency      TEXT NOT NULL,
  rate          REAL NOT NULL,
  date          TEXT NOT NULL,
  base_currency TEXT NOT NULL
);

CREATE TABLE account_customization (
  id            TEXT PRIMARY KEY,
  visibility    TEXT NOT NULL             -- JSON: رؤية عناصر القيد (PRD §7)
);

CREATE TABLE attachments (
  id            TEXT PRIMARY KEY,
  entry_id      TEXT REFERENCES journal_entries(id),
  filename      TEXT NOT NULL,
  mime          TEXT,
  blob          BLOB
);
```

ملاحظة: جدول `audit_logs` موجود أصلاً في Dexie (`AuditLogEntity`)؛ نسخة SQLite ستكون مصدر تدقيق الحسابات (BR-ACC-005).

---

## 3. قواعد الأعمال (PRD §14) → طبقة التنفيذ

| القاعدة | مكان التنفيذ |
|---------|--------------|
| BR-ACC-001 لا قيد غير متوازن | `DoubleEntryValidator` (domain) قبل الإدراج |
| BR-ACC-002 رقم فريد لكل قيد | قيد UNIQUE في SQLite + `generateEntryNumber()` |
| BR-ACC-003 لا تعديل لقيد مُراجَع | حارس في `UpdateJournalEntry` |
| BR-ACC-004 لا حذف في فترة مغلقة | فحص `fiscal_periods.is_closed` |
| BR-ACC-005 كل تعديل يُسجَّل | غلاف repository يُدرج في `audit_logs` |
| BR-ACC-006 المحاسب فقط يعدّل | وسيط RBAC في المسارات/useCases |
| BR-ACC-007 عربية + RTL | `dir="rtl"` + `lang="ar"` على الصفحات |
| BR-ACC-008 القيد مرتبط بمستند مصدر | تحقق `reference NOT NULL` |
| BR-ACC-009 التقارير القانونية بحقول إلزامية | فحص في `ReportEngine` |
| BR-ACC-010 عدم فقدان القيد عند الفشل | معاملة تلتف الحفظ؛ الاحتفاظ بمسودة عند الخطأ |

---

## 4. شجرة الحسابات (Sprint 2)

- `AccountTreeBuilder` يُرجع شجرة متداخلة من `accounts` المسطّحة (عبر `parent_id`).
- تهيئة (seed) كامل هرمية PRD §3 عبر migration seed.
- واجهة الشجرة: هرمية قابلة للطي RTL؛ الإنشاء/التعديل/الحذف محصور بـ `admin` (PRD §15).
- تبديل عناصر القيد القابلة للتخصيص (§7) يُخزَّن في `account_customization`.

---

## 5. نظام القيود المزدوجة (Sprint 3)

- `JournalEntryForm` مع صفوف `JournalEntryLine` ديناميكية (مدين/دائن + انتقاء حساب من الشجرة).
- عند الإرسال ← `CreateJournalEntry` ← `DoubleEntryValidator` ← `LedgerUpdater` (يحدّث `accounts.balance`) ← إدراج تدقيق ← commit.
- المرفقات تُرفع إلى `attachments` (Blob) — فاتورة PDF/إيصال/عقد (§9).

---

## 6. التقارير المالية (Sprint 4)

- `ReportEngine` (domain) يُنتج: ميزان المراجعة، قائمة الدخل، قائمة المركز المالي، التدفق النقدي، دفتر الأستاذ العام، دفتر اليومية، كشف الحساب.
- تعريف التقرير = metadata + layout + متغيرات ديناميكية (`{{period.start}}`, `{{account.balance}}`, `{{total.debit}}`, …) (PRD §13).
- التصدير عبر اعتماد `xlsx` الموجود (V2 لكنه رخيص الإدراج مبكراً).

---

## 7. الفترات المالية + المراجعة/القفل (§11)

- `FiscalPeriodsPage`: إنشاء/إغلاق فترات (`admin`). الإغلاق يمنع التعديل/الحذف (BR-ACC-004).
- `ReviewDialog`: تعليم كـ مُراجَع + ملاحظات + قفل القيد (BR-ACC-003).

---

## 8. العملات المتعددة (§8) والإعدادات (§6)

- جدول `exchange_rates`؛ القيود تُخزَّن بعملة العملية + المكافئ بالعملة الأساسية.
- `AccountingSettingsPage`: هوية المؤسسة (NIF/AI/السجل التجاري — موجودة جزئياً في `SettingsEntity`) + السنة المالية + معدلات الضريبة.

---

## 9. التكامل مع نقطة البيع (Sprint 5)

- `PostFromSale` useCase: عند الدفع في POS ← بناء قيد تلقائي (نقدية/مبيعات/ذمم/مخزون حسب §10) ← كتابته في دفتر SQLite.
- بما أن المبيعات في Dexie، يتناسق هذا useCase مع الطبقتين (خطر §11).

---

## 10. مصفوفة الصلاحيات (§15) + توسيع الأدوار

توسيع `UserEntity.role` إلى `'admin' | 'accountant' | 'cashier' | 'seller'` (حالياً `'admin' | 'cashier' | 'seller'` في `authStore.ts:5`).

| الصلاحية | admin | accountant | cashier |
|----------|:---:|:---:|:---:|
| إنشاء/تعديل/حذف الحسابات | ✅ | ❌ | ❌ |
| تغيير هيكل الشجرة | ✅ | ❌ | ❌ |
| إغلاق الفترات | ✅ | ❌ | ❌ |
| إنشاء/تعديل القيود | ✅ | ✅ | ❌ |
| مراجعة القيود | ✅ | ✅ | ❌ |
| طباعة التقارير | ✅ | ✅ | ❌ |
| عرض القيود | ✅ | ✅ | ✅ |

التنفيذ عبر مساعد مركزي `can(role, action)` بدل تكرار الفحص.

---

## 11. المخاطر العليا

1. **طبقة تخزين مزدوجة** (Dexie + SQLite): سلامة البيانات واستعلامات عبر الطبقات. تخفيف: واجهة `AccountingService` واحدة بحيث لا تتصل الميزات بـ SQLite مباشرة؛ يمكن لاحقاً توحيد الطبقة.
2. **تحميل sql.js WASM**: تهيئة غير متزامنة؛ يجب أن ينتظر seed جاهزية القاعدة (موازاةً لـ `seedDatabase()` في `main.tsx`).
3. **توسعة نطاق RBAC**: إضافة `accountant` تمس ملفات عدة؛ تُنفَّذ عبر `can()` مركزي.

---

## 12. استراتيجية الاختبار (Sprint 6)

- **وحدة (Vitest)**: `DoubleEntryValidator`, `AccountTreeBuilder`, مجاميع `ReportEngine`.
- **تكامل** (fake-indexeddb + sql.js في الذاكرة): `CreateJournalEntry` + تدقيق + رصيد الدفتر.
- **قبول (UAT)**: قائمة مرجعية مطابقة لمعايير القبول §17.

---

## 13. ترتيب التنفيذ (Milestones)

1. عميل SQLite + المخطط + seed + مساعد الأدوار/الصلاحيات
2. شجرة الحسابات + واجهة الشجرة
3. القيد المحاسبي + تحقق التوازن + تحديث الدفتر + التدقيق
4. محرك التقارير + العارض + التصدير
5. الفترات المالية + المراجعة/القفل
6. تكامل POS + العملات المتعددة
7. الاختبارات + UAT

---

## 14. أسئلة مفتوحة للتأكيد قبل الكود

- تأكيد نهائي: **sql.js (WASM) داخل المتصفح** لتلبية اختيار SQLite، أم إعادة النظر في البقاء على Dexie لتفادي الطبقة المزدوجة؟
- هل تُبقي `features/finance` (نقد/مصاريف) كمصدر إدخال يُرحَّل إلى دفتر الحسابات، أم تُهاجر إلى الوحدة الجديدة؟
