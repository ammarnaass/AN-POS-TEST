// TemplateEditor — POS-PRINT-001 / FR-001 / FR-004
// محرر القوالب المرئي: Drag&Drop (@dnd-kit/react@0.5.0) + Live Preview (debounce 300ms via LivePreview).
// three-pane layout: BlockPalette | Editor Canvas (header/body/footer) | PropertiesPanel
// + Split View مع Live Preview في الجانب الأيسر (rt).
//
// يعتمد على useTemplateEditorStore (Zustand) كمصدر واحد للحقيقة. عند الحفظ
// يجمّع layout/visibility/styles/meta من الـ store ويرسلها لـ updateTemplate.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Eye, Settings as SettingsIcon, Palette, PanelsTopLeft, Type, Image as ImageIcon, Grid3x3, SeparatorHorizontal, QrCode, Barcode, Columns2, Rows3, Undo2, Redo2, RotateCcw, RectangleHorizontal, RectangleVertical, Check, Search } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DragDropProvider,
  DragOverlay,
  useDragDropMonitor,
  useDragOperation,
  useDroppable,
} from '@dnd-kit/react';
import { PointerSensor, KeyboardSensor, PointerActivationConstraints } from '@dnd-kit/dom';
import type {
  PrintTemplate,
  VisibilityMap,
  TemplateStyles,
  PaperSize,
  Orientation,
  DocTypeKey,
  Block,
} from '@/types/invoicePrint';
import { getTemplateById, updateTemplate } from '@/services/print/templateService';
import {
  PAPER_LABELS_AR,
  DOC_TYPE_LABELS_AR,
  ALL_DOC_TYPES,
} from '@/types/invoicePrint';
import {
  useTemplateEditorStore,
  createBlock,
  type Section,
} from '@/store/templateEditorStore';
import { useTemplateEditorHistory } from '@/store/useTemplateEditorHistory';
import { useNotificationStore } from '@/store/notificationStore';
import BlockPalette from './blocks/BlockPalette';
import CanvasBlock from './blocks/CanvasBlock';
import BlockPropertiesPanel from './blocks/BlockPropertiesPanel';
import LivePreview from './blocks/LivePreview';

interface TemplateEditorProps {
  templateId: string;
  userId: string;
  userName: string;
  onClose?: () => void;
}

type SecondaryTab = 'visual' | 'settings' | 'visibility' | null;

const FONT_OPTIONS = ['Cairo', 'Tajawal', 'Amiri', 'Noto Sans Arabic', 'Segoe UI'];

/** ألوان سريعة بمجموعات متكاملة (ثيمات) — كل ثيم يضبط 5 ألوان دفعة واحدة */
const THEME_PRESETS: { name: string; colors: TemplateStyles }[] = [
  {
    name: 'سماوي (افتراضي)',
    colors: {
      primaryColor: '#0891b2', headerColor: '#0e7490', footerColor: '#475569',
      tableColor: '#e2e8f0', logoColor: '#0891b2', font: { family: 'Cairo', size: 13, weight: 400 },
    },
  },
  {
    name: 'أزرق احترافي',
    colors: {
      primaryColor: '#1d4ed8', headerColor: '#1e40af', footerColor: '#64748b',
      tableColor: '#dbeafe', logoColor: '#1d4ed8', font: { family: 'Cairo', size: 13, weight: 400 },
    },
  },
  {
    name: 'أخضر زمردي',
    colors: {
      primaryColor: '#059669', headerColor: '#047857', footerColor: '#64748b',
      tableColor: '#d1fae5', logoColor: '#059669', font: { family: 'Tajawal', size: 13, weight: 400 },
    },
  },
  {
    name: 'عنابي',
    colors: {
      primaryColor: '#b91c1c', headerColor: '#991b1b', footerColor: '#57534e',
      tableColor: '#fee2e2', logoColor: '#b91c1c', font: { family: 'Cairo', size: 13, weight: 400 },
    },
  },
  {
    name: 'ملكي (ذهبي)',
    colors: {
      primaryColor: '#a16207', headerColor: '#854d0e', footerColor: '#44403c',
      tableColor: '#fef3c7', logoColor: '#a16207', font: { family: 'Amiri', size: 14, weight: 500 },
    },
  },
  {
    name: 'رمادي أنيق',
    colors: {
      primaryColor: '#334155', headerColor: '#1e293b', footerColor: '#94a3b8',
      tableColor: '#f1f5f9', logoColor: '#334155', font: { family: 'Cairo', size: 13, weight: 400 },
    },
  },
  {
    name: 'بنفسجي',
    colors: {
      primaryColor: '#7c3aed', headerColor: '#6d28d9', footerColor: '#64748b',
      tableColor: '#ede9fe', logoColor: '#7c3aed', font: { family: 'Cairo', size: 13, weight: 400 },
    },
  },
  {
    name: 'أسود كلاسيكي',
    colors: {
      primaryColor: '#18181b', headerColor: '#27272a', footerColor: '#52525b',
      tableColor: '#e4e4e7', logoColor: '#18181b', font: { family: 'Cairo', size: 13, weight: 600 },
    },
  },
];

