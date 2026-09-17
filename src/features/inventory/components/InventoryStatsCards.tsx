import React from 'react';
import { Package, AlertTriangle, ShieldAlert, TrendingUp, ChevronLeft } from 'lucide-react';
import type { StockFilterStatus } from '../hooks/useInventoryFilter';

interface InventoryStatsCardsProps {
  stats: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    expiringSoonCount: number;
    stockValue: number;
    retailValue: number;
    avgMargin: number;
  };
  activeProductsCount: number;
  inactiveProductsCount: number;
  filterStockStatus: StockFilterStatus;
  filterCategory: string;
  onSelectStockStatus: (status: StockFilterStatus) => void;
  onClearCategory: () => void;
}

export const InventoryStatsCards: React.FC<InventoryStatsCardsProps> = ({
  stats,
  activeProductsCount,
  inactiveProductsCount,
  filterStockStatus,
  filterCategory,
  onSelectStockStatus,
  onClearCategory,
}) => {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-purpose="kpi-metrics" dir="rtl">
      {/* Card 1: Total Stock (المخزون الكلي) */}
      <div
        onClick={() => {
          onSelectStockStatus('all');
          onClearCategory();
        }}
        className={`bg-blue-50/70 dark:bg-blue-950/20 border-2 rounded-2xl p-4 relative flex flex-col justify-between shadow-xs transition hover:shadow-md cursor-pointer group ${
          filterStockStatus === 'all' && filterCategory === ''
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
            : 'border-blue-200/80 dark:border-blue-800/40 hover:border-blue-400'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
            المخزون الكلي
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">إجمالي الأصناف</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {stats.totalProducts}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">صنف مسجل</span>
          </div>
        </div>
        <div className="pt-3 mt-3 border-t border-blue-200/60 dark:border-blue-800/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>النشطة: <strong className="text-slate-800 dark:text-slate-200 font-bold font-mono">{activeProductsCount}</strong></span>
          <span>المعطلة: <strong className="text-slate-800 dark:text-slate-200 font-bold font-mono">{inactiveProductsCount}</strong></span>
        </div>
      </div>

      {/* Card 2: Low Stock (مخزون منخفض) */}
      <div
        onClick={() => onSelectStockStatus('low_stock')}
        className={`bg-amber-50/50 dark:bg-amber-950/20 border rounded-2xl p-4 relative flex flex-col justify-between shadow-xs transition hover:shadow-md cursor-pointer group ${
          filterStockStatus === 'low_stock'
            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
            : 'border-amber-200 dark:border-amber-800/40 hover:border-amber-400'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <span
            className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-md ${
              stats.lowStock > 0
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
            }`}
          >
            {stats.lowStock > 0 ? 'يتطلب إعادة طلب' : 'مستقر'}
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">مخزون منخفض</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`text-3xl font-extrabold font-mono ${stats.lowStock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
              {stats.lowStock}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">منتج تحت حد الأمان</span>
          </div>
        </div>
        <div className="pt-3 mt-3 border-t border-amber-200/60 dark:border-amber-800/40 text-right">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 group-hover:underline">
            <span>اضغط للتصفية السريعة</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Card 3: Out of Stock (منتجات نافذة) */}
      <div
        onClick={() => onSelectStockStatus('out_of_stock')}
        className={`bg-rose-50/50 dark:bg-rose-950/20 border rounded-2xl p-4 relative flex flex-col justify-between shadow-xs transition hover:shadow-md cursor-pointer group ${
          filterStockStatus === 'out_of_stock'
            ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
            : 'border-rose-200 dark:border-rose-800/40 hover:border-rose-400'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <span
            className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-md ${
              stats.outOfStock > 0
                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300'
                : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {stats.outOfStock > 0 ? 'نفاد' : 'مكتمل'}
          </span>
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">منتجات نافذة ({stats.outOfStock})</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`text-3xl font-extrabold font-mono ${stats.outOfStock > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
              {stats.outOfStock}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">منتج غير متوفر للبيع</span>
          </div>
        </div>
        <div className="pt-3 mt-3 border-t border-rose-200/60 dark:border-rose-800/40 text-right">
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 group-hover:underline">
            <span>اضغط لتحديد النواقص</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Card 4: Total Inventory Value (القيمة الإجمالية) */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 relative flex flex-col justify-between shadow-xs transition hover:shadow-md">
        <div className="flex items-start justify-between mb-2">
          <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-mono">
            هامش متوقع: +{stats.avgMargin.toFixed(0)}%
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">القيمة الإجمالية (بالتكلفة)</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {stats.stockValue.toLocaleString('ar-DZ')}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">دج</span>
          </div>
        </div>
        <div className="pt-3 mt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">قيمة البيع:</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
            {stats.retailValue.toLocaleString('ar-DZ')} دج
          </span>
        </div>
      </div>
    </section>
  );
};

export default InventoryStatsCards;
