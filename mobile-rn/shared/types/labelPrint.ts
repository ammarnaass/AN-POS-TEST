// Label Printing Types — shared between desktop and mobile

export type BarcodeFormat = 'ean13' | 'ean8' | 'code128' | 'code39' | 'upca' | 'qr';

export interface LabelSize {
  id: string;
  label: string;
  width: number;   // mm
  height: number;  // mm
}

export const LABEL_SIZES: LabelSize[] = [
  { id: '40x20', label: '40×20', width: 40, height: 20 },
  { id: '40x25', label: '40×25', width: 40, height: 25 },
  { id: '35x35', label: '35×35', width: 35, height: 35 },
  { id: '45x35', label: '45×35', width: 45, height: 35 },
  { id: '50x25', label: '50×25', width: 50, height: 25 },
  { id: '55x35', label: '55×35', width: 55, height: 35 },
  { id: '55x45', label: '55×45', width: 55, height: 45 },
  { id: '50x50', label: '50×50', width: 50, height: 50 },
  { id: '20x40', label: '20×40', width: 20, height: 40 },
  { id: '42x35', label: '42×35', width: 42, height: 35 },
];

export const BARCODE_FORMAT_LABELS: Record<BarcodeFormat, string> = {
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  code128: 'CODE128',
  code39: 'CODE39',
  upca: 'UPC-A',
  qr: 'QR Code',
};

export interface PrintOptions {
  labelSizeId: string;
  barcodeFormat: BarcodeFormat;
  copies: number;
  entryMode: 'random' | 'manual';
  manualBarcode: string;
  showCompany: boolean;
  showProduct: boolean;
  showSku: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  enlargePrice: boolean;
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  labelSizeId: '40x25',
  barcodeFormat: 'ean13',
  copies: 1,
  entryMode: 'random',
  manualBarcode: '',
  showCompany: false,
  showProduct: true,
  showSku: false,
  showPrice: true,
  showBarcode: true,
  enlargePrice: false,
};

export interface ProductLabelItem {
  productId: string;
  productName: string;
  productSku?: string;
  barcode: string;
  price: number;
  copies: number;
}

export interface BarcodePrint {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  barcode: string;
  labelSize: string;
  copies: number;
  barcodeType: string;
  showCompany: boolean;
  showProduct: boolean;
  showSku: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  enlargePrice: boolean;
  printOptions?: Record<string, unknown>;
  createdAt: string;
}

export interface BarcodePrintWrite {
  productId: string;
  barcode: string;
  labelSize: string;
  copies?: number;
  barcodeType?: string;
  showCompany?: boolean;
  showProduct?: boolean;
  showSku?: boolean;
  showPrice?: boolean;
  showBarcode?: boolean;
  enlargePrice?: boolean;
  printOptions?: Record<string, unknown>;
}
