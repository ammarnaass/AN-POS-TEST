// printerService اختبارات — POS-PRINT-001 / FR-013 → FR-014
// CRUD للطابعات + ربط القوالب بالطابعات + الحماية من حذف الافتراضية
import { describe, expect, it, beforeEach } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import {
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
  setPrinterStatus,
} from '@/services/print/printerService';
import { seedDefaultTemplates } from '@/services/print/defaultTemplates';
import type { DocTypeKey } from '@/types/invoicePrint';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await seedDefaultTemplates();
  await ensureDefaultPrinter();
});

describe('printerService — FR-013 CRUD', () => {
  it('يضمن وجود طابعة المتصفح الافتراضية', async () => {
    const def = await getDefaultPrinter();
    expect(def).toBeTruthy();
    expect(def.id).toBe('browser-printer');
    expect(def.isDefault).toBe(true);
    expect(def.isActive).toBe(true);
    expect(def.connection).toBe('browser');
  });

  it('لا يكرر الإضافة لو ensureDefaultPrinter استدعي مرة ثانية', async () => {
    await ensureDefaultPrinter();
    await ensureDefaultPrinter();
    const all = await listPrinters(true);
    expect(all.filter((p) => p.id === 'browser-printer')).toHaveLength(1);
  });

  it('ينشئ طابعة جديدة بقيم افتراضية صحيحة', async () => {
    const p = await createPrinter({
      name: 'طابعة USB',
      type: 'thermal',
      connection: 'usb',
      paperSize: '80mm',
      driver: 'esc_pos',
    });
    expect(p.id).toBeTruthy();
    expect(p.isActive).toBe(true);
    expect(p.isDefault).toBe(false);
    expect(p.status).toBe('unknown');
    expect(p.type).toBe('thermal');

    const fetched = await getPrinter(p.id);
    expect(fetched?.name).toBe('طابعة USB');
  });

  it('يحذّر الطابعات غير النشطة عند filter', async () => {
    await createPrinter({ name: 'A', type: 'thermal', connection: 'usb', paperSize: '80mm', driver: 'esc_pos' });
    await createPrinter({ name: 'B', type: 'thermal', connection: 'usb', paperSize: '80mm', driver: 'esc_pos' });
    const active = await listPrinters();
    // browser-printer + الطابعتين
    expect(active.length).toBeGreaterThanOrEqual(3);
  });

  it('يحدّث اسم الطابعة (غير الافتراضية)', async () => {
    const p = await createPrinter({
      name: 'Origin', type: 'thermal', connection: 'network',
      address: '192.168.1.5', port: 9100, paperSize: '80mm', driver: 'esc_pos',
    });
    const updated = await updatePrinter(p.id, { name: 'Renamed', status: 'connected' });
    expect(updated?.name).toBe('Renamed');
    expect(updated?.status).toBe('connected');
  });

  it('يرفض تعديل اسم/نوع/اتصال طابعة النظام الافتراضية', async () => {
    await expect(
      updatePrinter('browser-printer', { name: 'Hacked' }),
    ).rejects.toThrow(/طابعة النظام/);
  });

  it('يرفض حذف طابعة النظام الافتراضية', async () => {
    await expect(deletePrinter('browser-printer')).rejects.toThrow(/طابعة النظام/);
  });

  it('يحذف طابعة مستخدم بدون تعيينات حذفاً فعلياً', async () => {
    const p = await createPrinter({
      name: 'ToDelete', type: 'thermal', connection: 'usb',
      paperSize: '80mm', driver: 'esc_pos',
    });
    const res = await deletePrinter(p.id);
    expect(res.softDeleted).toBe(false);
    const after = await getPrinter(p.id);
    expect(after).toBeNull();
  });

  it('يجعل soft delete عند وجود تعيينات', async () => {
    const p = await createPrinter({
      name: 'WithMapping', type: 'thermal', connection: 'network',
      address: '1.2.3.4', port: 9100, paperSize: '80mm', driver: 'esc_pos',
    });
    await setPrinterTemplateMapping(p.id, 'thermal-receipt' as DocTypeKey, 'default-thermal-80');
    const res = await deletePrinter(p.id);
    expect(res.softDeleted).toBe(true);
    const after = await getPrinter(p.id);
    expect(after?.isActive).toBe(false);
    // التعيينات محذوفة
    const maps = await listPrinterMappings(p.id);
    expect(maps).toHaveLength(0);
  });

  it('يعيد تعيين browser-printer كافتراضية لو حُذفت الافتراضية', async () => {
    // أنشئ طابعة افتراضية بديلة
    const p = await createPrinter({
      name: 'Alt', type: 'thermal', connection: 'network',
      address: 'h', port: 9100, paperSize: '80mm', driver: 'esc_pos',
    });
    await setDefaultPrinter(p.id);
    expect((await getDefaultPrinter()).id).toBe(p.id);

    // احذفها
    await deletePrinter(p.id);
    const def = await getDefaultPrinter();
    expect(def.id).toBe('browser-printer');
  });
});

