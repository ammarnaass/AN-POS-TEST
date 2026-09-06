// Print Service — POS-PRINT-001
// محرك الطباعة المتكامل يربط بين POS والقوالب
import type {
  DocumentContext,
  PrintTemplate,
  PrintHistoryRecord,
  DocTypeKey,
  ShopLegalInfo,
} from '@/types/invoicePrint';
import { renderDocumentHTML, buildPrintPage } from './renderTemplate';
import { doPrint } from './printEngine';
import { db } from '@/infrastructure/database/dexie/db';
import type { SaleEntity, SaleItemEntity, PrintFailureCounterEntity, SettingsEntity } from '@/infrastructure/database/dexie/db';
import { normalizeInvoiceNumber } from '@/utils';
import { useNotificationStore } from '@/store/notificationStore';
import { getPrinter, getPrinterTemplateMapping } from './printerService';
import { getConnection } from './printerConnection';

// ====== BR-PRINT-002: كل فاتورة تحصل على رقم فريد قبل الطباعة ======
// ====== BR-PRINT-010: عند فشل الطباعة تبقى الفاتورة محفوظة ======
// ====== BR-PRINT-005: كل عملية طباعة تسجل في سجل التدقيق ======
// ====== BR-PRINT-003: إعادة الطباعة لا تنشئ فاتورة جديدة ======

/**
 * FR-014: احصل على القالب المرتبط بطابعة محددة لنوع وثيقة.
 * يُرجع null إذا لم يوجد تعيين — يقع fallback لـ getTemplateForDocType.
 */
export async function getTemplateForPrinter(
  printerId: string,
  docType: DocTypeKey,
): Promise<PrintTemplate | null> {
  const mapping = await getPrinterTemplateMapping(printerId, docType);
  if (mapping) {
    const template = await db.print_templates.get(mapping.templateId);
    if (template) return template;
  }
  return null;
}

import { ALL_DEFAULT_TEMPLATES } from './defaultTemplates';

export async function getTemplateForDocType(docType: DocTypeKey): Promise<PrintTemplate | null> {
  try {
    const assignment = await db.template_assignments.get(docType);
    if (assignment) {
      const template = await db.print_templates.get(assignment.templateId);
      if (template) return template;
    }
    // fallback: أول قالب يدعم هذا النوع من قاعدة البيانات
    const templates = await db.print_templates.toArray();
    if (templates && templates.length > 0) {
      const matched = templates.find((t) => t.supportedDocuments?.includes(docType)) || templates[0];
      if (matched) return matched;
    }
  } catch (e) {
    console.warn('Error fetching print template from database:', e);
  }

  // Fallback آمن للقوالب الافتراضية المدمجة
  const staticFallback =
    ALL_DEFAULT_TEMPLATES.find((t) => t.supportedDocuments?.includes(docType)) ||
    ALL_DEFAULT_TEMPLATES[0];
  return staticFallback ?? null;
}

/**
 * احصل على تعيين القالب الافتراضي
 */
export async function getDefaultTemplateId(docType: DocTypeKey): Promise<string> {
  const assignment = await db.template_assignments.get(docType);
  return assignment?.templateId ?? 'default-thermal-80';
}

/**
 * عين قالب افتراضي لنوع وثيقة
 */
export async function setDefaultTemplate(docType: DocTypeKey, templateId: string): Promise<void> {
  await db.template_assignments.put({ docType, templateId });
}

/**
 * بناء سياق المستند من بيانات الفاتورة
 */
