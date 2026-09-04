import React from 'react';
import {
  ShoppingCart,
  PauseCircle,
  Trash2,
  UserPlus,
  X,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  UserCheck,
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
  const changeDue = Math.max(0, cashTendered - saleSummary.total);

  const availableMethods: { id: 'cash' | 'card' | 'transfer' | 'credit'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'cash', label: 'نقداً', icon: Banknote },
  ];
  if (allowCardPayment) {
    availableMethods.push({ id: 'card', label: 'بطاقة', icon: CreditCard });
  }
  if (allowTransferPayment) {
    availableMethods.push({ id: 'transfer', label: 'تحويل', icon: ArrowLeftRight });
  }
  availableMethods.push({ id: 'credit', label: 'آجل', icon: UserCheck });

  const gridColsClass =
    availableMethods.length === 2
      ? 'grid-cols-2'
      : availableMethods.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-4';

  return (
    <>
      <div className={`w-full md:w-[380px] lg:w-[420px] bg-surface-container flex-col border-r border-outline-variant/20 shadow-md shrink-0 ${
        mobileTab === 'cart' ? 'flex' : 'hidden md:flex'
      }`}>
        {/* Mobile Top Bar inside Cart */}
        <div className="md:hidden p-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between shrink-0">
          <button
            onClick={() => onSwitchMobileTab('catalog')}
            className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-surface shadow-2xs cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة لاختيار الأصناف</span>
          </button>
          <span className="text-xs font-black text-on-surface">
            السلة ({cart.length} أصناف)
          </span>
        </div>

        {/* Cart Header & Customer */}
        <div className="p-3 border-b border-outline-variant/15 space-y-2 bg-surface-container-high/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-on-surface">سلة الكاشير</h3>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono font-bold">
                {cart.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={onHoldSale}
                disabled={cart.length === 0}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-600 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                title="تعليق البيع مؤقتاً (F2)"
              >
                <PauseCircle className="w-4 h-4" />
                <span>تعليق (F2)</span>
              </button>
              <button
                onClick={onClearCart}
                disabled={cart.length === 0}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                title="تفريغ السلة بالكامل (F4)"
              >
                <Trash2 className="w-4 h-4" />
                <span>تفريغ (F4)</span>
              </button>
            </div>
          </div>

          {/* Customer Quick Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCustomer}
              onChange={(e) => onSelectCustomer(e.target.value)}
              className="flex-1 h-10 px-3 bg-surface border border-outline-variant/20 rounded-xl text-xs sm:text-[13px] text-on-surface font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-inner"
            >
              <option value="">زبون نقدي (افتراضي)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance && c.balance > 0 ? `(دين: ${formatNumber(c.balance)} دج)` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={onOpenAddCustomerModal}
              className="w-10 h-10 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant/20 text-amber-600 text-xs font-bold flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
              title="تحديد أو إضافة عميل (F6)"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Debtor Warning */}
          {selectedCustomerObj && selectedCustomerObj.balance > 0 && (
            <div className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between">
              <span>ديون سابقة:</span>
              <span className="font-mono">{formatNumber(selectedCustomerObj.balance)} دج</span>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
              <ShoppingCart className="w-10 h-10 opacity-20 mb-2" />
              <p className="text-xs font-bold">السلة فارغة</p>
              <p className="text-[10px] opacity-70 mt-0.5">امسح الباركود أو انقر على المنتجات</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="p-2 rounded-xl bg-surface border border-outline-variant/15 flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-on-surface truncate">{item.name}</h5>
                  <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-mono mt-0.5">
                    <span>{formatNumber(item.unitPrice)} دج</span>
                    <span>×</span>
                    <span className="font-bold text-on-surface">{item.qty}</span>
                    <span>=</span>
                    <span className="font-bold text-amber-600">{formatNumber(item.lineTotal)} دج</span>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center bg-surface-container-low rounded-lg p-0.5 border border-outline-variant/20">
                  <button
                    onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                    className="w-6 h-6 rounded bg-surface hover:bg-amber-500 hover:text-white text-on-surface flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                  >
                    +
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-xs text-on-surface">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                    className="w-6 h-6 rounded bg-surface hover:bg-red-500 hover:text-white text-on-surface flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                </div>

                {/* Delete Item */}
                <button
                  onClick={() => onRemoveItem(item.productId)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* FAST TENDER & CHECKOUT ZONE */}
        <div className="p-3 bg-surface-container-high/60 border-t border-outline-variant/20 space-y-2.5 shrink-0 shadow-lg">
          {/* Payment Method Selector */}
          <div className={`grid ${gridColsClass} gap-1.5`}>
            {availableMethods.map((m) => {
              const Icon = m.icon;
              const active = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectPaymentMethod(m.id)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-surface hover:bg-surface-container text-on-surface-variant border-outline-variant/15'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Rapid Cash Tender Buttons (When Cash is active) */}
          {paymentMethod === 'cash' && saleSummary.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: 'بالضبط', val: saleSummary.total },
                  { label: '+200', val: Math.ceil(saleSummary.total / 200) * 200 },
                  { label: '+500', val: Math.ceil(saleSummary.total / 500) * 500 },
                  { label: '+1,000', val: Math.ceil(saleSummary.total / 1000) * 1000 },
                  { label: '+2,000', val: Math.ceil(saleSummary.total / 2000) * 2000 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => onChangeCashTendered(btn.val)}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      cashTendered === btn.val
                        ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                        : 'bg-surface hover:bg-surface-container border-outline-variant/15 text-on-surface'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Cash Tender Input & Change Due Display */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-on-surface-variant font-bold mb-0.5">المبلغ المقبوض:</label>
                  <input
                    type="number"
                    value={cashTendered || ''}
                    onChange={(e) => onChangeCashTendered(Number(e.target.value) || 0)}
                    placeholder={saleSummary.total.toString()}
                    className="w-full h-9 px-3 bg-surface border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-[10px] text-on-surface-variant font-bold mb-0.5">الفكة (الباقي):</label>
                  <div className="h-9 px-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-mono font-extrabold text-sm">
                    <span>{formatMoney(changeDue)}</span>
                    <span className="text-[10px]">دج</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Giant Instant Pay Button */}
          <button
            onClick={onQuickPay}
            disabled={cart.length === 0 || isSalePending}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-base flex items-center justify-between px-5 transition-all shadow-md shadow-amber-500/25 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 fill-current" />
              <span>{isSalePending ? 'جاري الحفظ...' : 'دفع فوري وحفظ (F1)'}</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono text-lg">
              <span>{formatMoney(saleSummary.total)}</span>
              <span className="text-xs font-normal opacity-90">دج</span>
            </div>
          </button>
        </div>
      </div>

      {/* FLOATING MOBILE CART SUMMARY BAR (Visible on mobile during catalog browsing) */}
      {mobileTab === 'catalog' && cart.length > 0 && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-surface-container-high/95 backdrop-blur-xl border border-amber-500/40 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/25 relative shrink-0">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center font-mono shadow-xs">
                {cart.length}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant font-bold">إجمالي السلة:</p>
              <p className="text-sm font-black font-mono text-amber-600 truncate">
                {formatMoney(saleSummary?.total)} {baseCurrency}
              </p>
            </div>
          </div>

          <button
            onClick={() => onSwitchMobileTab('cart')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/25 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>عرض السلة والدفع</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
});
