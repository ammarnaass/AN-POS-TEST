/**
 * products-sync.ts — جسر الكتابة المزدوجة للمنتجات (Write-Through Bridge)
 *
 * عند أي تغيير على منتج في Dexie، استدعِ هذه الدوال لتكتب نفس البيانات
 * في SQLite (عبر IPC). هذا ما يجعل خادم المزامنة (/api/sync/pull)
 * يرى التغييرات ويرسلها لتطبيق الهاتف.
 *
 * الاستخدام:
 *   import { syncProductCreate, syncProductUpdate, syncProductDelete } from '@/lib/products-sync';
 *
 *   // بعد db.products.add(product)
 *   await syncProductCreate(product);
 *
 *   // بعد db.products.update(id, changes)
 *   await syncProductUpdate(id, changes);
 *
 *   // بعد db.products.delete(id)
 *   await syncProductDelete(id);
 */

import type { Product } from '@/types/product';

/** الحصول على electronAPI بأمان — يعيد null في بيئة الاختبار أو المتصفح المستقل */
function getElectronDB() {
  if (typeof window === 'undefined') return null;
  return (window as any).electronAPI?.db ?? null;
}

/**
 * تحويل كائن المنتج من camelCase (Dexie) إلى snake_case (SQLite)
 * نُبقي الحقول المهمة فقط لتجنب رفع أعمدة غير موجودة في المخطط
 */
function toSQLiteProduct(product: Partial<Product>): Record<string, unknown> {
  const p = product as any;
  const row: Record<string, unknown> = {};

  const map: [string, string][] = [
    ['id', 'id'],
    ['name', 'name'],
    ['barcode', 'barcode'],
    ['sku', 'sku'],
    ['description', 'description'],
    ['category', 'category'],
    ['categoryId', 'category_id'],
    ['unit', 'unit'],
    ['purchasePrice', 'purchase_price'],
    ['lastPurchasePrice', 'last_purchase_price'],
    ['avgPurchasePrice', 'avg_purchase_price'],
    ['price', 'price'],
    ['price2', 'price2'],
    ['price3', 'price3'],
    ['bottlePrice', 'bottle_price'],
    ['bottleQty', 'bottle_qty'],
    ['margin', 'margin'],
    ['roundingRate', 'rounding_rate'],
    ['quantity', 'quantity'],
    ['minStock', 'min_stock'],
    ['maxStock', 'max_stock'],
    ['reorderPoint', 'reorder_point'],
    ['alertQty', 'alert_qty'],
    ['image', 'image'],
    ['imageUrl', 'image'],
    ['status', 'status'],
    ['variant', 'variant'],
    ['expiryDate', 'expiry_date'],
    ['batchNumber', 'batch_number'],
    ['warehouseId', 'warehouse_id'],
    ['stockable', 'stockable'],
    ['highlighted', 'highlighted'],
    ['allowNegativeStock', 'allow_negative_stock'],
    ['pricingByZone', 'pricing_by_zone'],
    ['loyaltyCard', 'loyalty_card'],
    ['askPrice', 'ask_price'],
    ['askQuantity', 'ask_quantity'],
    ['type', 'type'],
    ['taxRate', 'tax_rate'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ];

  for (const [camel, snake] of map) {
    if (p[camel] !== undefined) row[snake] = p[camel];
    // أيضاً نقبل الصيغة snake_case مباشرة إن وُجدت
    if (p[snake] !== undefined && row[snake] === undefined) row[snake] = p[snake];
  }

  return row;
}

/**
 * كتابة منتج جديد في SQLite.
 * تُستدعى بعد `db.products.add(...)`.
 */
export async function syncProductCreate(product: Partial<Product>): Promise<void> {
  const api = getElectronDB();
  if (!api) return;
  try {
    const data = toSQLiteProduct(product);
    await api.create('products', data);
  } catch (err) {
    // لا نوقف العملية — Dexie تمت بنجاح، SQLite فشل (سجّل فقط)
    console.warn('[products-sync] syncProductCreate failed:', err);
  }
}

/**
 * تحديث منتج موجود في SQLite.
 * تُستدعى بعد `db.products.update(id, changes)` أو `db.products.put(...)`.
 */
export async function syncProductUpdate(
  id: string,
  changes: Partial<Product>
): Promise<void> {
  const api = getElectronDB();
  if (!api) return;
  try {
    const data = toSQLiteProduct(changes);
    await api.update('products', id, data);
  } catch (err) {
    console.warn('[products-sync] syncProductUpdate failed:', err);
  }
}

/**
 * حذف منتج من SQLite.
 * تُستدعى بعد `db.products.delete(id)`.
 */
export async function syncProductDelete(id: string): Promise<void> {
  const api = getElectronDB();
  if (!api) return;
  try {
    await api.remove('products', id);
  } catch (err) {
    console.warn('[products-sync] syncProductDelete failed:', err);
  }
}

/**
 * كتابة جملة منتجات دفعة واحدة في SQLite.
 * تُستدعى بعد `db.products.bulkAdd(...)`.
 */
export async function syncProductBulkCreate(products: Partial<Product>[]): Promise<void> {
  const api = getElectronDB();
  if (!api) return;
  try {
    const rows = products.map(toSQLiteProduct);
    await api.bulkCreate('products', rows);
  } catch (err) {
    console.warn('[products-sync] syncProductBulkCreate failed:', err);
  }
}
