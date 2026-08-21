// Printer Service — POS-PRINT-001 / FR-013 → FR-017
// إدارة CRUD للطابعات + ربط القوالب بالطابعات (FR-014)
import type {
  Printer,
  PrinterTemplateMapping,
  DocTypeKey,
  PrinterConnectionKind,
  PrinterType,
  PrinterDriver,
  PrinterStatus,
} from '@/types/invoicePrint';
import { db } from '@/infrastructure/database/dexie/db';

const DEFAULT_PRINTER_ID = 'browser-printer';

function mappingId(printerId: string, docType: DocTypeKey): string {
  return `${printerId}__${docType}`;
}

let cachedDefaultId: string | null = null;

/**
 * FR-013: ضمان وجود طابعة المتصفح الافتراضية — يُستدعى أثناء seed
 */
export async function ensureDefaultPrinter(): Promise<void> {
  const existing = await db.printers.get(DEFAULT_PRINTER_ID);
  if (existing) {
    cachedDefaultId = DEFAULT_PRINTER_ID;
    return;
  }
  const now = new Date().toISOString();
  const printer: Printer = {
    id: DEFAULT_PRINTER_ID,
    name: 'طابعة المتصفح الافتراضية',
    type: 'system',
    connection: 'browser',
    paperSize: '80mm',
    driver: 'browser',
    status: 'connected',
    isDefault: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.printers.put(printer);
  cachedDefaultId = DEFAULT_PRINTER_ID;
}

async function loadDefaultId(): Promise<string> {
  if (cachedDefaultId) return cachedDefaultId;
  const def = await db.printers.where('isDefault').equals(1 as unknown as string).first();
  if (def && def.id) {
    cachedDefaultId = def.id;
    return def.id;
  }
  const all = await db.printers.where('isActive').equals(1 as unknown as string).toArray();
  if (all.length > 0 && all[0].id) {
    cachedDefaultId = all[0].id;
    return all[0].id;
  }
  await ensureDefaultPrinter();
  cachedDefaultId = DEFAULT_PRINTER_ID;
  return DEFAULT_PRINTER_ID;
}

/**
 * FR-013: قائمة كل الطابعات النشطة
 */
export async function listPrinters(includeInactive = false): Promise<Printer[]> {
  const rows = await db.printers.toArray();
  const sorted = rows.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name, 'ar');
  });
  return includeInactive ? sorted : sorted.filter((p) => p.isActive);
}

/**
 * FR-013: إحضار طابعة واحدة
 */
export async function getPrinter(printerId: string): Promise<Printer | null> {
  const row = await db.printers.get(printerId);
  return row ?? null;
}

/**
 * FR-013: الطابعة الافتراضية
 */
export async function getDefaultPrinter(): Promise<Printer> {
  const id = await loadDefaultId();
  const row = await db.printers.get(id);
  if (row) return row;
  await ensureDefaultPrinter();
  return (await db.printers.get(DEFAULT_PRINTER_ID))!;
}

/**
 * FR-013: إنشاء طابعة جديدة
 */
export async function createPrinter(input: {
  name: string;
  type: PrinterType;
  connection: PrinterConnectionKind;
  paperSize: Printer['paperSize'];
  driver: PrinterDriver;
  address?: string;
  port?: number;
  dpi?: number;
  speed?: number;
  vendor?: string;
  model?: string;
}): Promise<Printer> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const printer: Printer = {
    id,
    name: input.name,
    type: input.type,
    connection: input.connection,
    address: input.address,
    port: input.port,
    paperSize: input.paperSize,
    driver: input.driver,
    dpi: input.dpi,
    speed: input.speed,
    vendor: input.vendor,
    model: input.model,
    status: 'unknown',
    isDefault: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.printers.add(printer);
  return printer;
}

/**
 * FR-013: تحديث طابعة — الطابعة الافتراضية لا تُعدّل اسمها/نوعها
 */
export async function updatePrinter(
  printerId: string,
  updates: Partial<Omit<Printer, 'id' | 'createdAt'>>,
): Promise<Printer | null> {
  const existing = await db.printers.get(printerId);
  if (!existing) return null;

  // BR: لا يمكن تعديل اسم/نوع الطابعة الافتراضية للنظام
  if (
    existing.id === DEFAULT_PRINTER_ID &&
    (updates.name !== undefined || updates.type !== undefined || updates.connection !== undefined)
  ) {
    throw new Error('لا يمكن تعديل الاسم أو النوع أو طريقة الاتصال لطابعة النظام الافتراضية');
  }

  const merged: Printer = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.printers.put(merged);
  cachedDefaultId = null;
  return merged;
}

