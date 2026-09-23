// منطق CRUD العام — محرك التخزين الأساسي للجداول البسيطة (IPC + HTTP REST).
// مصنع عام للجداول: list/get/create/update/remove/bulk.
// يفوض معالجة الإعدادات والعملاء والموردين لمعالجات المجالات المتخصصة.

import { randomUUID } from 'node:crypto';
import {
  queryAll,
  queryOne,
  execute,
  transaction,
  serializeValue,
  toSnakeKey,
  tableHasColumn,
  getTableColumns,
  notifyTableChange,
  type Row,
} from './db-utils';
import { ensureCategoryExists } from './products';
import { normalizeSettingsPayload, getStoreSettings, updateStoreSettings } from './settings';
import { normalizePartyPayload } from './customers';

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
  payment: 'payments',
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
  filter?: Record<string, unknown>;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

/**
 * تسوية الحقول بحسب الجدول مع تفويض الجداول المتخصصة
 */
function normalizePayloadForTable(
  tableName: string,
  raw: Record<string, unknown>
): Record<string, unknown> {
  // تفويض جدول الإعدادات لمعالج settings.ts المتخصص
  if (tableName === 'settings') {
    return normalizeSettingsPayload(raw);
  }

  // تفويض العملاء والموردين لمعالج customers.ts المتخصص
  if (tableName === 'customers' || tableName === 'suppliers') {
    return normalizePartyPayload(raw);
  }

  const validCols = getTableColumns(tableName);
  const normalized: Record<string, unknown> = {};

  let data = raw;
  if (raw && typeof raw === 'object') {
    if ('data' in raw && raw.data && typeof raw.data === 'object') data = raw.data as Record<string, unknown>;
    else if ('product' in raw && raw.product && typeof raw.product === 'object') data = raw.product as Record<string, unknown>;
    else if ('category' in raw && raw.category && typeof raw.category === 'object') data = raw.category as Record<string, unknown>;
  }

  // تسوية المنتجات المتبقية في CRUD
  if (tableName === 'products') {
    if (data.name !== undefined || data.productName !== undefined || data.product_name !== undefined) {
      normalized.name = data.name ?? data.productName ?? data.product_name;
    }
    if (data.retailPrice !== undefined || data.retail_price !== undefined || data.price !== undefined) {
      normalized.retail_price = Number(data.retailPrice ?? data.retail_price ?? data.price ?? 0);
    }
    if (data.costPrice !== undefined || data.cost_price !== undefined || data.purchasePrice !== undefined) {
      normalized.cost_price = Number(data.costPrice ?? data.cost_price ?? data.purchasePrice ?? 0);
    }
    if (data.quantity !== undefined || data.qty !== undefined || data.stock !== undefined) {
      normalized.quantity = Number(data.quantity ?? data.qty ?? data.stock ?? 0);
    }
    if (data.barcode !== undefined) normalized.barcode = String(data.barcode);
    if (data.sku !== undefined) normalized.sku = String(data.sku);
    if (data.category !== undefined || data.category_name !== undefined) {
      const catName = String(data.category ?? data.category_name ?? '').trim();
      normalized.category = catName;
      if (catName && catName !== 'عام' && catName.toLowerCase() !== 'general') {
        const prefId = (data.categoryId ?? data.category_id) ? String(data.categoryId ?? data.category_id) : undefined;
        const catId = ensureCategoryExists(catName, prefId);
        if (catId) normalized.category_id = catId;
      }
    }
  }

  if (tableName === 'payments') {
    const cid = data.customerId ?? data.customer_id ?? data.partyId ?? data.party_id;
    if (cid !== undefined && cid !== null) {
      const strCid = String(cid);
      normalized.customer_id = strCid;
      normalized.party_id = strCid;
    }
    const pType = data.partyType ?? data.party_type;
    normalized.party_type = pType ? String(pType) : 'customer';
    if (data.amount !== undefined && data.amount !== null) {
      normalized.amount = Number(data.amount) || 0;
    }
    if (data.type !== undefined && data.type !== null) normalized.type = String(data.type);
    if (data.method !== undefined && data.method !== null) normalized.method = String(data.method);
    if (data.note !== undefined && data.note !== null) normalized.note = String(data.note || '');
  }

  if (tableName === 'sales') {
    const now = new Date().toISOString();
    normalized.date = String(data.date || data.createdAt || data.created_at || now);
    normalized.number = String(data.number || `INV-${Date.now().toString().slice(-6)}`);
    if (data.items !== undefined) {
      normalized.items = Array.isArray(data.items)
        ? JSON.stringify(data.items)
        : (typeof data.items === 'string' ? data.items : '[]');
    } else {
      normalized.items = '[]';
    }
    if (data.docType !== undefined || data.doc_type !== undefined) {
      normalized.doc_type = String(data.docType ?? data.doc_type ?? 'facture');
    }
    if (data.type !== undefined) {
      normalized.type = String(data.type || 'sale');
    }
    if (data.discountType !== undefined || data.discount_type !== undefined) {
      normalized.discount_type = String(data.discountType ?? data.discount_type ?? 'percent');
    }
    if (data.paymentMethod !== undefined || data.payment_method !== undefined) {
      normalized.payment_method = String(data.paymentMethod ?? data.payment_method ?? 'cash');
    }
    if (data.customerId !== undefined || data.customer_id !== undefined) {
      normalized.customer_id = String(data.customerId ?? data.customer_id ?? '');
    }
    if (data.customerName !== undefined || data.customer_name !== undefined) {
      normalized.customer_name = String(data.customerName ?? data.customer_name ?? '');
    }
    if (data.amountPaid !== undefined || data.amount_paid !== undefined || data.paidAmount !== undefined || data.paid_amount !== undefined) {
      normalized.amount_paid = Number(data.amountPaid ?? data.amount_paid ?? data.paidAmount ?? data.paid_amount ?? 0);
    }
    if (data.tvaAmount !== undefined || data.tva_amount !== undefined || data.tva !== undefined) {
      normalized.tva_amount = Number(data.tvaAmount ?? data.tva_amount ?? data.tva ?? 0);
    }
    if (data.subtotal !== undefined) {
      normalized.subtotal = Number(data.subtotal) || 0;
    }
    if (data.discount !== undefined) {
      normalized.discount = Number(data.discount) || 0;
    }
    if (data.total !== undefined) {
      normalized.total = Number(data.total) || 0;
    }
    if (data.status !== undefined) {
      normalized.status = String(data.status || 'paid');
    }
    if (data.soldBy !== undefined || data.sold_by !== undefined || data.cashierName !== undefined) {
      normalized.sold_by = String(data.soldBy ?? data.sold_by ?? data.cashierName ?? '');
    }
    if (data.cashSessionId !== undefined || data.cash_session_id !== undefined || data.sessionId !== undefined || data.session_id !== undefined) {
      normalized.cash_session_id = String(data.cashSessionId ?? data.cash_session_id ?? data.sessionId ?? data.session_id ?? '');
    }
    if (data.note !== undefined || data.notes !== undefined) {
      normalized.note = String(data.note ?? data.notes ?? '');
    }
  }

  // تمرير الحقول المطابقة لأعمدة SQLite
  for (const [key, val] of Object.entries(data)) {
    const snake = toSnakeKey(key);
    if (validCols.size === 0 || validCols.has(snake)) {
      if (normalized[snake] === undefined) normalized[snake] = val;
    } else if (validCols.has(key)) {
      if (normalized[key] === undefined) normalized[key] = val;
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
  const validCols = getTableColumns(tableName);
  let sql = `SELECT * FROM ${tableName}`;
  const params: unknown[] = [];
  const whereClauses: string[] = [];

  if (config?.searchFields && opts?.search) {
    const search = `%${opts.search}%`;
    const conditions = config.searchFields.map((f) => `${f} LIKE ?`);
    whereClauses.push(`(${conditions.join(' OR ')})`);
    params.push(...config.searchFields.map(() => search));
  }
  if (opts?.filter && typeof opts.filter === 'object') {
    for (const [key, val] of Object.entries(opts.filter)) {
      const snake = toSnakeKey(key);
      const col = validCols.has(snake) ? snake : validCols.has(key) ? key : null;
      if (!col) continue;

      if (val === null || val === undefined) {
        whereClauses.push(`${col} IS NULL`);
      } else if (typeof val === 'object' && val !== null) {
        const opObj = val as Record<string, unknown>;
        if ('gte' in opObj) { whereClauses.push(`${col} >= ?`); params.push(opObj.gte); }
        if ('lte' in opObj) { whereClauses.push(`${col} <= ?`); params.push(opObj.lte); }
        if ('gt' in opObj) { whereClauses.push(`${col} > ?`); params.push(opObj.gt); }
        if ('lt' in opObj) { whereClauses.push(`${col} < ?`); params.push(opObj.lt); }
        if ('neq' in opObj) { whereClauses.push(`${col} != ?`); params.push(opObj.neq); }
        if ('like' in opObj) { whereClauses.push(`${col} LIKE ?`); params.push(`%${opObj.like}%`); }
        if ('in' in opObj && Array.isArray(opObj.in)) {
          if (opObj.in.length > 0) {
            whereClauses.push(`${col} IN (${opObj.in.map(() => '?').join(',')})`);
            params.push(...opObj.in);
          } else {
            whereClauses.push('1 = 0');
          }
        }
      } else {
        whereClauses.push(`${col} = ?`);
        params.push(val);
      }
    }
  }
  if (opts?.from) {
    const dateCol = validCols.has('date') ? 'date' : validCols.has('created_at') ? 'created_at' : null;
    if (dateCol) {
      whereClauses.push(`${dateCol} >= ?`);
      params.push(opts.from);
    }
  }
  if (opts?.to) {
    const dateCol = validCols.has('date') ? 'date' : validCols.has('created_at') ? 'created_at' : null;
    if (dateCol) {
      whereClauses.push(`${dateCol} <= ?`);
      params.push(opts.to);
    }
  }

  if (whereClauses.length > 0) {
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  if (opts?.orderBy && validCols.has(toSnakeKey(opts.orderBy))) {
    const dir = (opts.orderDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${toSnakeKey(opts.orderBy)} ${dir}`;
  } else if (config?.listOrder) {
    sql += ` ORDER BY ${config.listOrder}`;
  } else if (validCols.has('created_at')) {
    sql += ` ORDER BY created_at DESC`;
  } else {
    sql += ` ORDER BY ${idField} ASC`;
  }

  if (opts?.limit) {
    sql += ` LIMIT ${Number(opts.limit)}`;
    if (opts?.offset) {
      sql += ` OFFSET ${Number(opts.offset)}`;
    }
  }

  const rows = queryAll(sql, params);
  const transformed = config ? rows.map((r) => transformRow(r, config)) : rows;
  return { data: transformed };
}

export async function getRow(
  rawTableName: string,
  id: unknown
): Promise<{ data: Record<string, unknown> | null }> {
  const tableName = resolveTableName(rawTableName);
  if (tableName === 'settings' && (id === 'default' || !id)) {
    return { data: getStoreSettings() };
  }

  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';

  let resolvedId: string | number | null = null;
  if (id !== null && typeof id === 'object') {
    const obj = id as Record<string, unknown>;
    resolvedId = (obj.id ?? obj.key ?? obj.code ?? obj.docType ?? obj.doc_type) as string | number | null;
  } else if (id !== undefined && id !== null) {
    resolvedId = id as string | number;
  }

  if (resolvedId === null || resolvedId === undefined || resolvedId === '' || resolvedId === 'undefined' || resolvedId === 'null') {
    return { data: null };
  }

  const row = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [resolvedId]);
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

  let newId: string | number | null = null;
  if (data[idField] !== undefined && data[idField] !== null && String(data[idField]).trim() !== '') {
    newId = data[idField] as string | number;
  } else {
    newId = randomUUID();
    data[idField] = newId;
  }

  const validCols = getTableColumns(tableName);
  const colMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(data)) {
    const snake = toSnakeKey(k);
    if (validCols.size === 0 || validCols.has(snake)) {
      colMap.set(snake, v);
    } else if (validCols.has(k)) {
      colMap.set(k, v);
    }
  }

  const cols = Array.from(colMap.keys());
  const placeholders = cols.map(() => '?').join(', ');
  const vals = cols.map((col) => serializeValue(colMap.get(col)));

  execute(
    `INSERT INTO ${tableName} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
    vals
  );

  notifyTableChange(tableName, 'create', String(newId));
  const created = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [newId]);
  return { data: created ? (config ? transformRow(created, config) : created) : null };
}

export async function updateRow(
  rawTableName: string,
  id: unknown,
  rawData: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null }> {
  const tableName = resolveTableName(rawTableName);

  if (tableName === 'settings') {
    return updateStoreSettings(rawData);
  }

  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';

  let resolvedId: string | number | null = null;
  if (id !== null && typeof id === 'object') {
    const obj = id as Record<string, unknown>;
    resolvedId = (obj.id ?? obj.key ?? obj.code ?? obj.docType ?? obj.doc_type) as string | number | null;
  } else if (id !== undefined && id !== null) {
    resolvedId = id as string | number;
  }

  if (resolvedId === undefined || resolvedId === null || resolvedId === '') {
    throw new Error(`update على "${tableName}": قيمة المفتاح الأساسي (${idField}) مفقودة`);
  }
  const data = normalizePayloadForTable(tableName, rawData);
  const hasUpdatedAt = tableHasColumn(tableName, 'updated_at');
  const validCols = getTableColumns(tableName);

  const colMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(data)) {
    if (k === idField) continue;
    if (hasUpdatedAt && (k === 'updated_at' || k === 'updatedAt')) continue;
    const snake = toSnakeKey(k);
    if (validCols.size === 0 || validCols.has(snake)) {
      colMap.set(snake, v);
    } else if (validCols.has(k)) {
      colMap.set(k, v);
    }
  }

  const existingRow = queryOne(`SELECT ${idField} FROM ${tableName} WHERE ${idField} = ?`, [resolvedId]);
  if (!existingRow) {
    return createRow(tableName, { [idField]: resolvedId, ...data });
  }

  if (colMap.size === 0) {
    const currentRow = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [resolvedId]);
    return { data: currentRow ? (config ? transformRow(currentRow, config) : currentRow) : null };
  }

  const cols = Array.from(colMap.keys());
  const setClause = cols.map((c) => `"${c}" = ?`).join(', ');
  const vals = cols.map((col) => serializeValue(colMap.get(col)));

  if (hasUpdatedAt) {
    execute(`UPDATE ${tableName} SET ${setClause}, updated_at = ? WHERE ${idField} = ?`, [...vals, new Date().toISOString(), resolvedId]);
  } else {
    execute(`UPDATE ${tableName} SET ${setClause} WHERE ${idField} = ?`, [...vals, resolvedId]);
  }
  notifyTableChange(tableName, 'update', String(resolvedId));
  const updated = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [resolvedId]);
  return { data: updated ? (config ? transformRow(updated, config) : updated) : null };
}

