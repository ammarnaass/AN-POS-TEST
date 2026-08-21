// ترحيل البيانات من IndexedDB → SQLite
// يستقبل بيانات Dexie عبر IPC ويُدرجها في SQLite

import { ipcMain } from 'electron';
import { getSqlite } from '../database';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

/**
 * جداول Dexie التي نرحّلها (33 جدول من src/infrastructure/database/dexie/db.ts)
 * المفاتيح هي أسماء جداول Dexie، القيم هي أسماء جداول SQLite المقابلة
 */
const TABLE_MAP: Record<string, string> = {
  products: 'products',
  customers: 'customers',
  suppliers: 'suppliers',
  sales: 'sales',
  sale_items: 'sale_items',
  expenses: 'expenses',
  users: 'users',
  roles: 'roles',
  user_activities: 'user_activities',
  payments: 'payments',
  purchases: 'purchases',
  purchase_items: 'purchase_items',
  promotions: 'promotions',
  packs: 'packs',
  stock_movements: 'stock_movements',
  audit_logs: 'audit_logs',
  cash_sessions: 'cash_sessions',
  settings: 'settings',
  capital_entries: 'capital_entries',
  suspended_orders: 'suspended_orders',
  print_templates: 'print_templates',
  print_history: 'print_history',
  template_assignments: 'template_assignments',
  warehouses: 'warehouses',
  stock_movements_v2: 'stock_movements_v2',
  stock_movement_lines: 'stock_movement_lines',
  inventory_counts: 'inventory_counts',
  inventory_count_lines: 'inventory_count_lines',
  network_settings: 'network_settings',
  connected_devices: 'connected_devices',
  print_failure_counter: 'print_failure_counter',
  print_jobs: 'print_jobs',
  printers: 'printers',
  printer_template_mappings: 'printer_template_mappings',
  product_barcodes: 'product_barcodes',
};

/**
 * تحويل قيمة JS إلى قيمة SQLite
 */
function serializeValue(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

/**
 * إدراج صف في جدول SQLite باستخدام INSERT OR IGNORE (لتجنب تعارض المفاتيح)
 */
function insertRow(table: string, row: Record<string, unknown>): void {
  const db = getSqlite();
  const entries = Object.entries(row).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const cols = entries.map(([k]) => k.replace(/([A-Z])/g, '_$1').toLowerCase());
  const vals = entries.map(([, v]) => serializeValue(v));
  const placeholders = cols.map(() => '?').join(', ');

  try {
    const stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);
    stmt.run(...vals);
  } catch (err) {
    // تجاهل الصفوف الفاشلة (عمود غير موجود، إلخ)
    console.error(`[migration] فشل إدراج في ${table}:`, (err as Error).message);
  }
}

export function registerMigrationIpc(): void {
  // migration:import — استيراد بيانات IndexedDB
  ipcMain.handle('migration:import', async (_evt, data: Record<string, unknown[]>) => {
    const stats: Record<string, number> = {};
    let totalImported = 0;

    for (const [dexieTable, rows] of Object.entries(data)) {
      const sqliteTable = TABLE_MAP[dexieTable];
      if (!sqliteTable || !Array.isArray(rows) || rows.length === 0) {
        stats[dexieTable] = 0;
        continue;
      }

      let imported = 0;
      for (const row of rows) {
        try {
          insertRow(sqliteTable, row as Record<string, unknown>);
          imported++;
          totalImported++;
        } catch {
          // تجاهل
        }
      }
      stats[dexieTable] = imported;
    }

    // كتابة علامة اكتمال الترحيل
    try {
      const markerPath = path.join(app.getPath('userData'), '.migration-complete');
      fs.writeFileSync(markerPath, JSON.stringify({
        completedAt: new Date().toISOString(),
        totalImported,
        stats,
      }, null, 2));
    } catch {
      // تجاهل
    }

    return { success: true, totalImported, stats };
  });

  // migration:status — فحص هل الترحيل اكتمل
  ipcMain.handle('migration:status', async () => {
    try {
      const markerPath = path.join(app.getPath('userData'), '.migration-complete');
      if (fs.existsSync(markerPath)) {
        const content = fs.readFileSync(markerPath, 'utf-8');
        return { completed: true, ...JSON.parse(content) };
      }
    } catch {
      // تجاهل
    }
    return { completed: false };
  });
}
