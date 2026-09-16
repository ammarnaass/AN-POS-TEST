// Detect Devices — POS-PRINT-001 / FR-013
// كشف اختياري عن الطابعات المتصلة عبر WebUSB / WebBluetooth / الشبكة المحلية.
// لا يرمي استثناءً في المتصفحات غير الداعمة — يُرجع نتائج فارغة مع شرح.
import type { PrinterConnectionKind, PrinterType } from '@/types/invoicePrint';

export interface DiscoveredPrinter {
  /** اسم العرض للجهاز */
  name: string;
  /** نوع الطابعة المقدّر */
  type: PrinterType;
  /** طريقة الاتصال */
  connection: PrinterConnectionKind;
  /** عنوان أو معرّف — يُستعمل عند إنشاء PythonEntity */
  address: string;
  /** منفذ شبكي اختياري */
  port?: number;
  /** مصنع الجهاز (إذا توفر) */
  vendor?: string;
  /** موديل الجهاز (إذا توفر) */
  model?: string;
  /** هل هي الطابعة الافتراضية في نظام التشغيل */
  isDefault?: boolean;
  /** حجم الورق التقديري */
  paperSize?: '58mm' | '76mm' | '80mm' | 'A4' | 'A5';
}

export interface DetectionResult {
  devices: DiscoveredPrinter[];
  /** تحذيرات عامة (مثل عدم دعم المتصفح) */
  warnings: string[];
  /** رسائل خطأ لكل طريقة كشف فشلت */
  errors: string[];
}

interface UsbDeviceLike {
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  vendorId: number;
  productId: number;
}

interface NavigatorUsbLike {
  requestDevice(options: { filters?: Array<{ vendorId?: number; productId?: number }> }):
    Promise<UsbDeviceLike>;
  getDevices?(): Promise<UsbDeviceLike[]>;
}

interface NavigatorBluetoothLike {
  requestDevice(options: { acceptAllDevices?: boolean; filters?: unknown[] }):
    Promise<BluetoothDeviceStub>;
}

interface BluetoothDeviceStub {
  id?: string;
  name?: string;
  gatt?: unknown;
}

function getUsbNavigator(): NavigatorUsbLike | null {
  if (typeof navigator === 'undefined') return null;
  const n = navigator as unknown as { usb?: NavigatorUsbLike };
  return n.usb ?? null;
}

function getBluetoothNavigator(): NavigatorBluetoothLike | null {
  if (typeof navigator === 'undefined') return null;
  const n = navigator as unknown as { bluetooth?: NavigatorBluetoothLike };
  return n.bluetooth ?? null;
}

/**
 * FR-013: كشف أجهزة USB (يطلب من المستخدم اختيار جهاز — WebUSB متفاعل)
 * Chrome/Edge فقط. لا يرمي استثناءً لغير الداعمين.
 */
export async function detectUsbPrinters(): Promise<DetectionResult> {
  const usb = getUsbNavigator();
  if (!usb) {
    return {
      devices: [],
      warnings: ['WebUSB غير مدعوم في هذا المتصفح — استعمل Chrome أو Edge'],
      errors: [],
    };
  }
  try {
    const device = await usb.requestDevice({ filters: [] });
    const dev: DiscoveredPrinter = {
      name: device.productName || `USB Printer ${device.vendorId}:${device.productId}`,
      type: 'thermal',
      connection: 'usb',
      address: `${device.vendorId}:${device.productId}`,
      vendor: device.manufacturerName,
      model: device.productName,
    };
    return { devices: [dev], warnings: [], errors: [] };
  } catch (err) {
    // المستخدم ألغى الاختيار أو قع فشل
    const msg = String(err);
    if (msg.includes('NotFoundError') || msg.includes('cancel')) {
      return { devices: [], warnings: ['تم إلغاء اختيار الجهاز'], errors: [] };
    }
    return { devices: [], warnings: [], errors: [`فشل كشف USB: ${msg}`] };
  }
}

/**
 * FR-013: يكشف أجهزة Bluetooth (WebBluetooth متفاعل)
 */
