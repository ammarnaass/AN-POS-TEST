import React from 'react';
import { Headphones, CheckCircle2 } from 'lucide-react';

export interface Design6FinancialStackProps {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  onSetDenomination: (amount: number) => void;
  onOpenDiscount?: () => void;
  onSettleSale?: () => void;
  formatMoney: (amount?: number) => string;
  currency?: string;
  userName?: string;
  boxName?: string;
  supportPhone?: string;
  priceTier?: '1' | '2' | '3' | '4';
}

export const Design6FinancialStack: React.FC<Design6FinancialStackProps> = ({
  subtotal,
  discountAmount,
  totalAmount,
  paidAmount,
  changeAmount,
  onSetDenomination,
  onOpenDiscount,
  onSettleSale,
  formatMoney,
  currency = 'دج',
  userName = 'المسؤول',
  boxName = 'صندوق 01',
  supportPhone = '0770.539.177',
  priceTier = '1',
}) => {
  // Extract user initials
  const initials = userName.slice(0, 2);

  return (
    <div className="w-[280px] sm:w-[300px] xl:w-[320px] bg-slate-50 dark:bg-[#070b14] border-r border-slate-200 dark:border-slate-800/80 p-3 flex flex-col justify-between select-none shrink-0 transition-colors">
      {/* 1. Financial Cards Stack */}
      <div className="flex flex-col gap-2">
        {/* Card 1: المبلغ */}
        <div className="bg-white dark:bg-[#0b1222] border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {formatMoney(subtotal)}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{currency}</span>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">المبلغ</span>
        </div>

        {/* Card 2: الخصم */}
        <button
          type="button"
          onClick={onOpenDiscount}
          className="bg-white hover:bg-slate-100 dark:bg-[#0b1222] dark:hover:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs cursor-pointer transition-all"
          title="تحديد نسبة أو قيمة التخفيض (F6)"
        >
          <div className="flex items-baseline gap-1 font-mono">
            <span className={`text-lg font-black ${discountAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatMoney(discountAmount)}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{currency}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 px-1 py-0.5 rounded font-mono">
              %
            </span>
            <span className="text-xs font-bold">الخصم</span>
          </div>
        </button>

        {/* Card 3: الصافي الإجمالي (شامل الرسوم) */}
        <div className="bg-sky-50 dark:bg-[#0c1a32] border-2 border-sky-300 dark:border-[#1e40af] rounded-xl p-3 flex items-center justify-between shadow-xs dark:shadow-md">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-sky-800 dark:text-[#38bdf8] drop-shadow-[0_0_12px_rgba(56,189,248,0.3)]">
              {formatMoney(totalAmount)}
            </span>
            <span className="text-xs font-black text-sky-700 dark:text-[#38bdf8]">{currency}</span>
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">الصافي الإجمالي</div>
            <div className="text-[10px] text-sky-700 dark:text-sky-300/80 leading-tight mt-0.5">شامل الرسوم</div>
          </div>
        </div>

        {/* Card 4: المقبوض (المدفوع) */}
        <div className="bg-amber-50 dark:bg-[#121622] border border-amber-300 dark:border-[#f59e0b]/50 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
          <div className="bg-white dark:bg-[#0c101c] border border-amber-400 dark:border-[#f59e0b]/80 rounded-lg px-2.5 py-0.5 flex items-baseline gap-1 font-mono">
            <span className="text-base font-black text-amber-700 dark:text-[#fbbf24]">
              {formatMoney(paidAmount)}
            </span>
            <span className="text-[11px] font-bold text-amber-600 dark:text-[#fbbf24]/80">{currency}</span>
          </div>
          <span className="text-xs font-bold text-amber-800 dark:text-[#fbbf24]">المقبوض (المدفوع)</span>
        </div>

        {/* Card 5: الفكة (المسترجع) */}
        <div className="bg-emerald-50 dark:bg-[#062419] border border-emerald-300 dark:border-[#10b981]/50 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-xl font-black text-emerald-700 dark:text-[#34d399] drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              {formatMoney(changeAmount)}
            </span>
            <span className="text-xs font-black text-emerald-600 dark:text-[#34d399]">{currency}</span>
          </div>
          <span className="text-xs font-black text-emerald-800 dark:text-[#34d399]">الفكة (المسترجع)</span>
        </div>

        {/* Invoice Mode & Target Template Indicator */}
        <div className={`rounded-xl px-2.5 py-1.5 flex items-center justify-between text-xs font-bold border ${
          priceTier === '3'
            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/60 text-purple-900 dark:text-purple-300'
            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300'
        }`}>
          <span className="text-[11px]">قالب الطباعة (F1):</span>
          <span className="font-mono text-[11px]">
            {priceTier === '3' ? 'س3: فاتورة جملة (A4/A5)' : `س${priceTier || '1'}: وصل حراري (80mm)`}
          </span>
        </div>

        {/* Primary Pay/Settle Action (F1) */}
        {onSettleSale && (
          <button
            type="button"
            onClick={onSettleSale}
            className={`w-full h-11 bg-gradient-to-r ${
              priceTier === '3'
                ? 'from-purple-700 via-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-500 border-purple-400/50 shadow-purple-950/40'
                : 'from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 border-emerald-400/50 shadow-emerald-950/40'
            } active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-between px-3 shadow-md border cursor-pointer transition-all`}
            title={priceTier === '3' ? 'تأكيد ودفع الحساب وطباعة فاتورة جملة (F1)' : 'تأكيد ودفع الحساب وإصدار الفاتورة (F1)'}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${priceTier === '3' ? 'text-purple-200' : 'text-emerald-200'} stroke-[2.5]`} />
              <span className="text-sm font-black tracking-wide">
                {priceTier === '3' ? 'تأكيد وطباعة فاتورة جملة' : 'تأكيد ودفع الحساب'}
              </span>
            </div>
            <span className={`text-[10px] font-mono font-bold bg-black/40 px-2 py-0.5 rounded-md ${
              priceTier === '3' ? 'text-purple-200 border-purple-400/40' : 'text-emerald-200 border-emerald-500/30'
            } border`}>
              F1
            </span>
          </button>
        )}

        {/* Quick Denominations: 500, 1000, 2000 */}
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => onSetDenomination(2000)}
            className="h-10 bg-white hover:bg-slate-100 text-slate-800 dark:bg-[#141b2d] dark:hover:bg-[#1e293b] dark:text-slate-100 active:scale-95 font-mono font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700/80 shadow-xs cursor-pointer transition-all flex items-center justify-center"
          >
            2000 دج
          </button>
          <button
            type="button"
            onClick={() => onSetDenomination(1000)}
            className="h-10 bg-white hover:bg-slate-100 text-slate-800 dark:bg-[#141b2d] dark:hover:bg-[#1e293b] dark:text-slate-100 active:scale-95 font-mono font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700/80 shadow-xs cursor-pointer transition-all flex items-center justify-center"
          >
            1000 دج
          </button>
          <button
            type="button"
            onClick={() => onSetDenomination(500)}
            className="h-10 bg-white hover:bg-slate-100 text-slate-800 dark:bg-[#141b2d] dark:hover:bg-[#1e293b] dark:text-slate-100 active:scale-95 font-mono font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700/80 shadow-xs cursor-pointer transition-all flex items-center justify-center"
          >
            500 دج
          </button>
        </div>
      </div>

      {/* 2. Cashier Shift & Support Card Footer */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-[#0d2818] dark:border-emerald-600/50 dark:text-emerald-400 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md">
            {boxName}
          </span>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">المستخدم:</div>
              <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">{userName}</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-black text-cyan-800 dark:text-cyan-400">
              {initials}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0b1222] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 shadow-2xs">
          <span className="font-mono text-slate-800 dark:text-slate-300 font-bold tracking-wider">{supportPhone}</span>
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <span>الدعم الفني:</span>
            <Headphones className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
