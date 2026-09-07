// خدمة إدارة النسخ الاحتياطي والاستعادة الشاملة (Backup & Restore Service)
// تضمن سلامة كافة الجداول (25 جدولاً) مع الحفاظ الكامل على صور المنتجات،
// الشعار، عبوات الجملة، المبيعات، والقوالب. تدعم بيئة Electron (SQLite) والمتصفح (Dexie).

import { db } from '@/lib/db';

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

export interface BackupInspectionResult {
  valid: boolean;
  error?: string;
  metadata?: BackupMetadata;
  parsedData: Record<string, any[]>;
  summary: {
    productsCount: number;
    imagesCount: number;
    categoriesCount: number;
    packsCount: number;
    customersCount: number;
    suppliersCount: number;
    salesCount: number;
    expensesCount: number;
    templatesCount: number;
    totalRecords: number;
    exportDate?: string;
    appVersion?: string;
  };
}

export interface LiveDbStats {
  productsCount: number;
  imagesCount: number;
  categoriesCount: number;
  packsCount: number;
  customersCount: number;
  suppliersCount: number;
  salesCount: number;
  expensesCount: number;
  printTemplatesCount: number;
  totalRecords: number;
  sizeEstMB: number;
}

export const BACKUP_TABLES = [
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
] as const;

/**
 * الحصول على إحصائيات قاعدة البيانات الحالية المباشرة
 */
export async function getLiveDatabaseStats(): Promise<LiveDbStats> {
  try {
    const [
      products,
      categories,
      packs,
      customers,
      suppliers,
      sales,
      expenses,
      templates,
    ] = await Promise.all([
      db.products.toArray().catch(() => []),
      db.categories.toArray().catch(() => []),
      db.packs.toArray().catch(() => []),
      db.customers.toArray().catch(() => []),
      db.suppliers.toArray().catch(() => []),
      db.sales.toArray().catch(() => []),
      db.expenses.toArray().catch(() => []),
      db.print_templates.toArray().catch(() => []),
    ]);

    const imagesCount = (products as any[]).filter(
      (p) => p.image && typeof p.image === 'string' && p.image.trim().length > 0
    ).length;

    const totalRecords =
      products.length +
      categories.length +
      packs.length +
      customers.length +
      suppliers.length +
      sales.length +
      expenses.length +
      templates.length;

    // تقدير تقريبي للحجم
    let estimatedBytes = 0;
    for (const p of products as any[]) {
      if (p.image) estimatedBytes += p.image.length;
      estimatedBytes += 200; // متوسط حجم الحقول الأخرى
    }
    estimatedBytes += (totalRecords - products.length) * 300;
    const sizeEstMB = Number((estimatedBytes / (1024 * 1024)).toFixed(2));

    return {
      productsCount: products.length,
      imagesCount,
      categoriesCount: categories.length,
      packsCount: packs.length,
      customersCount: customers.length,
      suppliersCount: suppliers.length,
      salesCount: sales.length,
      expensesCount: expenses.length,
      printTemplatesCount: templates.length,
      totalRecords,
      sizeEstMB,
    };
  } catch (err) {
    console.error('Failed to get live db stats:', err);
    return {
      productsCount: 0,
      imagesCount: 0,
      categoriesCount: 0,
      packsCount: 0,
      customersCount: 0,
      suppliersCount: 0,
      salesCount: 0,
      expensesCount: 0,
      printTemplatesCount: 0,
      totalRecords: 0,
      sizeEstMB: 0,
    };
  }
}

/**
 * توليد نسخة احتياطية شاملة مع الحفاظ الكامل على صور المنتجات وكافة الجداول
 */
