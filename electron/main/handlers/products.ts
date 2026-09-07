// معالج المنتجات — دوال قابلة لإعادة الاستخدام (IPC + HTTP REST).
// يتعامل مباشرة مع SQLite (المرجعية المشتركة) ويوفر تحويل الحقول بين snake_case و camelCase.
// يتوافق مع ipc/products.ts وخادم المزامنة.

import { randomUUID } from 'node:crypto';
import {
  queryAll,
  queryOne,
  execute,
  notifyTableChange,
  type Row,
} from './db-utils';

/**
 * تحويل صف المنتج من SQLite (snake_case) إلى كائن الواجهة (camelCase)
 */
export function transformProductFromDB(row: Row): Record<string, unknown> {
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    barcode: (row.barcode as string) || '',
    sku: (row.sku as string) || '',
    category: (row.category as string) || '',
    categoryId: (row.category_id as string) || null,
    type: (row.type as string) || '',
    unit: (row.unit as string) || 'قطعة',
    costPrice: Number(row.cost_price ?? row.purchase_price ?? 0),
    averagePrice: Number(row.average_price ?? 0),
    wholesalePrice: Number(row.wholesale_price ?? 0),
    retailPrice: Number(row.retail_price ?? row.price ?? 0),
    salePrice1: Number(row.sale_price1 ?? row.price ?? 0),
    salePrice2: Number(row.sale_price2 ?? row.price2 ?? 0),
    salePrice3: Number(row.sale_price3 ?? row.price3 ?? 0),
    invoicePrice: Number(row.invoice_price ?? 0),
    profitMargin: Number(row.profit_margin ?? row.margin ?? 0),
    tax: Number(row.tax ?? row.tax_rate ?? 0),
    discount: Number(row.discount ?? 0),
    wholesaleMinQty: Number(row.wholesale_min_qty ?? 0),
    quantity: Number(row.quantity ?? 0),
    lowStockThreshold: Number(row.low_stock_threshold ?? row.min_stock ?? 0),
    reorderPoint: Number(row.reorder_point ?? 0),
    maxStock: Number(row.max_stock ?? 0),
    stockable: row.stockable !== undefined ? Number(row.stockable) === 1 : true,
    weight: Number(row.weight ?? 0),
    packageSize: (row.package_size as string) || '',
    location: (row.location as string) || '',
    image: (row.image as string) || (row.imageUrl as string) || '',
    variant: (row.variant as string) || '',
    expiryDate: (row.expiry_date as string) || '',
    batchNumber: (row.batch_number as string) || '',
    highlighted: Number(row.highlighted ?? 0) === 1,
    status: (row.status as string) || 'active',
    allowNegativeStock: Number(row.allow_negative_stock ?? 0) === 1,
    warehouseId: (row.warehouse_id as string) || '',
    pricingByZone: Number(row.pricing_by_zone ?? 0) === 1,
    loyaltyCard: Number(row.loyalty_card ?? 0) === 1,
    askPrice: Number(row.ask_price ?? 0) === 1,
    askQuantity: Number(row.ask_quantity ?? 0) === 1,
    pointPrice: Number(row.point_price ?? 0) === 1,
    createdAt: (row.created_at as string) || '',
    updatedAt: (row.updated_at as string) || '',
    createdBy: (row.created_by as string) || '',
  };
}

/**
 * تحويل كائن الواجهة (camelCase) إلى حقول SQLite (snake_case)
 */
