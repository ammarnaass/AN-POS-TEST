# خطة تنفيذ Undo/Redo + Revert لمحرر قوالب الطباعة

## السياق

محرر القوالب (`src/components/print/TemplateEditor.tsx`) يدعمه store Zustand (`src/store/templateEditorStore.ts`). بعد فحص شامل، تأكد أن:

- **لا يوجد Undo/Redo**: لا `past`/`future` stack، لا middleware، لا اختصارات، لا أزرار.
- **لا Revert لآخر حفظ**: `markSaved` يمسح فقط `dirty` بدون حفظ snapshot. `reset()` يعود للقيم الفارغة وليس لآخر قالب محمّل.
- **`dirty` boolean مستقل** يُضبط في كل mutation لكنه غير قابل للاسترجاع.

الهدف: إضافة Undo/Redo عبر `zundo` temporal middleware + Revert عبر snapshot محفوظ في `markSaved`.

---

## التبعيات

| الحزمة | الإصدار المتوقع | السبب |
|------|------------------|------|
| `zundo` | `^2.2.0` | temporal middleware لـ Zustand 5 — تتبع تلقائي لـ set() |

peer deps: `zustand >=4.3` (نحن على 5.0.14 ✓)، React 19 (✓).

---

## المرحلة 1: تعديل `src/store/templateEditorStore.ts`

### 1.1 استيرادات جديدة

```ts
import { temporal } from 'zundo';
```

### 1.2 نوع `SavedSnapshot` جديد

```ts
export type SavedSnapshot = Pick<PrintTemplate,
  'name' | 'description' | 'paperSize' | 'orientation'
  | 'supportedDocuments' | 'visibility' | 'styles' | 'layout'
>;
```

### 1.3 إضافة إلى `TemplateEditorState`

- `savedSnapshot: SavedSnapshot | null;`
- `revert: () => void;` (يستعيد من snapshot)

### 1.4 تغليف الـ store بـ `temporal`

```ts
export const useTemplateEditorStore = create<TemplateEditorState>(
  temporal((set, get) => ({ ... }), {
    partialize: (state) => {
      const { activeSection, selectedBlockId, dirty, savedSnapshot, ...tracked } = state;
      return tracked;
    },
    limit: 50,
    equality: (past, curr) =>
      JSON.stringify({ n: past.name, d: past.description, ps: past.paperSize,
        o: past.orientation, sd: past.supportedDocuments, v: past.visibility,
        st: past.styles, l: past.layout })
      === JSON.stringify({ n: curr.name, d: curr.description, ps: curr.paperSize,
        o: curr.orientation, sd: curr.supportedDocuments, v: curr.visibility,
        st: curr.styles, l: curr.layout }),
  }),
);
```

### 1.5 تحديث الإجراءات

- `load(template)`: بنهايته يضبط `savedSnapshot: snapshotOf(template)` ثم `useTemplateEditorStore.temporal.getState().clear()`.
- `markSaved()`: 
  ```ts
  set((state) => ({
    dirty: false,
    savedSnapshot: { name: state.name, description: state.description, paperSize: state.paperSize, orientation: state.orientation, supportedDocuments: [...state.supportedDocuments], visibility: { ...state.visibility }, styles: { ...state.styles }, layout: deepCloneLayout(state.layout) },
  }));
  ```
- `revert()`: 
  ```ts
  const snap = get().savedSnapshot;
  if (!snap) return;
  set((state) => ({ name: snap.name, description: snap.description, paperSize: snap.paperSize, orientation: snap.orientation, supportedDocuments: [...snap.supportedDocuments], visibility: { ...snap.visibility }, styles: { ...snap.styles }, layout: deepCloneLayout(snap.layout), selectedBlockId: null, activeSection: 'body', dirty: false }));
  useTemplateEditorStore.temporal.getState().clear();
  ```
- `reset()`: يضبط `savedSnapshot: null` + `clear()` على temporal.

### 1.6 helpers

```ts
function snapshotOf(template: PrintTemplate): SavedSnapshot { ... }
function deepCloneLayout(l: TemplateLayout): TemplateLayout {
  return {
    header: l.header.map((b) => structuredClone(b)),
    body: l.body.map((b) => structuredClone(b)),
    footer: l.footer.map((b) => structuredClone(b)),
  };
}
```

`structuredClone` متوفر في Node ≥17 وكل المتصفحات الحديثة.

### 1.7 الحفاظ على `dirty` boolean

نُبقي `dirty: true` في كل mutation لتفادي كسر ~10 اختبارات تتحقق من `dirty`. zundo temporal يدير history بشكل مستقل عن `dirty`.

---

## المرحلة 2: hook جديد `src/store/useTemplateEditorHistory.ts`

```ts
import { useStore } from 'zustand';
import { useTemplateEditorStore } from './templateEditorStore';

export function useTemplateEditorHistory() {
  const pastLength = useStore(useTemplateEditorStore.temporal, (s) => s.pastStates.length);
  const futureLength = useStore(useTemplateEditorStore.temporal, (s) => s.futureStates.length);
  const undo = useStore(useTemplateEditorStore.temporal, (s) => s.undo);
  const redo = useStore(useTemplateEditorStore.temporal, (s) => s.redo);
  const clear = useStore(useTemplateEditorStore.temporal, (s) => s.clear);
  return {
    canUndo: pastLength > 0, canRedo: futureLength > 0,
    undo, redo, clear, pastLength, futureLength,
  };
}
```

