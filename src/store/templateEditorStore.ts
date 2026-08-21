// templateEditorStore — POS-PRINT-001 / FR-001
// Store مركزية لمحرر القوالب: تُدير blocks (header/body/footer)، selection، section نشط، dirty.
// + Undo/Redo عبر zundo temporal middleware + SavedSnapshot @ markSaved لإعادة Revert.
// Browser-compatible: Zustand + zundo فقط بدون أي إعتماد خارجي آخر.
import { create } from 'zustand';
import { temporal } from 'zundo';
import type {
  Block,
  TemplateLayout,
  PrintTemplate,
  VisibilityMap,
  TemplateStyles,
  PaperSize,
  Orientation,
  DocTypeKey,
} from '@/types/invoicePrint';

export type Section = keyof TemplateLayout; // 'header' | 'body' | 'footer'

/**
 * Snapshot يُلتقط عند markSaved/load لتمكين Revert لآخر حفظ.
 * يضمّ الحقول القابلة للتعديل فقط (لا يشمل UI state ولا dirty).
 */
export type SavedSnapshot = Pick<
  PrintTemplate,
  'name' | 'description' | 'paperSize' | 'orientation'
  | 'supportedDocuments' | 'visibility' | 'styles' | 'layout'
>;

interface TemplateEditorState {
  templateId: string | null;
  name: string;
  description: string;
  paperSize: PaperSize;
  orientation: Orientation;
  supportedDocuments: DocTypeKey[];
  visibility: VisibilityMap;
  styles: TemplateStyles;
  layout: TemplateLayout;

  activeSection: Section;
  selectedBlockId: string | null;
  dirty: boolean;

  /** آخر حالة محفوظة — لتمكين Revert لآخر حفظ */
  savedSnapshot: SavedSnapshot | null;

  load: (template: PrintTemplate) => void;
  reset: () => void;

  setActiveSection: (section: Section) => void;
  selectBlock: (blockId: string | null) => void;

  addBlock: (section: Section, block: Block, index?: number) => void;
  moveBlock: (section: Section, fromIndex: number, toIndex: number) => void;
  moveBlockBetweenSections: (
    fromSection: Section,
    blockId: string,
    toSection: Section,
    toIndex?: number,
  ) => void;
  removeBlock: (section: Section, blockId: string) => void;
  updateBlock: (section: Section, blockId: string, updates: Partial<Block>) => void;

  updateMeta: (
    meta: Partial<Pick<PrintTemplate, 'name' | 'description' | 'paperSize' | 'orientation' | 'supportedDocuments'>>,
  ) => void;
  updateStyles: (updates: Partial<TemplateStyles>) => void;
  updateVisibility: (updates: Partial<VisibilityMap>) => void;

  markSaved: () => void;
  /** استعادة الحالة من savedSnapshot (آخر حفظ) ومسح history stack */
  revert: () => void;
}

const EMPTY_LAYOUT: TemplateLayout = { header: [], body: [], footer: [] };

const DEFAULT_STYLES: TemplateStyles = {
  primaryColor: '#0891b2',
  headerColor: '#0e7490',
  footerColor: '#475569',
  tableColor: '#e2e8f0',
  logoColor: '#0891b2',
  font: { family: 'Cairo', size: 13, weight: 400 },
};

const DEFAULT_VISIBILITY: VisibilityMap = {
  logo: true,
  shopName: true,
  invoiceNumber: true,
  customerName: true,
  customerPhone: false,
  customerAddress: false,
  barcode: true,
  unitPrice: true,
  discount: true,
  tva: true,
  sellerName: true,
  cashierName: true,
  paymentMethod: true,
  qr: false,
  signature: false,
  stamp: false,
};

/** نسخة عميقة من layout عبر structuredClone (متاح Node ≥17 وكل المتصفحات الحديثة) */
function deepCloneLayout(l: TemplateLayout): TemplateLayout {
  return {
    header: l.header.map((b) => structuredClone(b)),
    body: l.body.map((b) => structuredClone(b)),
    footer: l.footer.map((b) => structuredClone(b)),
  };
}

/** التقط snapshot من قالب (لـ load) أو من حالة المحرر (لـ markSaved) */
function snapshotOf(template: PrintTemplate): SavedSnapshot {
  return {
    name: template.name,
    description: template.description,
    paperSize: template.paperSize,
    orientation: template.orientation,
    supportedDocuments: [...template.supportedDocuments],
    visibility: { ...template.visibility },
    styles: { ...template.styles },
    layout: deepCloneLayout(template.layout),
  };
}

/**
 * عناصر حالة UI التي لا تدخلها سجل undo.
 * يتم استثناؤها عبر partialize بحيث النقر على بلوك لتغيير selection لا يدخل history.
 * تعريف يعتمد على TrackedFields (Picks فقط).
 */
