import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ShoppingCart, CreditCard } from 'lucide-react';
import type { WorkstationPOSLayoutProps, SearchCriteria } from './types';
import type { CartItem } from '@/types';
import type { PaymentMethodType } from './components/WorkstationCheckoutPanel';
import { WorkstationTopBar } from './components/WorkstationTopBar';
import { WorkstationLEDRibbon } from './components/WorkstationLEDRibbon';
import { WorkstationCheckoutPanel } from './components/WorkstationCheckoutPanel';
import { WorkstationTableArea } from './components/WorkstationTableArea';
import { WorkstationBottomBar } from './components/WorkstationBottomBar';
import { WorkstationCalculatorModal } from './components/WorkstationCalculatorModal';
import { useWorkstationShortcuts } from './hooks/useWorkstationShortcuts';

export const WorkstationPOSLayout: React.FC<WorkstationPOSLayoutProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  onEditPrice,
  priceTier,
  onSelectPriceTier,
  saleSummary,
  products = [],
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  searchQuery: _searchQuery,
  setSearchQuery: _setSearchQuery,
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
  returnMode: _returnMode,
  onOpenCustomize,
  wholesaleMode: _wholesaleMode,
  toggleWholesaleMode: _toggleWholesaleMode,
  onSaveAsProforma: _onSaveAsProforma,
  onSaveAsOrder: _onSaveAsOrder,
  onNewOrder: _onNewOrder,
  onOpenSalesHistory,
  invoiceNumber = 3,
  formatMoney,
  currency = 'د.ج',
  storeName,
  userName,
  isSessionOpen: _isSessionOpen,
  isSalePending,
  onToggleFullscreen,
  isFullscreen,
  onNavigateBack,
  onOpenKeypad: _onOpenKeypad,
  onOpenKeypadForQty: _onOpenKeypadForQty,
  onOpenAddProduct,
  onOpenFavoritesManagement,
  isAnyModalOpen = false,
  onCloseAllModals,
  selectedItemId: propSelectedItemId,
  setSelectedItemId: propSetSelectedItemId,
  posSettings,
}) => {
  // Local state for active selected item if not provided from props
  const [localSelectedItemId, setLocalSelectedItemId] = useState<string | null>(null);
  const activeSelectedItemId = propSelectedItemId !== undefined ? propSelectedItemId : localSelectedItemId;
  const setActiveSelectedItemId = propSetSelectedItemId || setLocalSelectedItemId;

  // Search criteria
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>('designation');

  // Price editing state for cart items
  const [editingPriceFor, setEditingPriceFor] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');

  // Smart Calculator & Item Edit Modal state (based on Design 3 TouchKeypadModal)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorMode, setCalculatorMode] = useState<'qty' | 'price' | 'paid' | 'discount' | 'calc'>('price');

  // Payment method
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>('cash');

  // Customer paid amount
  const [paidAmount, setPaidAmount] = useState<number>(() => saleSummary.total || 0);

  // Mobile & Tablet (< 1024px) Active View Tab
  const [mobileTab, setMobileTab] = useState<'table' | 'checkout'>('table');

  // Sync paid amount when total changes and paid was 0 or equal to previous total
  useEffect(() => {
    if (saleSummary.total > 0 && (paidAmount === 0 || paidAmount < saleSummary.total)) {
      setPaidAmount(saleSummary.total);
    }
  }, [saleSummary.total]);

  // Ensure an item is selected when cart has items
  useEffect(() => {
    if (cart.length > 0 && !activeSelectedItemId) {
      setActiveSelectedItemId(cart[0].productId);
    } else if (cart.length === 0 && activeSelectedItemId) {
      setActiveSelectedItemId(null);
    }
  }, [cart, activeSelectedItemId, setActiveSelectedItemId]);

  // Input refs
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const paidInputRef = useRef<HTMLInputElement>(null);

  // Quantity step actions
  const handleIncrementQty = useCallback(() => {
    const target = cart.find((i) => i.productId === activeSelectedItemId) || cart[0];
    if (target) {
      onUpdateQty(target.productId, target.qty + 1);
    }
  }, [cart, activeSelectedItemId, onUpdateQty]);

  const handleDecrementQty = useCallback(() => {
    const target = cart.find((i) => i.productId === activeSelectedItemId) || cart[0];
    if (target) {
      if (target.qty > 1) {
        onUpdateQty(target.productId, target.qty - 1);
      } else {
        onRemoveFromCart(target.productId);
      }
    }
  }, [cart, activeSelectedItemId, onUpdateQty, onRemoveFromCart]);

  // Delete selected item
  const handleDeleteSelected = useCallback(() => {
    const target = cart.find((i) => i.productId === activeSelectedItemId) || cart[cart.length - 1];
    if (target) {
      onRemoveFromCart(target.productId);
    }
  }, [cart, activeSelectedItemId, onRemoveFromCart]);

  // F4 Edit Price on selected item (or open free product if cart empty)
  const handleF4EditPrice = useCallback(() => {
    if (cart.length === 0) {
      onOpenFreeProduct();
      return;
    }
    const target = cart.find((i) => i.productId === activeSelectedItemId) || cart[0];
    if (target) {
      setActiveSelectedItemId(target.productId);
      setEditingPriceFor(target.productId);
      const targetPrice = target.unitPrice ?? (target as any).price ?? 0;
      setPriceInput(String(targetPrice));
    }
  }, [cart, activeSelectedItemId, setActiveSelectedItemId, onOpenFreeProduct]);

  // F4 Smart Calculator & Item Edit Modal trigger (Design 3 Touch Keypad style)
  const handleOpenCalculator = useCallback(
    (targetItem?: CartItem, mode: 'qty' | 'price' | 'paid' | 'discount' | 'calc' = 'price') => {
      if (cart.length === 0) {
        onOpenFreeProduct();
        return;
      }
      const item = targetItem || cart.find((i) => i.productId === activeSelectedItemId) || cart[0];
      if (item) {
        setActiveSelectedItemId(item.productId);
        setCalculatorMode(mode);
        setIsCalculatorOpen(true);
      }
    },
    [cart, activeSelectedItemId, setActiveSelectedItemId, onOpenFreeProduct]
  );

  const activeCalculatorItem = useMemo(() => {
    return cart.find((i) => i.productId === activeSelectedItemId) || cart[0] || null;
  }, [cart, activeSelectedItemId]);

  // Confirm Sale (Save only - F1)
  const handleConfirmSave = useCallback(() => {
    if (cart.length === 0 || isSalePending) return;
    onSettleSale(paidAmount, selectedPaymentMethod);
  }, [cart.length, isSalePending, onSettleSale, paidAmount, selectedPaymentMethod]);

  // Confirm Sale (Save & Print - F2)
  const handleConfirmPrint = useCallback(() => {
    if (cart.length === 0 || isSalePending) return;
    if (!autoPrintReceipt && onToggleAutoPrint) {
      onToggleAutoPrint();
    }
    onSettleSale(paidAmount, selectedPaymentMethod);
  }, [cart.length, isSalePending, autoPrintReceipt, onToggleAutoPrint, onSettleSale, paidAmount, selectedPaymentMethod]);

  // Toggle search criteria (F8)
  const handleToggleSearchMode = useCallback(() => {
    setSearchCriteria((prev) => {
      if (prev === 'designation') return 'barcode';
      if (prev === 'barcode') return 'reference';
      return 'designation';
    });
  }, []);

  // Focus Search (F5)
  const handleFocusSearch = useCallback(() => {
    setMobileTab('table');
    barcodeInputRef.current?.focus();
    barcodeInputRef.current?.select();
  }, []);

  // Quick Pay (F12)
  const handleQuickPay = useCallback(() => {
    setMobileTab('checkout');
    setPaidAmount(saleSummary.total);
    paidInputRef.current?.focus();
    paidInputRef.current?.select();
  }, [saleSummary.total]);

  // Keyboard shortcuts integration
  useWorkstationShortcuts({
    onF1Confirm: handleConfirmPrint,
    onF2ConfirmPrint: handleConfirmPrint,
    onF3HoldSale: onSuspendSale,
    onF4Calculator: () => handleOpenCalculator(undefined, 'price'),
    onF4FreeProduct: onOpenFreeProduct,
    onF4EditPrice: handleF4EditPrice,
    onF5FocusSearch: handleFocusSearch,
    onF6HeldSales: onOpenSuspended,
    onF7QuickAdd: onOpenAddProduct || onOpenFreeProduct,
    onF8ToggleSearchMode: handleToggleSearchMode,
    onF9Customize: onOpenCustomize,
    onF11Returns: onOpenReturns,
    onF12QuickPay: handleQuickPay,
    onDeleteSelected: handleDeleteSelected,
    onClearCart: onClearCart,
    onIncrementQty: handleIncrementQty,
    onDecrementQty: handleDecrementQty,
    onEscape: () => {
      if (isCalculatorOpen) {
        setIsCalculatorOpen(false);
      } else if (onNavigateBack) {
        onNavigateBack();
      }
    },
    isAnyModalOpen: isAnyModalOpen || isCalculatorOpen,
    onCloseAllModals: () => {
      setIsCalculatorOpen(false);
      onCloseAllModals?.();
    },
  });

  return (
    <div
      dir="rtl"
      className="h-full w-full max-h-full min-h-0 overflow-hidden flex flex-col font-sans text-slate-800 dark:text-slate-100 antialiased select-none bg-slate-100 dark:bg-slate-950"
    >
      {/* 1. MainHeader Status Bar (Dark Slate-900) */}
      <WorkstationTopBar
        storeName={storeName}
        userName={userName}
        invoiceNumber={invoiceNumber}
        suspendedCount={suspendedCount}
        onOpenSuspended={onOpenSuspended}
        selectedCustomerName={selectedCustomerName}
        onSelectCustomer={onSelectCustomer}
        onToggleFullscreen={onToggleFullscreen}
        isFullscreen={isFullscreen}
        onNavigateBack={onNavigateBack}
        onOpenCustomize={onOpenCustomize}
        autoPrintReceipt={autoPrintReceipt}
        onToggleAutoPrint={onToggleAutoPrint}
        onOpenSalesHistory={onOpenSalesHistory}
      />

      {/* 2. High-Contrast LED Terminal Ribbon */}
      <WorkstationLEDRibbon
        total={saleSummary.total}
        currency={currency}
        formatMoney={formatMoney}
      />

      {/* 2.5 Mobile/Tablet Responsive Tab Bar (Visible on < lg, Hidden on lg+) */}
      <div className="lg:hidden flex items-center p-1 mx-2 sm:mx-3 mt-1.5 mb-0 bg-slate-200/90 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shrink-0 gap-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileTab('table')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
            mobileTab === 'table'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/60 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span>جدول المواد والسلة</span>
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
              mobileTab === 'table'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {cart.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('checkout')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
            mobileTab === 'checkout'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/60 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          <span>الحساب والدفع</span>
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
              mobileTab === 'checkout'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-300 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatMoney(saleSummary.total)} {currency}
          </span>
        </button>
      </div>

      {/* 3. Main Workstation Content (Split: Aside Left + Workspace Right) */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden p-2 sm:p-3 gap-2.5 sm:gap-3">
        {/* Left: Financial & Payment Panel */}
        <WorkstationCheckoutPanel
          priceTier={priceTier}
          onSelectPriceTier={onSelectPriceTier}
          subtotal={saleSummary.subtotal}
          discountAmount={saleSummary.discountAmount}
          tvaAmount={saleSummary.tvaAmount}
          total={saleSummary.total}
          taxRate={posSettings?.defaultTaxRate ?? 0}
          discount={discount}
          discountType={discountType}
          onOpenDiscount={onOpenDiscount}
          paidAmount={paidAmount}
          setPaidAmount={setPaidAmount}
          paidInputRef={paidInputRef}
          selectedPaymentMethod={selectedPaymentMethod}
          setSelectedPaymentMethod={setSelectedPaymentMethod}
          onOpenQuickAdd={onOpenAddProduct || onOpenFreeProduct}
          onOpenFavorites={onOpenFavoritesManagement}
          formatMoney={formatMoney}
          currency={currency}
          className={mobileTab === 'checkout' ? 'flex' : 'hidden lg:flex'}
        />

        {/* Center & Right: Products & Sales Workspace */}
        <WorkstationTableArea
          cart={cart}
          selectedItemId={activeSelectedItemId}
          onSelectItem={setActiveSelectedItemId}
          onUpdateQty={onUpdateQty}
          onRemoveItem={onRemoveFromCart}
          onEditPrice={onEditPrice}
          onOpenCalculator={handleOpenCalculator}
          editingPriceFor={editingPriceFor}
          setEditingPriceFor={setEditingPriceFor}
          priceInput={priceInput}
          setPriceInput={setPriceInput}
          products={products}
          onAddToCart={onAddToCart}
          priceTier={priceTier}
          searchCriteria={searchCriteria}
          setSearchCriteria={setSearchCriteria}
          barcodeInput={barcodeInput}
          setBarcodeInput={setBarcodeInput}
          onBarcodeSubmit={onBarcodeSubmit}
          barcodeInputRef={barcodeInputRef}
          formatMoney={formatMoney}
          currency={currency}
          className={mobileTab === 'table' ? 'flex' : 'hidden lg:flex'}
        />
      </main>

      {/* 4. Bottom Command Bar (POS Function Keys Toolbar) */}
      <WorkstationBottomBar
        onEscape={onNavigateBack || (() => {})}
        onDeleteSelected={handleDeleteSelected}
        onClearCart={onClearCart}
        onOpenReturns={onOpenReturns}
        onOpenFreeProduct={onOpenFreeProduct}
        onToggleSearchCriteria={handleToggleSearchMode}
        onSuspendSale={onSuspendSale}
        onOpenSuspended={onOpenSuspended}
        onDecrementQty={handleDecrementQty}
        onIncrementQty={handleIncrementQty}
        onConfirmPrint={handleConfirmPrint}
        isSalePending={isSalePending}
        cartLength={cart.length}
      />

      {/* 5. Smart Workstation Calculator & Item Edit Modal (Design 3 Keypad) */}
      <WorkstationCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        item={activeCalculatorItem}
        initialMode={calculatorMode}
        onUpdatePrice={onEditPrice}
        onUpdateQty={onUpdateQty}
        onUpdatePaid={setPaidAmount}
        onOpenDiscount={onOpenDiscount}
        totalAmount={saleSummary.total}
        currency={currency}
      />
    </div>
  );
};
