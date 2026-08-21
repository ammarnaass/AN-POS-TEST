// أدوات مساعدة مشتركة للوصول إلى SQLite —
// تُستخدم من před IPC handlers ومن خادم HTTP REST على حد سواء.
// الهدف: تجنب تكرار queryAll/queryOne/execute + التحويلات في كل ملف.

import { getSqlite } from '../database';

export type Row = Record<string, string | number | null>;

/**
 * تنفيذ SELECT متعدد الصفوف
 */
export function queryAll(sql: string, params: unknown[] = []): Row[] {
  const db = getSqlite();
  const stmt = db.prepare(sql);
  return stmt.all(...params) as Row[];
}

/**
 * تنفيذ SELECT صف واحد
 */
export function queryOne(sql: string, params: unknown[] = []): Row | null {
  const db = getSqlite();
  const stmt = db.prepare(sql);
  const row = stmt.get(...params) as Row | null;
  return row ?? null;
}

/**
 * تنفيذ INSERT/UPDATE/DELETE
 */
export function execute(sql: string, params: unknown[] = []): void {
  const db = getSqlite();
  const stmt = db.prepare(sql);
  stmt.run(...params);
}

/**
 * تنفيذ دالة داخل Transaction ذرية مع Rollback تلقائي عند الخطأ
 */
export function transaction<T>(fn: () => T): T {
  const db = getSqlite();
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch { /* ignore secondary rollback failure */ }
    throw error;
  }
}

/**
 * تحويل قيمة JS إلى قيمة SQLite:
 * - undefined → null
 * - boolean → 0/1
 * - object → JSON.stringify
 * - غير ذلك كما هو
 */
export function serializeValue(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

/**
 * تحويل camelCase → snake_case لأسماء الأعمدة عند الإرسال
 */
export function toSnakeKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * تحويل snake_case → camelCase للاستقبال
 */
export function toCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * تحويل كامل لكائن من snake_case → camelCase
 */
export function toCamelObj(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[toCamelKey(k)] = v;
  }
  return result;
}

/**
 * تحويل كامل لكائن من camelCase → snake_case
 */
export function toSnakeObj(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[toSnakeKey(k)] = v;
  }
  return result;
}

/**
 * كاش أعمدة كل جدول — لتفادي PRAGMA متكرر
 */
const tableColumnsCache = new Map<string, Set<string>>();

export function tableHasColumn(tableName: string, columnName: string): boolean {
  let cols = tableColumnsCache.get(tableName);
  if (!cols) {
    const db = getSqlite();
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    cols = new Set(rows.map((r) => r.name));
    tableColumnsCache.set(tableName, cols);
  }
  return cols.has(columnName);
}
