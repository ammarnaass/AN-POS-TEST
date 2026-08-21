// templateEditorStore اختبارات — POS-PRINT-001 / FR-001
// يغطي: load/reset، addBlock/moveBlock/removeBlock/updateBlock، updateMeta/Styles/Visibility، markSaved، createBlock
import { describe, expect, it, beforeEach } from 'vitest';
import { useTemplateEditorStore, createBlock } from '@/store/templateEditorStore';
import type { PrintTemplate } from '@/types/invoicePrint';
import { DEFAULT_STYLES, DEFAULT_VISIBILITY } from '@/types/invoicePrint';

function makeTemplate(overrides: Partial<PrintTemplate> = {}): PrintTemplate {
  return {
    id: 'tpl_test',
    name: 'قالب اختبار',
    description: 'وصف',
    paperSize: '80mm',
    orientation: 'portrait',
    widthMm: 80,
    supportedDocuments: ['sale-invoice'],
    visibility: { ...DEFAULT_VISIBILITY },
    layout: { header: [], body: [], footer: [] },
    styles: { ...DEFAULT_STYLES },
    isDefault: false,
    isSystem: false,
    createdBy: 'tester',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

beforeEach(() => {
  useTemplateEditorStore.getState().reset();
  useTemplateEditorStore.temporal.getState().clear();
});

describe('templateEditorStore — load/reset', () => {
  it('reset يعيد الحالة إلى الافتراضية', () => {
    useTemplateEditorStore.getState().load(makeTemplate({ name: 'X' }));
    expect(useTemplateEditorStore.getState().name).toBe('X');
    useTemplateEditorStore.getState().reset();
    const s = useTemplateEditorStore.getState();
    expect(s.templateId).toBeNull();
    expect(s.name).toBe('');
    expect(s.layout).toEqual({ header: [], body: [], footer: [] });
    expect(s.dirty).toBe(false);
  });

  it('load ينسخ القالب بدون مشاركة المرجع', () => {
    const t = makeTemplate({
      layout: {
        header: [createBlock('text', { text: 'H' })],
        body: [],
        footer: [],
      },
    });
    useTemplateEditorStore.getState().load(t);
    const s = useTemplateEditorStore.getState();
    expect(s.templateId).toBe('tpl_test');
    expect(s.layout.header).toHaveLength(1);
    // تعديل نسخة المحرر لا يؤثر على القالب الأصلي
    useTemplateEditorStore.getState().removeBlock('header', s.layout.header[0]!.id);
    expect(t.layout.header).toHaveLength(1);
    expect(useTemplateEditorStore.getState().layout.header).toHaveLength(0);
  });
});

describe('templateEditorStore — add/move/remove/update', () => {
  it('addBlock يضيف في النهاية أو في فهرس محدد', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    const b1 = createBlock('text');
    store.addBlock('body', b1);
    const b2 = createBlock('separator');
    store.addBlock('body', b2, 0);
    const layout = useTemplateEditorStore.getState().layout.body;
    expect(layout).toHaveLength(2);
    expect(layout[0]!.id).toBe(b2.id);
    expect(layout[1]!.id).toBe(b1.id);
    expect(useTemplateEditorStore.getState().selectedBlockId).toBe(b2.id);
    expect(useTemplateEditorStore.getState().dirty).toBe(true);
  });

  it('moveBlock يعيد الترتيب بين الفهارس الصالحة فقط', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    const a = createBlock('text');
    const b = createBlock('text');
    const c = createBlock('text');
    store.addBlock('body', a);
    store.addBlock('body', b);
    store.addBlock('body', c);
    store.moveBlock('body', 0, 2);
    const ids = useTemplateEditorStore.getState().layout.body.map((x) => x.id);
    expect(ids).toEqual([b.id, c.id, a.id]);
  });

  it('moveBlock يتجاهل الفهارس خارج النطاق', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    store.addBlock('body', createBlock('text'));
    store.moveBlock('body', 0, 5);
    expect(useTemplateEditorStore.getState().layout.body).toHaveLength(1);
  });

  it('moveBlockBetweenSections ينقل كتلة من قسم لآخر ويضع dirty', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    const a = createBlock('text');
    const b = createBlock('separator');
    store.addBlock('header', a);
    store.addBlock('body', b);
    store.moveBlockBetweenSections('header', a.id, 'footer');
    const s = useTemplateEditorStore.getState();
    expect(s.layout.header).toHaveLength(0);
    expect(s.layout.footer).toHaveLength(1);
    expect(s.layout.footer[0]!.id).toBe(a.id);
    expect(s.layout.body).toHaveLength(1); // body بقي على حاله
    expect(s.dirty).toBe(true);
  });

  it('moveBlockBetweenSections يفشل بصمت لو blockId غير موجود أو القسم نفسه', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    const a = createBlock('text');
    store.addBlock('header', a);
    // لا يحدث شيء
    store.moveBlockBetweenSections('header', 'blk_missing', 'footer');
    store.moveBlockBetweenSections('header', a.id, 'header'); // نفس القسم
    const s = useTemplateEditorStore.getState();
    expect(s.layout.header).toHaveLength(1);
    expect(s.layout.footer).toHaveLength(0);
  });

  it('moveBlockBetweenSections يحترم toIndex الممرّر عند توفره', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    const x = createBlock('text');
    const y = createBlock('text');
    store.addBlock('body', x);
    store.addBlock('body', y);
    const moved = createBlock('separator');
    store.addBlock('header', moved);
    store.moveBlockBetweenSections('header', moved.id, 'body', 1); // الإدراج في الفهرس 1 داخل body
    const ids = useTemplateEditorStore.getState().layout.body.map((b) => b.id);
    // بعد الإدراج قبل y: [x, moved, y]
    expect(ids).toEqual([x.id, moved.id, y.id]);
  });

  it('removeBlock يحذف ويلغي تحديد البلوك لو كان محدداً', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    const blk = createBlock('text');
    store.addBlock('body', blk);
    store.selectBlock(blk.id);
    store.removeBlock('body', blk.id);
    expect(useTemplateEditorStore.getState().layout.body).toHaveLength(0);
    expect(useTemplateEditorStore.getState().selectedBlockId).toBeNull();
  });

  it('updateBlock يحدّث خصائص البلوك ويضع dirty', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    const blk = createBlock('text', { text: 'أ' });
    store.addBlock('body', blk);
    useTemplateEditorStore.getState().updateBlock('body', blk.id, { text: 'ب' });
    const updated = useTemplateEditorStore.getState().layout.body.find((x) => x.id === blk.id)!;
    expect(updated.type).toBe('text');
    expect((updated as { text: string | string[] }).text).toBe('ب');
    expect(useTemplateEditorStore.getState().dirty).toBe(true);
  });
});

