// معالج العبوات والباقات — دوال قابلة لإعادة الاستخدام (IPC + HTTP REST).
// يتعامل مباشرة مع SQLite (المرجعية المشتركة) ويوفر تحويل بنود الحزم (items) بين JSON وكائنات JavaScript.
// يتوافق مع ipc/packs.ts وخادم المزامنة.

import { randomUUID } from 'node:crypto';
import {
  queryAll,
  queryOne,
  execute,
  notifyTableChange,
  type Row,
} from './db-utils';

/**
 * تحويل صف العبوة من SQLite إلى كائن الواجهة
 */
export function transformPackFromDB(row: Row): Record<string, unknown> {
  let items: unknown[] = [];
  if (typeof row.items === 'string') {
    try {
      items = JSON.parse(row.items);
    } catch {
      items = [];
    }
  } else if (Array.isArray(row.items)) {
    items = row.items;
  }

  const price = Number(row.pack_price ?? row.packPrice ?? 0);

  return {
    id: row.id as string,
    name: (row.name as string) || '',
    barcode: (row.barcode as string) || '',
    packPrice: price,
    pack_price: price,
    items,
    status: (row.status as string) || 'active',
    createdAt: (row.created_at as string) || '',
    updatedAt: (row.updated_at as string) || '',
  };
}

/**
 * تحويل بيانات العبوة من الواجهة إلى حقول SQLite
 */
function normalizePackForDB(raw: Record<string, unknown>): Record<string, unknown> {
  const norm: Record<string, unknown> = {};

  if (raw.name !== undefined) norm.name = String(raw.name).trim();
  if (raw.barcode !== undefined) norm.barcode = String(raw.barcode).trim();

  if (raw.packPrice !== undefined || raw.pack_price !== undefined) {
    norm.pack_price = Number(raw.packPrice ?? raw.pack_price ?? 0);
  }

  if (raw.items !== undefined) {
    if (typeof raw.items === 'string') {
      norm.items = raw.items;
    } else {
      norm.items = JSON.stringify(raw.items || []);
    }
  }

  if (raw.status !== undefined) {
    norm.status = String(raw.status).trim() || 'active';
  }

  return norm;
}