function normalizeProductForDB(raw: Record<string, unknown>): Record<string, unknown> {
  const norm: Record<string, unknown> = {};

  if (raw.name !== undefined) norm.name = String(raw.name).trim();
  if (raw.barcode !== undefined) norm.barcode = String(raw.barcode).trim();
  if (raw.sku !== undefined) norm.sku = String(raw.sku).trim();
  if (raw.category !== undefined) norm.category = String(raw.category).trim();
  if (raw.categoryId !== undefined || raw.category_id !== undefined) {
    norm.category_id = raw.categoryId ?? raw.category_id ?? null;
  }
  if (raw.type !== undefined) norm.type = String(raw.type).trim();
  if (raw.unit !== undefined) norm.unit = String(raw.unit).trim();

  // الأسعار والتكلفة
  if (raw.costPrice !== undefined || raw.cost_price !== undefined || raw.purchasePrice !== undefined) {
    norm.cost_price = Number(raw.costPrice ?? raw.cost_price ?? raw.purchasePrice ?? 0);
  }
  if (raw.averagePrice !== undefined || raw.average_price !== undefined) {
    norm.average_price = Number(raw.averagePrice ?? raw.average_price ?? 0);
  }
  if (raw.wholesalePrice !== undefined || raw.wholesale_price !== undefined) {
    norm.wholesale_price = Number(raw.wholesalePrice ?? raw.wholesale_price ?? 0);
  }
  if (raw.retailPrice !== undefined || raw.retail_price !== undefined || raw.price !== undefined) {
    norm.retail_price = Number(raw.retailPrice ?? raw.retail_price ?? raw.price ?? 0);
  }
  if (raw.salePrice1 !== undefined || raw.sale_price1 !== undefined) {
    norm.sale_price1 = Number(raw.salePrice1 ?? raw.sale_price1 ?? 0);
  }
  if (raw.salePrice2 !== undefined || raw.sale_price2 !== undefined || raw.price2 !== undefined) {
    norm.sale_price2 = Number(raw.salePrice2 ?? raw.sale_price2 ?? raw.price2 ?? 0);
  }
  if (raw.salePrice3 !== undefined || raw.sale_price3 !== undefined || raw.price3 !== undefined) {
    norm.sale_price3 = Number(raw.salePrice3 ?? raw.sale_price3 ?? raw.price3 ?? 0);
  }
  if (raw.invoicePrice !== undefined || raw.invoice_price !== undefined) {
    norm.invoice_price = Number(raw.invoicePrice ?? raw.invoice_price ?? 0);
  }
  if (raw.profitMargin !== undefined || raw.profit_margin !== undefined || raw.margin !== undefined) {
    norm.profit_margin = Number(raw.profitMargin ?? raw.profit_margin ?? raw.margin ?? 0);
  }
  if (raw.tax !== undefined || raw.taxRate !== undefined || raw.tax_rate !== undefined) {
    norm.tax = Number(raw.tax ?? raw.taxRate ?? raw.tax_rate ?? 0);
  }
  if (raw.discount !== undefined) norm.discount = Number(raw.discount ?? 0);
  if (raw.wholesaleMinQty !== undefined || raw.wholesale_min_qty !== undefined) {
    norm.wholesale_min_qty = Number(raw.wholesaleMinQty ?? raw.wholesale_min_qty ?? 0);
  }

  // المخزون والكميات
  if (raw.quantity !== undefined || raw.qty !== undefined || raw.stock !== undefined) {
    norm.quantity = Number(raw.quantity ?? raw.qty ?? raw.stock ?? 0);
  }
  if (raw.lowStockThreshold !== undefined || raw.low_stock_threshold !== undefined || raw.minStock !== undefined) {
    norm.low_stock_threshold = Number(raw.lowStockThreshold ?? raw.low_stock_threshold ?? raw.minStock ?? 0);
  }
  if (raw.reorderPoint !== undefined || raw.reorder_point !== undefined) {
    norm.reorder_point = Number(raw.reorderPoint ?? raw.reorder_point ?? 0);
  }
  if (raw.maxStock !== undefined || raw.max_stock !== undefined) {
    norm.max_stock = Number(raw.maxStock ?? raw.max_stock ?? 0);
  }
  if (raw.stockable !== undefined) {
    norm.stockable = raw.stockable ? 1 : 0;
  }
  if (raw.weight !== undefined) norm.weight = Number(raw.weight ?? 0);
  if (raw.packageSize !== undefined || raw.package_size !== undefined) {
    norm.package_size = String(raw.packageSize ?? raw.package_size ?? '');
  }
  if (raw.location !== undefined) norm.location = String(raw.location ?? '');
  if (raw.image !== undefined || raw.imageUrl !== undefined) {
    norm.image = String(raw.image ?? raw.imageUrl ?? '');
  }
  if (raw.variant !== undefined) norm.variant = String(raw.variant ?? '');
  if (raw.expiryDate !== undefined || raw.expiry_date !== undefined) {
    norm.expiry_date = String(raw.expiryDate ?? raw.expiry_date ?? '');
  }
  if (raw.batchNumber !== undefined || raw.batch_number !== undefined) {
    norm.batch_number = String(raw.batchNumber ?? raw.batch_number ?? '');
  }
  if (raw.highlighted !== undefined) {
    norm.highlighted = raw.highlighted ? 1 : 0;
  }
  if (raw.status !== undefined) norm.status = String(raw.status ?? 'active');
  if (raw.allowNegativeStock !== undefined || raw.allow_negative_stock !== undefined) {
    norm.allow_negative_stock = (raw.allowNegativeStock ?? raw.allow_negative_stock) ? 1 : 0;
  }
  if (raw.warehouseId !== undefined || raw.warehouse_id !== undefined) {
    norm.warehouse_id = String(raw.warehouseId ?? raw.warehouse_id ?? '');
  }
  if (raw.pricingByZone !== undefined || raw.pricing_by_zone !== undefined) {
    norm.pricing_by_zone = (raw.pricingByZone ?? raw.pricing_by_zone) ? 1 : 0;
  }
  if (raw.loyaltyCard !== undefined || raw.loyalty_card !== undefined) {
    norm.loyalty_card = (raw.loyaltyCard ?? raw.loyalty_card) ? 1 : 0;
  }
  if (raw.askPrice !== undefined || raw.ask_price !== undefined) {
    norm.ask_price = (raw.askPrice ?? raw.ask_price) ? 1 : 0;
  }
  if (raw.askQuantity !== undefined || raw.ask_quantity !== undefined) {
    norm.ask_quantity = (raw.askQuantity ?? raw.ask_quantity) ? 1 : 0;
  }
  if (raw.pointPrice !== undefined || raw.point_price !== undefined) {
    norm.point_price = (raw.pointPrice ?? raw.point_price) ? 1 : 0;
  }
  if (raw.createdBy !== undefined || raw.created_by !== undefined) {
    norm.created_by = String(raw.createdBy ?? raw.created_by ?? '');
  }

  return norm;
}