/** ألوان سريعة (Swatches) — لتلوين سريع لـ primaryColor فقط */
const COLOR_PRESETS = [
  '#0891b2', '#0e7490', '#164e63', '#0d9488', '#0f766e',
  '#1d4ed8', '#1e40af', '#1e3a8a', '#0c4a6e', '#312e81',
  '#059669', '#047857', '#15803d', '#166534', '#65a30d',
  '#b91c1c', '#dc2626', '#991b1b', '#7f1d1d', '#9f1239',
  '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#86198f',
  '#a16207', '#d97706', '#92400e', '#78350f', '#18181b',
];

/** قوالب حقول العرض حسب نوع القالب */
const VISIBILITY_PRESETS: { name: string; applies: Partial<VisibilityMap> }[] = [
  {
    name: 'إيصال حراري مختصر',
    applies: {
      logo: true, shopName: true, invoiceNumber: true, customerName: false,
      customerPhone: false, customerAddress: false, barcode: false,
      unitPrice: true, discount: false, tva: false, sellerName: false,
      cashierName: false, paymentMethod: true, qr: false, signature: false, stamp: false,
    },
  },
  {
    name: 'فاتورة A4 كاملة',
    applies: {
      logo: true, shopName: true, invoiceNumber: true, customerName: true,
      customerPhone: true, customerAddress: true, barcode: true,
      unitPrice: true, discount: true, tva: true, sellerName: true,
      cashierName: true, paymentMethod: true, qr: true, signature: true, stamp: true,
    },
  },
  {
    name: 'فاتورة A5 متوسطة',
    applies: {
      logo: true, shopName: true, invoiceNumber: true, customerName: true,
      customerPhone: false, customerAddress: false, barcode: true,
      unitPrice: true, discount: true, tva: true, sellerName: false,
      cashierName: true, paymentMethod: true, qr: false, signature: false, stamp: false,
    },
  },
];

const SECTION_LABELS: Record<Section, string> = {
  header: 'الرأس',
  body: 'المتن',
  footer: 'التذييل',
};

const SECTION_ICONS: Record<Section, string> = {
  header: '⬆',
  body: '☰',
  footer: '⬇',
};

// Arabic labels for each block type (used by DragOverlay + palette ghost preview)
const PALETTE_LABEL_AR: Record<Block['type'], string> = {
  text: 'نص',
  image: 'صورة / شعار',
  table: 'جدول',
  separator: 'فاصل',
  qr: 'QR Code',
  barcode: 'باركود',
  row: 'صف',
  column: 'عمود',
};

// Lucide icon for each block type (DragOverlay)
const PALETTE_ICON_LUCIDE: Record<Block['type'], typeof Type> = {
  text: Type,
  image: ImageIcon,
  table: Grid3x3,
  separator: SeparatorHorizontal,
  qr: QrCode,
  barcode: Barcode,
  row: Rows3,
  column: Columns2,
};

