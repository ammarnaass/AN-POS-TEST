import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  ChevronDown,
  Palette,
  Maximize,
  Minimize,
  Home,
  CheckCircle2,
  XCircle,
  FilePlus2,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import type { Product } from '@/types';
import type { AdvancedTerminalPOSLayoutProps } from './types';
import { useThemeStore } from '@/store/themeStore';
import { Design6TopActionsBar } from './components/Design6TopActionsBar';
import { Design6LiveDisplayBanner } from './components/Design6LiveDisplayBanner';
import { Design6LeftToolsSidebar } from './components/Design6LeftToolsSidebar';
import { Design6BarcodeScannerBar } from './components/Design6BarcodeScannerBar';
import { Design6SalesDataTable } from './components/Design6SalesDataTable';
import { Design6FinancialStack } from './components/Design6FinancialStack';
import { Design6FavoritesPad } from './components/Design6FavoritesPad';
import { Design6SystemStatusBar } from './components/Design6SystemStatusBar';
import { Design6FlexyModal } from './modals/Design6FlexyModal';
import { Design6TerminalLockModal } from './modals/Design6TerminalLockModal';
import { Design6ProductSearchModal } from './modals/Design6ProductSearchModal';
import { useDesign6Shortcuts } from './hooks/useDesign6Shortcuts';
import { useDesign6TouchNavigation } from './hooks/useDesign6TouchNavigation';
import { useDesign6CashCalculator } from './hooks/useDesign6CashCalculator';
import { useFavoritesStore } from '@/features/favorites/store/useFavoritesStore';
import { usePOSSessionStore } from '@/features/pos/store/usePOSSessionStore';

