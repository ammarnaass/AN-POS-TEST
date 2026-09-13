/**
 * حساب الفكة (الباقي للمشتري)
 */
export function calculateChangeDue(cashTendered: number, total: number): number {
  return Math.max(0, (cashTendered || 0) - (total || 0));
}

/**
 * حساب الفئة النقدية التالية عند النقر على أزرار الفئات السريعة (+200, +500, +1000, +2000)
 */
export function calculateNextDenomination(
  cashTendered: number,
  step: number,
  total: number
): number {
  if (total <= 0) return 0;
  const base = cashTendered > 0 ? cashTendered : total;
  const rounded = Math.ceil(base / step) * step;
  return rounded === base ? base + step : rounded;
}

/**
 * حساب إجمالي عدد القطع في السلة
 */
export function calculateTotalPieces(items: Array<{ qty?: number }>): number {
  return items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
}
