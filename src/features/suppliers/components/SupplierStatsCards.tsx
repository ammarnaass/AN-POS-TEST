import React from 'react';
import { DollarSign, Package, Calendar, Truck } from 'lucide-react';
import type { SupplierStats, SupplierTab, SupplierFilterStatus } from '../types';
import { formatSupplierMoney } from '../services/supplierStatus';

interface SupplierStatsCardsProps {
  stats: SupplierStats;
  currencySymbol?: string;
  totalPurchasesCount: number;
  onSelectDebtFilter: () => void;
}

export const SupplierStatsCards: React.FC<SupplierStatsCardsProps> = ({
  stats,
  currencySymbol = 'دج',
  totalPurchasesCount,
  onSelectDebtFilter,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Total Supplier Payables */}
      <div
        onClick={onSelectDebtFilter}
        className="bg-surface-container-low/95 border border-amber-500/20 hover:border-amber-500/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden group"
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-on-surface-variant">مستحقات الموردين القائمة</span>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-mono text-amber-600 tracking-tight">
          {formatSupplierMoney(stats.totalDebt)} <span className="text-xs font-cairo font-bold">{currencySymbol}</span>
        </h3>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
          <span className="text-amber-600 font-mono font-black">{stats.suppliersWithDebt}</span>
          <span>موردين لهم مبالغ مستحقة في ذمتنا</span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
      </div>

      {/* Metric 2: Total Purchases Amount */}
      <div className="bg-surface-container-low/95 border border-primary/20 hover:border-primary/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm relative overflow-hidden group">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-on-surface-variant">إجمالي المشتريات والتوريد</span>
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-mono text-primary tracking-tight">
          {formatSupplierMoney(stats.totalPurchasesAmount)} <span className="text-xs font-cairo font-bold">{currencySymbol}</span>
        </h3>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
          <span className="text-primary font-mono font-black">{totalPurchasesCount}</span>
          <span>فاتورة توريد مسجلة بالنظام</span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-primary" />
      </div>

      {/* Metric 3: Total Deliveries Today */}
      <div className="bg-surface-container-low/95 border border-emerald-500/20 hover:border-emerald-500/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm relative overflow-hidden group">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-on-surface-variant">عمليات التوريد اليوم</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
          {stats.todayPurchasesCount} <span className="text-xs font-cairo font-bold">طلبيات</span>
        </h3>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
          <span className="text-emerald-600 font-mono font-black">{formatSupplierMoney(stats.todayTotal)} {currencySymbol}</span>
          <span>تم استلامها اليوم</span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
      </div>

      {/* Metric 4: Active Suppliers Count */}
      <div className="bg-surface-container-low/95 border border-outline-variant/20 hover:border-outline-variant/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm relative overflow-hidden group">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-on-surface-variant">إجمالي الموردين</span>
          <div className="w-9 h-9 rounded-xl bg-surface-container text-on-surface flex items-center justify-center group-hover:scale-110 transition-transform">
            <Truck className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-mono text-on-surface tracking-tight">
          {stats.totalSuppliers} <span className="text-xs font-cairo font-bold">مورد</span>
        </h3>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
          <span className="text-emerald-600 font-bold">{stats.totalSuppliers - stats.suppliersWithDebt} حسابات مسواة</span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-surface-variant" />
      </div>
    </div>
  );
};
