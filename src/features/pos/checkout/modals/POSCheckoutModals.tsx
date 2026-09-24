import React from 'react';
import { POSPaymentModal } from './POSPaymentModal';
import { POSSaleSuccessModal } from './POSSaleSuccessModal';
import type { POSCheckoutModalsProps } from '../types';

export const POSCheckoutModals: React.FC<POSCheckoutModalsProps> = ({
  showPaymentModal,
  onClosePaymentModal,
  showSuccessModal,
  onCloseSuccessModal,
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
  isSalePending,
  completedSale,
  allowCardPayment = false,
  allowTransferPayment = false,
  isReturn = false,
  refundMethod,
  setRefundMethod,
  cart,
  returnContext,
  returnReason,
  setReturnReason,
}) => {
  return (
    <>
      <POSPaymentModal
        isOpen={showPaymentModal}
        onClose={onClosePaymentModal}
        total={total}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paidAmount={paidAmount}
        setPaidAmount={setPaidAmount}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        customers={customers}
        onOpenAddCustomer={onOpenAddCustomer}
        onConfirmPayment={onConfirmPayment}
        isPending={isSalePending}
        allowCardPayment={allowCardPayment}
        allowTransferPayment={allowTransferPayment}
        isReturn={isReturn}
        refundMethod={refundMethod}
        setRefundMethod={setRefundMethod}
        cart={cart}
        returnContext={returnContext}
        returnReason={returnReason}
        setReturnReason={setReturnReason}
      />

      <POSSaleSuccessModal
        isOpen={showSuccessModal}
        onClose={onCloseSuccessModal}
        completedSale={completedSale}
      />
    </>
  );
};

export default POSCheckoutModals;
