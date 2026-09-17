import React, { useState, useRef, useMemo } from 'react';
import {
  Bell,
  Sun,
  Moon,
  Maximize,
  Minimize,
  Sliders,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { useNotificationStore } from '@/store/notificationStore';
import type { CartItem, Product, Category } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { usePOSLayoutShortcuts } from '../hooks/usePOSLayoutShortcuts';
import { POSCartContainer } from './common/POSCartContainer';
import { POSSearchBarcodeHeader } from './common/POSSearchBarcodeHeader';
import { POSTotalsBar } from './common/POSTotalsBar';
import { POSProductsCatalog } from './common/POSProductsCatalog';

export interface ModernPOSLayoutProps {
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onEditPrice?: (productId: string, newPrice: number) => void;
  saleSummary: {
    subtotal: number;
    discountAmount: number;
    total: number;
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
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  userName?: string;
  storeName?: string;
  isSessionOpen: boolean;
  isSalePending: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onNavigateBack: () => void;
  onOpenKeypadForQty?: (item: CartItem) => void;
  viewMode?: 'grid' | 'list';
  showProductImages?: boolean;
}

const ITEMS_PER_PAGE = 20;

export const ModernPOSLayout: React.FC<ModernPOSLayoutProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  onEditPrice,
  saleSummary,
  products,
  allProducts,
  categories,
  selectedCategory,
  onSelectCategory,
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  searchQuery,
  setSearchQuery,
  onSettleSale,
  onSuspendSale,
  onOpenSuspended,
  suspendedCount,
  onSelectCustomer,
  selectedCustomerName,
  autoPrintReceipt,
  onToggleAutoPrint,
  onOpenDiscount,
  discount,
  discountType,
  onOpenFreeProduct,
  onOpenReturns,
  returnMode,
  onOpenCustomize,
  priceTier: propPriceTier,
  onSelectPriceTier,
  invoiceNumber = '00128',
  formatMoney,
  currency = 'دج',
  userName = 'الكاشير',
  storeName = 'AN POS',
  isSessionOpen,
  isSalePending,
  onToggleFullscreen,
  isFullscreen,
  onNavigateBack,
  onOpenKeypadForQty,
  viewMode = 'grid',
  showProductImages = true,
}) => {
  const { theme, toggleTheme } = useThemeStore();
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [internalPriceTier, setInternalPriceTier] = useState<'1' | '2' | '3' | '4'>('1');
  const priceTier = propPriceTier ?? internalPriceTier;

  const handleSelectPriceTier = (tier: '1' | '2' | '3' | '4') => {
    if (onSelectPriceTier) {
      onSelectPriceTier(tier);
    } else {
      setInternalPriceTier(tier);
    }
  };

  // Shared Shortcuts
  usePOSLayoutShortcuts({
    barcodeInputRef,
    cartLength: cart.length,
    onSettleSale,
    onSuspendSale,
    onOpenSuspended,
    onClearCart,
    onToggleAutoPrint,
    onOpenFreeProduct,
    onOpenReturns,
    onSelectPriceTier: handleSelectPriceTier,
  });

  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const displayedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return products.slice(start, start + ITEMS_PER_PAGE);
  }, [products, currentPage]);

  const totalUnitsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  return (
    <div className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 h-full w-full flex-1 overflow-hidden flex flex-col antialiased font-cairo select-none" dir="rtl">
      {/* 1. Modern Top Cockpit Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 py-2.5 shadow-xs flex items-center justify-between z-30 shrink-0 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm text-slate-900 dark:text-white leading-none">{storeName}</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
                  واجهة حديثة
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium leading-none">
                المناوبة نشطة • {userName}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-slate-400">الفاتورة:</span>
            <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
              #{String(invoiceNumber).startsWith('INV-') ? invoiceNumber : `INV-${String(invoiceNumber).padStart(5, '0')}`}
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-slate-400">الأصناف:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {cart.length} مواد ({totalUnitsCount} قطعة)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right flex items-baseline gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 sm:px-4 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">المطلوب:</span>
            <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono" id="grand-total">
              {formatMoney(saleSummary.total)}
            </span>
            <span className="text-xs font-bold text-slate-500">{currency}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* زر الإشعارات والتنبيهات التشغيلية */}
            <NotificationDropdown hideBadge>
              <button
                type="button"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300 cursor-pointer relative"
                title="الإشعارات والتنبيهات التشغيلية"
              >
                <Bell className="w-4 h-4 text-amber-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-rose-600 text-white text-[9px] font-black rounded-full px-1 shadow-xs animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </NotificationDropdown>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300 cursor-pointer"
              title="تبديل الوضع"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300 cursor-pointer"
              title="ملء الشاشة"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onOpenCustomize}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300 cursor-pointer"
              title="تخصيص الواجهة"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNavigateBack}
              className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Grid */}
      <main className="flex-1 flex overflow-hidden p-2.5 sm:p-3.5 gap-3">
        {/* Left/Sidebar: Cart & Totals */}
        <div className="w-full lg:w-[410px] xl:w-[450px] flex flex-col shrink-0 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <POSCartContainer
            cart={cart}
            allProducts={allProducts}
            products={products}
            onUpdateQty={onUpdateQty}
            onRemoveFromCart={onRemoveFromCart}
            onEditPrice={onEditPrice}
            onSelectCustomer={onSelectCustomer}
            selectedCustomerName={selectedCustomerName}
            formatMoney={formatMoney}
            currency={currency}
            onOpenKeypadForQty={onOpenKeypadForQty}
            variant="modern"
            className="flex-1 min-h-0 border-none shadow-none rounded-none"
          />

          <POSTotalsBar
            cartLength={cart.length}
            saleSummary={saleSummary}
            currency={currency}
            formatMoney={formatMoney}
            discount={discount}
            discountType={discountType}
            onOpenDiscount={onOpenDiscount}
            onSettleSale={onSettleSale}
            onSuspendSale={onSuspendSale}
            onOpenSuspended={onOpenSuspended}
            suspendedCount={suspendedCount}
            onClearCart={onClearCart}
            autoPrintReceipt={autoPrintReceipt}
            onToggleAutoPrint={onToggleAutoPrint}
            isSessionOpen={isSessionOpen}
            isSalePending={isSalePending}
            layoutVariant="sidebar"
          />
        </div>

        {/* Center: Search, Categories & Products Catalog */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          <POSSearchBarcodeHeader
            barcodeInputRef={barcodeInputRef}
            barcodeInput={barcodeInput}
            setBarcodeInput={setBarcodeInput}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onBarcodeSubmit={onBarcodeSubmit}
            onOpenFreeProduct={onOpenFreeProduct}
            onOpenReturns={onOpenReturns}
            returnMode={returnMode}
            priceTier={priceTier}
            onSelectPriceTier={handleSelectPriceTier}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => {
              onSelectCategory(catId);
              setCurrentPage(1);
            }}
            totalProductsCount={products.length}
          />

          <POSProductsCatalog
            displayedProducts={displayedProducts}
            allProductsCount={products.length}
            onAddToCart={onAddToCart}
            priceTier={priceTier}
            showProductImages={showProductImages}
            viewMode={viewMode}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            formatMoney={formatMoney}
            currency={currency}
          />
        </div>
      </main>
    </div>
  );
};

export default ModernPOSLayout;
