import React from 'react';
import { Package, AlertTriangle, ShieldAlert, TrendingUp } from 'lucide-react';
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
      {/* Card 1: Total Products */}
      <div
        onClick={() => {
          onSelectStockStatus('all');
          onClearCategory();
        }}
        className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
          filterStockStatus === 'all' && filterCategory === ''
            ? 'bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/30'
            : 'bg-surface-container border-outline-variant/20 hover:border-outline-variant/40 hover:shadow-md'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold">
            المخزون الكلي
          </span>
        </div>
        <p className="text-body-sm text-on-surface-variant">إجمالي الأصناف</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="font-cairo text-2xl font-bold text-on-surface">{stats.totalProducts}</h3>
          <span className="text-xs text-on-surface-variant">صنف مسجل</span>
        </div>
        <div className="mt-3 pt-3 border-t border-outline-variant/10 flex justify-between items-center text-xs text-on-surface-variant">
          <span>النشطة: {activeProductsCount}</span>
          <span>المعطلة: {inactiveProductsCount}</span>
        </div>
      </div>

      {/* Card 2: Low Stock Warning */}
      <div
        onClick={() => onSelectStockStatus('low_stock')}
        className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
          filterStockStatus === 'low_stock'
            ? 'bg-amber-500/10 border-amber-500/50 shadow-sm ring-1 ring-amber-500/40'
            : 'bg-surface-container border-outline-variant/20 hover:border-amber-500/30 hover:shadow-md'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              stats.lowStock > 0 ? 'bg-amber-500/15 text-amber-500 animate-pulse' : 'bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            {stats.lowStock > 0 ? 'يتطلب إعادة طلب' : 'مستقر'}
          </span>
        </div>
        <p className="text-body-sm text-on-surface-variant">مخزون منخفض</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className={`font-cairo text-2xl font-bold ${stats.lowStock > 0 ? 'text-amber-500' : 'text-on-surface'}`}>
            {stats.lowStock}
          </h3>
          <span className="text-xs text-on-surface-variant">منتج تحت حد الأمان</span>
        </div>
        <div className="mt-3 pt-3 border-t border-outline-variant/10 text-xs text-amber-600 dark:text-amber-400 font-medium">
          اضغط للتصفية السريعة
        </div>
      </div>

      {/* Card 3: Out of Stock */}
      <div
        onClick={() => onSelectStockStatus('out_of_stock')}
        className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
          filterStockStatus === 'out_of_stock'
            ? 'bg-rose-500/10 border-rose-500/50 shadow-sm ring-1 ring-rose-500/40'
            : 'bg-surface-container border-outline-variant/20 hover:border-rose-500/30 hover:shadow-md'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              stats.outOfStock > 0 ? 'bg-rose-500/15 text-rose-500' : 'bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            {stats.outOfStock > 0 ? 'نفاد الكمية' : 'مكتمل'}
          </span>
        </div>
        <p className="text-body-sm text-on-surface-variant">منتجات نافذة (0)</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className={`font-cairo text-2xl font-bold ${stats.outOfStock > 0 ? 'text-rose-500' : 'text-on-surface'}`}>
            {stats.outOfStock}
          </h3>
          <span className="text-xs text-on-surface-variant">منتج غير متوفر للبيع</span>
        </div>
        <div className="mt-3 pt-3 border-t border-outline-variant/10 text-xs text-rose-600 dark:text-rose-400 font-medium">
          اضغط لتحديد النواقص
        </div>
      </div>

      {/* Card 4: Inventory Valuation */}
      <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/20 hover:border-outline-variant/40 transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
            هامش متوقع: +{stats.avgMargin.toFixed(0)}%
          </span>
        </div>
        <p className="text-body-sm text-on-surface-variant">القيمة الإجمالية (بالتكلفة)</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="font-cairo text-xl font-bold text-on-surface truncate">
            {stats.stockValue.toLocaleString('ar-DZ')} <span className="text-xs font-normal">دج</span>
          </h3>
        </div>
        <div className="mt-3 pt-3 border-t border-outline-variant/10 flex justify-between items-center text-xs text-on-surface-variant">
          <span>قيمة البيع:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {stats.retailValue.toLocaleString('ar-DZ')} دج
          </span>
        </div>
      </div>
    </div>
  );
};

export default InventoryStatsCards;
