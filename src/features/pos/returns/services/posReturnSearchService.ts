import { db } from '@/infrastructure/database/dexie/db';
import type { Sale, CartItem } from '@/types';
import type {
  ReturnSearchFilters,
  ReturnSearchResultItem,
  ReturnDateRangeFilter,
} from '../types';
import { buildAlreadyReturnedMap } from './posReturnCalculationService';

/**
 * جلب فواتير البيع والمرتجعات السابقة من قاعدة البيانات لاستخدامها في البحث
 */
export async function fetchSalesCandidatesForReturn(): Promise<{
  sales: Sale[];
  returns: Sale[];
}> {
  try {
    const all = await db.sales.toArray();
    const sales: Sale[] = [];
    const returns: Sale[] = [];

    for (const s of all) {
      if (s.type === 'return') {
        returns.push(s);
      } else {
        sales.push(s);
      }
    }

    // ترتيب تنازلي حسب التاريخ (الأحدث أولاً)
    sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    returns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { sales, returns };
  } catch (error) {
    console.error('Error fetching sales candidates for return:', error);
    return { sales: [], returns: [] };
  }
}

/**
 * التحقق مما إذا كان تاريخ الفاتورة يقع ضمن النطاق الزمني المحدد
 */
export function isDateInRange(
  dateStr: string,
  dateRange: ReturnDateRangeFilter = 'all',
  customStart?: string,
  customEnd?: string,
  now: Date = new Date()
): boolean {
  if (dateRange === 'all') return true;

  const saleDate = new Date(dateStr);
  if (isNaN(saleDate.getTime())) return true;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (dateRange) {
    case 'today':
      return saleDate >= todayStart && saleDate <= todayEnd;

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return saleDate >= startOfDay(yesterday) && saleDate <= endOfDay(yesterday);
    }

    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return saleDate >= startOfDay(weekAgo) && saleDate <= todayEnd;
    }

    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return saleDate >= startOfDay(monthAgo) && saleDate <= todayEnd;
    }

    case 'custom': {
      if (!customStart && !customEnd) return true;
      const start = customStart ? startOfDay(new Date(customStart)) : new Date(0);
      const end = customEnd ? endOfDay(new Date(customEnd)) : new Date(8640000000000000);
      return saleDate >= start && saleDate <= end;
    }

    default:
      return true;
  }
}

/**
 * بناء خريطة للمرتجعات السابقة مفهرسة بمعرف الفاتورة الأصلية ورقمها
 */
