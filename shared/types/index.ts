// ============================================================
// مشاركة الأنواع المشتركة بين تطبيق سطح المكتب والهاتف
// Unified types for AN-POS desktop + mobile
// ============================================================

// ===== User & Roles =====

export type UserRole =
  | 'admin'
  | 'accountant'
  | 'sales_manager'
  | 'inventory_manager'
  | 'cashier'
  | 'seller';

export interface User {
  id: string;
  username: string;
  name: string;
  pin: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  roleId?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
  loginAttempts?: number;
  lockedUntil?: string;
  passwordChangedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, unknown>;
  isSystem: boolean;
  createdAt?: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  deviceInfo?: string;
  performedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  userId: string;
  details?: string;
  timestamp: string;
}

// ===== Settings =====

export interface Currency {
  code: string;
  symbol: string;
  rateToBase: number;
}

export interface Settings {
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
  currencies: Currency[];
  baseCurrency: string;
  invoicePrefix: string;
  invoiceStartNumber: number;
  receiptFooter: string;
  zakatEnabled: boolean;
  nisabThreshold: number;
  shopLogo?: string;
  language?: string;
  printLanguage?: string;
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
  invoiceTemplate?: string;
  expenseCategories?: string;
  dateFormat?: string;
  timeFormat?: string;
  timezone?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  textDirection?: string;
  operatingMode?: string;
  autoSync?: boolean;
  cacheDays?: number;
  connectionAlert?: boolean;
  connectionCheckInterval?: number;
  [key: string]: unknown;
}

// ===== Products =====

export interface Product {
  id: string;
  name: string;
  barcode: string;
  sku?: string;
  category: string;
  categoryId?: string | null;
  type?: string;
  unit: string;
  costPrice: number;
  averagePrice?: number;
  wholesalePrice: number;
  retailPrice: number;
  salePrice1?: number;
  salePrice2?: number;
  salePrice3?: number;
  invoicePrice?: number;
  profitMargin?: number;
  tax?: number;
  discount?: number;
  wholesaleMinQty: number;
  quantity: number;
  lowStockThreshold: number;
  reorderPoint?: number;
  maxStock?: number;
  stockable?: boolean;
  weight?: number;
  packageSize?: string;
  location?: string;
  image?: string;
  variant?: string;
  expiryDate?: string;
  batchNumber?: string;
  highlighted?: boolean;
  status: 'active' | 'inactive';
  allowNegativeStock?: boolean;
  warehouseId?: string;
  pricingByZone?: boolean;
  loyaltyCard?: boolean;
  askPrice?: boolean;
  askQuantity?: boolean;
  pointPrice?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  cost?: number;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  description?: string;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductBarcode {
  id: string;
  productId: string;
  barcode: string;
  type: string;
  variantLabel?: string;
  batchNumber?: string;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
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

// ===== Warehouses & Inventory =====

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  type: string;
  capacity?: number;
  temperature?: number;
  humidity?: number;
  isActive: boolean;
  parentId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: string;
  qty: number;
  reference?: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
  date?: string;
  updatedAt?: string;
}

export interface InventoryCount {
  id: string;
  countNumber: string;
  date: string;
  warehouseId: string;
  status: string;
  isClosed: boolean;
  closedBy?: string;
  closedAt?: string;
  createdBy?: string;
  createdAt?: string;
}

// ===== Sales =====

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  batchNumber?: string;
}

export type SaleType = 'sale' | 'return';
export type DocType = 'proforma' | 'devis' | 'bl' | 'facture';
export type PaymentMethod = 'cash' | 'credit';
export type SaleStatus = 'paid' | 'partial' | 'unpaid';

export interface Sale {
  id: string;
  number: string;
  date: string;
  docType: DocType;
  type: SaleType;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discountType: 'percent' | 'amount';
  tvaAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerId: string;
  amountPaid: number;
  paidAmount?: number;
  status: SaleStatus;
  soldBy: string;
  cashSessionId: string;
  createdAt?: string;
  updatedAt?: string;
  sessionId?: string;
  note?: string;
  customerName?: string;
  lastPrintedAt?: string;
}

export interface SuspendedOrder {
  id: string;
  items: CartItem[];
  customerId: string;
  discount: number;
  discountType: 'percent' | 'amount';
  createdAt: string;
  note: string;
  createdBy?: string;
}

// ===== Customers & Suppliers =====

