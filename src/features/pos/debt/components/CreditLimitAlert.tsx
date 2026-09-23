import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatMoney } from '../../utils/format';

export interface CreditLimitAlertProps {
  projectedDebt: number;
  creditLimit: number;
  creditExcessAmount: number;
  currentBalance: number;
  currentSaleTotal: number;
  overrideCreditLimit: boolean;
  setOverrideCreditLimit: (val: boolean) => void;
  currencySymbol?: string;
}

export const CreditLimitAlert: React.FC<CreditLimitAlertProps> = ({
  projectedDebt,
  creditLimit,
  creditExcessAmount,
  currentBalance,
  currentSaleTotal,
  overrideCreditLimit,
  setOverrideCreditLimit,
  currencySymbol = 'دج',
}) => {
  return (
    <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 space-y-2.5 text-xs animate-in fade-in">
      <div className="flex items-center justify-between font-bold">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>تنبيه: تجاوز سقف الائتمان المسموح به!</span>
        </div>
        <span className="font-mono font-black text-xs">
          {formatMoney(projectedDebt)} / {formatMoney(creditLimit)} {currencySymbol}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-300">
        الدين الحالي ({formatMoney(currentBalance)} {currencySymbol}) + الفاتورة الحالية ({formatMoney(currentSaleTotal)} {currencySymbol}) سيتجاوز سقف الائتمان بمقدار <strong>{formatMoney(creditExcessAmount)} {currencySymbol}</strong>.
      </p>

      <label className="flex items-center gap-2 pt-1 font-bold text-[11px] text-on-surface cursor-pointer select-none bg-surface/50 p-2 rounded-xl border border-red-500/20">
        <input
          type="checkbox"
          checked={overrideCreditLimit}
          onChange={(e) => setOverrideCreditLimit(e.target.checked)}
          className="w-4 h-4 rounded text-red-600 focus:ring-red-500/20 cursor-pointer"
        />
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>الموافقة الاستثنائية على تجاوز سقف الدين بتصريح المشرف</span>
        </div>
      </label>
    </div>
  );
};
