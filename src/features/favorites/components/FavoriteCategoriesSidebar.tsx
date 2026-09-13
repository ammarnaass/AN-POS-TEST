import React from 'react';
import { Filter, Plus, Star, Edit2, Trash2 } from 'lucide-react';
import type { FavoriteCategory, FavoriteItem } from '../types';
import { ICON_MAP } from '../constants/favoriteVisuals';

interface FavoriteCategoriesSidebarProps {
  categories: FavoriteCategory[];
  items: FavoriteItem[];
  selectedCatId: string;
  onSelectCategory: (id: string) => void;
  onOpenNewCategory: () => void;
  onOpenEditCategory: (cat: FavoriteCategory, e: React.MouseEvent) => void;
  onDeleteCategory: (id: string, e: React.MouseEvent) => void;
}

export const FavoriteCategoriesSidebar: React.FC<FavoriteCategoriesSidebarProps> = ({
  categories,
  items,
  selectedCatId,
  onSelectCategory,
  onOpenNewCategory,
  onOpenEditCategory,
  onDeleteCategory,
}) => {
  const totalFavoritePacks = items.filter((it) => it.type === 'pack').length;

  return (
    <div className="lg:col-span-1 space-y-3">
      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 dark:border-slate-800 mb-3">
          <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>تصنيفات المفضلة ({categories.length})</span>
          </span>
          <button
            type="button"
            onClick={onOpenNewCategory}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة</span>
          </button>
        </div>

        <div className="space-y-1.5">
          {/* "ALL" category */}
          <button
            type="button"
            onClick={() => onSelectCategory('ALL')}
            className={`w-full text-right p-3 rounded-2xl flex items-center justify-between transition cursor-pointer ${
              selectedCatId === 'ALL'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'bg-surface-container dark:bg-slate-800/60 hover:bg-surface-container-high dark:hover:bg-slate-800 text-on-surface dark:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star
                className={`w-4 h-4 ${selectedCatId === 'ALL' ? 'text-white' : 'text-amber-500'}`}
              />
              <span className="text-xs font-bold">جميع العبوات المفضلة</span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedCatId === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {totalFavoritePacks}
            </span>
          </button>

          {/* Dynamic categories */}
          {categories.map((cat) => {
            const isSelected = selectedCatId === cat.id;
            const catItemsCount = items.filter(
              (it) => it.type === 'pack' && it.categoryId === cat.id
            ).length;
            const IconComponent = (cat.icon && ICON_MAP[cat.icon]) || Star;

            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`group w-full text-right p-3 rounded-2xl flex items-center justify-between transition cursor-pointer border ${
                  isSelected
                    ? 'border-primary bg-primary text-on-primary font-bold shadow-sm'
                    : 'border-transparent bg-surface-container dark:bg-slate-800/60 hover:border-outline-variant/30 hover:bg-surface-container-high dark:hover:bg-slate-800 text-on-surface dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: cat.color || '#2563eb' }}
                  />
                  <IconComponent
                    className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-primary'}`}
                  />
                  <span className="text-xs font-bold truncate">{cat.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {catItemsCount}
                  </span>

                  {/* Action buttons */}
                  <button
                    type="button"
                    onClick={(e) => onOpenEditCategory(cat, e)}
                    className={`p-1 rounded-lg opacity-80 hover:opacity-100 transition cursor-pointer ${
                      isSelected
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                    }`}
                    title="تعديل التصنيف"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onDeleteCategory(cat.id, e)}
                    className={`p-1 rounded-lg opacity-80 hover:opacity-100 transition cursor-pointer ${
                      isSelected
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500'
                    }`}
                    title="حذف التصنيف"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
