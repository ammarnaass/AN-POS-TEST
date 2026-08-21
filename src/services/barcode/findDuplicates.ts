// findDuplicateBarcodes — BARCODE-MGMT-001
// كشف الباركودات المكررة عبر مصدري البيانات:
//   - ProductEntity.barcode (الحقل المفرد القديم)
//   - جدول product_barcodes (المرتبط)
import { db } from '@/infrastructure/database/dexie/db';

export interface DuplicateBarcode {
  barcode: string;
  productIds: string[];
  count: number;
  sources: ('product.barcode' | 'product_barcodes')[];
}

export async function findDuplicateBarcodes(): Promise<DuplicateBarcode[]> {
  const map = new Map<string, { productIds: Set<string>; sources: Set<'product.barcode' | 'product_barcodes'> }>();

  // 1) الحقل المفرد
  const products = await db.products.toArray();
  for (const p of products) {
    const barcode = String(p.barcode ?? '').trim();
    if (!barcode) continue;
    if (!map.has(barcode)) {
      map.set(barcode, { productIds: new Set(), sources: new Set() });
    }
    const entry = map.get(barcode)!;
    entry.productIds.add(p.id);
    entry.sources.add('product.barcode');
  }

  // 2) جدول باركودات المرتبطة
  const linked = await db.product_barcodes.toArray();
  for (const b of linked) {
    const code = String(b.barcode).trim();
    if (!code) continue;
    if (!map.has(code)) {
      map.set(code, { productIds: new Set(), sources: new Set() });
    }
    const entry = map.get(code)!;
    entry.productIds.add(b.productId);
    entry.sources.add('product_barcodes');
  }

  // إرجاع فقط التكرار الحقيقي: أكثر من منتج واحد، أو نفس المنتج بباركود مكرر
  const duplicates: DuplicateBarcode[] = [];
  for (const [barcode, entry] of map.entries()) {
    const ids = [...entry.productIds];
    // تكرار فعلي: > منتج واحد مهما كان المصدر، أو باركود موضوع في باركودات الحقل والمرتبطة معاً
    if (ids.length > 1 || entry.sources.size > 1) {
      duplicates.push({
        barcode,
        productIds: ids,
        count: ids.length,
        sources: [...entry.sources] as ('product.barcode' | 'product_barcodes')[],
      });
    }
  }
  return duplicates.sort((a, b) => b.count - a.count);
}
