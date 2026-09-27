// أدوات مساعدة مشتركة للوصول إلى SQLite —
// تُستخدم من před IPC handlers ومن خادم HTTP REST على حد سواء.
// الهدف: تجنب تكرار queryAll/queryOne/execute + التحويلات في كل ملف.

import { getSqlite, getCachedStatement } from '../database';
import { initSchema } from '../schema-init';

export type Row = Record<string, string | number | null>;

let isRecoveringMissingTable = false;

/**
 * فحص أمان واسترداد ذاتي: إذا تم رصد خطأ "no such table" أثناء التشغيل،
 * يتم استدعاء initSchema تلقائياً مرة واحدة لإنشاء الجداول المفقودة وإعادة المحاولة.
 */
function handleMissingTableError(err: unknown): boolean {
  const errMsg = String((err as Error)?.message || err || '');
  if (errMsg.includes('no such table:') && !isRecoveringMissingTable) {
    try {
      isRecoveringMissingTable = true;
      console.warn(`[db-utils] ⚠️ تم رصد جدول غير موجود (${errMsg}). جاري محاولة الاستعادة التلقائية وتطبيق الهجرات...`);
      initSchema();
      console.log('[db-utils] ✅ تمت محاولة استعادة المخطط بنجاح.');
      return true;
    } catch (recErr) {
      console.error('[db-utils] ❌ فشلت محاولة استعادة المخطط التلقائية:', recErr);
    } finally {
      isRecoveringMissingTable = false;
    }
  }
  return false;
}

/**
 * تنفيذ SELECT متعدد الصفوف مع استرداد ذاتي
 */
export function queryAll(sql: string, params: unknown[] = []): Row[] {
  try {
    const stmt = getCachedStatement(sql);
    const safeParams = params.map(serializeValue);
    return stmt.all(...safeParams) as Row[];
  } catch (err) {
    if (handleMissingTableError(err)) {
      const stmt = getCachedStatement(sql);
      const safeParams = params.map(serializeValue);
      return stmt.all(...safeParams) as Row[];
    }
    throw err;
  }
}

/**
 * تنفيذ SELECT صف واحد مع استرداد ذاتي
 */
export function queryOne(sql: string, params: unknown[] = []): Row | null {
  try {
    const stmt = getCachedStatement(sql);
    const safeParams = params.map(serializeValue);
    const row = stmt.get(...safeParams) as Row | null;
    return row ?? null;
  } catch (err) {
    if (handleMissingTableError(err)) {
      const stmt = getCachedStatement(sql);
      const safeParams = params.map(serializeValue);
      const row = stmt.get(...safeParams) as Row | null;
      return row ?? null;
    }
    throw err;
  }
}

/**
 * تنفيذ INSERT/UPDATE/DELETE مع استرداد ذاتي
 */
export function execute(sql: string, params: unknown[] = []): void {
  try {
    const stmt = getCachedStatement(sql);
    const safeParams = params.map(serializeValue);
    stmt.run(...safeParams);
  } catch (err) {
    if (handleMissingTableError(err)) {
      const stmt = getCachedStatement(sql);
      const safeParams = params.map(serializeValue);
      stmt.run(...safeParams);
      return;
    }
    throw err;
  }
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

export function getTableColumns(tableName: string): Set<string> {
  let cols = tableColumnsCache.get(tableName);
  if (!cols) {
    const db = getSqlite();
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    cols = new Set(rows.map((r) => r.name));
    tableColumnsCache.set(tableName, cols);
  }
  return cols;
}

export function clearTableColumnsCache(tableName?: string): void {
  if (tableName) {
    tableColumnsCache.delete(tableName);
  } else {
    tableColumnsCache.clear();
  }
}

export function tableHasColumn(tableName: string, columnName: string): boolean {
  return getTableColumns(tableName).has(columnName);
}


export type TableChangeSubscriber = (tableName: string, action: string, id?: string) => void;
const tableChangeSubscribers = new Set<TableChangeSubscriber>();

/**
 * تسجيل مستمع للأحداث الداخلية لتغييرات جداول SQLite (مثل خادم بث الأحداث Event Bus للشبكة المحلية)
 */
export function subscribeToTableChanges(subscriber: TableChangeSubscriber): () => void {
  tableChangeSubscribers.add(subscriber);
  return () => {
    tableChangeSubscribers.delete(subscriber);
  };
}

/**
 * إشعار واجهة React (Renderer) فوراً بأي تعديل أو كتابة تمت على جدول في SQLite
 */
export function notifyTableChange(tableName: string, action: string = "update", id?: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electron = require("electron");
    const BrowserWindow = electron?.BrowserWindow;
    if (BrowserWindow && typeof BrowserWindow.getAllWindows === "function") {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send("db:table-updated", { table: tableName, action, id });
        }
      }
    }
  } catch {
    // non-blocking
  }

  // إشعار المشتركين الداخليين (مثل محرك بث الأحداث Event Bus للشبكة المحلية)
  for (const sub of tableChangeSubscribers) {
    try {
      sub(tableName, action, id);
    } catch (subErr) {
      console.warn('[db-utils] خطأ في معالج تغيير الجدول المشترك:', subErr);
    }
  }
}