export async function generateComprehensiveBackup(): Promise<ComprehensiveBackup> {
  // إذا كنا داخل بيئة Electron، نستخدم النسخ الاحتياطي الأصلي من SQLite للسرعة والدقة
  if (window.electronAPI?.backup?.exportFull) {
    return await window.electronAPI.backup.exportFull();
  }

  // وضع المتصفح / Dexie fallback
  const data: Record<string, any[]> = {};
  let imagesCount = 0;

  for (const table of BACKUP_TABLES) {
    try {
      if (db[table]) {
        const rows = await db[table].toArray();
        data[table] = rows;
        if (table === 'products') {
          imagesCount = rows.filter(
            (r: any) => r.image && typeof r.image === 'string' && r.image.trim().length > 0
          ).length;
        }
      } else {
        data[table] = [];
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

  const jsonStr = JSON.stringify(data);
  const totalSizeEstMB = Number(
    (new Blob([jsonStr]).size / (1024 * 1024)).toFixed(2)
  );

  const metadata: BackupMetadata = {
    appName: 'AN POS',
    appVersion: '3.5.0',
    exportDate: new Date().toISOString(),
    environment: 'browser',
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
 * حفظ النسخة الاحتياطية إلى ملف (نافذة حفظ أصلية في Electron أو تنزيل مباشر في المتصفح)
 */
export async function saveBackupToFile(
  backup: ComprehensiveBackup
): Promise<{ saved: boolean; filePath?: string; canceled?: boolean }> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultFilename = `an-pos-backup-${dateStr}.anpos.json`;
  const content = JSON.stringify(backup, null, 2);

  if (window.electronAPI?.backup?.saveFileDialog) {
    const res = await window.electronAPI.backup.saveFileDialog(defaultFilename, content);
    if (res.canceled) {
      return { saved: false, canceled: true };
    }
    return { saved: true, filePath: res.filePath };
  }

  // متصفح عادي
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFilename;
  a.click();
  URL.revokeObjectURL(url);
  return { saved: true };
}

/**
 * فحص وتدقيق ملف النسخة الاحتياطية قبل الاستعادة
 */
export function inspectBackupFile(content: string): BackupInspectionResult {
  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') {
      return {
        valid: false,
        error: 'الملف لا يحتوي على بيانات JSON صالحة',
        parsedData: {},
        summary: {
          productsCount: 0,
          imagesCount: 0,
          categoriesCount: 0,
          packsCount: 0,
          customersCount: 0,
          suppliersCount: 0,
          salesCount: 0,
          expensesCount: 0,
          templatesCount: 0,
          totalRecords: 0,
        },
      };
    }

    // استخراج الجداول سواء كانت بتنسيق ComprehensiveBackup (data: { ... }) أو التنسيق الكلاسيكي المسطح
    let rawData: Record<string, any[]> = {};
    let metadata: BackupMetadata | undefined = undefined;

    if (parsed.data && typeof parsed.data === 'object') {
      rawData = parsed.data;
      metadata = parsed.metadata;
    } else {
      rawData = parsed;
    }

    const products = rawData.products || rawData.Products || [];
    const categories = rawData.categories || rawData.Categories || [];
    const packs = rawData.packs || rawData.Packs || [];
    const customers = rawData.customers || rawData.Customers || [];
    const suppliers = rawData.suppliers || rawData.Suppliers || [];
    const sales = rawData.sales || rawData.Sales || [];
    const expenses = rawData.expenses || rawData.Expenses || [];
    const templates = rawData.print_templates || rawData.printTemplates || [];

    const imagesCount = (products as any[]).filter(
      (p) => p.image && typeof p.image === 'string' && p.image.trim().length > 0
    ).length;

    let totalRecords = 0;
    for (const key of Object.keys(rawData)) {
      if (Array.isArray(rawData[key])) {
        totalRecords += rawData[key].length;
      }
    }

    return {
      valid: true,
      metadata,
      parsedData: rawData,
      summary: {
        productsCount: products.length,
        imagesCount,
        categoriesCount: categories.length,
        packsCount: packs.length,
        customersCount: customers.length,
        suppliersCount: suppliers.length,
        salesCount: sales.length,
        expensesCount: expenses.length,
        templatesCount: templates.length,
        totalRecords,
        exportDate: metadata?.exportDate || (parsed as any).exportDate,
        appVersion: metadata?.appVersion || (parsed as any).version,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'فشل في قراءة ملف JSON',
      parsedData: {},
      summary: {
        productsCount: 0,
        imagesCount: 0,
        categoriesCount: 0,
        packsCount: 0,
        customersCount: 0,
        suppliersCount: 0,
        salesCount: 0,
        expensesCount: 0,
        templatesCount: 0,
        totalRecords: 0,
      },
    };
  }
}

/**
 * تنفيذ استعادة النسخة الاحتياطية الشاملة
 */
export async function executeRestore(
  backupData: any,
  mode: 'clean' | 'merge' = 'merge'
): Promise<{ success: boolean; importedCounts: Record<string, number> }> {
  // بيئة Electron: استخدام معالج SQLite السريع والآمن
  if (window.electronAPI?.backup?.importFull) {
    return await window.electronAPI.backup.importFull(backupData, mode);
  }

  // وضع المتصفح / Dexie fallback
  const rawData: Record<string, any[]> = backupData.data || backupData;
  const importedCounts: Record<string, number> = {};

  if (mode === 'clean') {
    const reverseTables = [...BACKUP_TABLES].reverse();
    for (const table of reverseTables) {
      try {
        if (db[table]?.clear) {
          await db[table].clear();
        }
      } catch {
        // تجاهل الأخطاء في الجداول الاختيارية
      }
    }
  }

  for (const table of BACKUP_TABLES) {
    const camelTable = table.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const rows: any[] = Array.isArray(rawData[table])
      ? rawData[table]
      : Array.isArray(rawData[camelTable])
      ? rawData[camelTable]
      : [];

    if (!rows || rows.length === 0) continue;

    try {
      if (db[table]?.bulkPut) {
        await db[table].bulkPut(rows);
        importedCounts[table] = rows.length;
      }
    } catch (err) {
      console.warn(`[BackupService] Failed to put rows into ${table}:`, err);
    }
  }

  return { success: true, importedCounts };
}

/**
 * تصدير ملف قاعدة بيانات SQLite الخام (مخصص لتطبيق سطح المكتب فقط)
 */
export async function exportRawDatabaseFile(): Promise<{
  success: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}> {
  if (!window.electronAPI?.backup?.exportRawDb) {
    return {
      success: false,
      error: 'تصدير ملف قاعدة البيانات الخام متاح فقط في تطبيق سطح المكتب',
    };
  }

  try {
    const res = await window.electronAPI.backup.exportRawDb();
    if (res.canceled) {
      return { success: false, canceled: true };
    }
    return { success: true, filePath: res.filePath };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل تصدير ملف قاعدة البيانات' };
  }
}
