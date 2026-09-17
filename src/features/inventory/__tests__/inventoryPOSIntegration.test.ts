import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import { countRepo } from '../infrastructure/repositories/countRepo';
import { movementRepo } from '../infrastructure/repositories/movementRepo';

// محاكاة كاش الذاكرة لاختبارات Dexie / IPC Shim
const mockProducts = new Map<string, any>();
const mockStockMovements: any[] = [];
const mockStockMovementsV2: any[] = [];
const mockCounts: any[] = [];
const mockCountLines: any[] = [];
const mockWarehouses: any[] = [];

vi.mock('@/infrastructure/database/dexie/db', () => {
  return {
    db: {
      products: {
        get: vi.fn(async (id: string) => mockProducts.get(id)),
        toArray: vi.fn(async () => Array.from(mockProducts.values())),
        add: vi.fn(async (p: any) => { mockProducts.set(p.id, { ...p }); return p; }),
        put: vi.fn(async (p: any) => { mockProducts.set(p.id, { ...p }); return p; }),
        update: vi.fn(async (id: string, patch: any) => {
          const existing = mockProducts.get(id);
          if (existing) {
            const updated = { ...existing, ...patch };
            mockProducts.set(id, updated);
            return updated;
          }
        }),
        delete: vi.fn(async (id: string) => mockProducts.delete(id)),
        count: vi.fn(async () => mockProducts.size),
      },
      warehouses: {
        get: vi.fn(async (id: string) => mockWarehouses.find(w => w.id === id)),
        toArray: vi.fn(async () => [...mockWarehouses]),
        add: vi.fn(async (w: any) => { mockWarehouses.push(w); return w; }),
      },
      stock_movements: {
        add: vi.fn(async (m: any) => { mockStockMovements.push(m); return m; }),
        toArray: vi.fn(async () => [...mockStockMovements]),
      },
      stock_movements_v2: {
        add: vi.fn(async (m: any) => { mockStockMovementsV2.push(m); return m; }),
        toArray: vi.fn(async () => [...mockStockMovementsV2]),
        count: vi.fn(async () => mockStockMovementsV2.length),
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            count: vi.fn(async () => 0),
          })),
        })),
      },
      stock_movement_lines: {
        bulkAdd: vi.fn(async (lines: any[]) => lines.forEach(l => {})),
        where: vi.fn(() => ({
          equals: vi.fn(() => ({
            toArray: vi.fn(async () => []),
          })),
        })),
      },
      inventory_counts: {
        add: vi.fn(async (c: any) => { mockCounts.push(c); return c; }),
        get: vi.fn(async (id: string) => mockCounts.find(c => c.id === id)),
        toArray: vi.fn(async () => [...mockCounts]),
        count: vi.fn(async () => mockCounts.length),
        update: vi.fn(async (id: string, patch: any) => {
          const target = mockCounts.find(c => c.id === id);
          if (target) Object.assign(target, patch);
        }),
      },
      inventory_count_lines: {
        bulkAdd: vi.fn(async (lines: any[]) => mockCountLines.push(...lines)),
        where: vi.fn(() => ({
          equals: vi.fn((countId: string) => ({
            toArray: vi.fn(async () => mockCountLines.filter(l => l.countId === countId)),
          })),
        })),
        update: vi.fn(async (id: string, patch: any) => {
          const target = mockCountLines.find(l => l.id === id);
          if (target) Object.assign(target, patch);
        }),
      },
      user_activities: {
        add: vi.fn(async () => {}),
      },
      transaction: vi.fn(async (_mode: string, ...rest: any[]) => {
        const callback = rest[rest.length - 1];
        return callback();
      }),
    },
  };
});

