import type { Product } from '@/types';
import type { PackItemSelection, PackCalculations } from '../types';

/**
 * حساب التكاليف وهوامش الربح ونسبة توفير العميل للعبوة
 */
export function calculatePackFinancials(
  items: PackItemSelection[],
  packPriceInput: number | string,
  productsList: Product[] = []
): PackCalculations {
  let totalCost = 0;
  let totalRetail = 0;

  for (const it of items) {
    const prod = productsList.find((p) => p.id === it.productId);
    const cost = it.costPrice ?? prod?.costPrice ?? 0;
    const retail = it.retailPrice ?? prod?.retailPrice ?? 0;
    const qty = Math.max(0, it.qty || 0);

    totalCost += cost * qty;
    totalRetail += retail * qty;
  }

  const priceNum = typeof packPriceInput === 'string' ? parseFloat(packPriceInput) || 0 : packPriceInput || 0;
  const margin = priceNum > 0 ? ((priceNum - totalCost) / priceNum) * 100 : 0;
  const savings = totalRetail > priceNum ? totalRetail - priceNum : 0;
  const savingsPercent = totalRetail > 0 && savings > 0 ? (savings / totalRetail) * 100 : 0;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    totalRetail: Math.round(totalRetail * 100) / 100,
    margin: Math.round(margin * 10) / 10,
    savings: Math.round(savings * 100) / 100,
    savingsPercent: Math.round(savingsPercent * 10) / 10,
  };
}

/**
 * حساب جاهزية التجميع اللحظية للعبوة/الحزمة بناءً على الأرصدة الحالية في المخزون
 */
export function calculatePackStockReadiness(
  rawItems: any[] | string | undefined,
  productsList: Product[] = []
): {
  availablePacks: number;
  maxPacksPossible: number;
  bottleneckProductName?: string;
  bottleneckProduct?: Product | null;
  status: 'ready' | 'low' | 'out_of_stock';
} {
  let items: any[] = [];
  if (typeof rawItems === 'string') {
    try {
      items = JSON.parse(rawItems);
    } catch {
      items = [];
    }
  } else if (Array.isArray(rawItems)) {
    items = rawItems;
  }

  if (items.length === 0) {
    return {
      availablePacks: 0,
      maxPacksPossible: 0,
      status: 'out_of_stock',
      bottleneckProduct: null,
    };
  }

  let minAvailable = Infinity;
  let bottleneckName: string | undefined = undefined;
  let bottleneckProd: Product | null = null;

  for (const it of items) {
    const prod = productsList.find((p) => p.id === it.productId);
    const stock = Number(prod?.quantity ?? 0);
    const needed = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
    const possible = Math.floor(stock / needed);

    if (possible < minAvailable) {
      minAvailable = possible;
      bottleneckName = prod?.name || it.name;
      bottleneckProd = prod || null;
    }
  }

  if (minAvailable === Infinity || minAvailable < 0) minAvailable = 0;

  const status: 'ready' | 'low' | 'out_of_stock' =
    minAvailable > 5 ? 'ready' : minAvailable > 0 ? 'low' : 'out_of_stock';

  return {
    availablePacks: minAvailable,
    maxPacksPossible: minAvailable,
    bottleneckProductName: bottleneckName,
    bottleneckProduct: bottleneckProd,
    status,
  };
}

/**
 * تنسيق المبالغ المالية وفق التنسيق الجزائري
 */
export function formatPackMoney(val: number | undefined | null): string {
  return Number(val || 0).toLocaleString('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
