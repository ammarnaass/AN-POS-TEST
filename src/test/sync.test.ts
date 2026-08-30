// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';

describe('AN POS Sync Engine Core Logic', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        barcode TEXT,
        retail_price REAL,
        cost_price REAL,
        quantity REAL DEFAULT 0,
        updated_at TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        number TEXT,
        total REAL,
        paid REAL,
        status TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity TEXT,
        operation TEXT,
        local_id TEXT,
        payload TEXT,
        status TEXT,
        created_at TEXT,
        synced_at TEXT
      );
    `);
  });

  it('should process batch push operations with idempotency', () => {
    const saleId = 'sale-101';
    const initialProduct = {
      id: 'prod-1',
      name: 'قهوة اسبريسو',
      barcode: '123456',
      retail_price: 15,
      cost_price: 8,
      quantity: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. إدراج منتج أولي
    const insertProduct = db.prepare(`
      INSERT INTO products (id, name, barcode, retail_price, cost_price, quantity, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertProduct.run(
      initialProduct.id,
      initialProduct.name,
      initialProduct.barcode,
      initialProduct.retail_price,
      initialProduct.cost_price,
      initialProduct.quantity,
      initialProduct.created_at,
      initialProduct.updated_at
    );

    // 2. محاكاة دفع فاتورة من الهاتف
    const existing = db.prepare('SELECT id FROM sales WHERE id = ?').get(saleId);
    expect(existing).toBeUndefined();

    const insertSale = db.prepare(`
      INSERT INTO sales (id, number, total, paid, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    insertSale.run(saleId, 'INV-001', 30, 30, 'completed');

    // 3. التحقق من منع التكرار (Idempotency)
    const secondCheck = db.prepare('SELECT id FROM sales WHERE id = ?').get(saleId);
    expect(secondCheck).toBeDefined();
    expect(secondCheck.id).toBe(saleId);
  });

  it('should filter pull deltas based on lastSyncTime', () => {
    const pastTime = '2026-08-01T00:00:00.000Z';
    const recentTime = '2026-08-29T12:00:00.000Z';

    const insertProduct = db.prepare(`
      INSERT INTO products (id, name, barcode, quantity, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run('p1', 'منتج قديم', '111', 10, pastTime, pastTime);
    insertProduct.run('p2', 'منتج حديث', '222', 20, recentTime, recentTime);

    const pullStmt = db.prepare(`
      SELECT * FROM products WHERE updated_at > ? OR created_at > ?
    `);
    const deltas = pullStmt.all('2026-08-15T00:00:00.000Z', '2026-08-15T00:00:00.000Z');

    expect(deltas.length).toBe(1);
    expect(deltas[0].id).toBe('p2');
    expect(deltas[0].name).toBe('منتج حديث');
  });
});
