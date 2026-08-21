// CanvasBlock — عرض بلوك مفرد في منطقة التحرير
// يدعم: التحديد، إعادة الترتيب عبر @dnd-kit/react (useDraggable + useDroppable)، الحذف، النقر للتحديد.
// شريط إدراج علوي رفيع يضيء عند `isDropTarget` كعلامة لإسقاط "قبل هذه الكتلة".
import { useDraggable, useDroppable } from '@dnd-kit/react';
import type { Block } from '@/types/invoicePrint';
import type { Section } from '@/store/templateEditorStore';

interface Props {
  block: Block;
  section: Section;
  selected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

const BLOCK_LABEL: Record<Block['type'], string> = {
  text: 'نص',
  image: 'صورة',
  row: 'صف',
  column: 'عمود',
  table: 'جدول',
  separator: 'فاصل',
  qr: 'QR',
  barcode: 'باركود',
};

const BLOCK_ICON: Record<Block['type'], string> = {
  text: '📝', image: '🖼️', row: '▭', column: '▣',
  table: '📊', separator: '➖', qr: '⬛', barcode: '|#|',
};

function describe(b: Block): string {
  switch (b.type) {
    case 'text': {
      const t = Array.isArray(b.text) ? b.text.join(' | ') : b.text;
      return String(t).slice(0, 60);
    }
    case 'image':
      return b.src ? `صورة مرفقة` : 'الشعار (افتراضي)';
    case 'table':
      return `${b.columns.length} أعمدة`;
    case 'qr':
      return `payload: ${b.payload}`;
    case 'barcode':
      return `مصدر: ${b.source} · ${b.format}`;
    case 'row':
    case 'column':
      return `${b.children.length} بلوك فرعي`;
    case 'separator':
      return b.style ?? 'dashed';
    default:
      return '';
  }
}

export default function CanvasBlock({
  block, section, selected, onSelect, onRemove,
}: Props) {
  const {
    ref: dragRef,
    isDragSource,
    isDragging,
  } = useDraggable({
    id: `block-${block.id}`,
    data: { kind: 'block', blockId: block.id, section },
  });

  const { ref: dropRef, isDropTarget } = useDroppable({
    id: `before-${block.id}`,
    data: { kind: 'before-block', targetBlockId: block.id, section },
  });

  return (
    <div className="relative">
      {/* شريط إدراج علوي — هدف الإسقاط للإدراج قبل هذه الكتلة */}
      <div
        ref={dropRef as unknown as React.Ref<HTMLDivElement>}
        className={`h-1 -mt-1 mb-0.5 rounded-full transition-colors ${
          isDropTarget ? 'bg-primary' : 'bg-transparent'
        }`}
        aria-hidden
      />
      <div
        ref={dragRef as unknown as React.Ref<HTMLDivElement>}
        onClick={() => onSelect(block.id)}
        className={`group flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
          selected
            ? 'border-primary bg-primary/10 shadow-sm'
            : 'border-outline-variant bg-surface-container-lowest hover:border-outline-variant/60'
        } ${isDragging ? 'opacity-50' : isDragSource ? 'cursor-grabbing' : ''}`}
      >
        <span className="text-lg flex-shrink-0">{BLOCK_ICON[block.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-on-surface text-sm">{BLOCK_LABEL[block.type]}</div>
          <div className="text-xs text-on-surface-variant truncate">{describe(block)}</div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="cursor-grab text-on-surface-variant text-xs px-1" title="اسحب لإعادة الترتيب">⠿</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(block.id); }}
            className="text-red-500 hover:bg-red-50 rounded px-1.5 py-0.5 text-xs"
            title="حذف"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
