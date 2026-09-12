// اختبارات parseAndAddScannedCode الشاملة لدعم المسح عن بُعد والكميات والحزم
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import { parseAndAddScannedCode } from '../parseAndAddScannedCode';
import type { Product, CartItem } from '@/types';
import type { PackEntity } from '@/infrastructure/database/dexie/db';

const now = () => new Date().toISOString();

const mockProduct: Product = {
  id: 'prod-1',
  name: 'عصير برتقال 1 لتر',
  barcode: '6130001112223',
  sku: 'JUC-01',
  category: 'مشروبات',
  unit: 'قارورة',
  costPrice: 80,
  wholesalePrice: 100,
  retailPrice: 120,
  wholesaleMinQty: 6,
  quantity: 50,
  lowStockThreshold: 5,
  status: 'active',
  allowNegativeStock: false,
  createdAt: now(),
  updatedAt: now(),
  createdBy: 'admin',
};

const mockPack: PackEntity = {
  id: 'pack-1',
  name: 'صندوق عصير برتقال (12 قارورة)',
  barcode: 'PACK-613000111',
  packPrice: 1100,
  piecesCount: 12,
  unitName: 'صندوق',
  items: [
    {
      productId: 'prod-1',
      qty: 12,
    } as any,
  ],
  status: 'active',
  createdAt: now(),
  updatedAt: now(),
};

describe('parseAndAddScannedCode', () => {
  let cartItems: CartItem[] = [];
  const addItem = (item: CartItem) => {
    cartItems.push(item);
  };

  beforeEach(async () => {
    cartItems = [];
    await db.delete();
    await db.open();
    await db.products.add(mockProduct);
    await db.packs.add(mockPack);
  });

  it('يضيف منتجاً عادياً بالكمية الافتراضية (1) بنجاح', async () => {
    const res = await parseAndAddScannedCode('6130001112223', {
      products: [mockProduct],
      packs: [mockPack],
      addItem,
    });

    expect(res.added).toBe(true);
    expect(res.kind).toBe('product');
    expect(res.name).toBe(mockProduct.name);
    expect(res.qty).toBe(1);
    expect(res.price).toBe(120);

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].productId).toBe('prod-1');
    expect(cartItems[0].qty).toBe(1);
    expect(cartItems[0].unitPrice).toBe(120);
    expect(cartItems[0].lineTotal).toBe(120);
  });

  it('يضيف منتجاً بالكمية المحددة من الهاتف (qty: 4) مع حساب الإجمالي بدقة', async () => {
    const res = await parseAndAddScannedCode('6130001112223', {
      products: [mockProduct],
      packs: [mockPack],
      addItem,
      qty: 4,
    });

    expect(res.added).toBe(true);
    expect(res.qty).toBe(4);
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].qty).toBe(4);
    expect(cartItems[0].unitPrice).toBe(120);
    expect(cartItems[0].lineTotal).toBe(480); // 120 * 4
  });

  it('يضيف كرتونة/حزمة عند مسح باركود الحزمة مع الكمية المطلوبة', async () => {
    const res = await parseAndAddScannedCode('PACK-613000111', {
      products: [mockProduct],
      packs: [mockPack],
      addItem,
      qty: 2,
    });

    expect(res.added).toBe(true);
    expect(res.kind).toBe('pack');
    expect(res.name).toBe(mockPack.name);
    expect(res.qty).toBe(2);

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].productId).toBe('pack-pack-1');
    expect(cartItems[0].isPack).toBe(true);
    expect(cartItems[0].qty).toBe(2);
    expect(cartItems[0].unitPrice).toBe(1100);
    expect(cartItems[0].lineTotal).toBe(2200); // 1100 * 2
  });

  it('يطبق سعر الجملة عند تفعيل فئة سعر الجملة (priceTier: 3)', async () => {
    const res = await parseAndAddScannedCode('6130001112223', {
      products: [mockProduct],
      addItem,
      priceTier: '3',
      qty: 3,
    });

    expect(res.added).toBe(true);
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].pricingType).toBe('wholesale');
    expect(cartItems[0].unitPrice).toBe(100); // wholesalePrice
    expect(cartItems[0].lineTotal).toBe(300); // 100 * 3
  });

  it('يرفض البيع إذا كان المنتج موقوفاً', async () => {
    const inactiveProd: Product = {
      ...mockProduct,
      id: 'prod-inactive',
      barcode: '999000111',
      status: 'inactive',
    };

    const res = await parseAndAddScannedCode('999000111', {
      products: [inactiveProd],
      addItem,
    });

    expect(res.added).toBe(false);
    expect(res.message).toBe('المنتج موقوف مؤقتاً');
    expect(cartItems).toHaveLength(0);
  });

  it('يرفض البيع إذا نفد المخزون ولم يكن البيع بالسالب مسموحاً', async () => {
    const outOfStockProd: Product = {
      ...mockProduct,
      id: 'prod-out',
      barcode: '888000111',
      quantity: 0,
    };

    const res = await parseAndAddScannedCode('888000111', {
      products: [outOfStockProd],
      addItem,
      allowNegativeStock: false,
    });

    expect(res.added).toBe(false);
    expect(res.message).toBe('نفد المخزون');
    expect(cartItems).toHaveLength(0);
  });

  it('يجد المنتج عبر searchByBarcode في قاعدة البيانات عند عدم وجوده بالذاكرة الفورية', async () => {
    // المنتج موجود في Dexie (تمت إضافته في beforeEach) لكن ليس في مصفوفة products الممررة
    const res = await parseAndAddScannedCode('6130001112223', {
      products: [], // ذاكرة فارغة
      addItem,
      qty: 2,
    });

    expect(res.added).toBe(true);
    expect(res.kind).toBe('product');
    expect(res.name).toBe('عصير برتقال 1 لتر');
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].qty).toBe(2);
    expect(cartItems[0].lineTotal).toBe(240);
  });
});
