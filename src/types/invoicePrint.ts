// Print Templates & Invoices module — V1
// PRD: POS-PRINT-001
// النوع الموحَّد لكل ما يخص طباعة المستندات التجارية

// POS-PRINT-001 / FR-018: دعم أحجام حرارية إضافية (58mm، 76mm) + A4/A5
export type PaperSize = '58mm' | '76mm' | '80mm' | 'A4' | 'A5' | 'custom';

export type Orientation = 'portrait' | 'landscape';

// 9 أنواع وثائق يدعمها النظام — ممتد عن Sale.docType الموجود أصلاً في types/index.ts
export type DocTypeKey =
  | 'thermal-receipt'
  | 'sale-invoice'
  | 'proforma'
  | 'devis'
  | 'bl'
  | 'return-invoice'
  | 'purchase-invoice'
  | 'customer-statement'
  | 'supplier-statement';

export interface VisibilityMap {
  logo: boolean;
  shopName: boolean;
  invoiceNumber: boolean;
  customerName: boolean;
  customerPhone: boolean;
  customerAddress: boolean;
  barcode: boolean;
  unitPrice: boolean;
  discount: boolean;
  tva: boolean;
  sellerName: boolean;
  cashierName: boolean;
  paymentMethod: boolean;
  qr: boolean;
  signature: boolean;
  stamp: boolean;
}

export const DEFAULT_VISIBILITY: VisibilityMap = {
  logo: true,
  shopName: true,
  invoiceNumber: true,
  customerName: true,
  customerPhone: false,
  customerAddress: false,
  barcode: true,
  unitPrice: true,
  discount: true,
  tva: true,
  sellerName: true,
  cashierName: true,
  paymentMethod: true,
  qr: false,
  signature: false,
  stamp: false,
};

export type FontWeight = 300 | 400 | 500 | 600 | 700;

export interface TemplateStyles {
  primaryColor: string;
  headerColor: string;
  footerColor: string;
  tableColor: string;
  logoColor: string;
  font: {
    family: string;
    size: number;
    weight: FontWeight;
  };
}

export const DEFAULT_STYLES: TemplateStyles = {
  primaryColor: '#0891b2',
  headerColor: '#0e7490',
  footerColor: '#475569',
  tableColor: '#e2e8f0',
  logoColor: '#0891b2',
  font: {
    family: 'Cairo',
    size: 13,
    weight: 400,
  },
};

// Block-based layout. كل block يصدر HTML مستقل عند render.

// أنواع الـ Blocks
export interface TextBlock {
  id: string;
  type: 'text';
  text: string | string[]; // نص ثابت أو قائمة أسطر
  align?: 'right' | 'center' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  weight?: FontWeight;
  /** مرجع لون من TemplateStyles، أو 'custom' لاستخدام customColor */
  colorVar?: 'primary' | 'header' | 'footer' | 'table' | 'logo' | 'custom' | 'none';
  /** hex يُستعمل عندما colorVar='custom' */
  customColor?: string;
}

export interface ImageBlock {
  id: string;
  type: 'image';
  src: string // '' => نأخذ شعار المتجر افتراضياً
  width?: number;
  height?: number;
  align?: 'right' | 'center' | 'left';
}

export interface RowBlock {
  id: string;
  type: 'row';
  children: Block[];
  gap?: number;
  align?: 'right' | 'center' | 'left' | 'space-between';
}

export interface ColumnBlock {
  id: string;
  type: 'column';
  children: Block[];
  gap?: number;
}

export interface TableBlock {
  id: string;
  type: 'table';
  columns: TableColumn[];
  source: 'items';
  showSubtotal?: boolean;
  showTotal?: boolean;
  showDiscount?: boolean;
  showTva?: boolean;
}

export interface TableColumn {
  key: 'name' | 'qty' | 'unitPrice' | 'discount' | 'lineTotal' | 'tax';
  label: string;
  align?: 'right' | 'center' | 'left';
  format?: 'text' | 'number' | 'currency';
}

export interface SeparatorBlock {
  id: string;
  type: 'separator';
  style?: 'solid' | 'dashed' | 'dotted';
  /** مرجع لون من TemplateStyles، أو 'custom' لاستخدام customColor */
  colorVar?: 'primary' | 'header' | 'footer' | 'table' | 'logo' | 'custom' | 'none';
  customColor?: string;
  thickness?: 1 | 2 | 3;
}

export interface QrBlock {
  id: string;
  type: 'qr';
  payload: 'invoiceNumber' | 'invoiceUrl' | 'invoiceNumber:date:total';
  size?: number; // px بجانب viewport
}

export interface BarcodeBlock {
  id: string;
  type: 'barcode';
  source: 'invoiceNumber' | 'orderNumber';
  width?: number;
  height?: number;
  format?: 'CODE128' | 'EAN13';
}

export type Block =
  | TextBlock
  | ImageBlock
  | RowBlock
  | ColumnBlock
  | TableBlock
  | SeparatorBlock
  | QrBlock
  | BarcodeBlock;

export type PrintLanguage = 'ar' | 'fr' | 'en' | 'ar-fr';

// بيانات سياق المستند — تُمرَّر لمحرك العرض
export interface DocumentContext {
  invoice: Record<string, unknown>; // Sale | Purchase | Statement — flexible
  settings: Record<string, unknown>; // Settings
  template: PrintTemplate;
  shopLegal: ShopLegalInfo;
  user: { id: string; name: string; role: string };
  lang: PrintLanguage;
  invoiceUrl?: string;
}

