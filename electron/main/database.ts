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

  let stmt: StatementSync;
  try {
    stmt = getCachedStatement(sql);
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (
      msg.includes('duplicate column name') ||
      (msg.includes('already exists') && (/CREATE\s+(TABLE|INDEX|UNIQUE\s+INDEX)/i.test(sql) || /ALTER\s+TABLE/i.test(sql)))
    ) {
      console.warn('[database] تجاوز آمن لكائن أو عمود موجود مسبقاً أثناء prepare:', msg);
      return { rows: [] };
    }
    throw err;
  }

  if (method === 'run') {
    try {
      stmt.run(...(params as any[]));
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
    const rows = stmt.all(...(params as any[]));
    return { rows: rows.map(normalizeRow) };
  }

  if (method === 'get') {
    const row = stmt.get(...(params as any[]));
    return { rows: row ? [normalizeRow(row)] : [] };
  }

  // method === 'values' — تُرجع صفوف كـ arrays مصفوفات قيم متطابقة مع متطلبات Drizzle migrator
  const rows = stmt.all(...(params as any[]));
  return { rows: rows.map((row) => Object.values(row as Record<string, unknown>)) };
}

let activeDbPath: string = '';

/**
 * تحديد مسار قاعدة البيانات بشكل ثابت على %APPDATA%\anpos.db (أو app.getPath('userData')/anpos.db)
 * مع ضمان ترحيل أي قاعدة بيانات سابقة an-pos.db تلقائياً لحماية بيانات العملاء الحالية.
 */
export function resolveDatabasePath(): string {
  if (process.env.AN_POS_DB_PATH && process.env.AN_POS_DB_PATH.trim() && process.env.AN_POS_DB_PATH.trim() !== 'undefined') {
    return path.resolve(process.env.AN_POS_DB_PATH.trim());
  }

  let userDataPath = '';
  try {
    userDataPath = (app?.getPath && app.getPath('userData')) || '';
  } catch {
    userDataPath = '';
  }
  if (!userDataPath || userDataPath === 'undefined') {
    userDataPath = path.resolve('src/test/tmp_installer_env');
  }
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
  if (app?.isPackaged) {
    const packagedDrizzle = path.join(process.resourcesPath, 'drizzle');
    if (fs.existsSync(packagedDrizzle)) {
      return packagedDrizzle;
    }
  }

  // 2. وضع التطوير
  if (app?.getAppPath) {
    const devFolderAppPath = path.join(app.getAppPath(), 'electron/drizzle/migrations');
    if (fs.existsSync(devFolderAppPath)) {
      return devFolderAppPath;
    }
  }

  const devFolderRel = path.resolve(__dirname, '../../electron/drizzle/migrations');
  if (fs.existsSync(devFolderRel)) {
    return devFolderRel;
  }

  const cwdFolder = path.resolve(process.cwd(), 'electron/drizzle/migrations');
  if (fs.existsSync(cwdFolder)) {
    return cwdFolder;
  }

  return app?.getAppPath ? path.join(app.getAppPath(), 'electron/drizzle/migrations') : cwdFolder;
}

/**
 * جلب المسار الفعلي النشط لملف قاعدة البيانات
 */
export function getDatabasePath(): string {
  if (activeDbPath) return activeDbPath;
  return resolveDatabasePath();
}

/**
 * إنشاء نسخة احتياطية ذرية (VACUUM INTO) قبل تشغيل هجرات المخطط لضمان Zero Data Loss (M6)
 */
