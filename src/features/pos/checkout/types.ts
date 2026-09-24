import type { CartItem, Product, Customer, Sale, DocType, CashSession } from '@/types';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';

export interface SaleSettings {
  tvaRate: number;
  invoicePrefix: string;
  baseCurrency: string;
  shopName: string;
  phone: string;
  receiptFooter: string;
  autoPrintReceipt?: boolean;
  allowNegativeStock?: boolean;
  invoiceTemplate?: 'compact' | 'detailed' | string;
}

export interface SaleCompletionParams {
  cart: CartItem[];
  discount: number;
  discountType: 'percent' | 'amount';
  selectedCustomer: string;
  paymentMethod: 'cash' | 'credit' | 'card' | 'transfer';
  amountPaid?: number;
  paidAmount?: number;
  isReturn?: boolean;
  saleType?: 'sale' | 'return';
  docType?: DocType;
  priceTier?: '1' | '2' | '3' | '4';
  autoPrint?: boolean;
  note?: string;
  currentSession: { id: string; totalSales?: number; totalReturns?: number } | null;
  settings: SaleSettings;
  products: Product[] | any[];
  packs: any[];
  customers: Customer[] | any[];
  originalSaleId?: string;
  originalSaleNumber?: string;
  returnReason?: string;
  refundMethod?: 'cash' | 'customer_credit';
  customerName?: string;
}

export interface SaleCompletionResult {
  sale: Sale;
  autoPrint: boolean;
}

export interface PaymentCalculationResult {
  effectivePaidAmount: number;
  changeAmount: number;
  unpaidAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
}

export type RefundMethod = 'cash' | 'customer_credit';

export const DEFAULT_RETURN_REASONS = [
  'طلب الزبون (تراجع عن الشراء)',
  'عيب مصنعي أو كسر',
  'منتج غير مطابق أو صنف خاطئ',
  'انتهاء أو قرب الصلاحية',
  'أخرى',
];

export interface POSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  paidAmount: number;
  setPaidAmount: (amount: number) => void;
  selectedCustomer: string;
  setSelectedCustomer: (id: string) => void;
  customers: Array<{ id: string; name: string; phone?: string; balance?: number; creditLimit?: number }>;
  onOpenAddCustomer: () => void;
  onConfirmPayment: (
    paid?: number,
    custId?: string,
    method?: string,
    refundMethod?: RefundMethod,
    returnReason?: string,
    transactionReference?: string
  ) => void;
  isPending: boolean;
  allowCardPayment?: boolean;
  allowTransferPayment?: boolean;
  isReturn?: boolean;
  refundMethod?: RefundMethod;
  setRefundMethod?: (method: RefundMethod) => void;
  cart?: CartItem[];
  returnContext?: { originalSaleId?: string; originalSaleNumber?: string; reason?: string; refundMethod?: RefundMethod } | null;
  returnReason?: string;
  setReturnReason?: (r: string) => void;
}

export interface POSSaleSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedSale: Sale | null;
}

export interface POSCheckoutModalsProps {
  showPaymentModal: boolean;
  onClosePaymentModal: () => void;
  showSuccessModal: boolean;
  onCloseSuccessModal: () => void;
  total: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  paidAmount: number;
  setPaidAmount: (amount: number) => void;
  selectedCustomer: string;
  setSelectedCustomer: (id: string) => void;
  customers: Array<{ id: string; name: string; phone?: string; balance?: number; creditLimit?: number }>;
  onOpenAddCustomer: () => void;
  onConfirmPayment: (
    paid?: number,
    custId?: string,
    method?: string,
    refundMethod?: RefundMethod,
    returnReason?: string,
    transactionReference?: string
  ) => void;
  isSalePending: boolean;
  completedSale: Sale | null;
  allowCardPayment?: boolean;
  allowTransferPayment?: boolean;
  isReturn?: boolean;
  refundMethod?: RefundMethod;
  setRefundMethod?: (method: RefundMethod) => void;
  cart?: CartItem[];
  returnContext?: { originalSaleId?: string; originalSaleNumber?: string; reason?: string; refundMethod?: RefundMethod } | null;
  returnReason?: string;
  setReturnReason?: (r: string) => void;
}
