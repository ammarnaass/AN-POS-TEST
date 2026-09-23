import type { CartItem, Product, Category } from '@/types';

export interface AdvancedTerminalFavoriteItem {
  id: string;
  name: string;
  price?: number;
  label: string;
  badge?: string;
  highlightColor?: 'crimson' | 'default';
  productId?: string;
}

export type TouchPadDirection = 'up' | 'down' | 'left' | 'right' | 'confirm';

export interface AdvancedTerminalPOSLayoutProps {
  cart: CartItem[];
  onAddToCart: (product: Product, customPrice?: number) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onEditPrice?: (productId: string, newPrice: number) => void;
  saleSummary: {
    subtotal: number;
    discountAmount: number;
    total: number;
    tvaAmount?: number;
  };
  products: Product[];
  allProducts?: Product[];
  categories: (Category | { id: string; name: string } | string)[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onSettleSale: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  suspendedCount: number;
  onSelectCustomer: () => void;
  onOpenAddCustomer?: () => void;
  selectedCustomerName: string;
  autoPrintReceipt: boolean;
  onToggleAutoPrint: () => void;
  onOpenDiscount: () => void;
  discount: number;
  discountType: 'percent' | 'amount';
  onOpenFreeProduct: () => void;
  onOpenReturns: () => void;
  returnMode: boolean;
  onOpenCustomize: () => void;
  wholesaleMode: boolean;
  toggleWholesaleMode: () => void;
  priceTier?: '1' | '2' | '3' | '4';
  onSelectPriceTier?: (tier: '1' | '2' | '3' | '4') => void;
  onSaveAsProforma?: () => void;
  onNewOrder?: () => void;
  onOpenSalesHistory?: () => void;
  onOpenNotifications?: () => void;
  notificationsCount?: number;
  invoiceNumber?: string | number;
  formatMoney: (amount?: number) => string;
  currency?: string;
  userName?: string;
  storeName?: string;
  isSessionOpen: boolean;
  isSalePending: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onNavigateBack: () => void;
  onOpenKeypad?: () => void;
  onOpenKeypadForQty?: (item: CartItem) => void;
  viewMode?: 'grid' | 'list';
  showProductImages?: boolean;
  onOpenAddProduct?: () => void;
  onOpenFavoritesManagement?: () => void;
  /** Global (POSPage-level) modal state — Esc closes those before navigating back */
  isAnyModalOpen?: boolean;
  onCloseAllModals?: () => void;
}
