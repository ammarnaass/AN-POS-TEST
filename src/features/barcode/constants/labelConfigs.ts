import type { LabelSize, BarcodeFormatOption, PrintOptions } from '../types';

export const LABEL_SIZES: LabelSize[] = [
  { id: '40x20', label: '40×20', name: 'ملصق مصغر', width: 40, height: 20, category: 'small' },
  { id: '40x25', label: '40×25', name: 'قياسي افتراضي', width: 40, height: 25, category: 'standard' },
  { id: '35x35', label: '35×35', name: 'مربع صغير', width: 35, height: 35, category: 'standard' },
  { id: '45x35', label: '45×35', name: 'رفوف متوسط', width: 45, height: 35, category: 'standard' },
  { id: '50x25', label: '50×25', name: 'أفقي رفيع', width: 50, height: 25, category: 'standard' },
  { id: '55x35', label: '55×35', name: 'تفصيلي مع SKU', width: 55, height: 35, category: 'large' },
  { id: '55x45', label: '55×45', name: 'شامل تفصيلي', width: 55, height: 45, category: 'large' },
  { id: '50x50', label: '50×50', name: 'مربع كبير QR', width: 50, height: 50, category: 'large' },
  { id: '20x40', label: '20×40', name: 'عمودي طولي', width: 20, height: 40, category: 'special' },
  { id: '42x35', label: '42×35', name: 'متوازن تجاري', width: 42, height: 35, category: 'special' },
];

export const BARCODE_FORMATS: BarcodeFormatOption[] = [
  { id: 'ean13', name: 'EAN-13', desc: 'الباركود التجاري القياسي (13 رقم)' },
  { id: 'code128', name: 'CODE-128', desc: 'عالي الكثافة (حروف وأرقام)' },
  { id: 'qr', name: 'QR Code', desc: 'رمز استجابة سريع حقيقي ثنائي الأبعاد', is2D: true },
  { id: 'ean8', name: 'EAN-8', desc: 'باركود المنتجات الصغيرة (8 أرقام)' },
  { id: 'code39', name: 'CODE-39', desc: 'الباركود الصناعي والمخزني' },
  { id: 'upca', name: 'UPC-A', desc: 'الباركود الأمريكي القياسي (12 رقم)' },
];

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  labelSizeId: '40x25',
  barcodeFormat: 'ean13',
  copies: 1,
  entryMode: 'product',
  manualBarcode: '',
  showCompany: true,
  showProduct: true,
  showSku: false,
  showPrice: true,
  showBarcode: true,
  showBorder: true,
  enlargePrice: false,
};
