# خطة تنفيذ POS-PRINT-001 — الطابعات + المحرر المرئي

**التاريخ:** 2026-07-16 | **الإصدار:** V1 | **الحالة:** مكتملة (المراحل A + B + C)

> تابع تقدّم المراحل المكتملة في جدول "حالة التنفيذ" أسفل الملف.

---

## الخلفية

مقارنة الـ PRD POS-PRINT-001 بالكود الحالي أظهرت أن الوحدة مطوّرة بنسبة ~85% من المتطلبات الوظيفية، مع فجوتين رئيسيتين:

1. **إدارة الطابعات** (FR-013 → FR-017) — غير منفّذة نهائياً.
2. **محرر القوالب Drag&Drop + Live Preview** (FR-001 / FR-004) — المحرر الحالي بدون Drag&Drop والمعاينة ليست تفاعلية.

### الافتراضات المعتمدة (من المستخدم)

- **مكتبة Drag&Drop**: `@dnd-kit` (TypeScript-first, React 19-compatible).
- **WebUSB/Bluetooth**: كشف اختياري عبر زر، Chrome-only مع fallback واضح للمتصفحات غير الداعمة.
- **Endpoints الخلفية للطابعات**: تنفيذ كامل في هذا التكرار.
- **ترتيب التنفيذ**: الطابعات أولاً ثم المحرر المرئي.
- **الاتجاه الضريبي**: الجزائر فقط (NIF/AI/RC) — لا ZATCA/Saudi.
- **قاعدة الكود**: لا Breaking changes، البقاء على البنية الحالية والاحتفاظ بـ `window.print()` كـ fallback افتراضي.

---

## المرحلة A — إدارة الطابعات (FR-013 → FR-017)

| الخطوة | الوصف | الملفات | الحالة |
|---|---|---|---|
| **A1** | نموذج بيانات Dexie V10: جدولا `printers` و `printer_template_mappings` + الأنواع + seed للطابعة الافتراضية `browser-printer` | `db.ts`, `seed.ts`, `types/invoicePrint.ts` | ✅ مكتملة |
| **A2** | خدمة CRUD `printerService.ts` | `src/services/print/printerService.ts` | ✅ مكتملة |
| **A3** | طبقة الاتصال `printerConnection.ts` (Strategy) + `detectDevices.ts` (كشف اختياري USB/BLE) | `src/services/print/printerConnection.ts`, `src/services/print/detectDevices.ts` | ✅ مكتملة |
| **A4** | خدمة اختبار الطابعة `testPrinter.ts` | `src/services/print/testPrinter.ts` | ✅ مكتملة |
| **A5** | إدارة الحالة `printerStatus.ts` | `src/services/print/printerStatus.ts` | ✅ مكتملة |
| **A6** | تحديث `printService.ts` لاستعمال `printerId` و `getMapping` | `src/services/print/printService.ts` | ✅ مكتملة |
| **A7** | تحديث `printEngine.ts` لتقبّل `printerId?` | `src/services/print/printEngine.ts` | ✅ مكتملة |
| **A8** | واجهة `PrintersPage` + `PrinterStatusBadge` + تعديل `TemplateAssignmentManager` و `PrintPreviewModal` | `src/features/print/PrintersPage.tsx`, `src/components/print/PrinterStatusBadge.tsx` | ✅ مكتملة |
| **A9** | Endpoints الخلفية + جداول SQL.js | `server/src/print/print.routes.ts`, `server/src/shared/schema.ts` | ✅ مكتملة |
| **A10** | الاختبارات | `src/services/print/__tests__/` | ✅ مكتملة |

---

## المرحلة B — Live Preview + Drag&Drop (FR-001 / FR-004)

| الخطوة | الوصف | الملفات | الحالة |
|---|---|---|---|
| **B0** | تثبيت `@dnd-kit/core` + `@dnd-kit/sortable` | `package.json` | ✅ مكتملة |
| **B1** | `templateEditorStore.ts` (Zustand) | `src/store/templateEditorStore.ts` | ✅ مكتملة |
| **B2** | إعادة بناء `TemplateEditor.tsx` مع Drag&Drop (Block Palette + Editor Canvas + Properties Panel) | `src/components/print/TemplateEditor.tsx`, `src/components/print/blocks/*` | ✅ مكتملة |
| **B3** | Live Preview تفاعلي (debounce 300ms + Split View) | مدمج في `TemplateEditor.tsx` | ✅ مكتملة |
| **B4** | تجميع `layout` من الـ store عند الحفظ | `TemplateEditor.tsx` | ✅ مكتملة |
| **B5** | اختبارات `TemplateEditor.test.tsx` | `src/components/print/__tests__/TemplateEditor.test.tsx` | ✅ مكتملة |

