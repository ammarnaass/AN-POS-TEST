import { useMemo } from 'react';
import type { CartItem, CartSummary } from '../types';
import { calculateCartTotals } from '../services/posCartCalculationService';

export function usePOSCartSummary(
  cart: CartItem[],
  discount: number = 0,
  discountType: 'percent' | 'amount' = 'percent',
  tvaRate: number = 0
): CartSummary {
  return useMemo(() => {
    return calculateCartTotals(cart, discount, discountType, tvaRate);
  }, [cart, discount, discountType, tvaRate]);
}
