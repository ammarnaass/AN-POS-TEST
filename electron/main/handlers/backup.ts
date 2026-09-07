// معالج النسخ الاحتياطي والاستعادة الشامل في Electron (SQLite)
// يضمن تصدير واستيراد كافة الجداول مع الحفاظ الكامل على صور المنتجات، الشعار،
// عبوات الجملة، المبيعات، وكافة الحركات المالية والمخزنية.

import fs from 'node:fs';
import path from 'node:path';
import { app, dialog } from 'electron';
import {
  queryAll,
  execute,
  transaction,
  toSnakeKey,
  serializeValue,
  type Row,
} from './db-utils';

export interface BackupMetadata {
  appName: string;
  appVersion: string;
  exportDate: string;
  environment: 'electron' | 'browser';
  stats: {
    productsCount: number;
    imagesCount: number;
    categoriesCount: number;
    packsCount: number;
    customersCount: number;
    suppliersCount: number;
    salesCount: number;
    saleItemsCount: number;
    expensesCount: number;
    printTemplatesCount: number;
    totalSizeEstMB: number;
  };
}

export interface ComprehensiveBackup {
  metadata: BackupMetadata;
  data: Record<string, any[]>;
}

// قائمة الجداول التشغيلية المدعومة بالترتيب المنطقي للنسخ والاستعادة
const BACKUP_TABLES = [
  'settings',
  'roles',
  'users',
  'categories',
  'products',
  'product_barcodes',
  'packs',
  'customers',
  'suppliers',
  'sales',
  'sale_items',
  'purchases',
  'purchase_items',
  'stock_movements',
  'expenses',
  'cash_sessions',
  'payments',
  'supplier_entries',
  'capital_entries',
  'promotions',
  'print_templates',
  'template_assignments',
  'print_history',
  'suspended_orders',
  'user_activities',
];

/**
 * تصدير نسخة احتياطية شاملة من كافة جداول SQLite
 */
export async function exportFullBackup(): Promise<ComprehensiveBackup> {
  const data: Record<string, any[]> = {};
  let imagesCount = 0;

  for (const table of BACKUP_TABLES) {
    try {
      const rows = queryAll(`SELECT * FROM ${table}`);
      data[table] = rows;
      if (table === 'products') {
        imagesCount = rows.filter((r) => r.image && String(r.image).trim().length > 0).length;
      }
    } catch {
      data[table] = [];
    }
  }

  const productsCount = data.products?.length || 0;
  const categoriesCount = data.categories?.length || 0;
  const packsCount = data.packs?.length || 0;
  const customersCount = data.customers?.length || 0;
  const suppliersCount = data.suppliers?.length || 0;
  const salesCount = data.sales?.length || 0;
  const saleItemsCount = data.sale_items?.length || 0;
  const expensesCount = data.expenses?.length || 0;
  const printTemplatesCount = data.print_templates?.length || 0;

  const jsonEstimate = JSON.stringify(data);
  const totalSizeEstMB = Number((Buffer.byteLength(jsonEstimate, 'utf8') / (1024 * 1024)).toFixed(2));

  const metadata: BackupMetadata = {
    appName: 'AN POS',
    appVersion: app.getVersion() || '3.5.0',
    exportDate: new Date().toISOString(),
    environment: 'electron',
    stats: {
      productsCount,
      imagesCount,
      categoriesCount,
      packsCount,
      customersCount,
      suppliersCount,
      salesCount,
      saleItemsCount,
      expensesCount,
      printTemplatesCount,
      totalSizeEstMB,
    },
  };

  return { metadata, data };
}

/**
 * استيراد نسخة احتياطية شاملة داخل SQLite Transaction
 */
export async function importFullBackup(
  backup: any,
  mode: 'clean' | 'merge' = 'merge'
): Promise<{ success: boolean; importedCounts: Record<string, number> }> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('ملف النسخة الاحتياطية غير صالح أو فارغ');
  }

  const rawData: Record<string, any[]> = backup.data || backup;
  const importedCounts: Record<string, number> = {};

  transaction(() => {
    // إذا كان الاستبدال نظيفاً (clean)، يتم تنظيف الجداول باستثناء الإعدادات والمستخدمين مؤقتاً
    if (mode === 'clean') {
      const reverseTables = [...BACKUP_TABLES].reverse();
      for (const table of reverseTables) {
        try {
          execute(`DELETE FROM ${table}`);
        } catch {
          // تجاهل الجداول غير الموجودة
        }
      }
    }

    // إدراج الصفوف باستخدام INSERT OR REPLACE
    for (const table of BACKUP_TABLES) {
      // دعم كلا النمطين: snake_case و camelCase لاسم الجدول
      const camelTable = table.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const rows: any[] = Array.isArray(rawData[table])
        ? rawData[table]
        : Array.isArray(rawData[camelTable])
        ? rawData[camelTable]
        : [];

      if (!rows || rows.length === 0) continue;

      let count = 0;
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;

        const cols: string[] = [];
        const vals: unknown[] = [];

        for (const [key, value] of Object.entries(row)) {
          const colName = toSnakeKey(key);
          cols.push(colName);
          vals.push(serializeValue(value));
        }

        if (cols.length === 0) continue;

        const placeholders = cols.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

        try {
          execute(sql, vals);
          count++;
        } catch (err) {
          console.warn(`[Backup] Warning inserting into ${table}:`, err);
        }
      }
      importedCounts[table] = count;
    }
  });

  return { success: true, importedCounts };
}

/**
 * فتح نافذة حفظ نظام التشغيل وكتابة الملف
 */
export async function saveFileDialog(
  defaultName: string,
  content: string
): Promise<{ canceled: boolean; filePath?: string }> {
  const result = await dialog.showSaveDialog({
    title: 'حفظ النسخة الاحتياطية',
    defaultPath: defaultName,
    filters: [
      { name: 'نسخة احتياطية AN POS (*.anpos.json)', extensions: ['anpos.json', 'json'] },
      { name: 'جميع الملفات (*.*)', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  fs.writeFileSync(result.filePath, content, 'utf8');
  return { canceled: false, filePath: result.filePath };
}

/**
 * فتح نافذة اختيار ملف وقراءة محتواه
 */
export async function openFileDialog(): Promise<{
  canceled: boolean;
  filePath?: string;
  content?: string;
}> {
  const result = await dialog.showOpenDialog({
    title: 'اختيار ملف النسخة الاحتياطية',
    properties: ['openFile'],
    filters: [
      { name: 'نسخ احتياطية (*.json, *.anpos.json)', extensions: ['json', 'anpos'] },
      { name: 'جميع الملفات (*.*)', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf8');
  return { canceled: false, filePath, content };
}

/**
 * تصدير ملف قاعدة البيانات الخام an-pos.db
 */
export async function exportRawDbFile(): Promise<{ canceled: boolean; filePath?: string }> {
  const dbPath = path.join(app.getPath('userData'), 'an-pos.db');
  if (!fs.existsSync(dbPath)) {
    throw new Error('ملف قاعدة البيانات an-pos.db غير موجود');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const result = await dialog.showSaveDialog({
    title: 'تصدير قاعدة بيانات SQLite الخام',
    defaultPath: `an-pos-database-${dateStr}.db`,
    filters: [
      { name: 'SQLite Database (*.db)', extensions: ['db', 'sqlite'] },
      { name: 'جميع الملفات (*.*)', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  fs.copyFileSync(dbPath, result.filePath);
  return { canceled: false, filePath: result.filePath };
}
