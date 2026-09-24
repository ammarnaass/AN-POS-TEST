import React, { useState, useMemo } from 'react';
import { DollarSign, X, FileText, CheckCircle2, Receipt } from 'lucide-react';
import type { Customer, Sale } from '@/types';
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
  customerSales?: Sale[];
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
  customerSales = [],
}) => {
  const [activeTab, setActiveTab] = useState<'fifo' | 'selective'>('fifo');

  // Unpaid or partial invoices for selective settlement
  const unpaidInvoices = useMemo(() => {
    return customerSales.filter((s) => {
      const isCredit = s.paymentMethod === 'credit' || s.status === 'unpaid' || s.status === 'partial';
      const paid = Number(s.amountPaid ?? s.paidAmount ?? (s as any).amount_paid ?? 0);
      const unpaid = Number(s.total || 0) - paid;
      return isCredit && unpaid > 0.01;
    });
  }, [customerSales]);

  if (!isOpen || !customer) return null;

  const currentBalance = customer.balance;
  const rawRemaining = currentBalance - (paymentAmount || 0);
  const isOverpayment = rawRemaining < 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-4 animate-in zoom-in-95">
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

        {/* Mode Selector Tabs (FIFO vs Selective) */}
        {unpaidInvoices.length > 0 && (
          <div className="flex rounded-xl bg-surface-container p-1 border border-outline-variant/20 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('fifo')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'fifo'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>سداد عام على الحساب (FIFO)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('selective')}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'selective'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>سداد فواتير محددة ({unpaidInvoices.length})</span>
            </button>
          </div>
        )}

        {/* Tab 2: Selective Invoice Settlement List */}
        {activeTab === 'selective' && unpaidInvoices.length > 0 && (
          <div className="space-y-2 border border-outline-variant/20 rounded-2xl p-3 bg-surface-container/40">
            <span className="text-[11px] font-bold text-on-surface-variant block">
              اختر الفاتورة المراد سدادها بالكامل أو جزء منها:
            </span>
            <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {unpaidInvoices.map((inv) => {
                const invTotal = Number(inv.total || 0);
                const invPaid = Number(inv.amountPaid ?? inv.paidAmount ?? (inv as any).amount_paid ?? 0);
                const invRemaining = Math.max(0, invTotal - invPaid);

                return (
                  <div
                    key={inv.id}
                    onClick={() => {
                      setPaymentAmount(invRemaining);
                      setPaymentNote(`تسديد فاتورة #${inv.number || inv.id.slice(-6)}`);
                    }}
                    className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-on-surface flex items-center gap-1.5">
                        <span>فاتورة #{inv.number || inv.id.slice(-6)}</span>
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          ({inv.date ? new Date(inv.date).toLocaleDateString('ar-DZ') : ''})
                        </span>
                      </div>
                      <div className="text-[10px] text-on-surface-variant mt-0.5">
                        الإجمالي: {formatCustomerMoney(invTotal)} | المسدد: {formatCustomerMoney(invPaid)}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="text-[10px] text-red-500 font-bold block">متبقي غير مسدد</span>
                      <span className="font-black font-mono text-red-600 text-xs">
                        {formatCustomerMoney(invRemaining)} {currencySymbol}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Presets */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1.5 block">خيارات سريعة للمبلغ:</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPaymentAmount(currentBalance > 0 ? currentBalance : 0)}
              className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-2xs"
            >
              كامل الدين (100%)
            </button>
            <button
              type="button"
              onClick={() => setPaymentAmount(currentBalance > 0 ? Math.round(currentBalance / 2) : 0)}
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
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-on-surface-variant block">مبلغ الدفعة (دج) *</label>
            <span className="text-[10px] text-primary font-bold flex items-center gap-1">
              <span>⚡ تسوية تلقائية للفواتير (FIFO)</span>
            </span>
          </div>
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