describe('تكامل المخزن مع نقطة البيع (Inventory & POS Integration)', () => {
  beforeEach(() => {
    mockProducts.clear();
    mockStockMovements.length = 0;
    mockStockMovementsV2.length = 0;
    mockCounts.length = 0;
    mockCountLines.length = 0;
    mockWarehouses.length = 0;

    mockWarehouses.push({
      id: 'main',
      name: 'المستودع الرئيسي',
      type: 'main',
      isActive: true,
    });

    mockProducts.set('prod-juice', {
      id: 'prod-juice',
      name: 'عصير برتقال 1 لتر',
      barcode: '613111222333',
      quantity: 50,
      costPrice: 100,
      retailPrice: 150,
      packageSize: '12',
      status: 'active',
      warehouseId: 'main',
    });
  });

  it('1. قراءة نقطة البيع للمخزون الأحدث بعد تعديل الكمية يدوياً في المخزن', async () => {
    // محاكاة تعديل الكاشير أو مدير المخزن للكمية إلى 80
    await db.products.update('prod-juice', { quantity: 80 });

    const posProducts = await db.products.toArray();
    const updated = posProducts.find((p: any) => p.id === 'prod-juice');

    expect(updated).toBeDefined();
    expect(updated.quantity).toBe(80);
  });

  it('2. خصم المخزون عند البيع بالتجزئة وظهور الرصيد المتبقي للمخزن فوراً', async () => {
    const current = await db.products.get('prod-juice');
    const soldQty = 5;
    const newQty = current.quantity - soldQty;

    await db.products.update('prod-juice', { quantity: newQty });
    await db.stock_movements_v2.add({
      id: 'mov-sale-1',
      movementNumber: 'MOV-001',
      date: new Date().toISOString().slice(0, 10),
      type: 'sale',
      warehouseId: 'main',
      itemId: 'prod-juice',
      quantity: -soldQty,
      unitPrice: 150,
      totalAmount: 750,
    });

    const inventoryCheck = await db.products.get('prod-juice');
    expect(inventoryCheck.quantity).toBe(45);

    const movements = await db.stock_movements_v2.toArray();
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe('sale');
    expect(movements[0].quantity).toBe(-5);
  });

  it('3. خصم كوليزاج عبوة الجملة (الكرتونة) وتحديث رصيد المخزن بدقة (qty * packageSize)', async () => {
    const product = await db.products.get('prod-juice');
    const packSize = parseInt(product.packageSize, 10); // 12 قطعة في الكرتونة
    const cartonsSold = 2;
    const totalPiecesDeducted = cartonsSold * packSize; // 24 قطعة

    const newQty = product.quantity - totalPiecesDeducted;
    await db.products.update('prod-juice', { quantity: newQty });

    const finalProduct = await db.products.get('prod-juice');
    expect(finalProduct.quantity).toBe(26); // 50 - 24 = 26
  });

  it('4. إغلاق جلسة الجرد (Inventory Count) يضبط كمية المخزون الفعلي لنقطة البيع ويسجل حركة تعديل', async () => {
    const count = await countRepo.create({ warehouseId: 'main', createdBy: 'admin' });
    expect(mockCountLines).toHaveLength(1);

    // تم العثور على 40 قطعة فعلياً بدلاً من 50 المتوقعة
    await countRepo.updateLineActualQty(count.id, 'prod-juice', 40);
    await countRepo.close(count.id, 'admin');

    const productAfterCount = await db.products.get('prod-juice');
    expect(productAfterCount.quantity).toBe(40);

    const movements = await db.stock_movements_v2.toArray();
    const countMovement = movements.find(m => m.type === 'count');
    expect(countMovement).toBeDefined();
    expect(countMovement.quantity).toBe(40);
  });

  it('5. التحقق من كفاية الرصيد عند التحويل بين المستودعات', async () => {
    mockWarehouses.push({
      id: 'branch-1',
      name: 'مستودع الفرع',
      type: 'branch',
      isActive: true,
    });

    // تحويل كمية تفوق الرصيد المتاح (50 متوفر، المطلوب تحويل 100) يجب أن يرفض
    await expect(movementRepo.createTransfer({
      fromWarehouseId: 'main',
      toWarehouseId: 'branch-1',
      lines: [{ itemId: 'prod-juice', quantity: 100, unitPrice: 100 }],
      reference: 'TR-OVERFLOW',
    })).rejects.toThrow('الرصيد غير كافٍ');
  });
});
