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
  History,
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

export interface SidebarPOSLayoutProps {
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

export const SidebarPOSLayout: React.FC<SidebarPOSLayoutProps> = ({
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
  onOpenSalesHistory,
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
      {/* 1. Giant Total Header */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-900 text-white px-4 sm:px-6 py-2.5 shadow-md flex items-center justify-between z-30 shrink-0 border-b border-blue-400/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/15 shadow-inner">
            <span className="w-8 h-8 rounded-lg bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-base tracking-wider shadow-sm">
              AN
            </span>
            <div>
              <h1 className="font-black text-sm tracking-wide leading-none">{storeName}</h1>
              <span className="text-[10px] text-blue-200 font-medium leading-none">نظام الكاشير الذكي v2.4</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs bg-black/20 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className="text-blue-300">رقم الفاتورة:</span>
              <span className="font-bold text-white bg-blue-500/40 px-2 py-0.5 rounded text-xs font-mono">
                #{String(invoiceNumber).startsWith('INV-') ? invoiceNumber : `INV-${String(invoiceNumber).padStart(5, '0')}`}
              </span>
            </div>
            <span className="text-white/30">|</span>
            <button
              type="button"
              onClick={onSelectCustomer}
              className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
            >
              <span className="text-blue-300">العميل:</span>
              <span className="font-semibold text-emerald-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {selectedCustomerName || 'زبون عام (افتراضي)'}
              </span>
            </button>
            <span className="text-white/30">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-300">الأصناف:</span>
              <span className="font-bold text-amber-300">{cart.length} مواد ({totalUnitsCount} قطعة)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right flex items-baseline gap-2 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-1 rounded-2xl border border-white/20 shadow-inner">
            <span className="text-xs text-blue-200 font-semibold hidden sm:inline">المبلغ الإجمالي:</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono" id="grand-total">
              {formatMoney(saleSummary.total)}
            </span>
            <span className="text-xs font-bold text-white/90">{currency}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* زر الإشعارات والتنبيهات التشغيلية */}
            <NotificationDropdown hideBadge>
              <button
                type="button"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white cursor-pointer relative"
                title="الإشعارات والتنبيهات التشغيلية"
              >
                <Bell className="w-4 h-4 text-amber-300" />
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
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white cursor-pointer"
              title="تبديل الوضع"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white cursor-pointer"
              title="ملء الشاشة"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onOpenCustomize}
              className="bg-purple-500/80 hover:bg-purple-600 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition text-white shadow-sm mr-1 cursor-pointer"
              title="تخصيص الواجهة (Alt+C)"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">تخصيص</span>
            </button>
            {onOpenSalesHistory && (
              <button
                type="button"
                onClick={onOpenSalesHistory}
                title="سجل المبيعات (Alt+S)"
                className="bg-blue-500/80 hover:bg-blue-600 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition text-white shadow-sm mr-1 cursor-pointer"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">سجل المبيعات</span>
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateBack}
              title="الخروج إلى لوحة التحكم الرئيسية (Esc)"
              className="bg-rose-500/80 hover:bg-rose-600 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition text-white shadow-sm mr-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Grid */}
      <main className="flex-1 flex overflow-hidden p-2.5 sm:p-3 gap-2.5 sm:gap-3">
        {/* Left: Cart & Totals Section */}
        <div className="w-full lg:w-[410px] xl:w-[440px] flex flex-col shrink-0 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
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

        {/* Right: Products Search & Catalog Grid */}
        <div className="flex-1 flex flex-col gap-2.5 min-w-0 overflow-hidden">
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

      {/* 3. Shortcuts Footer Bar */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-1.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F1</kbd>
            دفع
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F2</kbd>
            تعليق
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F5</kbd>
            طباعة
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F7</kbd>
            بحث
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            الجهاز متصل
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-[11px]">
            المستخدم: <strong className="text-slate-800 dark:text-slate-100">{userName}</strong>
          </span>
        </div>
      </footer>
    </div>
  );
};

export default SidebarPOSLayout;
