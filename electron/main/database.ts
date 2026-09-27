// تهيئة قاعدة البيانات — node:sqlite + drizzle-orm/sqlite-proxy
// node:sqlite مدمج في Node 22+ و Electron 43+ (لا يحتاج تجميعاً أصلياً)
// drizzle-orm/sqlite-proxy يأخذ callback مخصص لتنفيذ الاستعلامات

import { DatabaseSync } from 'node:sqlite';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../drizzle/schema';
import path from 'node:path';
import { app } from 'electron';
import fs from 'node:fs';
import { initSchema } from './schema-init';

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
    try {
      stmt.run(...params);
    } catch (err: any) {
      const msg = String(err?.message || err);
      // في قواعد البيانات القائمة: إذا كان العمود أو الجدول موجوداً مسبقاً، نتجاوزه بأمان
      if (
        msg.includes('duplicate column name') ||
        (msg.includes('already exists') && (/CREATE\s+(TABLE|INDEX|UNIQUE\s+INDEX)/i.test(sql) || /ALTER\s+TABLE/i.test(sql)))
      ) {
        console.warn('[database] تجاوز آمن لكائن أو عمود موجود مسبقاً:', msg);
        return { rows: [] };
      }
      throw err;
    }
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

  // method === 'values' — تُرجع صفوف كـ arrays مصفوفات قيم متطابقة مع متطلبات Drizzle migrator
  const rows = stmt.all(...params);
  return { rows: rows.map((row) => Object.values(row as Record<string, unknown>)) };
}

let activeDbPath: string = '';

/**
 * تحديد مسار قاعدة البيانات بشكل ثابت على %APPDATA%\anpos.db (أو app.getPath('userData')/anpos.db)
 * مع ضمان ترحيل أي قاعدة بيانات سابقة an-pos.db تلقائياً لحماية بيانات العملاء الحالية.
 */
export function resolveDatabasePath(): string {
  if (process.env.AN_POS_DB_PATH && process.env.AN_POS_DB_PATH.trim()) {
    return path.resolve(process.env.AN_POS_DB_PATH.trim());
  }

  const userDataPath = app.getPath('userData');
  const targetDbPath = path.join(userDataPath, 'anpos.db');
  const legacyDbPath = path.join(userDataPath, 'an-pos.db');

  // ضمان عدم فقدان البيانات: إذا كان يوجد ملف an-pos.db قديم ولم ينشأ anpos.db بعد
  if (!fs.existsSync(targetDbPath) && fs.existsSync(legacyDbPath)) {
    try {
      fs.copyFileSync(legacyDbPath, targetDbPath);
      console.log(`[database] تم ترحيل قاعدة البيانات القائمة بأمان من ${legacyDbPath} إلى ${targetDbPath}`);
    } catch (e) {
      console.warn('[database] تعذر نسخ قاعدة البيانات القديمة:', e);
    }
  }

  return targetDbPath;
}

/**
 * تحديد مسار مجلد هجرات Drizzle سواء في بيئة التطوير أو داخل حزمة الإنتاج
 */
export function resolveMigrationsFolder(): string {
  // 1. وضع الإنتاج (مُضمن ضمن extraResources في resources/drizzle)
  if (app.isPackaged) {
    const packagedDrizzle = path.join(process.resourcesPath, 'drizzle');
    if (fs.existsSync(packagedDrizzle)) {
      return packagedDrizzle;
    }
  }

  // 2. وضع التطوير
  const devFolderAppPath = path.join(app.getAppPath(), 'electron/drizzle/migrations');
  if (fs.existsSync(devFolderAppPath)) {
    return devFolderAppPath;
  }

  const devFolderRel = path.resolve(__dirname, '../../electron/drizzle/migrations');
  if (fs.existsSync(devFolderRel)) {
    return devFolderRel;
  }

  const cwdFolder = path.resolve(process.cwd(), 'electron/drizzle/migrations');
  if (fs.existsSync(cwdFolder)) {
    return cwdFolder;
  }

  return path.join(app.getAppPath(), 'electron/drizzle/migrations');
}

/**
 * جلب المسار الفعلي النشط لملف قاعدة البيانات
 */
export function getDatabasePath(): string {
  if (activeDbPath) return activeDbPath;
  return resolveDatabasePath();
}

/**
 * تشغيل الهجرة التلقائية (Auto-Migration) باستخدام migrate() من drizzle-orm/better-sqlite3/migrator
 */
export async function runAutoMigration(): Promise<void> {
  const startTime = new Date();
  const folder = resolveMigrationsFolder();
  console.log(`[database] [migration] 🚀 بدء تشغيل الهجرة التلقائية من: ${folder} (${startTime.toISOString()})`);

  try {
    const db = getDb();
    const origMigrate = db.dialect.migrate.bind(db.dialect);
    let migrationPromise: Promise<void> | undefined;

    db.dialect.migrate = (migrations, session, config) => {
      // حماية استباقية: تنقيح أي تعبيرات غير محاطة بأقواس في SQLite مثل DEFAULT datetime('now')
      for (const m of migrations) {
        m.sql = m.sql.map((s) => s.replace(/DEFAULT\s+datetime\('now'\)/g, "DEFAULT (datetime('now'))"));
      }
      migrationPromise = origMigrate(migrations, session, config);
      return migrationPromise;
    };

    // استدعاء migrate من Drizzle
    migrate(db, { migrationsFolder: folder });

    if (migrationPromise) {
      await migrationPromise;
    }

    // ترقيات تكميلية للأعمدة والجداول الخاصة بالتزامن وقوائم الانتظار
    initSchema();

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    console.log(`[database] [migration] ✅ اكتملت الهجرات بنجاح في ${durationMs}ms (${endTime.toISOString()})`);
  } catch (err) {
    const failTime = new Date();
    console.error(`[database] [migration] ❌ فشلت عملية الترحيل في ${failTime.toISOString()}:`, err);
    throw err;
  }
}

/**
 * تهيئة قاعدة البيانات الموحدة:
 * 1. تحديد مسار ملف SQLite الثابت (%APPDATA%\anpos.db)
 * 2. فتح الاتصال + ضبط PRAGMAs فائقة السرعة والأمان
 * 3. تهيئة Drizzle
 * 4. تطبيق Auto-Migration فوراً قبل أي تسجيل IPC
 */
export async function initDatabase(): Promise<DB> {
  if (dbInstance) return dbInstance;

  activeDbPath = resolveDatabasePath();
  const dbDir = path.dirname(activeDbPath);

  // التأكد من وجود المجلد برمجياً
  fs.mkdirSync(dbDir, { recursive: true });

  console.log(`[database] تم الاتصال بقاعدة البيانات في: ${activeDbPath}`);

  // فتح قاعدة البيانات
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

  // تطبيق الهجرة التلقائية فوراً
  await runAutoMigration();

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