export default function TemplateEditor({ templateId, userId, userName, onClose }: TemplateEditorProps) {
  const queryClient = useQueryClient();
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>(null);

  // ====== Store subscriptions ======
  const load = useTemplateEditorStore((s) => s.load);
  const reset = useTemplateEditorStore((s) => s.reset);
  const markSaved = useTemplateEditorStore((s) => s.markSaved);
  const setActiveSection = useTemplateEditorStore((s) => s.setActiveSection);
  const selectBlock = useTemplateEditorStore((s) => s.selectBlock);
  const addBlock = useTemplateEditorStore((s) => s.addBlock);
  const removeBlock = useTemplateEditorStore((s) => s.removeBlock);
  const moveBlock = useTemplateEditorStore((s) => s.moveBlock);
  const updateBlock = useTemplateEditorStore((s) => s.updateBlock);
  const updateMeta = useTemplateEditorStore((s) => s.updateMeta);
  const updateStyles = useTemplateEditorStore((s) => s.updateStyles);
  const updateVisibility = useTemplateEditorStore((s) => s.updateVisibility);
  const name = useTemplateEditorStore((s) => s.name);
  const description = useTemplateEditorStore((s) => s.description);
  const paperSize = useTemplateEditorStore((s) => s.paperSize);
  const orientation = useTemplateEditorStore((s) => s.orientation);
  const supportedDocuments = useTemplateEditorStore((s) => s.supportedDocuments);
  const layout = useTemplateEditorStore((s) => s.layout);
  const visibility = useTemplateEditorStore((s) => s.visibility);
  const styles = useTemplateEditorStore((s) => s.styles);
  const activeSection = useTemplateEditorStore((s) => s.activeSection);
  const selectedBlockId = useTemplateEditorStore((s) => s.selectedBlockId);
  const dirty = useTemplateEditorStore((s) => s.dirty);
  const revert = useTemplateEditorStore((s) => s.revert);
  const savedSnapshot = useTemplateEditorStore((s) => s.savedSnapshot);
  const addNotification = useNotificationStore((s) => s.addNotification);

  // ====== Undo/Redo history (zundo temporal) ======
  const { canUndo, canRedo, undo, redo } = useTemplateEditorHistory();
  const [confirmRevert, setConfirmRevert] = useState(false);

  // ====== Load template into store once ======
  const { data: template, isLoading } = useQuery({
    queryKey: ['printTemplate', templateId],
    queryFn: () => getTemplateById(templateId),
    enabled: !!templateId,
  });

  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (template && template.id !== loadedRef.current) {
      load(template);
      loadedRef.current = template.id;
    }
  }, [template, load]);

  // Cleanup: reset store عند مغادرة المحرر (مرة واحدة عند unmount)
  useEffect(() => {
    return () => {
      reset();
      loadedRef.current = null;
    };
  }, [reset]);

  // ====== Undo/Redo keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) ======
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'z' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUndo, canRedo, undo, redo]);

  // ====== Save (B4) ======
  const saveMutation = useMutation({
    mutationFn: async (updates: Partial<PrintTemplate>) => {
      await updateTemplate(templateId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplate', templateId] });
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      markSaved();
      addNotification({
        title: 'تم الحفظ',
        message: 'تم حفظ التغييرات بنجاح',
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
      addNotification({
        title: 'فشل الحفظ',
        message: msg,
        type: 'error',
      });
    },
  });

  const handleSave = async () => {
    try {
      // B4: تجميع layout + styles + visibility + meta من الـ store
      await saveMutation.mutateAsync({
        name,
        description,
        paperSize,
        orientation,
        supportedDocuments,
        styles,
        visibility,
        layout,
      });
    } catch {
      // onError في saveMutation يتعامل مع الأخطاء ويرسل إشعاراً
    }
  };

  // ====== Drag&Drop handlers (@dnd-kit/react, مركزية عبر useDragDropMonitor) ======
  const handleAddBlock = (block: Block) => {
    addBlock(activeSection, block);
  };

  // Centralized DnD side-effect handler. Reads unified `data` payloads from
  // source (useDraggable) and target (useDroppable) and dispatches store actions:
  //   - palette → section      : createBlock + addBlock
  //   - palette → before-block : createBlock + addBlock(index)
  //   - block   → section      : moveBlockBetweenSections (append)
  //   - block   → before-block : reorder (same section) or move-between (cross)
  useDragDropMonitor({
    onDragEnd: ({ source, target }) => {
      if (!source?.data || !target?.data) return;
      const src = source.data as {
        kind: 'palette' | 'block';
        blockType?: Block['type'];
        blockId?: string;
        section?: Section;
      };
      const tgt = target.data as {
        kind: 'section' | 'before-block';
        section?: Section;
        targetBlockId?: string;
      };
      if (!src.kind || src.kind !== 'palette' && src.kind !== 'block') return;
      if (!tgt.section) return;
      const targetSection: Section = tgt.section;

      const beforeBlockId = tgt.kind === 'before-block' ? tgt.targetBlockId : undefined;
      let insertIndex: number | undefined;
      if (beforeBlockId) {
        const idx = layout[targetSection].findIndex((b) => b.id === beforeBlockId);
        insertIndex = idx >= 0 ? idx : undefined;
      }

      if (src.kind === 'palette') {
        if (!src.blockType) return;
        const block = createBlock(src.blockType);
        addBlock(targetSection, block, insertIndex);
        return;
      }

      // src.kind === 'block'
      if (!src.blockId || !src.section) return;
      const srcBlockId = src.blockId;

      if (src.section === targetSection) {
        const from = layout[src.section].findIndex((b) => b.id === srcBlockId);
        if (from < 0) return;
        let to = insertIndex;
        if (to === undefined) {
          if (layout[src.section].length === 0) {
            to = 0;
          } else {
            moveBlock(src.section, from, layout[src.section].length - 1);
            return;
          }
        } else if (from < to) to = to - 1;
        if (from !== to && to !== undefined) {
          moveBlock(src.section, from, to);
        }
      } else {
        moveBlockBetweenSections(src.section, srcBlockId, targetSection, insertIndex);
      }
    },
  });

  // DragOverlay payload: renders a compact ghost preview for the dragged source.
  const dragOp = useDragOperation();
  const overlayBlock = useMemo(() => {
    const source = dragOp.source;
    if (!source?.data) return null;
    const data = source.data as {
      kind: 'palette' | 'block';
      blockType?: Block['type'];
      blockId?: string;
      section?: Section;
    };
    if (data.kind === 'palette' && data.blockType) {
      return { label: PALETTE_LABEL_AR[data.blockType], Icon: PALETTE_ICON_LUCIDE[data.blockType] };
    }
    if (data.kind === 'block' && data.blockId && data.section) {
      const b = layout[data.section].find((x) => x.id === data.blockId);
      if (!b) return null;
      return { label: PALETTE_LABEL_AR[b.type], Icon: PALETTE_ICON_LUCIDE[b.type] };
    }
    return null;
  }, [dragOp.source, layout]);

  // Selected block obj
  const selectedBlock: Block | null = useMemo(() => {
    if (!selectedBlockId) return null;
    for (const section of ['header', 'body', 'footer'] as Section[]) {
      const b = layout[section].find((x) => x.id === selectedBlockId);
      if (b) return b;
    }
    return null;
  }, [selectedBlockId, layout]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-on-surface-variant">القالب غير موجود</p>
      </div>
    );
  }

  const isSystem = template.isSystem;

  return (
    <DragDropProvider
      sensors={[
        PointerSensor.configure({
          activationConstraints: [
            new PointerActivationConstraints.Distance({ value: 5 }),
          ],
        }),
        KeyboardSensor.configure(),
      ]}
    >
    <div className="h-full flex flex-col bg-surface-container-lowest" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed/30 flex items-center justify-center">
            <PanelsTopLeft className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
              {isSystem && <span className="text-xs text-on-surface-variant">(نظام)</span>}
              {name || template.name}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {description || template.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              تغييرات غير محفوظة
            </span>
          )}
          {!isSystem && (
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => undo()}
                disabled={!canUndo}
                title="تراجع (Ctrl+Z)"
                aria-label="تراجع"
                className="w-9 h-9 rounded-lg hover:bg-surface-container transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => redo()}
                disabled={!canRedo}
                title="إعادة (Ctrl+Shift+Z)"
                aria-label="إعادة"
                className="w-9 h-9 rounded-lg hover:bg-surface-container transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-outline-variant/30 mx-1" />
              <button
                type="button"
                onClick={() => setConfirmRevert(true)}
                disabled={!dirty || !savedSnapshot}
                title="الرجوع لآخر حفظ"
                aria-label="الرجوع لآخر حفظ"
                className="w-9 h-9 rounded-lg hover:bg-surface-container transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !dirty || isSystem}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl shadow-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-surface-container transition-all flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              aria-label="إغلاق"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Body: Split View — يسار: المحرر / أيمن: Live Preview */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,40%)] overflow-hidden">
        {/* ====== Left: المحرر ====== */}
        <div className="relative flex flex-col overflow-hidden border-l border-outline-variant/20">
          {/* Section tabs */}
          <div className="flex gap-1 px-4 py-2 border-b border-outline-variant/20 bg-surface-container-low/50">
            {(['header', 'body', 'footer'] as Section[]).map((sec) => (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-lg transition-all ${
                  activeSection === sec
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span>{SECTION_ICONS[sec]}</span>
                {SECTION_LABELS[sec]}
                <span className={activeSection === sec ? 'text-on-primary/70' : 'text-on-surface-variant/60'}>
                  ({layout[sec].length})
                </span>
              </button>
            ))}
          </div>

          {/* Three-pane: Palette | Canvas | Properties */}
          <div className="flex-1 grid grid-cols-[200px_1fr_280px] overflow-hidden">
            {/* BlockPalette + أدوات ثانوية */}
            <div className="overflow-y-auto p-3 border-l border-outline-variant/20 bg-surface-container-low/30">
              <BlockPalette onAddBlock={handleAddBlock} disabled={isSystem} />
              <div className="mt-6 space-y-2 pt-4 border-t border-outline-variant/20">
                <button
                  onClick={() => setSecondaryTab('visual')}
                  className="w-full text-right text-xs text-primary hover:bg-primary/10 rounded px-2 py-1.5 flex items-center gap-2"
                >
                  <Palette className="w-3.5 h-3.5" /> المظهر
                </button>
                <button
                  onClick={() => setSecondaryTab('settings')}
                  className="w-full text-right text-xs text-primary hover:bg-primary/10 rounded px-2 py-1.5 flex items-center gap-2"
                >
                  <SettingsIcon className="w-3.5 h-3.5" /> الإعدادات
                </button>
                <button
                  onClick={() => setSecondaryTab('visibility')}
                  className="w-full text-right text-xs text-primary hover:bg-primary/10 rounded px-2 py-1.5 flex items-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" /> حقول العرض
                </button>
              </div>
            </div>

            {/* Editor Canvas */}
            <div className="overflow-y-auto p-4 bg-surface-container-lowest">
              <SectionCanvas
                section={activeSection}
                blocks={layout[activeSection]}
                selectedBlockId={selectedBlockId}
                isSystem={isSystem}
                onSelect={(id) => selectBlock(id)}
                onRemove={(id) => removeBlock(activeSection, id)}
              />
            </div>

            {/* Properties */}
            <div className="overflow-y-auto p-2 border-r border-outline-variant/20 bg-surface-container-low/30">
              <BlockPropertiesPanel
                section={activeSection}
                block={selectedBlock}
                onUpdate={(sec, id, updates) => updateBlock(sec, id, updates)}
              />
            </div>
          </div>

          {/* Secondary panels: settings / visual / visibility */}
          {secondaryTab && (
            <SecondaryPanel
              tab={secondaryTab}
              isSystem={isSystem}
              name={name}
              description={description}
              paperSize={paperSize}
              orientation={orientation}
              supportedDocuments={supportedDocuments}
              styles={styles}
              visibility={visibility}
              dirty={dirty}
              saving={saveMutation.isPending}
              onClose={() => setSecondaryTab(null)}
              onSave={handleSave}
              onMeta={(m) => updateMeta(m)}
              onStyles={(u) => updateStyles(u)}
              onVisibility={(u) => updateVisibility(u)}
            />
          )}
        </div>

        {/* ====== Right: Live Preview (B3) ====== */}
        <div className="overflow-hidden bg-surface-container-low/40 flex flex-col">
          <div className="flex-1 p-3 overflow-hidden">
            <LivePreview templateName={name || template.name} templateId={templateId} />
          </div>
        </div>
      </div>

      {/* keep userId/userName contract reference (used elsewhere in V2 history) */}
      <span className="hidden" data-user-id={userId} data-user-name={userName} />
    </div>
    <DragOverlay>
      {overlayBlock && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-high border border-primary/40 shadow-lg max-w-xs select-none">
          <overlayBlock.Icon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm text-on-surface truncate">{overlayBlock.label}</span>
        </div>
      )}
    </DragOverlay>

    {/* ====== Revert Confirmation Modal ====== */}
    {confirmRevert && (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="تأكيد الرجوع لآخر حفظ"
      >
        <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm shadow-xl mx-4">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
            الرجوع لآخر حفظ؟
          </h3>
          <p className="text-body-sm text-on-surface-variant mb-4 leading-relaxed">
            سيتم التخلي عن جميع التغييرات غير المحفوظة. لا يمكن استرجاعها.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmRevert(false)}
              className="px-4 py-2 rounded-lg hover:bg-surface-container transition-all text-on-surface"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => {
                revert();
                setConfirmRevert(false);
              }}
              className="px-4 py-2 rounded-lg bg-error text-on-error hover:bg-error/90 transition-all"
            >
              نعم، رجوع
            </button>
          </div>
        </div>
      </div>
    )}
    </DragDropProvider>
  );
}

