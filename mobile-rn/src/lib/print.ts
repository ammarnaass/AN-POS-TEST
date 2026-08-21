import { AnposPrinter, type ReceiptData, type BluetoothPrinter } from '@/modules/AnposPrinter';
import { AnposSecureStore } from '@/modules/AnposSecureStore';

const PRINTER_ADDR_KEY = 'anpos_last_printer_addr';
const PRINTER_TYPE_KEY = 'anpos_last_printer_type';

export interface PrintInvoiceData {
  number: string;
  date: string;
  items: Array<{ name: string; qty: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  discount: number;
  tvaAmount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  soldBy?: string;
}

export async function printInvoice(data: PrintInvoiceData): Promise<boolean> {
  try {
    const addr = await AnposSecureStore.get(PRINTER_ADDR_KEY);
    const type = ((await AnposSecureStore.get(PRINTER_TYPE_KEY)) as 'bluetooth' | 'lan' | 'usb') || 'bluetooth';

    if (!addr) {
      return false;
    }

    const connected = await AnposPrinter.connect(addr, type);
    if (!connected) {
      return false;
    }

    const receipt: ReceiptData = {
      shopName: 'AN POS',
      number: data.number,
      date: data.date,
      items: data.items,
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
    AnposPrinter.disconnect();
    return success;
  } catch (err) {
    console.warn('[print] Failed:', err);
    return false;
  }
}

export async function printViaDesktop(data: PrintInvoiceData): Promise<boolean> {
  return false;
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
