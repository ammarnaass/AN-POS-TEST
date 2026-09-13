import { describe, it, expect } from 'vitest';
import {
  generateBarcodeValue,
  buildProductLabelItems,
} from '../services/barcodeLabelGenerator';
import {
  calculatePrintColumns,
  formatLabelPrice,
} from '../services/barcodePrintEngine';
import type { ProductEntity } from '@/infrastructure/database/dexie/db';
import type { PrintOptions } from '../types';
import { DEFAULT_PRINT_OPTIONS } from '../constants/labelConfigs';

describe('barcodeLabelGenerator and barcodePrintEngine services', () => {
  const mockProducts: ProductEntity[] = [
    {
      id: 'p1',
      name: 'معجون طماطم 400غ',
      barcode: '6131234567890',
      costPrice: 80,
      retailPrice: 110,
      wholesalePrice: 95,
      wholesaleMinQty: 12,
      lowStockThreshold: 10,
      quantity: 50,
      unit: 'علبة',
      category: 'معلبات',
      status: 'active',
      allowNegativeStock: false,
      createdBy: 'admin',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'p2',
      name: 'شوكولاتة بالحليب',
      barcode: '', // بدون باركود
      costPrice: 120,
      retailPrice: 160,
      wholesalePrice: 140,
      wholesaleMinQty: 6,
      lowStockThreshold: 5,
      quantity: 20,
      unit: 'قطعة',
      category: 'حلويات',
      status: 'active',
      allowNegativeStock: false,
      createdBy: 'admin',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  it('generates non-empty barcode values for supported formats', () => {
    const ean13 = generateBarcodeValue('ean13');
    expect(ean13).toBeDefined();
    expect(ean13.length).toBe(13);

    const code128 = generateBarcodeValue('code128');
    expect(code128).toBeDefined();
    expect(code128).toContain('AN');

    const qr = generateBarcodeValue('qr');
    expect(qr).toContain('AN-POS-');
  });

  it('correctly builds label items using registered product barcodes and multiplies copies', () => {
    const selectedIds = new Set(['p1']);
    const productBars = new Map<string, string>();
    productBars.set('p1', '6131234567890');

    const opts: PrintOptions = {
      ...DEFAULT_PRINT_OPTIONS,
      copies: 3,
      entryMode: 'product',
    };

    const items = buildProductLabelItems({
      selectedIds,
      products: mockProducts,
      productBars,
      opts,
    });

    expect(items.length).toBe(3);
    expect(items[0].product.id).toBe('p1');
    expect(items[0].barcode).toBe('6131234567890');
    expect(items[0].copies).toBe(1);
    expect(items[1].copies).toBe(2);
    expect(items[2].copies).toBe(3);
  });

  it('falls back to generating a barcode if product has no registered barcode', () => {
    const selectedIds = new Set(['p2']);
    const productBars = new Map<string, string>(); // Empty for p2

    const opts: PrintOptions = {
      ...DEFAULT_PRINT_OPTIONS,
      copies: 1,
      entryMode: 'product',
      barcodeFormat: 'ean13',
    };

    const items = buildProductLabelItems({
      selectedIds,
      products: mockProducts,
      productBars,
      opts,
    });

    expect(items.length).toBe(1);
    expect(items[0].product.id).toBe('p2');
    expect(items[0].barcode).toBeDefined();
    expect(items[0].barcode.length).toBe(13);
  });

  it('uses manual barcode override when entryMode is manual', () => {
    const selectedIds = new Set(['p1']);
    const productBars = new Map<string, string>([['p1', '6131234567890']]);

    const opts: PrintOptions = {
      ...DEFAULT_PRINT_OPTIONS,
      copies: 1,
      entryMode: 'manual',
      manualBarcode: 'CUSTOM-CODE-999',
    };

    const items = buildProductLabelItems({
      selectedIds,
      products: mockProducts,
      productBars,
      opts,
    });

    expect(items.length).toBe(1);
    expect(items[0].barcode).toBe('CUSTOM-CODE-999');
  });

  it('calculates print columns correctly for standard page width', () => {
    // 40mm label width -> 190 / (40 + 3) = 190 / 43 = 4 cols
    expect(calculatePrintColumns(40, 190)).toBe(4);

    // 55mm label width -> 190 / (55 + 3) = 190 / 58 = 3 cols
    expect(calculatePrintColumns(55, 190)).toBe(3);

    // edge case 0 or negative width
    expect(calculatePrintColumns(0)).toBe(1);
  });

  it('formats label price with currency', () => {
    expect(formatLabelPrice(250, 'دج')).toBe('250 دج');
    expect(formatLabelPrice(null, 'دج')).toBe('0 دج');
  });
});
