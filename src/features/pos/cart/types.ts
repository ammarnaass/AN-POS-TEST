import type { CartItem, Product, Promotion, POSLayout } from '@/types';
import type { POSSettings } from '../hooks/usePOSData';

export type { CartItem };

export interface CartSummary {
  itemsCount: number;
  unitsCount: number;
  subtotal: number;
  discountAmount: number;
  tvaAmount: number;
  total: number;
}

export interface UsePOSCartActionsParams {
  products: Product[];
  packs: any[];
  promotions: Promotion[];
  isWholesaleActive: boolean;
  priceTier: '1' | '2' | '3' | '4';
  posSettings: POSSettings;
  posLayout: POSLayout;
  addNotification: (notification: any) => void;
  quickMode?: boolean;
  scanInputRef?: React.RefObject<HTMLInputElement | null>;
  setSearchQuery?: (q: string) => void;
}

export interface POSCartContainerProps {
  cart: CartItem[];
  allProducts?: Product[];
  products?: Product[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onEditPrice?: (productId: string, newPrice: number) => void;
  onSelectCustomer?: () => void;
  selectedCustomerName?: string;
  customer?: any;
  onOpenCustomerInvoices?: () => void;
  onOpenSettlementModal?: () => void;
  onOpenAddDebtModal?: () => void;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  onOpenKeypadForQty?: (item: CartItem) => void;
  variant?: 'sidebar' | 'modern' | 'table';
  className?: string;
}

export interface POSCartItemRowProps {
  item: CartItem;
  index: number;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onEditPrice?: (productId: string, newPrice: number) => void;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  onOpenKeypadForQty?: (item: CartItem) => void;
}

export interface POSCartTableProps {
  cart: CartItem[];
  selectedCartRowId: string | null;
  onSelectCartRow: (id: string) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onOpenKeypadForQty?: (item: CartItem) => void;
  productBarcodeMap?: Map<string, string>;
  formatMoney: (amount?: number) => string;
  totalItemsCount?: number;
  totalUnitsCount?: number;
  selectedCustomerName?: string;
  onEditPrice?: (productId: string, newPrice: number) => void;
  currency?: string;
}

export interface POSCartHeaderProps {
  itemsCount: number;
  unitsCount: number;
  selectedCustomerName?: string;
  customer?: any;
  onSelectCustomer?: () => void;
  onOpenCustomerInvoices?: () => void;
  onOpenSettlementModal?: () => void;
  onOpenAddDebtModal?: () => void;
  formatMoney?: (amount?: number | null) => string;
  currencySymbol?: string;
}

export interface POSCartEmptyStateProps {
  onScanPrompt?: string;
}