`useStore` من zustand هو API الرسمي للاكتتاب على vanilla store خارج React context.

---

## المرحلة 3: UI في `src/components/print/TemplateEditor.tsx`

### 3.1 استيرادات جديدة

```ts
import { Undo2, Redo2, RotateCcw } from 'lucide-react'; // يُضاف للـ import الحالي
import { useTemplateEditorHistory } from '@/store/useTemplateEditorHistory';
```

### 3.2 subscribers جديدة (داخل المكوّن بعد subscribers الحالية)

```ts
const { canUndo, canRedo, undo, redo } = useTemplateEditorHistory();
const revert = useTemplateEditorStore((s) => s.revert);
const savedSnapshot = useTemplateEditorStore((s) => s.savedSnapshot);
const [confirmRevert, setConfirmRevert] = useState(false);
```

### 3.3 اختصارات لوحة المفاتيح (useEffect جديد)

```ts
useEffect(() => {
  if (isSystem) return;
  const handler = (e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey;
    if (!meta) return;
    if (e.key === 'z' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if (canUndo) undo();
    } else if (((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
      e.preventDefault();
      if (canRedo) redo();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [canUndo, canRedo, undo, redo, isSystem]);
```

### 3.4 أزرار Undo/Redo/Revert في الـ Header (قبل زر الحفظ)

شريط أيقونات للقوالب غير النظامية فقط، معطلين عند `!canUndo` / `!canRedo` / `!dirty || !savedSnapshot`.

### 3.5 modal تأكيد Revert

نافذة ثابتة فوق المحرر عند `confirmRevert===true`، تعرض تحذيراً وتطلب نعم/إلغاء، تستدعي `revert()` عند التأكيد.

---

## المرحلة 4: الاختبارات

### 4.1 تحديث `src/store/__tests__/templateEditorStore.test.ts`

- إضافة `useTemplateEditorStore.temporal.getState().clear()` في `beforeEach`.
- إضافة `describe('templateEditorStore — undo/redo (zundo)')`:
  - `undo يرجع آخر addBlock`
  - `redo يعيد التراجع`
  - `selection لا يدخل سجل undo (partialize)`
  - `undo عبر updateStyles يرجع Loon السابق`
  - `revert يعيد الحالة لع آخر snapshot من markSaved`
  - `revert بدون savedSnapshot يبقى صامت`
- إصلاح typo: `markReady` → `markSaved` في وصف الاختبار (line 197).

### 4.2 تحديث `src/components/print/__tests__/TemplateEditor.test.tsx`

إضافة `describe('TemplateEditor — undo/redo/revert UI')`:
- أزرار Undo/Redo معطّلة في الحالة الأولية
- Undo يصبح فعّالاً بعد addBlock، يتعطل بعد undo
- Revert معطّل قبل تعديل، فعّال بعد تعديل، معطّل بعد إعادة
- Ctrl+Z، Ctrl+Shift+Z
- Revert modal يطلب تأكيداً

---

## المخاطر والتخفيف

| الخطر | الحل |
|------|-----|
| `structuredClone` غير متوفر | متوفر في Node ≥17 وكل المتصفحات الحديثة. آمن. |
| `selectBlock` يدخل history | معالَج بـ `partialize` يستثني `selectedBlockId`. |
| undo يربك بين قوالب مختلفة | معالَج بـ `clear()` على temporal ضمن `load()`. |
| `JSON.stringify` على layout كبير بطيء | مقبول لعشرات البلوكات (limit=50). |
| `dirty` يتأثر بـ zundo؟ | لا، `dirty` مستقل وُيضبط يدوياً. |
| zundo peerdep على zustand v5 |Requires `zundo@^2.0.0`; compatible. |
| Revert وسط DnD نشط | خطر منخفض؛ `revert()` يضبط selection/section للقيم الآمنة. |

---

## ترتيب التنفيذ

| # | الملف | النوع |
|---|------|------|
| 1 | `package.json` | إضافة zundo dep + npm install |
| 2 | `src/store/templateEditorStore.ts` | تعديل (temporal + savedSnapshot + revert + helpers) |
| 3 | `src/store/useTemplateEditorHistory.ts` | جديد |
| 4 | `src/components/print/TemplateEditor.tsx` | تعديل (أزرار + shortcuts + modal) |
| 5 | `src/store/__tests__/templateEditorStore.test.ts` | تعديل (إختبارات + إصلاح typo) |
| 6 | `src/components/print/__tests__/TemplateEditor.test.tsx` | تعديل (إختبارات UI) |
| 7 | typecheck + lint + اختبارات | تحقق |
| 8 | `npm run dev` للتحقق اليدوي | verification |

المدة المقدّرة: 35-45 دقيقة.

---

## التزامات AGENTS.md (GitNexus)

- قبل تعديل `useTemplateEditorStore`: تشغيل `impact({target: "useTemplateEditorStore", direction: "upstream"})`.
- قبل تعديل `TemplateEditor`: تشغيل `impact({target: "TemplateEditor", direction: "upstream"})`.
- إذا عادت بـ HIGH/CRITICAL risk: تنبيه المستخدم قبل المتابعة.
- قبل commit: `detect_changes({scope: "compare", base_ref: "main"})` — (لن نcommit دون طلب).
