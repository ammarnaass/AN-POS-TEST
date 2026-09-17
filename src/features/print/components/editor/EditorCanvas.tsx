import React from 'react';
import { useDroppable } from '@dnd-kit/react';
import { PanelsTopLeft, Edit2, Sparkles } from 'lucide-react';
import type { Block } from '@/types/invoicePrint';
import type { Section } from '@/store/templateEditorStore';
import CanvasBlock from '@/components/print/blocks/CanvasBlock';

export interface EditorCanvasProps {
  section: Section;
  blocks: Block[];
  selectedBlockId: string | null;
  isSystem: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onCustomize?: () => void;
  isCustomizing?: boolean;
}

export function EditorCanvas({
  section,
  blocks,
  selectedBlockId,
  isSystem,
  onSelect,
  onRemove,
  onCustomize,
  isCustomizing,
}: EditorCanvasProps) {
  // Drop target for the section container (للإسقاط على فراغ القسم)
  const { ref: sectionDropRef, isDropTarget: isSectionTarget } = useDroppable({
    id: `section-${section}`,
    data: { kind: 'section', section },
  });

  if (isSystem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] text-center p-8 gap-4">
        <div className="bg-surface-container/80 border border-primary/25 p-6 rounded-2xl max-w-md shadow-sm space-y-3.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
            <Edit2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-on-surface">هذا قالب نظامي مسبق الإعداد</h4>
          <p className="text-on-surface-variant text-xs leading-relaxed">
            لتعديل النصوص، الحقول، الألوان، الشعار، أو التخطيط بالسحب والإفلات، اضغط على الزر أدناه لتفعيل التعديل فوراً على نسختك المخصصة.
          </p>
          <button
            type="button"
            onClick={onCustomize}
            disabled={isCustomizing}
            className="w-full py-2.5 px-4 bg-primary text-on-primary hover:bg-primary/90 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isCustomizing ? 'جاري تجهيز النسخة المخصصة...' : 'تخصيص وتعديل هذا القالب الآن'}</span>
          </button>
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

export default EditorCanvas;
