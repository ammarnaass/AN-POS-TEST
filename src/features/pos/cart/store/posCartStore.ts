import { useCartStore } from '@/store/cartStore';
import { calculateCartUnitsCount } from '../services/posCartCalculationService';

export { useCartStore };

/**
 * محددات سريعة لحالة السلة (Selectors) لمنع إعادة الرندرة الزائدة
 */
export const useCartItems = () => useCartStore((s) => s.items);

export const useCartCount = () => useCartStore((s) => s.items.length);

export const useCartUnits = () =>
  useCartStore((s) => calculateCartUnitsCount(s.items));

export const useCartActions = () => {
  const addItem = useCartStore((s) => s.addItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const updatePrice = useCartStore((s) => s.updatePrice);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  return { addItem, updateQty, updatePrice, removeItem, clear };
};
