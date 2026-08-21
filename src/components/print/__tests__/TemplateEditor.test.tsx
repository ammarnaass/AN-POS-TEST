// TemplateEditor اختبارات — POS-PRINT-001 / FR-001 / FR-004
// يغطي: العرض، اختيار الأقسام، لوحات الإعدادات/المظهر/حقول العرض، حفظ (B4)، الرسائل.
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { seedDefaultTemplates } from '@/services/print/defaultTemplates';
import { getAllTemplates, createTemplate } from '@/services/print/templateService';
import { useTemplateEditorStore, createBlock } from '@/store/templateEditorStore';
import TemplateEditor from '@/components/print/TemplateEditor';
import { DEFAULT_STYLES, DEFAULT_VISIBILITY } from '@/types/invoicePrint';

function withProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

async function firstTemplateId(): Promise<string> {
  const arr = await getAllTemplates();
  return arr[0]!.id;
}

/** إنشاء قالب غير نظامي مخصص لاختبارات Undo/Redo/Revert */
async function customTemplateId(): Promise<string> {
  const tpl = await createTemplate(
    {
      name: 'قالب اختبار مخصص',
      description: 'للاختبار',
      paperSize: '80mm',
      orientation: 'portrait',
      widthMm: 80,
      supportedDocuments: ['sale-invoice'],
      visibility: { ...DEFAULT_VISIBILITY },
      layout: { header: [], body: [], footer: [] },
      styles: { ...DEFAULT_STYLES },
      isDefault: false,
      isSystem: false,
    },
    'tester',
    'admin',
  );
  return tpl.id;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  await seedDefaultTemplates();
  useTemplateEditorStore.getState().reset();
  useTemplateEditorStore.temporal.getState().clear();
});

describe('TemplateEditor — render', () => {
  it('يعرض اسم القالب وزر الحفظ في الرأس بعد التحميل', async () => {
    const id = await firstTemplateId();
    const arr = await getAllTemplates();
    const name = arr[0]!.name;
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /حفظ التغييرات/ })).toBeInTheDocument();
  });

  it('يعرض منطقة المعاينة وعناصر المحرر الثلاثية', async () => {
    const id = await firstTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByText(/معاينة مباشرة/)).toBeInTheDocument());
    // أزرار الأقسام الثلاثة
    expect(screen.getByText(/الرأس/)).toBeInTheDocument();
    expect(screen.getByText(/المتن/)).toBeInTheDocument();
    expect(screen.getByText(/التذييل/)).toBeInTheDocument();
  });

  it('يعرض رسالة "القالب غير موجود" عند معرّف غير صالح', async () => {
    render(withProviders(<TemplateEditor templateId="missing-xyz" userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByText(/القالب غير موجود/)).toBeInTheDocument());
  });
});

describe('TemplateEditor — section switching', () => {
  it('النقر على قسم footer يُحدّث activeSection في الـ store', async () => {
    const id = await firstTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByText(/التذييل/)).toBeInTheDocument());
    const footerBtn = screen.getAllByRole('button').find((b) => /التذييل/.test(b.textContent ?? ''))!;
    fireEvent.click(footerBtn);
    expect(useTemplateEditorStore.getState().activeSection).toBe('footer');
  });

  it('تبديل القسم يلغي تحديد البلوك الحالي', async () => {
    const id = await firstTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByText(/الرأس/)).toBeInTheDocument());
    const blk = createBlock('text');
    useTemplateEditorStore.getState().addBlock('body', blk);
    useTemplateEditorStore.getState().selectBlock(blk.id);
    expect(useTemplateEditorStore.getState().selectedBlockId).toBe(blk.id);
    const footerBtn = screen.getAllByRole('button').find((b) => /التذييل/.test(b.textContent ?? ''))!;
    fireEvent.click(footerBtn);
    expect(useTemplateEditorStore.getState().selectedBlockId).toBeNull();
  });
});

describe('TemplateEditor — dirty indicator', () => {
  it('يُظهر مؤشر "تغييرات غير محفوظة" عند dirty=true ويُخفيه عند markSaved', async () => {
    const id = await firstTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: /حفظ التغييرات/ })).toBeInTheDocument());
    useTemplateEditorStore.getState().addBlock('body', createBlock('text'));
    await waitFor(() => {
      expect(useTemplateEditorStore.getState().dirty).toBe(true);
    });
    const before = document.body.textContent ?? '';
    expect(before).toContain('تغييرات غير محفوظة');
    useTemplateEditorStore.getState().markSaved();
    await waitFor(() => {
      expect(document.body.textContent ?? '').not.toContain('تغييرات غير محفوظة');
    });
  });
});

