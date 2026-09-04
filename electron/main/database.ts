// تهيئة قاعدة البيانات — node:sqlite + drizzle-orm/sqlite-proxy
// node:sqlite مدمج في Node 22+ و Electron 43+ (لا يحتاج تجميعاً أصلياً)
// drizzle-orm/sqlite-proxy يأخذ callback مخصص لتنفيذ الاستعلامات

import { DatabaseSync } from 'node:sqlite';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import * as schema from '../drizzle/schema';
import path from 'node:path';
import { app } from 'electron';
import fs from 'node:fs';

export type DB = SqliteRemoteDatabase<typeof schema>;

let dbInstance: DB | null = null;
let sqliteInstance: DatabaseSync | null = null;

/**
 * نوع نتيجة تنفيذ استعلام — يطابق ما يتوقعه sqlite-proxy
 */
interface QueryResult {
  rows: unknown[];
}

/**
 * تحويل قيمة SQLite إلى قيمة JS:
 * - الأعمدة INTEGER المخزنة كـ 0/1 → boolean (للحقول المنطقية)
 * - باقي القيم تُترك كما هي
 */
function normalizeRow(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return null;
  // node:sqlite يُرجع كائنات null-prototype — نحوّلها إلى كائن عادي
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    result[key] = value;
  }
  return result;
}

/**
 * تنفيذ استعلام SQL عبر node:sqlite وتحويل النتيجة لصيغة sqlite-proxy
 *
 * الطرق:
 * - "run": INSERT/UPDATE/DELETE → تُرجع {rows: []} (sqlite-proxy يتجاهل changes/lastInsertRowid هنا)
 * - "all": SELECT متعدد → تُرجع {rows: [...]}
 * - "get": SELECT صف واحد → تُرجع {rows: [row]} أو {rows: []}
 * - "values": SELECT بصيغة raw arrays → تُرجع {rows: [...]}
 *
 * ملاحظة: لاحظ أن node:sqlite تستخدم ? للـ placeholders وتمرّرها كـ spread args.
 */
type StatementSync = ReturnType<DatabaseSync['prepare']>;
const statementCache = new Map<string, StatementSync>();
const MAX_STATEMENTS = 300;

export function getCachedStatement(sql: string): StatementSync {
  if (!sqliteInstance) throw new Error('Database not initialized. Call initDatabase() first.');
  let stmt = statementCache.get(sql);
  if (!stmt) {
    stmt = sqliteInstance.prepare(sql);
    if (statementCache.size >= MAX_STATEMENTS) {
      const oldestKey = statementCache.keys().next().value;
      if (oldestKey) statementCache.delete(oldestKey);
    }
    statementCache.set(sql, stmt);
  }
  return stmt;
}

/**
 * تنفيذ استعلام SQL عبر node:sqlite وتحويل النتيجة لصيغة sqlite-proxy
 *
 * الطرق:
 * - "run": INSERT/UPDATE/DELETE → تُرجع {rows: []} (sqlite-proxy يتجاهل changes/lastInsertRowid هنا)
 * - "all": SELECT متعدد → تُرجع {rows: [...]}
 * - "get": SELECT صف واحد → تُرجع {rows: [row]} أو {rows: []}
 * - "values": SELECT بصيغة raw arrays → تُرجع {rows: [...]}
 *
 * ملاحظة: لاحظ أن node:sqlite تستخدم ? للـ placeholders وتمرّرها كـ spread args.
 */
function executeQuery(sql: string, params: unknown[], method: 'run' | 'all' | 'values' | 'get'): QueryResult {
  if (!sqliteInstance) throw new Error('Database not initialized. Call initDatabase() first.');

  const stmt = getCachedStatement(sql);

  if (method === 'run') {
    stmt.run(...params);
    return { rows: [] };
  }

  if (method === 'all') {
    const rows = stmt.all(...params);
    return { rows: rows.map(normalizeRow) };
  }

  if (method === 'get') {
    const row = stmt.get(...params);
    return { rows: row ? [normalizeRow(row)] : [] };
  }

  // method === 'values' — تُرجع صفوف كـ arrays وليس objects
  const rows = stmt.all(...params);
  return { rows: rows.map(normalizeRow) };
}

/**
 * تهيئة قاعدة البيانات:
 * 1. تحديد مسار ملف SQLite في userData
 * 2. فتح الاتصال + ضبط PRAGMAs
 * 3. تهيئة Drizzle مع callback التنفيذ
 * 4. تشغيل migrations (إنشاء الجداول)
 */
export function initDatabase(): DB {
  if (dbInstance) return dbInstance;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'an-pos.db');

  // التأكد من وجود المجلد
  fs.mkdirSync(userDataPath, { recursive: true });

  // فتح قاعدة البيانات
  // node:sqlite: DatabaseSync(path, options)
  sqliteInstance = new DatabaseSync(dbPath);

  // PRAGMAs — حزمة تسريع فائقة لبيئة الإنتاج والـ POS
  sqliteInstance.exec('PRAGMA journal_mode = WAL;');
  sqliteInstance.exec('PRAGMA synchronous = NORMAL;');   // تسريع عمليات الكتابة والتخزين بمعدل 10x مع أمان كامل
  sqliteInstance.exec('PRAGMA cache_size = -64000;');    // حجز 64MB لذاكرة الكاش في الرام
  sqliteInstance.exec('PRAGMA temp_store = MEMORY;');    // الفرز والجداول المؤقتة في الذاكرة
  sqliteInstance.exec('PRAGMA mmap_size = 268435456;');  // استخدام 256MB Memory-Mapped I/O للقراءة السريعة
  sqliteInstance.exec('PRAGMA foreign_keys = ON;');
  sqliteInstance.exec('PRAGMA busy_timeout = 5000;');

  // إنشاء Drizzle مع callback التنفيذ
  dbInstance = drizzle(executeQuery, { schema });

  return dbInstance;
}

/**
 * الحصول على نسخة Drizzle (يجب استدعاء initDatabase أولاً)
 */
export function getDb(): DB {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

/**
 * الحصول على نسخة node:sqlite الخام (لتنفيذ DDL / PRAGMA)
 */
export function getSqlite(): DatabaseSync {
  if (!sqliteInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return sqliteInstance;
}

/**
 * تنفيذ سلسلة عبارات SQL (للـ migrations / DDL)
 */
export function execSql(sql: string): void {
  if (!sqliteInstance) throw new Error('Database not initialized.');
  sqliteInstance.exec(sql);
}

/**
 * إغلاق قاعدة البيانات بأمان
 */
export function closeDatabase(): void {
  if (sqliteInstance) {
    statementCache.clear();
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
  }
}
