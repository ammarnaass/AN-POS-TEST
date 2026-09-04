import { db, type SaleEntity, type SaleItemEntity } from '../dexie/db';
import { normalizeInvoicePrefix } from '@/utils';

export const SaleRepository = {
  async getAll(): Promise<SaleEntity[]> {
    return db.sales.orderBy('date').reverse().toArray();
  },

  async getById(id: string): Promise<SaleEntity | undefined> {
    return db.sales.get(id);
  },

  async getItems(saleId: string): Promise<SaleItemEntity[]> {
    return db.sale_items.where('saleId').equals(saleId).toArray();
  },

  async create(sale: SaleEntity, items: SaleItemEntity[]): Promise<string> {
    await db.transaction('rw', db.sales, db.sale_items, async () => {
      await db.sales.add(sale);
      await db.sale_items.bulkAdd(items);
    });
    return sale.id;
  },

  async updateStatus(id: string, status: SaleEntity['status']): Promise<void> {
    await db.sales.update(id, { status, updatedAt: new Date().toISOString() });
  },

  async getNextNumber(prefix: string): Promise<string> {
    const cleanPrefix = normalizeInvoicePrefix(prefix);
    const pattern = new RegExp(`^${cleanPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-*(\\d+)$`);
    // فحص أحدث 20 فاتورة فقط مباشرة عبر الفهرس بدلاً من تحميل كامل فواتير المتجر
    const recent = await db.sales.orderBy('date').reverse().limit(20).toArray();
    const nums = (recent as SaleEntity[])
      .map((s) => s.number?.match(pattern)?.[1])
      .filter((n): n is string => Boolean(n))
      .map((n) => parseInt(n, 10))
      .filter((n) => !isNaN(n));
    let max = nums.length > 0 ? Math.max(...nums) : 0;

    if (max === 0) {
      // احتياط: إن لم تكن موجودة في آخر 20
      const electron = (window as any).electronAPI;
      if (electron?.sales?.list) {
        const res = await electron.sales.list({ limit: 1, search: cleanPrefix });
        const lastNum = res?.data?.[0]?.number;
        const matched = lastNum ? String(lastNum).match(pattern)?.[1] : null;
        if (matched) max = parseInt(matched, 10);
      }
    }
    return `${cleanPrefix}-${String(max + 1).padStart(6, '0')}`;
  },

  async getRecent(limit = 50): Promise<SaleEntity[]> {
    return db.sales.orderBy('date').reverse().limit(limit).toArray();
  },
};
