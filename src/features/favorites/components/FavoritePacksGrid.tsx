import React from 'react';
import { Search, X, Zap, Plus, Box } from 'lucide-react';
import type { FavoriteItem, FavoriteCategory } from '../types';
import { FavoritePackCard } from './FavoritePackCard';

interface FavoritePacksGridProps {
  selectedCatId: string;
  activeCategory?: FavoriteCategory;
  categoriesCount: number;
  displayedItems: FavoriteItem[];
  categories: FavoriteCategory[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenQuickPack: () => void;
  onOpenAddItems: () => void;
  onOpenEditPack: (item: FavoriteItem) => void;
  onRemoveItem: (id: string) => void;
}

export const FavoritePacksGrid: React.FC<FavoritePacksGridProps> = ({
  selectedCatId,
  activeCategory,
  categoriesCount,
  displayedItems,
  categories,
  searchQuery,
  setSearchQuery,
  onOpenQuickPack,
  onOpenAddItems,
  onOpenEditPack,
  onRemoveItem,
}) => {
  return (
    <div className="lg:col-span-3 space-y-4">
      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Top Filter & Actions in Items list */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/15 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-on-surface dark:text-white">
              {selectedCatId === 'ALL'
                ? 'جميع العبوات والكراتين المفضلة'
                : activeCategory?.name || 'التصنيف المحدد'}
            </span>
            <span className="text-xs text-on-surface-variant dark:text-slate-400">
              ({displayedItems.length} عبوة)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 dark:text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المفضلة..."
                className="w-full pl-3 pr-9 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary font-tajawal"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenQuickPack}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              title="إنشاء كرتونة أو باقة بدون باركود من منتج تجزئة"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>⚡ إنشاء عبوة سريعة</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (categoriesCount === 0) {
                  alert('يرجى إضافة تصنيف مفضلة أولاً');
                  return;
                }
                onOpenAddItems();
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              title="إضافة عبوات من المخزن أو تحويل منتجات إلى كراتين"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة عبوات</span>
            </button>
          </div>
        </div>

        {/* Grid of Items */}
        {displayedItems.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Box className="w-8 h-8 stroke-1" />
            </div>
            <h3 className="text-sm font-bold text-on-surface dark:text-white">
              لا توجد عبوات أو كراتين في هذا التصنيف حالياً
            </h3>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 max-w-sm mx-auto">
              أنشئ كراتين وعبوات سريعة بدون باركود (مثل 6 علب حليب) لتظهر فورياً كأزرار باللمس في كاشير تصميم 5
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={onOpenQuickPack}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-xs transition active:scale-95"
              >
                <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>⚡ إنشاء عبوة سريعة (كرتونة)</span>
              </button>
              <button
                type="button"
                onClick={onOpenAddItems}
                className="inline-flex items-center gap-1.5 bg-surface-container dark:bg-slate-800 text-on-surface dark:text-slate-200 border border-outline-variant/30 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer hover:bg-surface-container-high transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة عبوات من المخزن</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {displayedItems.map((item) => {
              const parentCat = categories.find((c) => c.id === item.categoryId);

              return (
                <FavoritePackCard
                  key={item.id}
                  item={item}
                  parentCat={parentCat}
                  onOpenEditPack={onOpenEditPack}
                  onRemoveItem={onRemoveItem}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