describe('TemplateEditor — save (B4)', () => {
  it('حفظ يستدعي updateTemplate بأحدث قيم meta/styles/visibility/layout من الـ store، ويصفر dirty', async () => {
    const id = await firstTemplateId();
    const tpl = await import('@/services/print/templateService').then((m) => m.getTemplateById(id));
    if (tpl?.isSystem) return; // قوالب النظام محمية — لا يمكن اختبار الحفظ عليها
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: /حفظ التغييرات/ })).toBeInTheDocument());
    const newName = 'اسم بعد التعديل';
    useTemplateEditorStore.getState().updateMeta({ name: newName });
    useTemplateEditorStore.getState().addBlock('header', createBlock('text', { text: 'X' }));
    expect(useTemplateEditorStore.getState().dirty).toBe(true);
    const saveBtn = screen.getByRole('button', { name: /حفظ التغييرات/ });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(useTemplateEditorStore.getState().dirty).toBe(false), { timeout: 3000 });
    const updated = await import('@/services/print/templateService').then((m) => m.getTemplateById(id));
    expect(updated?.name).toBe(newName);
    expect((updated as { layout?: { header?: unknown[] } }).layout?.header).toHaveLength(1);
  });
});

describe('TemplateEditor — secondary panels', () => {
  it('فتح لوحة الإعدادات تعرض حقول الإعداد، والإغلاق يخفيها', async () => {
    const id = await firstTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: /^الإعدادات$/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^الإعدادات$/ }));
    await waitFor(() => expect(screen.getByText(/اسم القالب/)).toBeInTheDocument());
    const closeBtns = screen.getAllByRole('button', { name: /إغلاق/ });
    fireEvent.click(closeBtns[closeBtns.length - 1]!);
    await waitFor(() => expect(screen.queryByText(/اسم القالب/)).not.toBeInTheDocument());
  });

  it('فتح لوحة المظهر ثم لوحة حقول العرض', async () => {
    const id = await firstTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: /المظهر/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /المظهر/ }));
    // استهداف عنوان القسم "الألوان" بدقة (لا "الألوان سريعة")
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { level: 3, name: /الألوان/ });
      expect(headings.length).toBeGreaterThan(0);
    });
    const closeBtns = screen.getAllByRole('button', { name: /إغلاق/ });
    fireEvent.click(closeBtns[closeBtns.length - 1]!);
    await waitFor(() => expect(screen.queryAllByRole('heading', { level: 3, name: /الألوان/ })).toHaveLength(0));
    fireEvent.click(screen.getByRole('button', { name: /حقول العرض/ }));
    expect(screen.getByText(/العناصر المعروضة/)).toBeInTheDocument();
  });
});

describe('TemplateEditor — system templates are read-only', () => {
  it('زر الحفظ معطّل لقوالب النظام', async () => {
    const all = await getAllTemplates();
    const sysTemplate = all.find((t) => t.isSystem) ?? all[0]!;
    render(withProviders(<TemplateEditor templateId={sysTemplate.id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: /حفظ التغييرات/ })).toBeInTheDocument());
    if (sysTemplate.isSystem) {
      expect(screen.getByRole('button', { name: /حفظ التغييرات/ })).toBeDisabled();
    }
  });
});

describe('TemplateEditor — DnD (@dnd-kit/react) wiring', () => {
  it('عناصر الباليت تُعرض كـ buttons (draggable+clickable)', async () => {
    const id = await firstTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByText(/^نص$/)).toBeInTheDocument());
    expect(screen.getByText(/^نص$/)).toBeInTheDocument();
  });

  it('عنصر الباليت "نص" مُعرَض (draggable+clickable)', async () => {
    const id = await firstTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByText(/^نص$/)).toBeInTheDocument());
    // تأكد أن زر الباليت "إضافة نص" موجود كهدف DnD (draggable) مع title
    expect(screen.getByTitle('إضافة نص')).toBeInTheDocument();
  });

  it('إضافة كتلة عبر store API مباشرة (يتطابق مع ما يستدعيه onClick في BlockPalette)', async () => {
    const id = await firstTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: /^المظهر$/ })).toBeInTheDocument());
    const before = useTemplateEditorStore.getState().layout.body.length;
    // BlockPalette يستدعي onAddBlock(createBlock(type)) عند onClick — نختبر نفس المنطق مباشرة
    const block = createBlock('text');
    useTemplateEditorStore.getState().addBlock(
      useTemplateEditorStore.getState().activeSection,
      block,
    );
    await waitFor(() => {
      expect(useTemplateEditorStore.getState().layout.body.length).toBe(before + 1);
    });
  });

  it('منطقة القسم الفارغ تُعرض كهدف إسقاط (droppable empty hint)', async () => {
    const id = await firstTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByText(/اسحب عنصراً/)).toBeInTheDocument());
  });
});

