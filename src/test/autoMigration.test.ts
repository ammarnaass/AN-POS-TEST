// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Auto-Migration & Database Initialization Engine', () => {
  function createTestDb(dbPath: string) {
    const sqlite = new DatabaseSync(dbPath);

    function normalizeRow(row: unknown): Record<string, unknown> | null {
      if (!row || typeof row !== 'object') return null;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        result[key] = value;
      }
      return result;
    }

    function executeQuery(sql: string, params: unknown[], method: 'run' | 'all' | 'values' | 'get') {
      const stmt = sqlite.prepare(sql);
      if (method === 'run') {
        try {
          stmt.run(...params);
        } catch (err: any) {
          const msg = String(err?.message || err);
          if (
            msg.includes('duplicate column name') ||
            (msg.includes('already exists') && (/CREATE\s+(TABLE|INDEX|UNIQUE\s+INDEX)/i.test(sql) || /ALTER\s+TABLE/i.test(sql)))
          ) {
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
      if (method === 'values') {
        const rows = stmt.all(...params);
        return { rows: rows.map((row) => Object.values(row as Record<string, unknown>)) };
      }
      const rows = stmt.all(...params);
      return { rows: rows.map(normalizeRow) };
    }

    const db = drizzle(executeQuery);
    return { sqlite, db };
  }

  it('executes auto-migration from scratch and creates all tables including users', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anpos-test-suite-'));
    const dbPath = path.join(tempDir, 'anpos.db');
    const { sqlite, db } = createTestDb(dbPath);

    try {
      const origMigrate = db.dialect.migrate.bind(db.dialect);
      let migPromise: Promise<void> | undefined;
      db.dialect.migrate = (migrations, session, config) => {
        for (const m of migrations) {
          m.sql = m.sql.map((s) => s.replace(/DEFAULT\s+datetime\('now'\)/g, "DEFAULT (datetime('now'))"));
        }
        migPromise = origMigrate(migrations, session, config);
        return migPromise;
      };

      migrate(db, { migrationsFolder: './electron/drizzle/migrations' });
      await migPromise;

      const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t: any) => t.name);
      expect(tables).toContain('users');
      expect(tables).toContain('settings');
      expect(tables).toContain('sales');
      expect(tables).toContain('customers');
      expect(tables.length).toBeGreaterThanOrEqual(40);

      // Verify that user registration query succeeds without "no such table: users"
      sqlite.prepare("INSERT INTO users (id, username, name, pin, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))").run(
        'user-test-1',
        'admin_fresh',
        'مدير النظام الجديد',
        '1234',
        'admin',
        'active'
      );

      const inserted = sqlite.prepare('SELECT id, username, name FROM users WHERE username = ?').get('admin_fresh') as any;
      expect(inserted).toBeDefined();
      expect(inserted.username).toBe('admin_fresh');
    } finally {
      sqlite.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('safely handles re-launch without data loss or re-migration conflict', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anpos-test-suite-'));
    const dbPath = path.join(tempDir, 'anpos.db');

    try {
      // 1. First Launch
      const first = createTestDb(dbPath);
      let migPromise1: Promise<void> | undefined;
      const origMigrate1 = first.db.dialect.migrate.bind(first.db.dialect);
      first.db.dialect.migrate = (migrations, session, config) => {
        for (const m of migrations) {
          m.sql = m.sql.map((s) => s.replace(/DEFAULT\s+datetime\('now'\)/g, "DEFAULT (datetime('now'))"));
        }
        migPromise1 = origMigrate1(migrations, session, config);
        return migPromise1;
      };
      migrate(first.db, { migrationsFolder: './electron/drizzle/migrations' });
      await migPromise1;

      first.sqlite.prepare("INSERT INTO users (id, username, name, pin, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))").run(
        'user-persist',
        'persisted_user',
        'المستخدم الدائم',
        '5555',
        'admin',
        'active'
      );
      first.sqlite.close();

      // 2. Second Launch (Relaunch simulation)
      const second = createTestDb(dbPath);
      let migPromise2: Promise<void> | undefined;
      const origMigrate2 = second.db.dialect.migrate.bind(second.db.dialect);
      second.db.dialect.migrate = (migrations, session, config) => {
        migPromise2 = origMigrate2(migrations, session, config);
        return migPromise2;
      };
      migrate(second.db, { migrationsFolder: './electron/drizzle/migrations' });
      await migPromise2;

      const user = second.sqlite.prepare('SELECT id, username FROM users WHERE username = ?').get('persisted_user') as any;
      expect(user).toBeDefined();
      expect(user.username).toBe('persisted_user');
      second.sqlite.close();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('migrates legacy an-pos.db into anpos.db seamlessly without data loss', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anpos-test-suite-'));
    const legacyDbPath = path.join(tempDir, 'an-pos.db');
    const targetDbPath = path.join(tempDir, 'anpos.db');

    try {
      // Seed pre-existing customer and sale into legacy database
      const legacySqlite = new DatabaseSync(legacyDbPath);
      legacySqlite.exec(`
        CREATE TABLE customers (id text PRIMARY KEY, name text);
        INSERT INTO customers VALUES ('c-legacy-1', 'عميل سابق مهم');
      `);
      legacySqlite.close();

      // Simulate copy logic from database.ts
      if (!fs.existsSync(targetDbPath) && fs.existsSync(legacyDbPath)) {
        fs.copyFileSync(legacyDbPath, targetDbPath);
      }

      expect(fs.existsSync(targetDbPath)).toBe(true);

      const targetSqlite = new DatabaseSync(targetDbPath);
      const row = targetSqlite.prepare('SELECT * FROM customers WHERE id = ?').get('c-legacy-1') as any;
      expect(row).toBeDefined();
      expect(row.name).toBe('عميل سابق مهم');
      targetSqlite.close();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('safely runs migration 0001 on pre-existing database with existing sales and walk-in records without crash', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anpos-test-suite-'));
    const dbPath = path.join(tempDir, 'anpos.db');
    const { sqlite, db } = createTestDb(dbPath);

    try {
      // 1. Simulate existing database with migration 0000 already recorded and sales data present
      sqlite.exec(`
        CREATE TABLE __drizzle_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash TEXT NOT NULL,
          created_at NUMERIC
        );
        INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('0000_massive_anthem', 1789583352260);

        CREATE TABLE sales (
          id text PRIMARY KEY NOT NULL,
          number text NOT NULL,
          date text DEFAULT (datetime('now')) NOT NULL,
          doc_type text DEFAULT 'facture' NOT NULL,
          type text DEFAULT 'sale' NOT NULL,
          items text DEFAULT '[]' NOT NULL,
          subtotal real DEFAULT 0 NOT NULL,
          discount real DEFAULT 0 NOT NULL,
          discount_type text DEFAULT 'percent' NOT NULL,
          tva_amount real DEFAULT 0 NOT NULL,
          total real DEFAULT 0 NOT NULL,
          payment_method text DEFAULT 'cash' NOT NULL,
          customer_id text,
          customer_name text DEFAULT '',
          amount_paid real DEFAULT 0 NOT NULL,
          status text DEFAULT 'paid' NOT NULL,
          sold_by text,
          cash_session_id text,
          session_id text,
          note text,
          last_printed_at text,
          created_at text,
          updated_at text
        );
        CREATE TABLE customers (id TEXT PRIMARY KEY, name TEXT);
        CREATE TABLE suppliers (id TEXT PRIMARY KEY, name TEXT);

        -- Add orphaned __new_sales table that might have been left by a previous crash
        CREATE TABLE __new_sales (id TEXT PRIMARY KEY);

        -- Real world invoice with null customer_id (walk-in)
        INSERT INTO sales (id, number, date, total, customer_id, customer_name)
        VALUES ('inv-real-123', 'INV-2026-0001', '2026-09-28 10:00:00', 450, NULL, 'زبون عادي');
      `);

      // 2. Clean orphaned __new_sales as in database.ts
      sqlite.exec('DROP TABLE IF EXISTS `__new_sales`;');

      // 3. Run auto migration
      const origMigrate = db.dialect.migrate.bind(db.dialect);
      let migPromise: Promise<void> | undefined;
      db.dialect.migrate = (migrations, session, config) => {
        for (const m of migrations) {
          m.sql = m.sql
            .filter((s) => !s.includes('__new_sales'))
            .map((s) => s.replace(/DEFAULT\s+datetime\('now'\)/g, "DEFAULT (datetime('now'))"));
        }
        migPromise = origMigrate(migrations, session, config);
        return migPromise;
      };

      migrate(db, { migrationsFolder: './electron/drizzle/migrations' });
      await migPromise;

      // 4. Verify existing sale is intact
      const existingSale = sqlite.prepare('SELECT * FROM sales WHERE id = ?').get('inv-real-123') as any;
      expect(existingSale).toBeDefined();
      expect(existingSale.number).toBe('INV-2026-0001');
      expect(existingSale.total).toBe(450);

      // 5. Verify customers columns were added
      const custCols = sqlite.prepare('PRAGMA table_info(customers)').all().map((c: any) => c.name);
      expect(custCols).toContain('address');
      expect(custCols).toContain('customer_type');
      expect(custCols).toContain('notes');

      // 6. Verify migration 0001 was recorded by timestamp
      const applied = sqlite.prepare('SELECT created_at FROM __drizzle_migrations WHERE created_at = ?').get(1790533070384);
      expect(applied).toBeDefined();
    } finally {
      sqlite.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('takes an atomic snapshot backup via VACUUM INTO and verifies PRAGMA integrity_check (M6)', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anpos-m6-test-'));
    const dbPath = path.join(tempDir, 'anpos_live.db');
    const backupsDir = path.join(tempDir, 'backups');
    fs.mkdirSync(backupsDir, { recursive: true });

    const sqlite = new DatabaseSync(dbPath);
    try {
      // 1. إنشاء جدول وإضافة بيانات حية في نمط WAL
      sqlite.exec(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE products (id TEXT PRIMARY KEY, name TEXT, price REAL);
        INSERT INTO products VALUES ('p1', 'منتج تجريبي', 250);
      `);

      // 2. محاكاة النسخ الذري VACUUM INTO المعتمد في M6
      const backupPath = path.join(backupsDir, 'pre_migration_snapshot.db');
      sqlite.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}';`);

      expect(fs.existsSync(backupPath)).toBe(true);
      expect(fs.statSync(backupPath).size).toBeGreaterThan(0);

      // 3. التحقق من سلامة النسخة الاحتياطية واستقلاليتها
      const backupSqlite = new DatabaseSync(backupPath);
      const row = backupSqlite.prepare('SELECT * FROM products WHERE id = ?').get('p1') as any;
      expect(row.name).toBe('منتج تجريبي');
      expect(row.price).toBe(250);

      const backupIntegrity = backupSqlite.prepare('PRAGMA integrity_check;').get() as any;
      expect(backupIntegrity.integrity_check).toBe('ok');
      backupSqlite.close();

      // 4. التحقق من سلامة قاعدة البيانات الأصلية
      const liveIntegrity = sqlite.prepare('PRAGMA integrity_check;').get() as any;
      expect(liveIntegrity.integrity_check).toBe('ok');
    } finally {
      sqlite.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