export function buildReturnsByOriginalSaleMap(allReturns: Sale[] = []): Map<string, Sale[]> {
  const map = new Map<string, Sale[]>();

  for (const ret of allReturns) {
    const keys: string[] = [];
    if (ret.originalSaleId) keys.push(ret.originalSaleId);
    if (ret.note) {
      const match = ret.note.match(/مرتجع للفاتورة #([^\s]+)/);
      if (match && match[1]) {
        keys.push(match[1]);
      }
    }

    for (const k of keys) {
      const existing = map.get(k) || [];
      existing.push(ret);
      map.set(k, existing);
    }
  }

  return map;
}

/**
 * جلب المرتجعات السابقة المرتبطة بفاتورة معينة
 */
export function getPreviousReturnsForSale(
  sale: Sale,
  returnsMap: Map<string, Sale[]>
): Sale[] {
  const byId = returnsMap.get(sale.id) || [];
  const byNumber = sale.number ? returnsMap.get(sale.number) || [] : [];
  
  // دمج بدون تكرار
  const combined = new Map<string, Sale>();
  for (const r of [...byId, ...byNumber]) {
    combined.set(r.id, r);
  }
  return Array.from(combined.values());
}

/**
 * فلترة متقدمة وتجهيز نتائج البحث الغنية لفواتير المرتجع
 */
export function filterSalesForReturnAdvanced(
  sales: Sale[] = [],
  allReturns: Sale[] = [],
  filters: ReturnSearchFilters
): ReturnSearchResultItem[] {
  if (!Array.isArray(sales)) return [];

  const query = filters.query?.trim().toLowerCase() || '';
  const dateRange = filters.dateRange || 'all';
  const eligibilityStatus = filters.eligibilityStatus || 'all';
  const paymentMethod = filters.paymentMethod || 'all';
  const customerId = filters.customerId;
  const searchMode = filters.searchMode || 'all';

  const returnsMap = buildReturnsByOriginalSaleMap(allReturns);
  const results: ReturnSearchResultItem[] = [];

  for (const sale of sales) {
    // 1. استبعاد فواتير المرتجع من نتائج البيع الأصلية
    if (sale.type === 'return') continue;

    // 2. فلترة الزبون
    if (customerId && sale.customerId !== customerId) {
      continue;
    }

    // 3. فلترة طريقة الدفع
    if (paymentMethod !== 'all' && sale.paymentMethod !== paymentMethod) {
      continue;
    }

    // 4. فلترة التاريخ
    if (!isDateInRange(sale.date, dateRange, filters.customStartDate, filters.customEndDate)) {
      continue;
    }

    // 5. مطابقة نص البحث
    let isMatched = !query;
    const matchedItemNames: string[] = [];

    if (query) {
      const invoiceNumberMatch = sale.number?.toLowerCase().includes(query);
      const customerMatch = sale.customerName?.toLowerCase().includes(query);
      const cashierMatch = sale.soldBy?.toLowerCase().includes(query);

      // فحص البنود داخل الفاتورة (اسم المنتج أو الباركود)
      let itemMatch = false;
      if (Array.isArray(sale.items)) {
        for (const item of sale.items) {
          const itemName = item?.name?.toLowerCase() || '';
          const itemBarcode = (item as any)?.barcode?.toLowerCase() || '';
          if (itemName.includes(query) || (itemBarcode && itemBarcode.includes(query))) {
            itemMatch = true;
            matchedItemNames.push(item.name);
          }
        }
      }

      if (searchMode === 'invoice') {
        isMatched = Boolean(invoiceNumberMatch || customerMatch || cashierMatch);
      } else if (searchMode === 'product') {
        isMatched = itemMatch;
      } else {
        isMatched = Boolean(invoiceNumberMatch || customerMatch || cashierMatch || itemMatch);
      }
    }

    if (!isMatched) continue;

    // 6. احتساب المرتجعات السابقة والكميات المتبقية
    const priorReturns = getPreviousReturnsForSale(sale, returnsMap);
    const alreadyReturnedMap = buildAlreadyReturnedMap(priorReturns);

    let totalPieces = 0;
    let totalAlreadyReturnedPieces = 0;

    if (Array.isArray(sale.items)) {
      for (const item of sale.items) {
        const itemQty = Number(item.qty) || 0;
        totalPieces += itemQty;
        const itemReturned = alreadyReturnedMap.get(item.productId) || 0;
        totalAlreadyReturnedPieces += Math.min(itemQty, itemReturned);
      }
    }

    const remainingReturnablePieces = Math.max(0, totalPieces - totalAlreadyReturnedPieces);
    const isFullyReturned = totalPieces > 0 && remainingReturnablePieces === 0;
    const hasPriorReturns = priorReturns.length > 0;

    // 7. فلترة حالة الأهلية
    if (eligibilityStatus === 'refundable' && isFullyReturned) {
      continue;
    }
    if (eligibilityStatus === 'partially_returned' && (!hasPriorReturns || isFullyReturned)) {
      continue;
    }
    if (eligibilityStatus === 'fully_returned' && !isFullyReturned) {
      continue;
    }

    results.push({
      sale,
      alreadyReturnedCount: priorReturns.length,
      totalPieces,
      remainingReturnablePieces,
      isFullyReturned,
      hasPriorReturns,
      matchedItemNames: matchedItemNames.length > 0 ? matchedItemNames : undefined,
      priorReturns,
    });
  }

  return results;
}

/**
 * البحث الفوري عن فاتورة باستخدام قارئ الباركود (برقم الفاتورة أو الباركود المطبوع)
 */
export function findSaleByBarcode(barcodeOrNumber: string, sales: Sale[] = []): Sale | null {
  if (!barcodeOrNumber || !Array.isArray(sales)) return null;

  const cleaned = barcodeOrNumber.trim().toLowerCase().replace(/^#/, '');
  if (!cleaned) return null;

  for (const s of sales) {
    if (s.type === 'return') continue;

    const num = s.number?.trim().toLowerCase().replace(/^#/, '');
    const id = s.id?.trim().toLowerCase();
    const saleBarcode = (s as any).barcode?.trim().toLowerCase();

    if (num === cleaned || id === cleaned || saleBarcode === cleaned) {
      return s;
    }
  }

  return null;
}

/**
 * استخراج بنود الفاتورة بالكامل الصالحة للإرجاع كـ CartItems جاهزة لشحن السلة أو الإرجاع الفوري
 */
export function prepareFullReturnCartItems(
  sale: Sale,
  allReturns: Sale[] = []
): CartItem[] {
  if (!sale || !Array.isArray(sale.items)) return [];

  const returnsMap = buildReturnsByOriginalSaleMap(allReturns);
  const priorReturns = getPreviousReturnsForSale(sale, returnsMap);
  const alreadyReturnedMap = buildAlreadyReturnedMap(priorReturns);

  const cartItems: CartItem[] = [];

  for (const item of sale.items) {
    const originalQty = Number(item.qty) || 0;
    const returnedQty = alreadyReturnedMap.get(item.productId) || 0;
    const remainingQty = Math.max(0, originalQty - returnedQty);

    if (remainingQty > 0) {
      const unitPrice = Number(item.unitPrice) || 0;
      cartItems.push({
        productId: item.productId,
        name: item.name,
        qty: remainingQty,
        unitPrice,
        lineTotal: remainingQty * unitPrice,
        unit: item.unit || 'قطعة',
        barcode: (item as any).barcode,
        isPack: item.isPack,
        packId: item.packId,
        packQty: item.packQty,
        packUnit: item.packUnit,
      });
    }
  }

  return cartItems;
}
