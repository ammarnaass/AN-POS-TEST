import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Store,
  UserCheck,
  Receipt,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import type { CartItem, Product, Category } from '@/types';
import { getEnabledPriceTiers, matchPriceTierShortcut } from '@/services';
import type { POSSettings } from '@/features/pos/hooks/usePOSData';
import { ClassicPOSTopBar } from './classic/ClassicPOSTopBar';
import { ClassicPOSSearchBar } from './classic/ClassicPOSSearchBar';
import { ClassicPOSCartTable } from './classic/ClassicPOSCartTable';
import { ClassicPOSProductGrid } from './classic/ClassicPOSProductGrid';

interface ClassicPOSLayoutProps {
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onEditPrice?: (productId: string, newPrice: number) => void;
  priceTier?: '1' | '2' | '3' | '4';
  onSelectPriceTier?: (tier: '1' | '2' | '3' | '4') => void;
  wholesaleMode?: boolean;
  toggleWholesaleMode?: () => void;
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
  onOpenReturns: () => void;
  formatMoney: (amount?: number) => string;
  currency?: string;
  userName?: string;
  storeName?: string;
  isSessionOpen: boolean;
  isSalePending: boolean;
  onOpenKeypad?: () => void;
  onOpenKeypadForQty?: (item: CartItem) => void;
  onSaveAsProforma?: () => void;
  onSaveAsOrder?: () => void;
  onNavigateBack?: () => void;
  onOpenSalesHistory?: () => void;
  onOpenCustomize?: () => void;
  posSettings?: POSSettings;
  enabledPriceTiers?: Array<'1' | '2' | '3' | '4'>;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

const MAX_QUICK_PRODUCTS = 80;

export const ClassicPOSLayout: React.FC<ClassicPOSLayoutProps> = ({
  onNavigateBack,
  onOpenSalesHistory,
  onOpenCustomize,
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  onEditPrice,
  priceTier = '1',
  onSelectPriceTier,
  wholesaleMode: _wholesaleMode,
  toggleWholesaleMode: _toggleWholesaleMode,
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
  onOpenReturns,
  formatMoney,
  currency = 'دج',
  userName = 'مدير النظام',
  storeName = 'متجري الرئيسي',
  isSessionOpen,
  isSalePending,
  onOpenKeypad,
  onOpenKeypadForQty,
  onSaveAsProforma,
  onSaveAsOrder,
  posSettings,
  enabledPriceTiers: propEnabledPriceTiers,
  onToggleFullscreen,
  isFullscreen = false,
}) => {
  const enabledPriceTiers = useMemo(
    () => propEnabledPriceTiers || getEnabledPriceTiers(posSettings),
    [propEnabledPriceTiers, posSettings]
  );
  const [selectedCartRowId, setSelectedCartRowId] = useState<string | null>(null);
  const [showProductGrid, setShowProductGrid] = useState<boolean>(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Live Clock state for top bar
  const [currentTime, setCurrentTime] = useState<string>(() => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Date string (YYYY/MM/DD)
  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  }, []);

  // Keep barcode input focused for direct scanning
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [cart.length]);

  const handleDeleteSelectedOrLast = useCallback(() => {
    if (selectedCartRowId) {
      onRemoveFromCart(selectedCartRowId);
      setSelectedCartRowId(null);
    } else if (cart.length > 0) {
      onRemoveFromCart(cart[cart.length - 1].productId);
    }
  }, [selectedCartRowId, cart, onRemoveFromCart]);

