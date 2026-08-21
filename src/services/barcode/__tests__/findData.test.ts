// اختبارات findDuplicates + findMissing — BARCODE-MGMT-001
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import { ProductBarcodeRepository } from '@/infrastructure/database/repositories/ProductBarcodeRepository';
import { findDuplicateBarcodes } from '@/services/barcode/findDuplicates';
import { findMissingBarcodes } from '@/services/barcode/findMissing';

const now = () => new Date().toISOString();

describe('findDuplicateBarcodes', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('يصفر القائمة عند عدم وجود تكرار', async () => {
    await db.products.add({
      id: 'p1', name: 'A', barcode: '111', sku: '', category: 'X', unit: 'U',
      costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
      quantity: 0, lowStockThreshold: 0, status: 'active',
      allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
    });
    const dups = await findDuplicateBarcodes();
    expect(dups).toHaveLength(0);
  });

  it('يرصد التكرار في الحقل المفرد لمنتجين', async () => {
    await db.products.bulkAdd([
      {
        id: 'p1', name: 'A', barcode: '7777', sku: '', category: 'X', unit: 'U',
        costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
        quantity: 0, lowStockThreshold: 0, status: 'active',
        allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
      },
      {
        id: 'p2', name: 'B', barcode: '7777', sku: '', category: 'X', unit: 'U',
        costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
        quantity: 0, lowStockThreshold: 0, status: 'active',
        allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
      },
    ]);
    const dups = await findDuplicateBarcodes();
    expect(dups).toHaveLength(1);
    expect(dups[0].barcode).toBe('7777');
    expect(dups[0].productIds).toContain('p1');
    expect(dups[0].productIds).toContain('p2');
    expect(dups[0].count).toBe(2);
  });

  it('يرصد التكرار بين الحقل المفرد والجدول المرتبط', async () => {
    await db.products.add({
      id: 'p1', name: 'A', barcode: '555', sku: '', category: 'X', unit: 'U',
      costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
      quantity: 0, lowStockThreshold: 0, status: 'active',
      allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
    });
    await ProductBarcodeRepository.add({
      productId: 'p-other', barcode: '555', type: 'variant',
    });
    const dups = await findDuplicateBarcodes();
    expect(dups.length).toBeGreaterThanOrEqual(1);
    const dua = dups.find(d => d.barcode === '555');
    expect(dua).toBeDefined();
  });

  it('يحدد المصادر في النتيجة', async () => {
    await db.products.add({
      id: 'p1', name: 'A', barcode: '888', sku: '', category: 'X', unit: 'U',
      costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
      quantity: 0, lowStockThreshold: 0, status: 'active',
      allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
    });
    await ProductBarcodeRepository.add({
      productId: 'p1', barcode: '888', type: 'batch',
    });
    const du = (await findDuplicateBarcodes()).find(d => d.barcode === '888');
    expect(du?.sources).toContain('product.barcode');
    expect(du?.sources).toContain('product_barcodes');
  });
});

describe('findMissingBarcodes', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('يصفر عند وجود باركود أساسي', async () => {
    await db.products.add({
      id: 'p1', name: 'A', barcode: '111', sku: '', category: 'X', unit: 'U',
      costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
      quantity: 0, lowStockThreshold: 0, status: 'active',
      allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
    });
    expect(await findMissingBarcodes()).toHaveLength(0);
  });

  it('يرصد المنتج بلا حقل ولا مرتبط', async () => {
    await db.products.add({
      id: 'p2', name: 'B', barcode: '', sku: '', category: 'X', unit: 'U',
      costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
      quantity: 0, lowStockThreshold: 0, status: 'active',
      allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
    });
    const missing = await findMissingBarcodes();
    expect(missing).toHaveLength(1);
    expect(missing[0].id).toBe('p2');
  });

  it('يستثني المنتج الذي له مرتبط فقط', async () => {
    await db.products.add({
      id: 'p3', name: 'C', barcode: '', sku: '', category: 'X', unit: 'U',
      costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
      quantity: 0, lowStockThreshold: 0, status: 'active',
      allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
    });
    await ProductBarcodeRepository.add({
      productId: 'p3', barcode: '999', type: 'primary',
    });
    expect(await findMissingBarcodes()).toHaveLength(0);
  });
});
