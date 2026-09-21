import React, { useState, useEffect } from 'react';
import { Banknote, Calculator, User, CheckCircle2, Printer } from 'lucide-react';

export interface Design7FinancialSidebarProps {
  subtotal: number;
  discountAmount: number;
  total: number;
  tvaAmount?: number;
  itemCount?: number;
  totalQuantity?: number;
  paidAmount?: number;
  onUpdatePaid?: (amount: number) => void;
  onOpenPaidCalculator?: () => void;
  formatMoney: (amount?: number | null) => string;
  onOpenDiscount: () => void;
  onSettleSale: (paidAmount?: number) => void;
  userName?: string;
  priceTier?: '1' | '2' | '3' | '4';
}

export const Design7FinancialSidebar: React.FC<Design7FinancialSidebarProps> = ({
  subtotal,
  discountAmount,
  total,
  tvaAmount = 0,
  itemCount = 0,
  totalQuantity = 0,
  paidAmount: controlledPaid,
  onUpdatePaid,
  onOpenPaidCalculator,
  formatMoney,
  onOpenDiscount,
  onSettleSale,
  userName = 'admin',
  priceTier = '1',
}) => {
  const [internalPaidAmount, setInternalPaidAmount] = useState<number>(0);
  const paidAmount = controlledPaid !== undefined ? controlledPaid : internalPaidAmount;

  const setPaidAmount = (val: number) => {
    if (onUpdatePaid) onUpdatePaid(val);
    else setInternalPaidAmount(val);
  };

  // تصفير المدفوع تلقائياً عند تفريغ السلة لضمان عدم بقاء أرقام قديمة عالقة
  useEffect(() => {
    if (itemCount === 0 || total === 0) {
      if (paidAmount !== 0) {
        setPaidAmount(0);
      }
    }
  }, [itemCount, total]);

  const diff = paidAmount - total;
  const isOverpaid = diff > 0;
  const isExact = paidAmount === total && total > 0;
  const remainingToPay = Math.max(0, total - paidAmount);

  const handleQuickPay = (amount: number) => {
    setPaidAmount(amount);
  };

  return (
    <div
      className="w-56 sm:w-60 md:w-64 min-w-[210px] bg-[#dbe5ee] border-l border-[#b4c3d2] p-1.5 sm:p-2 flex flex-col justify-between shrink-0 select-none text-xs min-h-0"
      data-purpose="financial-summary"
    >
      <div className="space-y-1.5 overflow-y-auto min-h-0">
        {/* ملخص عدد الأصناف والقطع في السلة */}
        <div className="bg-white border border-[#b4c3d2] rounded px-2.5 py-1 flex items-center justify-between text-[11px] font-black text-black shadow-2xs">
          <span>عدد الأصناف:</span>
          <span className="font-mono font-black text-black">
            {itemCount} صنف ({totalQuantity} قطعة)
          </span>
        </div>

        {/* المبلغ (Subtotal) */}
        <div className="flex items-center justify-between bg-[#edf3f8] border border-[#a2b5c8] rounded p-1 shadow-2xs">
          <span className="d7-pill-gloss-cyan px-2.5 py-0.5 rounded text-black font-black text-[11px]">
            المبلغ
          </span>
          <span className="text-sm font-black text-black pr-1 font-mono">
            {formatMoney(subtotal)}
          </span>
        </div>

        {/* الخصم (Discount) */}
        <div
          onClick={onOpenDiscount}
          title="انقر لتعديل الخصم (F6)"
          className="flex items-center justify-between bg-[#edf3f8] hover:bg-[#e4eff8] border border-[#a2b5c8] rounded p-1 shadow-2xs cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-1">
            <span className="d7-pill-gloss-cyan px-2.5 py-0.5 rounded text-black font-black text-[11px]">
              الخصم
            </span>
            <span className="text-[10px] text-slate-700 font-mono font-bold group-hover:text-blue-900">
              (F6)
            </span>
          </div>
          <span className="text-sm font-black text-rose-700 pr-1 font-mono">
            {formatMoney(discountAmount)}
          </span>
        </div>

        {/* ضريبة القيمة المضافة إن وجدت */}
        {tvaAmount > 0 && (
          <div className="flex items-center justify-between bg-[#edf3f8] border border-[#a2b5c8] rounded p-1 shadow-2xs">
            <span className="d7-pill-gloss-cyan px-2.5 py-0.5 rounded text-black font-black text-[11px]">
              الرسم / TVA
            </span>
            <span className="text-sm font-black text-black pr-1 font-mono">
              {formatMoney(tvaAmount)}
            </span>
          </div>
        )}

        {/* الإجمالي (Total) */}
        <div
          onClick={() => onSettleSale(paidAmount)}
          title="انقر لإتمام عملية الدفع (F1 / Enter)"
          className="flex items-center justify-between bg-gradient-to-r from-[#e1f0fb] to-[#cde3f7] hover:from-[#d5eaf8] hover:to-[#bedbf3] border-2 border-sky-600 rounded p-1.5 shadow-sm cursor-pointer transition-all"
        >
          <div className="flex items-center gap-1">
            <span className="bg-sky-700 text-white px-2 py-0.5 rounded font-black text-[11px] shadow-2xs">
              الإجمالي
            </span>
            <span className="text-[10px] text-sky-950 font-black font-mono">
              (F1)
            </span>
          </div>
          <span className="text-base font-black text-black pr-1 font-mono">
            {formatMoney(total)}
          </span>
        </div>

        {/* مؤشر الطباعة الذكية المتكيفة مع نوع السعر (س1-س4 عادي vs س3 جملة) */}
        <div
          data-testid="design7-smart-print-indicator"
          className={`border rounded p-1 shadow-2xs flex items-center justify-between text-[10px] font-bold transition-all ${
            priceTier === '3'
              ? 'bg-purple-50 border-purple-300 text-purple-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
          title={
            priceTier === '3'
              ? 'سعر الجملة س3: توجيه الطباعة آلياً إلى فاتورة جملة مجهزة ببيانات العميل (A4/A5)'
              : 'سعر تجزئة/عادي: طباعة وصل بيع حراري عادي (80mm/58mm)'
          }
        >
          <div className="flex items-center gap-1">
            <Printer className="w-3.5 h-3.5 shrink-0 text-slate-700" />
            <span>قالب الطباعة (F1):</span>
          </div>
          <span
            className={`px-1.5 py-0.5 rounded font-bold text-[10px] shadow-2xs ${
              priceTier === '3'
                ? 'bg-purple-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {priceTier === '3' ? 'فاتورة جملة (A4/A5)' : 'وصل حراري (80mm)'}
          </span>
        </div>

        {/* المدفوع (Paid) */}
        <div className="bg-[#edf3f8] border border-[#a2b5c8] rounded p-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span
                onClick={onOpenPaidCalculator}
                className="d7-pill-gloss-cyan px-2.5 py-0.5 rounded text-slate-800 font-bold text-[11px] cursor-pointer"
                title="فتح الآلة الحاسبة اللمسية لإدخال النقدية"
              >
                المدفوع
              </span>
              {onOpenPaidCalculator && (
                <button
                  type="button"
                  onClick={onOpenPaidCalculator}
                  className="w-5 h-5 rounded d7-glossy-top-btn text-sky-700 hover:text-sky-900 flex items-center justify-center cursor-pointer shadow-2xs"
                  title="فتح الآلة الحاسبة اللمسية لإدخال النقدية"
                >
                  <Calculator className="w-3 h-3" />
                </button>
              )}
            </div>
            <input
              type="number"
              min={0}
              step="any"
              value={paidAmount === 0 ? '' : paidAmount}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-28 text-left font-black text-sm bg-white px-1.5 py-0.5 border border-slate-300 rounded focus:border-sky-600 focus:outline-hidden text-slate-900 font-mono shadow-inner"
            />
          </div>

          {/* فئات الدفع السريع اللمسية */}
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            <button
              type="button"
              onClick={() => handleQuickPay(total)}
              className="py-1 px-1 rounded font-bold text-[10px] d7-glossy-action-tile text-sky-900 hover:bg-sky-100 active:scale-95 cursor-pointer text-center truncate"
              title="سداد المبلغ التام بالكامل"
            >
              المبلغ التام
            </button>
            <button
              type="button"
              onClick={() => handleQuickPay(1000)}
              className="py-1 px-1 rounded font-bold text-[10px] d7-glossy-action-tile text-slate-800 hover:bg-slate-200 active:scale-95 cursor-pointer text-center font-mono"
            >
              1,000
            </button>
            <button
              type="button"
              onClick={() => handleQuickPay(2000)}
              className="py-1 px-1 rounded font-bold text-[10px] d7-glossy-action-tile text-slate-800 hover:bg-slate-200 active:scale-95 cursor-pointer text-center font-mono"
            >
              2,000
            </button>
            <button
              type="button"
              onClick={() => handleQuickPay(5000)}
              className="py-1 px-1 rounded font-bold text-[10px] d7-glossy-action-tile text-slate-800 hover:bg-slate-200 active:scale-95 cursor-pointer text-center font-mono"
            >
              5,000
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 mt-1">
            <button
              type="button"
              onClick={() => setPaidAmount((prev) => prev + 200)}
              className="py-0.5 px-1 rounded font-bold text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 cursor-pointer text-center font-mono border border-slate-200"
            >
              +200
            </button>
            <button
              type="button"
              onClick={() => setPaidAmount((prev) => prev + 500)}
              className="py-0.5 px-1 rounded font-bold text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 cursor-pointer text-center font-mono border border-slate-200"
            >
              +500
            </button>
            <button
              type="button"
              onClick={() => setPaidAmount(0)}
              className="py-0.5 px-1 rounded font-bold text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 cursor-pointer text-center border border-rose-200"
              title="تصفير المدفوع"
            >
              تصفير C
            </button>
          </div>
        </div>

        {/* المتبقي / الباقي للزبون (Remaining / Change) */}
        <div
          className={`flex items-center justify-between border rounded p-1.5 shadow-2xs transition-colors ${
            isOverpaid
              ? 'bg-emerald-100/90 border-emerald-500'
              : isExact
              ? 'bg-sky-50 border-sky-300'
              : 'bg-amber-50 border-amber-300'
          }`}
        >
          <span
            className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
              isOverpaid
                ? 'bg-emerald-600 text-white shadow-xs'
                : isExact
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-amber-600 text-white shadow-xs'
            }`}
          >
            {isOverpaid ? 'الباقي للزبون' : isExact ? 'خالص تماماً' : 'المتبقي للدفع'}
          </span>

          <span
            className={`text-sm font-black pr-1 font-mono ${
              isOverpaid
                ? 'text-emerald-800 text-base'
                : isExact
                ? 'text-sky-800'
                : 'text-amber-800'
            }`}
          >
            {isOverpaid
              ? `+${formatMoney(diff)}`
              : isExact
              ? '0.00 DA'
              : formatMoney(remainingToPay)}
          </span>
        </div>
      </div>

      {/* بيانات الكاشير والمستخدم */}
      <div
        className="pt-2 border-t border-[#b7c6d6] text-[11px]"
        data-purpose="operator-details"
      >
        <div className="flex items-center justify-between text-blue-900 font-bold">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-amber-600" />
            <span>المستخدم</span>
          </div>
          <span className="font-mono font-black text-blue-800 text-xs px-1.5 py-0.5 bg-white/60 rounded border border-blue-200">
            {userName}
          </span>
        </div>
      </div>
    </div>
  );
};
