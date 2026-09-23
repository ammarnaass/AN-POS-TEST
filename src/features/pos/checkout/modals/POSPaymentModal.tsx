import React from 'react';
import { X, CreditCard, ArrowLeftRight, RotateCcw, Banknote, UserCheck } from 'lucide-react';
import { formatMoney } from '@/features/pos/utils/format';
import { POSCreditPaymentSection } from '@/features/pos/debt';
import { usePOSPaymentModal } from '../hooks/usePOSPaymentModal';
import { usePaymentModalShortcuts } from '../hooks/usePOSCheckoutShortcuts';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { CashPresetsButtons } from '../components/CashPresetsButtons';
import { PaymentChangeDisplay } from '../components/PaymentChangeDisplay';
import { SaleSummaryBreakdown } from '../components/SaleSummaryBreakdown';
import type { POSPaymentModalProps } from '../types';

export const POSPaymentModal: React.FC<POSPaymentModalProps> = ({
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
  isReturn = false,
  refundMethod,
  setRefundMethod,
}) => {
  const {
    customerSelectRef,
    paidInputRef,
    creditValidation,
    isConfirmDisabled,
    handleConfirm,
    handleSelectPaymentMethod,
    handleSelectRefundMethod,
    refundMethod: activeRefundMethod,
    changeDue,
    isPaidSufficient,
  } = usePOSPaymentModal({
    isOpen,
    total,
    paymentMethod,
    setPaymentMethod,
    paidAmount,
    setPaidAmount,
    selectedCustomer,
    customers,
    isPending,
    onConfirmPayment,
    isReturn,
    refundMethod,
    setRefundMethod,
  });

  usePaymentModalShortcuts({
    isOpen,
    total,
    paymentMethod,
    onSelectPaymentMethod: handleSelectPaymentMethod,
    onSetPaidAmount: setPaidAmount,
    onConfirm: handleConfirm,
    onClose,
    allowCardPayment,
    allowTransferPayment,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                isReturn ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'
              }`}
            >
              {isReturn ? <RotateCcw className="w-5 h-5" /> : '💰'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                {isReturn ? 'إتمام عملية استرجاع المبيعات (مرتجع)' : 'إتمام عملية الدفع'}
              </h3>
              <p className="text-[11px] text-on-surface-variant font-medium">
                {isReturn
                  ? 'تأكيد استرجاع البضاعة واختيار طريقة صرف المبلغ للزبون'
                  : 'تأكيد العملية، اختيار وسيلة السداد، وحساب الفكة'}
              </p>
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
          <SaleSummaryBreakdown total={total} formatMoney={formatMoney} />

          {/* RETURN MODE: Refund Destination Selector */}
          {isReturn ? (
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-3">
              <label className="text-xs font-bold text-on-surface block">
                طريقة استرجاع قيمة المرتجع:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectRefundMethod('cash')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeRefundMethod === 'cash'
                      ? 'bg-primary text-on-primary border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span>نقداً من الخزينة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRefundMethod('customer_credit')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeRefundMethod === 'customer_credit'
                      ? 'bg-primary text-on-primary border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  <UserCheck className="w-5 h-5" />
                  <span>قيد في حساب الزبون</span>
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-low text-[11px] text-on-surface-variant leading-relaxed">
                {activeRefundMethod === 'cash' ? (
                  <p>
                    <strong className="text-on-surface block mb-0.5">صرف نقدي من الصندوق:</strong>
                    سيتم تسجيل خروج المبلغ من مناوبة الصندوق الحالية، وتسليمه للزبون كاش{' '}
                    <span className="text-emerald-600 font-bold">دون المساس برصيد ديونه</span>.
                  </p>
                ) : (
                  <p>
                    <strong className="text-on-surface block mb-0.5">قيد كرصيد للزبون:</strong>
                    سيتم خصم المبلغ من دين الزبون أو قيده كرصيد دائن لصالحه في كشف الحساب،{' '}
                    <span className="text-amber-600 font-bold">ولا يخرج أي نقد من الصندوق</span>.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* NORMAL SALE: Payment Methods Tabs */
            <PaymentMethodSelector
              paymentMethod={paymentMethod}
              onSelectMethod={handleSelectPaymentMethod}
              allowCardPayment={allowCardPayment}
              allowTransferPayment={allowTransferPayment}
            />
          )}

          {/* Cash Denominations and Paid Input (Only for Normal Sale) */}
          {!isReturn && paymentMethod === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  المبلغ المدفوع من الزبون:
                </label>
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
                      if (!isPending) handleConfirm();
                    }
                  }}
                  placeholder={total.toString()}
                  className="w-full h-12 px-4 bg-surface-container border border-outline-variant/20 rounded-xl text-lg font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>

              {/* Quick Preset Buttons with Shortcut Badges */}
              <CashPresetsButtons total={total} onSelectAmount={setPaidAmount} />

              {/* Live Change Calculation Card */}
              <PaymentChangeDisplay
                changeAmount={changeDue}
                isPaidSufficient={isPaidSufficient}
                formatMoney={formatMoney}
              />
            </div>
          )}

          {/* Electronic Card Notice */}
          {!isReturn && paymentMethod === 'card' && (
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-on-surface">الدفع عبر البطاقة الذهبية / CIB</h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  تأكد من تمرير البطاقة في جهاز TPE وتأكيد العملية البنكية قبل النقر على تأكيد.
                </p>
              </div>
            </div>
          )}

          {/* Bank Transfer Notice */}
          {!isReturn && paymentMethod === 'transfer' && (
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-on-surface">الدفع عبر التحويل البنكي أو البريدي</h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  يرجى التأكد من استلام إشعار التحويل البنكي أو البريدي المطابق لرقم الفاتورة.
                </p>
              </div>
            </div>
          )}

          {/* Customer Selection for Credit / Debt (or Return Credit) */}
          {(paymentMethod === 'credit' || (isReturn && activeRefundMethod === 'customer_credit')) && (
            <POSCreditPaymentSection
              customerSelectRef={customerSelectRef}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              customers={customers as any}
              onOpenAddCustomer={onOpenAddCustomer}
              saleTotal={total}
              creditValidation={creditValidation}
              paidAmount={paidAmount}
              setPaidAmount={setPaidAmount}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-surface-container/50 border-t border-outline-variant/15 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
          >
            إلغاء (Esc)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`flex-2 py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer ${
              isReturn
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-primary hover:bg-primary/90 text-on-primary'
            }`}
          >
            {isPending
              ? 'جاري التسجيل...'
              : isReturn
              ? `تأكيد استرجاع المبلغ (${formatMoney(total)} دج)`
              : 'تأكيد ودفع (Enter)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSPaymentModal;
