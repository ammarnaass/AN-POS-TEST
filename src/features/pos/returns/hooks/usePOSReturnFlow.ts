import { useCallback } from 'react';
import type { Sale } from '@/types';
import type { UsePOSReturnFlowProps, ReturnConfirmationParams } from '../types';

export function usePOSReturnFlow({
  isSessionOpen,
  completeSale,
  currentSession,
  settingsOrDefault,
  products,
  packs,
  customers,
  clearCart,
  addItem,
  setReturnMode,
  setReturnContext,
  setSelectedCustomer,
  modals,
  addNotification,
}: UsePOSReturnFlowProps) {
  const handleSelectReturnSale = useCallback(
    (sale: Sale) => {
      modals.setSelectedSaleForReturn?.(sale);
      modals.setShowReturnSaleModal?.(false);
      modals.setShowPartialReturnModal?.(true);
    },
    [modals]
  );

  const handleConfirmPartialReturn = useCallback(
    async ({
      returnItems,
      originalSale,
      reason,
      refundMethod,
    }: ReturnConfirmationParams) => {
      if (!isSessionOpen) {
        modals.setShowSessionWarning?.(true);
        return;
      }

      await completeSale({
        cart: returnItems,
        discount: 0,
        discountType: 'amount',
        selectedCustomer: originalSale.customerId || '',
        paymentMethod: refundMethod === 'cash' ? 'cash' : 'credit',
        isReturn: true,
        currentSession,
        settings: settingsOrDefault,
        products: products as any[],
        packs: packs as any[],
        customers: customers as any[],
        originalSaleId: originalSale.id,
        originalSaleNumber: originalSale.number,
        returnReason: reason,
        refundMethod,
      });
    },
    [
      isSessionOpen,
      completeSale,
      currentSession,
      settingsOrDefault,
      products,
      packs,
      customers,
      modals,
    ]
  );

  const handleLoadReturnToCart = useCallback(
    ({ returnItems, originalSale, reason, refundMethod }: ReturnConfirmationParams) => {
      clearCart();
      for (const item of returnItems) {
        addItem(item);
      }
      setReturnMode(true);
      if (setReturnContext) {
        setReturnContext({
          originalSaleId: originalSale.id,
          originalSaleNumber: originalSale.number,
          reason,
          refundMethod,
        });
      }
      if (originalSale.customerId) {
        setSelectedCustomer(originalSale.customerId);
      }
      addNotification({
        title: 'وضع الإرجاع مفعّل',
        message: `تم استيراد ${returnItems.length} صنف/أصناف من الفاتورة #${originalSale.number} إلى السلة`,
        type: 'warning',
      });
    },
    [clearCart, addItem, setReturnMode, setReturnContext, setSelectedCustomer, addNotification]
  );

  return {
    handleSelectReturnSale,
    handleConfirmPartialReturn,
    handleLoadReturnToCart,
  };
}