export async function detectBluetoothPrinters(): Promise<DetectionResult> {
  const ble = getBluetoothNavigator();
  if (!ble) {
    return {
      devices: [],
      warnings: ['WebBluetooth غير مدعوم في هذا المتصفح — استعمل Chrome'],
      errors: [],
    };
  }
  try {
    const device = await ble.requestDevice({ acceptAllDevices: true });
    const dev: DiscoveredPrinter = {
      name: device.name || 'Bluetooth Printer',
      type: 'thermal',
      connection: 'bluetooth',
      address: device.id || 'bluetooth',
    };
    return { devices: [dev], warnings: [], errors: [] };
  } catch (err) {
    const msg = String(err);
    if (msg.includes('cancel') || msg.includes('User cancelled')) {
      return { devices: [], warnings: ['تم إلغاء اختيار الجهاز'], errors: [] };
    }
    return { devices: [], warnings: [], errors: [`فشل كشف Bluetooth: ${msg}`] };
  }
}

/**
 * كشف طابعات نظام التشغيل المثبتة عبر محرك Electron لسطح المكتب
 */
export async function detectSystemPrinters(): Promise<DetectionResult> {
  const electronPrint = (window as any).electronAPI?.print;
  if (!electronPrint || typeof electronPrint.getPrinters !== 'function') {
    return {
      devices: [],
      warnings: ['بيئة التشغيل الحالية لا تدعم قراءة طابعات النظام مباشرة (يعمل في تطبيق سطح المكتب)'],
      errors: [],
    };
  }

  try {
    const sysPrinters = await electronPrint.getPrinters();
    if (!Array.isArray(sysPrinters) || sysPrinters.length === 0) {
      return {
        devices: [],
        warnings: ['لم يتم العثور على أي طابعات مثبتة في نظام التشغيل'],
        errors: [],
      };
    }

    const devices: DiscoveredPrinter[] = sysPrinters.map((p: any) => {
      const lowerName = (p.name || '').toLowerCase();
      const isThermal =
        lowerName.includes('pos') ||
        lowerName.includes('receipt') ||
        lowerName.includes('thermal') ||
        lowerName.includes('xp-') ||
        lowerName.includes('xprinter') ||
        lowerName.includes('epson') ||
        lowerName.includes('bixolon') ||
        lowerName.includes('58') ||
        lowerName.includes('80');

      return {
        name: p.displayName || p.name,
        type: isThermal ? 'thermal' : 'system',
        connection: 'system',
        address: p.name,
        vendor: p.description || undefined,
        model: p.name,
        isDefault: Boolean(p.isDefault),
        paperSize: isThermal ? (lowerName.includes('58') ? '58mm' : '80mm') : 'A4',
      };
    });

    return { devices, warnings: [], errors: [] };
  } catch (err) {
    return {
      devices: [],
      warnings: [],
      errors: [`فشل استخراج طابعات نظام التشغيل: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

/**
 * FR-013: كشف شامل — يستدعي كل الطرق المتاحة ويجمع النتائج
 */
export async function detectAllPrinters(): Promise<DetectionResult> {
  const all: DiscoveredPrinter[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. كشف طابعات نظام التشغيل المثبتة أولاً (Electron OS Printers)
  const sysRes = await detectSystemPrinters();
  all.push(...sysRes.devices);
  warnings.push(...sysRes.warnings);
  errors.push(...sysRes.errors);

  // 2. كشف WebUSB متفاعل ثانياً إن وُجد
  const usbRes = await detectUsbPrinters();
  all.push(...usbRes.devices);
  warnings.push(...usbRes.warnings);
  errors.push(...usbRes.errors);

  // 3. كشف Bluetooth متفاعل ثالثاً إن وُجد
  const bleRes = await detectBluetoothPrinters();
  all.push(...bleRes.devices);
  warnings.push(...bleRes.warnings);
  errors.push(...bleRes.errors);

  // دائماً نخبر المستخدم أن طابعة المتصفح متاحة على الأقل إذا لم يُعثر على شيء
  if (all.length === 0) {
    warnings.push('لا طابعات خارجية مكتشفة — ستُستخدم طابعة المتصفح الافتراضية');
  }

  return { devices: all, warnings, errors };
}

/**
 * تحقق دعم المتصفح والنظام للطرق المختلفة — يُستعمل لعرض شارات الدعم في الواجهة
 */
export function getBrowserSupport(): {
  usb: boolean;
  bluetooth: boolean;
  serial: boolean;
  browser: boolean;
  system: boolean;
} {
  return {
    usb: getUsbNavigator() !== null,
    bluetooth: getBluetoothNavigator() !== null,
    serial: typeof navigator !== 'undefined' && 'serial' in navigator,
    browser: typeof window !== 'undefined' && typeof window.print === 'function',
    system: typeof window !== 'undefined' && typeof (window as any).electronAPI?.print?.getPrinters === 'function',
  };
}
