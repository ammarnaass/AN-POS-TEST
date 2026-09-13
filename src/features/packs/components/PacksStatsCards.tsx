import React from 'react';
import { Layers, Gift, Package, TrendingUp } from 'lucide-react';
import type { PackStats } from '../types';

interface PacksStatsCardsProps {
  stats: PackStats;
}

export const PacksStatsCards: React.FC<PacksStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. إجمالي الباقات المسجلة */}
      <div className="relative overflow-hidden bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 hover:border-primary/40 transition-all shadow-2xs group">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Layers className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/40">
            {stats.activePacks} نشطة
          </span>
        </div>
        <div className="mt-4">
          <span className="text-xs text-on-surface-variant font-medium">إجمالي الباقات والحزم</span>
          <div className="text-2xl sm:text-3xl font-black text-on-surface font-cairo mt-0.5">
            {stats.totalPacks}
          </div>
        </div>
      </div>

      {/* 2. باقات وحزم مجمعة (Bundles) */}
      <div className="relative overflow-hidden bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 hover:border-purple-500/40 transition-all shadow-2xs group">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Gift className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/40">
            عروض مجمعة
          </span>
        </div>
        <div className="mt-4">
          <span className="text-xs text-on-surface-variant font-medium">باقات وحزم مجمعة 🎁</span>
          <div className="text-2xl sm:text-3xl font-black text-on-surface font-cairo mt-0.5 text-purple-600 dark:text-purple-400">
            {stats.bundlesCount}
          </div>
        </div>
      </div>

      {/* 3. كراتين وطرود جملة (Wholesale Cartons) */}
      <div className="relative overflow-hidden bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 hover:border-emerald-500/40 transition-all shadow-2xs group">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Package className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/40">
            {stats.halfWholesaleCount > 0 ? `+${stats.halfWholesaleCount} نصف جملة` : 'تعبئة الجملة'}
          </span>
        </div>
        <div className="mt-4">
          <span className="text-xs text-on-surface-variant font-medium">طرود وكراتين الجملة 📦</span>
          <div className="text-2xl sm:text-3xl font-black text-on-surface font-cairo mt-0.5 text-emerald-600 dark:text-emerald-400">
            {stats.wholesaleCount}
          </div>
        </div>
      </div>

      {/* 4. المنتجات المشمولة ومتوسط الهامش */}
      <div className="relative overflow-hidden bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 hover:border-amber-500/40 transition-all shadow-2xs group">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/40">
            {stats.totalProductsCount} منتج مرتبط
          </span>
        </div>
        <div className="mt-4">
          <span className="text-xs text-on-surface-variant font-medium">متوسط هامش الربح</span>
          <div className="text-2xl sm:text-3xl font-black text-on-surface font-cairo mt-0.5 text-amber-600 dark:text-amber-400">
            {stats.avgMargin > 0 ? `${stats.avgMargin}%` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
};