type TrackedFields = Pick<TemplateEditorState,
  'templateId' | 'name' | 'description' | 'paperSize' | 'orientation'
  | 'supportedDocuments' | 'visibility' | 'styles' | 'layout'
>;

/**
 * مقارنة دلالية للحقول المتتبعة فقط (تجاهل UI state).
 * إذا تساوت الحالة المتتبعة، لا ندفع entry جديد لـ history.
 */
function trackedEqual(a: TrackedFields, b: TrackedFields): boolean {
  return (
    a.templateId === b.templateId &&
    a.name === b.name &&
    a.description === b.description &&
    a.paperSize === b.paperSize &&
    a.orientation === b.orientation &&
    a.supportedDocuments.length === b.supportedDocuments.length &&
    a.supportedDocuments.every((v, i) => v === b.supportedDocuments[i]) &&
    a.visibility === b.visibility &&
    a.styles === b.styles &&
    a.layout === b.layout
  );
}

export const useTemplateEditorStore = create<TemplateEditorState>(
  temporal(
    (set, get) => ({
      templateId: null,
      name: '',
      description: '',
      paperSize: '80mm',
      orientation: 'portrait',
      supportedDocuments: [],
      visibility: { ...DEFAULT_VISIBILITY },
      styles: { ...DEFAULT_STYLES },
      layout: {
        header: [...EMPTY_LAYOUT.header],
        body: [...EMPTY_LAYOUT.body],
        footer: [...EMPTY_LAYOUT.footer],
      },
      activeSection: 'body',
      selectedBlockId: null,
      dirty: false,
      savedSnapshot: null,

      load: (template) => {
        set({
          templateId: template.id,
          name: template.name,
          description: template.description,
          paperSize: template.paperSize,
          orientation: template.orientation,
          supportedDocuments: [...template.supportedDocuments],
          visibility: { ...template.visibility },
          styles: { ...template.styles },
          layout: {
            header: [...template.layout.header],
            body: [...template.layout.body],
            footer: [...template.layout.footer],
          },
          activeSection: 'body',
          selectedBlockId: null,
          dirty: false,
          savedSnapshot: snapshotOf(template),
        });
        // امسح history بعد تحميل قالب جديد — لا undo عبر القوالب
        useTemplateEditorStore.temporal.getState().clear();
      },

      reset: () => {
        set({
          templateId: null,
          name: '',
          description: '',
          paperSize: '80mm',
          orientation: 'portrait',
          supportedDocuments: [],
          visibility: { ...DEFAULT_VISIBILITY },
          styles: { ...DEFAULT_STYLES },
          layout: {
            header: [...EMPTY_LAYOUT.header],
            body: [...EMPTY_LAYOUT.body],
            footer: [...EMPTY_LAYOUT.footer],
          },
          activeSection: 'body',
          selectedBlockId: null,
          dirty: false,
          savedSnapshot: null,
        });
        useTemplateEditorStore.temporal.getState().clear();
      },

      setActiveSection: (section) => set({ activeSection: section, selectedBlockId: null }),

      selectBlock: (blockId) => set({ selectedBlockId: blockId }),

      addBlock: (section, block, index) =>
        set((state) => {
          const blocks = [...state.layout[section]];
          if (index === undefined || index < 0 || index > blocks.length) {
            blocks.push(block);
          } else {
            blocks.splice(index, 0, block);
          }
          return {
            layout: { ...state.layout, [section]: blocks },
            selectedBlockId: block.id,
            dirty: true,
          };
        }),

      moveBlock: (section, fromIndex, toIndex) =>
        set((state) => {
          const blocks = [...state.layout[section]];
          if (
            fromIndex < 0 ||
            fromIndex >= blocks.length ||
            toIndex < 0 ||
            toIndex >= blocks.length ||
            fromIndex === toIndex
          ) {
            return state;
          }
          const [moved] = blocks.splice(fromIndex, 1);
          blocks.splice(toIndex, 0, moved);
          return { layout: { ...state.layout, [section]: blocks }, dirty: true };
        }),

      moveBlockBetweenSections: (fromSection, blockId, toSection, toIndex) =>
        set((state) => {
          if (fromSection === toSection) return state;
          const fromBlocks = state.layout[fromSection];
          const idx = fromBlocks.findIndex((b) => b.id === blockId);
          if (idx < 0) return state;
          const [moved] = fromBlocks.splice(idx, 1);
          const toBlocks = [...state.layout[toSection]];
          if (toIndex === undefined || toIndex < 0 || toIndex > toBlocks.length) {
            toBlocks.push(moved);
          } else {
            toBlocks.splice(toIndex, 0, moved);
          }
          return {
            layout: {
              ...state.layout,
              [fromSection]: fromBlocks,
              [toSection]: toBlocks,
            },
            selectedBlockId:
              state.selectedBlockId === blockId ? blockId : state.selectedBlockId,
            dirty: true,
          };
        }),

      removeBlock: (section, blockId) =>
        set((state) => {
          const blocks = state.layout[section].filter((b) => b.id !== blockId);
          return {
            layout: { ...state.layout, [section]: blocks },
            selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
            dirty: true,
          };
        }),

      updateBlock: (section, blockId, updates) =>
        set((state) => {
          const blocks = state.layout[section].map((b) =>
            b.id === blockId ? ({ ...b, ...updates } as Block) : b,
          );
          return { layout: { ...state.layout, [section]: blocks }, dirty: true };
        }),

      updateMeta: (meta) =>
        set((state) => ({
          name: meta.name !== undefined ? meta.name : state.name,
          description: meta.description !== undefined ? meta.description : state.description,
          paperSize: meta.paperSize !== undefined ? meta.paperSize : state.paperSize,
          orientation: meta.orientation !== undefined ? meta.orientation : state.orientation,
          supportedDocuments:
            meta.supportedDocuments !== undefined
              ? [...meta.supportedDocuments]
              : state.supportedDocuments,
          dirty: true,
        })),

      updateStyles: (updates) =>
        set((state) => ({
          styles: { ...state.styles, ...updates },
          dirty: true,
        })),

      updateVisibility: (updates) =>
        set((state) => ({
          visibility: { ...state.visibility, ...updates },
          dirty: true,
        })),

      markSaved: () =>
        set((state) => ({
          dirty: false,
          savedSnapshot: {
            name: state.name,
            description: state.description,
            paperSize: state.paperSize,
            orientation: state.orientation,
            supportedDocuments: [...state.supportedDocuments],
            visibility: { ...state.visibility },
            styles: { ...state.styles },
            layout: deepCloneLayout(state.layout),
          },
        })),

      revert: () => {
        const snap = get().savedSnapshot;
        if (!snap) return;
        set({
          name: snap.name,
          description: snap.description,
          paperSize: snap.paperSize,
          orientation: snap.orientation,
          supportedDocuments: [...snap.supportedDocuments],
          visibility: { ...snap.visibility },
          styles: { ...snap.styles },
          layout: deepCloneLayout(snap.layout),
          selectedBlockId: null,
          activeSection: 'body',
          dirty: false,
        });
        // امسح history بعد Revert حتى لا يصبح redo لقيمة mid-edit
        useTemplateEditorStore.temporal.getState().clear();
      },
    }),
    {
      // نتتبع فقط الحقول دلالية (لا UI state ولا snapshot)
      partialize: (state): TrackedFields => ({
        templateId: state.templateId,
        name: state.name,
        description: state.description,
        paperSize: state.paperSize,
        orientation: state.orientation,
        supportedDocuments: state.supportedDocuments,
        visibility: state.visibility,
        styles: state.styles,
        layout: state.layout,
      }),
      limit: 50,
      equality: (past, curr) => trackedEqual(past as TrackedFields, curr as TrackedFields),
    },
  ),
);

