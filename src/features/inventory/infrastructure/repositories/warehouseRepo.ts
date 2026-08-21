import { db } from '@/infrastructure/database/dexie/db';
import { v4 as uuid } from 'uuid';
import type { WarehouseEntity, WarehouseType } from '@/infrastructure/database/dexie/db';

export interface CreateWarehouseInput {
  name: string;
  location?: string;
  type: WarehouseType;
  capacity?: number;
  temperature?: number;
  humidity?: number;
  parentId?: string;
  createdBy?: string;
}

export const warehouseRepo = {
  async all(): Promise<WarehouseEntity[]> {
    return db.warehouses.toArray();
  },

  async get(id: string): Promise<WarehouseEntity | undefined> {
    return db.warehouses.get(id);
  },

  async create(input: CreateWarehouseInput): Promise<WarehouseEntity> {
    const now = new Date().toISOString();
    const warehouse: WarehouseEntity = {
      id: uuid(),
      name: input.name,
      location: input.location,
      type: input.type,
      capacity: input.capacity,
      temperature: input.temperature,
      humidity: input.humidity,
      isActive: true,
      parentId: input.parentId,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    await db.warehouses.add(warehouse);
    return warehouse;
  },

  async update(id: string, patch: Partial<WarehouseEntity>): Promise<void> {
    const existing = await db.warehouses.get(id);
    if (!existing) return;
    await db.warehouses.put({ ...existing, ...patch, updatedAt: new Date().toISOString() });
  },

  // BR-INV-004: لا يمكن حذف مستودع له حركات مخزون
  async remove(id: string): Promise<void> {
    const hasChildren = await db.warehouses.where('parentId').equals(id).count();
    if (hasChildren > 0) {
      throw new Error('لا يمكن حذف مستودع له مستودعات فرعية');
    }
    const hasMovements = await db.stock_movements_v2.where('warehouseId').equals(id).count();
    if (hasMovements > 0) {
      throw new Error('لا يمكن حذف مستودع له حركات مخزون');
    }
    await db.warehouses.delete(id);
  },
};
