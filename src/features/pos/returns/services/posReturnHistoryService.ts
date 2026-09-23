import { db } from '@/infrastructure/database/dexie/db';
import type { Sale } from '@/types';

/**
 * جلب أحدث الفواتير المسجلة في النظام لاستعراضها في نافذة المرتجعات
 */
export async function fetchRecentSalesForReturn(limit: number = 50): Promise<Sale[]> {
  try {
    const all = await db.sales.toArray();
    return all.slice(-limit).reverse();
  } catch (error) {
    console.error('Error fetching recent sales for return:', error);
    return [];
  }
}

/**
 * جلب كافة فواتير المرتجع المسجلة مسبقاً والمرتبطة بفاتورة معينة
 */
export async function fetchPreviousReturnsForSale(
  saleId: string,
  saleNumber?: string
): Promise<Sale[]> {
  if (!saleId) return [];

  try {
    const all = await db.sales.toArray();
    return all.filter((s) => {
      const isLinkedById = s.originalSaleId === saleId;
      const isLinkedByNote = saleNumber ? Boolean(s.note?.includes(`مرتجع للفاتورة #${saleNumber}`)) : false;
      return isLinkedById || isLinkedByNote;
    });
  } catch (error) {
    console.error('Error fetching previous returns for sale:', error);
    return [];
  }
}