describe('printerService — FR-014 التعيينات', () => {
  it('يخزّن ويعيد تعيين قالب لطابعة محددة', async () => {
    const p = await createPrinter({
      name: 'P1', type: 'thermal', connection: 'usb',
      paperSize: '80mm', driver: 'esc_pos',
    });
    await setPrinterTemplateMapping(p.id, 'sale-invoice' as DocTypeKey, 'default-thermal-80');
    const map = await getPrinterTemplateMapping(p.id, 'sale-invoice' as DocTypeKey);
    expect(map).not.toBeNull();
    expect(map?.templateId).toBe('default-thermal-80');
    expect(map?.id).toBe(`${p.id}__sale-invoice`);
  });

  it('يحذف التعيين إذا templateId=null', async () => {
    const p = await createPrinter({
      name: 'P2', type: 'thermal', connection: 'usb',
      paperSize: '80mm', driver: 'esc_pos',
    });
    await setPrinterTemplateMapping(p.id, 'devis' as DocTypeKey, 'default-thermal-80');
    await setPrinterTemplateMapping(p.id, 'devis' as DocTypeKey, null);
    const map = await getPrinterTemplateMapping(p.id, 'devis' as DocTypeKey);
    expect(map).toBeNull();
  });

  it('يرفض التعيين لقالب غير موجود', async () => {
    const p = await createPrinter({
      name: 'P3', type: 'thermal', connection: 'usb',
      paperSize: '80mm', driver: 'esc_pos',
    });
    await expect(
      setPrinterTemplateMapping(p.id, 'bl' as DocTypeKey, 'non-existent-tpl'),
    ).rejects.toThrow(/القالب غير موجود/);
  });

  it('يرجع كل تعيينات الطابعة', async () => {
    const p = await createPrinter({
      name: 'P4', type: 'thermal', connection: 'usb',
      paperSize: '80mm', driver: 'esc_pos',
    });
    await setPrinterTemplateMapping(p.id, 'sale-invoice' as DocTypeKey, 'default-thermal-80');
    await setPrinterTemplateMapping(p.id, 'thermal-receipt' as DocTypeKey, 'default-thermal-80');
    const maps = await listPrinterMappings(p.id);
    expect(maps).toHaveLength(2);
  });
});

describe('printerService — setPrinterStatus', () => {
  it('يحدّث الحالة و lastSeenAt', async () => {
    const p = await createPrinter({
      name: 'P5', type: 'thermal', connection: 'network',
      address: '1.2.3.4', port: 9100, paperSize: '80mm', driver: 'esc_pos',
    });
    await setPrinterStatus(p.id, 'connected', '2026-07-16T10:00:00Z');
    const after = await getPrinter(p.id);
    expect(after?.status).toBe('connected');
    expect(after?.lastSeenAt).toBe('2026-07-16T10:00:00Z');
  });
});
