import { useCallback } from 'react';
import type { CartItem, Product, Customer, Sale, CashSession } from '@/types';

export interface UsePOSPageReturnFlowProps {
  isSessionOpen: boolean;
  completeSale: (params: any) => Promise<any>;
  currentSession: CashSession | null;
  settingsOrDefault: any;
  products: Product[];
  packs: any[];
  customers: Customer[];
  clearCart: () => void;
  addItem: (item: CartItem) => void;
  setReturnMode: (val: boolean) => void;
  setSelectedCustomer: (id: string) => void;
  modals: any;
  addNotification: (n: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }) => void;
}

export function usePOSPageReturnFlow({
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
  setSelectedCustomer,
  modals,
  addNotification,
}: UsePOSPageReturnFlowProps) {
  const handleSelectReturnSale = useCallback((sale: Sale) => {
    modals.setSelectedSaleForReturn(sale);
    modals.setShowReturnSaleModal(false);
    modals.setShowPartialReturnModal(true);
  }, [modals]);

  const handleConfirmPartialReturn = useCallback(async ({
    returnItems,
    originalSale,
    reason,
    refundMethod,
  }: {
    returnItems: CartItem[];
    originalSale: Sale;
    reason: string;
    refundMethod: 'cash' | 'customer_credit';
  }) => {
    if (!isSessionOpen) {
      modals.setShowSessionWarning(true);
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
  }, [
    isSessionOpen,
    completeSale,
    currentSession,
    settingsOrDefault,
    products,
    packs,
    customers,
    modals,
  ]);

  const handleLoadReturnToCart = useCallback(({
    returnItems,
    originalSale,
  }: {
    returnItems: CartItem[];
    originalSale: Sale;
    reason: string;
    refundMethod: 'cash' | 'customer_credit';
  }) => {
    clearCart();
    for (const item of returnItems) {
      addItem(item);
    }
    setReturnMode(true);
    if (originalSale.customerId) {
      setSelectedCustomer(originalSale.customerId);
    }
    addNotification({
      title: 'وضع الإرجاع مفعّل',
      message: `تم استيراد ${returnItems.length} صنف/أصناف من الفاتورة #${originalSale.number} إلى السلة`,
      type: 'warning',
    });
  }, [clearCart, addItem, setReturnMode, setSelectedCustomer, addNotification]);

  return {
    handleSelectReturnSale,
    handleConfirmPartialReturn,
    handleLoadReturnToCart,
  };
}
