import { db } from '@/infrastructure/database/dexie/db';
import type { Sale, CartItem } from '@/types';
import type { InvoiceLookupFilter } from '../types';

/**
 * استعلام فواتير الزبون من قاعدة البيانات مرتبة من الأحدث إلى الأقدم
 */
export async function fetchCustomerInvoices(
  customerId?: string,
  limit: number = 100
): Promise<Sale[]> {
  try {
    const all = await db.sales.orderBy('date').reverse().toArray();
    if (!customerId) {
      return all.slice(0, limit);
    }
    return all.filter((s) => s.customerId === customerId).slice(0, limit);
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    return [];
  }
}

/**
 * تصفية فواتير الزبون حسب نص البحث والتصنيف والتاريخ
 */
export function filterInvoices(
  sales: Sale[] = [],
  filter: InvoiceLookupFilter = {}
): Sale[] {
  if (!Array.isArray(sales)) return [];

  const { searchQuery = '', status = 'all', dateFrom, dateTo } = filter;
  const q = searchQuery.trim().toLowerCase();

  return sales.filter((sale) => {
    // 1. فلتر التصنيف والحالة
    if (status === 'unpaid') {
      const isUnpaid =
        sale.type !== 'return' &&
        (sale.status === 'unpaid' ||
          sale.status === 'partial' ||
          Number(sale.total) > (Number(sale.paidAmount) || 0));
      if (!isUnpaid) return false;
    } else if (status === 'paid') {
      const isPaid = sale.type !== 'return' && sale.status === 'paid';
      if (!isPaid) return false;
    } else if (status === 'return') {
      if (sale.type !== 'return') return false;
    }

    // 2. فلتر التاريخ
    if (dateFrom) {
      const saleDate = new Date(sale.date).toISOString().slice(0, 10);
      if (saleDate < dateFrom) return false;
    }
    if (dateTo) {
      const saleDate = new Date(sale.date).toISOString().slice(0, 10);
      if (saleDate > dateTo) return false;
    }

    // 3. فلتر البحث النصي
    if (q) {
      const matchesNumber = sale.number?.toLowerCase().includes(q);
      const matchesCustomer = sale.customerName?.toLowerCase().includes(q);
      const matchesCashier = sale.soldBy?.toLowerCase().includes(q);
      const matchesNote = sale.note?.toLowerCase().includes(q);
      const matchesItems = Array.isArray(sale.items) && sale.items.some(
        (it) => it.name?.toLowerCase().includes(q) || (it as any).barcode?.includes(q)
      );

      if (!matchesNumber && !matchesCustomer && !matchesCashier && !matchesNote && !matchesItems) {
        return false;
      }
    }

    return true;
  });
}

/**
 * استرجاع كامل بنود الفاتورة وشحنها إلى سلة نقطة البيع
 */
export function recallSaleItemsToCart(
  sale: Sale,
  cartActions: {
    clearCart: () => void;
    addItem: (item: CartItem) => void;
    setSelectedCustomer?: (id: string) => void;
    setDiscount?: (d: number) => void;
    setDiscountType?: (t: 'amount' | 'percentage') => void;
  }
): number {
  if (!sale || !Array.isArray(sale.items) || sale.items.length === 0) {
    return 0;
  }

  const { clearCart, addItem, setSelectedCustomer, setDiscount, setDiscountType } = cartActions;

  // 1. تفريغ السلة الحالية
  clearCart();

  // 2. شحن بنود الفاتورة
  for (const item of sale.items) {
    const cartItem: CartItem = {
      productId: item.productId,
      name: item.name,
      qty: Number(item.qty) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      lineTotal: Number(item.lineTotal) || (Number(item.qty) || 1) * (Number(item.unitPrice) || 0),
      unit: item.unit || 'قطعة',
      barcode: (item as any).barcode || '',
      isPack: item.isPack,
      packId: item.packId,
      packQty: item.packQty,
      packUnit: item.packUnit,
      customPrice: item.customPrice,
      priceTier: item.priceTier,
    };
    addItem(cartItem);
  }

  // 3. تعيين الزبون المختار إن وُجد
  if (sale.customerId && setSelectedCustomer) {
    setSelectedCustomer(sale.customerId);
  }

  // 4. تعيين الخصم إن وُجد
  if (sale.discount && setDiscount) {
    setDiscount(sale.discount);
    if (sale.discountType && setDiscountType) {
      setDiscountType(sale.discountType);
    }
  }

  return sale.items.length;
}

/**
 * تجهيز بنود الإرجاع الكامل للفاتورة (100% Full Return)
 */
export function prepareFullInvoiceReturnItems(
  sale: Sale,
  alreadyReturnedMap: Map<string, number> = new Map()
): CartItem[] {
  if (!sale || !Array.isArray(sale.items)) return [];

  const returnItems: CartItem[] = [];

  for (const item of sale.items) {
    const alreadyReturned = alreadyReturnedMap.get(item.productId) || 0;
    const originalQty = Number(item.qty) || 1;
    const maxReturnableQty = Math.max(0, originalQty - alreadyReturned);

    if (maxReturnableQty > 0) {
      returnItems.push({
        productId: item.productId,
        name: item.name,
        qty: maxReturnableQty,
        unitPrice: Number(item.unitPrice) || 0,
        lineTotal: maxReturnableQty * (Number(item.unitPrice) || 0),
        unit: item.unit || 'قطعة',
        barcode: (item as any).barcode,
        isPack: item.isPack,
        packId: item.packId,
        packQty: item.packQty,
        packUnit: item.packUnit,
      });
    }
  }

  return returnItems;
}
