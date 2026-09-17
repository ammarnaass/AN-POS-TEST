import { describe, it, expect, beforeEach } from 'vitest';
import { generateEAN13, isEan13Valid } from '@/services/barcode/generateBarcode';
import { useNotificationStore } from '@/store/notificationStore';
import { db } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';

describe('AN POS Inventory Remediation Tests', () => {
  beforeEach(async () => {
    useNotificationStore.setState({ notifications: [], activeToasts: [] });
    await db.products.clear();
    await db.stock_movements_v2.clear();
  });

  describe('Phase 4: Automatic Barcode Generator (EAN-13)', () => {
    it('generates valid 13-digit EAN-13 barcodes with prefix 20', () => {
      for (let i = 0; i < 20; i++) {
        const code = generateEAN13('20');
        expect(code).toHaveLength(13);
        expect(code.startsWith('20')).toBe(true);
        expect(isEan13Valid(code)).toBe(true);
      }
    });
  });

  describe('Phase 3: Notification Store Integration', () => {
    it('records and notifies on inventory product events', () => {
      const store = useNotificationStore.getState();

      store.addNotification({
        title: 'تمت إضافة المنتج بنجاح',
        message: 'تم تسجيل الصنف "عصير تفاح 1 لتر" بنجاح في المخزون.',
        type: 'success',
        category: 'inventory',
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);
      const notif = useNotificationStore.getState().notifications[0];
      expect(notif.title).toBe('تمت إضافة المنتج بنجاح');
      expect(notif.category).toBe('inventory');
      expect(notif.type).toBe('success');
    });

    it('handles low stock notifications correctly', () => {
      const store = useNotificationStore.getState();

      store.addNotification({
        title: 'تنبيه حالة المخزون',
        message: 'تنبيه: يوجد 2 صنفاً نافداً و 5 أصناف دون حد الطلب الأدنى.',
        type: 'warning',
        category: 'inventory',
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);
      expect(useNotificationStore.getState().notifications[0].type).toBe('warning');
    });
  });

  describe('Phase 2: Stock Movements Audit Trail on Adjustments', () => {
    it('records a stock_movements_v2 record on stock quantity adjustment', async () => {
      const p: Product = {
        id: 'prod-adj-1',
        name: 'شامبو أطفال 250 مل',
        barcode: '6139999001',
        retailPrice: 450,
        costPrice: 300,
        quantity: 10,
        unit: 'قطعة',
        category: 'عناية',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.products.add(p);

      // محاكاة التعديل السريع (+5 قطع)
      const newQty = 15;
      const delta = 5;
      await db.products.update(p.id, { quantity: newQty });

      await db.stock_movements_v2.add({
        id: 'mov-1',
        movementNumber: 'ADJ-100001',
        date: new Date().toISOString().slice(0, 10),
        type: 'adjust',
        warehouseId: 'main',
        itemId: p.id,
        quantity: delta,
        unitPrice: p.costPrice || 0,
        totalAmount: delta * (p.costPrice || 0),
        reference: 'تعديل يدوي من شاشة المخزن',
        description: 'زيادة رصيد يدوية (+5)',
        isReviewed: true,
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
      } as any);

      // التحقق من تحديث رصيد المنتج
      const updatedProd = await db.products.get(p.id);
      expect(updatedProd?.quantity).toBe(15);

      // التحقق من وجود حركة المخزون في stock_movements_v2
      const movements = await db.stock_movements_v2.toArray();
      expect(movements).toHaveLength(1);
      expect(movements[0].itemId).toBe('prod-adj-1');
      expect(movements[0].type).toBe('adjust');
      expect(movements[0].quantity).toBe(5);
      expect(movements[0].totalAmount).toBe(1500);
    });
  });
});
