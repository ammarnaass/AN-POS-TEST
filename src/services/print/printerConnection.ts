// Printer Connection — POS-PRINT-001 / FR-013
// طبقة Strategy: تختار طريقة الاتصال المناسبة لكل نوع طابعة.
// الحفاظ على السلوك القديم عبر BrowserPrintConnection (window.print)
import { doPrint } from './printEngine';
import type { Printer, PrinterConnectionKind } from '@/types/invoicePrint';

export interface PrintResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
}

export interface PrinterConnection {
  readonly kind: PrinterConnectionKind;
  print(html: string, copies: number): Promise<PrintResult>;
  ping?(): Promise<boolean>;
  isSupported(): boolean;
}

// ===== Browser (الافتراضي — يحافظ على السلوك القديم تماماً) =====
class BrowserPrintConnection implements PrinterConnection {
  readonly kind = 'browser' as const;
  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.print === 'function';
  }
  async print(html: string, copies: number): Promise<PrintResult> {
    const start = Date.now();
    try {
      await doPrint(html, copies);
      return { success: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { success: false, latencyMs: Date.now() - start, error: String(err) };
    }
  }
  async ping(): Promise<boolean> {
    return this.isSupported();
  }
}

// ===== Network (طباعة لطابعات شبكية عبر HTTP/WebSocket — V1: best-effort) =====
class NetworkPrintConnection implements PrinterConnection {
  readonly kind = 'network' as const;
  constructor(private readonly address: string, private readonly port: number) {}
  isSupported(): boolean {
    return Boolean(this.address && this.port > 0);
  }
  async print(html: string, copies: number): Promise<PrintResult> {
    const start = Date.now();
    if (!this.isSupported()) {
      return { success: false, error: 'إعدادات الشبكة ناقصة (address/port)' };
    }
    const url = `http://${this.address}:${this.port}/print`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/html' },
        body: JSON.stringify({ html, copies }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        return {
          success: false,
          latencyMs: Date.now() - start,
          error: `استجابة الطابعة: ${res.status} ${res.statusText}`,
        };
      }
      return { success: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: `تعذر الاتصال بالطابعة الشبكية: ${String(err)}`,
      };
    }
  }
  async ping(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const res = await fetch(`http://${this.address}:${this.port}/ping`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ===== WebUSB (Chrome فقط — مع fallback واضح) =====
interface UsbDeviceStub {
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  vendorId: number;
  productId: number;
}

class WebUsbPrintConnection implements PrinterConnection {
  readonly kind = 'usb' as const;
  constructor(private readonly device?: USBDeviceStubLike) {}
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }
  async print(html: string, copies: number): Promise<PrintResult> {
    const start = Date.now();
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'WebUSB غير مدعوم في هذا المتصفح (يرجى استعمال Chrome/Edge)',
      };
    }
    // V1: نعيد رسالة دلالية. تنفيذ فعلي لـ ESC/POS يُؤجّل لـ V2 حسب الخطة.
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: 'طباعة USB مباشرة (ESC/POS) تتطلب التطبيق المحلي — استخدم طابعة المتصفح في V1',
    };
  }
}

interface USBDeviceStubLike {
  productName?: string;
  manufacturerName?: string;
  vendorId: number;
  productId: number;
}

// ===== WebBluetooth (Chrome فقط) =====
class WebBluetoothPrintConnection implements PrinterConnection {
  readonly kind = 'bluetooth' as const;
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }
  async print(html: string, copies: number): Promise<PrintResult> {
    const start = Date.now();
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'WebBluetooth غير مدعوم في هذا المتصفح (يرجى استعمال Chrome)',
      };
    }
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: 'طباعة Bluetooth مباشرة تتطلب التطبيق المحلي — استخدم طابعة المتصفح في V1',
    };
  }
}

// ===== Serial (Web Serial API — Chrome)(كمؤجل) =====
class WebSerialPrintConnection implements PrinterConnection {
  readonly kind = 'serial' as const;
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }
  async print(): Promise<PrintResult> {
    return {
      success: false,
      error: 'Serial مباشر يتطلب التطبيق المحلي — استخدم طابعة المتصفح في V1',
    };
  }
}

const browserConn = new BrowserPrintConnection();

/**
 * اختيار الـ Connection المناسب لموصوعة الطابعة.
 * - 'browser' → دائماً ينجح (window.print)
 * - الشبكي → يحاول HTTP
 * - USB/BLE/Serial → مدعوم فعلياً في V2؛ V1 يُرجع رسالة fallback واضحة
 */
export function getConnection(printer: Printer): PrinterConnection {
  switch (printer.connection) {
    case 'browser':
      return browserConn;
    case 'network':
      return new NetworkPrintConnection(printer.address ?? '', printer.port ?? 9100);
    case 'usb':
      return new WebUsbPrintConnection();
    case 'bluetooth':
      return new WebBluetoothPrintConnection();
    case 'serial':
      return new WebSerialPrintConnection();
    default:
      return browserConn;
  }
}

export { browserConn as DefaultBrowserConnection };
export type { UsbDeviceStub };
