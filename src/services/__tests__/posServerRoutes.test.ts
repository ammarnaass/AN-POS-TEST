// اختبارات مسارات وخوارزمية البحث للماسح اللاسلكي للهاتف (Mobile Remote Scanner)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// نستخدم mock لـ db-utils و electron قبل استيراد findProductByBarcode
vi.mock('../../../electron/main/handlers/db-utils', () => ({
  queryOne: vi.fn(),
  queryAll: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

import { findProductByBarcode } from '../../../electron/main/server/routes/pos';
import { queryOne } from '../../../electron/main/handlers/db-utils';

describe('findProductByBarcode (Server Route Scanner)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('يجد منتجاً بباركود أو SKU مباشر من جدول products', () => {
    (queryOne as any).mockReturnValueOnce({
      id: 'p-100',
      name: 'قهوة اسبريسو',
      retailPrice: 250,
      quantity: 40,
      barcode: '613999888',
    });

    const res = findProductByBarcode('613999888');

    expect(res).not.toBeNull();
    expect(res?.id).toBe('p-100');
    expect(res?.name).toBe('قهوة اسبريسو');
    expect(res?.retailPrice).toBe(250);
    expect(res?.isPack).toBe(false);
  });

  it('يجد منتجاً عبر باركود بديل من جدول product_barcodes', () => {
    // الاستعلام الأول (products) يعود null
    (queryOne as any).mockReturnValueOnce(null);
    // الاستعلام الثاني (product_barcodes) يجد المنتج
    (queryOne as any).mockReturnValueOnce({
      id: 'p-200',
      name: 'شاي أخضر',
      retailPrice: 180,
      quantity: 15,
      barcode: 'ALT-12345',
    });

    const res = findProductByBarcode('ALT-12345');

    expect(res).not.toBeNull();
    expect(res?.id).toBe('p-200');
    expect(res?.name).toBe('شاي أخضر');
    expect(res?.barcode).toBe('ALT-12345');
    expect(res?.isPack).toBe(false);
  });

  it('يجد حزمة/كرتونة من جدول packs عند مسح باركود الكرتونة بالهاتف', () => {
    // الأول (products) -> null
    (queryOne as any).mockReturnValueOnce(null);
    // الثاني (product_barcodes) -> null
    (queryOne as any).mockReturnValueOnce(null);
    // الثالث (packs) -> وجد الحزمة
    (queryOne as any).mockReturnValueOnce({
      id: 'pack-99',
      name: 'كرتونة مياه معدنية (6 قارورات)',
      retailPrice: 360,
      piecesCount: 6,
      unitName: 'كرتونة',
      barcode: 'CARTON-WATER-6',
    });

    const res = findProductByBarcode('CARTON-WATER-6');

    expect(res).not.toBeNull();
    expect(res?.id).toBe('pack-pack-99');
    expect(res?.name).toBe('كرتونة مياه معدنية (6 قارورات)');
    expect(res?.retailPrice).toBe(360);
    expect(res?.isPack).toBe(true);
    expect(res?.packPiecesCount).toBe(6);
    expect(res?.packUnit).toBe('كرتونة');
  });

  it('يرجع null إذا لم يكن الباركود موجوداً في أي جدول', () => {
    (queryOne as any).mockReturnValue(null);

    const res = findProductByBarcode('UNKNOWN-CODE-404');
    expect(res).toBeNull();
  });

  it('يرجع null إذا كان الباركود فارغاً', () => {
    const res1 = findProductByBarcode('');
    const res2 = findProductByBarcode('   ');
    expect(res1).toBeNull();
    expect(res2).toBeNull();
  });
});