  // Handle keyboard shortcuts (F1..F10, Esc, Ctrl+D, Delete, Alt+1..4, Alt+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default actions on POS function keys
      if (e.key === 'F1') {
        e.preventDefault();
        if (cart.length > 0 && !isSalePending) {
          onSettleSale();
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) {
          onSuspendSale();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        onOpenSuspended();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          onClearCart();
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        onToggleAutoPrint();
      } else if (e.key === 'F6') {
        e.preventDefault();
        onSelectCustomer();
      } else if (e.key === 'F7') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F8') {
        e.preventDefault();
        setShowProductGrid((prev) => !prev);
      } else if (e.key === 'F9') {
        e.preventDefault();
        onOpenSalesHistory?.();
      } else if (e.key === 'F10') {
        e.preventDefault();
        onOpenCustomize?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onNavigateBack?.();
      } else if ((e.ctrlKey && e.key.toLowerCase() === 'd') || e.key === 'Delete') {
        e.preventDefault();
        handleDeleteSelectedOrLast();
      } else if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onOpenSalesHistory?.();
      } else {
        const matchedTier = matchPriceTierShortcut(e);
        if (matchedTier && enabledPriceTiers.includes(matchedTier)) {
          e.preventDefault();
          onSelectPriceTier?.(matchedTier);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart.length,
    isSalePending,
    onSettleSale,
    onSuspendSale,
    onOpenSuspended,
    onClearCart,
    onToggleAutoPrint,
    onSelectCustomer,
    onOpenSalesHistory,
    onOpenCustomize,
    onNavigateBack,
    handleDeleteSelectedOrLast,
    onSelectPriceTier,
    enabledPriceTiers,
  ]);

  // Total items and quantity count
  const totalItemsCount = cart.length;
  const totalUnitsCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  // Fast O(1) barcode lookup map for cart rows
  const productBarcodeMap = useMemo(() => {
    const list = allProducts || products;
    const map = new Map<string, string>();
    for (const p of list) {
      if (p.id && p.barcode) map.set(p.id, p.barcode);
    }
    return map;
  }, [allProducts, products]);

  // Filtered quick products to display
  const displayedProducts = useMemo(() => {
    let list = products;
    if (selectedCategory && selectedCategory !== 'all') {
      list = list.filter((p) => {
        const catId = typeof p.category === 'object' && p.category !== null ? (p.category as any).id || (p.category as any).name : String(p.category);
        return catId === selectedCategory;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    return list.slice(0, MAX_QUICK_PRODUCTS);
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-950 select-none text-slate-800 dark:text-slate-100 font-sans antialiased">
      {/* BEGIN: TopBar (الترويسة العلوية الداكنة للنظام) */}
      <header className="bg-slate-900 text-white px-3 py-1 flex items-center justify-between border-b border-slate-800 shrink-0 text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="font-bold tracking-wider text-emerald-400 font-mono">AN POS v2.6</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <span>{storeName}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>{userName}</span>
          </span>
        </div>

        {/* Center App Title */}
        <div className="font-bold text-slate-200 tracking-wide flex items-center gap-1.5">
          <Receipt className="w-4 h-4 text-blue-400" />
          <span>نظام إدارة نقاط البيع والمخزون</span>
        </div>

        {/* System Indicators & Actions */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-blue-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700" id="current-clock">
            {currentTime}
          </span>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              title={isFullscreen ? 'تصغير الشاشة' : 'تكبير الشاشة الكاملة'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onNavigateBack && (
            <button
              type="button"
              onClick={onNavigateBack}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-600 hover:text-white text-slate-300 transition cursor-pointer"
              title="إغلاق / خروج (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>
      {/* END: TopBar */}

      {/* BEGIN: MainDisplayDashboard & ActionRibbon */}
      <ClassicPOSTopBar
        onNavigateBack={onNavigateBack}
        onOpenCustomize={onOpenCustomize}
        onSettleSale={onSettleSale}
        isSalePending={isSalePending}
        cartLength={cart.length}
        onClearCart={onClearCart}
        onDeleteSelectedOrLast={handleDeleteSelectedOrLast}
        onSuspendSale={onSuspendSale}
        onOpenSuspended={onOpenSuspended}
        suspendedCount={suspendedCount}
        onSelectCustomer={onSelectCustomer}
        selectedCustomerName={selectedCustomerName}
        onOpenDiscount={onOpenDiscount}
        discountAmount={saleSummary.discountAmount}
        autoPrintReceipt={autoPrintReceipt}
        onToggleAutoPrint={onToggleAutoPrint}
        onOpenReturns={onOpenReturns}
        onOpenSalesHistory={onOpenSalesHistory}
        totalAmount={saleSummary.total}
        totalItemsCount={totalItemsCount}
        totalUnitsCount={totalUnitsCount}
        currency={currency}
        formatMoney={formatMoney}
        onOpenKeypad={onOpenKeypad}
        onSaveAsProforma={onSaveAsProforma}
        onSaveAsOrder={onSaveAsOrder}
        priceTier={priceTier}
        onSelectPriceTier={onSelectPriceTier}
        enabledPriceTiers={enabledPriceTiers}
      />
      {/* END: MainDisplayDashboard & ActionRibbon */}

      {/* BEGIN: InstantInputBar (شريط مسح الباركود السريع والبحث) */}
      <ClassicPOSSearchBar
        barcodeInputRef={barcodeInputRef}
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        onBarcodeSubmit={onBarcodeSubmit}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showProductGrid={showProductGrid}
        onToggleProductGrid={() => setShowProductGrid((prev) => !prev)}
      />
      {/* END: InstantInputBar */}

      {/* BEGIN: SplitWorkspace (مساحة العمل والجدول) */}
      <main className="flex-1 flex overflow-hidden min-h-0 bg-white dark:bg-slate-900">
        {/* RIGHT SIDE: Cart Table and Calculations Summary */}
        <section className="flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex-1 min-w-0">
          <ClassicPOSCartTable
            cart={cart}
            selectedCartRowId={selectedCartRowId}
            onSelectCartRow={setSelectedCartRowId}
            onUpdateQty={onUpdateQty}
            onRemoveFromCart={onRemoveFromCart}
            onOpenKeypadForQty={onOpenKeypadForQty}
            productBarcodeMap={productBarcodeMap}
            formatMoney={formatMoney}
            totalItemsCount={totalItemsCount}
            totalUnitsCount={totalUnitsCount}
            selectedCustomerName={selectedCustomerName}
            subtotal={saleSummary.subtotal}
            discountAmount={saleSummary.discountAmount}
            totalAmount={saleSummary.total}
            products={products}
            allProducts={allProducts}
            onEditPrice={onEditPrice}
            enabledPriceTiers={enabledPriceTiers}
            currency={currency}
          />
        </section>

        {/* LEFT/SIDE: Quick Products Grid (shown when F8 is active) */}
        {showProductGrid && (
          <aside className="w-80 sm:w-96 lg:w-[420px] shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            <ClassicPOSProductGrid
              displayedProducts={displayedProducts}
              onAddToCart={onAddToCart}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
              formatMoney={formatMoney}
              currency={currency}
              userName={userName}
              storeName={storeName}
              isSessionOpen={isSessionOpen}
              priceTier={priceTier}
            />
          </aside>
        )}
      </main>
      {/* END: SplitWorkspace */}

      {/* BEGIN: BottomStatusBar (شريط الحالة السفلي للنظام) */}
      <footer className="bg-slate-900 text-slate-400 px-3 py-1 text-[11px] flex items-center justify-between border-t border-slate-800 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {isSessionOpen ? 'الجلسة مفتوحة' : 'الجلسة مغلقة'}
          </span>
          <span className="text-slate-600">|</span>
          <span>
            المستخدم: <strong className="text-slate-200">{userName}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            المحل: <strong className="text-slate-200">{storeName}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            الصندوق: <strong className="text-slate-200">صندوق 01 (رئيسي)</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            تاريخ اليوم: <strong className="text-slate-300" id="live-date">{currentDateFormatted}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-500">IP: 192.168.1.105</span>
          <span className="bg-blue-900/60 text-blue-300 text-[10px] px-1.5 py-0.5 rounded border border-blue-700/50">
            جاهز للبيع
          </span>
        </div>
      </footer>
      {/* END: BottomStatusBar */}
    </div>
  );
};

export default ClassicPOSLayout;
