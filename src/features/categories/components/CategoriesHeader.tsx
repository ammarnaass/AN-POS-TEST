// src/features/categories/components/CategoriesHeader.tsx
// ترويسة صفحة عائلات المنتجات مع شارة الإحصاء وزر الإضافة (AN POS)

import React from 'react';
import { FolderTree, Plus } from 'lucide-react';

interface CategoriesHeaderProps {
  totalCount: number;
  onOpenNew: () => void;
}

export const CategoriesHeader: React.FC<CategoriesHeaderProps> = ({
  totalCount,
  onOpenNew,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
          <FolderTree className="w-7 h-7" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-on-surface font-cairo tracking-tight">
              عائلات المنتجات
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-primary/15 text-primary border border-primary/20">
              {totalCount} عائلة
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            تنظيم وتصنيف البضائع والمنتجات، وربطها بالأقسام لسرعة الوصول في الكاشير
          </p>
        </div>
      </div>

      <button
        onClick={onOpenNew}
        className="flex items-center gap-2.5 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/25 cursor-pointer"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>إضافة عائلة جديدة</span>
      </button>
    </div>
  );
};
