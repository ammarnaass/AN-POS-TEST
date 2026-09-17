// src/features/categories/components/CategoriesEmptyState.tsx
// حالة انعدام النتائج أو العائلات مع إجراء الإضافة السريع (AN POS)

import React from 'react';
import { Package, Plus } from 'lucide-react';

interface CategoriesEmptyStateProps {
  search: string;
  onOpenNew: () => void;
}

export const CategoriesEmptyState: React.FC<CategoriesEmptyStateProps> = ({
  search,
  onOpenNew,
}) => {
  return (
    <div className="bg-surface rounded-3xl border border-dashed border-outline-variant/40 p-12 text-center flex flex-col items-center justify-center">
      <div className="w-20 h-20 rounded-3xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 mb-4">
        <Package className="w-10 h-10" />
      </div>
      <h3 className="text-lg font-bold text-on-surface font-cairo">لا توجد عائلات مطابقة</h3>
      <p className="text-sm text-on-surface-variant max-w-sm mt-1 mb-6">
        {search
          ? 'لم نجد أي فئة تطابق عبارة البحث الحالية.'
          : 'ابدأ بإضافة أول عائلة لتصنيف منتجاتك وتسهيل عمليات البيع.'}
      </p>
      <button
        onClick={onOpenNew}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 transition-all cursor-pointer shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>إضافة عائلة الآن</span>
      </button>
    </div>
  );
};
