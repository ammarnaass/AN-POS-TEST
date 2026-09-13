import React from 'react';
import { DollarSign, CheckCircle2, ShieldAlert, Users } from 'lucide-react';
import type { CustomerStatsData } from '../types';
import { formatCustomerMoney } from '../services/customerStatus';

interface CustomerStatsCardsProps {
  stats: CustomerStatsData;
  currencySymbol?: string;
  paymentsCount?: number;
  onFilterDebt?: () => void;
  onFilterExceeded?: () => void;
}

export const CustomerStatsCards: React.FC<CustomerStatsCardsProps> = ({
  stats,
  currencySymbol = 'دج',
  paymentsCount = 0,
  onFilterDebt = () => {},
  onFilterExceeded = () => {},
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Total Outstanding Debts */}
      <div
        onClick={onFilterDebt}
        className="bg-surface-container-low/95 border border-red-500/20 hover:border-red-500/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden group"
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-on-surface-variant">إجمالي الديون القائمة</span>
          <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-mono text-red-600 tracking-tight">
          {formatCustomerMoney(stats.totalDebt)} <span className="text-xs font-cairo font-bold">{currencySymbol}</span>
        </h3>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
          <span className="text-red-500 font-mono font-black">{stats.customersWithDebt}</span>
          <span>زبائن عليهم مبالغ مستحقة</span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-red-500" />
      </div>

      {/* Metric 2: Total Payments Collected */}
      <div className="bg-surface-container-low/95 border border-emerald-500/20 hover:border-emerald-500/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm relative overflow-hidden group">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-on-surface-variant">إجمالي التحصيلات</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
          {formatCustomerMoney(stats.totalCollections)} <span className="text-xs font-cairo font-bold">{currencySymbol}</span>
        </h3>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
          <span className="text-emerald-600 font-mono font-black">{paymentsCount}</span>
          <span>عملية تسديد مسجلة بالنظام</span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
      </div>

      {/* Metric 3: Credit Limit Exceeded Alerts */}
      <div
        onClick={onFilterExceeded}
        className="bg-surface-container-low/95 border border-amber-500/20 hover:border-amber-500/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden group"
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-on-surface-variant">تجاوزوا سقف الائتمان</span>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-mono text-amber-600 tracking-tight">
          {stats.exceededLimitCount} <span className="text-xs font-cairo font-bold">زبون</span>
        </h3>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
          <span className="text-amber-600 font-bold">تنبيه: يتطلب تجميد أو تسديد فوري</span>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
      </div>

      {/* Metric 4: Credit Utilization Rate */}
      <div className="bg-surface-container-low/95 border border-primary/20 hover:border-primary/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm relative overflow-hidden group">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-on-surface-variant">نسبة استهلاك الائتمان</span>
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-2xl font-black font-mono text-primary tracking-tight">
          {stats.debtUtilization}%
        </h3>
        <div className="mt-2 pt-2 border-t border-outline-variant/15">
          <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                stats.debtUtilization >= 80 ? 'bg-red-500' : stats.debtUtilization >= 50 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${stats.debtUtilization}%` }}
            />
          </div>
        </div>
        <div className="absolute top-0 right-0 left-0 h-1 bg-primary" />
      </div>
    </div>
  );
};
