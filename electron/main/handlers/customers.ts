// معالج العملاء والموردين — معالج مجال متخصص (Domain Handler)
// يستخرج المنطق وتسوية حقول العملاء والموردين من crud.ts إلى وحدة ذات أمان عالي للأنواع

import { randomUUID } from 'node:crypto';
import { queryAll, queryOne, execute, notifyTableChange, type Row } from './db-utils';

export interface CustomerPayload {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  balance?: number;
  [key: string]: unknown;
}

/**
 * تسوية حقول العميل أو المورد مع الأسماء البديلة (e.g. notes vs note)
 */
export function normalizePartyPayload(raw: Record<string, unknown>): Record<string, unknown> {
  let data = raw;
  if (raw && typeof raw === 'object' && 'data' in raw && raw.data && typeof raw.data === 'object') {
    data = raw.data as Record<string, unknown>;
  }

  const normalized: Record<string, unknown> = {};

  if (data.name !== undefined) normalized.name = String(data.name).trim();
  if (data.phone !== undefined) normalized.phone = String(data.phone).trim();
  if (data.email !== undefined) normalized.email = String(data.email).trim();
  if (data.address !== undefined) normalized.address = String(data.address).trim();

  if (data.notes !== undefined || data.note !== undefined) {
    normalized.notes = String(data.notes ?? data.note ?? '').trim();
  }

  if (data.balance !== undefined) {
    normalized.balance = Number(data.balance) || 0;
  }

  // تمرير أي حقول إضافية غير مكررة
  for (const [key, val] of Object.entries(data)) {
    if (!(key in normalized)) {
      normalized[key] = val;
    }
  }

  return normalized;
}

/**
 * جلب قائمة العملاء
 */
export function listCustomers(opts?: { search?: string; limit?: number; offset?: number }): { data: Row[]; total: number } {
  let sql = 'SELECT * FROM customers';
  const params: unknown[] = [];

  if (opts?.search?.trim()) {
    sql += ' WHERE name LIKE ? OR phone LIKE ?';
    const term = `%${opts.search.trim()}%`;
    params.push(term, term);
  }

  sql += ' ORDER BY name ASC';

  if (opts?.limit) {
    sql += ' LIMIT ?';
    params.push(Number(opts.limit));
    if (opts?.offset) {
      sql += ' OFFSET ?';
      params.push(Number(opts.offset));
    }
  }

  const data = queryAll(sql, params);
  const totalRow = queryOne('SELECT COUNT(*) as count FROM customers');
  return { data, total: Number(totalRow?.count || data.length) };
}

/**
 * جلب عميل بالمعرف
 */
export function getCustomer(id: string): Row | null {
  return queryOne('SELECT * FROM customers WHERE id = ?', [id]);
}

/**
 * إنشاء عميل جديد
 */
export function createCustomer(raw: CustomerPayload): { data: Row | null; error?: { status: number; detail: string } } {
  const norm = normalizePartyPayload(raw);
  const id = (norm.id as string) || randomUUID();
  norm.id = id;

  const cols = Object.keys(norm);
  const placeholders = cols.map(() => '?').join(', ');
  const values = cols.map((c) => norm[c]);

  try {
    execute(`INSERT INTO customers (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`, values);
    notifyTableChange('customers', 'create', id);
    return { data: getCustomer(id) };
  } catch (err) {
    return { data: null, error: { status: 400, detail: (err as Error).message } };
  }
}

/**
 * تحديث بيانات عميل
 */
export function updateCustomer(id: string, raw: CustomerPayload): { data: Row | null; error?: { status: number; detail: string } } {
  const norm = normalizePartyPayload(raw);
  delete norm.id;

  const cols = Object.keys(norm);
  if (cols.length === 0) return { data: getCustomer(id) };

  const setClauses = cols.map((c) => `"${c}" = ?`).join(', ');
  const values = cols.map((c) => norm[c]);
  values.push(id);

  try {
    execute(`UPDATE customers SET ${setClauses} WHERE id = ?`, values);
    notifyTableChange('customers', 'update', id);
    return { data: getCustomer(id) };
  } catch (err) {
    return { data: null, error: { status: 400, detail: (err as Error).message } };
  }
}