/**
 * توليد block جديد بـ id فريد وقيمة افتراضية لكل نوع.
 */
export function createBlock<T extends Block['type']>(type: T, partial: Partial<Block> = {}): Block {
  const id = 'blk_' + crypto.randomUUID().slice(0, 8);
  switch (type) {
    case 'text':
      return { id, type: 'text', text: 'نص جديد', align: 'right', size: 'md', ...partial } as Block;
    case 'image':
      return { id, type: 'image', src: '', width: 80, height: 80, align: 'center', ...partial } as Block;
    case 'row':
      return { id, type: 'row', children: [], gap: 8, align: 'space-between', ...partial } as Block;
    case 'column':
      return { id, type: 'column', children: [], gap: 8, ...partial } as Block;
    case 'table':
      return {
        id,
        type: 'table',
        source: 'items',
        columns: [
          { key: 'name', label: 'المنتج', align: 'right', format: 'text' },
          { key: 'qty', label: 'الكمية', align: 'center', format: 'number' },
          { key: 'lineTotal', label: 'المجموع', align: 'left', format: 'currency' },
        ],
        showSubtotal: true,
        showTotal: true,
        showDiscount: true,
        showTva: true,
        ...partial,
      } as Block;
    case 'separator':
      return { id, type: 'separator', style: 'dashed', ...partial } as Block;
    case 'qr':
      return { id, type: 'qr', payload: 'invoiceNumber', size: 110, ...partial } as Block;
    case 'barcode':
      return { id, type: 'barcode', source: 'invoiceNumber', width: 200, height: 50, format: 'CODE128', ...partial } as Block;
    default:
      return { id, type: 'text', text: 'بلوك' } as Block;
  }
}
