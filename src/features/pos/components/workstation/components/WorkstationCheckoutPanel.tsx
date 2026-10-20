import React from 'react';
import {
  Receipt,
  Banknote,
  CreditCard,
  FileText,
  CheckSquare,
  PlusCircle,
  Package,
  Star,
  RotateCcw,
  HandCoins,
} from 'lucide-react';

export type PaymentMethodType = 'cash' | 'card' | 'debt' | 'cheque';

interface WorkstationCheckoutPanelProps {
  priceTier: '1' | '2' | '3' | '4';
  onSelectPriceTier: (tier: '1' | '2' | '3' | '4') => void;
  subtotal: number;
  total: number;
  taxRate?: number;
  discount: number;
  discountType: 'percent' | 'amount';
  onOpenDiscount: () => void;
  paidAmount: number;
  setPaidAmount: (val: number) => void;
  paidInputRef: React.RefObject<HTMLInputElement | null>;
  selectedPaymentMethod: PaymentMethodType;
  setSelectedPaymentMethod: (method: PaymentMethodType) => void;
  onOpenQuickAdd?: () => void;
  onOpenPackages?: () => void;
  onOpenFavorites?: () => void;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
}

export const WorkstationCheckoutPanel: React.FC<WorkstationCheckoutPanelProps> = ({
  priceTier,
  onSelectPriceTier,
  subtotal,
  total,
  taxRate = 19,
  discount,
  discountType: _discountType,
  onOpenDiscount,
  paidAmount,
  setPaidAmount,
  paidInputRef,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  onOpenQuickAdd,
  onOpenPackages,
  onOpenFavorites,
  formatMoney,
  currency = 'د.ج',
}) => {
  // Calculate VAT
  const calculatedTax = (subtotal * taxRate) / 100;

  // Calculate return change
  const changeDue = Math.max(0, paidAmount - total);

  // Quick denomination click
  const handleAddDenomination = (val: number) => {
    setPaidAmount((prev) => (prev > 0 ? prev + val : val));
    paidInputRef.current?.focus();
  };

  return (
    <aside className="w-full lg:w-[350px] flex-shrink-0 flex flex-col gap-2.5 select-none">
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
            <option value="1">تجزئة (Détail)</option>
            <option value="2">نصف جملة</option>
            <option value="3">جملة (Gros)</option>
            <option value="4">سعر خاص (Special)</option>
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
              الرسم والضريبة ({taxRate}%):
            </span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-sm">
              {formatMoney(calculatedTax)} <span className="text-[10px] font-sans">{currency}</span>
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
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              تخفيض تجاري
            </span>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenDiscount}
              className="w-16 text-left font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded py-0.5 px-1.5 text-slate-800 dark:text-slate-200 cursor-pointer hover:border-blue-500"
              title="تعديل نسبة التخفيض"
            >
              {discount > 0 ? discount.toFixed(2) : '0.00'}
            </button>
            <span className="text-slate-400 text-xs font-bold">%</span>
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
              className="w-full text-left font-mono font-black text-xl text-sky-950 dark:text-sky-100 bg-sky-50 dark:bg-slate-850 border-2 border-sky-300 dark:border-sky-800 rounded-lg py-1.5 px-3 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition outline-hidden"
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
              className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-300 border border-slate-200 dark:border-slate-700 rounded-lg py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-blue-700 transition active:scale-95 cursor-pointer"
            >
              +500
            </button>
            <button
              type="button"
              onClick={() => handleAddDenomination(1000)}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-300 border border-slate-200 dark:border-slate-700 rounded-lg py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-blue-700 transition active:scale-95 cursor-pointer"
            >
              +1000
            </button>
            <button
              type="button"
              onClick={() => handleAddDenomination(2000)}
              className="bg-blue-100 dark:bg-blue-900/60 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 rounded-lg py-1 text-xs font-mono font-bold hover:bg-blue-200 transition active:scale-95 cursor-pointer"
            >
              +2000
            </button>
            <button
              type="button"
              onClick={() => handleAddDenomination(5000)}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:border-blue-300 border border-slate-200 dark:border-slate-700 rounded-lg py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-blue-700 transition active:scale-95 cursor-pointer"
            >
              +5000
            </button>
          </div>
        </div>

        {/* Balance / Change Returned Field */}
        <div className="space-y-1 pt-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              المبلغ المتبقي للإرجاع:
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              فائض نقدي
            </span>
          </label>
          <div className="w-full text-left font-mono font-black text-xl text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg py-1.5 px-3 flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-sans">
              الباقي للزبون
            </span>
            <span>
              {formatMoney(changeDue)}{' '}
              <span className="text-xs font-bold font-sans">{currency}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Payment Method Selector (2x2 Grid) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-2">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>طريقة الدفع (Mode de paiement)</span>
          <span className="text-blue-600 dark:text-blue-400 text-[10px]">
            محدد:{' '}
            {selectedPaymentMethod === 'cash'
              ? 'نقداً'
              : selectedPaymentMethod === 'card'
              ? 'بطاقة CIB'
              : selectedPaymentMethod === 'debt'
              ? 'أجل / دَين'
              : 'شيك بنكي'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* Cash */}
          <button
            type="button"
            onClick={() => setSelectedPaymentMethod('cash')}
            className={`flex items-center justify-center gap-2 font-bold py-2 px-2.5 rounded-lg text-xs transition cursor-pointer ${
              selectedPaymentMethod === 'cash'
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>نقداً (Cash)</span>
          </button>

          {/* Card */}
          <button
            type="button"
            onClick={() => setSelectedPaymentMethod('card')}
            className={`flex items-center justify-center gap-2 font-bold py-2 px-2.5 rounded-lg text-xs transition cursor-pointer ${
              selectedPaymentMethod === 'card'
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>بطاقة (CIB)</span>
          </button>

          {/* Debt / Credit */}
          <button
            type="button"
            onClick={() => setSelectedPaymentMethod('debt')}
            className={`flex items-center justify-center gap-2 font-bold py-2 px-2.5 rounded-lg text-xs transition cursor-pointer ${
              selectedPaymentMethod === 'debt'
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>أجل / دَين</span>
          </button>

          {/* Cheque */}
          <button
            type="button"
            onClick={() => setSelectedPaymentMethod('cheque')}
            className={`flex items-center justify-center gap-2 font-bold py-2 px-2.5 rounded-lg text-xs transition cursor-pointer ${
              selectedPaymentMethod === 'cheque'
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>شيك بنكي</span>
          </button>
        </div>
      </div>

      {/* Quick Fast Action Tool Strip (F7, F10, Favorites) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-2.5 flex items-center justify-between gap-2 mt-auto">
        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="flex-1 flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-2 rounded-lg text-xs shadow-2xs transition active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>إضافة سريعة</span>
          <span className="bg-amber-700/40 text-[9px] px-1 rounded font-mono">F7</span>
        </button>

        <button
          type="button"
          onClick={onOpenPackages}
          className="flex-1 flex items-center justify-center gap-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 px-2 rounded-lg text-xs shadow-2xs transition active:scale-95 cursor-pointer"
        >
          <Package className="w-3.5 h-3.5" />
          <span>حزمة</span>
          <span className="bg-teal-800/40 text-[9px] px-1 rounded font-mono">F10</span>
        </button>

        <button
          type="button"
          onClick={onOpenFavorites}
          className="flex items-center justify-center gap-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-400 font-bold py-1.5 px-2.5 rounded-lg text-xs border border-amber-200 dark:border-amber-800 transition cursor-pointer"
          title="المفضلة السريعة"
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
        </button>
      </div>
    </aside>
  );
};
