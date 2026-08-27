// Printer Service — Mobile
// Printer management, Bluetooth discovery, mappings & test print
import { db, ensureInit } from './db';
import { AnposPrinter, type BluetoothPrinter } from '@/modules/AnposPrinter';
import { AnposSecureStore } from '@/modules/AnposSecureStore';
import type { DocTypeKey, PaperSize } from '@shared/types/invoicePrint';

export interface MobilePrinter {
  id: string;
  name: string;
  type: 'thermal' | 'standard' | 'label';
  connection: 'bluetooth' | 'lan' | 'usb' | 'system';
  address?: string;
  port?: number;
  paperSize: PaperSize;
  driver: 'esc_pos' | 'browser' | 'pdf';
  isDefault: boolean;
  status: 'online' | 'offline' | 'error';
  vendor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrinterMapping {
  id: string;
  printerId: string;
  docType: DocTypeKey;
  templateId: string;
}

const DEFAULT_SYSTEM_PRINTER: MobilePrinter = {
  id: 'system-bt-printer',
  name: 'طابعة البلوتوث المباشرة',
  type: 'thermal',
  connection: 'bluetooth',
  paperSize: '80mm',
  driver: 'esc_pos',
  isDefault: true,
  status: 'online',
  vendor: 'Bluetooth POS',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export async function listPrinters(): Promise<MobilePrinter[]> {
  await ensureInit();
  const rawList = await db.printers.toArray();
  if (rawList.length === 0) {
    await db.printers.add(DEFAULT_SYSTEM_PRINTER);
    return [DEFAULT_SYSTEM_PRINTER];
  }
  return rawList.map((p: any) => ({
    id: p.id,
    name: p.name,
    type: p.type || 'thermal',
    connection: p.connection || (p.type === 'usb' ? 'usb' : 'bluetooth'),
    address: p.address,
    port: p.port,
    paperSize: p.paperSize || (p.paperWidth ? `${p.paperWidth}mm` : '80mm'),
    driver: p.driver || 'esc_pos',
    isDefault: Boolean(p.isDefault ?? p.is_default),
    status: p.status || 'online',
    vendor: p.vendor,
    createdAt: p.createdAt || p.created_at || new Date().toISOString(),
    updatedAt: p.updatedAt || p.updated_at || new Date().toISOString(),
  }));
}

export async function getPrinterById(id: string): Promise<MobilePrinter | undefined> {
  await ensureInit();
  const list = await listPrinters();
  return list.find((p) => p.id === id);
}

export async function getDefaultPrinter(): Promise<MobilePrinter | undefined> {
  await ensureInit();
  const list = await listPrinters();
  return list.find((p) => p.isDefault) || list[0] || DEFAULT_SYSTEM_PRINTER;
}

export async function createPrinter(
  data: Omit<MobilePrinter, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
): Promise<MobilePrinter> {
  await ensureInit();
  const now = new Date().toISOString();
  const printer: MobilePrinter = {
    ...data,
    id: 'prn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    status: 'online',
    createdAt: now,
    updatedAt: now,
  };
  await db.printers.add(printer);
  return printer;
}

export async function updatePrinter(
  id: string,
  updates: Partial<Omit<MobilePrinter, 'id' | 'createdAt'>>,
): Promise<void> {
  await ensureInit();
  const existing = await getPrinterById(id);
  if (!existing) throw new Error('Printer not found');
  await db.printers.put({
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deletePrinter(id: string): Promise<boolean> {
  await ensureInit();
  await db.printers.delete(id);
  return true;
}

export async function setDefaultPrinter(id: string): Promise<void> {
  await ensureInit();
  const all = await listPrinters();
  for (const p of all) {
    await db.printers.put({
      ...p,
      isDefault: p.id === id,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function discoverBluetoothPrinters(): Promise<BluetoothPrinter[]> {
  try {
    return await AnposPrinter.discoverPrinters();
  } catch (err) {
    console.warn('Failed to discover Bluetooth printers:', err);
    return [];
  }
}

// ===== Test Print =====

export async function testPrinter(printer: MobilePrinter): Promise<{ success: boolean; message: string }> {
  try {
    if (printer.connection === 'bluetooth' && printer.address) {
      const connected = await AnposPrinter.connect(printer.address, 'bluetooth');
      if (!connected) {
        return { success: false, message: 'تعذر الاتصال بالطابعة عبر البلوتوث' };
      }
    }

    const testReceipt = {
      shopName: 'AN POS - تجربة الطباعة',
      number: 'TEST-' + Math.floor(Math.random() * 1000),
      date: new Date().toLocaleString('ar-DZ'),
      items: [
        { name: 'تجربة إيصال حراري', qty: 1, unitPrice: 100, lineTotal: 100 },
        { name: 'طابعة: ' + printer.name, qty: 1, unitPrice: 0, lineTotal: 0 },
      ],
      subtotal: 100,
      discount: 0,
      tax: 0,
      total: 100,
      paymentMethod: 'فحص النظام',
      customerName: 'فحص الطباعة',
      soldBy: 'مدير النظام',
    };

    const printed = await AnposPrinter.printReceipt(testReceipt);
    if (printed) {
      await AnposPrinter.cutPaper();
    }
    return {
      success: printed,
      message: printed ? 'تم إرسال صفحة الاختبار بنجاح' : 'فشلت الطباعة',
    };
  } catch (err) {
    return { success: false, message: String(err) };
  }
}

// ===== Printer Template Mappings =====

export async function listPrinterMappings(printerId: string): Promise<PrinterMapping[]> {
  await ensureInit();
  try {
    const raw = await db.printerTemplateMappings.toArray();
    return raw.filter((m: any) => m.printerId === printerId);
  } catch {
    return [];
  }
}

export async function setPrinterTemplateMapping(
  printerId: string,
  docType: DocTypeKey,
  templateId: string | null,
): Promise<void> {
  await ensureInit();
  const id = `${printerId}_${docType}`;
  if (!templateId) {
    await db.printerTemplateMappings.delete(id);
  } else {
    await db.printerTemplateMappings.put({
      id,
      printerId,
      docType,
      templateId,
    });
  }
}
