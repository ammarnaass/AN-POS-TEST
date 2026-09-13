import React from 'react';
import { Layers, Plus } from 'lucide-react';

interface PacksEmptyStateProps {
  hasSearchQuery: boolean;
  onOpenCreate: () => void;
}

export const PacksEmptyState: React.FC<PacksEmptyStateProps> = ({
  hasSearchQuery,
  onOpenCreate,
}) => {
  return (
    <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40">
      <Layers className="w-12 h-12 mx-auto text-on-surface-variant/40 mb-3" />
      <h3 className="text-base font-bold text-on-surface font-cairo">لا توجد عبوات مطابقة</h3>
      <p className="text-xs text-on-surface-variant font-tajawal mt-1">
        {hasSearchQuery
          ? 'جرب البحث بكلمة أو باركود آخر'
          : 'ابدأ بإنشاء عبوة جملة جديدة لربط منتجاتك معاً'}
      </p>
      {!hasSearchQuery && (
        <button
          onClick={onOpenCreate}
          className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold font-tajawal inline-flex items-center gap-1.5 shadow-sm cursor-pointer hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          إضافة عبوة جديدة
        </button>
      )}
    </div>
  );
};
