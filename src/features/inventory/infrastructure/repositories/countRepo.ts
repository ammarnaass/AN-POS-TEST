import { db } from '@/infrastructure/database/dexie/db';
import { v4 as uuid } from 'uuid';
import type { InventoryCountEntity, InventoryCountLineEntity } from '@/infrastructure/database/dexie/db';

export interface CountWithLines extends InventoryCountEntity {
  lines: InventoryCountLineEntity[];
}

export interface VarianceRow {
  itemId: string;
  itemName: string;
  itemSku?: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
}

export const countRepo = {
  async nextCountNumber(): Promise<string> {
    const count = await db.inventory_counts.count();
    return `IC-${String(count + 1).padStart(5, '0')}`;
  },

  async all(): Promise<InventoryCountEntity[]> {
    const counts = await db.inventory_counts.toArray();
    return counts.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getWithLines(id: string): Promise<CountWithLines | undefined> {
    const count = await db.inventory_counts.get(id);
    if (!count) return undefined;
    const lines = await db.inventory_count_lines.where('countId').equals(id).toArray();
    return { ...count, lines: lines.sort((a, b) => a.lineNumber - b.lineNumber) };
  },

  async create(input: { warehouseId: string; createdBy?: string }): Promise<InventoryCountEntity> {
    const countNumber = await this.nextCountNumber();
    const now = new Date().toISOString();
    const count: InventoryCountEntity = {
      id: uuid(),
      countNumber,
      date: now.slice(0, 10),
      warehouseId: input.warehouseId,
      status: 'pending',
      isClosed: false,
      createdBy: input.createdBy,
      createdAt: now,
    };
    await db.inventory_counts.add(count);

    // تعبئة المنتجات بالرصيد المتوقع
    const products = await db.products.toArray();
    const lines: InventoryCountLineEntity[] = products.map((p, i) => ({
      id: uuid(),
      countId: count.id,
      itemId: p.id,
      expectedQty: p.quantity,
      actualQty: p.quantity,
      variance: 0,
      lineNumber: i + 1,
    }));
    if (lines.length > 0) {
      await db.inventory_count_lines.bulkAdd(lines);
    }

    return count;
  },

  async updateLineActualQty(countId: string, itemId: string, actualQty: number): Promise<void> {
    const lines = await db.inventory_count_lines.where('countId').equals(countId).toArray();
    const line = lines.find(l => l.itemId === itemId);
    if (!line) return;
    await db.inventory_count_lines.update(line.id, {
      actualQty,
      variance: actualQty - line.expectedQty,
    });

    // تحديث حالة الجرد
    await db.inventory_counts.update(countId, { status: 'in_progress' });
  },

  async close(countId: string, userId?: string): Promise<void> {
    const count = await db.inventory_counts.get(countId);
    if (!count) return;

    const lines = await db.inventory_count_lines.where('countId').equals(countId).toArray();

    await db.transaction('rw', db.inventory_counts, db.inventory_count_lines, db.products, db.stock_movements_v2, async () => {
      // تسجيل حركات تعديل لكل فرق
      for (const l of lines) {
        if (l.variance !== 0) {
          await db.products.update(l.itemId, { quantity: l.actualQty, updatedAt: new Date().toISOString() });
          await db.stock_movements_v2.add({
            id: uuid(),
            movementNumber: `COUNT-${count.countNumber}`,
            date: count.date,
            type: 'count',
            warehouseId: count.warehouseId,
            itemId: l.itemId,
            quantity: l.actualQty,
            unitPrice: 0,
            totalAmount: 0,
            reference: count.countNumber,
            description: `تعديل جرد: ${l.variance > 0 ? '+' : ''}${l.variance}`,
            isReviewed: true,
            createdBy: userId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      await db.inventory_counts.update(countId, {
        isClosed: true,
        status: 'completed',
        closedBy: userId,
        closedAt: new Date().toISOString(),
      });
    });
  },

  async getVariance(countId: string): Promise<VarianceRow[]> {
    const lines = await db.inventory_count_lines.where('countId').equals(countId).toArray();
    const products = await db.products.toArray();
    const productMap = new Map(products.map(p => [p.id, p]));

    return lines
      .filter(l => l.variance !== 0)
      .map(l => {
        const p = productMap.get(l.itemId);
        return {
          itemId: l.itemId,
          itemName: p?.name ?? l.itemId,
          itemSku: p?.sku,
          expectedQty: l.expectedQty,
          actualQty: l.actualQty,
          variance: l.variance,
        };
      });
  },
};
