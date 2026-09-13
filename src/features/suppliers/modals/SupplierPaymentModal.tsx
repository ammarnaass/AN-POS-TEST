import React from 'react';
import { DollarSign, X } from 'lucide-react';
import type { Supplier } from '@/types';
import { formatSupplierMoney } from '../services/supplierStatus';

interface SupplierPaymentModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSubmit: () => void;
  paymentAmount: number;
  setPaymentAmount: (amount: number) => void;
  paymentMethod: 'cash' | 'check' | 'transfer' | 'baridimob';
  setPaymentMethod: (method: 'cash' | 'check' | 'transfer' | 'baridimob') => void;
  paymentNote: string;
  setPaymentNote: (note: string) => void;
  printReceiptOnPayment: boolean;
  setPrintReceiptOnPayment: (print: boolean) => void;
  currencySymbol?: string;
  isPending?: boolean;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onSubmit,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  paymentNote,
  setPaymentNote,
  printReceiptOnPayment,
  setPrintReceiptOnPayment,
  currencySymbol = 'دج',
  isPending = false,
}) => {
  if (!isOpen || !supplier) return null;

  const currentBalance = supplier.balance;
  const remainingAfter = Math.max(0, currentBalance - (paymentAmount || 0));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">تسديد مستحقات مورد</h3>
              <p className="text-xs text-on-surface-variant">
                المورد: <strong className="text-on-surface">{supplier.name}</strong>
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

        {/* Balances card */}
        <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 grid grid-cols-2 gap-3 text-center">
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant">المستحقات الحالية:</span>
            <p className="text-xl font-black font-mono text-amber-700 mt-0.5">
              {formatSupplierMoney(currentBalance)} <span className="text-xs font-cairo">{currencySymbol}</span>
            </p>
          </div>
          <div className="border-r border-outline-variant/20 pr-3">
            <span className="text-[11px] font-bold text-on-surface-variant">المتبقي بعد التسديد:</span>
            <p className={`text-xl font-black font-mono mt-0.5 ${remainingAfter === 0 ? 'text-emerald-600' : 'text-on-surface'}`}>
              {formatSupplierMoney(remainingAfter)} <span className="text-xs font-cairo">{currencySymbol}</span>
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1.5 block">خيارات سريعة للمبلغ:</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPaymentAmount(currentBalance)}
              className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-2xs"
            >
              كامل المبلغ (100%)
            </button>
            <button
              type="button"
              onClick={() => setPaymentAmount(Math.round(currentBalance / 2))}
              className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
            >
              النصف (50%)
            </button>
            <button
              type="button"
              onClick={() => setPaymentAmount(10000)}
              className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
            >
              10,000 دج
            </button>
            <button
              type="button"
              onClick={() => setPaymentAmount(50000)}
              className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
            >
              50,000 دج
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
              className="w-full pl-4 pr-10 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-lg font-black font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
              placeholder="0.00"
              autoFocus
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-xs text-on-surface-variant">
              {currencySymbol}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1.5 block">طريقة الدفع:</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'cash' as const, label: 'نقداً (Cash)' },
              { id: 'check' as const, label: 'صك بنكي' },
              { id: 'transfer' as const, label: 'تحويل بنكي' },
              { id: 'baridimob' as const, label: 'بريدي موب / CCP' },
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

        {/* Note / Cheque Ref */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1 block">ملاحظة أو رقم الصك/الحوالة (اختياري):</label>
          <input
            type="text"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            placeholder="مثال: صك رقم 12345، أو تحويل..."
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
          <span className="text-xs font-bold text-on-surface">طباعة وصل تسليم دفعة للمورد فوراً بعد التأكيد</span>
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
            {isPending ? 'جاري التسجيل...' : 'تأكيد وحفظ الدفعة'}
          </button>
        </div>
      </div>
    </div>
  );
};
