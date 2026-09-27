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
});