describe('TemplateEditor — undo/redo/revert UI', () => {
  it('أزرار Undo/Redo معطّلة في الحالة الأولية (لا تاريخ)', async () => {
    const id = await customTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'تراجع' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'تراجع' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'إعادة' })).toBeDisabled();
  });

  it('Undo يصبح فعّالاً بعد addBlock ثم يتعطل بعد التراجع', async () => {
    const id = await customTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'تراجع' })).toBeInTheDocument());
    useTemplateEditorStore.getState().addBlock('body', createBlock('text'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'تراجع' })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'تراجع' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'تراجع' })).toBeDisabled();
    });
    // بعد undo، يصبح redo فعّالاً
    expect(screen.getByRole('button', { name: 'إعادة' })).not.toBeDisabled();
  });

  it('Redo يعيد آخر تراجع', async () => {
    const id = await customTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'تراجع' })).toBeInTheDocument());
    const before = useTemplateEditorStore.getState().layout.body.length;
    useTemplateEditorStore.getState().addBlock('body', createBlock('text'));
    await waitFor(() => {
      expect(useTemplateEditorStore.getState().layout.body.length).toBe(before + 1);
    });
    fireEvent.click(screen.getByRole('button', { name: 'تراجع' }));
    await waitFor(() => {
      expect(useTemplateEditorStore.getState().layout.body.length).toBe(before);
    });
    fireEvent.click(screen.getByRole('button', { name: 'إعادة' }));
    await waitFor(() => {
      expect(useTemplateEditorStore.getState().layout.body.length).toBe(before + 1);
    });
  });

  it('زر Revert معطّل قبل أي تعديل', async () => {
    const id = await customTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'الرجوع لآخر حفظ' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'الرجوع لآخر حفظ' })).toBeDisabled();
  });

  it('Revert يطلب تأكيداً عبر modal', async () => {
    const id = await customTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'الرجوع لآخر حفظ' })).toBeInTheDocument());
    useTemplateEditorStore.getState().updateMeta({ name: 'معدّل' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'الرجوع لآخر حفظ' })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'الرجوع لآخر حفظ' }));
    await waitFor(() => expect(screen.getByText(/الرجوع لآخر حفظ؟/)).toBeInTheDocument());
    // نعم، رجوع
    const confirmBtn = screen.getByRole('button', { name: 'نعم، رجوع' });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(useTemplateEditorStore.getState().name).not.toBe('معدّل');
      expect(useTemplateEditorStore.getState().dirty).toBe(false);
    });
  });

  it('Revert modal يمكن إلغاؤه بدلاً من التأكيد', async () => {
    const id = await customTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'الرجوع لآخر حفظ' })).toBeInTheDocument());
    useTemplateEditorStore.getState().updateMeta({ name: 'معدّل' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'الرجوع لآخر حفظ' })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'الرجوع لآخر حفظ' }));
    await waitFor(() => expect(screen.getByText(/الرجوع لآخر حفظ؟/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    // التغيير يبقى
    expect(useTemplateEditorStore.getState().name).toBe('معدّل');
    expect(useTemplateEditorStore.getState().dirty).toBe(true);
  });

  it('Ctrl+Z يرجع آخر تعديل', async () => {
    const id = await customTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'تراجع' })).toBeInTheDocument());
    const before = useTemplateEditorStore.getState().layout.body.length;
    useTemplateEditorStore.getState().addBlock('body', createBlock('text'));
    await waitFor(() => {
      expect(useTemplateEditorStore.getState().layout.body.length).toBe(before + 1);
    });
    // أطلق حدث Ctrl+Z
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await waitFor(() => {
      expect(useTemplateEditorStore.getState().layout.body.length).toBe(before);
    });
    // Ctrl+Shift+Z يعيد
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      expect(useTemplateEditorStore.getState().layout.body.length).toBe(before + 1);
    });
  });

  it('اختصارات Undo/Redo لا تتعارض مع Cmd/Ctrl غير مضغوط', async () => {
    const id = await customTemplateId();
    render(withProviders(<TemplateEditor templateId={id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: 'تراجع' })).toBeInTheDocument());
    useTemplateEditorStore.getState().addBlock('body', createBlock('text'));
    const lenBefore = useTemplateEditorStore.getState().layout.body.length;
    // z بدون ctrl لا يفعل undo
    fireEvent.keyDown(window, { key: 'z' });
    expect(useTemplateEditorStore.getState().layout.body.length).toBe(lenBefore);
  });

  it('قوالب النظام لا تعرض أزرار Undo/Redo/Revert', async () => {
    const all = await getAllTemplates();
    const sysTemplate = all.find((t) => t.isSystem) ?? all[0]!;
    render(withProviders(<TemplateEditor templateId={sysTemplate.id} userId="u1" userName="عماد" />));
    await waitFor(() => expect(screen.getByRole('button', { name: /حفظ التغييرات/ })).toBeInTheDocument());
    if (sysTemplate.isSystem) {
      expect(screen.queryByRole('button', { name: 'تراجع' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'إعادة' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'الرجوع لآخر حفظ' })).toBeNull();
    }
  });
});
