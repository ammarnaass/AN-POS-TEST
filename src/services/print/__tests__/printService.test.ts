// printService اختبارات — POS-PRINT-001 Sprint B
// BR-PRINT-001: لا يمكن طباعة فاتورة غير محفوظة
// BR-PRINT-003: إعادة الطباعة لا تنشئ فاتورة جديدة
// BR-PRINT-005: كل عملية طباعة تسجل في سجل التدقيق
// BR-PRINT-010: فشل الطباعة لا يمس الفاتورة المحفوظة
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import { seedDefaultTemplates } from '@/services/print/defaultTemplates';
import {
  printDocument,
  reprintDocument,
  getPrintHistory,
  getTemplateForDocType,
} from '@/services/print/printService';

const NOW = '2026-07-06T10:00:00.000Z';

async function createTestSale(saleId: string, overrides: Partial<Record<string, unknown>> = {}): Promise<void> {
  const sale = {
    id: saleId,
    number: 'INV-TEST-' + saleId.slice(0, 6),
    date: NOW,
    subtotal: 100,
    discount: 0,
    discountType: 'percent' as const,
    tvaAmount: 19,
    total: 119,
    paymentMethod: 'cash' as const,
    paidAmount: 119,
    status: 'paid' as const,
    docType: 'facture' as const,
    type: 'sale' as const,
    soldBy: 'user-test',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  await db.sales.add(sale);
  await db.sale_items.add({
    id: 'item-' + saleId,
    saleId,
    productId: 'prod-1',
    name: 'منتج تجريبي',
    qty: 2,
    unitPrice: 50,
    lineTotal: 100,
  });
}

async function createTestSettings(): Promise<void> {
  await db.settings.put({
    id: 'default',
    shopName: 'محل اختبار',
    phone: '023 45 67 89',
    tvaRate: 19,
    printWidthMm: 80,
    syncMode: 'single',
    currencies: '[]',
    baseCurrency: 'DZD',
    invoicePrefix: 'INV-',
    invoiceStartNumber: 1,
    receiptFooter: 'شكراً',
    zakatEnabled: false,
    nisabThreshold: 100000,
    taxId: '1234567890123',
    printLanguage: 'ar',
    companyRC: '16/B/123',
  });
}

function mockPrintWindowSuccess() {
  const fakeWin = {
    document: { write: vi.fn(), close: vi.fn() },
    print: vi.fn(),
    close: vi.fn(),
    onload: null as null | (() => void),
    closed: false,
  };
  vi.stubGlobal('window', {
    ...window,
    open: vi.fn(() => fakeWin),
  });
  return fakeWin;
}

describe('POS-PRINT-001 Sprint B: Print Service Business Rules', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDefaultTemplates();
    await createTestSettings();
    vi.unstubAllGlobals();
  });

  describe('BR-PRINT-001: لا يمكن طباعة فاتورة غير محفوظة', () => {
    it('يرفض طباعة فاتورة غير موجودة', async () => {
      const result = await printDocument('nonexistent-id', 'sale-invoice', {
        userId: 'user-1',
        userName: 'مستخدم',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('غير موجود');
    });

    it('يرفض طباعة فاتورة بدون منتجات (إلا إعادة الطباعة)', async () => {
      const saleId = 'sale-no-items-' + Date.now();
      await db.sales.add({
        id: saleId,
        number: 'INV-EMPTY-1',
        date: NOW,
        subtotal: 0,
        discount: 0,
        discountType: 'percent',
        tvaAmount: 0,
        total: 0,
        paymentMethod: 'cash',
        paidAmount: 0,
        status: 'paid',
        docType: 'facture',
        type: 'sale',
        soldBy: 'user-1',
        createdAt: NOW,
        updatedAt: NOW,
      });
      const result = await printDocument(saleId, 'sale-invoice', {
        userId: 'user-1',
        userName: 'مستخدم',
        isReprint: false,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('منتجات');
    });
  });

  describe('BR-PRINT-003: إعادة الطباعة لا تنشئ فاتورة جديدة', () => {
    it('reprintDocument يبقى على نفس invoiceId', async () => {
      const saleId = 'sale-reprint-' + Date.now();
      await createTestSale(saleId);
      const salesCountBefore = await db.sales.count();

      mockPrintWindowSuccess();
      const result = await reprintDocument(saleId, {
        userId: 'user-1',
        userName: 'مستخدم',
        copies: 1,
      });

      expect(result.success).toBe(true);
      const salesCountAfter = await db.sales.count();
      expect(salesCountAfter).toBe(salesCountBefore); // لا توجد فاتورة جديدة
    });

    it('سجل التدقيق يحمل isReprint = true', async () => {
      const saleId = 'sale-reprint-flag-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowSuccess();

      await reprintDocument(saleId, {
        userId: 'user-1',
        userName: 'مستخدم',
        copies: 1,
      });

      const history = await getPrintHistory(saleId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].isReprint).toBe(true);
    });
  });

  describe('BR-PRINT-005: كل عملية طباعة تسجل في سجل التدقيق', () => {
    it('يضيف سجل في print_history بعد الطباعة', async () => {
      const saleId = 'sale-audit-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowSuccess();

      await printDocument(saleId, 'thermal-receipt', {
        userId: 'user-audit',
        userName: 'مستخدم التدقيق',
        copies: 2,
      });

      const history = await getPrintHistory(saleId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].printedBy).toBe('user-audit');
      expect(history[0].copies).toBe(2);
      expect(history[0].printerName).toBe('browser');
    });

    it('يضيف سجل في user_activities بعد الطباعة', async () => {
      const saleId = 'sale-audit-log-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowSuccess();

      await printDocument(saleId, 'thermal-receipt', {
        userId: 'user-audit-log',
        userName: 'مستخدم',
      });

      const auditLogs = await db.user_activities.where('entityId').equals(saleId).toArray();
      expect(auditLogs.length).toBeGreaterThanOrEqual(1);
      expect(auditLogs[0].action).toBe('print_invoice');
      expect(auditLogs[0].entityType).toBe('sale');
      expect(auditLogs[0].userId).toBe('user-audit-log');
    });

    it('سجل التدقيق يحمل "reprint_invoice" لإعادة الطباعة', async () => {
      const saleId = 'sale-audit-reprint-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowSuccess();

      await reprintDocument(saleId, {
        userId: 'user-reprint',
        userName: 'مستخدم',
      });

      const auditLogs = await db.user_activities
        .where('action')
        .equals('reprint_invoice')
        .toArray();
      const forThisSale = auditLogs.filter(l => l.entityId === saleId);
      expect(forThisSale.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('BR-PRINT-010: فشل الطباعة لا يفسد الفاتورة', () => {
    it('الفاتورة تبقى محفوظة عند فشل window.open', async () => {
      const saleId = 'sale-fail-print-' + Date.now();
      await createTestSale(saleId);

      // محاكاة فشل window.open (popup blocker)
      vi.stubGlobal('window', {
        ...window,
        open: vi.fn(() => null),
      });

      const result = await printDocument(saleId, 'thermal-receipt', {
        userId: 'user-1',
        userName: 'مستخدم',
      });

      expect(result.success).toBe(false);
      // الفاتورة تبقى محفوظة
      const sale = await db.sales.get(saleId);
      expect(sale).toBeDefined();
      expect(sale?.number).toBe('INV-TEST-' + saleId.slice(0, 6));
    });
  });

  describe('getTemplateForDocType', () => {
    it('يعيد القالب المعيّن لنوع الوثيقة', async () => {
      const template = await getTemplateForDocType('thermal-receipt');
      expect(template).toBeDefined();
      expect(template?.id).toBe('default-thermal-80');
    });

    it('يعيد القالب الافتراضي عند عدم وجود تعيين', async () => {
      // حذف التعيين
      await db.template_assignments.delete('sale-invoice');
      const template = await getTemplateForDocType('sale-invoice');
      expect(template).toBeDefined();
      // fallback لأول قالب يدعم sale-invoice
      expect(template?.supportedDocuments).toContain('sale-invoice');
    });
  });

  describe('تحديث lastPrintedAt', () => {
    it('يُحدّث حقل lastPrintedAt بعد الطباعة الناجحة', async () => {
      const saleId = 'sale-printed-at-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowSuccess();

      await printDocument(saleId, 'thermal-receipt', {
        userId: 'user-1',
        userName: 'مستخدم',
      });

      const sale = await db.sales.get(saleId);
      expect(sale?.lastPrintedAt).toBeDefined();
      expect(typeof sale?.lastPrintedAt).toBe('string');
    });
  });
});
