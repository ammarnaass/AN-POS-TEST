import React, { useState } from 'react';
import { DollarSign, X, Printer, Wallet, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import type { Customer } from '@/types';
import { formatMoney } from '../../utils/format';
import { settleCustomerDebtRecord } from '../services/posCustomerDebtService';
import { printPOSDebtSettlementSlip } from '../services/posDebtReceiptService';
import { posDebtNotificationService } from '../services/posDebtNotificationService';

export interface POSDebtSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  currentSessionId?: string | null;
  currencySymbol?: string;
  shopName?: string;
}

export const POSDebtSettlementModal: React.FC<POSDebtSettlementModalProps> = ({
  isOpen,
  onClose,
  customer,
  currentSessionId,
  currencySymbol = 'دج',
  shopName = 'نقطة البيع',
}) => {
  const currentBalance = Number(customer?.balance || 0);
  const [amount, setAmount] = useState<number | ''>(currentBalance > 0 ? currentBalance : '');
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [note, setNote] = useState('');
  const [printSlip, setPrintSlip] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  if (!isOpen || !customer) return null;

  const numAmount = Number(amount) || 0;
  const remainingAfter = currentBalance - numAmount;
  const isValidAmount = numAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await settleCustomerDebtRecord({
        customerId: customer.id,
        customerName: customer.name,
        amount: numAmount,
        paymentMethod: method,
        note,
        currentSessionId,
      });

      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['cash_sessions'] });

      posDebtNotificationService.notifyDebtSettlement({
        customerId: customer.id,
        customerName: customer.name,
        settledAmount: numAmount,
        newBalance: result.newBalance,
        currency: currencySymbol,
        paymentMethod: method,
        receiptNumber: result.receiptNumber,
      });

      if (printSlip) {
        printPOSDebtSettlementSlip(result, customer.name, customer.phone, shopName, currencySymbol);
      }

      onClose();
    } catch (err: any) {
      addNotification({
        title: 'خطأ في تسجيل التسديد',
        message: err?.message || 'تعذر تسجيل حركة التسديد.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">تسديد دين من نقطة البيع</h3>
              <p className="text-xs text-on-surface-variant font-mono">
                الزبون: <strong className="text-on-surface font-cairo">{customer.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Debt Card */}
        <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 grid grid-cols-2 gap-3 text-center">
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant">الدين الحالي المستحق:</span>
            <p className="text-xl font-black font-mono mt-0.5 text-red-600">
              {formatMoney(currentBalance)} <span className="text-xs font-cairo">{currencySymbol}</span>
            </p>
          </div>
          <div className="border-r border-outline-variant/20 pr-3">
            <span className="text-[11px] font-bold text-on-surface-variant">الرصيد بعد التسديد:</span>
            <p className={`text-xl font-black font-mono mt-0.5 ${remainingAfter <= 0 ? 'text-emerald-600' : 'text-on-surface'}`}>
              {formatMoney(remainingAfter)} <span className="text-xs font-cairo">{currencySymbol}</span>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount to pay */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-on-surface">المبلغ المسدد الآن:</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAmount(currentBalance)}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition cursor-pointer"
                >
                  كامل الدين
                </button>
                {currentBalance > 1000 && (
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(currentBalance / 2))}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant font-bold hover:bg-surface-container-high transition cursor-pointer"
                  >
                    النصف
                  </button>
                )}
              </div>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              autoFocus
              className="w-full h-12 px-4 bg-surface-container border border-outline-variant/20 rounded-xl text-lg font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">طريقة القبض:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: 'نقداً', icon: Wallet },
                { id: 'card', label: 'بطاقة', icon: DollarSign },
                { id: 'transfer', label: 'تحويل', icon: CheckCircle2 },
              ].map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id as any)}
                    className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/15 hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">ملاحظات (اختياري):</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: دفعة بموجب إيصال يدوي..."
              className="w-full h-9 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Print receipt toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={printSlip}
              onChange={(e) => setPrintSlip(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
            />
            <Printer className="w-3.5 h-3.5 text-on-surface-variant" />
            <span className="text-xs font-bold text-on-surface">طباعة وصل تسديد فوري بعد التأكيد</span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isValidAmount || isSubmitting}
              className="flex-2 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'جاري التسجيل...' : 'تأكيد التسديد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
