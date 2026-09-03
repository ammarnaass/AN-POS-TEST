// تسجيل كل IPC handlers — يُستدعى مرة واحدة في main process
// يجمع بين CRUD العام + المسارات المخصصة
// المنطق الفعلي في ../handlers/* (يُشارك مع خادم HTTP)

import { registerCrudIpc } from './crud';
import { registerAuthIpc } from './auth';
import { registerSalesIpc } from './sales';
import { registerCashIpc } from './cash';
import { registerCategoriesIpc } from './categories';
import { registerMigrationIpc } from './migration';
import { registerNetworkIpc } from './network';
import { registerLicenseIpc } from './license';
import { ipcMain } from 'electron';
import {
  listBarcodePrints,
  createBarcodePrint,
  removeBarcodePrint,
  listPayments,
  createPayment,
  listSupplierEntries,
  createSupplierEntry,
  listActivities,
  logActivity,
  uploadProducts,
  uploadCustomers,
} from '../handlers/misc';

/**
 * تسجيل كل معالجات IPC:
 * 1. CRUD عام لكل الجداول البسيطة
 * 2. مسارات مخصصة (auth, sales, cash, categories)
 * 3. مسارات إضافية (barcodePrints, payments, supplierEntries, activities, upload)
 * 4. ترحيل البيانات
 */
export function registerIpcHandlers(): void {
  // ===== CRUD عام لكل الجداول البسيطة =====
  // ملاحظة: كل جدول يسجل معالج db:list/get/create/update/remove منفصل
  // لكن لأن المعالج يفحص table name، نسجل لكل جدول

  const crudTables: Array<{ table: string; searchFields?: string[]; listOrder?: string; jsonFields?: string[]; booleanFields?: string[] }> = [
    { table: 'products', searchFields: ['name', 'barcode', 'sku', 'category'], booleanFields: ['stockable', 'highlighted', 'allow_negative_stock', 'pricing_by_zone', 'loyalty_card', 'ask_price', 'ask_quantity'] },
    { table: 'customers', searchFields: ['name', 'phone'] },
    { table: 'suppliers', searchFields: ['name', 'phone'] },
    { table: 'expenses', searchFields: ['label', 'category'], listOrder: 'date DESC' },
    { table: 'promotions' },
    { table: 'capital_entries', listOrder: 'date DESC' },
    { table: 'users', searchFields: ['name', 'username'] },
    { table: 'roles', searchFields: ['name', 'description'], jsonFields: ['permissions'], booleanFields: ['is_system'] },
    { table: 'categories', searchFields: ['name', 'description'], listOrder: 'name ASC' },
    { table: 'packs', searchFields: ['name', 'barcode'], jsonFields: ['items'] },
    { table: 'settings' },
    { table: 'warehouses' },
    { table: 'stock_movements', listOrder: 'created_at DESC' },
    { table: 'stock_movements_v2', listOrder: 'date DESC' },
    { table: 'inventory_counts', listOrder: 'date DESC' },
    { table: 'purchases', searchFields: ['number'], listOrder: 'date DESC' },
    { table: 'sales', searchFields: ['number', 'customer_name'], listOrder: 'date DESC', jsonFields: ['items'] },
    { table: 'print_templates', searchFields: ['name'], jsonFields: ['supported_documents', 'visibility', 'layout', 'styles', 'qr', 'barcode'], booleanFields: ['is_default', 'is_system'] },
    { table: 'print_history', listOrder: 'printed_at DESC' },
    { table: 'template_assignments', idField: 'doc_type' },
    { table: 'printers' },
    { table: 'printer_template_mappings' },
    { table: 'print_jobs', listOrder: 'created_at DESC' },
    { table: 'product_barcodes', searchFields: ['barcode'] },
    { table: 'connected_devices' },
    { table: 'network_settings' },
    { table: 'suspended_orders', listOrder: 'created_at DESC' },
    { table: 'cash_sessions', listOrder: 'opened_at DESC', jsonFields: ['deposits'] },
    { table: 'audit_logs', listOrder: 'timestamp DESC' },
  ];

  for (const cfg of crudTables) {
    registerCrudIpc(cfg);
  }

  // ===== المسارات المخصصة =====
  registerAuthIpc();
  registerSalesIpc();
  registerCashIpc();
  registerCategoriesIpc();
  registerMigrationIpc();
  registerNetworkIpc();
  registerLicenseIpc();

  // ===== barcodePrints (list with filter) =====
  ipcMain.handle('barcodePrints:list', async (_evt, opts?: { productId?: string }) => listBarcodePrints(opts));
  ipcMain.handle('barcodePrints:create', async (_evt, data: Record<string, unknown>) => createBarcodePrint(data));
  ipcMain.handle('barcodePrints:remove', async (_evt, id: string) => removeBarcodePrint(id));

  // ===== payments =====
  ipcMain.handle('payments:list', async (_evt, opts?: { partyId?: string; partyType?: string }) => listPayments(opts));
  ipcMain.handle('payments:create', async (_evt, data: Record<string, unknown>) => createPayment(data));

  // ===== supplierEntries =====
  ipcMain.handle('supplierEntries:list', async (_evt, opts?: { supplierId?: string }) => listSupplierEntries(opts));
  ipcMain.handle('supplierEntries:create', async (_evt, data: Record<string, unknown>) => createSupplierEntry(data));

  // ===== activities =====
  ipcMain.handle('activities:list', async (_evt, opts?: { userId?: string; action?: string; limit?: number }) => listActivities(opts));
  ipcMain.handle('activities:log', async (_evt, data: { userId: string; action: string; entityType?: string; entityId?: string; details?: string }) => logActivity(data));

  // ===== upload (Excel import) =====
  ipcMain.handle('upload:products', async (_evt, rows: Record<string, unknown>[]) => uploadProducts(rows));
  ipcMain.handle('upload:customers', async (_evt, rows: Record<string, unknown>[]) => uploadCustomers(rows));

  // ===== app utilities =====
  ipcMain.handle('app:version', async () => {
    const { app } = await import('electron');
    return app.getVersion();
  });
  ipcMain.handle('app:path', async (_evt, name: string) => {
    const { app } = await import('electron');
    try {
      return app.getPath(name as any);
    } catch {
      return null;
    }
  });
}
