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
}) => {
  // Extract user initials
  const initials = userName.slice(0, 2);

  return (
    <div className="w-[320px] bg-[#070b14] border-r border-slate-800/80 p-3 flex flex-col justify-between select-none shrink-0">
      {/* 1. Financial Cards Stack */}
      <div className="flex flex-col gap-2">
        {/* Card 1: المبلغ */}
        <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-lg font-black text-white">
              {formatMoney(subtotal)}
            </span>
            <span className="text-xs font-bold text-slate-400">{currency}</span>
          </div>
          <span className="text-xs font-bold text-slate-300">المبلغ</span>
        </div>

        {/* Card 2: الخصم */}
        <button
          type="button"
          onClick={onOpenDiscount}
          className="bg-[#0b1222] hover:bg-[#0f172a] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs cursor-pointer transition-all"
          title="تحديد نسبة أو قيمة التخفيض (F6)"
        >
          <div className="flex items-baseline gap-1 font-mono">
            <span className={`text-lg font-black ${discountAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatMoney(discountAmount)}
            </span>
            <span className="text-xs font-bold text-slate-400">{currency}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="bg-slate-800 text-[10px] text-slate-400 px-1 py-0.5 rounded font-mono">
              %
            </span>
            <span className="text-xs font-bold">الخصم</span>
          </div>
        </button>

        {/* Card 3: الصافي الإجمالي (شامل الرسوم) */}
        <div className="bg-[#0c1a32] border-2 border-[#1e40af] rounded-xl p-3 flex items-center justify-between shadow-md">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-[#38bdf8] drop-shadow-[0_0_12px_rgba(56,189,248,0.3)]">
              {formatMoney(totalAmount)}
            </span>
            <span className="text-xs font-black text-[#38bdf8]">{currency}</span>
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-white leading-tight">الصافي الإجمالي</div>
            <div className="text-[10px] text-sky-300/80 leading-tight mt-0.5">شامل الرسوم</div>
          </div>
        </div>

        {/* Card 4: المقبوض (المدفوع) */}
        <div className="bg-[#121622] border border-[#f59e0b]/50 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
          <div className="bg-[#0c101c] border border-[#f59e0b]/80 rounded-lg px-2.5 py-0.5 flex items-baseline gap-1 font-mono">
            <span className="text-base font-black text-[#fbbf24]">
              {formatMoney(paidAmount)}
            </span>
            <span className="text-[11px] font-bold text-[#fbbf24]/80">{currency}</span>
          </div>
          <span className="text-xs font-bold text-[#fbbf24]">المقبوض (المدفوع)</span>
        </div>

        {/* Card 5: الفكة (المسترجع) */}
        <div className="bg-[#062419] border border-[#10b981]/50 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-xl font-black text-[#34d399] drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              {formatMoney(changeAmount)}
            </span>
            <span className="text-xs font-black text-[#34d399]">{currency}</span>
          </div>
          <span className="text-xs font-black text-[#34d399]">الفكة (المسترجع)</span>
        </div>

        {/* Primary Pay/Settle Action (F1) */}
        {onSettleSale && (
          <button
            type="button"
            onClick={onSettleSale}
            className="w-full h-11 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-between px-3 shadow-md shadow-emerald-950/40 border border-emerald-400/50 cursor-pointer transition-all"
            title="تأكيد ودفع الحساب وإصدار الفاتورة (F1)"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 stroke-[2.5]" />
              <span className="text-sm font-black tracking-wide">تأكيد ودفع الحساب</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-black/40 px-2 py-0.5 rounded-md text-emerald-200 border border-emerald-500/30">
              F1
            </span>
          </button>
        )}

        {/* Quick Denominations: 500, 1000, 2000 */}
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => onSetDenomination(2000)}
            className="h-10 bg-[#141b2d] hover:bg-[#1e293b] active:scale-95 text-slate-100 font-mono font-bold text-xs rounded-lg border border-slate-700/80 shadow-xs cursor-pointer transition-all flex items-center justify-center"
          >
            2000 دج
          </button>
          <button
            type="button"
            onClick={() => onSetDenomination(1000)}
            className="h-10 bg-[#141b2d] hover:bg-[#1e293b] active:scale-95 text-slate-100 font-mono font-bold text-xs rounded-lg border border-slate-700/80 shadow-xs cursor-pointer transition-all flex items-center justify-center"
          >
            1000 دج
          </button>
          <button
            type="button"
            onClick={() => onSetDenomination(500)}
            className="h-10 bg-[#141b2d] hover:bg-[#1e293b] active:scale-95 text-slate-100 font-mono font-bold text-xs rounded-lg border border-slate-700/80 shadow-xs cursor-pointer transition-all flex items-center justify-center"
          >
            500 دج
          </button>
        </div>
      </div>

      {/* 2. Cashier Shift & Support Card Footer */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="bg-[#0d2818] border border-emerald-600/50 text-emerald-400 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md">
            {boxName}
          </span>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 leading-tight">المستخدم:</div>
              <div className="text-xs font-black text-white leading-tight">{userName}</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#1e293b] border border-slate-700 flex items-center justify-center text-xs font-black text-cyan-400">
              {initials}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#0b1222] border border-slate-800 rounded-lg px-2.5 py-1">
          <span className="font-mono text-slate-300 font-bold tracking-wider">{supportPhone}</span>
          <div className="flex items-center gap-1 text-amber-400">
            <span>الدعم الفني:</span>
            <Headphones className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
