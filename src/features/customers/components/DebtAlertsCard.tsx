import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import type { Customer, Sale } from '@/types';
import { formatCustomerMoney } from '../services/customerStatus';
import { calculateCustomerDebtAging } from '../services/customerStatementService';

interface DebtAlertsCardProps {
  customers: Customer[];
  sales: Sale[];
  currencySymbol?: string;
}

export const DebtAlertsCard: React.FC<DebtAlertsCardProps> = ({
  customers,
  sales,
  currencySymbol = 'دج',
}) => {
  const alerts = useMemo(() => {
    // 1. العملاء الذين تجاوزوا سقف الائتمان
    const exceededCustomers = customers.filter((c) => {
      const balance = Number(c.balance || 0);
      const limit = Number(c.creditLimit || 0);
      return balance > 0 && limit > 0 && balance > limit;
    });

    // 2. إجمالي تحليل تعمير الديون عبر جميع العملاء
    let totalOverdue60 = 0;
    let totalOverdue90 = 0;
    let overdue60Count = 0;
    let overdue90Count = 0;
    let oldestInvoiceDays = 0;
    let oldestCustomerName = '';

    for (const customer of customers) {
      if (Number(customer.balance || 0) <= 0) continue;

      const customerSales = sales.filter((s) => s.customerId === customer.id);
      const aging = calculateCustomerDebtAging(customerSales);

      // شرائح 61-90 و +90
      const bucket61_90 = aging.buckets.find((b) => b.rangeDays === '61-90');
      const bucket90Plus = aging.buckets.find((b) => b.rangeDays === '+90');

      if (bucket61_90) {
        totalOverdue60 += bucket61_90.amount;
        overdue60Count += bucket61_90.invoicesCount;
      }
      if (bucket90Plus) {
        totalOverdue90 += bucket90Plus.amount;
        overdue90Count += bucket90Plus.invoicesCount;
      }

      if (aging.oldestInvoiceDays > oldestInvoiceDays) {
        oldestInvoiceDays = aging.oldestInvoiceDays;
        oldestCustomerName = customer.name;
      }
    }

    // 3. عملاء لديهم ديون ولم يدفعوا أي شيء
    const totalDebtCustomers = customers.filter((c) => Number(c.balance || 0) > 0).length;

    return {
      exceededCustomers,
      totalOverdue60,
      totalOverdue90,
      overdue60Count,
      overdue90Count,
      oldestInvoiceDays,
      oldestCustomerName,
      totalDebtCustomers,
    };
  }, [customers, sales]);

  const hasAlerts =
    alerts.exceededCustomers.length > 0 ||
    alerts.overdue60Count > 0 ||
    alerts.overdue90Count > 0;

  if (!hasAlerts) return null;

  return (
    <div className="bg-gradient-to-br from-red-50/80 via-amber-50/50 to-orange-50/50 dark:from-red-950/30 dark:via-amber-950/20 dark:to-orange-950/20 border border-red-200/50 dark:border-red-800/30 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h4 className="text-sm font-black text-red-800 dark:text-red-300 font-cairo">
            ⚠ تنبيهات الديون الحرجة
          </h4>
          <p className="text-[10px] text-red-600/70 dark:text-red-400/60">
            يوجد {alerts.totalDebtCustomers} عميل مدين — {alerts.overdue60Count + alerts.overdue90Count} فاتورة متأخرة
          </p>
        </div>
      </div>

      {/* Alert Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* تجاوز سقف الائتمان */}
        {alerts.exceededCustomers.length > 0 && (
          <div className="bg-white/60 dark:bg-surface-container/60 rounded-xl p-3 border border-red-200/40 dark:border-red-800/20">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] font-bold text-red-700 dark:text-red-300">تجاوز سقف الائتمان</span>
            </div>
            <p className="text-lg font-black font-mono text-red-600 dark:text-red-400">
              {alerts.exceededCustomers.length}
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5">
              {alerts.exceededCustomers.slice(0, 2).map((c) => c.name).join('، ')}
              {alerts.exceededCustomers.length > 2 ? ` +${alerts.exceededCustomers.length - 2}` : ''}
            </p>
          </div>
        )}

        {/* ديون متأخرة +60 يوماً */}
        {alerts.overdue60Count > 0 && (
          <div className="bg-white/60 dark:bg-surface-container/60 rounded-xl p-3 border border-amber-200/40 dark:border-amber-800/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">متأخرة +60 يوماً</span>
            </div>
            <p className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
              {formatCustomerMoney(alerts.totalOverdue60)} <span className="text-[10px]">{currencySymbol}</span>
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5">
              {alerts.overdue60Count} فاتورة
            </p>
          </div>
        )}

        {/* ديون حرجة +90 يوماً */}
        {alerts.overdue90Count > 0 && (
          <div className="bg-white/60 dark:bg-surface-container/60 rounded-xl p-3 border border-red-200/40 dark:border-red-800/20">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
              <span className="text-[10px] font-bold text-red-700 dark:text-red-300">حرجة +90 يوماً</span>
            </div>
            <p className="text-lg font-black font-mono text-red-600 dark:text-red-400">
              {formatCustomerMoney(alerts.totalOverdue90)} <span className="text-[10px]">{currencySymbol}</span>
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5">
              {alerts.overdue90Count} فاتورة
            </p>
          </div>
        )}

        {/* أقدم فاتورة */}
        {alerts.oldestInvoiceDays > 30 && (
          <div className="bg-white/60 dark:bg-surface-container/60 rounded-xl p-3 border border-orange-200/40 dark:border-orange-800/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300">أقدم فاتورة</span>
            </div>
            <p className="text-lg font-black font-mono text-orange-600 dark:text-orange-400">
              {alerts.oldestInvoiceDays} <span className="text-[10px]">يوم</span>
            </p>
            <p className="text-[9px] text-on-surface-variant mt-0.5 truncate" title={alerts.oldestCustomerName}>
              {alerts.oldestCustomerName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
