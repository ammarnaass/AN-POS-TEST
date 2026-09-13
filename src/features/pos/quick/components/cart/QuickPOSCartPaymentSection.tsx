import React from 'react';
import { Clock, Banknote, CreditCard, ArrowLeftRight, Zap } from 'lucide-react';
import { formatMoney } from '../../../utils/format';
import { calculateChangeDue, calculateNextDenomination } from '../../services/quickPOSCalculationService';
import type { QuickPOSPaymentMethod, QuickPOSSaleSummary } from '../../types';

interface QuickPOSCartPaymentSectionProps {
  paymentMethod: QuickPOSPaymentMethod;
  onSelectPaymentMethod: (m: QuickPOSPaymentMethod) => void;
  allowCardPayment: boolean;
  allowTransferPayment: boolean;
  cashTendered: number;
  onChangeCashTendered: (val: number) => void;
  saleSummary: QuickPOSSaleSummary;
  onQuickPay: () => void;
  isSalePending: boolean;
  cartLength: number;
  baseCurrency?: string;
}

export const QuickPOSCartPaymentSection: React.FC<QuickPOSCartPaymentSectionProps> = ({
  paymentMethod,
  onSelectPaymentMethod,
  allowCardPayment,
  allowTransferPayment,
  cashTendered,
  onChangeCashTendered,
  saleSummary,
  onQuickPay,
  isSalePending,
  cartLength,
  baseCurrency = 'دج',
}) => {
  const changeDue = calculateChangeDue(cashTendered, saleSummary.total);

  const availableMethods: {
    id: QuickPOSPaymentMethod;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'credit', label: 'آجل (ذمة)', icon: Clock },
    { id: 'cash', label: 'نقداً (كاش)', icon: Banknote },
  ];
  if (allowCardPayment) {
    availableMethods.push({ id: 'card', label: 'بطاقة', icon: CreditCard });
  }
  if (allowTransferPayment) {
    availableMethods.push({ id: 'transfer', label: 'تحويل', icon: ArrowLeftRight });
  }

  const gridColsClass =
    availableMethods.length === 2
      ? 'grid-cols-2'
      : availableMethods.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-4';

  const handleDenominationClick = (step: number) => {
    const nextVal = calculateNextDenomination(cashTendered, step, saleSummary.total);
    if (nextVal > 0) onChangeCashTendered(nextVal);
  };

  return (
    <div
      className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0"
      data-purpose="payment-calculation-area"
    >
      {/* Payment Mode Tabs: Cash vs Credit (آجل / نقداً) */}
      <div className={`grid ${gridColsClass} gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-700/50 rounded-xl`}>
        {availableMethods.map((m) => {
          const Icon = m.icon;
          const active = paymentMethod === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectPaymentMethod(m.id)}
              className={`py-1.5 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Cash Denomination Buttons */}
      <div className="grid grid-cols-5 gap-1 text-xs">
        {[200, 500, 1000, 2000].map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => handleDenominationClick(step)}
            className="py-1.5 font-bold bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 hover:text-brand-700 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer font-mono"
          >
            +{step >= 1000 ? `${step / 1000},000` : step}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChangeCashTendered(saleSummary.total)}
          className="py-1.5 font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/80 rounded-lg transition active:scale-95 cursor-pointer"
        >
          بالضبط
        </button>
      </div>

      {/* Received & Change Boxes */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Received Input */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus-within:border-brand-500 rounded-xl p-2 flex flex-col justify-center transition shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            المبلغ المقبوض:
          </span>
          <div className="flex items-center justify-between mt-0.5">
            <input
              type="number"
              value={cashTendered || ''}
              onChange={(e) => onChangeCashTendered(Number(e.target.value) || 0)}
              placeholder={saleSummary.total.toString()}
              className="w-full text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono bg-transparent outline-none border-none p-0"
            />
            <span className="text-[11px] text-slate-400 font-bold shrink-0 mr-1">
              {baseCurrency}
            </span>
          </div>
        </div>

        {/* Change Due (الفكة / الباقي) */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl p-2 flex flex-col justify-center shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            الفكة (الباقي للمشتري):
          </span>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {formatMoney(changeDue)}
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
              {baseCurrency}
            </span>
          </div>
        </div>
      </div>

      {/* MASSIVE CTA BUTTON: Submit & Save (F1) */}
      <button
        onClick={onQuickPay}
        disabled={cartLength === 0 || isSalePending}
        className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 via-orange-600 to-amber-600 hover:from-brand-700 hover:to-orange-700 text-white font-black text-base rounded-xl shadow-lg shadow-brand-500/30 active:scale-[0.99] transition flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        type="button"
      >
        <span className="flex items-center gap-2">
          <Zap className="w-5 h-5 animate-pulse" />
          <span>{isSalePending ? 'جاري الحفظ...' : 'دفع فوري وحفظ (F1)'}</span>
        </span>
        <span className="bg-white/20 px-3 py-1 rounded-lg font-mono text-base sm:text-lg tracking-wide">
          {formatMoney(saleSummary.total)} {baseCurrency}
        </span>
      </button>
    </div>
  );
};