/**
 * FR-013: حذف طابعة — soft delete (isActive=false)
 * الطابعة الافتراضية لا تُحذف
 */
export async function deletePrinter(printerId: string): Promise<{ softDeleted: boolean }> {
  const existing = await db.printers.get(printerId);
  if (!existing) return { softDeleted: false };

  if (existing.id === DEFAULT_PRINTER_ID) {
    throw new Error('لا يمكن حذف طابعة النظام الافتراضية');
  }

  // إذا لها أي تعيينات أو لها سجل طباعة → soft delete فقط
  const mappings = await db.printer_template_mappings
    .where('printerId')
    .equals(printerId)
    .count();
  const hasHistory = await db.print_history
    .where('templateId')
    .equals(printerId)
    .count();

  if (mappings > 0 || hasHistory > 0) {
    await db.printers.update(printerId, {
      isActive: false,
      isDefault: false,
      updatedAt: new Date().toISOString(),
    });
    await db.printer_template_mappings
      .where('printerId')
      .equals(printerId)
      .delete();
    return { softDeleted: true };
  }

  // حذف فعلي آمن
  await db.printer_template_mappings
    .where('printerId')
    .equals(printerId)
    .delete();
  await db.printers.delete(printerId);

  // إذا كانت هي الافتراضية، أعد تعيين browser-printer افتراضياً
  if (existing.isDefault) {
    cachedDefaultId = null;
    await setDefaultPrinter(DEFAULT_PRINTER_ID);
  }
  return { softDeleted: false };
}

/**
 * FR-014: تعيين طابعة كافتراضية — تفصل باقي الطابعات
 */
export async function setDefaultPrinter(printerId: string): Promise<void> {
  const target = await db.printers.get(printerId);
  if (!target) throw new Error('الطابعة غير موجودة');
  if (!target.isActive) throw new Error('لا يمكن تعيين طابعة غير نشطة كافتراضية');

  await db.transaction('rw', db.printers, async () => {
    const all = await db.printers.toArray();
    const now = new Date().toISOString();
    for (const p of all) {
      if (p.id !== printerId && p.isDefault) {
        await db.printers.update(p.id, { isDefault: false, updatedAt: now });
      }
    }
    await db.printers.update(printerId, { isDefault: true, updatedAt: now });
  });
  cachedDefaultId = printerId;
}

/**
 * FR-014: تعيين قالب لطابعة محددة لنوع وثيقة محدد.
 * إذا كان templateId فارغاً يُحذف التعيين (fallback للقالب الافتراضي للنوع).
 */
export async function setPrinterTemplateMapping(
  printerId: string,
  docType: DocTypeKey,
  templateId: string | null,
): Promise<void> {
  const id = mappingId(printerId, docType);
  if (!templateId) {
    await db.printer_template_mappings.delete(id);
    return;
  }
  const existing = await db.print_templates.get(templateId);
  if (!existing) throw new Error('القالب غير موجود');
  const now = new Date().toISOString();
  await db.printer_template_mappings.put({
    id,
    printerId,
    docType,
    templateId,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * FR-014: جلب التعيين لطابعة + نوع وثيقة
 */
export async function getPrinterTemplateMapping(
  printerId: string,
  docType: DocTypeKey,
): Promise<PrinterTemplateMapping | null> {
  const id = mappingId(printerId, docType);
  const row = await db.printer_template_mappings.get(id);
  return row ?? null;
}

/**
 * FR-014: كل التعيينات لطابعة محددة
 */
export async function listPrinterMappings(
  printerId: string,
): Promise<PrinterTemplateMapping[]> {
  return db.printer_template_mappings.where('printerId').equals(printerId).toArray();
}

/**
 * FR-014/017: كل تعيينات جميع الطابعات
 */
export async function listAllMappings(): Promise<PrinterTemplateMapping[]> {
  return db.printer_template_mappings.toArray();
}

/**
 * تغيير الحالة (داخلياً — يُستدعى من printerStatus.ts)
 */
export async function setPrinterStatus(
  printerId: string,
  status: PrinterStatus,
  lastSeenAt?: string,
): Promise<void> {
  const now = lastSeenAt ?? new Date().toISOString();
  await db.printers.update(printerId, {
    status,
    lastSeenAt: status === 'connected' ? now : undefined,
    updatedAt: now,
  });
}

export const PRINTER_SERVICE = {
  ensureDefaultPrinter,
  listPrinters,
  getPrinter,
  getDefaultPrinter,
  createPrinter,
  updatePrinter,
  deletePrinter,
  setDefaultPrinter,
  setPrinterTemplateMapping,
  getPrinterTemplateMapping,
  listPrinterMappings,
  listAllMappings,
  setPrinterStatus,
};
