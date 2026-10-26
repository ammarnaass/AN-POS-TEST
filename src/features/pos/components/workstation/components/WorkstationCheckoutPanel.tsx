import React from 'react';
import {
  Receipt,
  PlusCircle,
  Star,
  RotateCcw,
  HandCoins,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export type PaymentMethodType = 'cash' | 'card' | 'debt' | 'cheque';

interface WorkstationCheckoutPanelProps {
  priceTier: '1' | '2' | '3' | '4';
  onSelectPriceTier: (tier: '1' | '2' | '3' | '4') => void;
  subtotal: number;
  total: number;
  discountAmount?: number;
  tvaAmount?: number;
  taxRate?: number;
  discount: number;
  discountType: 'percent' | 'amount';
  onOpenDiscount: () => void;
  paidAmount: number;
  setPaidAmount: (val: number) => void;
  paidInputRef: React.RefObject<HTMLInputElement | null>;
  selectedPaymentMethod?: PaymentMethodType;
  setSelectedPaymentMethod?: (method: PaymentMethodType) => void;
  onOpenQuickAdd?: () => void;
  onOpenFavorites?: () => void;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  className?: string;
}

export const WorkstationCheckoutPanel: React.FC<WorkstationCheckoutPanelProps> = ({
  priceTier,
  onSelectPriceTier,
  subtotal,
  total,
  discountAmount,
  tvaAmount,
  taxRate = 0,
  discount,
  discountType = 'percent',
  onOpenDiscount,
  paidAmount,
  setPaidAmount,
  paidInputRef,
  selectedPaymentMethod: _selectedPaymentMethod,
  setSelectedPaymentMethod: _setSelectedPaymentMethod,
  onOpenQuickAdd,
  onOpenFavorites,
  formatMoney,
  currency = 'د.ج',
  className = '',
}) => {
  // Effective discount amount in currency
  const effectiveDiscountAmount = typeof discountAmount === 'number'
    ? discountAmount
    : discountType === 'percent'
    ? (subtotal * Math.min(100, Math.max(0, discount))) / 100
    : Math.min(subtotal, Math.max(0, discount));

  // Taxable subtotal after discount
  const afterDiscount = Math.max(0, subtotal - effectiveDiscountAmount);

  // Effective VAT/TVA amount from sale summary or rate
  const effectiveTax = typeof tvaAmount === 'number'
    ? tvaAmount
    : (taxRate > 0 ? (afterDiscount * taxRate) / 100 : 0);

  // Effective tax rate percentage
  const effectiveTaxPercent = afterDiscount > 0 && effectiveTax > 0
    ? Math.round((effectiveTax / afterDiscount) * 100)
    : (taxRate > 0 && effectiveTax > 0 ? taxRate : 0);

  // Payment settlement states (Deficit / Exact / Surplus)
  const isPaidSufficient = paidAmount >= total;
  const isExact = total > 0 && Math.abs(paidAmount - total) < 0.001;
  const changeDue = isPaidSufficient ? Math.max(0, paidAmount - total) : 0;
  const deficit = !isPaidSufficient ? Math.max(0, total - paidAmount) : 0;

  // Quick denomination click
  const handleAddDenomination = (val: number) => {
    setPaidAmount((prev) => (prev > 0 ? prev + val : val));
    paidInputRef.current?.focus();
  };

  return (
    <aside
      className={`w-full lg:w-[320px] xl:w-[350px] 2xl:w-[380px] flex-shrink-0 flex flex-col gap-2.5 select-none overflow-y-auto max-h-full pr-0.5 custom-scrollbar ${className}`}
    >
      {/* Financial Calculation Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-blue-600" />
            الحساب المالي والضريبي
          </span>

          {/* Sale nature dropdown */}
          <select
            value={priceTier}
            onChange={(e) => onSelectPriceTier(e.target.value as any)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1 px-2 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 cursor-pointer"
            id="sale-nature"
          >
            <option value="1" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              تجزئة (Détail)
            </option>
            <option value="2" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              نصف جملة
            </option>
            <option value="3" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              جملة (Gros)
            </option>
            <option value="4" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              سعر خاص (Special)
            </option>
          </select>
        </div>

        {/* Subtotal & Tax details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              المجموع قبل الضريبة:
            </span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-sm">
              {formatMoney(subtotal)} <span className="text-[10px] font-sans">{currency}</span>
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              الرسم والضريبة {effectiveTaxPercent > 0 ? `(${effectiveTaxPercent}%)` : '(0%)'}:
            </span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-sm">
              {formatMoney(effectiveTax)} <span className="text-[10px] font-sans">{currency}</span>
            </span>
          </div>
        </div>

        {/* Discount Line */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              id="discount-toggle"
              checked={discount > 0}
              onChange={onOpenDiscount}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              تخفيض تجاري
            </span>
          </label>
          <div className="flex items-center gap-1.5">
            {effectiveDiscountAmount > 0 && (
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                -{formatMoney(effectiveDiscountAmount)}
              </span>
            )}
            <button
              type="button"
              onClick={onOpenDiscount}
              className="w-16 text-left font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded py-0.5 px-1.5 text-slate-800 dark:text-slate-200 cursor-pointer hover:border-blue-500"
              title="تعديل قيمة أو نسبة التخفيض"
            >
              {discount > 0 ? (discountType === 'percent' ? `${discount}%` : `${formatMoney(discount)}`) : '0.00'}
            </button>
          </div>
        </div>

        {/* Net Payable Amount (High Visual Highlight) */}
        <div className="p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-950 dark:text-blue-200 block">
              المبلغ الصافي المطلوب:
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
              شامل الرسوم والضرائب (TTC)
            </span>
          </div>
          <div className="text-left font-mono font-black text-blue-700 dark:text-blue-400 text-2xl tracking-tight">
            {formatMoney(total)} <span className="text-xs font-sans font-bold text-blue-600">{currency}</span>
          </div>
        </div>

        {/* Paid Input with Highlight */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <HandCoins className="w-4 h-4 text-emerald-600" />
              المبلغ المدفوع من الزبون:
            </span>
            <span className="text-[10px] text-slate-400 font-mono">F12 الدفع السريع</span>
          </label>
          <div className="relative">
            <input
              ref={paidInputRef}
              type="number"
              min="0"
              step="any"
              value={paidAmount || ''}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full text-left font-mono font-black text-xl text-sky-950 dark:text-sky-100 bg-sky-50 dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-800 rounded-lg py-1.5 px-3 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition outline-hidden"
            />
            <span className="absolute right-3 top-2.5 text-xs font-bold text-sky-700 dark:text-sky-400 pointer-events-none">
              {currency}
            </span>
          </div>
        </div>

        {/* Quick DZD Denomination Buttons (+500, +1000, +2000, +5000) */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            فئات نقدية سريعة:
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleAddDenomination(500)}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700 border border-slate-200 dark:border-slate-700 rounded-lg py-2 min-h-[40px] text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              +500
            </button>
            <button
              type="button"
              onClick={() => handleAddDenomination(1000)}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700 border border-slate-200 dark:border-slate-700 rounded-lg py-2 min-h-[40px] text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              +1000
            </button>
            <button
              type="button"
              onClick={() => handleAddDenomination(2000)}
              className="bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200 rounded-lg py-2 min-h-[40px] text-xs sm:text-sm font-mono font-bold hover:bg-blue-200 dark:hover:bg-blue-900/80 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              +2000
            </button>
            <button
              type="button"
              onClick={() => handleAddDenomination(5000)}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700 border border-slate-200 dark:border-slate-700 rounded-lg py-2 min-h-[40px] text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 transition active:scale-95 cursor-pointer shadow-2xs"
            >
              +5000
            </button>
          </div>
        </div>

        {/* Balance / Change Returned / Deficit Settlement Field */}
        <div className="space-y-1.5 pt-1" data-testid="workstation-settlement-status">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              {!isPaidSufficient ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>المبلغ المدفوع غير كافٍ:</span>
                </>
              ) : isExact ? (
                <>
                  <CheckCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>حالة السداد:</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>المبلغ المتبقي للإرجاع:</span>
                </>
              )}
            </span>
            <span>
              {!isPaidSufficient ? (
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  عجز نقدي
                </span>
              ) : isExact ? (
                <span className="text-[10px] text-sky-700 dark:text-sky-300 font-bold bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                  مدفوع بالضبط
                </span>
              ) : (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  فائض نقدي
                </span>
              )}
            </span>
          </label>

          {/* Amount Display Container */}
          <div
            className={`w-full text-left font-mono font-black text-xl rounded-lg py-1.5 px-3 flex justify-between items-center transition-colors ${
              !isPaidSufficient
                ? 'text-amber-900 dark:text-amber-200 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800'
                : isExact
                ? 'text-sky-900 dark:text-sky-200 bg-sky-50/90 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800'
                : 'text-emerald-900 dark:text-emerald-200 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800'
            }`}
          >
            <span
              className={`text-xs font-bold font-sans ${
                !isPaidSufficient
                  ? 'text-amber-800 dark:text-amber-300'
                  : isExact
                  ? 'text-sky-800 dark:text-sky-300'
                  : 'text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {!isPaidSufficient ? 'المتبقي غير المسدد' : 'الباقي للزبون'}
            </span>
            <span dir="ltr" className="font-mono">
              {formatMoney(!isPaidSufficient ? deficit : changeDue)}{' '}
              <span className="text-xs font-bold font-sans">{currency}</span>
            </span>
          </div>

          {/* Unpaid Deficit Quick Action Strip */}
          {!isPaidSufficient && deficit > 0 && (
            <div className="pt-1 flex items-center justify-between text-xs bg-amber-500/10 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-500/20">
              <span className="text-amber-900 dark:text-amber-300 text-[11px] font-medium">
                المتبقي غير المسدد:{' '}
                <b className="font-mono font-black">{formatMoney(deficit)} {currency}</b>
              </span>
              <button
                type="button"
                onClick={() => {
                  setPaidAmount(total);
                  paidInputRef.current?.focus();
                }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 active:scale-95 text-white transition-all cursor-pointer shadow-2xs"
              >
                سداد المبلغ كاملاً
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Fast Action Tool Strip (F7, Favorites) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-2.5 flex items-center justify-between gap-2 mt-auto">
        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-3 rounded-lg text-xs shadow-2xs transition active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>إضافة سريعة</span>
          <span className="bg-amber-700/40 text-[9px] px-1 rounded font-mono">F7</span>
        </button>

        <button
          type="button"
          onClick={onOpenFavorites}
          className="flex items-center justify-center gap-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-bold py-1.5 px-2.5 rounded-lg text-xs border border-amber-200 dark:border-amber-800 transition cursor-pointer"
          title="المفضلة السريعة"
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
        </button>
      </div>
    </aside>
  );
};
