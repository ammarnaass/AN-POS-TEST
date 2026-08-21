// Test Printer — POS-PRINT-001 / FR-015
// اختبار اتصال الطابعة وطباعة صفحة تجريبية
import type { Printer } from '@/types/invoicePrint';
import { getPrinter, setPrinterStatus } from './printerService';
import { getConnection, type PrintResult } from './printerConnection';
import { buildPrintPage } from './renderTemplate';
import { getTemplateForDocType } from './printService';
import { db } from '@/infrastructure/database/dexie/db';

interface TestPageResult {
  success: boolean;
  latencyMs?: number;
  message: string;
  error?: string;
}

/**
 * بناء صفحة HTML تجريبية للاختبار — تحتوى شعار (في حال وجوده)، اسم المتجر،
 * تاريخ وفترة، خط أفقي، QR اختباري، ورسالة "اختبار الطابعة".
 */
function buildTestPageHtml(printer: Printer, shopName: string): string {
  const now = new Date().toLocaleString('ar-DZ');
  const template = {
    id: '__test__',
    name: 'اختبار',
    paperSize: printer.paperSize,
    orientation: 'portrait' as const,
    widthMm: 80,
    supportedDocuments: [] as never[],
    visibility: {} as never,
    layout: { header: [], body: [], footer: [] },
    styles: {
      primaryColor: '#0891b2',
      headerColor: '#0e7490',
      footerColor: '#475569',
      tableColor: '#e2e8f0',
      logoColor: '#0891b2',
      font: { family: 'Cairo', size: 13, weight: 400 as const },
    },
    isDefault: false,
    isSystem: false,
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  };

  const body = `
    <div style="text-align:center;padding:8px 4px;">
      <div style="font-size:18px;font-weight:700;color:#0891b2;margin-bottom:4px;">${shopName || 'اختبار الطباعة'}</div>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0;" />
      <div style="font-size:13px;margin:4px 0;">الطابعة: ${printer.name}</div>
      <div style="font-size:13px;margin:4px 0;">النوع: ${printer.connection} — ${printer.driver}</div>
      <div style="font-size:13px;margin:4px 0;">التاريخ: ${now}</div>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0;" />
      <div class="print-qr" data-value="TEST|${printer.id}|${now}" style="display:inline-block;width:110px;height:110px;border:1px dashed #cbd5e1;text-align:center;line-height:110px;font-size:10px;color:#64748b;">QR</div>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0;" />
      <div style="font-size:14px;font-weight:600;margin-top:8px;">صفحة اختبار — تم بنجاح ✅</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">POS-PRINT-001 / FR-015</div>
    </div>
  `;
  return buildPrintPage(template as never, body, `اختبار: ${printer.name}`);
}

/**
 * FR-015: اختبار طابعة — طباعة صفحة تجريبية وتسجيل النتيجة وتحديث الحالة.
 */
export async function testPrinter(printerId: string): Promise<TestPageResult> {
  const printer = await getPrinter(printerId);
  if (!printer) {
    return { success: false, message: 'الطابعة غير موجودة', error: 'not_found' };
  }

  const settings = await db.settings.get('default');
  const shopName = settings?.shopName ?? 'المحل';

  // اختصار: لو الـ printer Connection غير مدعوم، نُحاول استخدام قالب نظام لعرض رسالة
  const html = buildTestPageHtml(printer, shopName);
  const conn = getConnection(printer);

  if (!conn.isSupported()) {
    await setPrinterStatus(printerId, 'error');
    return {
      success: false,
      message: `${conn.kind} غير مدعوم في هذا المتصفح`,
      error: 'unsupported_connection',
    };
  }

  const res: PrintResult = await conn.print(html, 1);

  if (res.success) {
    await setPrinterStatus(printerId, 'connected', new Date().toISOString());
    return {
      success: true,
      latencyMs: res.latencyMs,
      message: `تم الاختبار بنجاح${res.latencyMs ? ` (${res.latencyMs}ms)` : ''}`,
    };
  }

  await setPrinterStatus(printerId, 'error');
  return {
    success: false,
    latencyMs: res.latencyMs,
    message: 'فشل الاختبار',
    error: res.error,
  };
}

/**
 * ربط مُسهّل: اختبار الطابعة الافتراضية (browser)
 */
export async function testDefaultPrinter(): Promise<TestPageResult> {
  const { getDefaultPrinter } = await import('./printerService');
  const def = await getDefaultPrinter();
  return testPrinter(def.id);
}

export const TEST_PRINTER_SERVICE = { testPrinter, testDefaultPrinter };