// ====== SectionCanvas — منطقة التحرير لقسم واحد ======
interface SectionCanvasProps {
  section: Section;
  blocks: Block[];
  selectedBlockId: string | null;
  isSystem: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

function SectionCanvas({
  section, blocks, selectedBlockId, isSystem,
  onSelect, onRemove,
}: SectionCanvasProps) {
  // Drop target for the section container (للإسقاط على فراغ القسم)
  const { ref: sectionDropRef, isDropTarget: isSectionTarget } = useDroppable({
    id: `section-${section}`,
    data: { kind: 'section', section },
  });

  if (isSystem) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div className="bg-surface-container/60 p-6 rounded-xl max-w-md">
          <p className="text-on-surface-variant text-sm leading-relaxed">
            قوالب النظام محمية. انسخ القالب (من صفحة القوالب) لإنشاء نسخة قابلة للتحرير بالسحب والإفلات.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={sectionDropRef as unknown as React.Ref<HTMLDivElement>}
      className={`min-h-[420px] rounded-xl border-2 border-dashed p-3 space-y-2 transition-colors focus-within:border-primary/50 ${
        isSectionTarget ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/30'
      }`}
    >
      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 text-center text-on-surface-variant text-sm">
          <PanelsTopLeft className="w-8 h-8 mb-2 opacity-50" />
          اسحب عنصراً من القائمة على اليمين وأفلته هنا، أو انقر عليه لإضافته.
        </div>
      ) : (
        blocks.map((block) => (
          <CanvasBlock
            key={block.id}
            block={block}
            section={section}
            selected={block.id === selectedBlockId}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        ))
      )}
    </div>
  );
}

