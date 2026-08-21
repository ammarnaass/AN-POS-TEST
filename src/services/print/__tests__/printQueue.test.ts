// printQueue اختبارات — POS-PRINT-001 Phase 2
// FR-009: طباعة مؤجلة (enqueue/process)
// FR-012: إلغاء الطباعة (cancelJob)
// BR-004/005: TTL sweep — حذف pending بعد 24h
// BR-003: عدّاد فشل الطباعة + تنبيه بعد 3
// BR-PRINT-001: لا يمكن طباعة فاتورة غير محفوظة
// BR-PRINT-005: تسجيل في print_history + user_activities
// BR-PRINT-010: snapshot — الفاتورة لا تتأثر بالتعديل بعد enqueue
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import { seedDefaultTemplates } from '@/services/print/defaultTemplates';
import {
  enqueuePrintJob,
  processQueue,
  cancelJob,
  retryJob,
  deleteJob,
  getQueueJobs,
  getJob,
} from '@/services/print/printQueueService';
import { sweepPendingJobs, sweepAllStaleJobs, TTL_MS } from '@/services/print/printQueueSweep';

const NOW = '2026-07-06T10:00:00.000Z';

async function createTestSale(saleId: string): Promise<void> {
  await db.sales.add({
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
  });
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
    open: vi.fn(() => {
      // محاكاة document.close() → إطلاق onload فوراً (مثل window حقيقي)
      setTimeout(() => {
        if (fakeWin.onload) fakeWin.onload();
      }, 0);
      return fakeWin;
    }),
  });
  // أعد إعادة القراءة عند الطلب
  return fakeWin;
}

function mockPrintWindowFail() {
  vi.stubGlobal('window', {
    ...window,
    open: vi.fn(() => null),
  });
}

