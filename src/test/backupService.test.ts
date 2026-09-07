import { describe, expect, it } from 'vitest';
import {
  inspectBackupFile,
  generateComprehensiveBackup,
  executeRestore,
  BACKUP_TABLES,
} from '@/services/backup/backupService';
import { db } from '@/lib/db';

describe('Backup & Restore Service', () => {
  it('has all 25 operational tables defined in BACKUP_TABLES', () => {
    expect(BACKUP_TABLES.length).toBe(25);
    expect(BACKUP_TABLES).toContain('products');
    expect(BACKUP_TABLES).toContain('packs');
    expect(BACKUP_TABLES).toContain('categories');
    expect(BACKUP_TABLES).toContain('sales');
    expect(BACKUP_TABLES).toContain('print_templates');
    expect(BACKUP_TABLES).toContain('settings');
  });

  it('inspectBackupFile successfully detects and counts products and images', () => {
    const mockBackup = {
      metadata: {
        appName: 'AN POS',
        appVersion: '3.5.0',
        exportDate: '2026-09-07T12:00:00.000Z',
        environment: 'electron',
        stats: {},
      },
      data: {
        products: [
          { id: 'p1', name: 'حليب صومام', barcode: '12345', image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...' },
          { id: 'p2', name: 'سكر 1كغ', barcode: '67890', image: '' },
          { id: 'p3', name: 'زيت 5ل', barcode: '11223', image: 'data:image/png;base64,iVBORw0KGgo...' },
        ],
        packs: [
          { id: 'pack1', name: 'كرتون حليب', barcode: '998877', items: [{ productId: 'p1', quantity: 10 }] },
        ],
        customers: [{ id: 'c1', name: 'عميل نقدي' }],
        sales: [{ id: 's1', number: 'INV-1001', total: 1500 }],
        print_templates: [{ id: 't1', name: 'فاتورة بيع A4' }],
      },
    };

    const inspection = inspectBackupFile(JSON.stringify(mockBackup));

    expect(inspection.valid).toBe(true);
    expect(inspection.summary.productsCount).toBe(3);
    expect(inspection.summary.imagesCount).toBe(2);
    expect(inspection.summary.packsCount).toBe(1);
    expect(inspection.summary.customersCount).toBe(1);
    expect(inspection.summary.salesCount).toBe(1);
    expect(inspection.summary.templatesCount).toBe(1);
  });

  it('inspectBackupFile correctly handles legacy flat JSON format', () => {
    const legacyBackup = {
      products: [
        { id: 'p1', name: 'منتج قديم', image: 'data:image/png;base64,abc' },
      ],
      customers: [{ id: 'c1', name: 'عميل' }],
      suppliers: [{ id: 's1', name: 'مورد' }],
      version: '1.0.0',
    };

    const inspection = inspectBackupFile(JSON.stringify(legacyBackup));

    expect(inspection.valid).toBe(true);
    expect(inspection.summary.productsCount).toBe(1);
    expect(inspection.summary.imagesCount).toBe(1);
    expect(inspection.summary.customersCount).toBe(1);
    expect(inspection.summary.suppliersCount).toBe(1);
  });

  it('inspectBackupFile rejects invalid non-JSON content', () => {
    const result = inspectBackupFile('this is not json');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('generateComprehensiveBackup returns expected metadata and data schema', async () => {
    const backup = await generateComprehensiveBackup();
    expect(backup).toBeDefined();
    expect(backup.metadata).toBeDefined();
    expect(backup.metadata.appName).toBe('AN POS');
    expect(backup.data).toBeDefined();
    expect(typeof backup.data).toBe('object');
  });

  it('executeRestore performs restore with merge mode safely', async () => {
    const testData = {
      products: [
        { id: 'p_test_1', name: 'منتج تجريبي 1', barcode: 'TEST01', retailPrice: 150 },
      ],
      categories: [
        { id: 'cat_test_1', name: 'قسم تجريبي' },
      ],
    };

    const res = await executeRestore({ data: testData }, 'merge');
    expect(res.success).toBe(true);
  });
});
