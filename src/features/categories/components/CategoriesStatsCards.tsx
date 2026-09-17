// src/features/categories/components/CategoriesStatsCards.tsx
// بطاقات المؤشرات الإحصائية الرئيسية لعائلات المنتجات (AN POS)

import React from 'react';
import { Layers, Package, AlertCircle, TrendingUp } from 'lucide-react';

export interface CategoryStats {
  total: number;
  withProducts: number;
  emptyCount: number;
  totalProducts: number;
}

interface CategoriesStatsCardsProps {
  stats: CategoryStats;
}

export const CategoriesStatsCards: React.FC<CategoriesStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-surface p-5 rounded-2xl border border-outline-variant/20 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-on-surface-variant">إجمالي العائلات</p>
          <p className="text-2xl font-black text-on-surface mt-0.5">{stats.total}</p>
        </div>
      </div>

      <div className="bg-surface p-5 rounded-2xl border border-outline-variant/20 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-on-surface-variant">عائلات نشطة</p>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{stats.withProducts}</p>
        </div>
      </div>

      <div className="bg-surface p-5 rounded-2xl border border-outline-variant/20 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-on-surface-variant">عائلات فارغة</p>
          <p className="text-2xl font-black text-amber-600 mt-0.5">{stats.emptyCount}</p>
        </div>
      </div>

      <div className="bg-surface p-5 rounded-2xl border border-outline-variant/20 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-semibold text-on-surface-variant">إجمالي الأصناف المصنفة</p>
          <p className="text-2xl font-black text-purple-600 mt-0.5">{stats.totalProducts}</p>
        </div>
      </div>
    </div>
  );
};
