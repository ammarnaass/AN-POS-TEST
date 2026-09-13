import React from 'react';
import { FolderPlus, X, Check } from 'lucide-react';
import type { FavoriteCategory } from '../types';
import { ICON_MAP, COLOR_OPTIONS } from '../constants/favoriteVisuals';

interface CategoryFormModalProps {
  isOpen: boolean;
  editingCategory: FavoriteCategory | null;
  name: string;
  setName: (name: string) => void;
  icon: string;
  setIcon: (icon: string) => void;
  color: string;
  setColor: (color: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  editingCategory,
  name,
  setName,
  icon,
  setIcon,
  color,
  setColor,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 font-tajawal">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 dark:border-slate-800">
          <h3 className="text-base font-bold font-cairo text-on-surface dark:text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            <span>{editingCategory ? 'تعديل تصنيف المفضلة' : 'إنشاء تصنيف مفضلة جديد'}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1.5">
              اسم التصنيف
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: عبوات المشروبات، كراتين المنظفات..."
              className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-slate-800 border border-outline-variant/30 dark:border-slate-700 rounded-xl text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary"
            />
          </div>

          {/* Icon selection */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1.5">
              أيقونة التصنيف
            </label>
            <div className="grid grid-cols-5 gap-2">
              {Object.keys(ICON_MAP).map((iconKey) => {
                const IconComp = ICON_MAP[iconKey];
                const isSelected = icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-outline-variant/20 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color selection */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1.5">
              لون وسم التصنيف
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                    color === c.hex
                      ? 'scale-115 ring-2 ring-offset-2 ring-primary'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/15 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl shadow-xs hover:bg-primary/90 transition cursor-pointer"
            >
              {editingCategory ? 'حفظ التعديلات' : 'إنشاء التصنيف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