describe('templateEditorStore — meta/styles/visibility/saved', () => {
  it('updateMeta يحدّث الاسم/الوصف/الحجم فقط', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate({ name: 'N', description: 'D' }));
    store.updateMeta({ name: 'N2' });
    expect(useTemplateEditorStore.getState().name).toBe('N2');
    expect(useTemplateEditorStore.getState().description).toBe('D');
    store.updateMeta({ paperSize: 'A4' });
    expect(useTemplateEditorStore.getState().paperSize).toBe('A4');
  });

  it('updateStyles يدمج التحديثات جزئياً', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    store.updateStyles({ primaryColor: '#ff0000' });
    expect(useTemplateEditorStore.getState().styles.primaryColor).toBe('#ff0000');
    expect(useTemplateEditorStore.getState().styles.font.family).toBe('Cairo');
  });

  it('updateVisibility يدمج التحديثات جزئياً', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    const wasQr = useTemplateEditorStore.getState().visibility.qr;
    store.updateVisibility({ qr: !wasQr });
    expect(useTemplateEditorStore.getState().visibility.qr).toBe(!wasQr);
  });

  it('markSaved يلغي dirty', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    store.addBlock('body', createBlock('text'));
    expect(useTemplateEditorStore.getState().dirty).toBe(true);
    store.markSaved();
    expect(useTemplateEditorStore.getState().dirty).toBe(false);
  });

  it('setActiveSection يلغي تحديد البلوك', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    const blk = createBlock('text');
    store.addBlock('body', blk);
    store.setActiveSection('footer');
    expect(useTemplateEditorStore.getState().activeSection).toBe('footer');
    expect(useTemplateEditorStore.getState().selectedBlockId).toBeNull();
  });
});

