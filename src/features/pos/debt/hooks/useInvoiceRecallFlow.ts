import { useCallback } from 'react';
import type { Sale, CartItem } from '@/types';
import { useNotificationStore } from '@/store/notificationStore';
import { recallSaleItemsToCart } from '../services/posInvoiceLookupService';

export interface UseInvoiceRecallFlowProps {
  clearCart?: () => void;
  addItem?: (item: CartItem) => void;
  setSelectedCustomer?: (id: string) => void;
  setDiscount?: (d: number) => void;
  setDiscountType?: (t: 'amount' | 'percentage') => void;
  onOpenReturnForSale?: (sale: Sale) => void;
}

export function useInvoiceRecallFlow({
  clearCart,
  addItem,
  setSelectedCustomer,
  setDiscount,
  setDiscountType,
  onOpenReturnForSale,
}: UseInvoiceRecallFlowProps = {}) {
  const { addNotification } = useNotificationStore();

  const handleRecallToCart = useCallback((sale: Sale) => {
    if (!clearCart || !addItem) {
      addNotification({
        title: 'تعذر استرجاع الفاتورة',
        message: 'متحكمات السلة غير متاحة حالياً',
        type: 'warning',
      });
      return;
    }

    const count = recallSaleItemsToCart(sale, {
      clearCart,
      addItem,
      setSelectedCustomer,
      setDiscount,
      setDiscountType,
    });

    addNotification({
      title: 'تم استرجاع الفاتورة إلى السلة',
      message: `تم شحن ${count} صنف من الفاتورة #${sale.number} بنجاح إلى السلة`,
      type: 'success',
    });
  }, [clearCart, addItem, setSelectedCustomer, setDiscount, setDiscountType, addNotification]);

  const handleFullReturn = useCallback((sale: Sale) => {
    if (onOpenReturnForSale) {
      onOpenReturnForSale(sale);
    }
  }, [onOpenReturnForSale]);

  return {
    handleRecallToCart,
    handleFullReturn,
  };
}
