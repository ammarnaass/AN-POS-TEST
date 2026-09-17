// src/features/categories/components/CategoriesTable.tsx
// جدول بيانات عائلات المنتجات مع التسلسل الهرمي والإجراءات (AN POS)

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { Category } from '@/services/api/categoriesApi';
import { getCategoryIcon } from '../constants/categoryConstants';

interface CategoriesTableProps {
  categories: Category[];
  categoryMap: Map<string, string>;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}

export const CategoriesTable: React.FC<CategoriesTableProps> = ({
  categories,
  categoryMap,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="bg-surface-container-low border-b border-outline-variant/20 text-xs font-bold text-on-surface-variant">
            <th className="px-5 py-4">العائلة</th>
            <th className="px-5 py-4">العائلة الرئيسية</th>
            <th className="px-5 py-4">الوصف</th>
            <th className="px-5 py-4 text-center">عدد المنتجات</th>
            <th className="px-5 py-4 text-center">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10 text-sm">
          {categories.map((cat) => {
            const IconComp = getCategoryIcon(cat.icon);
            const parentName = cat.parentId ? categoryMap.get(cat.parentId) : '—';
            const catColor = cat.color || '#3B82F6';

            return (
              <tr key={cat.id} className="hover:bg-surface-container-lowest transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: `${catColor}18`,
                        color: catColor,
                      }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-on-surface font-cairo">{cat.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-on-surface-variant">{parentName}</td>
                <td className="px-5 py-3.5 text-xs text-on-surface-variant max-w-xs truncate">
                  {cat.description || '—'}
                </td>
                <td className="px-5 py-3.5 text-center font-bold text-on-surface">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-surface-container-low text-xs border border-outline-variant/20">
                    {cat.productCount ?? 0}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(cat)}
                      className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(cat)}
                      className="p-1.5 rounded-lg hover:bg-error/15 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
