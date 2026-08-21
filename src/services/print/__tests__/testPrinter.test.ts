// testPrinter اختبارات — POS-PRINT-001 / FR-015
// اختبار صفحة الطابعة التجريبية + تحديث الحالة
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import { ensureDefaultPrinter, createPrinter } from '@/services/print/printerService';
import { testPrinter } from '@/services/print/testPrinter';
import { seedDefaultTemplates } from '@/services/print/defaultTemplates';

async function setupSettings() {
  await db.settings.put({
    id: 'default',
    shopName: 'محل اختبار',
    phone: '0555',
    tvaRate: 0,
    printWidthMm: 80,
    syncMode: 'single',
    currencies: '[]',
    baseCurrency: 'DZD',
    invoicePrefix: 'INV-',
    invoiceStartNumber: 1,
    receiptFooter: 'شكراً',
    zakatEnabled: false,
    nisabThreshold: 0,
  });
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  await seedDefaultTemplates();
  await ensureDefaultPrinter();
  await setupSettings();
});

function mockPrintWindow() {
  const fakeWin = {
    document: { write: vi.fn(), close: vi.fn() },
    print: vi.fn(),
    close: vi.fn(),
    onload: null as null | (() => void),
    closed: false,
  };
  vi.spyOn(window, 'open').mockReturnValue(fakeWin as unknown as Window);
  return fakeWin;
}

describe('testPrinter — FR-015', () => {
  it('يفشل لطابعة غير موجودة', async () => {
    const res = await testPrinter('not-exist');
    expect(res.success).toBe(false);
    expect(res.error).toBe('not_found');
  });

  it('ينجح لطابعة المتصفح الافتراضية ويحدّث الحالة connected', async () => {
    const fakeWin = mockPrintWindow();
    // محاكاة onload فوراً
    Object.defineProperty(fakeWin, 'onload', {
      set(fn) { setTimeout(() => (fn as () => void)?.(), 0); },
      get() { return null; },
    });

    const res = await testPrinter('browser-printer');
    expect(res.success).toBe(true);
    expect(res.message).toMatch(/بنجاح/);

    const after = await db.printers.get('browser-printer');
    expect(after?.status).toBe('connected');
  });

  it('يفشل لطابعة USB غير مدعومة فعلياً في V1 ويحدّث الحالة error', async () => {
    const p = await createPrinter({
      name: 'USB Test', type: 'thermal', connection: 'usb',
      paperSize: '80mm', driver: 'esc_pos',
    });
    const res = await testPrinter(p.id);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();

    const after = await db.printers.get(p.id);
    expect(after?.status).toBe('error');
  });

  it('يفشل لأطابعة شبكية لا ترد على HTTP', async () => {
    const p = await createPrinter({
      name: 'Net Printer', type: 'thermal', connection: 'network',
      address: '127.0.0.1', port: 9999, paperSize: '80mm', driver: 'esc_pos',
    });
    const res = await testPrinter(p.id);
    expect(res.success).toBe(false);

    const after = await db.printers.get(p.id);
    expect(after?.status).toBe('error');
  });
});
