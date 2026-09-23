import React, { useState, useEffect } from 'react';
import { X, Receipt, ShoppingCart, RotateCcw, Printer, User, Wallet, Clock, History, CheckCircle2, ArrowDownRight } from 'lucide-react';
import type { POSInvoiceDetailsModalProps } from '../types';
import { formatMoney } from '@/features/pos/utils/format';
import { InvoicePaymentStatusBadge } from '../components/InvoicePaymentStatusBadge';
import { InvoiceStatusToggleSwitch } from '../components/InvoiceStatusToggleSwitch';
import { db } from '@/infrastructure/database/dexie/db';
import type { Payment } from '@/types';

export const POSInvoiceDetailsModal: React.FC<POSInvoiceDetailsModalProps> = ({
  isOpen,
  onClose,
  sale,
  customer,
  onTogglePaymentStatus,
  onRecallToCart,
  onFullReturn,
  onPrintReceipt,
  onSettleInvoiceDebt,
  currencySymbol = 'دج',
}) => {
  if (!isOpen || !sale) return null;

  const items = sale.items || [];
  const isReturn = sale.type === 'return';
  const paidAmount = Number(sale.paidAmount) || (sale.status === 'paid' ? sale.total : 0);
  const remainingDebt = Math.max(0, (sale.total || 0) - paidAmount);
  const paidPercent = sale.total > 0 ? Math.min(100, (paidAmount / sale.total) * 100) : 0;

  // Payment history for this invoice
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!sale?.customerId || !isOpen) return;
    setLoadingHistory(true);

    const loadPayments = async () => {
      try {
        // Fetch all payments for this customer that reference this invoice
        const allPayments = await db.payments
          .where('customerId')
          .equals(sale.customerId!)
          .toArray();

        // Filter payments that mention this invoice number in their note
        const invoiceNumber = sale.number || '';
        const invoiceId = sale.id;
        const related = allPayments.filter((p: any) => {
          const note = (p.note || '').toLowerCase();
          return (
            note.includes(`#${invoiceNumber}`) ||
            note.includes(invoiceId) ||
            note.includes(`فاتورة #${invoiceNumber}`) ||
            note.includes(`الفاتورة #${invoiceNumber}`)
          );
        }).sort((a: any, b: any) =>
          new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
        );

        setPaymentHistory(related);
      } catch {
        setPaymentHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadPayments();
  }, [sale?.id, sale?.customerId, isOpen]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-on-surface">تفاصيل الفاتورة</h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold">
                  #{sale.number}
                </span>
                <InvoicePaymentStatusBadge
                  status={sale.status}
                  type={sale.type}
                  total={sale.total}
                  paidAmount={sale.paidAmount}
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                تاريخ الإنشاء: {new Date(sale.date).toLocaleString('ar-DZ')}
                {sale.soldBy ? ` • البائع: ${sale.soldBy}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Customer info card if exists */}
          {sale.customerName && (
            <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-bold text-on-surface">{sale.customerName}</p>
                  {customer?.phone && (
                    <p className="text-[11px] text-on-surface-variant font-mono">{customer.phone}</p>
                  )}
                </div>
              </div>
              {customer && (
                <div className="text-left">
                  <span className="text-[11px] text-on-surface-variant block">الرصيد الكلي الحالي:</span>
                  <span className={`text-xs font-mono font-bold ${customer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatMoney(customer.balance)} {currencySymbol}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          <div className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-surface-container/50">
            <div className="px-4 py-2 bg-surface-container border-b border-outline-variant/15 text-xs font-bold text-on-surface-variant flex justify-between">
              <span>بنود الفاتورة ({items.length} صنف)</span>
              <span>الإجمالي</span>
            </div>
            <div className="divide-y divide-outline-variant/10 max-h-60 overflow-y-auto custom-scrollbar">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-surface-container/30 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-on-surface">{item.name}</span>
                      {item.isPack && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/10 text-indigo-600 font-bold">
                          طرد
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {item.qty} {item.unit || 'قطعة'} × {formatMoney(item.unitPrice)} {currencySymbol}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-on-surface">
                    {formatMoney(item.lineTotal || item.qty * item.unitPrice)} {currencySymbol}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <span className="text-[11px] text-on-surface-variant block">المجموع الفرعي:</span>
              <span className="text-xs font-mono font-bold text-on-surface">
                {formatMoney(sale.subtotal || sale.total)} {currencySymbol}
              </span>
            </div>
            {Boolean(sale.discount) && (
              <div>
                <span className="text-[11px] text-rose-600 block">الخصم الممنوح:</span>
                <span className="text-xs font-mono font-bold text-rose-600">
                  -{formatMoney(sale.discount)} {sale.discountType === 'percentage' ? '%' : currencySymbol}
                </span>
              </div>
            )}
            <div>
              <span className="text-[11px] text-on-surface-variant block">المبلغ المسدد:</span>
              <span className="text-xs font-mono font-bold text-emerald-600">
                {formatMoney(paidAmount)} {currencySymbol}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant block">المتبقي (دين):</span>
              <span className={`text-xs font-mono font-bold ${remainingDebt > 0 ? 'text-rose-600' : 'text-on-surface'}`}>
                {formatMoney(remainingDebt)} {currencySymbol}
              </span>
            </div>
          </div>

          {/* Payment Progress Bar */}
          {!isReturn && sale.total > 0 && (
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-on-surface-variant">نسبة سداد الفاتورة</span>
                <span className={`text-xs font-black font-mono ${
                  paidPercent >= 100 ? 'text-emerald-600' :
                  paidPercent >= 50  ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {paidPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    paidPercent >= 100 ? 'bg-emerald-500' :
                    paidPercent >= 50  ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-on-surface-variant">
                <span>مسدد: {formatMoney(paidAmount)} {currencySymbol}</span>
                <span>متبقي: {formatMoney(remainingDebt)} {currencySymbol}</span>
              </div>
            </div>
          )}

          {/* Payment History Section */}
          {paymentHistory.length > 0 && (
            <div className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-surface-container/50">
              <div className="px-4 py-2.5 bg-surface-container border-b border-outline-variant/15 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-on-surface-variant">سجل دفعات هذه الفاتورة ({paymentHistory.length})</span>
              </div>
              <div className="divide-y divide-outline-variant/10 max-h-40 overflow-y-auto custom-scrollbar">
                {paymentHistory.map((payment: any, idx) => {
                  const methodNames: Record<string, string> = {
                    cash: 'نقداً',
                    card: 'بطاقة بنكية',
                    transfer: 'تحويل بنكي',
                    baridimob: 'بريدي موب',
                    credit: 'سند قبض',
                  };
                  return (
                    <div key={payment.id || idx} className="p-3 flex items-center justify-between hover:bg-surface-container/30 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-on-surface">
                            {methodNames[payment.method] || payment.method || 'دفعة'}
                          </p>
                          <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(payment.date || payment.createdAt).toLocaleString('ar-DZ')}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-black text-emerald-600">
                        +{formatMoney(payment.amount)} {currencySymbol}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {loadingHistory && (
            <p className="text-[11px] text-center text-on-surface-variant py-2">جاري تحميل سجل الدفعات...</p>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-surface-container border-t border-outline-variant/15 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Toggle Paid / Unpaid */}
            {onTogglePaymentStatus && !isReturn && (
              <InvoiceStatusToggleSwitch
                sale={sale}
                onToggleStatus={onTogglePaymentStatus}
              />
            )}

            {/* Print */}
            {onPrintReceipt && (
              <button
                type="button"
                onClick={() => onPrintReceipt(sale)}
                className="py-2 px-3 rounded-xl border border-outline-variant/25 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Settle Invoice Debt */}
            {onSettleInvoiceDebt && remainingDebt > 0 && !isReturn && (
              <button
                type="button"
                onClick={() => {
                  onSettleInvoiceDebt(sale, remainingDebt);
                  onClose();
                }}
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>تسديد دين الفاتورة ({formatMoney(remainingDebt)} {currencySymbol})</span>
              </button>
            )}

            {/* Recall To Cart */}
            {onRecallToCart && !isReturn && (
              <button
                type="button"
                onClick={() => {
                  onRecallToCart(sale);
                  onClose();
                }}
                className="py-2 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>استرجاع للسلة</span>
              </button>
            )}

            {/* Full Return */}
            {onFullReturn && !isReturn && (
              <button
                type="button"
                onClick={() => {
                  onFullReturn(sale);
                  onClose();
                }}
                className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إرجاع الفاتورة كاملة</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
