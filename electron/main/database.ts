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

let activeDbPath: string = '';

/**
 * تحديد مسار قاعدة البيانات وفق هرمية مرنة:
 * 1. متغير البيئة AN_POS_DB_PATH (للاختبار والتشغيل المخصص)
 * 2. ملف تهيئة البيئة an-pos-env.json (المولد بواسطة مثبت NSIS أو لوحة الإعدادات)
 * 3. المسار الافتراضي المعزول في userData: %APPDATA%\an-pos\an-pos.db
 */
export function resolveDatabasePath(): string {
  if (process.env.AN_POS_DB_PATH && process.env.AN_POS_DB_PATH.trim()) {
    return path.resolve(process.env.AN_POS_DB_PATH.trim());
  }

  const userDataPath = app.getPath('userData');
  const envConfigPath = path.join(userDataPath, 'an-pos-env.json');

  if (fs.existsSync(envConfigPath)) {
    try {
      const raw = fs.readFileSync(envConfigPath, 'utf-8');
      const cfg = JSON.parse(raw);
      if (cfg.dbPath && typeof cfg.dbPath === 'string' && cfg.dbPath.trim()) {
        return path.resolve(cfg.dbPath.trim());
      }
      if (cfg.dataDirectory && typeof cfg.dataDirectory === 'string' && cfg.dataDirectory.trim()) {
        return path.join(path.resolve(cfg.dataDirectory.trim()), 'an-pos.db');
      }
    } catch (e) {
      console.warn('[database] تعذر قراءة an-pos-env.json، الاعتماد على المسار الافتراضي:', e);
    }
  }

  return path.join(userDataPath, 'an-pos.db');
}

/**
 * جلب المسار الفعلي النشط لملف قاعدة البيانات
 */
export function getDatabasePath(): string {
  if (activeDbPath) return activeDbPath;
  return resolveDatabasePath();
}

/**
 * تهيئة قاعدة البيانات:
 * 1. تحديد مسار ملف SQLite (من البيئة أو الإعدادات أو userData)
 * 2. فتح الاتصال + ضبط PRAGMAs فائقة السرعة والأمان
 * 3. تهيئة Drizzle مع callback التنفيذ
 */
export function initDatabase(): DB {
  if (dbInstance) return dbInstance;

  activeDbPath = resolveDatabasePath();
  const dbDir = path.dirname(activeDbPath);

  // التأكد من وجود المجلد برمجياً
  fs.mkdirSync(dbDir, { recursive: true });

  console.log(`[database] تم الاتصال بقاعدة البيانات في: ${activeDbPath}`);

  // فتح قاعدة البيانات
  // node:sqlite: DatabaseSync(path, options)
  sqliteInstance = new DatabaseSync(activeDbPath);

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
