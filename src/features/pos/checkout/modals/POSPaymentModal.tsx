import React from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, ArrowLeftRight, RotateCcw, Banknote, UserCheck, Wallet } from 'lucide-react';
import { formatMoney } from '@/features/pos/utils/format';
import { POSCreditPaymentSection } from '@/features/pos/debt';
import { usePOSPaymentModal } from '../hooks/usePOSPaymentModal';
import { usePaymentModalShortcuts } from '../hooks/usePOSCheckoutShortcuts';
import { SaleSummaryBreakdown } from '../components/SaleSummaryBreakdown';
import { POSReturnGoodsConfirmation } from '../components/POSReturnGoodsConfirmation';
import { POSSalePaymentConfirmation } from '../components/POSSalePaymentConfirmation';
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
  cart = [],
  returnContext,
  returnReason: propReturnReason,
  setReturnReason: propSetReturnReason,
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
    returnReason,
    customReason,
    setReturnReason,
    setCustomReason,
    transactionReference,
    setTransactionReference,
    goodsCondition,
    setGoodsCondition,
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
    initialReturnReason: propReturnReason || returnContext?.reason,
    onReturnReasonChange: propSetReturnReason,
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

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-outline-variant/15 flex items-center justify-between shrink-0">
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
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Grand Total Dominant Banner */}
          <SaleSummaryBreakdown total={total} formatMoney={formatMoney} isReturn={isReturn} />

          {/* RETURN MODE: Goods Confirmation & Refund Method Selection */}
          {isReturn ? (
            <>
              <POSReturnGoodsConfirmation
                cart={cart}
                formatMoney={formatMoney}
                total={total}
                returnReason={returnReason}
                customReason={customReason}
                onChangeReason={setReturnReason}
                onChangeCustomReason={setCustomReason}
                refundMethod={activeRefundMethod}
                onChangeRefundMethod={handleSelectRefundMethod}
                goodsCondition={goodsCondition}
                onChangeGoodsCondition={setGoodsCondition}
                originalSaleNumber={returnContext?.originalSaleNumber}
                matchedCustomer={
                  selectedCustomer
                    ? customers.find((c) => c.id === selectedCustomer)
                    : null
                }
              />

              {activeRefundMethod === 'customer_credit' && (
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
                  isReturn={true}
                />
              )}
            </>
          ) : (
            /* NORMAL SALE: Robust Payment Confirmation Flow (تأكيد العملية، وسائل السداد، وحساب الفكة) */
            <POSSalePaymentConfirmation
              total={total}
              cart={cart}
              formatMoney={formatMoney}
              paymentMethod={paymentMethod}
              onSelectPaymentMethod={handleSelectPaymentMethod}
              paidAmount={paidAmount}
              setPaidAmount={setPaidAmount}
              paidInputRef={paidInputRef}
              changeDue={changeDue}
              isPaidSufficient={isPaidSufficient}
              allowCardPayment={allowCardPayment}
              allowTransferPayment={allowTransferPayment}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              customers={customers}
              onOpenAddCustomer={onOpenAddCustomer}
              transactionReference={transactionReference}
              setTransactionReference={setTransactionReference}
              onConfirm={handleConfirm}
              isPending={isPending}
              customerSelectRef={customerSelectRef}
              creditValidation={creditValidation}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-surface-container/50 border-t border-outline-variant/15 flex items-center gap-3 shrink-0">
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
              : isReturn && activeRefundMethod === 'customer_credit' && !selectedCustomer
              ? 'يرجى تحديد الزبون أولاً'
              : isReturn
              ? activeRefundMethod === 'customer_credit'
                ? `تأكيد استرجاع المبلغ (${formatMoney(total)} دج) في حساب الزبون`
                : `تأكيد استرجاع المبلغ (${formatMoney(total)} دج) نقداً من الصندوق`
              : 'تأكيد ودفع (Enter)'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default POSPaymentModal;
