// Print Queue Service — POS-PRINT-001 Phase 2 (P0)
// طابور الطباعة المؤجلة — FR-009 (طباعة مؤجلة) + FR-012 (إلغاء)
// TTL sweep via printQueueSweep.ts — BR-004/005
// إعادة استخدام منطق printService دون تكرار (buildDocumentContext / enforceTaxQr / recordPrintFailure)
import type {
  DocTypeKey,
  PrintTemplate,
  PrintHistoryRecord,
} from '@/types/invoicePrint';
import { renderDocumentHTML, buildPrintPage } from './renderTemplate';
import { doPrint } from './printEngine';
import { getConnection } from './printerConnection';
import { getPrinter } from './printerService';
import {
  getTemplateForDocType,
  buildDocumentContext,
  enforceTaxQr,
  recordPrintFailure,
  resetPrintFailures,
} from './printService';
import { db } from '@/infrastructure/database/dexie/db';
import type { PrintJobEntity, PrintJobStatus } from '@/infrastructure/database/dexie/db';
import { normalizeInvoiceNumber } from '@/utils';

// ===== قفل المعالجة المتزامنة (منع تشغيلين متوازيين لـ processQueue) =====
let isProcessing = false;

/**
 * الحصول على جميع المهام في الطابور (للعرض)
 */
export async function getQueueJobs(status?: PrintJobStatus): Promise<PrintJobEntity[]> {
  if (status) {
    return db.print_jobs.where('status').equals(status).toArray();
  }
  return db.print_jobs.toArray();
}

/**
 * الحصول على مهمة محددة
 */
export async function getJob(id: string): Promise<PrintJobEntity | undefined> {
  return db.print_jobs.get(id);
}

/**
 * إضافة مهمة طباعة إلى الطابور (enqueue)
 * FR-009: طباعة مؤجلة
 * BR-PRINT-001: لا يمكن طباعة فاتورة غير محفوظة
 * BR-PRINT-010: snapshot كامل البيانات عند الإضافة (الفاتورة لا تتأثر بالتعديل لاحقاً)
 */
export async function enqueuePrintJob(
  saleId: string,
  docType: DocTypeKey = 'sale-invoice',
  options: {
    userId: string;
    userName: string;
    templateId?: string;
    copies?: number;
    isReprint?: boolean;
    printerId?: string;
  },
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const { userId, userName, copies = 1, isReprint = false, printerId = 'browser' } = options;

    // BR-PRINT-001: لا يمكن طباعة فاتورة غير محفوظة
    const sale = await db.sales.get(saleId);
    if (!sale) {
      return { success: false, error: 'الفاتورة غير موجودة' };
    }

    const items = await db.sale_items.where('saleId').equals(saleId).toArray();
    const embeddedItems = Array.isArray(sale.items) ? sale.items : [];
    if (items.length === 0 && embeddedItems.length === 0 && !isReprint) {
      return { success: false, error: 'الفاتورة لا تحتوي على منتجات' };
    }

    // الحصول على القالب
    let template: PrintTemplate | null = null;
    if (options.templateId) {
      template = await db.print_templates.get(options.templateId) ?? null;
    }
    if (!template) {
      template = await getTemplateForDocType(docType);
    }
    if (!template) {
      return { success: false, error: 'لم يتم العثور على قالب مناسب' };
    }

    // BR-001: إجبار QR الضريبي
    template = enforceTaxQr(template, await db.settings.get('default'));

    // بناء السياق + توليد HTML (snapshot — BR-PRINT-010)
    const ctx = await buildDocumentContext(sale, items, template, userId, userName, docType);
    const bodyHtml = renderDocumentHTML(ctx);
    const pageHtml = buildPrintPage(template, bodyHtml, `فاتورة ${normalizeInvoiceNumber(sale.number)}`);

    // إنشاء مهمة الطابور
    const now = new Date().toISOString();
    const job: PrintJobEntity = {
      id: crypto.randomUUID(),
      invoiceId: saleId,
      templateId: template.id,
      printerId,
      status: 'pending',
      copies,
      payload: JSON.stringify({
        docType,
        userId,
        userName,
        isReprint,
        html: pageHtml,
        invoiceNumber: normalizeInvoiceNumber(sale.number),
        templateName: template.name,
      }),
      createdAt: now,
    };
    await db.print_jobs.add(job);

    // المعالجة الفورية ليست تلقائية — تُستدعى صراحةً عبر processQueue()
    // أو تُشغّل تلقائياً من usePrintQueueSweep عند visibilitychange/focus (BR-004/005)
    return { success: true, jobId: job.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * معالجة الطابور (processQueue)
 * يحوّل pending → printing → success/failed ويكتب سجل التدقيق
 * BR-PRINT-005: تسجيل في print_history + user_activities
 * BR-003: عدّاد فشل الطباعة + تنبيه بعد 3
 * يعيد { processed, succeeded, failed }
 */
export async function processQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
  // قفل المعالجة المتزامنة
  if (isProcessing) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  isProcessing = true;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // جلب المعلّقة FIFO حسب createdAt
    const pending = await db.print_jobs
      .where('status').equals('pending')
      .toArray();
    pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const job of pending) {
      // قد يكون أُلغي بين الجلب والمعالجة
      const fresh = await db.print_jobs.get(job.id);
      if (!fresh || fresh.status !== 'pending') continue;

      processed++;

      // pending → printing (transaction)
      await db.print_jobs.update(job.id, {
        status: 'printing',
        processedAt: new Date().toISOString(),
      });

      try {
        const payload = JSON.parse(job.payload) as {
          html: string;
          docType: DocTypeKey;
          userId: string;
          userName: string;
          isReprint: boolean;
          invoiceNumber: string;
          templateName: string;
        };

        // تنفيذ الطباعة الفعلية — FR-013/017: عبر Connection المناسب للطابعة
        const printerId = job.printerId && job.printerId !== 'browser' ? job.printerId : undefined;
        let printErr: unknown = null;
        if (printerId) {
          const printer = await getPrinter(printerId);
          if (printer) {
            const conn = getConnection(printer);
            const res = await conn.print(payload.html, job.copies);
            if (!res.success) printErr = new Error(res.error ?? 'print failed');
          } else {
            try {
              await doPrint(payload.html, job.copies);
            } catch (e) {
              printErr = e;
            }
          }
        } else {
          try {
            await doPrint(payload.html, job.copies);
          } catch (e) {
            printErr = e;
          }
        }
        if (printErr) throw printErr;

        // نجاح → تسجيل سجل التدقيق (BR-PRINT-005)
        const historyRecord: PrintHistoryRecord = {
          id: crypto.randomUUID(),
          invoiceId: job.invoiceId,
          invoiceType: 'sale',
          docTypeKey: payload.docType,
          templateId: job.templateId,
          printedBy: payload.userId,
          printedAt: new Date().toISOString(),
          copies: job.copies,
          printerName: job.printerId,
          isReprint: payload.isReprint,
        };
        await db.print_history.add(historyRecord);

        // سجل النشاطات الموحّد
        try {
          await db.user_activities.add({
            id: crypto.randomUUID(),
            action: payload.isReprint ? 'reprint_invoice' : 'print_invoice',
            entity: 'sale',
            entityType: 'sale',
            entityId: job.invoiceId,
            userId: payload.userId,
            details: `طبع ${job.copies} نسخة عبر ${payload.templateName}${payload.isReprint ? ' (إعادة طباعة)' : ''}`,
            performedAt: new Date().toISOString(),
          });
        } catch {
          // تجاهل أخطاء السجل في بيئة الاختبار
        }

        // تحديث آخر طباعة للفاتورة
        await db.sales.update(job.invoiceId, {
          lastPrintedAt: new Date().toISOString(),
        });

        // BR-003: إعادة تعيين عدّاد الفشل
        await resetPrintFailures(job.templateId, job.printerId);

        // success
        await db.print_jobs.update(job.id, {
          status: 'success',
          processedAt: new Date().toISOString(),
        });
        succeeded++;
      } catch (err) {
        // BR-003: عدّاد فشل + تنبيه بعد 3
        await recordPrintFailure(job.templateId, job.printerId, String(err));

        await db.print_jobs.update(job.id, {
          status: 'failed',
          errorMessage: String(err).slice(0, 500),
          processedAt: new Date().toISOString(),
        });
        failed++;
      }
    }

    return { processed, succeeded, failed };
  } finally {
    isProcessing = false;
  }
}

