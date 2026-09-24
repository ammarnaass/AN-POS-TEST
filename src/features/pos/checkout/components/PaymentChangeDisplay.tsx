import React from 'react';
import { calculateChangeDenominations } from '../services/posPaymentCalculationService';
import { Coins, CheckCircle, AlertTriangle } from 'lucide-react';

export interface PaymentChangeDisplayProps {
  changeAmount: number;
  isPaidSufficient: boolean;
  formatMoney: (val: number) => string;
  total?: number;
  paidAmount?: number;
  onMakeExact?: () => void;
}

export const PaymentChangeDisplay: React.FC<PaymentChangeDisplayProps> = ({
  changeAmount,
  isPaidSufficient,
  formatMoney,
  total,
  paidAmount,
  onMakeExact,
}) => {
  const isExact = isPaidSufficient && changeAmount === 0;
  const deficit = !isPaidSufficient && typeof total === 'number' && typeof paidAmount === 'number'
    ? Math.max(0, total - paidAmount)
    : 0;

  const denominations = changeAmount > 0 ? calculateChangeDenominations(changeAmount) : [];

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all ${
        isExact
          ? 'bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200'
          : isPaidSufficient
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200 shadow-2xs'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
      }`}
      data-testid="payment-change-display"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold flex items-center gap-1.5">
          {isExact ? (
            <>
              <CheckCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>حالة السداد:</span>
            </>
          ) : isPaidSufficient ? (
            <>
              <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>المبلغ المتبقي للزبون (الفكة):</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>المبلغ المدفوع غير كافٍ:</span>
            </>
          )}
        </span>

        <span className="text-xl font-black font-mono">
          {isExact
            ? 'مدفوع بالضبط'
            : isPaidSufficient
            ? `${formatMoney(changeAmount)} دج`
            : `${formatMoney(changeAmount || deficit)} دج`}
        </span>
      </div>

      {/* تفكيك الفكة إلى أوراق نقدية لتسهيل العد على الكاشير */}
      {isPaidSufficient && denominations.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="text-emerald-800 dark:text-emerald-300 font-semibold text-[10px]">
            فئات الفكة المقترحة:
          </span>
          {denominations.map((d) => (
            <span
              key={`${d.denomination}-${d.type}`}
              className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[11px] shadow-2xs ${
                d.type === 'banknote'
                  ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border border-emerald-500/30'
                  : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
              }`}
            >
              {d.count}× {formatMoney(d.denomination)} دج
            </span>
          ))}
        </div>
      )}

      {/* تنبيه العجز والمتبقي غير المسدد مع زر سداد سريع */}
      {!isPaidSufficient && deficit > 0 && (
        <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs">
          <span className="text-amber-800 dark:text-amber-300 text-[11px] font-medium">
            المتبقي غير المسدد: <b className="font-mono font-black">{formatMoney(deficit)} دج</b>
          </span>
          {onMakeExact && (
            <button
              type="button"
              onClick={onMakeExact}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shadow-2xs active:scale-95"
            >
              سداد المبلغ كاملاً
            </button>
          )}
        </div>
      )}
    </div>
  );
};

