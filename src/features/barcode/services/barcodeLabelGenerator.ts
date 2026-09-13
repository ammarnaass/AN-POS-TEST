import type { ProductEntity } from '@/infrastructure/database/dexie/db';
import {
  generateEAN13,
  generateCode128,
  generateEAN8,
  generateUPCA,
} from '@/services/barcode/generateBarcode';
import type { BarcodeFormat, PrintOptions, ProductLabelItem } from '../types';

/**
 * توليد قيمة باركود عشوائية فريدة بحسب صيغة الباركود المحددة
 */
export function generateBarcodeValue(format: BarcodeFormat): string {
  switch (format) {
    case 'ean13':
      return generateEAN13();
    case 'ean8':
      return generateEAN8();
    case 'upca':
      return generateUPCA();
    case 'code128':
      return generateCode128('AN');
    case 'code39':
      return generateCode128('AN');
    case 'qr':
      return `AN-POS-${Date.now()}`;
    default:
      return generateEAN13();
  }
}

interface BuildLabelItemsParams {
  selectedIds: Set<string>;
  products: ProductEntity[];
  productBars: Map<string, string>;
  opts: PrintOptions;
}

/**
 * بناء مصفوفة بنود الملصقات المجهزة للمعاينة والطباعة مع تكرار النسخ بحسب الخيارات
 */
export function buildProductLabelItems({
  selectedIds,
  products,
  productBars,
  opts,
}: BuildLabelItemsParams): ProductLabelItem[] {
  const out: ProductLabelItem[] = [];

  for (const id of selectedIds) {
    const product = products.find((p) => p.id === id);
    if (!product) continue;

    let code = '';
    if (opts.entryMode === 'manual' && opts.manualBarcode) {
      code = opts.manualBarcode;
    } else if (opts.entryMode === 'random') {
      code = generateBarcodeValue(opts.barcodeFormat);
    } else {
      // Use product barcode or fallback
      code = productBars.get(id) || product.barcode || generateBarcodeValue(opts.barcodeFormat);
    }

    if (!code) continue;

    const copiesCount = Math.max(1, opts.copies || 1);
    for (let i = 0; i < copiesCount; i++) {
      out.push({ product, barcode: code, copies: i + 1 });
    }
  }

  return out;
}