/**
 * إلغاء مهمة (cancelJob)
 * FR-012: إلغاء طباعة قيد التنفيذ
 * - pending → cancelled ✓
 * - printing → مرفوض (window.print عملية متزامنة غير قابلة للإلغاء)
 * - نهائي → no-op
 */
export async function cancelJob(id: string): Promise<{ cancelled: boolean; reason?: string }> {
  const job = await db.print_jobs.get(id);
  if (!job) {
    return { cancelled: false, reason: 'المهمة غير موجودة' };
  }
  if (job.status === 'printing') {
    return { cancelled: false, reason: 'job_in_progress' };
  }
  if (job.status !== 'pending') {
    return { cancelled: false, reason: `job_already_${job.status}` };
  }

  await db.print_jobs.update(id, {
    status: 'cancelled',
    processedAt: new Date().toISOString(),
  });
  return { cancelled: true };
}

/**
 * إعادة محاولة مهمة فاشلة (retryJob)
 * يعيد status إلى pending ثم يستدعي processQueue
 */
export async function retryJob(id: string): Promise<{ success: boolean; error?: string }> {
  const job = await db.print_jobs.get(id);
  if (!job) {
    return { success: false, error: 'المهمة غير موجودة' };
  }
  if (job.status !== 'failed') {
    return { success: false, error: 'يمكن إعادة المحاولة للمهام الفاشلة فقط' };
  }

  await db.print_jobs.update(id, {
    status: 'pending',
    errorMessage: undefined,
    processedAt: undefined,
  });

  void processQueue();
  return { success: true };
}

/**
 * حذف مهمة من السجل (آمن — لا يحذف pending/printing)
 */
export async function deleteJob(id: string): Promise<{ deleted: boolean; reason?: string }> {
  const job = await db.print_jobs.get(id);
  if (!job) {
    return { deleted: false, reason: 'المهمة غير موجودة' };
  }
  if (job.status === 'pending' || job.status === 'printing') {
    return { deleted: false, reason: 'cannot_delete_active_job' };
  }
  await db.print_jobs.delete(id);
  return { deleted: true };
}
