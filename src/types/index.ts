export type UserRole = 'developer' | 'admin' | 'accountant' | 'sales_manager' | 'inventory_manager' | 'cashier' | 'seller';

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

export interface Currency {
  code: string;
  symbol: string;
  rateToBase: number;
}

export interface Settings {
  shopName: string;
  phone: string;
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
  [key: string]: unknown;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  sku?: string;
  category: string;            // legacy free-text
  categoryId?: string | null; // FK → categories.id
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
  variant?: string;
  expiryDate?: string;
  batchNumber?: string;
  highlighted?: boolean;
  status: 'active' | 'inactive';
  image?: string;
  allowNegativeStock?: boolean;
  warehouseId?: string;
  // PRD section 4: sale settings
  pricingByZone?: boolean;
  loyaltyCard?: boolean;
  askPrice?: boolean;
  askQuantity?: boolean;
  pointPrice?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  // legacy alias (costPrice)
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


export interface Customer {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
  balance: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  balance: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
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

export interface Payment {
  id: string;
  date: string;
  partyType: 'customer' | 'supplier';
  partyId: string;
  amount: number;
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

export interface Expense {
  id: string;
  date: string;
  label: string;
  category: string;
  amount: number;
}

export type CashSessionStatus = 'open' | 'closed';

export interface CashSession {
  id: string;
  sessionNumber: number;
  openedBy: string;
  openedAt: string;
  closedAt: string;
  openingBalance: number;
  deposits: { amount: number; date: string; note: string }[];
  totalSales: number;
  totalReturns: number;
  status: CashSessionStatus;
}

export interface CapitalEntry {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note: string;
}

export interface Promotion {
  id: string;
  productId?: string;
  productIds?: string[];
  name?: string;
  discountType?: 'percent' | 'amount' | 'percentage' | 'fixed';
  discountValue?: number;
  value?: number;
  startDate: string;
  endDate: string;
  active?: boolean;
  status?: 'active' | 'inactive';
  maxQuantity?: number;
}

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

export interface SuspendedOrder {
  id: string;
  items: CartItem[] | string;
  customerId: string;
  customerName?: string;
  subtotal?: number;
  discount: number;
  discountType: 'percent' | 'amount';
  total?: number;
  createdAt: string;
  note: string;
  createdBy?: string;
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
