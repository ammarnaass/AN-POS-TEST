// Print Service — Mobile
import { AnposPrinter, type ReceiptData, type BluetoothPrinter } from '@/modules/AnposPrinter';
import { AnposSecureStore } from '@/modules/AnposSecureStore';
import { db, ensureInit } from './db';
import {
  getTemplateById,
  getDefaultTemplate,
  getDocTypeAssignment,
  recordPrint,
} from './templateService';
import type { DocTypeKey, PrintTemplate } from '@shared/types/invoicePrint';

const PRINTER_ADDR_KEY = 'anpos_last_printer_addr';
const PRINTER_TYPE_KEY = 'anpos_last_printer_type';

export interface PrintInvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
  discount?: number;
  lineTotal: number;
}

export interface PrintInvoiceData {
  id?: string;
  number: string;
  date: string;
  items: PrintInvoiceItem[];
  subtotal: number;
  discount: number;
  tvaAmount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  soldBy?: string;
  cashierName?: string;
  docType?: DocTypeKey;
  templateId?: string;
  copies?: number;
  lang?: 'ar' | 'fr' | 'ar-fr' | 'en';
}

export async function printInvoice(data: PrintInvoiceData): Promise<boolean> {
  try {
    const addr = await AnposSecureStore.get(PRINTER_ADDR_KEY);
    const type = ((await AnposSecureStore.get(PRINTER_TYPE_KEY)) as 'bluetooth' | 'lan' | 'usb') || 'bluetooth';

    if (addr) {
      await AnposPrinter.connect(addr, type);
    }

    // Resolve template
    let template: PrintTemplate | undefined;
    if (data.templateId) {
      template = await getTemplateById(data.templateId);
    } else if (data.docType) {
      const assignment = await getDocTypeAssignment(data.docType);
      if (assignment?.templateId) {
        template = await getTemplateById(assignment.templateId);
      }
    }
    if (!template) {
      template = await getDefaultTemplate();
    }

    // Fetch store legal settings
    await ensureInit();
    const settingsList = await db.settings.toArray();
    const settingsMap: Record<string, string> = {};
    for (const s of settingsList) settingsMap[s.key] = s.value;

    const shopName = settingsMap.store_name || 'AN POS';
    const copies = data.copies || 1;

    for (let c = 0; c < copies; c++) {
      const receipt: ReceiptData = {
        shopName,
        number: data.number,
        date: data.date,
        items: data.items.map((i) => ({
          name: i.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
        subtotal: data.subtotal,
        discount: data.discount,
        tax: data.tvaAmount,
        total: data.total,
        paymentMethod: data.paymentMethod,
        customerName: data.customerName || '',
        soldBy: data.soldBy || '',
      };

      const success = await AnposPrinter.printReceipt(receipt);
      if (success) {
        await AnposPrinter.cutPaper();
      }
    }

    // Record print job in database
    if (data.id || data.number) {
      await recordPrint(
        data.id || data.number,
        data.docType || 'thermal-receipt',
        template?.id || 'default-thermal-80',
        data.soldBy || data.cashierName || 'المستخدم',
        copies,
        'طابعة البلوتوث المباشرة',
        false,
      );
    }

    return true;
  } catch (err) {
    console.warn('[print] Failed:', err);
    return false;
  }
}

export async function printViaDesktop(data: PrintInvoiceData): Promise<boolean> {
  return printInvoice(data);
}

export async function reprintInvoice(
  invoiceId: string,
  invoiceData: PrintInvoiceData,
  templateId?: string,
  copies: number = 1,
): Promise<boolean> {
  const ok = await printInvoice({
    ...invoiceData,
    templateId: templateId || invoiceData.templateId,
    copies,
  });

  if (ok) {
    await recordPrint(
      invoiceId,
      invoiceData.docType || 'thermal-receipt',
      templateId || 'default-thermal-80',
      invoiceData.soldBy || 'المستخدم',
      copies,
      'طابعة البلوتوث المباشرة',
      true,
    );
  }
  return ok;
}

export async function discoverPrinters(): Promise<BluetoothPrinter[]> {
  try {
    return await AnposPrinter.discoverPrinters();
  } catch {
    return [];
  }
}

export async function savePrinter(addr: string, type: 'bluetooth' | 'lan' | 'usb'): Promise<void> {
  await AnposSecureStore.set(PRINTER_ADDR_KEY, addr);
  await AnposSecureStore.set(PRINTER_TYPE_KEY, type);
}