export interface ListProductsOptions {
  search?: string;
  categoryId?: string;
  status?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

/**
 * جلب قائمة المنتجات مع الفلترة والبحث والترتيب
 */
export async function listProducts(opts: ListProductsOptions = {}): Promise<{ data: Record<string, unknown>[] }> {
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params: unknown[] = [];

  if (opts.status) {
    sql += ' AND status = ?';
    params.push(opts.status);
  }

  if (opts.categoryId) {
    sql += ' AND (category_id = ? OR category = ?)';
    params.push(opts.categoryId, opts.categoryId);
  }

  if (opts.search?.trim()) {
    const q = `%${opts.search.trim()}%`;
    sql += ' AND (name LIKE ? OR barcode LIKE ? OR sku LIKE ? OR category LIKE ?)';
    params.push(q, q, q, q);
  }

  const orderCol = opts.orderBy || 'name';
  const orderDir = (opts.orderDir || 'ASC').toUpperCase();
  sql += ` ORDER BY ${orderCol} ${orderDir}`;

  if (opts.limit && opts.limit > 0) {
    sql += ' LIMIT ?';
    params.push(opts.limit);
    if (opts.offset && opts.offset > 0) {
      sql += ' OFFSET ?';
      params.push(opts.offset);
    }
  }

  const rows = queryAll(sql, params);
  return { data: rows.map(transformProductFromDB) };
}

/**
 * جلب منتج محدد بالمعرف
 */
export async function getProduct(id: string): Promise<{ data: Record<string, unknown> | null }> {
  if (!id) return { data: null };
  const row = queryOne('SELECT * FROM products WHERE id = ?', [id]);
  return { data: row ? transformProductFromDB(row) : null };
}

/**
 * البحث عن منتج بالباركود
 */
export async function getProductByBarcode(barcode: string): Promise<{ data: Record<string, unknown> | null }> {
  const code = String(barcode ?? '').trim();
  if (!code) return { data: null };
  const row = queryOne('SELECT * FROM products WHERE barcode = ?', [code]);
  return { data: row ? transformProductFromDB(row) : null };
}

/**
 * إنشاء منتج جديد في SQLite
 */
export async function createProduct(
  data: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error?: { status: number; detail: string } }> {
  const name = String(data.name || '').trim();
  if (!name) {
    return { data: null, error: { status: 422, detail: 'اسم المنتج مطلوب' } };
  }

  const barcode = String(data.barcode || '').trim();
  if (barcode) {
    const existing = queryOne('SELECT id FROM products WHERE barcode = ?', [barcode]);
    if (existing) {
      return { data: null, error: { status: 409, detail: 'الباركود مسجل مسبقاً لمنتج آخر' } };
    }
  }

  const id = (data.id as string) || randomUUID();
  const now = new Date().toISOString();
  const norm = normalizeProductForDB(data);

  norm.id = id;
  norm.created_at = (data.createdAt as string) || now;
  norm.updated_at = (data.updatedAt as string) || now;

  const cols = Object.keys(norm);
  const vals = Object.values(norm);
  const placeholders = cols.map(() => '?').join(', ');

  execute(`INSERT INTO products (${cols.join(', ')}) VALUES (${placeholders})`, vals);
  notifyTableChange('products', 'create', id);

  const created = queryOne('SELECT * FROM products WHERE id = ?', [id]);
  return { data: created ? transformProductFromDB(created) : null };
}

/**
 * تحديث منتج موجود في SQLite
 */
export async function updateProduct(
  id: string,
  data: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error?: { status: number; detail: string } }> {
  if (!id) {
    return { data: null, error: { status: 422, detail: 'معرف المنتج مطلوب' } };
  }

  const existing = queryOne('SELECT id FROM products WHERE id = ?', [id]);
  if (!existing) {
    // إذا لم يكن موجوداً، نقوم بإنشائه
    return createProduct({ ...data, id });
  }

  const barcode = data.barcode !== undefined ? String(data.barcode).trim() : undefined;
  if (barcode) {
    const duplicate = queryOne('SELECT id FROM products WHERE barcode = ? AND id != ?', [barcode, id]);
    if (duplicate) {
      return { data: null, error: { status: 409, detail: 'الباركود مسجل مسبقاً لمنتج آخر' } };
    }
  }

  const norm = normalizeProductForDB(data);
  delete norm.id;
  norm.updated_at = new Date().toISOString();

  const entries = Object.entries(norm);
  if (entries.length === 0) {
    return getProduct(id);
  }

  const setClause = entries.map(([k]) => `${k} = ?`).join(', ');
  const vals = entries.map(([, v]) => v);

  execute(`UPDATE products SET ${setClause} WHERE id = ?`, [...vals, id]);
  notifyTableChange('products', 'update', id);

  const updated = queryOne('SELECT * FROM products WHERE id = ?', [id]);
  return { data: updated ? transformProductFromDB(updated) : null };
}

/**
 * حذف منتج من SQLite وتسجيل tombstone للمزامنة
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: { status: number; detail: string } }> {
  if (!id) {
    return { success: false, error: { status: 422, detail: 'معرف المنتج مطلوب' } };
  }

  execute('DELETE FROM products WHERE id = ?', [id]);
  notifyTableChange('products', 'delete', id);

  // تسجيل tombstone لكي يعرف تطبيق الموبايل أن المنتج حُذف عند المزامنة
  try {
    execute(
      "INSERT INTO sync_tombstones (id, table_name, record_id, deleted_at) VALUES (?, 'products', ?, datetime('now'))",
      [randomUUID(), id]
    );
  } catch {
    /* ignore non-blocking tombstone error */
  }

  return { success: true };
}
