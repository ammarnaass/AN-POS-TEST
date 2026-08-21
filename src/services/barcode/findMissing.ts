// findMissingBarcodes — BARCODE-MGMT-001
// إيجاد المنتجات بدون أي باركود (لا في الحقل المفرد ولا في الجدول المرتبط)
import { db, type ProductEntity } from '@/infrastructure/database/dexie/db';

export async function findMissingBarcodes(): Promise<ProductEntity[]> {
  const [products, linked] = await Promise.all([
    db.products.toArray(),
    db.product_barcodes.toArray(),
  ]);
  const productIdsWithLinked = new Set(linked.map((b) => b.productId));
  return products.filter((p) => {
    const hasPrimary = Boolean(String(p.barcode ?? '').trim());
    const hasLinked = productIdsWithLinked.has(p.id);
    return !hasPrimary && !hasLinked;
  });
}