// ====== SecondaryPanel — نوافذ الإعدادات/المظهر/حقول العرض ======
interface SecondaryPanelProps {
  tab: 'visual' | 'settings' | 'visibility';
  isSystem: boolean;
  name: string;
  description: string;
  paperSize: PaperSize;
  orientation: Orientation;
  supportedDocuments: DocTypeKey[];
  styles: TemplateStyles;
  visibility: VisibilityMap;
  dirty: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onMeta: (m: Partial<Pick<PrintTemplate, 'name' | 'description' | 'paperSize' | 'orientation' | 'supportedDocuments'>>) => void;
  onStyles: (u: Partial<TemplateStyles>) => void;
  onVisibility: (u: Partial<VisibilityMap>) => void;
}

function SecondaryPanel({ tab, isSystem, name, description, paperSize, orientation, supportedDocuments, styles, visibility, dirty, saving, onClose, onSave, onMeta, onStyles, onVisibility }: SecondaryPanelProps) {
  return (
    <div className="absolute inset-0 z-20 bg-surface-container-lowest/95 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant/20">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          {tab === 'visual' && <Palette className="w-4 h-4" />}
          {tab === 'settings' && <SettingsIcon className="w-4 h-4" />}
          {tab === 'visibility' && <Eye className="w-4 h-4" />}
          {tab === 'visual' ? 'المظهر (الألوان والخطوط)' : tab === 'settings' ? 'الإعدادات' : 'حقول العرض'}
        </h3>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              تغييرات غير محفوظة
            </span>
          )}
          {!isSystem && (
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg shadow-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-surface-container transition-all flex items-center justify-center text-on-surface-variant"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        {tab === 'settings' && (
          <SettingsTab
            name={name}
            description={description}
            paperSize={paperSize}
            orientation={orientation}
            supportedDocuments={supportedDocuments}
            onMeta={onMeta}
            isSystem={isSystem}
          />
        )}
        {tab === 'visual' && <VisualTab styles={styles} onStyles={onStyles} isSystem={isSystem} />}
        {tab === 'visibility' && <VisibilityTab visibility={visibility} onVisibility={onVisibility} isSystem={isSystem} />}
      </div>
      <div className="px-6 py-3 border-t border-outline-variant/20 bg-surface-container-low/50">
        <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          المعاينة الحية على اليسار تتحدث تلقائياً مع كل تغيير
        </p>
      </div>
    </div>
  );
}

