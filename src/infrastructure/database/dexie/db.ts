// Dexie/EntityTable لم يعد مستخدماً — تم الترحيل إلى Electron + node:sqlite + IPC
// نحتفظ بـ type-only imports للأنواع الأخرى
import type { UserRole } from '@/types';
import type {
  PaperSize,
  Orientation,
  DocTypeKey,
  VisibilityMap,
  TemplateLayout,
  TemplateStyles,
} from '@/types/invoicePrint';

export interface ProductEntity {
  id: string;
  name: string;
  barcode: string;
  sku?: string;
  category: string;
  unit: string;
  costPrice: number;
  wholesalePrice: number;
  retailPrice: number;
  wholesaleMinQty: number;
  quantity: number;
  lowStockThreshold: number;
  status: 'active' | 'inactive';
  batchNumber?: string;
  expiryDate?: string;
  allowNegativeStock: boolean;
  image?: string;
  warehouseId?: string;
  reorderPoint?: number;
  maxStock?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CustomerEntity {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierEntity {
  id: string;
  name: string;
  phone: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItemEntity {
  id: string;
  saleId: string;
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  batchNumber?: string;
}

export interface SaleEntity {
  id: string;
  number: string;
  date: string;
  customerId?: string;
  customerName?: string;
  subtotal: number;
  discount: number;
  discountType: 'percent' | 'amount';
  tvaAmount: number;
  total: number;
  paymentMethod: 'cash' | 'credit';
  paidAmount: number;
  status: 'paid' | 'partial' | 'unpaid';
  docType: 'proforma' | 'devis' | 'bl' | 'facture';
  type: 'sale' | 'return';
  soldBy: string;
  sessionId?: string;
  note?: string;
  lastPrintedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: unknown[];
  cashSessionId?: string;
  amountPaid?: number;
}

export interface ExpenseEntity {
  id: string;
  date: string;
  label: string;
  category: string;
  amount: number;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface UserEntity {
  id: string;
  username: string;
  name: string;
  pin: string;
  phone?: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  roleId?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
  loginAttempts: number;
  lockedUntil?: string;
  passwordChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentEntity {
  id: string;
  date: string;
  customerId: string;
  amount: number;
  type: 'debit' | 'credit';
  method: 'cash' | 'credit';
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface PurchaseEntity {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  subtotal: number;
  tvaAmount: number;
  total: number;
  status: 'draft' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItemEntity {
  id: string;
  purchaseId: string;
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PromotionEntity {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  productIds: string[];
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface PackEntity {
  id: string;
  name: string;
  barcode: string;
  packPrice: number;
  items: { productId: string; qty: number; name?: string }[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// ===== الباركودات المرتبطة (variants/batches) — BARCODE-MGMT-001 =====
export type ProductBarcodeType = 'primary' | 'variant' | 'batch';

export interface ProductBarcodeEntity {
  id: string;
  productId: string;
  barcode: string;
  type: ProductBarcodeType;
  variantLabel?: string;
  batchNumber?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementEntity {
  id: string;
  productId: string;
  type: 'purchase' | 'sale' | 'return' | 'waste' | 'correction' | 'inventory' | 'pack' | 'transfer';
  qty: number;
  reference?: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
  date?: string;
  updatedAt?: string;
}

export interface CapitalEntryEntity {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

export interface CashSessionEntity {
  id: string;
  number?: string;
  sessionNumber: number;
  openedBy: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  actualBalance?: number;
  difference?: number;
  status: 'open' | 'closed';
  note?: string;
  openedAt: string;
  closedAt?: string;
  totalSales: number;
  totalReturns: number;
  deposits: { amount: number; note: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface SettingsEntity {
  id: string;
  shopName: string;
  phone: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  logo?: string;
  tvaRate: number;
  printWidthMm: number;
  syncMode: 'single' | 'lan' | 'cloud' | 'hybrid';
  currencies: string;
  baseCurrency: string;
  invoicePrefix: string;
  invoiceStartNumber: number;
  receiptFooter: string;
  zakatEnabled: boolean;
  nisabThreshold: number;
  shopLogo?: string;
  language?: string;
  printLanguage?: 'ar' | 'fr' | 'en';
  shopDescription?: string;
  shopAddress?: string;
  shopPhone2?: string;
  shopEmail?: string;
  commercialRegister?: string;
  companyRC?: string;
  taxNumber?: string;
  companyNif?: string;
  taxArticle?: string;
  companyArt?: string;
  companyAI?: string;
  taxId?: string;
  quickSale?: boolean;
  accountingOnly?: boolean;
  allowNegativeStock?: boolean;
  confirmNoStock?: boolean;
  averagePricing?: boolean;
  allowCardPayment?: boolean;
  allowTransferPayment?: boolean;
  invoiceTemplate?: 'basic' | 'detailed';
  expenseCategories?: string[];
  // SYS-GEN-001: العملة واللغة
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  timezone?: string;
  decimalSeparator?: ',' | '.';
  thousandsSeparator?: '.' | ',';
  textDirection?: 'rtl' | 'ltr';
  // SYS-GEN-001: الوضع التشغيلي
  operatingMode?: 'online' | 'offline';
  autoSync?: boolean;
  cacheDays?: number;
  connectionAlert?: boolean;
  connectionCheckInterval?: number;
  allowSelfRegistration?: boolean;
  defaultRole?: string;
  // POS-PRINT-001: إعدادات شعار الطباعة
  printLogoWidth?: number;
  printLogoHeight?: number;
  printLogoAlign?: 'right' | 'center' | 'left' | 'auto';
}

export interface PrintTemplateEntity {
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
  qr?: { enabled: boolean; payload: 'invoiceNumber' | 'invoiceUrl' | 'invoiceNumber:date:total' };
  barcode?: { enabled: boolean; source: 'invoiceNumber' | 'orderNumber' };
  isDefault: boolean;
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrintHistoryEntity {
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

export interface TemplateAssignmentEntity {
  docType: DocTypeKey;
  templateId: string;
}

export interface SuspendedOrderEntity {
  id: string;
  items: {
    productId: string;
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    isCustom?: boolean;
    isPack?: boolean;
    packId?: string;
    batchNumber?: string;
  }[];
  customerId: string;
  discount: number;
  discountType: 'percent' | 'amount';
  createdAt: string;
  note: string;
  createdBy?: string;
}

export interface AuditLogEntity {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  userId: string;
  details?: string;
  timestamp: string;
}

// ===== نظام إدارة المستخدمين والصلاحيات (SYS-USR-001) =====

export interface RoleEntity {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  isSystem: boolean;
  createdAt: string;
}

export interface UserActivityEntity {
  id: string;
  userId: string;
  action: string;
  entity?: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  deviceInfo?: string;
  performedAt: string;
}

// ===== إعدادات الشبكة والاتصال (SYS-NET-001) =====

export interface NetworkSettingsEntity {
  id: string;                              // 'default' single-row pattern
  // LAN
  lanEnabled: boolean;
  serverIp: string;
  serverPort: number;
  protocol: 'http' | 'https';
  sslCertPath?: string;
  sslKeyPath?: string;
  connectionKey?: string;
  autoReconnect: boolean;                  // BR-NET-003
  reconnectInterval: number;               // seconds
  // Cloud
  cloudEnabled: boolean;
  apiUrl?: string;
  apiKey?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  corsOrigins?: string;
  syncAuto: boolean;
  syncInterval: number;                    // minutes
  syncType: 'full' | 'incremental';
  syncTime: 'night' | 'day';
  alertOnSyncFail: boolean;                // BR-NET-010
  syncFailCount: number;                   // BR-NET-010 counter
  // Security
  oauthEnabled: boolean;
  jwtEnabled: boolean;
  apiRateLimit: number;                    // req/min — BR-NET-009
  ipWhitelist: string[];                   // BR-NET-005
  forceHttps: boolean;                      // BR-NET-008
  // Printer
  printerConnection: 'usb' | 'network' | 'bluetooth' | 'serial' | 'parallel';
  printerDriver: 'esc_pos' | 'zpl' | 'cpcl';
  printerDpi: 203 | 300 | 600;
  printerSpeed: 100 | 150 | 200;
  printerPaperSize: 58 | 76 | 80;
  printerHost?: string;
  printerPort?: number;
  printerTestedAt?: string;                // BR-NET-006
  // Barcode / Scanner
  barcodeType: 'code128' | 'ean13' | 'code39' | 'qr' | 'pdf417' | 'data_matrix';
  scannerType: 'handheld' | 'fixed';
  scannerInterface: 'usb' | 'bluetooth';
  scannerSpeed: 100 | 200 | 300;
  scannerDpi: 200 | 300 | 500;
  scannerTestedAt?: string;                // BR-NET-007
  // BARCODE-MGMT-001: توسيع إعدادات الماسح (دعم أجهزة SAFE POS)
  scannerBeepEnabled: boolean;             // تشغيل صوت "beep" عند المسح
  scannerTerminator: 'Enter' | 'Tab' | 'None'; // مفتاح نهاية الرسالة
  scannerMinLength: number;                // أقل طول للباركود (افتراضي 6)
  scannerAllowManualTypes: boolean;        // السماح بالكتابة اليدوية في حقل الباركود
  // Meta
  lastConnectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConnectedDeviceType = 'printer' | 'scanner' | 'cash_drawer' | 'display' | 'scale';
export type ConnectedDeviceStatus = 'online' | 'offline' | 'error';
export type ConnectionType = 'usb' | 'network' | 'bluetooth' | 'serial';

export interface ConnectedDeviceEntity {
  id: string;
  deviceName: string;
  deviceType: ConnectedDeviceType;
  connectionType: ConnectionType;
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  status: ConnectedDeviceStatus;
  lastSeen?: string;
  vendor?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== عداد فشل الطباعة (POS-PRINT-001 BR-003) =====

export interface PrintFailureCounterEntity {
  id: string;                          // keyedBy printerId OR templateId
  printerId?: string;
  templateId?: string;
  consecutiveFailures: number;
  lastFailureAt: string;
  lastError?: string;
  notified: boolean;                   // true بعد تنبيه المشرف
  createdAt: string;
  updatedAt: string;
}

// ===== طابور الطباعة (POS-PRINT-001 Phase 2 — FR-009/FR-012, BR-004/005) =====

export type PrintJobStatus = 'pending' | 'printing' | 'success' | 'failed' | 'cancelled';

export interface PrintJobEntity {
  id: string;
  invoiceId: string;
  templateId: string;
  printerId: string;                       // 'browser' — احتياط V2 network-printer
  status: PrintJobStatus;
  copies: number;
  payload: string;                         // JSON: { docType, userId, userName, isReprint, html }
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
}

// ===== إدارة الطابعات (POS-PRINT-001 / FR-013 → FR-017) =====

export type PrinterType = 'thermal' | 'inkjet' | 'laser' | 'system';
export type PrinterConnectionKind = 'usb' | 'network' | 'bluetooth' | 'serial' | 'browser';
export type PrinterDriver = 'esc_pos' | 'cups' | 'browser' | 'zpl' | 'cpcl';
export type PrinterStatus = 'connected' | 'disconnected' | 'busy' | 'error' | 'unknown';

export interface PrinterEntity {
  id: string;
  name: string;
  type: PrinterType;
  connection: PrinterConnectionKind;
  address?: string;                       // IP/host for network, MAC for bluetooth, vendor:product for usb
  port?: number;                          // شبكي فقط
  paperSize: '58mm' | '76mm' | '80mm' | 'A4' | 'A5';
  driver: PrinterDriver;
  dpi?: number;                           // 203 | 300 | 600
  speed?: number;                         // 100 | 150 | 200
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
export interface PrinterTemplateMappingEntity {
  id: string;                             // `${printerId}__${docType}`
  printerId: string;
  docType: string;                        // DocTypeKey
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

// ===== نظام إدارة المخزون والمستودعات (INV-MGMT-001) =====

export type WarehouseType = 'main' | 'branch' | 'cold' | 'hazardous' | 'pos';

export interface WarehouseEntity {
  id: string;
  name: string;
  location?: string;
  type: WarehouseType;
  capacity?: number;
  temperature?: number;
  humidity?: number;
  isActive: boolean;
  parentId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'receive' | 'issue' | 'transfer' | 'adjust' | 'count' | 'return' | 'sale' | 'purchase' | 'waste' | 'correction' | 'inventory' | 'pack';

export interface StockMovementV2Entity {
  id: string;
  movementNumber: string;
  date: string;
  type: MovementType;
  warehouseId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  reference?: string;
  description?: string;
  isReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface StockMovementLineEntity {
  id: string;
  movementId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  lineNumber: number;
}

export type CountStatus = 'pending' | 'in_progress' | 'completed';

export interface InventoryCountEntity {
  id: string;
  countNumber: string;
  date: string;
  warehouseId: string;
  status: CountStatus;
  isClosed: boolean;
  closedBy?: string;
  closedAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface InventoryCountLineEntity {
  id: string;
  countId: string;
  itemId: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
  lineNumber: number;
}

// ===== ترحيل Electron + Drizzle + SQLite =====
// تم استبدال Dexie/IndexedDB بـ IPC shim يتصل بـ node:sqlite في Electron main process.
// كل الاستدعاءات db.<table>.toArray()/.get()/.add()/.put() إلخ تمر عبر IPC الآن.
// تعريفات الأنواع أعلاه (lines 1-617) محفوظة لاستخدام الواجهة.
// لم نعد نستخدم Dexie أو IndexedDB — البيانات كلها في SQLite محلي.

export { db } from '@/lib/db';