---

## المرحلة C — تحسينات نقلية

| الخطوة | الوصف | الملفات | الحالة |
|---|---|---|---|
| **C1** | صلاحية `manage_printers` (admin, inventory_manager) + حالات اختبار | `src/services/print/permissions.ts` | ✅ مكتملة |
| **C2** | Barrel exports للخدمات/المكوّنات الجديدة | `src/services/print/index.ts`, `src/components/print/index.ts` | ✅ مكتملة |
| **C3** | التوجيه `/printers` + عنصر القائمة الجانبية | `App.tsx`, `src/app/layouts/DashboardLayout.tsx` | ✅ مكتملة |

---

## حالة التنفيذ

> 🔲 معلّقة | 🔄 قيد التنفيذ | ✅ مكتملة | ⚠️ متأخرة | ❌ ملغاة

| المرحلة | الخطوة | الحالة | تاريخ الإكمال | ملاحظات |
|---|---|---|---|---|
| A | A1 — نموذج بيانات V10 | ✅ | 2026-07-16 | أنواع + جدولان + upgrade + seed |
| A | A2 — printerService | ✅ | 2026-07-16 | CRUD + mappings + ensureDefault |
| A | A3 — printerConnection + detectDevices | ✅ | 2026-07-16 | Strategy + USB/BLE detection w/ fallback |
| A | A6 — تحديث printService | ✅ | 2026-07-16 | printerId + getMapping + connection. الطابور أيضاً |
| A | A7 — تحديث printEngine | ✅ | 2026-07-16 | يقبل printerId? |
| A | A4 — testPrinter | ✅ | 2026-07-16 | صفحة تجريبية + تحديث الحالة |
| A | A5 — printerStatus | ✅ | 2026-07-16 | refresh + polling + statusMeta |
| A | A8 — واجهة PrintersPage | ✅ | 2026-07-16 | جدول + نموذج + اكتشاف + mappings + badge |
| A | A9 — endpoints الخلفية | ✅ | 2026-07-16 | 8 endpoints + جدولان SQL.js + seed |
| A | A10 — اختبارات الطابعات | ✅ | 2026-07-16 | 160/160 tests تجتاز |
| B | B0 — تثبيت @dnd-kit | ✅ | 2026-07-17 | `@dnd-kit/react@0.5.0` + `@dnd-kit/dom@0.5.0` (الإصدار الجديد TS-first). استعملنا HTML5 Drag API مباشرةً (يعمل في jsdom). |
| B | B1 — templateEditorStore | ✅ | 2026-07-17 | Zustand: load/reset + addBlock/moveBlock/removeBlock/updateBlock + meta/styles/visibility + markSaved + createBlock |
| B | B2 — TemplateEditor Drag&Drop | ✅ | 2026-07-17 | ثلاثية الأعمدة: Palette \| Canvas (header/body/footer) \| Properties + نوافذ settings/visual/visibility. يمتلك HTML5 drag&drop عبر الأقسام. |
| B | B3 — Live Preview | ✅ | 2026-07-17 | Split View. LivePreview مع debounce 300ms + iframe sandbox. |
| B | B4 — حفظ layout | ✅ | 2026-07-17 | handleSave يجمّع name/description/paperSize/styles/visibility/layout من الـ store ويرسلها لـ updateTemplate |
| B | B5 — اختبارات TemplateEditor | ✅ | 2026-07-17 | 10 اختبارات (render, switching, dirty, save B4, panels, system read-only) + 16 اختبار store = 26 اختبارا يجتاز |
| C | C1 — صلاحيات manage_printers | ✅ | 2026-07-16 | manage_printers + view_printers + hooks |
| C | C2 — barrel exports | ✅ | 2026-07-16 | services + components barrels |
| C | C3 — router + DashboardLayout | ✅ | 2026-07-16 | `/settings/printers` + زر في SettingsPage |

---

## قائمة التحقق قبل/بعد كل خطوة

- **قبل كل خطوة**: `npm run typecheck && npm run lint`
- **بعد كل خطوة**: `npm test -- print` (اختبارات الطباعة) ثم `npm test` كامل عند نهاية المرحلة
- **GitNexus impact**: قبل تعديل `printService.ts` أو `printEngine.ts`، تشغيل `impact` على الرموز المعنية للتحقق من نطاق التأثير
