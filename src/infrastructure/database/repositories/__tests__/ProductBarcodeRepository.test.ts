// اختبارات ProductBarcodeRepository — BARCODE-MGMT-001
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import {
  ProductBarcodeRepository,
  BarcodeDuplicateError,
} from '@/infrastructure/database/repositories/ProductBarcodeRepository';

const now = () => new Date().toISOString();

async function addProduct(id: string, barcode = '') {
  await db.products.add({
    id, name: `P-${id}`, barcode, sku: '', category: 'X', unit: 'U',
    costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
    quantity: 0, lowStockThreshold: 0, status: 'active',
    allowNegativeStock: false, createdAt: now(), updatedAt: now(), createdBy: 'test',
  });
}

describe('ProductBarcodeRepository', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('يضيف ويبحث بالباركود', async () => {
    await addProduct('p1');
    const id = await ProductBarcodeRepository.add({
      productId: 'p1', barcode: 'AAA', type: 'primary',
    });
    expect(id).toBeTruthy();
    const found = await ProductBarcodeRepository.findByBarcode('AAA');
    expect(found?.productId).toBe('p1');
  });

  it('يرفض الباركود المكرر برمي BarcodeDuplicateError', async () => {
    await addProduct('p1');
    await addProduct('p2');
    await ProductBarcodeRepository.add({
      productId: 'p1', barcode: 'DUP', type: 'primary',
    });
    await expect(
      ProductBarcodeRepository.add({ productId: 'p2', barcode: 'DUP', type: 'variant' }),
    ).rejects.toBeInstanceOf(BarcodeDuplicateError);
  });

  it('يرفض الباركود الفارغ', async () => {
    await addProduct('p1');
    await expect(
      ProductBarcodeRepository.add({ productId: 'p1', barcode: '   ', type: 'primary' }),
    ).rejects.toThrow();
  });

  it('يقص الفراغات في إدخال/بحث/تحديث', async () => {
    await addProduct('p1');
    const id = await ProductBarcodeRepository.add({
      productId: 'p1', barcode: ' X1 ', type: 'primary',
    });
    expect((await ProductBarcodeRepository.findByBarcode(' X1 '))?.barcode).toBe('X1');
    expect((await ProductBarcodeRepository.findByBarcode('X1'))?.productId).toBe('p1');
  });

  it('listByProduct يرجع كل باركودات المنتج', async () => {
    await addProduct('p1');
    await ProductBarcodeRepository.add({ productId: 'p1', barcode: 'A', type: 'primary' });
    await ProductBarcodeRepository.add({ productId: 'p1', barcode: 'B', type: 'variant' });
    await ProductBarcodeRepository.add({ productId: 'p1', barcode: 'C', type: 'batch' });
    const list = await ProductBarcodeRepository.listByProduct('p1');
    expect(list).toHaveLength(3);
  });

  it('replaceForProduct يحل محل القديم ولا يكرر', async () => {
    await addProduct('p1');
    await ProductBarcodeRepository.add({ productId: 'p1', barcode: 'OLD', type: 'primary' });
    await ProductBarcodeRepository.replaceForProduct('p1', [
      { barcode: 'NEW1', type: 'primary' },
      { barcode: 'NEW2', type: 'variant', variantLabel: 'L' },
    ]);
    const list = await ProductBarcodeRepository.listByProduct('p1');
    expect(list.map(b => b.barcode).sort()).toEqual(['NEW1', 'NEW2']);
    expect(await ProductBarcodeRepository.findByBarcode('OLD')).toBeUndefined();
  });

  it('replaceForProduct يرفض التعارض مع منتج آخر', async () => {
    await addProduct('p1');
    await addProduct('p2');
    await ProductBarcodeRepository.add({ productId: 'p1', barcode: 'SHARE', type: 'primary' });
    await expect(
      ProductBarcodeRepository.replaceForProduct('p2', [{ barcode: 'SHARE', type: 'primary' }]),
    ).rejects.toBeInstanceOf(BarcodeDuplicateError);
  });

  it('bulkAdd يحسب المكرّر ويتخطاه', async () => {
    await addProduct('p1');
    await addProduct('p2');
    await ProductBarcodeRepository.add({ productId: 'p1', barcode: 'X', type: 'primary' });
    const res = await ProductBarcodeRepository.bulkAdd([
      { productId: 'p2', barcode: 'X', type: 'primary' },
      { productId: 'p2', barcode: 'Y', type: 'primary' },
    ]);
    expect(res.added).toBe(1);
    expect(res.duplicatesSkipped).toBe(1);
  });
});
