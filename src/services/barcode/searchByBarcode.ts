// searchByBarcode — BARCODE-MGMT-001
// خدمة موحّدة للبحث عن المنتج/الحزمة بالباركود عبر كل مصادر البيانات
import { db, type ProductEntity, type PackEntity, type ProductBarcodeEntity } from '@/infrastructure/database/dexie/db';
import { ProductBarcodeRepository } from '@/infrastructure/database/repositories/ProductBarcodeRepository';

export interface BarcodeSearchResult {
  kind: 'product' | 'pack';
  product?: ProductEntity;
  pack?: PackEntity;
  matchedCode: string;
  primaryBarcode: string;
  linkedBarcode?: ProductBarcodeEntity;
}

/**
 * يبحث عن منتج/حزمة بالباركود، بالترتيب:
 *   1) الباركود الأساسي للمنتج (db.products.barcode) — الأسرع
 *   2) باركود الحزمة (db.packs.barcode)
 *   3) جدول الباركودات المرتبطة (variant/batch) — مع إعادة المنتج الأب
 *   4) null إن لم يُعثر
 */
export async function searchByBarcode(rawCode: string): Promise<BarcodeSearchResult | null> {
  const code = String(rawCode ?? '').trim();
  if (!code) return null;

  // 1) الباركود الأساسي للمنتج
  const product = await db.products.where('barcode').equals(code).first();
  if (product && product.status === 'active') {
    return { kind: 'product', product, matchedCode: code, primaryBarcode: product.barcode };
  }

  // 2) باركود الحزمة
  const pack = await db.packs.where('barcode').equals(code).first();
  if (pack && pack.status === 'active') {
    return { kind: 'pack', pack, matchedCode: code, primaryBarcode: pack.barcode };
  }

  // 3) الباركودات المرتبطة (variant/batch)
  const linked = await ProductBarcodeRepository.findByBarcode(code);
  if (linked) {
    const parent = await db.products.get(linked.productId);
    if (parent && parent.status === 'active') {
      return { kind: 'product', product: parent, matchedCode: code, primaryBarcode: parent.barcode, linkedBarcode: linked };
    }
  }

  // 4) غير معروف
  return null;
}
