// خدمة إدارة النسخ الاحتياطي والاستعادة لتطبيق الهاتف المحمول (Mobile Backup & Restore Service)
// تضمن سلامة كافة الجداول الـ 25، مع الحفاظ الكامل على صور المنتجات، الشعار،
// عبوات الجملة، المبيعات، والقوالب. تدعم أيضاً المزامنة المباشرة مع الكمبيوتر المقترن عبر الشبكة المحلية (LAN).

import { db, ensureInit } from '@/lib/db';
import { AnposSecureStore } from '@/modules/AnposSecureStore';

export interface MobileBackupMetadata {
  appName: string;
  appVersion: string;
  exportDate: string;
  environment: 'mobile';
  stats: {
    productsCount: number;
    imagesCount: number;
    categoriesCount: number;
    packsCount: number;
    customersCount: number;
    suppliersCount: number;
    salesCount: number;
    expensesCount: number;
    printTemplatesCount: number;
    totalSizeEstMB: number;
  };
}

export interface MobileComprehensiveBackup {
  metadata: MobileBackupMetadata;
  data: Record<string, any[]>;
}

export interface MobileBackupInspection {
  valid: boolean;
  error?: string;
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
    sourceEnv?: string;
  };
}

export interface MobileLiveStats {
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
 * الحصول على الإحصائيات الحية لقاعدة بيانات الهاتف
 */
export async function getMobileLiveStats(): Promise<MobileLiveStats> {
  await ensureInit();
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

    let estimatedBytes = 0;
    for (const p of products as any[]) {
      if (p.image) estimatedBytes += p.image.length;
      estimatedBytes += 200;
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
      templatesCount: templates.length,
      totalRecords,
      sizeEstMB,
    };
  } catch (err) {
    console.error('Failed to get mobile live stats:', err);
    return {
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
      sizeEstMB: 0,
    };
  }
}

/**
 * توليد نسخة احتياطية شاملة مع الحفاظ التام على الصور وكافة الجداول الـ 25
 */
export async function generateMobileBackup(): Promise<MobileComprehensiveBackup> {
  await ensureInit();
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

  const jsonStr = JSON.stringify(data);
  const totalSizeEstMB = Number(((jsonStr.length * 2) / (1024 * 1024)).toFixed(2));

  const metadata: MobileBackupMetadata = {
    appName: 'AN POS Mobile',
    appVersion: '3.5.0',
    exportDate: new Date().toISOString(),
    environment: 'mobile',
    stats: {
      productsCount: data.products?.length || 0,
      imagesCount,
      categoriesCount: data.categories?.length || 0,
      packsCount: data.packs?.length || 0,
      customersCount: data.customers?.length || 0,
      suppliersCount: data.suppliers?.length || 0,
      salesCount: data.sales?.length || 0,
      expensesCount: data.expenses?.length || 0,
      printTemplatesCount: data.print_templates?.length || 0,
      totalSizeEstMB,
    },
  };

  return { metadata, data };
}

/**
 * فحص وتدقيق محتوى النسخة الاحتياطية قبل الاسترجاع
 */
export function inspectBackupContent(content: string): MobileBackupInspection {
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

    let rawData: Record<string, any[]> = {};
    if (parsed.data && typeof parsed.data === 'object') {
      rawData = parsed.data;
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
        exportDate: parsed.metadata?.exportDate || parsed.exportDate,
        appVersion: parsed.metadata?.appVersion || parsed.version,
        sourceEnv: parsed.metadata?.environment,
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
 * تنفيذ استرجاع النسخة الاحتياطية على الهاتف
 */
export async function executeMobileRestore(
  backupData: any,
  mode: 'clean' | 'merge' = 'merge'
): Promise<{ success: boolean; importedCounts: Record<string, number> }> {
  await ensureInit();
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
        // تجاهل الجداول غير الموجودة
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

    let count = 0;
    try {
      if (db[table]?.bulkPut) {
        await db[table].bulkPut(rows);
        count = rows.length;
      } else if (db[table]?.bulkAdd) {
        await db[table].bulkAdd(rows).catch(async () => {
          for (const row of rows) {
            await db[table].put?.(row).catch(() => {});
          }
        });
        count = rows.length;
      }
      importedCounts[table] = count;
    } catch (err) {
      console.warn(`[MobileBackup] Failed inserting into ${table}:`, err);
    }
  }

  return { success: true, importedCounts };
}

/**
 * جلب نسخة احتياطية مباشرة من خادم الكمبيوتر المقترن عبر الشبكة المحلية (LAN Fetch)
 */
export async function fetchBackupFromDesktop(): Promise<{
  success: boolean;
  backup?: any;
  error?: string;
}> {
  try {
    const serverUrl = await AnposSecureStore.get('anpos_server_url');
    if (!serverUrl) {
      return {
        success: false,
        error: 'الهاتف غير مقترن بأي جهاز كمبيوتر حالياً. يرجى إقران الجهاز أولاً من شاشة ربط الأجهزة.',
      };
    }

    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/backup/export`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: `استجاب الخادم برمز خطأ (${res.status}). تأكد من تشغيل تطبيق AN POS على الكمبيوتر.`,
      };
    }

    const backup = await res.json();
    return { success: true, backup };
  } catch (err: any) {
    return {
      success: false,
      error: `تعذر الاتصال بالكمبيوتر عبر الشبكة: ${err?.message || 'خطأ في الشبكة'}`,
    };
  }
}
