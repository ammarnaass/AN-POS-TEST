import { db } from '@/infrastructure/database/dexie/db';
import type { Product, StockMovementV2Entity, StockMovementLineEntity, WarehouseEntity } from '@/infrastructure/database/dexie/db';

// تقرير أرصدة المخزون
export interface BalanceRow {
  productId: string;
  productName: string;
  sku?: string;
  category: string;
  quantity: number;
  costPrice: number;
  retailPrice: number;
  stockValue: number;
  warehouseId?: string;
}

export async function computeInventoryBalance(warehouseId?: string): Promise<BalanceRow[]> {
  const products = await db.products.toArray();
  return products
    .filter(p => !warehouseId || p.warehouseId === warehouseId)
    .filter(p => p.status === 'active')
    .map(p => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      category: p.category,
      quantity: p.quantity,
      costPrice: p.costPrice,
      retailPrice: p.retailPrice,
      stockValue: p.quantity * p.costPrice,
      warehouseId: p.warehouseId,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName, 'ar'));
}

// تقرير حركات المخزون
export interface MovementRow {
  movementNumber: string;
  date: string;
  type: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  reference?: string;
}

export async function computeStockMovements(start?: string, end?: string, warehouseId?: string): Promise<MovementRow[]> {
  const movements = await db.stock_movements_v2.toArray();
  const products = await db.products.toArray();
  const warehouses = await db.warehouses.toArray();
  const productMap = new Map(products.map(p => [p.id, p]));
  const warehouseMap = new Map(warehouses.map(w => [w.id, w]));

  return movements
    .filter(m => {
      if (start && m.date < start) return false;
      if (end && m.date > end) return false;
      if (warehouseId && m.warehouseId !== warehouseId) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(m => ({
      movementNumber: m.movementNumber,
      date: m.date,
      type: m.type,
      productName: productMap.get(m.itemId)?.name ?? m.itemId,
      warehouseName: warehouseMap.get(m.warehouseId)?.name ?? m.warehouseId,
      quantity: m.quantity,
      unitPrice: m.unitPrice,
      totalAmount: m.totalAmount,
      reference: m.reference,
    }));
}

// تقرير الأصناف تحت الحد الأدنى
export interface LowStockRow {
  productId: string;
  productName: string;
  sku?: string;
  category: string;
  quantity: number;
  lowStockThreshold: number;
  reorderPoint?: number;
}

export async function computeLowStockReport(): Promise<LowStockRow[]> {
  const products = await db.products.toArray();
  return products
    .filter(p => p.status === 'active' && p.lowStockThreshold > 0 && p.quantity <= p.lowStockThreshold)
    .map(p => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      category: p.category,
      quantity: p.quantity,
      lowStockThreshold: p.lowStockThreshold,
      reorderPoint: p.reorderPoint,
    }))
    .sort((a, b) => (a.quantity / a.lowStockThreshold) - (b.quantity / b.lowStockThreshold));
}

// تقرير الأصناف الراكدة (لم تُبع منذ 90 يوم)
export interface DeadStockRow {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  lastMovementDate?: string;
}

export async function computeDeadStockReport(): Promise<DeadStockRow[]> {
  const products = await db.products.toArray();
  const movements = await db.stock_movements_v2.toArray();
  const now = new Date();
  const threshold = 90 * 24 * 60 * 60 * 1000;

  // آخر حركة لكل صنف
  const lastMovement = new Map<string, string>();
  for (const m of movements) {
    const existing = lastMovement.get(m.itemId);
    if (!existing || m.date > existing) {
      lastMovement.set(m.itemId, m.date);
    }
  }

  return products
    .filter(p => p.status === 'active' && p.quantity > 0)
    .filter(p => {
      const last = lastMovement.get(p.id);
      if (!last) return true; // لم تكن له أي حركة
      return now.getTime() - new Date(last).getTime() > threshold;
    })
    .map(p => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      quantity: p.quantity,
      lastMovementDate: lastMovement.get(p.id),
    }));
}

// تقرير تكلفة المخزون
export interface CostRow {
  category: string;
  totalQuantity: number;
  totalCostValue: number;
  totalRetailValue: number;
  itemCount: number;
}

export async function computeInventoryCost(): Promise<CostRow[]> {
  const products = await db.products.toArray();
  const categories = new Map<string, { qty: number; cost: number; retail: number; count: number }>();

  for (const p of products.filter(p => p.status === 'active')) {
    const existing = categories.get(p.category) ?? { qty: 0, cost: 0, retail: 0, count: 0 };
    existing.qty += p.quantity;
    existing.cost += p.quantity * p.costPrice;
    existing.retail += p.quantity * p.retailPrice;
    existing.count += 1;
    categories.set(p.category, existing);
  }

  return Array.from(categories.entries())
    .map(([cat, data]) => ({
      category: cat || 'بدون فئة',
      totalQuantity: data.qty,
      totalCostValue: data.cost,
      totalRetailValue: data.retail,
      itemCount: data.count,
    }))
    .sort((a, b) => b.totalCostValue - a.totalCostValue);
}
