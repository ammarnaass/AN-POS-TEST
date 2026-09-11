import React from 'react';
import {
  ShoppingCart,
  PauseCircle,
  Trash2,
  X,
  User,
  Clock,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  Zap,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import type { CartItem, Customer } from '@/types';
import { formatMoney, formatNumber } from '../../utils/format';

interface QuickPOSCartProps {
  cart: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onHoldSale: () => void;
  customers: Customer[];
  selectedCustomer: string;
  onSelectCustomer: (id: string) => void;
  onOpenAddCustomerModal: () => void;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit';
  onSelectPaymentMethod: (m: 'cash' | 'card' | 'transfer' | 'credit') => void;
  allowCardPayment: boolean;
  allowTransferPayment: boolean;
  cashTendered: number;
  onChangeCashTendered: (val: number) => void;
  saleSummary: { subtotal: number; discountAmount: number; tvaAmount: number; total: number };
  onQuickPay: () => void;
  isSalePending: boolean;
  mobileTab: 'catalog' | 'cart';
  onSwitchMobileTab: (tab: 'catalog' | 'cart') => void;
  baseCurrency: string;
}

export const QuickPOSCart: React.FC<QuickPOSCartProps> = React.memo(({
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onHoldSale,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onOpenAddCustomerModal,
  paymentMethod,
  onSelectPaymentMethod,
  allowCardPayment,
  allowTransferPayment,
  cashTendered,
  onChangeCashTendered,
  saleSummary,
  onQuickPay,
  isSalePending,
  mobileTab,
  onSwitchMobileTab,
  baseCurrency,
}) => {
  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomer);
  const changeDue = Math.max(0, (cashTendered || 0) - saleSummary.total);

  const availableMethods: { id: 'cash' | 'card' | 'transfer' | 'credit'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
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
    if (saleSummary.total <= 0) return;
    const base = cashTendered > 0 ? cashTendered : saleSummary.total;
    const rounded = Math.ceil(base / step) * step;
    const nextVal = rounded === base ? base + step : rounded;
    onChangeCashTendered(nextVal);
  };

  return (
    <>
      <section
        className={`w-full lg:w-[420px] xl:w-[460px] flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-shrink-0 transition-all ${
          mobileTab === 'cart' ? 'flex' : 'hidden md:flex'
        }`}
        data-purpose="cashier-cart"
      >
        {/* Mobile Header (When switching on small screens) */}
        <div className="md:hidden p-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between shrink-0">
          <button
            onClick={() => onSwitchMobileTab('catalog')}
            className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 shadow-2xs cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة لاختيار الأصناف</span>
          </button>
          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
            السلة ({cart.length} أصناف)
          </span>
        </div>

        {/* 1. CART HEADER WITH CUSTOMER SELECTION */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold text-xs font-mono">
                {cart.length}
              </span>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">سلة الكاشير</h2>
            </div>

            {/* Quick Cart Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onHoldSale}
                disabled={cart.length === 0}
                className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-2.5 py-1 rounded-lg border border-amber-200/70 dark:border-amber-700/60 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                title="تعليق السلة (F2)"
                type="button"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>تعليق (F2)</span>
              </button>
              <button
                onClick={onClearCart}
                disabled={cart.length === 0}
                className="text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-800 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2.5 py-1 rounded-lg border border-rose-200/70 dark:border-rose-700/60 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                title="تفريغ السلة بالكامل (F4)"
                type="button"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تفريغ (F4)</span>
              </button>
            </div>
          </div>

          {/* Customer Selector Dropdown */}
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <select
              value={selectedCustomer}
              onChange={(e) => {
                if (e.target.value === '__add_new__') {
                  onOpenAddCustomerModal();
                } else {
                  onSelectCustomer(e.target.value);
                }
              }}
              className="w-full pl-8 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition cursor-pointer"
            >
              <option value="">زبون نقدي (افتراضي)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance && c.balance > 0 ? `(دين: ${formatNumber(c.balance)} دج)` : ''}
                </option>
              ))}
              <option value="__add_new__" className="text-brand-600 font-bold">
                + إضافة زبون جديد...
              </option>
            </select>
          </div>

          {/* Debts notification if customer has balance */}
          {selectedCustomerObj && selectedCustomerObj.balance > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-700/60 text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between">
              <span>ديون سابقة مستحقة على العميل:</span>
              <span className="font-mono">{formatNumber(selectedCustomerObj.balance)} دج</span>
            </div>
          )}
        </div>

        {/* 2. CART ITEM LIST (SCROLLABLE) */}
        <div
          className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 space-y-1 custom-scrollbar"
          data-purpose="cart-items-list"
        >
          {cart.length === 0 ? (
            <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingCart className="w-10 h-10 opacity-25 mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">السلة فارغة</p>
              <p className="text-[11px] opacity-70 mt-0.5">امسح الباركود بالكاشف أو انقر على الأصناف</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl flex items-center justify-between gap-2 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {item.name}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                    <span>{formatNumber(item.unitPrice)} دج</span>
                    <span>×</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.qty}</span>
                    <span>=</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400">
                      {formatNumber(item.lineTotal)} دج
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                    title="زيادة الكمية"
                    type="button"
                  >
                    +
                  </button>
                  <span className="w-7 text-center font-bold text-xs text-slate-800 dark:text-slate-200 font-mono">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                    title="إنقاص الكمية"
                    type="button"
                  >
                    -
                  </button>
                  <button
                    onClick={() => onRemoveItem(item.productId)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition mr-1 cursor-pointer"
                    title="حذف من السلة"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 3. PAYMENT METHOD & QUICK CASH FAST CALCULATOR */}
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
            <button
              type="button"
              onClick={() => handleDenominationClick(200)}
              className="py-1.5 font-bold bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 hover:text-brand-700 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer font-mono"
            >
              +200
            </button>
            <button
              type="button"
              onClick={() => handleDenominationClick(500)}
              className="py-1.5 font-bold bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 hover:text-brand-700 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer font-mono"
            >
              +500
            </button>
            <button
              type="button"
              onClick={() => handleDenominationClick(1000)}
              className="py-1.5 font-bold bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 hover:text-brand-700 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer font-mono"
            >
              +1,000
            </button>
            <button
              type="button"
              onClick={() => handleDenominationClick(2000)}
              className="py-1.5 font-bold bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-slate-800 hover:text-brand-700 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition active:scale-95 cursor-pointer font-mono"
            >
              +2,000
            </button>
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
                  {baseCurrency || 'دج'}
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
                  {baseCurrency || 'دج'}
                </span>
              </div>
            </div>
          </div>

          {/* MASSIVE CTA BUTTON: Submit & Save (F1) */}
          <button
            onClick={onQuickPay}
            disabled={cart.length === 0 || isSalePending}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 via-orange-600 to-amber-600 hover:from-brand-700 hover:to-orange-700 text-white font-black text-base rounded-xl shadow-lg shadow-brand-500/30 active:scale-[0.99] transition flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            type="button"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-5 h-5 animate-pulse" />
              <span>{isSalePending ? 'جاري الحفظ...' : 'دفع فوري وحفظ (F1)'}</span>
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-lg font-mono text-base sm:text-lg tracking-wide">
              {formatMoney(saleSummary.total)} {baseCurrency || 'دج'}
            </span>
          </button>
        </div>
      </section>

      {/* FLOATING MOBILE CART SUMMARY BAR (When browsing catalog on phone) */}
      {mobileTab === 'catalog' && cart.length > 0 && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-brand-500/40 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-md shadow-brand-500/25 relative shrink-0">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center font-mono shadow-xs">
                {cart.length}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">إجمالي السلة:</p>
              <p className="text-sm font-black font-mono text-brand-600 dark:text-brand-400 truncate">
                {formatMoney(saleSummary?.total)} {baseCurrency}
              </p>
            </div>
          </div>

          <button
            onClick={() => onSwitchMobileTab('cart')}
            className="px-4 py-2.5 bg-gradient-to-r from-brand-600 via-orange-600 to-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-brand-500/25 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
            type="button"
          >
            <span>عرض السلة والدفع</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
});