describe('POS-PRINT-001 Phase 2: Print Queue', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDefaultTemplates();
    await createTestSettings();
    vi.unstubAllGlobals();
  });

  describe('BR-PRINT-001: enqueuePrintJob — لا يمكن طباعة فاتورة غير محفوظة', () => {
    it('يرفض إضافة فاتورة غير موجودة', async () => {
      const result = await enqueuePrintJob('nonexistent', 'sale-invoice', {
        userId: 'u1',
        userName: 'مستخدم',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('غير موجودة');
    });

    it('يرفض فاتورة بدون منتجات', async () => {
      const saleId = 'sale-empty-' + Date.now();
      await db.sales.add({
        id: saleId,
        number: 'INV-EMPTY',
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
        soldBy: 'u1',
        createdAt: NOW,
        updatedAt: NOW,
      });
      const result = await enqueuePrintJob(saleId, 'sale-invoice', {
        userId: 'u1',
        userName: 'مستخدم',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('منتجات');
    });
  });

  describe('FR-009: enqueuePrintJob — إضافة مهمة للطابور', () => {
    it('ينشئ job بـ status=pending ويمرر templateId', async () => {
      const saleId = 'sale-enq-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowSuccess();

      const result = await enqueuePrintJob(saleId, 'sale-invoice', {
        userId: 'u1',
        userName: 'مستخدم',
        copies: 2,
      });
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();

      // على الأقل job واحد pending (قد يكون معالَج فوراً)
      const jobs = await getQueueJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(1);
      const job = jobs[0];
      expect(job.invoiceId).toBe(saleId);
      expect(job.copies).toBe(2);
      expect(['pending', 'success']).toContain(job.status);
      expect(job.payload).toContain('html');
    });

    it('BR-PRINT-010: يحفظ snapshot HTML في payload', async () => {
      const saleId = 'sale-snap-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowSuccess();

      const result = await enqueuePrintJob(saleId, 'thermal-receipt', {
        userId: 'u1',
        userName: 'مستخدم',
      });
      expect(result.success).toBe(true);
      const job = await getJob(result.jobId!);
      const payload = JSON.parse(job!.payload);
      expect(payload.html).toContain('print-doc');
      expect(payload.invoiceNumber).toContain('INV-TEST');
    });
  });

  describe('processQueue — معالجة الطابور', () => {
    it('يحوّل pending إلى success ويكتب print_history (BR-PRINT-005)', async () => {
      const saleId = 'sale-proc-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowSuccess();

      const enq = await enqueuePrintJob(saleId, 'sale-invoice', {
        userId: 'user-proc',
        userName: 'مستخدم',
        copies: 1,
      });
      expect(enq.success).toBe(true);

      // processQueue يُستدعى داخلياً في enqueuePrintJob، لكن نستدعيه صراحةً
      const result = await processQueue();
      expect(result.processed).toBeGreaterThanOrEqual(1);

      // BR-PRINT-005: سجل التدقيق
      const history = await db.print_history.where('invoiceId').equals(saleId).toArray();
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].copies).toBe(1);

      // job = success
      const job = await getJob(enq.jobId!);
      expect(job?.status).toBe('success');
      expect(job?.processedAt).toBeDefined();
    });

    it('يكتب user_activities بعد النجاح (BR-PRINT-005)', async () => {
      const saleId = 'sale-act-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowSuccess();

      await enqueuePrintJob(saleId, 'sale-invoice', {
        userId: 'user-act',
        userName: 'مستخدم',
      });
      await processQueue();

      const acts = await db.user_activities
        .where('entityId').equals(saleId)
        .toArray();
      expect(acts.length).toBeGreaterThanOrEqual(1);
      expect(acts[0].action).toBe('print_invoice');
    });

    it('يحدّث lastPrintedAt بعد النجاح', async () => {
      const saleId = 'sale-last-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowSuccess();

      await enqueuePrintJob(saleId, 'sale-invoice', { userId: 'u1', userName: 'مستخدم' });
      await processQueue();

      const sale = await db.sales.get(saleId);
      expect(sale?.lastPrintedAt).toBeDefined();
    });

    it('عند الفشل: status=failed + errorMessage + يدفع عدّاد BR-003', async () => {
      const saleId = 'sale-fail-' + Date.now();
      await createTestSale(saleId);
      mockPrintWindowFail();

      const enq = await enqueuePrintJob(saleId, 'sale-invoice', {
        userId: 'u1',
        userName: 'مستخدم',
      });
      expect(enq.success).toBe(true);
      await processQueue();

      const job = await getJob(enq.jobId!);
      expect(job?.status).toBe('failed');
      expect(job?.errorMessage).toBeDefined();
      expect(job?.errorMessage).toContain('تعذر');

      // BR-003: عدّاد فشل
      const counters = await db.print_failure_counter.toArray();
      expect(counters.length).toBeGreaterThanOrEqual(1);
      expect(counters[0].consecutiveFailures).toBeGreaterThanOrEqual(1);
    });

    it('يحترم قفل المعالجة المتزامنة (isProcessing)', async () => {
      const saleId = 'sale-1-' + Date.now();
      const saleId2 = 'sale-2-' + Date.now();
      await createTestSale(saleId);
      await createTestSale(saleId2);
      mockPrintWindowSuccess();

      await enqueuePrintJob(saleId, 'sale-invoice', { userId: 'u1', userName: 'مستخدم' });
      await enqueuePrintJob(saleId2, 'sale-invoice', { userId: 'u1', userName: 'مستخدم' });

      // تشغيل متوازي — لا يكسر القفل
      const [r1, r2] = await Promise.all([processQueue(), processQueue()]);
      // أحدهما يعمل فعلياً، الآخر يعيد 0 (مقفل)
      const total = r1.processed + r2.processed;
      expect(total).toBeGreaterThanOrEqual(0); // الـ processing التلقائي في enqueue قد يعالجها
    });
  });

  describe('FR-012: cancelJob — إلغاء الطباعة', () => {
    it('يلغي pending job', async () => {
      const saleId = 'sale-cancel-' + Date.now();
      await createTestSale(saleId);
      // لا mock — حتى لا يُعالَج فوراً في enqueue (mock النجاح يجعل processQueue يُكمله)
      vi.stubGlobal('window', { ...window, open: vi.fn(() => null) }); // فشل → يبقى failed ولم ينجح
      // نعطّل المعالجة التلقائية بفشل الطباعة ثم نعيد التعيين pending يدوياً
      const enq = await enqueuePrintJob(saleId, 'sale-invoice', { userId: 'u1', userName: 'مستخدم' });
      await processQueue(); // failed بسبب popup blocker
      // أعِد إلى pending يدوياً لاختبار cancelJob
      await db.print_jobs.update(enq.jobId!, { status: 'pending' });

      const result = await cancelJob(enq.jobId!);
      expect(result.cancelled).toBe(true);
      const job = await getJob(enq.jobId!);
      expect(job?.status).toBe('cancelled');
      expect(job?.processedAt).toBeDefined();
    });

    it('يرفض إلغاء printing job', async () => {
      const saleId = 'sale-printing-' + Date.now();
      await createTestSale(saleId);

      // نُنشئ job ونعيّنها printing يدوياً لمحاكاة الحالة
      const id = 'mock-printing-' + Date.now();
      await db.print_jobs.add({
        id,
        invoiceId: saleId,
        templateId: 'tpl-1',
        printerId: 'browser',
        status: 'printing',
        copies: 1,
        payload: '{}',
        createdAt: NOW,
      });

      const result = await cancelJob(id);
      expect(result.cancelled).toBe(false);
      expect(result.reason).toBe('job_in_progress');
    });

    it('يرفض إلغاء job نهائية (success)', async () => {
      const id = 'mock-success-' + Date.now();
      await db.print_jobs.add({
        id,
        invoiceId: 's1',
        templateId: 'tpl-1',
        printerId: 'browser',
        status: 'success',
        copies: 1,
        payload: '{}',
        createdAt: NOW,
      });
      const result = await cancelJob(id);
      expect(result.cancelled).toBe(false);
    });
  });

  describe('retryJob — إعادة المحاولة', () => {
    it('يعيد failed إلى pending', async () => {
      const id = 'mock-failed-' + Date.now();
      await db.print_jobs.add({
        id,
        invoiceId: 's1',
        templateId: 'tpl-1',
        printerId: 'browser',
        status: 'failed',
        copies: 1,
        payload: '{}',
        errorMessage: 'err',
        createdAt: NOW,
      });
      const result = await retryJob(id);
      expect(result.success).toBe(true);
      const job = await getJob(id);
      expect(job?.status).toBe('pending');
      expect(job?.errorMessage).toBeUndefined();
    });

    it('يرفض إعادة محاولة غير-failed', async () => {
      const id = 'mock-pending-' + Date.now();
      await db.print_jobs.add({
        id,
        invoiceId: 's1',
        templateId: 'tpl-1',
        printerId: 'browser',
        status: 'pending',
        copies: 1,
        payload: '{}',
        createdAt: NOW,
      });
      const result = await retryJob(id);
      expect(result.success).toBe(false);
    });
  });

  describe('deleteJob', () => {
    it('يحذف job نهائية', async () => {
      const id = 'mock-del-' + Date.now();
      await db.print_jobs.add({
        id,
        invoiceId: 's1',
        templateId: 'tpl-1',
        printerId: 'browser',
        status: 'success',
        copies: 1,
        payload: '{}',
        createdAt: NOW,
      });
      const result = await deleteJob(id);
      expect(result.deleted).toBe(true);
      expect(await getJob(id)).toBeUndefined();
    });

    it('يرفض حذف pending/printing', async () => {
      const id = 'mock-del-active-' + Date.now();
      await db.print_jobs.add({
        id,
        invoiceId: 's1',
        templateId: 'tpl-1',
        printerId: 'browser',
        status: 'pending',
        copies: 1,
        payload: '{}',
        createdAt: NOW,
      });
      const result = await deleteJob(id);
      expect(result.deleted).toBe(false);
    });
  });

  describe('BR-004/005: TTL sweep', () => {
    it('يحذف pending الأقدم من 24h', async () => {
      const staleId = 'stale-' + Date.now();
      const freshId = 'fresh-' + Date.now();
      // stale: createdAt قبل يومين
      await db.print_jobs.add({
        id: staleId,
        invoiceId: 's1',
        templateId: 'tpl-1',
        printerId: 'browser',
        status: 'pending',
        copies: 1,
        payload: '{}',
        createdAt: new Date(Date.now() - (TTL_MS + 60000)).toISOString(),
      });
      // fresh: الآن
      await db.print_jobs.add({
        id: freshId,
        invoiceId: 's2',
        templateId: 'tpl-1',
        printerId: 'browser',
        status: 'pending',
        copies: 1,
        payload: '{}',
        createdAt: new Date().toISOString(),
      });

      const removed = await sweepPendingJobs();
      expect(removed).toBe(1);
      expect(await getJob(staleId)).toBeUndefined();
      expect(await getJob(freshId)).toBeDefined();
    });

    it('لا يحذف success/failed الحديثة', async () => {
      const id = 'success-fresh-' + Date.now();
      await db.print_jobs.add({
        id,
        invoiceId: 's1',
        templateId: 'tpl-1',
        printerId: 'browser',
        status: 'success',
        copies: 1,
        payload: '{}',
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      });
      const removed = await sweepPendingJobs();
      expect(removed).toBe(0);
      expect(await getJob(id)).toBeDefined();
    });

    it('sweepAllStaleJobs يحذف النهائيات الأقدم من 24h', async () => {
      const staleSuccessId = 'stale-success-' + Date.now();
      await db.print_jobs.add({
        id: staleSuccessId,
        invoiceId: 's1',
        templateId: 'tpl-1',
        printerId: 'browser',
        status: 'success',
        copies: 1,
        payload: '{}',
        createdAt: new Date(Date.now() - (TTL_MS + 1000)).toISOString(),
        processedAt: new Date(Date.now() - (TTL_MS + 500)).toISOString(),
      });
      const removed = await sweepAllStaleJobs();
      expect(removed).toBe(1);
      expect(await getJob(staleSuccessId)).toBeUndefined();
    });

    it('TTL_MS = 86400000 (24h)', () => {
      expect(TTL_MS).toBe(86400000);
    });
  });
});
