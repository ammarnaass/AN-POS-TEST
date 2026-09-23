import type { CartItem, CartSummary } from '../types';

/**
 * خدمة الحسابات والتحقق النقية لنظام السلة
 */

/**
 * حساب إجمالي عدد القطع والوحدات في السلة
 */
export function calculateCartUnitsCount(cart: CartItem[]): number {
  if (!Array.isArray(cart)) return 0;
  return cart.reduce((sum, item) => sum + (Number(item?.qty) || 0), 0);
}

/**
 * حساب عدد البنود المختلفة في السلة
 */
export function calculateCartItemsCount(cart: CartItem[]): number {
  if (!Array.isArray(cart)) return 0;
  return cart.length;
}

/**
 * حساب المجموع الفرعي للسلة قبل الخصم
 */
export function calculateCartSubtotal(cart: CartItem[]): number {
  if (!Array.isArray(cart)) return 0;
  return cart.reduce((sum, item) => {
    const lineTotal =
      typeof item.lineTotal === 'number'
        ? item.lineTotal
        : (item.unitPrice || 0) * (item.qty || 0);
    return sum + lineTotal;
  }, 0);
}

/**
 * حساب تفاصيل المجاميع، الخصم، والضريبة للسلة
 */
export function calculateCartTotals(
  cart: CartItem[],
  discount: number = 0,
  discountType: 'percent' | 'amount' = 'percent',
  tvaRate: number = 0
): CartSummary {
  const itemsCount = calculateCartItemsCount(cart);
  const unitsCount = calculateCartUnitsCount(cart);
  const subtotal = calculateCartSubtotal(cart);

  const safeDiscount = Math.max(0, discount || 0);
  const discountAmount =
    discountType === 'percent'
      ? Math.min(subtotal, (subtotal * safeDiscount) / 100)
      : Math.min(subtotal, safeDiscount);

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tvaAmount = tvaRate > 0 ? (discountedSubtotal * tvaRate) / 100 : 0;
  const total = Math.max(0, discountedSubtotal + tvaAmount);

  return {
    itemsCount,
    unitsCount,
    subtotal,
    discountAmount,
    tvaAmount,
    total,
  };
}

/**
 * التحقق من كفاية المخزون لمنتج قبل الإضافة أو زيادة الكمية
 */
export function validateStockAvailability(
  product: any,
  currentCartQty: number,
  targetQtyToAdd: number,
  allowNegativeStock: boolean
): { allowed: boolean; availableQty: number; message?: string } {
  if (allowNegativeStock) {
    return { allowed: true, availableQty: Number(product?.quantity ?? 0) };
  }

  const availableQty = Number(product?.quantity ?? 0);
  const requestedTotal = currentCartQty + targetQtyToAdd;

  if (availableQty <= 0 || requestedTotal > availableQty) {
    return {
      allowed: false,
      availableQty,
      message: `المخزون غير كافٍ! المتاح من "${product?.name || 'المنتج'}": ${availableQty} قطعة.`,
    };
  }

  return { allowed: true, availableQty };
}

/**
 * البحث عن صنف مطابق في السلة مع مراعاة السعر المخصص
 */
export function findMatchingCartItem(
  cart: CartItem[],
  productId: string,
  customPrice?: number
): CartItem | undefined {
  const targetId = String(productId);
  return cart.find((item) => {
    if (String(item.productId) !== targetId) return false;
    if (customPrice !== undefined) {
      return Math.abs((item.unitPrice || 0) - customPrice) < 0.001;
    }
    return true;
  });
}