export interface ListPacksOptions {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * جلب قائمة العبوات
 */
export async function listPacks(opts: ListPacksOptions = {}): Promise<{ data: Record<string, unknown>[] }> {
  let sql = 'SELECT * FROM packs WHERE 1=1';
  const params: unknown[] = [];

  if (opts.status) {
    sql += ' AND status = ?';
    params.push(opts.status);
  }

  if (opts.search?.trim()) {
    const q = `%${opts.search.trim()}%`;
    sql += ' AND (name LIKE ? OR barcode LIKE ?)';
    params.push(q, q);
  }

  sql += ' ORDER BY created_at DESC';

  if (opts.limit && opts.limit > 0) {
    sql += ' LIMIT ?';
    params.push(opts.limit);
    if (opts.offset && opts.offset > 0) {
      sql += ' OFFSET ?';
      params.push(opts.offset);
    }
  }

  const rows = queryAll(sql, params);
  return { data: rows.map(transformPackFromDB) };
}

/**
 * جلب عبوة محددة بالمعرف
 */
export async function getPack(id: string): Promise<{ data: Record<string, unknown> | null }> {
  if (!id) return { data: null };
  const row = queryOne('SELECT * FROM packs WHERE id = ?', [id]);
  return { data: row ? transformPackFromDB(row) : null };
}

/**
 * البحث عن عبوة بالباركود
 */
export async function getPackByBarcode(barcode: string): Promise<{ data: Record<string, unknown> | null }> {
  const code = String(barcode ?? '').trim();
  if (!code) return { data: null };
  const row = queryOne('SELECT * FROM packs WHERE barcode = ?', [code]);
  return { data: row ? transformPackFromDB(row) : null };
}

/**
 * إنشاء عبوة جديدة في SQLite
 */
export async function createPack(
  data: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error?: { status: number; detail: string } }> {
  const name = String(data.name || '').trim();
  if (!name) {
    return { data: null, error: { status: 422, detail: 'اسم العبوة مطلوب' } };
  }

  const barcode = String(data.barcode || '').trim();
  if (barcode) {
    // التحقق من تفرد الباركود مع جدول المنتجات وجدول العبوات
    const duplicatePack = queryOne('SELECT id FROM packs WHERE barcode = ?', [barcode]);
    if (duplicatePack) {
      return { data: null, error: { status: 409, detail: 'الباركود مسجل مسبقاً لعبوة أخرى' } };
    }
    const duplicateProduct = queryOne('SELECT id FROM products WHERE barcode = ?', [barcode]);
    if (duplicateProduct) {
      return { data: null, error: { status: 409, detail: 'الباركود مسجل مسبقاً لمنتج أساسي' } };
    }
  }

  const id = (data.id as string) || randomUUID();
  const now = new Date().toISOString();
  const norm = normalizePackForDB(data);

  norm.id = id;
  norm.created_at = (data.createdAt as string) || now;
  norm.updated_at = (data.updatedAt as string) || now;
  if (norm.items === undefined) norm.items = '[]';
  if (norm.pack_price === undefined) norm.pack_price = 0;
  if (norm.status === undefined) norm.status = 'active';

  const cols = Object.keys(norm);
  const vals = Object.values(norm);
  const placeholders = cols.map(() => '?').join(', ');

  execute(`INSERT INTO packs (${cols.join(', ')}) VALUES (${placeholders})`, vals);
  notifyTableChange('packs', 'create', id);

  const created = queryOne('SELECT * FROM packs WHERE id = ?', [id]);
  return { data: created ? transformPackFromDB(created) : null };
}

/**
 * تحديث عبوة موجودة في SQLite
 */
export async function updatePack(
  id: string,
  data: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error?: { status: number; detail: string } }> {
  if (!id) {
    return { data: null, error: { status: 422, detail: 'معرف العبوة مطلوب' } };
  }

  const existing = queryOne('SELECT id FROM packs WHERE id = ?', [id]);
  if (!existing) {
    return createPack({ ...data, id });
  }

  const barcode = data.barcode !== undefined ? String(data.barcode).trim() : undefined;
  if (barcode) {
    const duplicatePack = queryOne('SELECT id FROM packs WHERE barcode = ? AND id != ?', [barcode, id]);
    if (duplicatePack) {
      return { data: null, error: { status: 409, detail: 'الباركود مسجل مسبقاً لعبوة أخرى' } };
    }
    const duplicateProduct = queryOne('SELECT id FROM products WHERE barcode = ?', [barcode]);
    if (duplicateProduct) {
      return { data: null, error: { status: 409, detail: 'الباركود مسجل مسبقاً لمنتج أساسي' } };
    }
  }

  const norm = normalizePackForDB(data);
  delete norm.id;
  norm.updated_at = new Date().toISOString();

  const entries = Object.entries(norm);
  if (entries.length === 0) {
    return getPack(id);
  }

  const setClause = entries.map(([k]) => `${k} = ?`).join(', ');
  const vals = entries.map(([, v]) => v);

  execute(`UPDATE packs SET ${setClause} WHERE id = ?`, [...vals, id]);
  notifyTableChange('packs', 'update', id);

  const updated = queryOne('SELECT * FROM packs WHERE id = ?', [id]);
  return { data: updated ? transformPackFromDB(updated) : null };
}

/**
 * حذف عبوة من SQLite وتسجيل tombstone للمزامنة
 */
export async function deletePack(id: string): Promise<{ success: boolean; error?: { status: number; detail: string } }> {
  if (!id) {
    return { success: false, error: { status: 422, detail: 'معرف العبوة مطلوب' } };
  }

  execute('DELETE FROM packs WHERE id = ?', [id]);
  notifyTableChange('packs', 'delete', id);

  // تسجيل tombstone لتطبيق الموبايل
  try {
    execute(
      "INSERT INTO sync_tombstones (id, table_name, record_id, deleted_at) VALUES (?, 'packs', ?, datetime('now'))",
      [randomUUID(), id]
    );
  } catch {
    /* ignore non-blocking tombstone error */
  }

  return { success: true };
}
