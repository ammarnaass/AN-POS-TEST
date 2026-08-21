import { db } from '@/infrastructure/database/dexie/db';
import { v4 as uuid } from 'uuid';
import type { StockMovementV2Entity, StockMovementLineEntity, MovementType } from '@/infrastructure/database/dexie/db';

export interface MovementWithLines extends StockMovementV2Entity {
  lines: StockMovementLineEntity[];
}

export interface MovementFilters {
  warehouseId?: string;
  type?: MovementType;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CreateMovementInput {
  date: string;
  type: MovementType;
  warehouseId: string;
  lines: { itemId: string; quantity: number; unitPrice: number }[];
  reference?: string;
  description?: string;
  createdBy?: string;
}

export const movementRepo = {
  async nextMovementNumber(): Promise<string> {
    const count = await db.stock_movements_v2.count();
    return `SM-${String(count + 1).padStart(5, '0')}`;
  },

  async all(filters?: MovementFilters): Promise<StockMovementV2Entity[]> {
    let movements = await db.stock_movements_v2.toArray();

    if (filters) {
      if (filters.warehouseId) movements = movements.filter(m => m.warehouseId === filters.warehouseId);
      if (filters.type) movements = movements.filter(m => m.type === filters.type);
      if (filters.startDate) movements = movements.filter(m => m.date >= filters.startDate!);
      if (filters.endDate) movements = movements.filter(m => m.date <= filters.endDate!);
    }

    return movements.sort((a, b) => b.date.localeCompare(a.date) || b.movementNumber.localeCompare(a.movementNumber));
  },

  async getWithLines(id: string): Promise<MovementWithLines | undefined> {
    const movement = await db.stock_movements_v2.get(id);
    if (!movement) return undefined;
    const lines = await db.stock_movement_lines.where('movementId').equals(id).toArray();
    return { ...movement, lines: lines.sort((a, b) => a.lineNumber - b.lineNumber) };
  },

  // BR-INV-008: الحركة مرتبط بمستند مصدر
  // BR-INV-001: لا يمكن صرف كمية أكبر من الرصيد
  async create(input: CreateMovementInput): Promise<StockMovementV2Entity> {
    if (!input.reference || !input.reference.trim()) {
      throw new Error('يجب ربط الحركة بمستند مصدر (المرجع)');
    }
    if (!input.warehouseId) {
      throw new Error('يجب اختيار المستودع');
    }
    if (!input.lines || input.lines.length === 0) {
      throw new Error('يجب إضافة صنف واحد على الأقل');
    }

    // BR-INV-001: التحقق من الرصيد عند الصرف
    const isIssuance = ['issue', 'sale', 'waste', 'transfer'].includes(input.type);
    if (isIssuance) {
      for (const l of input.lines) {
        const product = await db.products.get(l.itemId);
        if (!product) throw new Error(`المنتج ${l.itemId} غير موجود`);
        if (!product.allowNegativeStock && product.quantity < l.quantity) {
          throw new Error(`الرصيد غير كافٍ للمنتج "${product.name}": المتوفر ${product.quantity}، المطلوب ${l.quantity}`);
        }
      }
    }

    const movementNumber = await this.nextMovementNumber();
    const now = new Date().toISOString();
    const totalAmount = input.lines.reduce((s, l) => s + (l.quantity * l.unitPrice), 0);

    const movement: StockMovementV2Entity = {
      id: uuid(),
      movementNumber,
      date: input.date,
      type: input.type,
      warehouseId: input.warehouseId,
      itemId: input.lines[0].itemId,
      quantity: input.lines.reduce((s, l) => s + l.quantity, 0),
      unitPrice: input.lines[0].unitPrice,
      totalAmount,
      reference: input.reference.trim(),
      description: input.description,
      isReviewed: false,
      createdBy: input.createdBy,
      createdAt: now,
    };

    const lines: StockMovementLineEntity[] = input.lines.map((l, i) => ({
      id: uuid(),
      movementId: movement.id,
      itemId: l.itemId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      totalAmount: l.quantity * l.unitPrice,
      lineNumber: i + 1,
    }));

    await db.transaction('rw', db.stock_movements_v2, db.stock_movement_lines, db.products, db.user_activities, async () => {
      await db.stock_movements_v2.add(movement);
      await db.stock_movement_lines.bulkAdd(lines);

      // تحديث أرصدة المنتجات
      for (const l of input.lines) {
        const product = await db.products.get(l.itemId);
        if (!product) continue;
        let newQty = product.quantity;
        switch (input.type) {
          case 'receive': case 'return': case 'purchase': case 'inventory':
            newQty += l.quantity; break;
          case 'issue': case 'sale': case 'waste': case 'pack':
            newQty -= l.quantity; break;
          case 'adjust': case 'count':
            newQty = l.quantity; break;
        }
        await db.products.update(l.itemId, { quantity: Math.max(0, newQty), updatedAt: now });
      }

      await db.user_activities.add({
        id: uuid(),
        action: 'CREATE',
        entity: 'stock_movement',
        entityType: 'stock_movement',
        entityId: movement.id,
        userId: input.createdBy ?? 'system',
        details: `${movementNumber} - ${input.description ?? ''}`,
        performedAt: now,
      });
    });

    return movement;
  },

  // BR-INV-003: لا يمكن تعديل حركة تمت مراجعتها
  async review(id: string, reviewerId?: string): Promise<void> {
    const movement = await db.stock_movements_v2.get(id);
    if (!movement) return;
    await db.stock_movements_v2.update(id, {
      isReviewed: true,
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
    });
  },

  async unreview(id: string): Promise<void> {
    const movement = await db.stock_movements_v2.get(id);
    if (!movement) return;
    await db.stock_movements_v2.update(id, {
      isReviewed: false,
      reviewedBy: undefined,
      reviewedAt: undefined,
    });
  },

  // BR-INV-003 + BR-INV-008
  async remove(id: string, userId?: string): Promise<void> {
    const movement = await db.stock_movements_v2.get(id);
    if (!movement) return;
    if (movement.isReviewed) {
      throw new Error('لا يمكن حذف حركة تمت مراجعتها');
    }

    const lines = await db.stock_movement_lines.where('movementId').equals(id).toArray();

    await db.transaction('rw', db.stock_movements_v2, db.stock_movement_lines, db.products, db.user_activities, async () => {
      // عكس أثر الحركة على الأرصدة
      const isIssuance = ['issue', 'sale', 'waste', 'transfer'].includes(movement.type);
      for (const l of lines) {
        const product = await db.products.get(l.itemId);
        if (!product) continue;
        let newQty = product.quantity;
        if (isIssuance) {
          newQty += l.quantity;
        } else {
          newQty -= l.quantity;
        }
        await db.products.update(l.itemId, { quantity: Math.max(0, newQty), updatedAt: new Date().toISOString() });
      }

      await db.stock_movement_lines.where('movementId').equals(id).delete();
      await db.stock_movements_v2.delete(id);
      await db.user_activities.add({
        id: uuid(),
        action: 'DELETE',
        entity: 'stock_movement',
        entityType: 'stock_movement',
        entityId: id,
        userId: userId ?? 'system',
        details: movement.movementNumber,
        performedAt: new Date().toISOString(),
      });
    });
  },

  // التحويل بين المستودعات: إنشاء حركة صرف + حركة استلام
  async createTransfer(input: {
    fromWarehouseId: string;
    toWarehouseId: string;
    lines: { itemId: string; quantity: number; unitPrice: number }[];
    reference: string;
    description?: string;
    createdBy?: string;
  }): Promise<void> {
    if (!input.reference.trim()) throw new Error('يجب إدخال المرجع');
    if (input.fromWarehouseId === input.toWarehouseId) throw new Error('المستودعان يجب أن يكونا مختلفين');

    const now = new Date().toISOString();

    // التحقق من الرصيد في مستودع المصدر
    for (const l of input.lines) {
      const product = await db.products.get(l.itemId);
      if (!product) throw new Error(`المنتج ${l.itemId} غير موجود`);
      if (!product.allowNegativeStock && product.quantity < l.quantity) {
        throw new Error(`الرصيد غير كافٍ للمنتج "${product.name}": المتوفر ${product.quantity}، المطلوب ${l.quantity}`);
      }
    }

    const transferNumber = `TR-${String(Date.now()).slice(-5)}`;

    // حركة صرف من المصدر
    await this.create({
      date: now.slice(0, 10),
      type: 'transfer',
      warehouseId: input.fromWarehouseId,
      lines: input.lines,
      reference: input.reference,
      description: `تحويل إلى مستودع آخر - ${input.description ?? ''}`,
      createdBy: input.createdBy,
    });

    // حركة استلام في الوجهة
    await this.create({
      date: now.slice(0, 10),
      type: 'receive',
      warehouseId: input.toWarehouseId,
      lines: input.lines,
      reference: input.reference,
      description: `تحويل من مستودع آخر - ${input.description ?? ''}`,
      createdBy: input.createdBy,
    });
  },
};
