import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { CartItem, Product, Category } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { getProductTierPrice } from '@/services';
import { useFavoritesStore } from '@/features/favorites/store/useFavoritesStore';
import { usePOSSessionStore } from '../store/usePOSSessionStore';
import { TerminalPriceCheckerModal } from './terminal/TerminalPriceCheckerModal';
import { TerminalPOSTopBar } from './terminal/TerminalPOSTopBar';
import { TerminalPOSNeonBar } from './terminal/TerminalPOSNeonBar';
import { TerminalPOSCartTable } from './terminal/TerminalPOSCartTable';
import { TerminalPOSFavoritesGrid } from './terminal/TerminalPOSFavoritesGrid';
import { TerminalPOSFooter } from './terminal/TerminalPOSFooter';

export interface TerminalPOSLayoutProps {
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
}

export const TerminalPOSLayout: React.FC<TerminalPOSLayoutProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  onEditPrice,
  saleSummary,
  products,
  allProducts = [],
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
  wholesaleMode,
  toggleWholesaleMode,
  priceTier: propPriceTier,
  onSelectPriceTier,
  onSaveAsProforma,
  onNewOrder,
  onOpenSalesHistory,
  invoiceNumber = 1,
  formatMoney,
  currency = 'دج',
  userName = 'Admin',
  storeName = 'AN POS',
  isSessionOpen,
  isSalePending,
  onToggleFullscreen,
  isFullscreen,
  onNavigateBack,
  onOpenKeypad,
  onOpenKeypadForQty,
}) => {
  const { theme, toggleTheme } = useThemeStore();

  // Price tier: 1 = retail, 2 = semi-wholesale, 3 = wholesale, 4 = special
  const [internalPriceTier, setInternalPriceTier] = useState<'1' | '2' | '3' | '4'>('1');
  const priceTier = propPriceTier ?? internalPriceTier;

  // Helper to calculate price according to active tier
  const getProductPriceByTier = (prod: Product, tier: '1' | '2' | '3' | '4') => {
    return getProductTierPrice(prod, tier);
  };

  // Handle price tier switch
  const handleSelectPriceTier = useCallback(
    (tier: '1' | '2' | '3' | '4') => {
      setInternalPriceTier(tier);
      if (onSelectPriceTier) onSelectPriceTier(tier);
      if (tier === '3') {
        if (!wholesaleMode) toggleWholesaleMode();
      } else {
        if (wholesaleMode) toggleWholesaleMode();
      }
    },
    [onSelectPriceTier, wholesaleMode, toggleWholesaleMode]
  );

  const [isLockedBarcode, setIsLockedBarcode] = useState(true);
  const [selectedCartRowId, setSelectedCartRowId] = useState<string | null>(null);
  const [tableSearchBarcode, setTableSearchBarcode] = useState('');
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState('');

  // Favorites & Category Mode Integration
  const { categories: favoriteCategories, items: favoriteItems, purgeProductItems } = useFavoritesStore();
  const { terminalCategoryMode, setTerminalCategoryMode } = usePOSSessionStore();
  const [selectedFavoriteCatId, setSelectedFavoriteCatId] = useState<string>('ALL');

  useEffect(() => {
    purgeProductItems();
  }, [purgeProductItems]);

  const packOnlyFavorites = useMemo(() => {
    return favoriteItems.filter((it) => it.type === 'pack');
  }, [favoriteItems]);

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

  // Dedicated Price Checker Mode (عارض الأسعار التفاعلي)
  const [isPriceCheckerMode, setIsPriceCheckerMode] = useState(false);
  const [priceCheckerResult, setPriceCheckerResult] = useState<{
    product: Product;
    price: number;
  } | null>(null);
  const [priceCheckerNotFound, setPriceCheckerNotFound] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Live clock
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard Shortcuts (F1, F2, F3, F4, F6, F8, F9, F10, F12, Ctrl+D, Ctrl+E, Esc, Alt+1..4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an open input that is not barcode
      const active = document.activeElement;
      const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (isInput && active !== barcodeInputRef.current) return;

      if (e.key === 'F1') {
        e.preventDefault();
        if (cart.length > 0) onSettleSale();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) onClearCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (onNewOrder) onNewOrder();
        else if (cart.length > 0) onClearCart();
      } else if (e.key === 'F3') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F6') {
        e.preventDefault();
        onSelectCustomer();
      } else if (e.key === 'F2') {
        e.preventDefault();
        onSelectCustomer();
      } else if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0) onSuspendSale();
        else onOpenSuspended();
      } else if (e.key === 'F10') {
        e.preventDefault();
        onOpenCustomize();
      } else if (e.key === 'Escape') {
        if (isPriceCheckerMode) {
          setIsPriceCheckerMode(false);
          setPriceCheckerResult(null);
          setPriceCheckerNotFound(null);
        } else {
          onNavigateBack();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedCartRowId) {
          onRemoveFromCart(selectedCartRowId);
          setSelectedCartRowId(null);
        } else if (cart.length > 0) {
          onRemoveFromCart(cart[cart.length - 1].productId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const targetItem = selectedCartRowId
          ? cart.find((c) => c.productId === selectedCartRowId)
          : cart[cart.length - 1];
        if (targetItem && onOpenKeypadForQty) {
          onOpenKeypadForQty(targetItem);
        } else if (onOpenKeypad) {
          onOpenKeypad();
        }
      } else if ((e.altKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        handleSelectPriceTier('1');
      } else if ((e.altKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        handleSelectPriceTier('2');
      } else if ((e.altKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        handleSelectPriceTier('3');
      } else if ((e.altKey || e.ctrlKey) && e.key === '4') {
        e.preventDefault();
        handleSelectPriceTier('4');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    onSettleSale,
    onClearCart,
    onNewOrder,
    onSelectCustomer,
    onSuspendSale,
    onOpenSuspended,
    onOpenCustomize,
    selectedCartRowId,
    onRemoveFromCart,
    onOpenKeypadForQty,
    onOpenKeypad,
    isPriceCheckerMode,
    onNavigateBack,
    handleSelectPriceTier,
  ]);

  // Auto-refocus barcode input if 'العودة للرمز دائماً' is active
  useEffect(() => {
    if (isLockedBarcode && !isPriceCheckerMode) {
      const timer = setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT') {
          barcodeInputRef.current?.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [cart.length, isLockedBarcode, isPriceCheckerMode]);

  // Total items and units calculation
  const totalUnitsCount = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
    [cart]
  );

  // Quick products grid for retail products mode (top 15 products for 3 rows x 5 cols)
  const quickProducts = useMemo(() => {
    let list = (products || []).filter((p: any) => !p.isPack && !('items' in p));
    if (list.length === 0 && (!selectedCategory || selectedCategory === 'ALL')) {
      list = (allProducts || []).filter((p: any) => !p.isPack && !('items' in p));
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    return list.slice(0, 15);
  }, [products, allProducts, selectedCategory, searchQuery]);

  // Dedicated Price Checker Submit / Scan Handler
  const handleBarcodeOrQuerySubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    if (isPriceCheckerMode) {
      const all = allProducts.length > 0 ? allProducts : products;
      const found = all.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
          p.name.toLowerCase().includes(code.toLowerCase()) ||
          p.id === code
      );
      if (found) {
        setPriceCheckerResult({
          product: found,
          price: getProductPriceByTier(found, priceTier),
        });
        setPriceCheckerNotFound(null);
      } else {
        setPriceCheckerNotFound(code);
        setPriceCheckerResult(null);
      }
      setBarcodeInput('');
    } else {
      onBarcodeSubmit(e);
    }
  };

  // Filtered cart if table search is used
  const displayCart = useMemo(() => {
    if (!tableSearchBarcode.trim()) return cart;
    const q = tableSearchBarcode.toLowerCase().trim();
    return cart.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q))
    );
  }, [cart, tableSearchBarcode]);

  const formattedDate = useMemo(() => {
    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, '0');
    const d = String(currentTime.getDate()).padStart(2, '0');
    const hh = String(currentTime.getHours()).padStart(2, '0');
    const mm = String(currentTime.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${hh}:${mm}`;
  }, [currentTime]);

  const invoiceFormattedNumber = useMemo(() => {
    if (String(invoiceNumber).startsWith('INV-')) return invoiceNumber;
    return `26${String(invoiceNumber).padStart(10, '0')}`;
  }, [invoiceNumber]);

  return (
    <div
      className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 h-full w-full flex-1 overflow-hidden flex flex-col justify-between p-1 sm:p-2 font-cairo select-none antialiased"
      dir="rtl"
    >
      {/* ─── POS MAIN CONTAINER ─── */}
      <main className="flex flex-col flex-1 bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-300 dark:border-slate-800 overflow-hidden relative">
        {/* عارض الأسعار التفاعلي */}
        <TerminalPriceCheckerModal
          isOpen={isPriceCheckerMode}
          onClose={() => {
            setIsPriceCheckerMode(false);
            setPriceCheckerResult(null);
            setPriceCheckerNotFound(null);
          }}
          result={priceCheckerResult}
          onClearResult={() => setPriceCheckerResult(null)}
          notFoundBarcode={priceCheckerNotFound}
          onClearNotFound={() => setPriceCheckerNotFound(null)}
          priceTier={priceTier}
          currency={currency}
          formatMoney={formatMoney}
          onAddToCart={onAddToCart}
        />

        {/* 1. TOP COMMAND BAR (شريط الأوامر السريعة العلوية F1-F12) */}
        <TerminalPOSTopBar
          onNavigateBack={onNavigateBack}
          onSettleSale={onSettleSale}
          cart={cart}
          isSalePending={isSalePending}
          onClearCart={onClearCart}
          selectedCartRowId={selectedCartRowId}
          setSelectedCartRowId={setSelectedCartRowId}
          onRemoveFromCart={onRemoveFromCart}
          onOpenReturns={onOpenReturns}
          returnMode={returnMode}
          onNewOrder={onNewOrder}
          onSuspendSale={onSuspendSale}
          onOpenSuspended={onOpenSuspended}
          suspendedCount={suspendedCount}
          onSelectCustomer={onSelectCustomer}
          selectedCustomerName={selectedCustomerName}
          onOpenCustomize={onOpenCustomize}
          isPriceCheckerMode={isPriceCheckerMode}
          onTogglePriceChecker={() => {
            setIsPriceCheckerMode((prev) => !prev);
            setPriceCheckerResult(null);
            setPriceCheckerNotFound(null);
            setTimeout(() => barcodeInputRef.current?.focus(), 50);
          }}
          onOpenFreeProduct={onOpenFreeProduct}
          onOpenKeypad={onOpenKeypad}
          onOpenDiscount={onOpenDiscount}
          theme={theme}
          toggleTheme={toggleTheme}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
          wholesaleMode={wholesaleMode}
          toggleWholesaleMode={toggleWholesaleMode}
          priceTier={priceTier}
          onSelectPriceTier={handleSelectPriceTier}
        />

        {/* 2. MAIN CONTENT AND CORE WORKSPACE */}
        <section className="flex-1 flex flex-col p-2 sm:p-2.5 gap-2 overflow-hidden min-h-0">
          {/* Upper Section: فلاتر الأسعار + شاشة النيون الرقمية الفسفورية + باركود F3 */}
          <TerminalPOSNeonBar
            priceTier={priceTier}
            handleSelectPriceTier={handleSelectPriceTier}
            isLockedBarcode={isLockedBarcode}
            setIsLockedBarcode={setIsLockedBarcode}
            autoPrintReceipt={autoPrintReceipt}
            onToggleAutoPrint={onToggleAutoPrint}
            saleSummary={saleSummary}
            formatMoney={formatMoney}
            currency={currency}
            cart={cart}
            totalUnitsCount={totalUnitsCount}
            barcodeInputRef={barcodeInputRef}
            barcodeInput={barcodeInput}
            setBarcodeInput={setBarcodeInput}
            handleBarcodeOrQuerySubmit={handleBarcodeOrQuerySubmit}
            isPriceCheckerMode={isPriceCheckerMode}
            selectedCartRowId={selectedCartRowId}
            onOpenKeypadForQty={onOpenKeypadForQty}
            onOpenKeypad={onOpenKeypad}
          />

          {/* Center Area: جدول عناصر الفاتورة مع التنسيق الدائم الكامل */}
          <TerminalPOSCartTable
            displayCart={displayCart}
            cartLength={cart.length}
            tableSearchBarcode={tableSearchBarcode}
            setTableSearchBarcode={setTableSearchBarcode}
            selectedCartRowId={selectedCartRowId}
            setSelectedCartRowId={setSelectedCartRowId}
            allProducts={allProducts}
            products={products}
            onEditPrice={onEditPrice}
            onUpdateQty={onUpdateQty}
            onRemoveFromCart={onRemoveFromCart}
            onOpenKeypadForQty={onOpenKeypadForQty}
            formatMoney={formatMoney}
            formattedDate={formattedDate}
            invoiceFormattedNumber={invoiceFormattedNumber}
            totalUnitsCount={totalUnitsCount}
            editingPriceItemId={editingPriceItemId}
            setEditingPriceItemId={setEditingPriceItemId}
            customPriceInput={customPriceInput}
            setCustomPriceInput={setCustomPriceInput}
          />

          {/* Bottom Section: جدول الأصناف الأكثر مبيعاً / المفضلة + تبويبات الفئات */}
          <TerminalPOSFavoritesGrid
            terminalCategoryMode={terminalCategoryMode}
            setTerminalCategoryMode={setTerminalCategoryMode}
            displayedFavoriteItems={displayedFavoriteItems}
            onAddToCart={onAddToCart}
            formatMoney={formatMoney}
            currency={currency}
            quickProducts={quickProducts}
            priceTier={priceTier}
            getProductPriceByTier={getProductPriceByTier}
            favoriteCategories={favoriteCategories}
            selectedFavoriteCatId={selectedFavoriteCatId}
            setSelectedFavoriteCatId={setSelectedFavoriteCatId}
            activeFavoritesList={activeFavoritesList}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            allProducts={allProducts}
            products={products}
            barcodeInputRef={barcodeInputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenCustomize={onOpenCustomize}
          />
        </section>

        {/* 3. BOTTOM STATUS BAR & 4. SUBTLE MONITOR BEZEL SIMULATION */}
        <TerminalPOSFooter
          isSessionOpen={isSessionOpen}
          userName={userName}
          storeName={storeName}
          onOpenSalesHistory={onOpenSalesHistory}
          onSaveAsProforma={onSaveAsProforma}
          cart={cart}
          formattedDate={formattedDate}
        />
      </main>
    </div>
  );
};

export default TerminalPOSLayout;