export async function removeRow(
  rawTableName: string,
  id: unknown
): Promise<{ success: boolean }> {
  const tableName = resolveTableName(rawTableName);

  let resolvedId: string | number | null = null;
  if (id !== null && typeof id === 'object') {
    const obj = id as Record<string, unknown>;
    resolvedId = (obj.id ?? obj.key ?? obj.code ?? obj.docType ?? obj.doc_type) as string | number | null;
  } else if (id !== undefined && id !== null) {
    resolvedId = id as string | number;
  }

  if (resolvedId === null || resolvedId === undefined || resolvedId === '' || resolvedId === 'undefined' || resolvedId === 'null') {
    return { success: false };
  }

  if (tableName === 'users') {
    const target = queryOne('SELECT role FROM users WHERE id = ?', [resolvedId]);
    if (target?.role === 'developer') {
      throw new Error('لا يمكن حذف حساب مطور النظام');
    }
  }
  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  execute(`DELETE FROM ${tableName} WHERE ${idField} = ?`, [resolvedId]);
  notifyTableChange(tableName, 'delete', String(resolvedId));
  if (tableName !== 'sync_tombstones' && tableName !== 'sync_queue' && tableName !== 'device_sessions') {
    try {
      execute(
        `INSERT INTO sync_tombstones (id, table_name, record_id, deleted_at) VALUES (?, ?, ?, datetime('now'))`,
        [randomUUID(), tableName, String(resolvedId)]
      );
    } catch {
      /* ignore non-blocking tombstone error */
    }
  }
  return { success: true };
}

