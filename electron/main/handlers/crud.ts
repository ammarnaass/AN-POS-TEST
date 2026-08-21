// منطق CRUD العام — دوال قابلة لإعادة الاستخدام (IPC + HTTP REST).
// مصنع عام لكل الجداول: list/get/create/update/remove.
// يمسي مزامنة مع ipc/crud.ts but as plain functions.

import { randomUUID } from 'node:crypto';
import {
  queryAll,
  queryOne,
  execute,
  serializeValue,
  toSnakeKey,
  tableHasColumn,
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

export async function listRows(
  tableName: string,
  opts?: ListOptions
): Promise<{ data: Record<string, unknown>[] }> {
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
  tableName: string,
  id: string
): Promise<{ data: Record<string, unknown> | null }> {
  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  const row = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [id]);
  if (!row) return { data: null };
  return { data: config ? transformRow(row, config) : row };
}

export async function createRow(
  tableName: string,
  data: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null }> {
  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  const id = (data[idField] as string) || randomUUID();
  const entries = Object.entries(data).filter(([k]) => k !== idField);
  const cols = [idField, ...entries.map(([k]) => toSnakeKey(k))];
  const vals = [id, ...entries.map(([, v]) => serializeValue(v))];
  const placeholders = cols.map(() => '?').join(', ');

  execute(`INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`, vals);
  const created = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [id]);
  return { data: created ? (config ? transformRow(created, config) : created) : null };
}

export async function updateRow(
  tableName: string,
  id: string | undefined | null,
  data: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null }> {
  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  const resolvedId = id ?? (data[idField] as string | undefined);
  if (resolvedId === undefined || resolvedId === null || resolvedId === '') {
    throw new Error(`update على "${tableName}": قيمة المفتاح الأساسي (${idField}) مفقودة`);
  }
  const hasUpdatedAt = tableHasColumn(tableName, 'updated_at');
  const entries = Object.entries(data).filter(([k]) => {
    if (k === idField) return false;
    if (hasUpdatedAt && k === 'updated_at') return false;
    return true;
  });
  const setClause = entries.map(([k]) => `${toSnakeKey(k)} = ?`).join(', ');
  const vals = entries.map(([, v]) => serializeValue(v));

  if (setClause.length === 0) {
    const currentRow = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [resolvedId]);
    return { data: currentRow ? (config ? transformRow(currentRow, config) : currentRow) : null };
  }

  if (hasUpdatedAt) {
    execute(`UPDATE ${tableName} SET ${setClause}, updated_at = ? WHERE ${idField} = ?`, [...vals, new Date().toISOString(), resolvedId]);
  } else {
    execute(`UPDATE ${tableName} SET ${setClause} WHERE ${idField} = ?`, [...vals, resolvedId]);
  }
  const updated = queryOne(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [resolvedId]);
  return { data: updated ? (config ? transformRow(updated, config) : updated) : null };
}

export async function removeRow(
  tableName: string,
  id: string
): Promise<{ success: boolean }> {
  const config = tableConfigs.get(tableName);
  const idField = config?.idField ?? 'id';
  execute(`DELETE FROM ${tableName} WHERE ${idField} = ?`, [id]);
  return { success: true };
}
