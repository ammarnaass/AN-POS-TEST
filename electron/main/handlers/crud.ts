// منطق CRUD العام — دوال قابلة لإعادة الاستخدام (IPC + HTTP REST).
// مصنع عام لكل الجداول: list/get/create/update/remove.

import { randomUUID } from 'node:crypto';
import {
  queryAll,
  queryOne,
  execute,
  serializeValue,
  toSnakeKey,
  tableHasColumn,
  getTableColumns,
  type Row,
} from './db-utils';

export interface CrudConfig {
  table: string;
  idField?: string;
  listOrder?: string;          // e.g. "created_at DESC"
  searchFields?: string[];     // أعمدة LIKE للبحث
  searchJoin?: string;
  jsonFields?: string[];       // أعمدة JSON تُحوّل من نص إلى كائن
  booleanFields?: string[];    // أعمدة 0/1 → boolean
}

/**
 * خريطة الأسماء المفردة والبديلة للجداول (Table Aliases)
 */
const TABLE_ALIASES: Record<string, string> = {
  product: 'products',
  category: 'categories',
  customer: 'customers',
  supplier: 'suppliers',
  sale: 'sales',
  expense: 'expenses',
  role: 'roles',
  user: 'users',
  warehouse: 'warehouses',
  pack: 'packs',
  promotion: 'promotions',
  printer: 'printers',
  stock_movement: 'stock_movements',
  inventory_count: 'inventory_counts',
  purchase: 'purchases',
  print_template: 'print_templates',
  connected_device: 'connected_devices',
};

export function resolveTableName(tableName: string): string {
  const lower = (tableName || '').toLowerCase().trim();
  return TABLE_ALIASES[lower] || lower;
}

/**
 * سجل إعدادات كل الجداول — يُملأ عبر registerCrud
 */
export const tableConfigs = new Map<string, CrudConfig>();

function transformRow(row: Row, config: CrudConfig): Record<string, unknown> {
  const obj: Record<string, unknown> = { ...row };
  if (config.jsonFields) {
    for (const f of config.jsonFields) {
      if (typeof obj[f] === 'string') {
        try { obj[f] = JSON.parse(obj[f] as string); } catch { /* اتركه */ }
      }
    }
  }
  if (config.booleanFields) {
    for (const f of config.booleanFields) {
      if (obj[f] !== null && obj[f] !== undefined) {
        obj[f] = Number(obj[f]) === 1;
      }
    }
  }
  return obj;
}

export function registerCrudConfig(config: CrudConfig): void {
  tableConfigs.set(config.table, config);
}

