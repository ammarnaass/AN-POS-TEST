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

  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

  // 1) الباركود الأساسي للمنتج (استعلام SQLite أولاً لضمان أحدث البيانات المتزامنة)
  if (api?.products?.getByBarcode) {
    try {
      const res = await api.products.getByBarcode(code);
      if (res?.data && (res.data.status === 'active' || !res.data.status)) {
        const product = res.data as ProductEntity;
        // مزامنة صامتة لكاش Dexie
        db.products.put(product).catch(() => {});
        return { kind: 'product', product, matchedCode: code, primaryBarcode: product.barcode || code };
      }
    } catch {
      /* fallback to Dexie */
    }
  }

  const product = await db.products.where('barcode').equals(code).first();
  if (product && product.status === 'active') {
    return { kind: 'product', product, matchedCode: code, primaryBarcode: product.barcode };
  }

  // 2) باركود الحزمة / العبوة (استعلام SQLite أولاً لضمان الحزم المنشأة من الموبايل)
  if (api?.packs?.getByBarcode) {
    try {
      const res = await api.packs.getByBarcode(code);
      if (res?.data && (res.data.status === 'active' || !res.data.status)) {
        const pack = res.data as PackEntity;
        // مزامنة صامتة لكاش Dexie
        db.packs.put(pack).catch(() => {});
        return { kind: 'pack', pack, matchedCode: code, primaryBarcode: pack.barcode || code };
      }
    } catch {
      /* fallback to Dexie */
    }
  }

  const pack = await db.packs.where('barcode').equals(code).first();
  if (pack && pack.status === 'active') {
    return { kind: 'pack', pack, matchedCode: code, primaryBarcode: pack.barcode };
  }

  // 3) الباركودات المرتبطة (variant/batch)
  const linked = await ProductBarcodeRepository.findByBarcode(code);
  if (linked) {
    let parent: ProductEntity | undefined;
    if (api?.products?.get) {
      try {
        const pRes = await api.products.get(linked.productId);
        if (pRes?.data && pRes.data.status === 'active') {
          parent = pRes.data as ProductEntity;
        }
      } catch { /* fallback */ }
    }
    if (!parent) {
      parent = await db.products.get(linked.productId);
    }
    if (parent && parent.status === 'active') {
      return { kind: 'product', product: parent, matchedCode: code, primaryBarcode: parent.barcode, linkedBarcode: linked };
    }
  }

  // 4) غير معروف
  return null;
}
