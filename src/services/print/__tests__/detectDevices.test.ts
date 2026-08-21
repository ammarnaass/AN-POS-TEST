// detectDevices اختبارات — POS-PRINT-001 / FR-013
// التحقق من الكشف الاختياري + fallback للمتصفحات غير الداعمة
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  detectUsbPrinters,
  detectBluetoothPrinters,
  detectAllPrinters,
  getBrowserSupport,
} from '@/services/print/detectDevices';

// إعادة ضبط navigator قبل كل اختبار
beforeEach(() => {
  // jsdom لا يوفر navigator.usb / bluetooth
  // نمنحها قيم mock مرئية عبر Object.defineProperty
  // وسبب نمنحها undefined هنا هو أيضاً اختبار fallback
  // (تم simulating في كل اختبار على حدة)
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface NR {
  usb?: unknown;
  bluetooth?: unknown;
  serial?: unknown;
}

function setNavigator(parts: NR): void {
  const nav = navigator as unknown as NR;
  for (const key of ['usb', 'bluetooth', 'serial'] as const) {
    if (key in parts) {
      Object.defineProperty(nav, key, { value: parts[key], configurable: true, writable: true });
    } else if (key in nav) {
      // إعادة الضبط
      try {
        Object.defineProperty(nav, key, { value: undefined, configurable: true, writable: true });
      } catch {
        // ignore
      }
    }
  }
}

describe('detectDevices — FR-013 fallback', () => {
  it('getBrowserSupport يرجع false لـ USB/BLE عند عدم الدعم', () => {
    setNavigator({});
    const support = getBrowserSupport();
    expect(support.usb).toBe(false);
    expect(support.bluetooth).toBe(false);
  });

  it('detectUsbPrinters يرجع تحذير عند عدم دعم WebUSB', async () => {
    setNavigator({ usb: undefined });
    const res = await detectUsbPrinters();
    expect(res.devices).toHaveLength(0);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toContain('WebUSB');
  });

  it('detectBluetoothPrinters يرجع تحذير عند عدم دعم WebBluetooth', async () => {
    setNavigator({ bluetooth: undefined });
    const res = await detectBluetoothPrinters();
    expect(res.devices).toHaveLength(0);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toContain('WebBluetooth');
  });

  it('detectAllPrinters يجمع التحذيرات ويقترح طابعة المتصفح', async () => {
    setNavigator({});
    const res = await detectAllPrinters();
    expect(res.devices).toHaveLength(0);
    // تحذيرات من USB/BLE + اقتراح طابعة المتصفح
    expect(res.warnings.length).toBeGreaterThanOrEqual(2);
    const last = res.warnings[res.warnings.length - 1];
    expect(last).toContain('طابعة المتصفح');
  });
});

describe('detectDevices — بينات USB mock', () => {
  it('detectUsbPrinters يعيد جهازاً عند نجاح requestDevice', async () => {
    const fakeUsb = {
      requestDevice: vi.fn().mockResolvedValue({
        productName: 'Epson Thermal',
        manufacturerName: 'Epson',
        vendorId: 0x04b8,
        productId: 0x0e15,
        serialNumber: 'X1',
      }),
    };
    setNavigator({ usb: fakeUsb });
    const res = await detectUsbPrinters();
    expect(fakeUsb.requestDevice).toHaveBeenCalledTimes(1);
    expect(res.devices).toHaveLength(1);
    expect(res.devices[0].name).toBe('Epson Thermal');
    expect(res.devices[0].connection).toBe('usb');
    expect(res.devices[0].type).toBe('thermal');
    expect(res.devices[0].address).toBe('1208:3605'); // 0x04b8:0x0e15
  });

  it('detectUsbPrinters يعيد تحذيراً عند إلغاء المستخدم', async () => {
    const fakeUsb = {
      requestDevice: vi.fn().mockRejectedValue(new Error('NotFoundError: No device selected.')),
    };
    setNavigator({ usb: fakeUsb });
    const res = await detectUsbPrinters();
    expect(res.devices).toHaveLength(0);
    expect(res.warnings.some((w) => w.includes('إلغاء'))).toBe(true);
  });

  it('detectUsbPrinters يسجّل خطأ عام عند فشل غير معروف', async () => {
    const fakeUsb = {
      requestDevice: vi.fn().mockRejectedValue(new Error('network error')),
    };
    setNavigator({ usb: fakeUsb });
    const res = await detectUsbPrinters();
    expect(res.devices).toHaveLength(0);
    expect(res.errors.some((e) => e.includes('network error'))).toBe(true);
  });
});

describe('detectDevices — بينات Bluetooth mock', () => {
  it('detectBluetoothPrinters يعيد جهازاً عند نجاح requestDevice', async () => {
    const fakeBle = {
      requestDevice: vi.fn().mockResolvedValue({
        id: 'ble-001',
        name: 'Bluetooth Printer X',
      }),
    };
    setNavigator({ bluetooth: fakeBle });
    const res = await detectBluetoothPrinters();
    expect(fakeBle.requestDevice).toHaveBeenCalledTimes(1);
    expect(res.devices).toHaveLength(1);
    expect(res.devices[0].name).toBe('Bluetooth Printer X');
    expect(res.devices[0].connection).toBe('bluetooth');
  });

  it('detectBluetoothPrinters يعيد تحذيراً عند الإلغاء', async () => {
    const fakeBle = {
      requestDevice: vi.fn().mockRejectedValue(new Error('User cancelled')),
    };
    setNavigator({ bluetooth: fakeBle });
    const res = await detectBluetoothPrinters();
    expect(res.devices).toHaveLength(0);
    expect(res.warnings.some((w) => w.includes('إلغاء'))).toBe(true);
  });
});