export async function buildDocumentContext(
  sale: SaleEntity,
  items: SaleItemEntity[],
  template: PrintTemplate,
  userId: string,
  userName: string,
  docType: DocTypeKey = 'sale-invoice',
  options?: { lang?: PrintLanguage; [key: string]: any },
): Promise<DocumentContext> {
  const settings = await db.settings.get('default');

  const shopLegal: ShopLegalInfo = {
    name: settings?.shopName ?? 'المحل',
    phone: settings?.phone ?? settings?.shopPhone2 ?? '',
    email: settings?.email ?? settings?.shopEmail ?? '',
    address: settings?.shopAddress ?? settings?.address ?? '',
    footer: settings?.receiptFooter ?? 'شكراً لزيارتكم',
    // المعلومات القانونية الجزائرية
    taxNumber: settings?.taxNumber ?? settings?.taxId ?? '',
    commercialRegister: settings?.commercialRegister ?? settings?.companyRC ?? '',
    nif: settings?.companyNif ?? settings?.taxNumber ?? settings?.taxId ?? '',
    ai: settings?.companyAI ?? settings?.companyArt ?? settings?.taxArticle ?? '',
    logo: (settings as any)?.shopLogo || (settings as any)?.logo || '',
  };

  // تحويل عناصر البيع — يدعم النماذج المختلفة (sale_items أو sale.items كمصفوفة أو كـ JSON نصي)
  let sourceItems: any[] = [];
  if (items && items.length > 0) {
    sourceItems = items;
  } else if (sale.items) {
    if (typeof sale.items === 'string') {
      try {
        sourceItems = JSON.parse(sale.items);
      } catch {
        sourceItems = [];
      }
    } else if (Array.isArray(sale.items)) {
      sourceItems = sale.items;
    }
  }
  const invoiceItems = sourceItems.map((rawItem) => {
    const item = rawItem as Partial<SaleItemEntity> & Record<string, unknown>;
    return {
      name: String(item.name ?? ''),
      qty: Number(item.qty ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
      batchNumber: String(item.batchNumber ?? ''),
    };
  });

  const invoice = {
    ...sale,
    items: invoiceItems,
    number: normalizeInvoiceNumber(sale.number),
    date: sale.date,
    subtotal: sale.subtotal,
    discount: sale.discount,
    tvaAmount: sale.tvaAmount,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
  };

  // POS-PRINT-001 / BR-001: إجبار QR الضريبي في كل فاتورة إذا كان المتجر مسجلاً ضريبياً
  // الكشف عبر settings.zakatEnabled OR settings.taxId (NIF) OR shopLegal.commercialRegister
  const isTaxRegistered = Boolean(
    (settings as Record<string, unknown> | undefined)?.zakatEnabled ||
    (settings as Record<string, unknown> | undefined)?.taxId ||
    settings?.companyNif ||
    settings?.companyRC ||
    settings?.taxNumber
  );
  let enforcedTemplate = template;
  if (isTaxRegistered && (!template.qr || !template.qr.enabled)) {
    enforcedTemplate = {
      ...template,
      qr: { enabled: true, payload: 'invoiceNumber:date:total' },
    };
    // تسجيل نشاط الإجبار Audit
    try {
      await db.user_activities.add({
        id: crypto.randomUUID(),
        action: 'qr_tax_enforced',
        entity: 'sale',
        entityType: 'sale',
        entityId: sale.id,
        userId,
        details: `إجبار QR الضريبي تلقائياً (القالب: ${template.name}) — BR-001`,
        performedAt: new Date().toISOString(),
      });
    } catch {
      // تجاهل أخطاء السجل في بيئة الاختبار
    }
  }

  const printLang = ((options as any)?.lang as PrintLanguage) ||
    ((settings as any)?.printLanguage as PrintLanguage) ||
    ((settings as any)?.language as PrintLanguage) ||
    'ar';

  return {
    invoice,
    settings: (settings as unknown as Record<string, unknown>) ?? {},
    template: enforcedTemplate,
    shopLegal,
    user: { id: userId, name: userName, role: 'cashier' },
    lang: printLang,
    invoiceUrl: undefined,
  };
}

/**
 * طباعة مستند — تفتح نافذة معاينة ثم طباعة المتصفح
 */
// BR-PRINT-001: لا يمكن طباعة فاتورة غير محفوظة
// BR-PRINT-002: كل فاتورة تحصل على رقم فريد قبل الطباعة
// BR-PRINT-003: إعادة الطباعة لا تنشئ فاتورة جديدة
// BR-PRINT-005: كل عملية طباعة تسجل في سجل التدقيق
// BR-PRINT-010: فشل الطباعة لا يمس الفاتورة المحفوظة
export async function printDocument(
  saleId: string,
  docType: DocTypeKey = 'sale-invoice',
  options: {
    userId: string;
    userName: string;
    templateId?: string;
    printerId?: string;
    copies?: number;
    isReprint?: boolean;
  } = { userId: '', userName: '', copies: 1 },
): Promise<{ success: boolean; error?: string }> {
  // POS-PRINT-001 / FR-013: متاح للـ catch أيضاً (scope الدالة)
  let printerName = 'browser';
  let printerId: string | undefined = options.printerId;
  try {
    const { userId, userName, copies = 1, isReprint = false } = options;

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

    // الحصول على الطابعة — FR-013/014 (معرّف خارج try للوصول في catch)
    if (printerId) {
      const printer = await getPrinter(printerId);
      if (printer) {
        printerName = printer.name;
      } else {
        printerId = undefined;
      }
    }

    // الحصول على القالب — أولوية: templateId صريح → تعيين الطابعة (FR-014) → قالب النوع
    let template: PrintTemplate | null = null;
    if (options.templateId) {
      template = await db.print_templates.get(options.templateId) ?? null;
    }
    if (!template && printerId) {
      template = await getTemplateForPrinter(printerId, docType);
    }
    if (!template) {
      template = await getTemplateForDocType(docType);
    }
    if (!template) {
      return { success: false, error: 'لم يتم العثور على قالب مناسب' };
    }

    // BR-001: إجبار QR Code الضريبي إذا كان المتجر مسجلاً ضريبياً
    template = enforceTaxQr(template, await db.settings.get('default'));

    // بناء السياق
    const ctx = await buildDocumentContext(sale, items, template, userId, userName, docType, options);

    // توليد HTML
    const bodyHtml = renderDocumentHTML(ctx);
    const pageHtml = buildPrintPage(template, bodyHtml, `فاتورة ${normalizeInvoiceNumber(sale.number)}`, ctx.lang);

    // طباعة — FR-013/017: عبر Connection المناسب للطابعة
    if (printerId) {
      const printer = await getPrinter(printerId);
      if (printer) {
        const conn = getConnection(printer);
        const result = await conn.print(pageHtml, copies);
        if (!result.success) {
          await recordPrintFailure(options.templateId, printerId, result.error ?? 'print failed');
          return { success: false, error: result.error };
        }
      } else {
        await doPrint(pageHtml, copies);
      }
    } else {
      // السلوك الأصلي — window.print عبر printEngine
      await doPrint(pageHtml, copies);
    }

    // BR-PRINT-003: إعادة الطباعة لا تنشئ فاتورة جديدة
    // BR-PRINT-005: تسجيل في سجل التدقيق
    const historyRecord: PrintHistoryRecord = {
      id: crypto.randomUUID(),
      invoiceId: saleId,
      invoiceType: sale.type === 'return' ? 'sale' : 'sale', // sale type enum
      docTypeKey: docType,
      templateId: template.id,
      printedBy: userId,
      printedAt: new Date().toISOString(),
      copies,
      printerName: printerName,
      isReprint,
    };
    await db.print_history.add(historyRecord);

    // BR-PRINT-005: تسجيل في سجل النشاطات الموحّد (user_activities)
    await db.user_activities.add({
      id: crypto.randomUUID(),
      action: isReprint ? 'reprint_invoice' : 'print_invoice',
      entity: 'sale',
      entityType: 'sale',
      entityId: saleId,
      userId,
      details: `طبع ${copies} نسخة عبر ${template.name}${isReprint ? ' (إعادة طباعة)' : ''}`,
      performedAt: new Date().toISOString(),
    });

    // تحديث آخر مرة طبعت فيها الفاتورة
    await db.sales.update(saleId, {
      lastPrintedAt: new Date().toISOString(),
    });

    // BR-003: إعادة تعيين عدّاد الفشل بعد نجاح الطباعة
    await resetPrintFailures(options.templateId, printerId ?? 'browser');

    return { success: true };
  } catch (err) {
    // BR-PRINT-010: الفاتورة تبقى محفوظة عند فشل الطباعة
    console.error('Print error:', err);
    // BR-003: عدّاد فشل الطباعة + تنبيه الأدمن بعد 3 محاولات متتالية
    await recordPrintFailure(options.templateId, printerId ?? 'browser', String(err));
    return { success: false, error: String(err) };
  }
}

/**
 * معاينة الفاتورة — تفتح نافذة بدون طباعة
 */
export async function previewDocument(
  saleId: string,
  docType: DocTypeKey = 'sale-invoice',
  options: {
    userId: string;
    userName: string;
    templateId?: string;
  } = { userId: '', userName: '' },
): Promise<{ success: boolean; html?: string; error?: string }> {
  try {
    const { userId, userName } = options;

    const sale = await db.sales.get(saleId);
    if (!sale) {
      return { success: false, error: 'الفاتورة غير موجودة' };
    }

    const items = await db.sale_items.where('saleId').equals(saleId).toArray();

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

    const ctx = await buildDocumentContext(sale, items, template, userId, userName, docType, options);
    const bodyHtml = renderDocumentHTML(ctx);
    const pageHtml = buildPrintPage(template, bodyHtml, `معاينة: فاتورة ${normalizeInvoiceNumber(sale.number)}`, ctx.lang);

    return { success: true, html: pageHtml };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * فتح نافذة المعاينة
 */
export async function openPreviewWindow(
  saleId: string,
  docType: DocTypeKey = 'sale-invoice',
  options: { userId: string; userName: string; templateId?: string } = { userId: '', userName: '' },
): Promise<void> {
  const result = await previewDocument(saleId, docType, options);
  if (result.success && result.html) {
    const win = window.open('', '_blank', 'width=500,height=700');
    if (win) {
      win.document.write(result.html);
      win.document.close();
    }
  }
}

/**
 * طباعة مباشرة بدون معاينة (للطباعة الصامتة مستقبلاً)
 */
export async function printDirect(
  saleId: string,
  docType: DocTypeKey = 'sale-invoice',
  options: {
    userId: string;
    userName: string;
    templateId?: string;
    printerId?: string;
    copies?: number;
  } = { userId: '', userName: '', copies: 1 },
): Promise<{ success: boolean; error?: string }> {
  return printDocument(saleId, docType, { ...options, isReprint: false });
}

/**
 * إعادة طباعة فاتورة سابقة
 */
export async function reprintDocument(
  saleId: string,
  options: {
    userId: string;
    userName: string;
    templateId?: string;
    printerId?: string;
    copies?: number;
  } = { userId: '', userName: '', copies: 1 },
): Promise<{ success: boolean; error?: string }> {
  return printDocument(saleId, 'sale-invoice', { ...options, isReprint: true });
}

/**
 * الحصول على سجل طباعة فاتورة محددة أو كامل سجل الطباعة للنظام
 */
export async function getPrintHistory(saleId?: string): Promise<PrintHistoryRecord[]> {
  try {
    if (!saleId) {
      const all = await db.print_history.toArray();
      return (all || []).sort((a, b) => new Date(b.printedAt).getTime() - new Date(a.printedAt).getTime());
    }
    const filtered = await db.print_history.where('invoiceId').equals(saleId).toArray();
    return (filtered || []).sort((a, b) => new Date(b.printedAt).getTime() - new Date(a.printedAt).getTime());
  } catch (err) {
    console.warn('Failed to load print history:', err);
    return [];
  }
}

/**
 * الحصول على آخر عملية طباعة للفاتورة
 */
export async function getLastPrint(saleId: string): Promise<PrintHistoryRecord | undefined> {
  const records = await getPrintHistory(saleId);
  return records.sort((a, b) => new Date(b.printedAt).getTime() - new Date(a.printedAt).getTime())[0];
}

// ===== POS-PRINT-001 / BR-003: عدّاد فشل الطباعة + تنبيه الأدمن =====

const PRINT_FAILURE_THRESHOLD = 3;

/**
 * BR-001: إجبار QR Code الضريبي إذا كان المتجر مسجلاً ضريبياً (zakatEnabled أو taxId)
 * يُعيد نسخة من القالب مع QR مفعّل إن لزم الأمر. لا يعدّل القالب الأصلي.
 */
export function enforceTaxQr(template: PrintTemplate, settings: SettingsEntity | undefined): PrintTemplate {
  const isTaxRegistered = Boolean(settings?.zakatEnabled || settings?.taxId || settings?.taxNumber);
  if (!isTaxRegistered) return template;
  if (template.qr?.enabled) return template;

  // إجبار QR — بازدواجة القالب مع تفعيل QR
  return {
    ...template,
    qr: {
      enabled: true,
      payload: 'invoiceNumber:date:total',
    },
  };
}


/**
 * تسجيل فشل طباعة — يزيد العداد ويُنبه الأدمن عند بلوغ العتبة
 */
export async function recordPrintFailure(templateId: string | undefined, printerId: string, errorMessage: string): Promise<void> {
  const counterId = `pfc-${templateId ?? 'unknown'}-${printerId}`;
  const now = new Date().toISOString();
  const existing = await db.print_failure_counter.get(counterId);
  const newCount = (existing?.consecutiveFailures ?? 0) + 1;

  const counter: PrintFailureCounterEntity = {
    id: counterId,
    printerId,
    templateId,
    consecutiveFailures: newCount,
    lastFailureAt: now,
    lastError: errorMessage.slice(0, 200),
    notified: existing?.notified ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  // بلوغ العتبة → تنبيه الأدمن (مرة واحدة لكل دورة فشل)
  if (newCount >= PRINT_FAILURE_THRESHOLD && !counter.notified) {
    counter.notified = true;
    try {
      useNotificationStore.getState().addNotification({
        title: 'فشل الطباعة المتكرر',
        message: `فشلت ${newCount} محاولات طباعة متتالية عبر ${printerId}${templateId ? ` (قالب: ${templateId})` : ''} — راجع اتصال الطابعة أو القالب`,
        type: 'error',
      });
    } catch {
      // تجاهل أخطاء الـ store في بيئة الاختبار
    }
  }

  await db.print_failure_counter.put(counter);
}

/**
 * إعادة تعيين عدّاد الفشل بعد نجاح الطباعة
 */
export async function resetPrintFailures(templateId: string | undefined, printerId: string): Promise<void> {
  const counterId = `pfc-${templateId ?? 'unknown'}-${printerId}`;
  const existing = await db.print_failure_counter.get(counterId);
  if (existing && existing.consecutiveFailures > 0) {
    await db.print_failure_counter.put({
      ...existing,
      consecutiveFailures: 0,
      lastError: undefined,
      notified: false,
      updatedAt: new Date().toISOString(),
    });
  }
}