export interface ShopLegalInfo {
  name: string;
  legalName?: string;
  phone: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  // المعلومات القانونية الجزائرية الأساسية
  taxNumber?: string; // NIF
  taxArticle?: string; // المادة الجبائية
  commercialRegister?: string; // RC
  nif?: string; // NIF (alias)
  ai?: string; // Article d'Imposition
  logo?: string; // data-URL أو باطل
  footer: string;
  header?: string;
  welcomePhrase?: string;
}

export interface TemplateLayout {
  header: Block[];
  body: Block[];
  footer: Block[];
}

export interface PrintTemplate {
  id: string;
  name: string;
  description: string;
  paperSize: PaperSize;
  orientation: Orientation;
  widthMm: number;
  heightMm?: number;
  supportedDocuments: DocTypeKey[];
  visibility: VisibilityMap;
  layout: TemplateLayout;
  styles: TemplateStyles;
  qr?: {
    enabled: boolean;
    payload: 'invoiceNumber' | 'invoiceUrl' | 'invoiceNumber:date:total';
  };
  barcode?: {
    enabled: boolean;
    source: 'invoiceNumber' | 'orderNumber';
  };
  isDefault: boolean;
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateAssignment {
  docType: DocTypeKey; // PK
  templateId: string;
}

export interface PrintHistoryRecord {
  id: string;
  invoiceId: string;
  invoiceType: 'sale' | 'purchase' | 'statement';
  docTypeKey: DocTypeKey;
  templateId: string;
  printedBy: string;
  printedAt: string;
  copies: number;
  printerName: string; // 'browser' حالياً، V2 network-printer
  isReprint: boolean;
  payload?: string; // لتفاصيل الإعادة (للسجل)
}

// Labels عربية لعرض أنواع الوثائق في الواجهة
export const DOC_TYPE_LABELS_AR: Record<DocTypeKey, string> = {
  'thermal-receipt': 'إيصال حراري',
  'sale-invoice': 'فاتورة بيع',
  proforma: 'فاتورة أولية (Proforma)',
  devis: 'عرض سعر (Devis)',
  bl: 'وصل تسليم (BL)',
  'return-invoice': 'فاتورة مرتجع',
  'purchase-invoice': 'فاتورة شراء',
  'customer-statement': 'كشف حساب زبون',
  'supplier-statement': 'كشف حساب مورد',
};

export const ALL_DOC_TYPES: DocTypeKey[] = [
  'thermal-receipt',
  'sale-invoice',
  'proforma',
  'devis',
  'bl',
  'return-invoice',
  'purchase-invoice',
  'customer-statement',
  'supplier-statement',
];

export const PAPER_LABELS_AR: Record<PaperSize, string> = {
  '58mm': 'حراري 58 ملم',
  '76mm': 'حراري 76 ملم',
  '80mm': 'حراري 80 ملم',
  A4: 'A4 (210×297 ملم)',
  A5: 'A5 (148×210 ملم)',
  custom: 'مخصص',
};

// ===== POS-PRINT-001 / FR-013 → FR-017: إدارة الطابعات =====

export type PrinterType = 'thermal' | 'inkjet' | 'laser' | 'system';
export type PrinterConnectionKind = 'usb' | 'network' | 'bluetooth' | 'serial' | 'browser';
export type PrinterDriver = 'esc_pos' | 'cups' | 'browser' | 'zpl' | 'cpcl';
export type PrinterStatus = 'connected' | 'disconnected' | 'busy' | 'error' | 'unknown';

export interface Printer {
  id: string;
  name: string;
  type: PrinterType;
  connection: PrinterConnectionKind;
  address?: string;
  port?: number;
  paperSize: '58mm' | '76mm' | '80mm' | 'A4' | 'A5';
  driver: PrinterDriver;
  dpi?: number;
  speed?: number;
  status: PrinterStatus;
  lastSeenAt?: string;
  isDefault: boolean;
  isActive: boolean;
  vendor?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
}

// FR-014: ربط قالب بطابعة لكل نوع وثيقة
export interface PrinterTemplateMapping {
  id: string;                             // `${printerId}__${docType}`
  printerId: string;
  docType: DocTypeKey;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

export const PRINTER_CONNECTION_LABELS_AR: Record<PrinterConnectionKind, string> = {
  usb: 'USB',
  network: 'شبكة (Network)',
  bluetooth: 'Bluetooth',
  serial: 'Serial',
  browser: 'متصفح',
};

export const PRINTER_TYPE_LABELS_AR: Record<PrinterType, string> = {
  thermal: 'حرارية',
  inkjet: 'نفث الحبر',
  laser: 'ليزر',
  system: 'النظام',
};

export const PRINTER_STATUS_LABELS_AR: Record<PrinterStatus, string> = {
  connected: 'متصلة',
  disconnected: 'غير متصلة',
  busy: 'مشغولة',
  error: 'خطأ',
  unknown: 'غير معروفة',
};

export const PRINTER_DRIVER_LABELS_AR: Record<PrinterDriver, string> = {
  esc_pos: 'ESC/POS (حرارية)',
  cups: 'CUPS (A4/A5)',
  browser: 'متصفح',
  zpl: 'ZPL (Zebra)',
  cpcl: 'CPCL',
};