function SettingsTab({
  name, description, paperSize, orientation, supportedDocuments, onMeta, isSystem,
}: {
  name: string; description: string; paperSize: PaperSize;
  orientation: Orientation;
  supportedDocuments: DocTypeKey[];
  onMeta: (m: Partial<Pick<PrintTemplate, 'name' | 'description' | 'paperSize' | 'orientation' | 'supportedDocuments'>>) => void;
  isSystem: boolean;
}) {
  const toggleDocType = (key: DocTypeKey) => {
    const has = supportedDocuments.includes(key);
    const next = has
      ? supportedDocuments.filter((d) => d !== key)
      : [...supportedDocuments, key];
    onMeta({ supportedDocuments: next });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <label className="block font-label-lg text-on-surface mb-2">اسم القالب</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onMeta({ name: e.target.value })}
          disabled={isSystem}
          className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          placeholder="مثال: فاتورة A4 رسمية"
        />
      </div>
      <div>
        <label className="block font-label-lg text-on-surface mb-2">الوصف</label>
        <textarea
          value={description}
          onChange={(e) => onMeta({ description: e.target.value })}
          rows={3}
          disabled={isSystem}
          className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 resize-none"
          placeholder="وصف القالب..."
        />
      </div>

      <div>
        <label className="block font-label-lg text-on-surface mb-2">حجم الورق</label>
        <select
          value={paperSize}
          onChange={(e) => onMeta({ paperSize: e.target.value as PaperSize })}
          disabled={isSystem}
          className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
        >
          {Object.entries(PAPER_LABELS_AR).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-label-lg text-on-surface mb-2">اتجاه الصفحة</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => !isSystem && onMeta({ orientation: 'portrait' })}
            disabled={isSystem}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              orientation === 'portrait'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant hover:border-primary/50 text-on-surface-variant'
            }`}
          >
            <RectangleVertical className="w-4 h-4" />
            عمودي (Portrait)
          </button>
          <button
            type="button"
            onClick={() => !isSystem && onMeta({ orientation: 'landscape' })}
            disabled={isSystem}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              orientation === 'landscape'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant hover:border-primary/50 text-on-surface-variant'
            }`}
          >
            <RectangleHorizontal className="w-4 h-4" />
            أفقي (Landscape)
          </button>
        </div>
        {paperSize === '58mm' || paperSize === '76mm' || paperSize === '80mm' ? (
          <p className="text-xs text-on-surface-variant mt-2">
            💡 للورق الحراري الاتجاه العمودي هو الاعتيادي.
          </p>
        ) : null}
      </div>

      <div>
        <label className="block font-label-lg text-on-surface mb-2">أنواع المستندات</label>
        <p className="text-body-sm text-on-surface-variant mb-3">
          اختر أنواع المستندات التي سيُستخدم لها هذا القالب
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_DOC_TYPES.map((key) => {
            const active = supportedDocuments.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => !isSystem && toggleDocType(key)}
                disabled={isSystem}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant hover:border-primary/50 text-on-surface-variant'
                }`}
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center border ${active ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                  {active && <Check className="w-3 h-3 text-on-primary" />}
                </span>
                {DOC_TYPE_LABELS_AR[key]}
              </button>
            );
          })}
        </div>
      </div>

      {isSystem && (
        <div className="p-4 bg-surface-container/50 rounded-xl border border-outline-variant/30">
          <p className="text-body-sm text-on-surface-variant">
            قوالب النظام لا يمكن تعديلها. انسخ القالب لإنشاء نسخة قابلة للتعديل.
          </p>
        </div>
      )}
    </div>
  );
}

function VisualTab({ styles, onStyles, isSystem }: { styles: TemplateStyles; onStyles: (u: Partial<TemplateStyles>) => void; isSystem: boolean }) {
  const handleStyleChange = (key: keyof TemplateStyles, value: unknown) => {
    if (key === 'font') {
      onStyles({ font: { ...styles.font, ...(value as object) } });
    } else {
      onStyles({ [key]: value } as Partial<TemplateStyles>);
    }
  };

  const applyTheme = (theme: TemplateStyles) => {
    onStyles({
      primaryColor: theme.primaryColor,
      headerColor: theme.headerColor,
      footerColor: theme.footerColor,
      tableColor: theme.tableColor,
      logoColor: theme.logoColor,
      font: { ...theme.font },
    });
  };

  const colorLabels: Record<keyof TemplateStyles, string> = {
    primaryColor: 'اللون الرئيسي',
    headerColor: 'لون الرأس',
    footerColor: 'لون التذييل',
    tableColor: 'لون الجداول',
    logoColor: 'لون الشعار',
    font: '',
  };

  const colorKeys = ['primaryColor', 'headerColor', 'footerColor', 'tableColor', 'logoColor'] as const;

  return (
    <div className="space-y-8 max-w-xl">
      {isSystem && (
        <div className="p-4 bg-surface-container/50 rounded-xl border border-outline-variant/30">
          <p className="text-body-sm text-on-surface-variant">
            قوالب النظام لا يمكن تعديلها. انسخ القالب لإنشاء نسخة قابلة للتعديل.
          </p>
        </div>
      )}
      <section>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-4">ثيمات جاهزة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {THEME_PRESETS.map((theme) => (
            <button
              key={theme.name}
              type="button"
              onClick={() => !isSystem && applyTheme(theme.colors)}
              disabled={isSystem}
              className="flex flex-col gap-1.5 p-2 rounded-xl border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container/40 transition-all text-right disabled:opacity-50 disabled:cursor-not-allowed"
              title={theme.name}
            >
              <div className="flex gap-1">
                <span className="w-4 h-4 rounded-full border border-outline-variant/30" style={{ backgroundColor: theme.colors.primaryColor }} />
                <span className="w-4 h-4 rounded-full border border-outline-variant/30" style={{ backgroundColor: theme.colors.headerColor }} />
                <span className="w-4 h-4 rounded-full border border-outline-variant/30" style={{ backgroundColor: theme.colors.footerColor }} />
                <span className="w-4 h-4 rounded-full border border-outline-variant/30" style={{ backgroundColor: theme.colors.tableColor }} />
                <span className="w-4 h-4 rounded-full border border-outline-variant/30" style={{ backgroundColor: theme.colors.logoColor }} />
              </div>
              <span className="text-xs text-on-surface-variant truncate">{theme.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-4">الألوان</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {colorKeys.map((key) => (
            <div key={key}>
              <label className="block font-label-lg text-on-surface mb-2">{colorLabels[key]}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={styles[key] as string}
                  onChange={(e) => handleStyleChange(key, e.target.value)}
                  disabled={isSystem}
                  className="w-12 h-10 rounded-lg cursor-pointer border border-outline-variant shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <input
                  type="text"
                  value={styles[key] as string}
                  onChange={(e) => handleStyleChange(key, e.target.value)}
                  disabled={isSystem}
                  className="flex-1 min-w-0 px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-sm font-mono disabled:opacity-50"
                  dir="ltr"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-label-sm text-on-surface-variant mb-2">ألوان سريعة (للون الرئيسي)</p>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => !isSystem && handleStyleChange('primaryColor', c)}
                disabled={isSystem}
                className={`w-7 h-7 rounded-lg border transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  styles.primaryColor.toLowerCase() === c.toLowerCase()
                    ? 'border-primary ring-2 ring-primary/40'
                    : 'border-outline-variant/30'
                }`}
                style={{ backgroundColor: c }}
                title={c}
                aria-label={`لون ${c}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-4">الخطوط</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-label-lg text-on-surface mb-2">نوع الخط</label>
            <select
              value={styles.font.family}
              onChange={(e) => handleStyleChange('font', { family: e.target.value })}
              disabled={isSystem}
              className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-label-lg text-on-surface mb-2">حجم الخط ({styles.font.size}px)</label>
            <input
              type="range"
              min={10}
              max={18}
              value={styles.font.size}
              onChange={(e) => handleStyleChange('font', { size: Number(e.target.value) })}
              disabled={isSystem}
              className="w-full accent-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block font-label-lg text-on-surface mb-2">سمك الخط</label>
            <select
              value={styles.font.weight}
              onChange={(e) => handleStyleChange('font', { weight: Number(e.target.value) as 300 | 400 | 500 | 600 | 700 })}
              disabled={isSystem}
              className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value={300}>Light</option>
              <option value={400}>Regular</option>
              <option value={500}>Medium</option>
              <option value={600}>Semi Bold</option>
              <option value={700}>Bold</option>
            </select>
          </div>
        </div>
        <div
          className="mt-4 p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface"
          style={{ fontFamily: styles.font.family, fontSize: `${styles.font.size}px`, fontWeight: styles.font.weight }}
        >
          مثال على معاينة الخط: مرحباً بك في فاتورتك
        </div>
      </section>
    </div>
  );
}