export async function countRows(
  rawTableName: string,
  filter?: Record<string, unknown>
): Promise<{ count: number }> {
  const tableName = resolveTableName(rawTableName);
  const validCols = getTableColumns(tableName);
  let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
  const params: unknown[] = [];
  const whereClauses: string[] = [];

  if (tableName === 'users' && !filter?.include_developer) {
    whereClauses.push("role != 'developer'");
  }

  if (filter && typeof filter === 'object') {
    for (const [key, val] of Object.entries(filter)) {
      const snake = toSnakeKey(key);
      if (validCols.has(snake)) {
        whereClauses.push(`${snake} = ?`);
        params.push(val);
      } else if (validCols.has(key)) {
        whereClauses.push(`${key} = ?`);
        params.push(val);
      }
    }
  }

  if (whereClauses.length > 0) {
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  const row = queryOne(sql, params);
  return { count: Number(row?.count ?? 0) };
}

export async function clearTable(rawTableName: string): Promise<{ success: boolean }> {
  const tableName = resolveTableName(rawTableName);
  execute(`DELETE FROM ${tableName}`);
  notifyTableChange(tableName, 'clear');
  return { success: true };
}

export async function bulkCreateRows(
  rawTableName: string,
  items: Record<string, unknown>[]
): Promise<{ success: boolean; insertedCount: number }> {
  const tableName = resolveTableName(rawTableName);
  if (!items || items.length === 0) return { success: true, insertedCount: 0 };

  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  let inserted = 0;

  transaction(() => {
    for (const raw of items) {
      const data = normalizePayloadForTable(tableName, raw);
      if (!data[idField]) {
        data[idField] = randomUUID();
      }
      const cols = Object.keys(data);
      const placeholders = cols.map(() => '?').join(', ');
      const vals = cols.map((k) => serializeValue(data[k]));
      execute(
        `INSERT OR REPLACE INTO ${tableName} (${cols.map((c) => `"${toSnakeKey(c)}"`).join(', ')}) VALUES (${placeholders})`,
        vals
      );
      inserted++;
    }
  });

  notifyTableChange(tableName, 'bulkCreate');
  return { success: true, insertedCount: inserted };
}

export async function bulkUpdateRows(
  rawTableName: string,
  items: Record<string, unknown>[]
): Promise<{ success: boolean; updatedCount: number }> {
  const tableName = resolveTableName(rawTableName);
  if (!items || items.length === 0) return { success: true, updatedCount: 0 };

  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  const hasUpdatedAt = tableHasColumn(tableName, 'updated_at');
  let updated = 0;

  transaction(() => {
    for (const raw of items) {
      const data = normalizePayloadForTable(tableName, raw);
      const rowId = data[idField];
      if (!rowId) continue;

      const entries = Object.entries(data).filter(([k]) => {
        if (k === idField) return false;
        if (hasUpdatedAt && (k === 'updated_at' || k === 'updatedAt')) return false;
        return true;
      });
      if (entries.length === 0) continue;

      const setClause = entries.map(([k]) => `"${toSnakeKey(k)}" = ?`).join(', ');
      const vals = entries.map(([, v]) => serializeValue(v));

      if (hasUpdatedAt) {
        execute(`UPDATE ${tableName} SET ${setClause}, updated_at = ? WHERE ${idField} = ?`, [...vals, new Date().toISOString(), rowId]);
      } else {
        execute(`UPDATE ${tableName} SET ${setClause} WHERE ${idField} = ?`, [...vals, rowId]);
      }
      updated++;
    }
  });

  notifyTableChange(tableName, 'bulkUpdate');
  return { success: true, updatedCount: updated };
}

export async function bulkGetRows(
  rawTableName: string,
  ids: string[]
): Promise<{ data: Record<string, unknown>[] }> {
  const tableName = resolveTableName(rawTableName);
  if (!ids || ids.length === 0) return { data: [] };

  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  const placeholders = ids.map(() => '?').join(', ');
  const rows = queryAll(`SELECT * FROM ${tableName} WHERE ${idField} IN (${placeholders})`, ids);
  return { data: config ? rows.map((r) => transformRow(r, config)) : rows };
}
