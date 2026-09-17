// src/features/categories/components/CategoriesGrid.tsx
// شبكة بطاقات عائلات المنتجات مع الألوان المميزة والأيقونات والإحصائيات (AN POS)

import React from 'react';
import { Edit2, Trash2, Package } from 'lucide-react';
import type { Category } from '@/services/api/categoriesApi';
import { getCategoryIcon } from '../constants/categoryConstants';

interface CategoriesGridProps {
  categories: Category[];
  categoryMap: Map<string, string>;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onAddSub: (parentId: string) => void;
}

export const CategoriesGrid: React.FC<CategoriesGridProps> = ({
  categories,
  categoryMap,
  onEdit,
  onDelete,
  onAddSub,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categories.map((cat) => {
        const IconComp = getCategoryIcon(cat.icon);
        const parentName = cat.parentId ? categoryMap.get(cat.parentId) : null;
        const catColor = cat.color || '#3B82F6';

        return (
          <div
            key={cat.id}
            className="group relative bg-surface hover:bg-surface-container-lowest transition-all duration-200 rounded-2xl p-5 border border-outline-variant/20 hover:border-primary/40 hover:shadow-lg flex flex-col justify-between"
          >
            {/* الرأس مع الأيقونة واللون */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm"
                  style={{
                    backgroundColor: `${catColor}18`,
                    color: catColor,
                    border: `1px solid ${catColor}35`,
                  }}
                >
                  <IconComp className="w-6 h-6" />
                </div>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(cat)}
                    className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    title="تعديل العائلة"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(cat)}
                    className="p-1.5 rounded-lg hover:bg-error/15 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                    title="حذف العائلة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* اسم العائلة والوصف */}
              <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors font-cairo">
                {cat.name}
              </h3>

              {parentName && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-md mt-1 border border-outline-variant/15">
                  <span>تابعة لـ:</span>
                  <span className="font-bold text-on-surface">{parentName}</span>
                </span>
              )}

              <p className="text-xs text-on-surface-variant line-clamp-2 mt-2 leading-relaxed min-h-[32px]">
                {cat.description || 'لا يوجد وصف محدد لهذه العائلة.'}
              </p>
            </div>

            {/* شريط الإحصائيات السفلي */}
            <div className="mt-4 pt-3 border-t border-outline-variant/15 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-on-surface-variant/70" />
                <span className="text-xs font-bold text-on-surface">
                  {cat.productCount ?? 0}
                </span>
                <span className="text-xs text-on-surface-variant">منتج</span>
              </div>

              <button
                onClick={() => onAddSub(cat.id)}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                title="إضافة عائلة فرعية تتبع هذه العائلة"
              >
                <span>+ فرعية</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
