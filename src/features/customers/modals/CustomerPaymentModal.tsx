import React from 'react';
import { DollarSign, X } from 'lucide-react';
import type { Customer } from '@/types';
import { formatCustomerMoney } from '../services/customerStatus';

interface CustomerPaymentModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSubmit: () => void;
  paymentAmount: number;
  setPaymentAmount: (amount: number) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentDate?: string;
  setPaymentDate?: (date: string) => void;
  paymentNote: string;
  setPaymentNote: (note: string) => void;
  printReceiptOnPayment: boolean;
  setPrintReceiptOnPayment: (print: boolean) => void;
  currencySymbol?: string;
  isPending?: boolean;
}

export const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSubmit,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  paymentDate,
  setPaymentDate,
  paymentNote,
  setPaymentNote,
  printReceiptOnPayment,
  setPrintReceiptOnPayment,
  currencySymbol = 'دج',
  isPending = false,
}) => {
  if (!isOpen || !customer) return null;

  const currentBalance = customer.balance;
  const rawRemaining = currentBalance - (paymentAmount || 0);
  const isOverpayment = rawRemaining < 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">تسجيل تسديد دفعة مالية</h3>
              <p className="text-xs text-on-surface-variant">
                الزبون: <strong className="text-on-surface">{customer.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Debt Status Card */}
        <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 grid grid-cols-2 gap-3 text-center">
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant">
              {currentBalance < 0 ? 'الرصيد الدائن الحالي:' : 'الدين الحالي المستحق:'}
            </span>
            <p className={`text-xl font-black font-mono mt-0.5 ${currentBalance < 0 ? 'text-teal-600' : 'text-red-600'}`}>
              {currentBalance < 0 ? `+${formatCustomerMoney(Math.abs(currentBalance))}` : formatCustomerMoney(currentBalance)}{' '}
              <span className="text-xs font-cairo">{currencySymbol}</span>
            </p>
          </div>
          <div className="border-r border-outline-variant/20 pr-3">
            <span className="text-[11px] font-bold text-on-surface-variant">الرصيد بعد التسديد:</span>
            <p
              className={`text-xl font-black font-mono mt-0.5 ${
                isOverpayment
                  ? 'text-teal-600'
                  : rawRemaining === 0
                  ? 'text-emerald-600'
                  : 'text-on-surface'
              }`}
            >
              {isOverpayment ? `+${formatCustomerMoney(Math.abs(rawRemaining))}` : formatCustomerMoney(rawRemaining)}{' '}
              <span className="text-xs font-cairo">
                {isOverpayment ? `(دائن) ${currencySymbol}` : currencySymbol}
              </span>
            </p>
          </div>
        </div>

        {/* Overpayment Notice */}
        {isOverpayment && (
          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs flex items-center gap-2.5">
            <span className="text-lg shrink-0">💡</span>
            <p className="leading-relaxed">
              المبلغ المدفوع يتجاوز الدين المستحق بمقدار <strong>{formatCustomerMoney(Math.abs(rawRemaining))} {currencySymbol}</strong>. سيتم تسجيل هذا الفائض تلقائياً كرصيد دائن في حساب العميل ليُخصم من مشترياته القادمة.
            </p>
          </div>
        )}

        {/* Quick Presets */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1.5 block">خيارات سريعة للمبلغ:</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPaymentAmount(currentBalance)}
              className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-2xs"
            >
              كامل الدين (100%)
            </button>
            <button
              type="button"
              onClick={() => setPaymentAmount(Math.round(currentBalance / 2))}
              className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
            >
              نصف الدين (50%)
            </button>
            <button
              type="button"
              onClick={() => setPaymentAmount(1000)}
              className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
            >
              1,000 دج
            </button>
            <button
              type="button"
              onClick={() => setPaymentAmount(5000)}
              className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
            >
              5,000 دج
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1 block">مبلغ الدفعة (دج) *</label>
          <div className="relative">
            <input
              type="number"
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(Math.max(0, Number(e.target.value)))}
              className="w-full pl-4 pr-10 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-lg font-black font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
              placeholder="0.00"
              autoFocus
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-xs text-on-surface-variant">
              {currencySymbol}
            </span>
          </div>
        </div>

        {/* Payment Date & Method Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-on-surface-variant mb-1 block">تاريخ التسديد:</label>
            <input
              type="date"
              value={paymentDate || ''}
              onChange={(e) => setPaymentDate?.(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1.5 block">طريقة الدفع:</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'cash', label: 'نقداً (Cash)' },
              { id: 'baridimob', label: 'بريدي موب / CCP' },
              { id: 'check', label: 'شيك بنكي' },
              { id: 'transfer', label: 'تحويل بنكي' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  paymentMethod === m.id
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'bg-surface-container text-on-surface border-outline-variant/20'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note / Reference */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1 block">ملاحظة أو رقم العملية (اختياري):</label>
          <input
            type="text"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            placeholder="مثال: دفعة نقداً عند الكاشير، أو رقم التحويل..."
            className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Print Receipt Toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer bg-surface-container/60 p-3 rounded-xl border border-outline-variant/20">
          <input
            type="checkbox"
            checked={printReceiptOnPayment}
            onChange={(e) => setPrintReceiptOnPayment(e.target.checked)}
            className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
          />
          <span className="text-xs font-bold text-on-surface">طباعة وصل تسديد دين فوري بعد التأكيد</span>
        </label>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={paymentAmount <= 0 || isPending}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            {isPending ? 'جاري التسجيل...' : 'تأكيد وحفظ التسديد'}
          </button>
        </div>
      </div>
    </div>
  );
};