export interface Customer {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  date: string;
  partyType: 'customer' | 'supplier';
  partyId: string;
  customerId?: string;
  amount: number;
  type?: string;
  method?: string;
  note?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  balance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierEntry {
  id: string;
  supplierId: string;
  date: string;
  type: 'purchase' | 'payment';
  amount: number;
  items: SaleItem[];
  invoiceNumber: string;
  paidAmount: number;
  remainingBalance: number;
}

export interface Purchase {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  subtotal: number;
  tvaAmount: number;
  total: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

// ===== Finance =====

export interface Expense {
  id: string;
  date: string;
  label: string;
  category: string;
  amount: number;
  note?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface CashSession {
  id: string;
  number: string;
  sessionNumber: number;
  openedBy: string;
  openedAt: string;
  closedAt: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  actualBalance?: number;
  difference?: number;
  deposits: { amount: number; date: string; note: string }[];
  totalSales: number;
  totalReturns: number;
  status: 'open' | 'closed';
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CapitalEntry {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note: string;
  createdAt?: string;
}

// ===== Promotions & Packs =====

export interface Promotion {
  id: string;
  productId?: string;
  productIds?: string[];
  name?: string;
  type?: string;
  value?: number;
  discountType?: 'percent' | 'amount' | 'percentage' | 'fixed';
  discountValue?: number;
  startDate: string;
  endDate: string;
  active?: boolean;
  status?: 'active' | 'inactive';
  maxQuantity?: number;
}

export interface PackItem {
  productId: string;
  qty: number;
}

export interface Pack {
  id: string;
  name: string;
  barcode: string;
  items: PackItem[];
  packPrice: number;
  status: 'active' | 'inactive';
}

// ===== Cart =====

export interface CartItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  batchNumber?: string;
  isCustom?: boolean;
  isPack?: boolean;
  packId?: string;
}

// ===== Printing =====

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

export interface PrintTemplate {
  id: string;
  name: string;
  description: string;
  paperSize: PaperSize;
  orientation: Orientation;
  widthMm: number;
  heightMm?: number;
  supportedDocuments: DocTypeKey[];
  visibility: Record<string, boolean>;
  layout: Record<string, unknown>;
  styles: Record<string, unknown>;
  qr?: Record<string, unknown>;
  barcode?: Record<string, unknown>;
  isDefault: boolean;
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Printer {
  id: string;
  name: string;
  type: string;
  connection: string;
  address?: string;
  port?: number;
  paperSize: string;
  driver: string;
  dpi?: number;
  speed?: number;
  status: string;
  lastSeenAt?: string;
  isDefault: boolean;
  isActive: boolean;
  vendor?: string;
  model?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateAssignment {
  docType: string;
  templateId: string;
}

export interface PrinterTemplateMapping {
  id: string;
  printerId: string;
  docType: string;
  templateId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrintJob {
  id: string;
  invoiceId: string;
  templateId: string;
  printerId: string;
  status: 'pending' | 'printing' | 'success' | 'failed' | 'cancelled';
  copies: number;
  payload: Record<string, unknown>;
  errorMessage?: string;
  createdAt?: string;
  processedAt?: string;
}

export interface PrintHistoryRecord {
  id: string;
  invoiceId: string;
  invoiceType: string;
  docTypeKey: DocTypeKey;
  templateId: string;
  printedBy: string;
  printedAt: string;
  copies: number;
  printerName: string;
  isReprint: boolean;
  payload?: string;
}

export interface PrintFailureCounter {
  id: string;
  printerId?: string;
  templateId?: string;
  consecutiveFailures: number;
  lastFailureAt: string;
  lastError?: string;
  notified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ===== Network & Devices =====

export interface NetworkSettings {
  id: string;
  lanEnabled: boolean;
  serverIp: string;
  serverPort: number;
  protocol: string;
  sslCertPath?: string;
  sslKeyPath?: string;
  connectionKey?: string;
  autoReconnect: boolean;
  reconnectInterval: number;
  cloudEnabled: boolean;
  apiUrl?: string;
  apiKey?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  corsOrigins?: string;
  syncAuto: boolean;
  syncInterval: number;
  syncType: string;
  syncTime: string;
  alertOnSyncFail: boolean;
  syncFailCount: number;
  oauthEnabled: boolean;
  jwtEnabled: boolean;
  apiRateLimit: number;
  ipWhitelist: string;
  forceHttps: boolean;
  printerConnection: string;
  printerDriver: string;
  printerDpi: number;
  printerSpeed: number;
  printerPaperSize: number;
  printerHost?: string;
  printerPort?: number;
  printerTestedAt?: string;
  barcodeType: string;
  scannerType: string;
  scannerInterface: string;
  scannerSpeed: number;
  scannerDpi: number;
  scannerBeepEnabled: boolean;
  scannerTerminator: string;
  scannerMinLength: number;
  scannerAllowManualTypes: boolean;
  lastConnectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConnectedDevice {
  id: string;
  deviceName: string;
  deviceType: string;
  connectionType: string;
  ipAddress?: string;
  macAddress?: string;
  port?: number;
  status: string;
  lastSeen?: string;
  vendor?: string;
  model?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ===== Global State =====

export interface AppState {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  payments: Payment[];
  supplierEntries: SupplierEntry[];
  expenses: Expense[];
  users: User[];
  cashSessions: CashSession[];
  capitalEntries: CapitalEntry[];
  promotions: Promotion[];
  packs: Pack[];
  settings: Settings;
  currentUser: User | null;
  currentCashSession: CashSession | null;
}

// ===== License & Trial =====

export interface LicenseInfo {
  activated: boolean;
  activationCode?: string;
  activatedAt?: string;
  expiresAt?: string;
}

export interface TrialState {
  startDate: string;
  salesCount: number;
  isExpired: boolean;
}
