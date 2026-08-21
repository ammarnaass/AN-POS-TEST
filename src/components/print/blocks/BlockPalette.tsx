// BlockPalette — POS-PRINT-001 / FR-001
// لوحة العناصر القابلة للسحب (Draggable) عبر @dnd-kit/react@0.5.0
import { useDraggable } from '@dnd-kit/react';
import type { Block } from '@/types/invoicePrint';
import { createBlock } from '@/store/templateEditorStore';

interface PaletteItem {
  type: Block['type'];
  label: string;
  icon: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'text', label: 'نص', icon: '📝' },
  { type: 'image', label: 'صورة / شعار', icon: '🖼️' },
  { type: 'table', label: 'جدول', icon: '📊' },
  { type: 'separator', label: 'فاصل', icon: '➖' },
  { type: 'qr', label: 'QR Code', icon: '⬛' },
  { type: 'barcode', label: 'باركود', icon: '|#|' },
  { type: 'row', label: 'صف', icon: '▭' },
  { type: 'column', label: 'عمود', icon: '▣' },
];

interface Props {
  onAddBlock: (block: Block) => void;
  disabled?: boolean;
}

function PaletteItemButton({
  item,
  disabled,
  onClick,
}: {
  item: PaletteItem;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { ref, isDragSource } = useDraggable({
    id: `palette-${item.type}`,
    data: { kind: 'palette', blockType: item.type },
    disabled,
  });

  return (
    <button
      ref={ref as unknown as React.Ref<HTMLButtonElement>}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-2 p-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container hover:border-primary/50 transition-all text-sm ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : isDragSource
            ? 'cursor-grabbing border-primary/60 bg-primary/5'
            : 'cursor-grab'
      }`}
      title={`إضافة ${item.label}`}
    >
      <span className="text-base">{item.icon}</span>
      <span className="text-on-surface">{item.label}</span>
    </button>
  );
}

export default function BlockPalette({ onAddBlock, disabled }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="font-label-lg text-on-surface mb-2">العناصر</h3>
      <p className="text-xs text-on-surface-variant mb-3">
        اسحب عنصراً وأفلته في منطقة التحرير، أو انقر لإضافته.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PALETTE_ITEMS.map((item) => (
          <PaletteItemButton
            key={item.type}
            item={item}
            disabled={disabled}
            onClick={() => onAddBlock(createBlock(item.type))}
          />
        ))}
      </div>
    </div>
  );
}
