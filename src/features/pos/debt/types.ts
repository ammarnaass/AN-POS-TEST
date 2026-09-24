import type { Customer, Sale } from '@/types';

export interface CustomerDebtSummary {
  customerId: string;
  customerName: string;
  phone?: string;
  balance: number;
  creditLimit: number;
  hasCreditAdvance: boolean;
  isCreditLimitExceeded: boolean;
  creditExcessAmount: number;
  remainingCredit: number;
}

export interface CreditSaleValidation {
  isCreditSale: boolean;
  matchedCustomer?: Customer;
  currentBalance: number;
  creditLimit: number;
  projectedDebt: number;
  isCreditLimitExceeded: boolean;
  creditExcessAmount: number;
  hasCreditAdvance: boolean;
  overrideCreditLimit: boolean;
  setOverrideCreditLimit: (override: boolean) => void;
  isConfirmDisabled: boolean;
  validationError: string | null;
}

export interface QuickCustomerInput {
  name: string;
  phone?: string;
  creditLimit?: number;
  address?: string;
  customerType?: 'retail' | 'wholesale' | 'semi_wholesale';
}

export interface DebtSettlementInput {
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  note?: string;
  currentSessionId?: string | null;
  printReceipt?: boolean;
  targetSaleId?: string; // إذا كان السداد لفاتورة بعينها
}

export interface InvoiceAllocationResult {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  originalTotal: number;
  previouslyPaid: number;
  allocatedAmount: number;
  remainingAfter: number;
  newStatus: 'paid' | 'partial' | 'unpaid';
}

export interface SpecificInvoiceSettlementInput {
  saleId: string;
  customerId: string;
  customerName?: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | string;
  note?: string;
  currentSessionId?: string | null;
  currentUserName?: string;
  printReceipt?: boolean;
}

export interface DebtAgingBucket {
  label: string;
  rangeDays: string;
  amount: number;
  invoicesCount: number;
  severity: 'normal' | 'due' | 'warning' | 'critical';
}

export interface CustomerDebtAgingSummary {
  buckets: DebtAgingBucket[];
  totalOverdue: number;
  oldestInvoiceDays: number;
  oldestInvoiceDate?: string;
}

export interface DebtSettlementResult {
  success: boolean;
  customerId: string;
  previousBalance: number;
  settledAmount: number;
  newBalance: number;
  paymentMethod: string;
  receiptNumber?: string;
  timestamp: string;
  allocations?: InvoiceAllocationResult[];
}

export type InvoicePaymentStatus = 'paid' | 'unpaid' | 'partial' | 'return';

export interface InvoiceStatusToggleParams {
  saleId: string;
  targetStatus: 'paid' | 'unpaid';
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'credit';
  currentSessionId?: string | null;
  currentUserName?: string;
  note?: string;
}

export interface InvoiceStatusToggleResult {
  success: boolean;
  saleId: string;
  saleNumber: string;
  previousStatus: string;
  newStatus: 'paid' | 'unpaid';
  customerId?: string;
  previousCustomerBalance?: number;
  newCustomerBalance?: number;
  amountChanged: number;
  timestamp: string;
}

export interface InvoiceLookupFilter {
  searchQuery?: string;
  status?: 'all' | 'unpaid' | 'paid' | 'return';
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CustomerInvoicesMetrics {
  totalSalesAmount: number;
  totalPaidAmount: number;
  totalUnpaidDebt: number;
  unpaidCount: number;
  paidCount: number;
  returnsCount: number;
  totalCount: number;
}

export interface AddCustomerDebtInput {
  customerId: string;
  customerName: string;
  amount: number;
  reason?: string;
  note?: string;
  date?: string;
  currentSessionId?: string | null;
  overrideCreditLimit?: boolean;
  printReceipt?: boolean;
}

export interface AddCustomerDebtResult {
  success: boolean;
  customerId: string;
  customerName: string;
  previousBalance: number;
  addedAmount: number;
  newBalance: number;
  voucherNumber: string;
  reason: string;
  timestamp: string;
}

export interface CustomerStatementEntry {
  id: string;
  date: string;
  type: 'sale' | 'payment' | 'debt_addition' | 'return' | 'opening_balance' | 'previous_balance';
  number: string;
  description: string;
  debit: number;
  credit: number;
  status: string;
  runningBalance: number;
}

export interface CustomerStatementFilter {
  type?: 'all' | 'sales' | 'payments' | 'debts';
  dateFrom?: string;
  dateTo?: string;
}

export interface CustomerStatementSummary {
  entries: CustomerStatementEntry[];
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  netChange: number;
  finalBalance: number;
  periodFrom?: string;
  periodTo?: string;
}

export interface POSInvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  customer?: Customer | null;
  onTogglePaymentStatus?: (params: InvoiceStatusToggleParams) => Promise<any>;
  onRecallToCart?: (sale: Sale) => void;
  onFullReturn?: (sale: Sale) => void;
  onPrintReceipt?: (sale: Sale) => void;
  onSettleInvoiceDebt?: (sale: Sale, remainingDebt: number) => void;
  currencySymbol?: string;
}

export interface POSCustomerInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  customers?: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
  sales?: Sale[];
  onSelectInvoice?: (sale: Sale) => void;
  onRecallToCart?: (sale: Sale) => void;
  onFullReturn?: (sale: Sale) => void;
  onTogglePaymentStatus?: (params: InvoiceStatusToggleParams) => Promise<any>;
  onOpenSettlementModal?: (customer: Customer) => void;
  onOpenAddDebtModal?: (customer: Customer) => void;
  onSettleInvoiceDebt?: (sale: Sale, remainingDebt: number) => void;
  currencySymbol?: string;
}

export interface POSAddCustomerDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  currentSessionId?: string | null;
  onDebtAdded?: (result: AddCustomerDebtResult) => void;
  currencySymbol?: string;
  shopName?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// POS CUSTOMER BUTTON TYPES (أنماط وخصائص زر الزبون الموحد)
// ────────────────────────────────────────────────────────────────────────────

export type POSCustomerButtonVariant =
  | 'cart_header'   // هيدر السلة القياسي في معظم واجهات نقطة البيع
  | 'topbar'        // الأشرطة العلوية القياسية
  | 'terminal'      // شريط التيرمينال فائق الكثافة (F2)
  | 'keypad_tile'   // بلاطة شبكة لوحة الأرقام اللمسية في ديزاين 7
  | 'banner'        // شريط عرض عريض مع تفاصيل الائتمان والإجراءات السريعة
  | 'compact';      // نمط مصغر للشاشات اللوحية والضيقة

export interface POSCustomerButtonProps {
  variant?: POSCustomerButtonVariant;
  className?: string;
  customer?: Customer | null;
  customers?: Customer[];
  selectedCustomerName?: string;
  onSelectCustomer?: () => void;
  onOpenCustomerLedger?: () => void;
  onOpenSettlement?: () => void;
  onOpenAddDebt?: () => void;
  onOpenQuickNewCustomer?: () => void;
  showShortcut?: boolean;
  showBalance?: boolean;
  compactText?: boolean;
  currency?: string;
}


