export function calculateSaleTotal(
  cart: { qty: number; unitPrice: number; lineTotal: number }[],
  discount: number,
  discountType: 'percent' | 'amount',
  tvaRate: number
) {
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount = discountType === 'percent'
    ? subtotal * (discount / 100)
    : Math.min(discount, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const tvaAmount = afterDiscount * (tvaRate / 100);
  const total = afterDiscount + tvaAmount;
  return { subtotal, discountAmount, tvaAmount, total };
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
