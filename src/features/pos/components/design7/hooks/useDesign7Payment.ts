import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CartItem } from '@/types';

export interface UseDesign7PaymentProps {
  cart: CartItem[];
  onSettleSale: (paidAmount?: number) => void;
}

export function useDesign7Payment({
  cart,
  onSettleSale,
}: UseDesign7PaymentProps) {
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // تصفير المبلغ المدفوع تلقائياً عند خلو السلة (إتمام الفاتورة، تفريغها أو بدء بيع جديد)
  useEffect(() => {
    if (cart.length === 0) {
      setPaidAmount(0);
    }
  }, [cart.length]);

  // Cart summary calculations for accounting sidebar
  const itemCount = cart.length;
  const totalQuantity = useMemo(() => {
    return cart.reduce((sum, item) => {
      const q = item.qty ?? (item as any).quantity ?? 1;
      return sum + q;
    }, 0);
  }, [cart]);

  const handleConfirm = useCallback(() => {
    if (cart.length > 0) {
      onSettleSale(paidAmount);
    }
  }, [cart.length, onSettleSale, paidAmount]);

  const handleSettle = useCallback(
    (customAmount?: number) => {
      onSettleSale(customAmount ?? paidAmount);
    },
    [onSettleSale, paidAmount]
  );

  return {
    paidAmount,
    setPaidAmount,
    itemCount,
    totalQuantity,
    handleConfirm,
    handleSettle,
  };
}
