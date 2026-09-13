import type { ProductEntity } from '@/infrastructure/database/dexie/db';

export type BarcodeFormat = 'ean13' | 'ean8' | 'code128' | 'code39' | 'upca' | 'qr';

export interface LabelSize {
  id: string;
  label: string;
  name: string;
  width: number; // mm
  height: number; // mm
  category: 'small' | 'standard' | 'large' | 'special';
}

export interface BarcodeFormatOption {
  id: BarcodeFormat;
  name: string;
  desc: string;
  is2D?: boolean;
}

export type BarcodeEntryMode = 'product' | 'random' | 'manual';

export interface PrintOptions {
  labelSizeId: string;
  barcodeFormat: BarcodeFormat;
  copies: number;
  entryMode: BarcodeEntryMode;
  manualBarcode: string;
  showCompany: boolean;
  showProduct: boolean;
  showSku: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  showBorder: boolean;
  enlargePrice: boolean;
}

export interface ProductLabelItem {
  product: ProductEntity;
  barcode: string;
  copies: number;
}
