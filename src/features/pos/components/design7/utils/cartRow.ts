import type { CartItem } from '@/types';

/**
 * Returns a guaranteed unique row key for any cart item in Design 7.
 * Prevents multiple row selection when items have undefined, missing, or identical productIds.
 */
export const getCartRowKey = (item: CartItem | null | undefined, index: number): string => {
  if (!item) return `row_${index}`;
  const explicitKey = (item as any).cartItemId || (item as any).rowId;
  if (explicitKey) return String(explicitKey);
  const baseId = item.productId || (item as any).id || 'item';
  return `${baseId}_${index}`;
};
