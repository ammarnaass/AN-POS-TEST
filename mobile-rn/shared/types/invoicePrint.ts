// Print Templates & Invoices module — V1
// PRD: POS-PRINT-001
// النوع الموحَّد لكل ما يخص طباعة المستندات التجارية
// مُنسَّق ليعمل على سطح المكتب والهاتف

export type PaperSize = '58mm' | '76mm' | '80mm' | 'A4' | 'A5' | 'custom';

export type Orientation = 'portrait' | 'landscape';

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

// Block-based layout

export interface TextBlock {
  id: string;
  type: 'text';
  text: string | string[];
  align?: 'right' | 'center' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  weight?: FontWeight;
  colorVar?: 'primary' | 'header' | 'footer' | 'table' | 'logo' | 'custom' | 'none';
  customColor?: string;
}

export interface ImageBlock {
  id: string;
  type: 'image';
  src: string;
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
  colorVar?: 'primary' | 'header' | 'footer' | 'table' | 'logo' | 'custom' | 'none';
  customColor?: string;
  thickness?: 1 | 2 | 3;
}

export interface QrBlock {
  id: string;
  type: 'qr';
  payload: 'invoiceNumber' | 'invoiceUrl' | 'invoiceNumber:date:total';
  size?: number;
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

export interface DocumentContext {
  invoice: Record<string, unknown>;
  settings: Record<string, unknown>;
  template: PrintTemplate;
  shopLegal: ShopLegalInfo;
  user: { id: string; name: string; role: string };
  lang: 'ar' | 'fr' | 'en';
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
  taxNumber?: string;
  taxArticle?: string;
  commercialRegister?: string;
  nif?: string;
  ai?: string;
  logo?: string;
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
  id?: string;
  docType: DocTypeKey;
  templateId: string;
  printerId?: string;
  paperSize?: PaperSize;
  createdAt?: string;
  updatedAt?: string;
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
  printerName: string;
  isReprint: boolean;
  payload?: string;
}

export const DOC_TYPE_LABELS_AR: Record<DocTypeKey, string> = {
  'thermal-receipt': 'إيصال حراري',
  'sale-invoice': 'فاتورة بيع',
  proforma: 'فاتورة أولية',
  devis: 'عرض سعر',
  bl: 'وصل تسليم',
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
