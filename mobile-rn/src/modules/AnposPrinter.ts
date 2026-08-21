import { NativeModules } from 'react-native';

const MOD = NativeModules.AnposPrinter as AnposPrinter | undefined;

export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptData {
  shopName: string;
  number: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  soldBy?: string;
}

export interface BluetoothPrinter {
  name: string;
  address: string;
  type: 'bluetooth' | 'usb' | 'lan';
}

export interface AnposPrinter {
  discoverPrinters(): Promise<BluetoothPrinter[]>;
  connect(address: string, type: 'bluetooth' | 'lan' | 'usb'): Promise<boolean>;
  disconnect(): void;
  printReceipt(data: ReceiptData): Promise<boolean>;
  printBarcode(data: { type: string; value: string; height?: number; width?: number }): Promise<boolean>;
  cutPaper(): Promise<void>;
  openCashDrawer(): Promise<void>;
}

export const AnposPrinter: AnposPrinter = MOD || {
  discoverPrinters: async () => [],
  connect: async () => false,
  disconnect: () => {},
  printReceipt: async () => false,
  printBarcode: async () => false,
  cutPaper: async () => {},
  openCashDrawer: async () => {},
};
