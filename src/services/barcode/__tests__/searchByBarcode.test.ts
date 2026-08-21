// اختبارات searchByBarcode — BARCODE-MGMT-001
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import { searchByBarcode } from '@/services/barcode/searchByBarcode';
import { ProductBarcodeRepository } from '@/infrastructure/database/repositories/ProductBarcodeRepository';

const now = () => new Date().toISOString();

async function seedData() {
  await db.products.bulkAdd([
    {
      id: 'p1', name: 'حليب', barcode: '1111111111111', sku: '', category: 'حليب', unit: 'علبة',
      costPrice: 45, wholesalePrice: 48, retailPrice: 55, wholesaleMinQty: 5,
      quantity: 100, lowStockThreshold: 10, status: 'active',
      allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
    },
    {
      id: 'p2', name: 'قفيز', barcode: '', sku: '', category: 'حبوب', unit: 'كيس',
      costPrice: 90, wholesalePrice: 95, retailPrice: 110, wholesaleMinQty: 0,
      quantity: 20, lowStockThreshold: 5, status: 'active',
      allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
    },
  ]);
  await db.packs.add({
    id: 'pk1', name: 'حزمة', barcode: 'PACK123', packPrice: 200, items: [],
    status: 'active', createdAt: now(), updatedAt: now(),
  });
  await ProductBarcodeRepository.add({
    productId: 'p2', barcode: '2222222222222', type: 'variant', variantLabel: 'كبير',
  });
  // منتج موقوف
  await db.products.add({
    id: 'p3', name: 'موقوف', barcode: '3333333333333', sku: '', category: 'X', unit: 'U',
    costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
    quantity: 5, lowStockThreshold: 0, status: 'inactive',
    allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
  });
}

describe('searchByBarcode', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedData();
  });

  it('يجد منتجاً بباركود أساسي', async () => {
    const r = await searchByBarcode('1111111111111');
    expect(r).not.toBeNull();
    expect(r?.kind).toBe('product');
    expect(r?.product?.id).toBe('p1');
    expect(r?.primaryBarcode).toBe('1111111111111');
  });

  it('يجد حزمة بباركود مخصص', async () => {
    const r = await searchByBarcode('PACK123');
    expect(r).not.toBeNull();
    expect(r?.kind).toBe('pack');
    expect(r?.pack?.id).toBe('pk1');
  });

  it('يجد منتجاً عبر باركود مرتبط (variant)', async () => {
    const r = await searchByBarcode('2222222222222');
    expect(r).not.toBeNull();
    expect(r?.kind).toBe('product');
    expect(r?.product?.id).toBe('p2');
    expect(r?.matchedCode).toBe('2222222222222');
    expect(r?.primaryBarcode).toBe('');
    expect(r?.linkedBarcode?.variantLabel).toBe('كبير');
  });

  it('يرجع null لباركود غير معروف', async () => {
    const r = await searchByBarcode('NOT-FOUND-9999');
    expect(r).toBeNull();
  });

  it('يتجاهل المنتجات الموقوفة', async () => {
    const r = await searchByBarcode('3333333333333');
    expect(r).toBeNull();
  });

  it('يتعامل مع نص فارغ', async () => {
    expect(await searchByBarcode('')).toBeNull();
    expect(await searchByBarcode('   ')).toBeNull();
  });

  it('يقصّ الفراغات الجانبية', async () => {
    const r = await searchByBarcode('  1111111111111  ');
    expect(r?.product?.id).toBe('p1');
  });
});
