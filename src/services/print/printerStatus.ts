// Printer Status — POS-PRINT-001 / FR-016
// إدارة حالة الطابعات: تحديث عند الطلب + دوران اختياري + كتابة في user_activities
import type { Printer, PrinterStatus } from '@/types/invoicePrint';
import { getPrinter, setPrinterStatus } from './printerService';
import { getConnection } from './printerConnection';
import { db } from '@/infrastructure/database/dexie/db';

export interface RefreshResult {
  printerId: string;
  status: PrinterStatus;
  reachable: boolean;
  changed: boolean;
}

/**
 * FR-016: تحديث حالة طابعة محددة عبر ping للـ Connection المناسب.
 * - browser: دائماً connected (لو window.print متاح)
 * - network: HTTP /ping
 * - usb/bt/serial: نعتبرها 'unknown' في V1 (نحتاج تطبيق محلي)
 */
export async function refreshStatus(printerId: string): Promise<RefreshResult> {
  const printer = await getPrinter(printerId);
  if (!printer) {
    return { printerId, status: 'disconnected', reachable: false, changed: false };
  }

  const conn = getConnection(printer);
  const previously = printer.status;

  let newStatus: PrinterStatus;
  let reachable: boolean;
  if (conn.ping) {
    try {
      reachable = await conn.ping();
      newStatus = reachable ? 'connected' : 'disconnected';
    } catch {
      reachable = false;
      newStatus = 'error';
    }
  } else if (conn.isSupported()) {
    reachable = true;
    newStatus = 'connected';
  } else {
    reachable = false;
    newStatus = 'error';
  }

  const changed = newStatus !== previously;
  if (changed) {
    await setPrinterStatus(printerId, newStatus, new Date().toISOString());
    try {
      await db.user_activities.add({
        id: crypto.randomUUID(),
        action: 'printer_status_change',
        entity: 'printer',
        entityType: 'printer',
        entityId: printerId,
        userId: 'system',
        performedAt: new Date().toISOString(),
        details: `تغيّرت حالة الطابعة "${printer.name}" من ${previously} إلى ${newStatus}`,
      });
    } catch {
      // تجاهل أخطاء السجل في بيئة الاختبار
    }
  }

  return { printerId, status: newStatus, reachable, changed };
}

/**
 * FR-016: تحديث حالة كل الطابعات المنتجة دفعة واحدة
 */
export async function refreshAllStatuses(): Promise<RefreshResult[]> {
  const { listPrinters } = await import('./printerService');
  const printers = await listPrinters();
  return Promise.all(printers.map((p) => refreshStatus(p.id)));
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * FR-016: دوران خلفي على حالة كل الطابعات (اختياري — يوقف عند الطلب)
 * @param intervalMs الفترة بالميلي ثانية (افتراضي 60 ثانية)
 */
export function startStatusPolling(intervalMs = 60_000): () => void {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  pollTimer = setInterval(() => {
    refreshAllStatuses().catch(() => {
      // تجاهل أخطاء الدورة الفردية
    });
  }, intervalMs);
  return () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}

/**
 * إيقاف أي دوران نشط
 */
export function stopStatusPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Helper: يُرجع اللون/الـ badge المرتبط بكل حالة للعرض في الواجهة
 */
export function statusMeta(status: PrinterStatus): {
  label: string;
  color: string;
  bg: string;
  dot: string;
} {
  switch (status) {
    case 'connected':
      return {
        label: 'متصلة',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'disconnected':
      return {
        label: 'غير متصلة',
        color: 'text-slate-600',
        bg: 'bg-slate-50 border-slate-200',
        dot: 'bg-slate-400',
      };
    case 'busy':
      return {
        label: 'مشغولة',
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
        dot: 'bg-blue-500',
      };
    case 'error':
      return {
        label: 'خطأ',
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
        dot: 'bg-red-500',
      };
    case 'unknown':
    default:
      return {
        label: 'غير معروفة',
        color: 'text-amber-700',
        bg: 'bg-amber-50 border-amber-200',
        dot: 'bg-amber-500',
      };
  }
}

export const PRINTER_STATUS_SERVICE = {
  refreshStatus,
  refreshAllStatuses,
  startStatusPolling,
  stopStatusPolling,
  statusMeta,
};
