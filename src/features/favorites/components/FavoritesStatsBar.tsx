import React from 'react';
import { Layers, Box, Package, Store } from 'lucide-react';

interface FavoritesStatsBarProps {
  categoriesCount: number;
  favoritePacksCount: number;
  productsCount: number;
  allPacksCount: number;
}

export const FavoritesStatsBar: React.FC<FavoritesStatsBarProps> = ({
  categoriesCount,
  favoritePacksCount,
  productsCount,
  allPacksCount,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/15 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl font-black font-mono text-on-surface dark:text-white">
            {categoriesCount}
          </div>
          <div className="text-[11px] text-on-surface-variant dark:text-slate-400">
            تصنيفات المفضلة
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/15 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Box className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl font-black font-mono text-on-surface dark:text-white">
            {favoritePacksCount}
          </div>
          <div className="text-[11px] text-on-surface-variant dark:text-slate-400">
            العبوات والكراتين بالمفضلة
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/15 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl font-black font-mono text-on-surface dark:text-white">
            {productsCount}
          </div>
          <div className="text-[11px] text-on-surface-variant dark:text-slate-400">
            منتجات التجزئة بالمخزن
          </div>
        </div>
      </div>

      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/15 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl font-black font-mono text-on-surface dark:text-white">
            {allPacksCount}
          </div>
          <div className="text-[11px] text-on-surface-variant dark:text-slate-400">
            إجمالي العبوات بالمخزن
          </div>
        </div>
      </div>
    </div>
  );
};