export const AdvancedTerminalPOSLayout: React.FC<AdvancedTerminalPOSLayoutProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  onEditPrice,
  saleSummary,
  products = [],
  allProducts = [],
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  onSettleSale,
  onSuspendSale,
  onOpenSuspended,
  suspendedCount,
  onSelectCustomer,
  selectedCustomerName,
  onOpenDiscount,
  onOpenFreeProduct,
  onOpenReturns,
  onOpenCustomize,
  priceTier = '1',
  onSelectPriceTier,
  onNewOrder,
  invoiceNumber = 1,
  formatMoney,
  currency = 'دج',
  userName = 'المسؤول',
  isSessionOpen,
  onNavigateBack,
  onOpenKeypad,
  onOpenKeypadForQty,
  onToggleFullscreen,
  isFullscreen = false,
  categories = [],
  searchQuery,
  setSearchQuery,
  onOpenAddProduct,
}) => {
  // Local state
  const [selectedCartRowId, setSelectedCartRowId] = useState<string | null>(
    cart.length > 0 ? cart[0].productId : null
  );
  const [pendingQty, setPendingQty] = useState<number>(1);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isFlexyOpen, setIsFlexyOpen] = useState<boolean>(false);
  const [isTopBarCollapsed, setIsTopBarCollapsed] = useState<boolean>(false);
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState<boolean>(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Cash calculation hook
  const {
    paidAmount,
    changeAmount,
    setDenomination,
  } = useDesign6CashCalculator({ totalAmount: saleSummary.total });

  // Touch navigation hook
  const {
    handleArrowUp,
    handleArrowDown,
    handleArrowLeft,
    handleArrowRight,
    handleConfirm,
  } = useDesign6TouchNavigation({
    cart,
    selectedCartRowId,
    setSelectedCartRowId,
    onUpdateQty,
    onSettleSale,
  });

  // Cycle price tier
  const handleCyclePriceTier = useCallback(() => {
    if (!onSelectPriceTier) return;
    const tiers: Array<'1' | '2' | '3' | '4'> = ['1', '2', '3', '4'];
    const nextIdx = (tiers.indexOf(priceTier) + 1) % tiers.length;
    onSelectPriceTier(tiers[nextIdx]);
  }, [priceTier, onSelectPriceTier]);

  // Quick cash settle (F7)
  const handleQuickSettle = useCallback(() => {
    if (cart.length === 0) return;
    onSettleSale();
  }, [cart.length, onSettleSale]);

  // Handle focus shortcuts
  const handleFocusQuantity = useCallback(() => {
    quantityInputRef.current?.focus();
    quantityInputRef.current?.select();
  }, []);

  const handleFocusPrice = useCallback(() => {
    if (cart.length === 0) return;
    const targetId = selectedCartRowId || cart[cart.length - 1]?.productId;
    if (targetId) {
      setSelectedCartRowId(targetId);
      setEditingPriceItemId(targetId);
    }
  }, [selectedCartRowId, cart]);

  const handleDeleteSelectedRow = useCallback(() => {
    if (selectedCartRowId) {
      onRemoveFromCart(selectedCartRowId);
    }
  }, [selectedCartRowId, onRemoveFromCart]);

  const isAnyModalOpen = isProductSearchOpen || isLocked || isFlexyOpen || editingPriceItemId !== null;

  const handleCloseModals = useCallback(() => {
    setIsProductSearchOpen(false);
    setEditingPriceItemId(null);
    setIsFlexyOpen(false);
    setIsLocked(false);
  }, []);

  // Register all F1-F12 and arrow shortcuts
  useDesign6Shortcuts({
    onNewOrder,
    onOpenReturns,
    onFocusQuantity: handleFocusQuantity,
    onFocusPrice: handleFocusPrice,
    onSettleSale,
    onQuickSettle: handleQuickSettle,
    onSuspendSale,
    onOpenSuspended,
    suspendedCount,
    onClearCart,
    onOpenDiscount,
    onOpenMiscProduct: onOpenFreeProduct,
    onOpenProductCatalog: () => setIsProductSearchOpen(true),
    onLockTerminal: () => setIsLocked(true),
    onToggleFullscreen,
    onNavigateBack,
    onDeleteSelectedRow: handleDeleteSelectedRow,
    onArrowUp: handleArrowUp,
    onArrowDown: handleArrowDown,
    onArrowLeft: handleArrowLeft,
    onArrowRight: handleArrowRight,
    onConfirm: handleConfirm,
    isAnyModalOpen,
    onCloseModals: handleCloseModals,
    onSelectPriceTier,
  });

  // Favorites & Category Mode Integration (from useFavoritesStore and usePOSSessionStore)
  const { categories: favoriteCategories, items: favoriteItems, purgeProductItems } = useFavoritesStore();
  const { terminalCategoryMode, setTerminalCategoryMode } = usePOSSessionStore();
  const [selectedFavoriteCatId, setSelectedFavoriteCatId] = useState<string>('ALL');

  useEffect(() => {
    purgeProductItems();
  }, [purgeProductItems]);

  // Extract packs saved by user in Favorites
  const packOnlyFavorites = useMemo(() => {
    return favoriteItems.filter((it) => it.type === 'pack');
  }, [favoriteItems]);

  // System packs detected in the product catalog
  const systemPacks = useMemo(() => {
    const list = (allProducts && allProducts.length > 0 ? allProducts : products) || [];
    return list.filter((p: any) => Boolean(p.isPack) || 'items' in p);
  }, [allProducts, products]);

  const fallbackFavoriteItems = useMemo(() => {
    return systemPacks.map((p: any) => ({
      id: `sys-pack-${p.id}`,
      categoryId: 'fav-cat-wholesale',
      type: 'pack' as const,
      itemId: String(p.id).replace('pack-', ''),
      name: p.name,
      barcode: p.barcode,
      price: Number(p.retailPrice ?? p.price ?? p.packPrice ?? 0),
      packQty: Number(p.packPiecesCount ?? p.piecesCount ?? 1),
      packUnit: p.unitName || 'عبوة',
      order: 0,
    }));
  }, [systemPacks]);

  const activeFavoritesList = useMemo(() => {
    return packOnlyFavorites.length > 0 ? packOnlyFavorites : fallbackFavoriteItems;
  }, [packOnlyFavorites, fallbackFavoriteItems]);

  const displayedFavoriteItems = useMemo(() => {
    if (selectedFavoriteCatId === 'ALL') {
      return activeFavoritesList;
    }
    const catExists = favoriteCategories.some((c) => c.id === selectedFavoriteCatId);
    if (!catExists) return activeFavoritesList;
    return activeFavoritesList.filter((it) => it.categoryId === selectedFavoriteCatId);
  }, [activeFavoritesList, favoriteCategories, selectedFavoriteCatId]);

  // Retail products for the "منتجات التجزئة" tab
  const retailQuickProducts = useMemo(() => {
    const list = (allProducts && allProducts.length > 0 ? allProducts : products) || [];
    const retailItems = list.filter((p: any) => !p.isPack && !('items' in p) && p.status !== 'inactive');
    return retailItems.length > 0 ? retailItems : list;
  }, [allProducts, products]);

  // Add favorite item / retail product to cart
  const handleSelectFavorite = useCallback(
    (favItem: any) => {
      // 1. If pack or favorite pack
      if (favItem.type === 'pack' || favItem.isPack || favItem.packQty) {
        onAddToCart(
          {
            id: `pack-${favItem.itemId || favItem.id}`,
            name: favItem.name,
            barcode: favItem.barcode,
            retailPrice: favItem.price,
            price: favItem.price,
            isPack: true,
            packId: favItem.itemId,
            packPiecesCount: favItem.packQty || 1,
            packUnit: favItem.packUnit || 'عبوة',
          } as any,
          favItem.price
        );
        return;
      }

      // 2. If regular retail product
      const targetId = favItem.productId || favItem.id;
      const matched =
        allProducts.find((p) => p.id === targetId || p.name.trim() === favItem.name?.trim()) ||
        products.find((p) => p.id === targetId || p.name.trim() === favItem.name?.trim());

      if (matched) {
        onAddToCart(
          { ...matched, barcode: matched.barcode || favItem.barcode || '' },
          favItem.price || matched.retailPrice
        );
      } else {
        const tempProduct: Product = {
          id: favItem.id || `adhoc-${Date.now()}`,
          name: favItem.name,
          barcode: favItem.barcode || '',
          sku: favItem.id || 'FAV',
          unit: favItem.unit || 'قطعة',
          costPrice: (favItem.price || 0) * 0.7,
          retailPrice: favItem.price || 0,
          wholesalePrice: favItem.price || 0,
          wholesaleMinQty: 1,
          quantity: 999,
          lowStockThreshold: 1,
          category: 'المفضلة',
          status: 'active',
        };
        onAddToCart(tempProduct, favItem.price);
      }
    },
    [allProducts, products, onAddToCart]
  );

  // Handle barcode submit with pending quantity
  const handleEnhancedBarcodeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!barcodeInput.trim()) return;

    onBarcodeSubmit(e);
    // Reset pending quantity after submission
    setPendingQty(1);
    barcodeInputRef.current?.focus();
  };

  // Drawer toggle
  const handleToggleDrawer = () => {
    try {
      window.dispatchEvent(new CustomEvent('pos:kick_drawer'));
    } catch {
      // fallback
    }
  };

  // Reprint last receipt
  const handleReprintReceipt = () => {
    try {
      window.dispatchEvent(new CustomEvent('pos:reprint_receipt'));
    } catch {
      // fallback
    }
  };

  // Theme store integration
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div
      dir="rtl"
      className="flex flex-col h-full w-full flex-1 bg-slate-100 dark:bg-[#050811] text-slate-900 dark:text-slate-100 font-sans select-none overflow-hidden transition-colors"
    >
      {/* 1. Top F1-F12 Actions Bar or Collapsed Header */}
      {!isTopBarCollapsed ? (
        <Design6TopActionsBar
          onNewOrder={onNewOrder}
          onOpenReturns={onOpenReturns}
          onSettleSale={onSettleSale}
          onQuickSettle={handleQuickSettle}
          onClearCart={onClearCart}
          onOpenDiscount={onOpenDiscount}
          isSessionOpen={isSessionOpen}
          onToggleDrawer={handleToggleDrawer}
          onSuspendSale={onSuspendSale}
          onOpenSuspended={onOpenSuspended}
          suspendedCount={suspendedCount}
          onLockTerminal={() => setIsLocked(true)}
          priceTier={priceTier}
          onCyclePriceTier={handleCyclePriceTier}
          onOpenFlexyModal={() => setIsFlexyOpen(true)}
          stationName="S19C150-POS"
          isOnline={true}
          onNavigateBack={onNavigateBack}
          onToggleFullscreen={onToggleFullscreen}
          isFullscreen={isFullscreen}
          onOpenCustomize={onOpenCustomize}
          onToggleCollapse={() => setIsTopBarCollapsed(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <div className="w-full bg-white dark:bg-[#070b14] border-b border-slate-200 dark:border-slate-800/80 px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs select-none shrink-0 transition-colors">
          {/* Right: Toggle + Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsTopBarCollapsed(false)}
              className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-800/70 active:scale-95 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              title="إظهار شريط الأوامر الكامل (F1-F12)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>إظهار الشريط</span>
            </button>

            {/* Primary action always visible: تأكيد ودفع */}
            <button
              type="button"
              onClick={onSettleSale}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white h-[34px] px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-emerald-500/50"
              title="تأكيد ودفع (F1)"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>دفع (F1)</span>
            </button>
          </div>

          {/* Center: Live Invoice Summary — unique info not in full bar */}
          <div className="flex-1 flex items-center gap-3 px-4 overflow-hidden">
            <div className="flex items-baseline gap-1.5 font-mono shrink-0">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">الإجمالي:</span>
              <span className="text-lg font-black text-cyan-700 dark:text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                {formatMoney(saleSummary.total)}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold">{currency}</span>
            </div>
            {saleSummary.discountAmount > 0 && (
              <div className="flex items-baseline gap-1 font-mono shrink-0">
                <span className="text-slate-400 dark:text-slate-500 text-[10px]">خصم:</span>
                <span className="text-rose-600 dark:text-rose-400 text-sm font-black">-{formatMoney(saleSummary.discountAmount)}</span>
              </div>
            )}
            {selectedCustomerName && (
              <div className="flex items-center gap-1 border-r border-slate-300 dark:border-slate-700/60 pr-3 shrink-0">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">عميل:</span>
                <span className="text-amber-700 dark:text-amber-300 font-bold text-xs truncate max-w-[120px]">{selectedCustomerName}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[10px] font-mono">
              <span>#</span>
              <span className="text-slate-600 dark:text-slate-400 font-bold">{invoiceNumber}</span>
            </div>
          </div>

          {/* Left: Environment controls (unique to collapsed bar) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* زر تبديل المظهر في الشريط المصغر */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700/80 text-xs font-bold active:scale-95 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
              aria-label="تبديل المظهر النهاري والليلي"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              )}
            </button>

            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="flex items-center gap-1 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700/80 text-xs font-bold active:scale-95 transition-colors cursor-pointer"
                title={isFullscreen ? 'تصغير الشاشة' : 'تكبير الواجهة (F11)'}
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                ) : (
                  <Maximize className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                )}
              </button>
            )}
            <div className="text-[10px] font-mono text-slate-500 hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg">
              <span className="text-slate-400 dark:text-slate-600">وصل</span>
              <span className="text-slate-700 dark:text-slate-400 font-bold">{invoiceNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Live Neon Display Banner (Giant Total + Date + Customer) */}
      <Design6LiveDisplayBanner
        totalAmount={saleSummary.total}
        formatMoney={formatMoney}
        currency={currency}
        invoiceNumber={invoiceNumber}
        customerName={selectedCustomerName}
        onSelectCustomer={onSelectCustomer}
      />

      {/* 3. Main Center Area (3-Column Layout: Left Tools, Center Table, Right Finance) */}
      <div className="flex-1 flex items-stretch overflow-hidden">
        {/* Left Tools & D-Pad Sidebar */}
        <Design6LeftToolsSidebar
          onNavigateBack={onNavigateBack}
          onOpenSearch={() => setIsProductSearchOpen(true)}
          onOpenMiscProduct={onOpenFreeProduct}
          onArrowUp={handleArrowUp}
          onArrowDown={handleArrowDown}
          onArrowLeft={handleArrowLeft}
          onArrowRight={handleArrowRight}
          onConfirm={handleConfirm}
          onOpenKeyboard={onOpenKeypad}
          onOpenDrawer={handleToggleDrawer}
          onReprintReceipt={handleReprintReceipt}
        />

        {/* Center: Barcode Bar + Sales Data Table */}
        <main className="flex-1 flex flex-col justify-between overflow-hidden bg-white dark:bg-[#060a14] transition-colors">
          <Design6BarcodeScannerBar
            barcodeInput={barcodeInput}
            setBarcodeInput={setBarcodeInput}
            onBarcodeSubmit={handleEnhancedBarcodeSubmit}
            pendingQty={pendingQty}
            setPendingQty={setPendingQty}
            onOpenPriceEdit={handleFocusPrice}
            quantityInputRef={quantityInputRef}
            barcodeInputRef={barcodeInputRef}
            products={allProducts && allProducts.length > 0 ? allProducts : products}
            onSelectProduct={(product, qty) => {
              for (let i = 0; i < qty; i++) {
                onAddToCart(product);
              }
            }}
            onOpenAddProduct={onOpenAddProduct}
            onSettleSale={onSettleSale}
            cartCount={cart.length}
            formatMoney={formatMoney}
            currency={currency}
          />

          <Design6SalesDataTable
            cart={cart}
            products={allProducts && allProducts.length > 0 ? allProducts : products}
            selectedCartRowId={selectedCartRowId}
            setSelectedCartRowId={setSelectedCartRowId}
            onUpdateQty={onUpdateQty}
            onRemoveFromCart={onRemoveFromCart}
            formatMoney={formatMoney}
            currency={currency}
            tvaAmount={saleSummary.tvaAmount}
            onOpenKeypadForQty={onOpenKeypadForQty}
            editingPriceItemId={editingPriceItemId}
            setEditingPriceItemId={setEditingPriceItemId}
            onEditPrice={onEditPrice}
            priceTier={priceTier}
            onSelectPriceTier={onSelectPriceTier}
          />
        </main>

        {/* Right: Financial Breakdown Stack & Denominations */}
        <Design6FinancialStack
          subtotal={saleSummary.subtotal}
          discountAmount={saleSummary.discountAmount}
          totalAmount={saleSummary.total}
          paidAmount={paidAmount}
          changeAmount={changeAmount}
          onSetDenomination={setDenomination}
          onOpenDiscount={onOpenDiscount}
          onSettleSale={onSettleSale}
          formatMoney={formatMoney}
          currency={currency}
          userName={userName}
          boxName="صندوق 01"
          supportPhone="0770.539.177"
          priceTier={priceTier}
        />
      </div>

      {/* 4. Bottom Favorites & Retail Products Pad */}
      <Design6FavoritesPad
        onSelectFavorite={handleSelectFavorite}
        displayedFavoriteItems={displayedFavoriteItems}
        quickProducts={retailQuickProducts}
        favoriteCategories={favoriteCategories}
        selectedFavoriteCatId={selectedFavoriteCatId}
        setSelectedFavoriteCatId={setSelectedFavoriteCatId}
        terminalCategoryMode={terminalCategoryMode}
        setTerminalCategoryMode={setTerminalCategoryMode}
      />

      {/* 5. Bottom System Status Bar */}
      <Design6SystemStatusBar
        printerName="EPSON TM-T20III (جاهزة)"
        isPrinterReady={true}
        isDbConnected={true}
        screenModel="SAMSUNG S19C150"
        appVersion="V 4.8.2 PRO"
      />

      {/* 6. Sub-modals: Flexy & Lock */}
      <Design6FlexyModal
        isOpen={isFlexyOpen}
        onClose={() => setIsFlexyOpen(false)}
        onTopUpSuccess={(operator, phone, amount) => {
          // Add flexy product to cart
          const flexyItem: Product = {
            id: `flexy-${operator}-${Date.now()}`,
            name: `تعبئة ${operator.toUpperCase()} (${phone})`,
            barcode: '',
            sku: 'FLEXY',
            unit: 'عملية',
            costPrice: amount,
            retailPrice: amount,
            wholesalePrice: amount,
            wholesaleMinQty: 1,
            quantity: 999,
            lowStockThreshold: 1,
            category: 'خدمات',
            status: 'active',
          };
          onAddToCart(flexyItem, amount);
        }}
      />

      <Design6TerminalLockModal
        isOpen={isLocked}
        onUnlock={() => setIsLocked(false)}
        userName={userName}
      />

      {/* 7. Product Search & Catalog Modal (F10) */}
      <Design6ProductSearchModal
        isOpen={isProductSearchOpen}
        onClose={() => setIsProductSearchOpen(false)}
        products={allProducts && allProducts.length > 0 ? allProducts : products}
        onSelectProduct={(product) => {
          for (let i = 0; i < pendingQty; i++) {
            onAddToCart(product);
          }
          setPendingQty(1);
        }}
        formatMoney={formatMoney}
        currency={currency}
        categories={categories}
      />
    </div>
  );
};

export default AdvancedTerminalPOSLayout;
