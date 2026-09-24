// تهيئة مخطط قاعدة البيانات عبر هجرات Drizzle التلقائية
// يجعل electron/drizzle/schema.ts هو المصدر الوحيد للحقيقة (Single Source of Truth)
// يعتمد على الهجرات المولدة بواسطة drizzle-kit والمجمعة في migrations.ts

import { execSql, getSqlite } from './database';
import { bundledMigrations } from '../drizzle/migrations';
import { clearTableColumnsCache } from './handlers/db-utils';

/**
 * تهيئة المخطط — تطبيق هجرات Drizzle المسجلة بأمان
 * يُستدعى مرة واحدة بعد initDatabase()
 */
export function initSchema(): void {
  const db = getSqlite();

  // 1. إنشاء جدول تتبع الهجرات إذا لم يكن موجوداً
  execSql(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    );
  `);

  // 2. التحقق مما إذا كانت قاعدة البيانات قائمة مسبقاً (تحتوي على جدول settings)
  const settingsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
  const isExistingDb = Boolean(settingsCheck);

  // 3. جلب الهجرات المنفذة مسبقاً
  const appliedRows = db.prepare("SELECT hash, created_at FROM __drizzle_migrations").all() as Array<{ hash: string; created_at: number }>;
  const appliedTimestamps = new Set(appliedRows.map((r) => Number(r.created_at)));

  // 4. تطبيق الهجرات بالترتيب الزمني
  for (const migration of bundledMigrations) {
    if (appliedTimestamps.has(migration.when)) {
      continue;
    }

    console.log(`[schema-init] 🚀 تطبيق هجرة Drizzle: ${migration.tag} (${migration.sqlStatements.length} عبارات SQL)...`);

    for (const statement of migration.sqlStatements) {
      if (!statement.trim()) continue;
      try {
        // تحويل CREATE TABLE / CREATE INDEX إلى صيغة IF NOT EXISTS لضمان أمان التشغيل على قواعد البيانات القائمة
        let safeSql = statement;
        if (/^CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i.test(safeSql)) {
          safeSql = safeSql.replace(/^CREATE\s+TABLE/i, 'CREATE TABLE IF NOT EXISTS');
        }
        if (/^CREATE\s+INDEX\s+(?!IF\s+NOT\s+EXISTS)/i.test(safeSql)) {
          safeSql = safeSql.replace(/^CREATE\s+INDEX/i, 'CREATE INDEX IF NOT EXISTS');
        }
        if (/^CREATE\s+UNIQUE\s+INDEX\s+(?!IF\s+NOT\s+EXISTS)/i.test(safeSql)) {
          safeSql = safeSql.replace(/^CREATE\s+UNIQUE\s+INDEX/i, 'CREATE UNIQUE INDEX IF NOT EXISTS');
        }

        execSql(safeSql);
      } catch (err) {
        // في حالة وجود كائن مسبقاً في قاعدة بيانات قائمة نتجاوزه بأمان
        if (isExistingDb && String(err).includes('already exists')) {
          continue;
        }
        console.warn(`[schema-init] تنبيه في عبارة هجرة (${migration.tag}):`, (err as Error).message);
      }
    }

    // تسجيل الهجرة كمنفذة
    try {
      db.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(migration.tag, migration.when);
    } catch {
      // تم التسجيل مسبقاً
    }
  }

  // 5. ترقيات أعمدة المزامنة التوافقية لقواعد البيانات القديمة (PRD §5.1)
  const syncTables = [
    'products', 'categories', 'product_barcodes', 'promotions', 'packs',
    'sales', 'sale_items', 'customers', 'payments', 'suppliers',
    'purchases', 'purchase_items', 'warehouses', 'stock_movements_v2',
  ];

  for (const tbl of syncTables) {
    try { execSql(`ALTER TABLE ${tbl} ADD COLUMN device_id TEXT DEFAULT '';`); } catch { /* موجود */ }
    try { execSql(`ALTER TABLE ${tbl} ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));`); } catch { /* موجود */ }
    try { execSql(`ALTER TABLE ${tbl} ADD COLUMN sync_version INTEGER DEFAULT 1;`); } catch { /* موجود */ }
    try { execSql(`ALTER TABLE ${tbl} ADD COLUMN deleted_at TEXT DEFAULT NULL;`); } catch { /* موجود */ }
  }

  // تصحيحات تكميلية آمنة
  try { execSql("ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE categories ADD COLUMN color TEXT NOT NULL DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE products ADD COLUMN category_id TEXT DEFAULT NULL;"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE suspended_orders ADD COLUMN customer_name TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE suspended_orders ADD COLUMN subtotal REAL DEFAULT 0;"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE suspended_orders ADD COLUMN total REAL DEFAULT 0;"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE settings ADD COLUMN allow_self_registration INTEGER NOT NULL DEFAULT 1;"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE settings ADD COLUMN default_role TEXT NOT NULL DEFAULT 'seller';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE settings ADD COLUMN design7_show_bottom_favorites INTEGER NOT NULL DEFAULT 1;"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE settings ADD COLUMN terminal_favorites_mode INTEGER NOT NULL DEFAULT 1;"); } catch { /* موجود */ }
  // حقول نمط التشغيل الموزع (خادم رئيسي / عميل محطة كاشير إضافية)
  try { execSql("ALTER TABLE settings ADD COLUMN terminal_role TEXT NOT NULL DEFAULT 'server';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE settings ADD COLUMN server_lan_url TEXT NOT NULL DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE settings ADD COLUMN terminal_code TEXT NOT NULL DEFAULT 'T01';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE settings ADD COLUMN client_token TEXT NOT NULL DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE settings ADD COLUMN client_device_id TEXT NOT NULL DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE connected_devices ADD COLUMN app_name TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE connected_devices ADD COLUMN app_version TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE connected_devices ADD COLUMN device_unique_id TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_devices_unique_id ON connected_devices(device_unique_id) WHERE device_unique_id != '';"); } catch { /* موجود */ }

  // تصحيحات تكميلية آمنة لجدول العملاء والموردين
  try { execSql("ALTER TABLE customers ADD COLUMN address TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE customers ADD COLUMN customer_type TEXT DEFAULT 'retail';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE customers ADD COLUMN email TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE customers ADD COLUMN notes TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE customers ADD COLUMN rc TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE customers ADD COLUMN nif TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE customers ADD COLUMN nis TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE suppliers ADD COLUMN address TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE suppliers ADD COLUMN email TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE suppliers ADD COLUMN notes TEXT DEFAULT '';"); } catch { /* موجود */ }
  clearTableColumnsCache();
}
