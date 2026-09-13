import type { Product } from '@shared/types';
import type { MobilePackItem, PackMetrics } from '../types';

export function calculateMobilePackMetrics(
  selectedItems: MobilePackItem[],
  packPrice: string | number,
  products: Product[]
): PackMetrics {
  let totalCost = 0;
  let retailTotal = 0;
  let minAvailable = Infinity;

  for (const it of selectedItems) {
    const prod = products.find((p) => p.id === it.productId);
    const cost = Number(prod?.costPrice || (prod as any)?.cost_price || 0);
    const retail = Number(prod?.retailPrice || (prod as any)?.retail_price || 0);
    const currentStock = Number(prod?.quantity || (prod as any)?.qty || 0);

    totalCost += cost * it.qty;
    retailTotal += retail * it.qty;

    const possiblePacks = it.qty > 0 ? Math.floor(currentStock / it.qty) : 0;
    if (possiblePacks < minAvailable) {
      minAvailable = possiblePacks;
    }
  }

  if (minAvailable === Infinity) minAvailable = 0;

  const priceNum = typeof packPrice === 'string' ? parseFloat(packPrice) || 0 : packPrice || 0;
  const margin = priceNum > 0 ? ((priceNum - totalCost) / priceNum) * 100 : 0;
  const buyerSavings = retailTotal > 0 && priceNum > 0 ? retailTotal - priceNum : 0;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    retailTotal: Math.round(retailTotal * 100) / 100,
    availablePacks: minAvailable,
    margin: Math.round(margin * 10) / 10,
    buyerSavings: Math.round(buyerSavings * 100) / 100,
  };
}
