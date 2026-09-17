import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDragDropMonitor, useDragOperation } from '@dnd-kit/react';
import {
  Type,
  Image as ImageIcon,
  Grid3x3,
  SeparatorHorizontal,
  QrCode,
  Barcode,
  Columns2,
  Rows3,
} from 'lucide-react';
import type {
  Block,
  PrintTemplate,
} from '@/types/invoicePrint';
import {
  getTemplateById,
  updateTemplate,
  duplicateTemplate,
  assignTemplateToDocType,
} from '@/services/print/templateService';
import {
  useTemplateEditorStore,
  createBlock,
  type Section,
} from '@/store/templateEditorStore';
import { useTemplateEditorHistory } from '@/store/useTemplateEditorHistory';
import { useNotificationStore } from '@/store/notificationStore';
import type { SecondaryTab } from './EditorSecondaryModal';

// Arabic labels for each block type (used by DragOverlay + palette ghost preview)
export const PALETTE_LABEL_AR: Record<Block['type'], string> = {
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
export const PALETTE_ICON_LUCIDE: Record<Block['type'], typeof Type> = {
  text: Type,
  image: ImageIcon,
  table: Grid3x3,
  separator: SeparatorHorizontal,
  qr: QrCode,
  barcode: Barcode,
  row: Rows3,
  column: Columns2,
};

export interface UseTemplateEditorStateOptions {
  templateId: string;
  userId: string;
  userName?: string;
}

export function useTemplateEditorState({ templateId, userId }: UseTemplateEditorStateOptions) {
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
  const moveBlockBetweenSections = useTemplateEditorStore((s) => s.moveBlockBetweenSections);
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
  const [activeTemplateId, setActiveTemplateId] = useState(templateId);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ['printTemplate', activeTemplateId],
    queryFn: () => getTemplateById(activeTemplateId),
    enabled: !!activeTemplateId,
  });

  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (template && template.id !== loadedRef.current) {
      load(template);
      loadedRef.current = template.id;
    }
  }, [template, load]);

  // دالة تحويل قالب النظام إلى نسخة مخصصة قابلة للتعديل والتحرير فوراً
  const handleCustomizeSystemTemplate = async () => {
    try {
      setIsCustomizing(true);
      const customName = `${template?.name || name} (مخصص)`;
      const newTpl = await duplicateTemplate(activeTemplateId, customName, userId, 'admin');

      // ربط القالب المخصص الجديد تلقائياً بجميع أنواع الوثائق التي يدعمها
      for (const doc of newTpl.supportedDocuments) {
        await assignTemplateToDocType(doc, newTpl.id);
      }

      await queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      await queryClient.invalidateQueries({ queryKey: ['templateAssignments'] });

      addNotification({
        title: 'تم تفعيل وضع التعديل',
        message: `تم إنشاء النسخة المخصصة "${newTpl.name}" بنجاح وتعيينها للاستخدام. القالب الآن مفتوح للتعديل والتحرير الكامل بالسحب والإفلات.`,
        type: 'success',
      });

      loadedRef.current = null;
      setActiveTemplateId(newTpl.id);
    } catch (err) {
      addNotification({
        title: 'فشل التخصيص',
        message: err instanceof Error ? err.message : 'حدث خطأ أثناء نسخ القالب',
        type: 'error',
      });
    } finally {
      setIsCustomizing(false);
    }
  };

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
      await updateTemplate(activeTemplateId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printTemplate', activeTemplateId] });
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

  const handleAddBlock = (block: Block) => {
    addBlock(activeSection, block);
  };

  // Centralized DnD side-effect handler. Reads unified `data` payloads from
  // source (useDraggable) and target (useDroppable) and dispatches store actions:
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
      if (!src.kind || (src.kind !== 'palette' && src.kind !== 'block')) return;
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

  return {
    // State values
    name,
    description,
    paperSize,
    orientation,
    supportedDocuments,
    layout,
    visibility,
    styles,
    activeSection,
    selectedBlockId,
    dirty,
    savedSnapshot,
    template,
    isLoading,
    isCustomizing,
    canUndo,
    canRedo,
    confirmRevert,
    secondaryTab,
    selectedBlock,
    overlayBlock,
    saveMutation,

    // Actions & setters
    setActiveSection,
    selectBlock,
    addBlock,
    removeBlock,
    moveBlock,
    updateBlock,
    updateMeta,
    updateStyles,
    updateVisibility,
    revert,
    undo,
    redo,
    setConfirmRevert,
    setSecondaryTab,
    handleSave,
    handleAddBlock,
    handleCustomizeSystemTemplate,
  };
}

export default useTemplateEditorState;
