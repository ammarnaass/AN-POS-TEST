import type { Sale, CartItem } from '@/types';
import type { ReturnItemSelection, ReturnFinancialSummary } from '../types';

/**
 * حساب تراكمي للكميات المرتجعة سابقاً لكل منتج من فواتير المرتجعات السابقة
 */
export function buildAlreadyReturnedMap(previousReturns: Sale[] = []): Map<string, number> {
  const map = new Map<string, number>();
  if (!Array.isArray(previousReturns)) return map;

  for (const retSale of previousReturns) {
    if (Array.isArray(retSale.items)) {
      for (const item of retSale.items) {
        if (!item?.productId) continue;
        const prev = map.get(item.productId) || 0;
        map.set(item.productId, prev + (Number(item.qty) || 0));
      }
    }
  }

  return map;
}

/**
 * تجهيز قائمة البنود القابلة للإرجاع للفاتورة مع احتساب المرتجع سابقاً والحد الأقصى
 * يتم تعيين كمية الإرجاع المختارة تلقائياً لكامل العدد الحقيقي المتبقي القابل للإرجاع (maxReturnableQty)
 */
export function computeReturnableItems(
  sale: Sale | null,
  alreadyReturnedMap: Map<string, number>,
  defaultToFullQty: boolean = true
): ReturnItemSelection[] {
  if (!sale || !Array.isArray(sale.items)) return [];

  return sale.items.map((item) => {
    const alreadyReturnedQty = alreadyReturnedMap.get(item.productId) || 0;
    const originalQty = Number(item.qty) || 1;
    const maxReturnableQty = Math.max(0, originalQty - alreadyReturnedQty);
    const initialSelectedQty = maxReturnableQty > 0
      ? (defaultToFullQty ? maxReturnableQty : 1)
      : 0;

    return {
      productId: item.productId,
      name: item.name,
      unitPrice: Number(item.unitPrice) || 0,
      originalQty,
      alreadyReturnedQty,
      maxReturnableQty,
      selectedQty: initialSelectedQty,
      isSelected: maxReturnableQty > 0,
      unit: item.unit,
      barcode: (item as any).barcode || '',
      isPack: item.isPack,
      packId: item.packId,
      packQty: item.packQty,
      packUnit: item.packUnit,
    };
  });
}

/**
 * تقييد كمية الإرجاع المختارة بين 1 والحد الأقصى المتاح للإرجاع
 */
export function clampReturnQty(newQty: number, maxReturnableQty: number): number {
  if (maxReturnableQty <= 0) return 0;
  const parsed = Number(newQty);
  if (isNaN(parsed) || parsed < 1) return 1;
  return Math.min(maxReturnableQty, Math.floor(parsed));
}

/**
 * حساب الملخص المالي والكمي للعناصر المحددة للإرجاع
 */
export function calculateReturnSummary(items: ReturnItemSelection[] = []): ReturnFinancialSummary {
  if (!Array.isArray(items)) {
    return { totalAmount: 0, totalPieces: 0, selectedItemsCount: 0 };
  }

  const selectedItems = items.filter((i) => i.isSelected && i.selectedQty > 0);
  const totalAmount = selectedItems.reduce(
    (sum, i) => sum + i.selectedQty * i.unitPrice,
    0
  );
  const totalPieces = selectedItems.reduce((sum, i) => sum + i.selectedQty, 0);

  return {
    totalAmount,
    totalPieces,
    selectedItemsCount: selectedItems.length,
  };
}

/**
 * تحويل بنود المرتجع المحددة إلى كائنات بنود سلة جاهزة للمعالجة
 */
export function prepareCartItemsFromReturn(selectedItems: ReturnItemSelection[] = []): CartItem[] {
  if (!Array.isArray(selectedItems)) return [];

  return selectedItems
    .filter((i) => i.isSelected && i.selectedQty > 0)
    .map((i) => ({
      productId: i.productId,
      name: i.name,
      qty: i.selectedQty,
      unitPrice: i.unitPrice,
      lineTotal: i.selectedQty * i.unitPrice,
      unit: i.unit || 'قطعة',
      barcode: i.barcode,
      isPack: i.isPack,
      packId: i.packId,
      packQty: i.packQty,
      packUnit: i.packUnit,
    }));
}

/**
 * تصفية الفواتير بحسب رقم الفاتورة أو اسم الزبون أو البائع
 */
export function filterSalesForReturn(sales: Sale[] = [], query: string = ''): Sale[] {
  if (!Array.isArray(sales)) return [];
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return sales;

  return sales.filter((s) => {
    return (
      s.number?.toLowerCase().includes(trimmed) ||
      s.customerName?.toLowerCase().includes(trimmed) ||
      s.soldBy?.toLowerCase().includes(trimmed)
    );
  });
}

/**
 * استخلاص السبب الفعلي للإرجاع مع دعم السبب اليدوي المخصص
 */
export function resolveEffectiveReason(returnReason: string, customReason: string = ''): string {
  if (returnReason === 'أخرى' && customReason.trim()) {
    return customReason.trim();
  }
  return returnReason;
}