describe('createBlock — آ id وافتراضيات لكل نوع', () => {
  it('ينتج id فريد و يبدأ بـ blk_', () => {
    const a = createBlock('text');
    const b = createBlock('text');
    expect(a.id).toMatch(/^blk_/);
    expect(a.id).not.toBe(b.id);
  });

  it('table له أعمدة افتراضية و show* true', () => {
    const b = createBlock('table') as Extract<ReturnType<typeof createBlock>, { type: 'table' }>;
    expect(b.columns.length).toBeGreaterThan(0);
    expect(b.showSubtotal).toBe(true);
    expect(b.showTotal).toBe(true);
  });

  it('qr/barcode/separators لها قيم افتراضية صالحة', () => {
    const qr = createBlock('qr') as Extract<ReturnType<typeof createBlock>, { type: 'qr' }>;
    const bar = createBlock('barcode') as Extract<ReturnType<typeof createBlock>, { type: 'barcode' }>;
    const sep = createBlock('separator') as Extract<ReturnType<typeof createBlock>, { type: 'separator' }>;
    expect(qr.payload).toBe('invoiceNumber');
    expect(bar.format).toBe('CODE128');
    expect(sep.style).toBe('dashed');
  });

  it('row/column يبدآن ب	children فارغ', () => {
    const row = createBlock('row') as Extract<ReturnType<typeof createBlock>, { type: 'row' }>;
    const col = createBlock('column') as Extract<ReturnType<typeof createBlock>, { type: 'column' }>;
    expect(row.children).toEqual([]);
    expect(col.children).toEqual([]);
  });
});

describe('templateEditorStore — undo/redo (zundo temporal)', () => {
  it('undo يرجع آخر addBlock', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    useTemplateEditorStore.temporal.getState().clear();
    const blk = createBlock('text');
    store.addBlock('body', blk);
    expect(useTemplateEditorStore.getState().layout.body).toHaveLength(1);
    useTemplateEditorStore.temporal.getState().undo();
    expect(useTemplateEditorStore.getState().layout.body).toHaveLength(0);
  });

  it('redo يعيد التراجع', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    useTemplateEditorStore.temporal.getState().clear();
    const blk = createBlock('text');
    store.addBlock('body', blk);
    useTemplateEditorStore.temporal.getState().undo();
    expect(useTemplateEditorStore.getState().layout.body).toHaveLength(0);
    useTemplateEditorStore.temporal.getState().redo();
    expect(useTemplateEditorStore.getState().layout.body).toHaveLength(1);
    expect(useTemplateEditorStore.getState().layout.body[0]!.id).toBe(blk.id);
  });

  it('selectBlock لا يدخل سجل undo (partialize)', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    useTemplateEditorStore.temporal.getState().clear();
    const blk = createBlock('text');
    store.addBlock('body', blk);
    const entriesAfterAdd = useTemplateEditorStore.temporal.getState().pastStates.length;
    store.selectBlock(blk.id);
    store.selectBlock(null);
    // لا ينبغي وجود entry جديد لـ selectBlock (UI state مستثنى)
    expect(useTemplateEditorStore.temporal.getState().pastStates.length).toBe(entriesAfterAdd);
  });

  it('setActiveSection لا يدخل سجل undo (partialize)', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    useTemplateEditorStore.temporal.getState().clear();
    const before = useTemplateEditorStore.temporal.getState().pastStates.length;
    store.setActiveSection('header');
    store.setActiveSection('footer');
    expect(useTemplateEditorStore.temporal.getState().pastStates.length).toBe(before);
  });

  it('undo عبر updateStyles يرجع اللون السابق', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    useTemplateEditorStore.temporal.getState().clear();
    const original = useTemplateEditorStore.getState().styles.primaryColor;
    store.updateStyles({ primaryColor: '#ff0000' });
    expect(useTemplateEditorStore.getState().styles.primaryColor).toBe('#ff0000');
    useTemplateEditorStore.temporal.getState().undo();
    expect(useTemplateEditorStore.getState().styles.primaryColor).toBe(original);
  });

  it('undo عبر updateMeta يرجع الاسم السابق', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate({ name: 'الأصلي' }));
    useTemplateEditorStore.temporal.getState().clear();
    store.updateMeta({ name: 'معدّل' });
    expect(useTemplateEditorStore.getState().name).toBe('معدّل');
    useTemplateEditorStore.temporal.getState().undo();
    expect(useTemplateEditorStore.getState().name).toBe('الأصلي');
  });

  it('limit=50 يحترم الحد الأقصى للسجل', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    useTemplateEditorStore.temporal.getState().clear();
    for (let i = 0; i < 60; i++) {
      store.updateMeta({ name: `n${i}` });
    }
    expect(useTemplateEditorStore.temporal.getState().pastStates.length).toBeLessThanOrEqual(50);
  });

  it('clear() يمسح history فقط دون لمس الحالة الراهنة', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    const blk = createBlock('text');
    store.addBlock('body', blk);
    useTemplateEditorStore.temporal.getState().clear();
    expect(useTemplateEditorStore.temporal.getState().pastStates.length).toBe(0);
    expect(useTemplateEditorStore.temporal.getState().futureStates.length).toBe(0);
    // الحالة الراهنة لا تتأثر
    expect(useTemplateEditorStore.getState().layout.body).toHaveLength(1);
  });
});