export interface ListOptions {
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/**
 * تعيين الأسماء الشائعة للحقول إلى أسماء أعمدة جدول SQLite الحقيقية
 */
function normalizePayloadForTable(
  tableName: string,
  raw: Record<string, unknown>
): Record<string, unknown> {
  const validCols = getTableColumns(tableName);
  const normalized: Record<string, unknown> = {};

  // Unpack wrappers if present
  let data = raw;
  if (raw && typeof raw === 'object') {
    if ('data' in raw && raw.data && typeof raw.data === 'object') data = raw.data as Record<string, unknown>;
    else if ('product' in raw && raw.product && typeof raw.product === 'object') data = raw.product as Record<string, unknown>;
    else if ('category' in raw && raw.category && typeof raw.category === 'object') data = raw.category as Record<string, unknown>;
    else if ('customer' in raw && raw.customer && typeof raw.customer === 'object') data = raw.customer as Record<string, unknown>;
    else if ('supplier' in raw && raw.supplier && typeof raw.supplier === 'object') data = raw.supplier as Record<string, unknown>;
  }

  // Field Aliases for Products
  if (tableName === 'products') {
    if (data.name !== undefined || data.productName !== undefined || data.product_name !== undefined) {
      normalized.name = data.name ?? data.productName ?? data.product_name;
    }
    if (data.retailPrice !== undefined || data.retail_price !== undefined || data.price !== undefined || data.selling_price !== undefined || data.sale_price !== undefined) {
      normalized.retail_price = Number(data.retailPrice ?? data.retail_price ?? data.price ?? data.selling_price ?? data.sale_price ?? 0);
    }
    if (data.costPrice !== undefined || data.cost_price !== undefined || data.purchasePrice !== undefined || data.purchase_price !== undefined) {
      normalized.cost_price = Number(data.costPrice ?? data.cost_price ?? data.purchasePrice ?? data.purchase_price ?? 0);
    }
    if (data.wholesalePrice !== undefined || data.wholesale_price !== undefined) {
      normalized.wholesale_price = Number(data.wholesalePrice ?? data.wholesale_price ?? 0);
    }
    if (data.wholesaleMinQty !== undefined || data.wholesale_min_qty !== undefined) {
      normalized.wholesale_min_qty = Number(data.wholesaleMinQty ?? data.wholesale_min_qty ?? 0);
    }
    if (data.quantity !== undefined || data.qty !== undefined || data.stock !== undefined) {
      normalized.quantity = Number(data.quantity ?? data.qty ?? data.stock ?? 0);
    }
    if (data.lowStockThreshold !== undefined || data.low_stock_threshold !== undefined || data.min_quantity !== undefined || data.minQuantity !== undefined) {
      normalized.low_stock_threshold = Number(data.lowStockThreshold ?? data.low_stock_threshold ?? data.min_quantity ?? data.minQuantity ?? 5);
    }
    if (data.reorderPoint !== undefined || data.reorder_point !== undefined) {
      normalized.reorder_point = Number(data.reorderPoint ?? data.reorder_point ?? 0);
    }
    if (data.maxStock !== undefined || data.max_stock !== undefined) {
      normalized.max_stock = Number(data.maxStock ?? data.max_stock ?? 0);
    }
    if (data.barcode !== undefined) normalized.barcode = String(data.barcode);
    if (data.sku !== undefined) normalized.sku = String(data.sku);
    if (data.category !== undefined || data.category_name !== undefined || data.categoryName !== undefined) {
      normalized.category = String(data.category ?? data.category_name ?? data.categoryName ?? '');
    }
    if (data.categoryId !== undefined || data.category_id !== undefined) {
      normalized.category_id = (data.categoryId ?? data.category_id) ? String(data.categoryId ?? data.category_id) : null;
    }
    if (data.unit !== undefined) normalized.unit = String(data.unit);
    if (data.status !== undefined) normalized.status = String(data.status);
    if (data.image !== undefined || data.imageUrl !== undefined || data.image_url !== undefined) {
      normalized.image = String(data.image ?? data.imageUrl ?? data.image_url ?? '');
    }
    if (data.variant !== undefined) normalized.variant = String(data.variant);
    if (data.expiryDate !== undefined || data.expiry_date !== undefined) {
      normalized.expiry_date = String(data.expiryDate ?? data.expiry_date ?? '');
    }
    if (data.batchNumber !== undefined || data.batch_number !== undefined) {
      normalized.batch_number = String(data.batchNumber ?? data.batch_number ?? '');
    }
    if (data.warehouseId !== undefined || data.warehouse_id !== undefined) {
      normalized.warehouse_id = String(data.warehouseId ?? data.warehouse_id ?? '');
    }
  }

  // Iterate over all keys and retain only columns that exist in SQLite schema
  for (const [key, val] of Object.entries(data)) {
    const snake = toSnakeKey(key);
    if (validCols.size === 0 || validCols.has(snake)) {
      if (normalized[snake] === undefined) {
        normalized[snake] = val;
      }
    } else if (validCols.has(key)) {
      if (normalized[key] === undefined) {
        normalized[key] = val;
      }
    }
  }

  return normalized;
}

export async function listRows(
  rawTableName: string,
  opts?: ListOptions
): Promise<{ data: Record<string, unknown>[] }> {
  const tableName = resolveTableName(rawTableName);
  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  const listOrder = config?.listOrder ?? `${idField} DESC`;
  let sql = `SELECT * FROM ${tableName}`;
  const params: unknown[] = [];

  if (config?.searchFields && opts?.search) {
    const search = `%${opts.search}%`;
    const conditions = config.searchFields.map((f) => `${f} LIKE ?`);
    sql += ` WHERE ${conditions.join(' OR ')}`;
    params.push(...config.searchFields.map(() => search));
  }
  if (opts?.from) {
    sql += (config?.searchFields && opts.search) ? ' AND date >= ?' : ' WHERE date >= ?';
    params.push(opts.from);
  }
  if (opts?.to) {
    const hasWhere = (config?.searchFields && opts.search) || opts.from;
    sql += hasWhere ? ' AND date <= ?' : ' WHERE date <= ?';
    params.push(`${opts.to}T23:59:59.999Z`);
  }
  sql += ` ORDER BY ${listOrder}`;
  if (opts?.limit) { sql += ' LIMIT ?'; params.push(opts.limit); }
  if (opts?.offset) { sql += ' OFFSET ?'; params.push(opts.offset); }

  const rows = queryAll(sql, params);
  return { data: config ? rows.map((r) => transformRow(r, config)) : rows };
}

export async function getRow(
  rawTableName: string,
  id: string
): Promise<{ data: Record<string, unknown> | null }> {
  const tableName = resolveTableName(rawTableName);
  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  const row = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [id]);
  if (!row) return { data: null };
  return { data: config ? transformRow(row, config) : row };
}