export function createPreMigrationBackup(dbPath: string): string | null {
  if (!sqliteInstance || !fs.existsSync(dbPath)) return null;

  try {
    const stat = fs.statSync(dbPath);
    if (stat.size === 0) return null;

    // فحص ما إذا كانت هناك جداول فعلية تستحق النسخ الاحتياطي
    const tablesRow = sqliteInstance
      .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .get() as { count?: number };

    if (!tablesRow || Number(tablesRow.count) === 0) {
      return null; // قاعدة بيانات جديدة تماماً لم يتم إنشاء جداولها بعد
    }

    const dbDir = path.dirname(dbPath);
    const backupsDir = path.join(dbDir, 'backups');
    fs.mkdirSync(backupsDir, { recursive: true });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupFileName = `pre_migration_${timestamp}.db`;
    const backupFilePath = path.join(backupsDir, backupFileName);

    if (fs.existsSync(backupFilePath)) {
      try { fs.unlinkSync(backupFilePath); } catch { /* ignore */ }
    }

    // استخدام VACUUM INTO الذرية لإنشاء نسخة احتياطية موحدة ومفرغة من الـ WAL بأمان
    try {
      const sqlSafePath = backupFilePath.replace(/'/g, "''");
      sqliteInstance.exec(`VACUUM INTO '${sqlSafePath}';`);
      console.log(`[database] [migration] 🛡️ تم أخذ نسخة احتياطية ذرية قبل الهجرة: ${backupFilePath}`);
    } catch (vacuumErr) {
      console.warn('[database] [migration] تعذر أخذ نسخة VACUUM INTO، جاري النسخ المباشر:', vacuumErr);
      fs.copyFileSync(dbPath, backupFilePath);
      if (fs.existsSync(`${dbPath}-wal`)) {
        try {
          fs.copyFileSync(`${dbPath}-wal`, `${backupFilePath}-wal`);
        } catch { /* ignore */ }
      }
    }

    // تنظيف النسخ القديمة والاحتفاظ بآخر 10 نسخ قبل الترحيل فقط لتفادي استهلاك مساحة القرص
    try {
      const files = fs.readdirSync(backupsDir)
        .filter((f) => f.startsWith('pre_migration_') && f.endsWith('.db'))
        .sort();
      if (files.length > 10) {
        const toDelete = files.slice(0, files.length - 10);
        for (const file of toDelete) {
          try {
            fs.unlinkSync(path.join(backupsDir, file));
            if (fs.existsSync(path.join(backupsDir, `${file}-wal`))) {
              fs.unlinkSync(path.join(backupsDir, `${file}-wal`));
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore cleanup error */ }

    return backupFilePath;
  } catch (err) {
    console.warn('[database] [migration] تنبيه: تعذر أخذ نسخة احتياطية وقائية قبل الهجرة:', err);
    return null;
  }
}

/**
 * تشغيل الهجرة التلقائية (Auto-Migration) باستخدام migrate() من drizzle-orm/better-sqlite3/migrator
 */
export async function runAutoMigration(): Promise<void> {
  const startTime = new Date();
  const folder = resolveMigrationsFolder();
  console.log(`[database] [migration] 🚀 بدء تشغيل الهجرة التلقائية من: ${folder} (${startTime.toISOString()})`);

  const currentDbPath = getDatabasePath();
  const backupPath = createPreMigrationBackup(currentDbPath);

  try {
    const db = getDb() as any;
    const origMigrate = db.dialect.migrate.bind(db.dialect);
    let migrationPromise: Promise<void> | undefined;

    // تنظيف أي جدول مؤقت متبقٍ من محاولات سابقة فاشلة
    try {
      getSqlite().exec('DROP TABLE IF EXISTS `__new_sales`;');
    } catch {
      /* ignore */
    }

    db.dialect.migrate = (migrations: any, session: any, config: any) => {
      // حماية استباقية: تنقيح أي تعبيرات غير محاطة بأقواس في SQLite مثل DEFAULT datetime('now')
      // وحجب أي محاولة لإعادة بناء جدول sales عبر __new_sales حمايةً لبيانات العملاء والفواتير الحالية
      for (const m of migrations) {
        m.sql = m.sql
          .filter((s: string) => !s.includes('__new_sales'))
          .map((s: string) => s.replace(/DEFAULT\s+datetime\('now'\)/g, "DEFAULT (datetime('now'))"));
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

    // فحص سلامة قاعدة البيانات بعد اكتمال الهجرات (PRAGMA integrity_check)
    try {
      const integrityRow = getSqlite().prepare('PRAGMA integrity_check;').get() as Record<string, unknown> | undefined;
      const integrityValue = integrityRow ? Object.values(integrityRow)[0] : 'unknown';
      if (integrityValue === 'ok') {
        console.log('[database] [migration] ✅ فحص سلامة قاعدة البيانات (PRAGMA integrity_check): سليم 100% (ok)');
      } else {
        console.error(`[database] [migration] ⚠️ تحذير: فحص سلامة قاعدة البيانات أرجع: ${integrityValue}`);
      }
    } catch (checkErr) {
      console.warn('[database] [migration] تعذر تشغيل PRAGMA integrity_check:', checkErr);
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    console.log(`[database] [migration] ✅ اكتملت الهجرات بنجاح في ${durationMs}ms (${endTime.toISOString()})`);
  } catch (err) {
    const failTime = new Date();
    console.error(
      `[database] [migration] ❌ فشلت عملية الترحيل في ${failTime.toISOString()}.${backupPath ? ` تم حفظ نسخة احتياطية وقائية في: ${backupPath}` : ''}:`,
      err
    );
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
  dbInstance = drizzle(executeQuery as any, { schema });

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