describe('templateEditorStore — revert + savedSnapshot', () => {
  it('load يلتقط savedSnapshot من القالب', () => {
    const t = makeTemplate({ name: 'القالب الأصلي' });
    useTemplateEditorStore.getState().load(t);
    expect(useTemplateEditorStore.getState().savedSnapshot).not.toBeNull();
    expect(useTemplateEditorStore.getState().savedSnapshot?.name).toBe('القالب الأصلي');
  });

  it('markSaved يلتقط snapshot من الحالة الراهنة', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate({ name: 'الأصل' }));
    useTemplateEditorStore.temporal.getState().clear();
    store.updateMeta({ name: 'مؤكد' });
    store.markSaved();
    const snap = useTemplateEditorStore.getState().savedSnapshot;
    expect(snap?.name).toBe('مؤكد');
  });

  it('revert يعيد الحالة لآخر snapshot من markSaved', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate({ name: 'الأصل' }));
    useTemplateEditorStore.temporal.getState().clear();
    useTemplateEditorStore.getState().markSaved();
    useTemplateEditorStore.getState().updateMeta({ name: 'معدّل' });
    useTemplateEditorStore.getState().addBlock('body', createBlock('text'));
    expect(useTemplateEditorStore.getState().dirty).toBe(true);
    useTemplateEditorStore.getState().revert();
    expect(useTemplateEditorStore.getState().name).toBe('الأصل');
    expect(useTemplateEditorStore.getState().layout.body).toHaveLength(0);
    expect(useTemplateEditorStore.getState().dirty).toBe(false);
    // clear temporal بعد revert حتى لا يصبح redo
    expect(useTemplateEditorStore.temporal.getState().pastStates.length).toBe(0);
    expect(useTemplateEditorStore.temporal.getState().futureStates.length).toBe(0);
  });

  it('revert بدون savedSnapshot يبقى صامت', () => {
    useTemplateEditorStore.getState().reset();
    useTemplateEditorStore.temporal.getState().clear();
    useTemplateEditorStore.getState().updateMeta({ name: 'X' });
    // بدونsavedSnapshot (reset يعيّنه null) — لا يحدث شيء
    useTemplateEditorStore.getState().revert();
    expect(useTemplateEditorStore.getState().name).toBe('X');
  });

  it('revert يحفظ نسخة مستقلة من layout (deep clone)', () => {
    const store = useTemplateEditorStore.getState();
    store.load(makeTemplate());
    useTemplateEditorStore.temporal.getState().clear();
    const blk = createBlock('text', { text: 'A' });
    store.addBlock('body', blk);
    store.markSaved();
    // عدّل نص البلوك
    store.updateBlock('body', blk.id, { text: 'B' });
    // revert
    store.revert();
    const b = useTemplateEditorStore.getState().layout.body.find((x) => x.id === blk.id);
    expect(b).toBeDefined();
    expect((b as { text: string | string[] }).text).toBe('A');
  });

  it('reset يمسح savedSnapshot', () => {
    useTemplateEditorStore.getState().load(makeTemplate());
    expect(useTemplateEditorStore.getState().savedSnapshot).not.toBeNull();
    useTemplateEditorStore.getState().reset();
    expect(useTemplateEditorStore.getState().savedSnapshot).toBeNull();
  });
});