export async function createRow(
  rawTableName: string,
  rawData: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null }> {
  const tableName = resolveTableName(rawTableName);
  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  const data = normalizePayloadForTable(tableName, rawData);
  const id = (data[idField] as string) || (rawData[idField] as string) || randomUUID();
  const now = new Date().toISOString();

  if (tableHasColumn(tableName, 'created_at') && !data['created_at']) data['created_at'] = now;
  if (tableHasColumn(tableName, 'updated_at') && !data['updated_at']) data['updated_at'] = now;

  const entries = Object.entries(data).filter(([k]) => k !== idField);
  const cols = [idField, ...entries.map(([k]) => toSnakeKey(k))];
  const vals = [id, ...entries.map(([, v]) => serializeValue(v))];
  const placeholders = cols.map(() => '?').join(', ');

  execute(`INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`, vals);
  const created = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [id]);
  return { data: created ? (config ? transformRow(created, config) : created) : null };
}

export async function updateRow(
  rawTableName: string,
  id: string | undefined | null,
  rawData: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null }> {
  const tableName = resolveTableName(rawTableName);
  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  const resolvedId = id ?? (rawData[idField] as string | undefined);
  if (resolvedId === undefined || resolvedId === null || resolvedId === '') {
    throw new Error(`update على "${tableName}": قيمة المفتاح الأساسي (${idField}) مفقودة`);
  }
  const data = normalizePayloadForTable(tableName, rawData);
  const hasUpdatedAt = tableHasColumn(tableName, 'updated_at');

  const entries = Object.entries(data).filter(([k]) => {
    if (k === idField) return false;
    if (hasUpdatedAt && (k === 'updated_at' || k === 'updatedAt')) return false;
    return true;
  });

  const existingRow = queryOne(`SELECT ${idField} FROM ${tableName} WHERE ${idField} = ?`, [resolvedId]);
  if (!existingRow) {
    return createRow(tableName, { [idField]: resolvedId, ...data });
  }

  if (entries.length === 0) {
    const currentRow = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [resolvedId]);
    return { data: currentRow ? (config ? transformRow(currentRow, config) : currentRow) : null };
  }

  const setClause = entries.map(([k]) => `${toSnakeKey(k)} = ?`).join(', ');
  const vals = entries.map(([, v]) => serializeValue(v));

  if (hasUpdatedAt) {
    execute(`UPDATE ${tableName} SET ${setClause}, updated_at = ? WHERE ${idField} = ?`, [...vals, new Date().toISOString(), resolvedId]);
  } else {
    execute(`UPDATE ${tableName} SET ${setClause} WHERE ${idField} = ?`, [...vals, resolvedId]);
  }
  const updated = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [resolvedId]);
  return { data: updated ? (config ? transformRow(updated, config) : updated) : null };
}

export async function removeRow(
  rawTableName: string,
  id: string
): Promise<{ success: boolean }> {
  const tableName = resolveTableName(rawTableName);
  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  execute(`DELETE FROM ${tableName} WHERE ${idField} = ?`, [id]);
  if (tableName !== 'sync_tombstones' && tableName !== 'sync_queue' && tableName !== 'device_sessions') {
    try {
      execute(
        `INSERT INTO sync_tombstones (id, table_name, record_id, deleted_at) VALUES (?, ?, ?, datetime('now'))`,
        [randomUUID(), tableName, id]
      );
    } catch {
      /* ignore non-blocking tombstone error */
    }
  }
  return { success: true };
}