function VisibilityTab({ visibility, onVisibility, isSystem }: { visibility: VisibilityMap; onVisibility: (u: Partial<VisibilityMap>) => void; isSystem: boolean }) {
  const [query, setQuery] = useState('');

  type Group = 'header' | 'body' | 'footer';
  const groups: { id: Group; label: string; keys: (keyof VisibilityMap)[] }[] = [
    {
      id: 'header',
      label: 'المعلومات الأساسية',
      keys: ['logo', 'shopName', 'invoiceNumber'],
    },
    {
      id: 'body',
      label: 'معلومات الفاتورة',
      keys: ['customerName', 'customerPhone', 'customerAddress', 'barcode', 'unitPrice', 'discount', 'tva'],
    },
    {
      id: 'footer',
      label: 'التذييل والتوقيع',
      keys: ['sellerName', 'cashierName', 'paymentMethod', 'qr', 'signature', 'stamp'],
    },
  ];

  const labels: Record<keyof VisibilityMap, string> = {
    logo: 'الشعار',
    shopName: 'اسم المحل',
    invoiceNumber: 'رقم الفاتورة',
    customerName: 'اسم الزبون',
    customerPhone: 'هاتف الزبون',
    customerAddress: 'عنوان الزبون',
    barcode: 'الباركود',
    unitPrice: 'سعر الوحدة',
    discount: 'الخصم',
    tva: 'TVA (الضريبة)',
    sellerName: 'اسم البائع',
    cashierName: 'اسم الكاشير',
    paymentMethod: 'طريقة الدفع',
    qr: 'QR Code',
    signature: 'التوقيع',
    stamp: 'الختم',
  };

  const applyPreset = (applies: Partial<VisibilityMap>) => {
    onVisibility(applies);
  };

  const toggleAllInGroup = (group: Group, value: boolean) => {
    const updates: Partial<VisibilityMap> = {};
    groups.find((g) => g.id === group)!.keys.forEach((k) => {
      updates[k] = value;
    });
    onVisibility(updates);
  };

  const visibleCount = Object.values(visibility).filter(Boolean).length;
  const totalCount = Object.keys(visibility).length;

  return (
    <div>
      {isSystem && (
        <div className="p-4 bg-surface-container/50 rounded-xl border border-outline-variant/30 mb-4">
          <p className="text-body-sm text-on-surface-variant">
            قوالب النظام لا يمكن تعديلها. انسخ القالب لإنشاء نسخة قابلة للتعديل.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-headline-md text-headline-md text-on-surface">العناصر المعروضة</h3>
        <span className="text-label-sm text-on-surface-variant bg-surface-container/60 px-2 py-1 rounded-full">
          {visibleCount} / {totalCount} ظاهر
        </span>
      </div>
      <p className="text-body-sm text-on-surface-variant mb-4">
        اختر العناصر التي تريد إظهارها في الفاتورة
      </p>

      {/* قوالب جاهزة */}
      <div className="mb-6">
        <p className="text-label-sm text-on-surface-variant mb-2">قوالب سريعة</p>
        <div className="flex flex-wrap gap-2">
          {VISIBILITY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => !isSystem && applyPreset(preset.applies)}
              disabled={isSystem}
              className="px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 text-sm text-on-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {preset.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => !isSystem && applyPreset(Object.fromEntries(Object.keys(visibility).map((k) => [k, true])) as VisibilityMap)}
            disabled={isSystem}
            className="px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 text-sm text-on-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            إظهار الكل
          </button>
          <button
            type="button"
            onClick={() => !isSystem && applyPreset(Object.fromEntries(Object.keys(visibility).map((k) => [k, false])) as VisibilityMap)}
            disabled={isSystem}
            className="px-3 py-1.5 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 text-sm text-on-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            إخفاء الكل
          </button>
        </div>
      </div>

      {/* بحث */}
      <div className="mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن حقل..."
            className="w-full pr-10 pl-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* مجموعات */}
      <div className="space-y-6">
        {groups.map((group) => {
          const matchingKeys = group.keys.filter((k) => labels[k].includes(query.trim()));
          if (matchingKeys.length === 0) return null;
          const groupVisibleCount = group.keys.filter((k) => visibility[k]).length;
          return (
            <div key={group.id}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-label-lg text-on-surface">{group.label}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant">{groupVisibleCount}/{group.keys.length}</span>
                  <button
                    type="button"
                    onClick={() => !isSystem && toggleAllInGroup(group.id, true)}
                    disabled={isSystem}
                    className="text-xs text-primary hover:bg-primary/10 px-2 py-0.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    إظهار
                  </button>
                  <button
                    type="button"
                    onClick={() => !isSystem && toggleAllInGroup(group.id, false)}
                    disabled={isSystem}
                    className="text-xs text-on-surface-variant hover:bg-surface-container px-2 py-0.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    إخفاء
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {matchingKeys.map((key) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      visibility[key]
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-surface-container/50 border border-transparent hover:border-outline-variant'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={visibility[key]}
                      onChange={(e) => onVisibility({ [key]: e.target.checked })}
                      disabled={isSystem}
                      className="w-5 h-5 rounded accent-primary disabled:opacity-50"
                    />
                    <span className="text-on-surface text-sm">{labels[key]}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
