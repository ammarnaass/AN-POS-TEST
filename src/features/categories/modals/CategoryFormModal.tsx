// src/features/categories/modals/CategoryFormModal.tsx
// نافذة إضافة وتعديل عائلات وفئات المنتجات (AN POS)

import React from 'react';
import { FolderPlus, X, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import type { Category, CategoryWrite } from '@/services/api/categoriesApi';
import { AVAILABLE_ICONS, COLOR_PALETTE } from '../constants/categoryConstants';

interface CategoryFormModalProps {
  isOpen: boolean;
  editing: Category | null;
  form: CategoryWrite;
  categories: Category[];
  formError: string;
  isDuplicateName?: boolean;
  isSubmitting: boolean;
  onFormChange: (form: CategoryWrite) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  editing,
  form,
  categories,
  formError,
  isDuplicateName = false,
  isSubmitting,
  onFormChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg border border-outline-variant/20 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* رأس المودال */}
        <div className="px-6 py-5 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h3 className="font-cairo text-lg font-black text-on-surface">
              {editing ? 'تعديل بيانات العائلة' : 'إضافة عائلة جديدة'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوى النموذج */}
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {/* اسم الفئة */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-on-surface">
                اسم العائلة / الفئة <span className="text-error">*</span>
              </label>
              {isDuplicateName && (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  مكرر
                </span>
              )}
            </div>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              autoFocus
              className={`w-full h-11 px-4 bg-surface-container-low rounded-xl text-sm text-right focus:outline-none focus:ring-2 border font-semibold transition-colors ${
                isDuplicateName
                  ? 'border-amber-500/80 focus:ring-amber-500/30 text-amber-700 dark:text-amber-300'
                  : 'border-outline-variant/20 focus:ring-primary/30'
              }`}
              placeholder="مثال: مشروبات، ألبان، معلبات..."
            />
            {isDuplicateName && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>عائلة بهذا الاسم موجودة مسبقاً — يُرجى اختيار اسم آخر لمنع التكرار آنياً.</span>
              </div>
            )}
          </div>

          {/* العائلة الرئيسية (للتسلسل الهرمي) */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">
              العائلة الرئيسية (اختياري)
            </label>
            <select
              value={form.parentId || ''}
              onChange={(e) => onFormChange({ ...form, parentId: e.target.value || null })}
              className="w-full h-11 px-4 bg-surface-container-low rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20"
            >
              <option value="">— عائلة رئيسية مستقلة —</option>
              {categories
                .filter((c) => !editing || c.id !== editing.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* لوحة اختيار اللون */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">لون العائلة المميز</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onFormChange({ ...form, color: c.hex })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    form.color === c.hex
                      ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-sm'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {form.color === c.hex && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* شبكة اختيار الأيقونة (14 أيقونة) */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">أيقونة العائلة</label>
            <div className="grid grid-cols-7 gap-2 max-h-36 overflow-y-auto p-1.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
              {AVAILABLE_ICONS.map((item) => {
                const Icon = item.icon;
                const isSelected = form.icon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onFormChange({ ...form, icon: item.id })}
                    className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-on-primary shadow-sm scale-105'
                        : 'bg-surface text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* الوصف */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">الوصف والملاحظات</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20 resize-none"
              placeholder="وصف مختصر لمحتويات هذه العائلة..."
            />
          </div>

          {/* رسالة الخطأ في النموذج */}
          {formError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-2 text-error text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isDuplicateName || !form.name.trim()}
              title={isDuplicateName ? 'اسم العائلة مكرر — يُرجى اختيار اسم آخر' : undefined}
              className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                isDuplicateName || !form.name.trim()
                  ? 'bg-outline-variant/30 text-on-surface-variant/40 cursor-not-allowed shadow-none'
                  : 'bg-primary text-on-primary hover:brightness-110 active:scale-95 shadow-primary/20 cursor-pointer'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{editing ? 'حفظ التعديلات' : 'إضافة العائلة'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-12 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container-highest transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
