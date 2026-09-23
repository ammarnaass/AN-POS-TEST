import type { Sale, CartItem, Customer, Product, CashSession } from '@/types';

export type PredefinedReturnReason =
  | 'طلب الزبون (تراجع عن الشراء)'
  | 'عيب مصنعي أو كسر'
  | 'منتج غير مطابق أو صنف خاطئ'
  | 'انتهاء أو قرب الصلاحية'
  | 'أخرى';

export const DEFAULT_RETURN_REASONS: PredefinedReturnReason[] = [
  'طلب الزبون (تراجع عن الشراء)',
  'عيب مصنعي أو كسر',
  'منتج غير مطابق أو صنف خاطئ',
  'انتهاء أو قرب الصلاحية',
  'أخرى',
];

export type RefundMethod = 'cash' | 'customer_credit';

export interface ReturnItemSelection {
  productId: string;
  name: string;
  unitPrice: number;
  originalQty: number;
  alreadyReturnedQty: number;
  maxReturnableQty: number;
  selectedQty: number;
  isSelected: boolean;
  unit?: string;
  barcode?: string;
  isPack?: boolean;
  packId?: string;
  packQty?: number;
  packUnit?: string;
}

export interface ReturnFinancialSummary {
  totalAmount: number;
  totalPieces: number;
  selectedItemsCount: number;
}

export interface ReturnConfirmationParams {
  returnItems: CartItem[];
  originalSale: Sale;
  reason: string;
  refundMethod: RefundMethod;
}

export interface UsePOSReturnFlowProps {
  isSessionOpen: boolean;
  completeSale: (params: any) => Promise<any>;
  currentSession: CashSession | null;
  settingsOrDefault: any;
  products: Product[];
  packs: any[];
  customers: Customer[];
  clearCart: () => void;
  addItem: (item: CartItem) => void;
  setReturnMode: (val: boolean) => void;
  setReturnContext?: (ctx: any) => void;
  setSelectedCustomer: (id: string) => void;
  modals: {
    setSelectedSaleForReturn?: (sale: Sale | null) => void;
    setShowReturnSaleModal?: (show: boolean) => void;
    setShowPartialReturnModal?: (show: boolean) => void;
    setShowSessionWarning?: (show: boolean) => void;
    [key: string]: any;
  };
  addNotification: (n: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    category?: string;
  }) => void;
}

export interface POSReturnSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales?: Sale[];
  onSelectReturnSale: (sale: Sale) => void;
  onQuickFullReturn?: (sale: Sale) => void;
  onLoadToCart?: (sale: Sale) => void;
}

export interface POSPartialReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onConfirmReturn: (params: ReturnConfirmationParams) => void;
  onLoadToCart?: (params: ReturnConfirmationParams) => void;
}

export interface POSReturnsModalsProps {
  showReturnSaleModal: boolean;
  showPartialReturnModal: boolean;
  selectedSaleForReturn: Sale | null;
  sales?: Sale[];
  onCloseReturnSale: () => void;
  onClosePartialReturn: () => void;
  onSelectReturnSale: (sale: Sale) => void;
  onConfirmPartialReturn: (params: ReturnConfirmationParams) => void;
  onLoadReturnToCart?: (params: ReturnConfirmationParams) => void;
}

/**
 * فلاتر النطاق الزمني للبحث في المرتجعات
 */
export type ReturnDateRangeFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

/**
 * حالة أهلية الإرجاع للفاتورة
 */
export type ReturnEligibilityStatus = 'all' | 'refundable' | 'partially_returned' | 'fully_returned';

/**
 * وضع البحث في المرتجعات (رقم الفاتورة والزبون، أو الصنف والباركود)
 */
export type ReturnSearchMode = 'all' | 'invoice' | 'product';

/**
 * معايير البحث والفلترة المتقدمة لفواتير المرتجع
 */
export interface ReturnSearchFilters {
  query: string;
  searchMode?: ReturnSearchMode;
  dateRange?: ReturnDateRangeFilter;
  customStartDate?: string;
  customEndDate?: string;
  eligibilityStatus?: ReturnEligibilityStatus;
  paymentMethod?: 'all' | 'cash' | 'credit';
  customerId?: string;
}

/**
 * نتيجة البحث المحسوبة والمزودة بمعلومات المرتجعات السابقة وأهلية الإرجاع
 */
export interface ReturnSearchResultItem {
  sale: Sale;
  alreadyReturnedCount: number;
  totalPieces: number;
  remainingReturnablePieces: number;
  isFullyReturned: boolean;
  hasPriorReturns: boolean;
  matchedItemNames?: string[];
  priorReturns?: Sale[];
}

/**
 * أشكال عرض زر الإرجاع المتوافقة مع تخطيطات نقطة البيع المختلفة
 */
export type POSReturnButtonVariant =
  | 'topbar'
  | 'terminal'
  | 'ribbon'
  | 'actionbar'
  | 'compact'
  | 'banner';

export interface POSReturnButtonProps {
  variant?: POSReturnButtonVariant;
  onOpenReturns?: () => void;
  className?: string;
  showShortcut?: boolean;
  showItemCount?: boolean;
}

