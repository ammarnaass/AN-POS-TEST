import React, { useRef, useEffect } from 'react';
import {
  Banknote,
  CreditCard,
  ArrowLeftRight,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { formatMoney, formatNumber } from '../utils/format';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit';
  setPaymentMethod: (method: 'cash' | 'card' | 'transfer' | 'credit') => void;
  paidAmount: number;
  setPaidAmount: (amount: number) => void;
  selectedCustomer: string;
  setSelectedCustomer: (id: string) => void;
  customers: Array<{ id: string; name: string; phone?: string; balance?: number }>;
  onOpenAddCustomer: () => void;
  onConfirmPayment: () => void;
  isPending: boolean;
  allowCardPayment?: boolean;
  allowTransferPayment?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  paymentMethod,
  setPaymentMethod,
  paidAmount,
  setPaidAmount,
  selectedCustomer,
  setSelectedCustomer,
  customers,
  onOpenAddCustomer,
  onConfirmPayment,
  isPending,
  allowCardPayment = false,
  allowTransferPayment = false,
}) => {
  const customerSelectRef = useRef<HTMLSelectElement>(null);
  const paidInputRef = useRef<HTMLInputElement>(null);

  // Self-contained keyboard shortcuts handling for the payment process
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Confirm payment on Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (isPending) return;
        if (paymentMethod === 'credit' && !selectedCustomer) {
          customerSelectRef.current?.focus();
          return;
        }
        onConfirmPayment();
        return;
      }

      // 2. Cancel and close on Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // 3. Payment methods shortcuts: F1..F4 or Alt+1..Alt+4
      if (e.key === 'F1' || (e.altKey && e.key === '1')) {
        e.preventDefault();
        e.stopPropagation();
        setPaymentMethod('cash');
        return;
      }
      if ((e.key === 'F2' || (e.altKey && e.key === '2')) && allowCardPayment) {
        e.preventDefault();
        e.stopPropagation();
        setPaymentMethod('card');
        return;
      }
      if ((e.key === 'F3' || (e.altKey && e.key === '3')) && allowTransferPayment) {
        e.preventDefault();
        e.stopPropagation();
        setPaymentMethod('transfer');
        return;
      }
      if (e.key === 'F4' || (e.altKey && e.key === '4')) {
        e.preventDefault();
        e.stopPropagation();
        setPaymentMethod('credit');
        return;
      }

      // 4. Quick cash presets shortcuts: F5..F8 (or Alt+E for exact)
      if (paymentMethod === 'cash') {
        if (e.key === 'F5' || (e.altKey && (e.key === 'e' || e.key === 'E'))) {
          e.preventDefault();
          e.stopPropagation();
          setPaidAmount(total);
          return;
        }
        if (e.key === 'F6') {
          e.preventDefault();
          e.stopPropagation();
          setPaidAmount(total + 500);
          return;
        }
        if (e.key === 'F7') {
          e.preventDefault();
          e.stopPropagation();
          setPaidAmount(total + 1000);
          return;
        }
        if (e.key === 'F8') {
          e.preventDefault();
          e.stopPropagation();
          setPaidAmount(total + 2000);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    isOpen,
    isPending,
    paymentMethod,
    selectedCustomer,
    total,
    allowCardPayment,
    allowTransferPayment,
    onConfirmPayment,
    onClose,
    setPaymentMethod,
    setPaidAmount,
  ]);

  if (!isOpen) return null;

  const changeDue = Math.max(0, paidAmount - total);
  const isPaidSufficient = paidAmount >= total;

  const availableMethods: {
    id: 'cash' | 'card' | 'transfer' | 'credit';
    label: string;
    icon: any;
    shortcut: string;
  }[] = [
    { id: 'cash', label: 'نقداً', icon: Banknote, shortcut: 'F1' },
  ];
  if (allowCardPayment) {
    availableMethods.push({ id: 'card', label: 'بطاقة', icon: CreditCard, shortcut: 'F2' });
  }
  if (allowTransferPayment) {
    availableMethods.push({ id: 'transfer', label: 'تحويل', icon: ArrowLeftRight, shortcut: 'F3' });
  }
  availableMethods.push({ id: 'credit', label: 'آجل / ذمم', icon: UserCheck, shortcut: 'F4' });

  const gridColsClass =
    availableMethods.length === 2
      ? 'grid-cols-2'
      : availableMethods.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">إتمام الدفع وتأكيد البيع</h3>
              <p className="text-xs text-on-surface-variant">اختر وسيلة الدفع واستلم المبلغ من الزبون</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="إلغاء (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Grand Total Dominant Banner */}
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-right">
            <span className="text-xs font-bold text-on-surface-variant">المبلغ المطلوب للدفع:</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-extrabold text-primary">
                {formatMoney(total)}
              </span>
              <span className="text-xs font-bold text-primary">دج</span>
            </div>
          </div>

          {/* Payment Methods Tabs with Shortcut Badges */}
          <div className={`grid ${gridColsClass} gap-2`}>
            {availableMethods.map((m) => {
              const Icon = m.icon;
              const active = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer relative ${
                    active
                      ? 'bg-primary text-on-primary border-primary shadow-sm'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/15'
                  }`}
                  title={`${m.label} (${m.shortcut})`}
                >
                  <span
                    className={`absolute top-2 left-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      active ? 'bg-black/20 text-white' : 'bg-outline-variant/20 text-on-surface-variant'
                    }`}
                  >
                    {m.shortcut}
                  </span>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-bold">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cash Denominations and Paid Input */}
          {paymentMethod === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">المبلغ المدفوع من الزبون:</label>
                <input
                  ref={paidInputRef}
                  type="number"
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isPending) onConfirmPayment();
                    }
                  }}
                  placeholder={total.toString()}
                  className="w-full h-12 px-4 bg-surface-container border border-outline-variant/20 rounded-xl text-lg font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>

              {/* Quick Preset Buttons with Shortcut Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'المبلغ بالضبط', val: total, shortcut: 'F5' },
                  { label: '+500 دج', val: total + 500, shortcut: 'F6' },
                  { label: '+1,000 دج', val: total + 1000, shortcut: 'F7' },
                  { label: '+2,000 دج', val: total + 2000, shortcut: 'F8' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => setPaidAmount(btn.val)}
                    className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface transition-all cursor-pointer flex items-center gap-1.5"
                    title={`${btn.label} (${btn.shortcut})`}
                  >
                    <span>{btn.label}</span>
                    <span className="text-[10px] font-mono text-on-surface-variant/70 font-semibold">({btn.shortcut})</span>
                  </button>
                ))}
              </div>

              {/* Live Change Calculation Card */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isPaidSufficient
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                }`}
              >
                <span className="text-xs font-bold">
                  {isPaidSufficient ? 'المبلغ المتبقي للزبون (الفكة):' : 'المبلغ المتبقي غير كافٍ:'}
                </span>
                <span className="text-xl font-extrabold font-mono">
                  {formatMoney(changeDue)} دج
                </span>
              </div>
            </div>
          )}

          {paymentMethod === 'credit' && (
            <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span>تحديد الزبون للبيع الآجل (دين):</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenAddCustomer}
                  className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>زبون جديد</span>
                </button>
              </div>
              <div className="relative">
                <select
                  ref={customerSelectRef}
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full h-10 pr-3 pl-8 bg-surface-container-low border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                >
                  <option value="">— اختر الزبون من القائمة ({customers.length} مسجل) —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}{' '}
                      {c.balance && c.balance > 0 ? `[دين سابق: ${formatNumber(c.balance)} دج]` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/70 text-[10px]">
                  ▼
                </div>
              </div>
              {!selectedCustomer && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  ⚠️ يجب اختيار زبون من القائمة لتسجيل الفاتورة كدين آجل.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-surface-container border-t border-outline-variant/15 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
          >
            إلغاء (Esc)
          </button>
          <button
            onClick={onConfirmPayment}
            disabled={isPending || (paymentMethod === 'credit' && !selectedCustomer)}
            className="flex-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'جاري الحفظ...' : 'تأكيد ودفع الفاتورة (Enter)'}
          </button>
        </div>
      </div>
    </div>
  );
};

