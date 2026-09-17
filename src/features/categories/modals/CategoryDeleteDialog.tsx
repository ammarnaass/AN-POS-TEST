// src/features/categories/modals/CategoryDeleteDialog.tsx
// نافذة تأكيد حذف العائلة وفحص سلامة المنتجات المرتبطة (AN POS)

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Category } from '@/services/api/categoriesApi';

interface CategoryDeleteDialogProps {
  category: Category | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CategoryDeleteDialog: React.FC<CategoryDeleteDialogProps> = ({
  category,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!category) return null;

  const hasProducts = (category.productCount ?? 0) > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-surface rounded-3xl shadow-2xl w-full max-w-md p-6 border border-outline-variant/20 text-right animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-black text-on-surface font-cairo">
          تأكيد حذف الفئة: "{category.name}"
        </h3>

        <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
          {hasProducts ? (
            <span className="text-error font-bold">
              تحذير: يوجد {category.productCount} منتج مرتبط بهذه العائلة. يرجى إعادة تعيين فئات المنتجات أولاً قبل حذفها.
            </span>
          ) : (
            'هل أنت متأكد من رغبتك في حذف هذه العائلة نهائياً؟ لن تتمكن من التراجع عن هذا الإجراء.'
          )}
        </p>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting || hasProducts}
            className="flex-1 h-11 bg-error text-on-error rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-error/20 disabled:opacity-40 cursor-pointer"
          >
            {isDeleting ? 'جاري الحذف...' : 'نعم، احذف'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 h-11 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container-highest transition-all cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
