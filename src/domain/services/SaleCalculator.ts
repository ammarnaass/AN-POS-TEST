export function calculateSaleTotal(
  cart: { qty: number; unitPrice: number; lineTotal: number }[],
  discount: number,
  discountType: 'percent' | 'amount',
  tvaRate: number
) {
  const rawSubtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const safeSubtotal = Math.max(0, rawSubtotal);
  const safeDiscount = Math.max(0, discount);

  const discountAmount = discountType === 'percent'
    ? (safeSubtotal * Math.min(100, safeDiscount)) / 100
    : Math.min(safeDiscount, safeSubtotal);
  const afterDiscount = Math.max(0, safeSubtotal - discountAmount);
  const tvaAmount = afterDiscount * (tvaRate / 100);
  const total = afterDiscount + tvaAmount;

  const roundMoney = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

  return {
    subtotal: roundMoney(safeSubtotal),
    discountAmount: roundMoney(discountAmount),
    tvaAmount: roundMoney(tvaAmount),
    total: roundMoney(total),
  };
}

export function applyWholesalePrice(
  product: { wholesalePrice: number; wholesaleMinQty: number; retailPrice: number },
  qty: number
): number {
  if (qty >= product.wholesaleMinQty) return product.wholesalePrice;
  return product.retailPrice;
}

export function applyPromotionPrice(
  product: { id: string; retailPrice: number },
  promotions: { type: 'percentage' | 'fixed'; value: number; productIds: string[]; status: string; startDate: string; endDate: string }[]
): number | null {
  const now = new Date();
  const active = promotions.find(p =>
    p.status === 'active' &&
    p.productIds.includes(product.id) &&
    new Date(p.startDate) <= now &&
    new Date(p.endDate) >= now
  );
  if (!active) return null;
  if (active.type === 'percentage') return product.retailPrice * (1 - active.value / 100);
  return Math.max(0, product.retailPrice - active.value);
}
