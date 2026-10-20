import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { WorkstationPOSLayoutProps, SearchCriteria } from './types';
import type { PaymentMethodType } from './components/WorkstationCheckoutPanel';
import { WorkstationTopBar } from './components/WorkstationTopBar';
import { WorkstationLEDRibbon } from './components/WorkstationLEDRibbon';
import { WorkstationCheckoutPanel } from './components/WorkstationCheckoutPanel';
import { WorkstationTableArea } from './components/WorkstationTableArea';
import { WorkstationBottomBar } from './components/WorkstationBottomBar';
import { useWorkstationShortcuts } from './hooks/useWorkstationShortcuts';

export const WorkstationPOSLayout: React.FC<WorkstationPOSLayoutProps> = ({
  cart,
  onAddToCart: _onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart: _onClearCart,
  onEditPrice: _onEditPrice,
  priceTier,
  onSelectPriceTier,
  saleSummary,
  products: _products,
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
  autoPrintReceipt: _autoPrintReceipt,
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
  onOpenSalesHistory: _onOpenSalesHistory,
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
}) => {
  // Local state for active selected item if not provided from props
  const [localSelectedItemId, setLocalSelectedItemId] = useState<string | null>(null);
  const activeSelectedItemId = propSelectedItemId !== undefined ? propSelectedItemId : localSelectedItemId;
  const setActiveSelectedItemId = propSetSelectedItemId || setLocalSelectedItemId;

  // Search criteria
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>('designation');

  // Payment method
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>('cash');

  // Customer paid amount
  const [paidAmount, setPaidAmount] = useState<number>(() => saleSummary.total || 0);

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

  // Confirm Sale (Save only - F1)
  const handleConfirmSave = useCallback(() => {
    if (cart.length === 0 || isSalePending) return;
    onSettleSale(paidAmount);
  }, [cart.length, isSalePending, onSettleSale, paidAmount]);

  // Confirm Sale (Save & Print - F2)
  const handleConfirmPrint = useCallback(() => {
    if (cart.length === 0 || isSalePending) return;
    if (!_autoPrintReceipt && onToggleAutoPrint) {
      onToggleAutoPrint();
    }
    onSettleSale(paidAmount);
  }, [cart.length, isSalePending, _autoPrintReceipt, onToggleAutoPrint, onSettleSale, paidAmount]);

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
    barcodeInputRef.current?.focus();
    barcodeInputRef.current?.select();
  }, []);

  // Quick Pay (F12)
  const handleQuickPay = useCallback(() => {
    setPaidAmount(saleSummary.total);
    paidInputRef.current?.focus();
    paidInputRef.current?.select();
  }, [saleSummary.total]);

  // Keyboard shortcuts integration
  useWorkstationShortcuts({
    onF1Confirm: handleConfirmSave,
    onF2ConfirmPrint: handleConfirmPrint,
    onF3HoldSale: onSuspendSale,
    onF4FreeProduct: onOpenFreeProduct,
    onF5FocusSearch: handleFocusSearch,
    onF6HeldSales: onOpenSuspended,
    onF7QuickAdd: onOpenAddProduct || onOpenFreeProduct,
    onF8ToggleSearchMode: handleToggleSearchMode,
    onF9Customize: onOpenCustomize,
    onF10Packages: onOpenAddProduct || onOpenFreeProduct,
    onF11Returns: onOpenReturns,
    onF12QuickPay: handleQuickPay,
    onDeleteSelected: handleDeleteSelected,
    onIncrementQty: handleIncrementQty,
    onDecrementQty: handleDecrementQty,
    onEscape: onNavigateBack || (() => {}),
    isAnyModalOpen,
    onCloseAllModals,
  });

  return (
    <div
      dir="rtl"
      className="h-full w-full overflow-hidden flex flex-col font-sans text-slate-800 dark:text-slate-100 antialiased select-none bg-slate-100 dark:bg-slate-950"
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
      />

      {/* 2. High-Contrast LED Terminal Ribbon */}
      <WorkstationLEDRibbon
        total={saleSummary.total}
        currency={currency}
        formatMoney={formatMoney}
      />

      {/* 3. Main Workstation Content (Split: Aside Left + Workspace Right) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 gap-3">
        {/* Left: Financial & Payment Panel (350px) */}
        <WorkstationCheckoutPanel
          priceTier={priceTier}
          onSelectPriceTier={onSelectPriceTier}
          subtotal={saleSummary.subtotal}
          total={saleSummary.total}
          discount={discount}
          discountType={discountType}
          onOpenDiscount={onOpenDiscount}
          paidAmount={paidAmount}
          setPaidAmount={setPaidAmount}
          paidInputRef={paidInputRef}
          selectedPaymentMethod={selectedPaymentMethod}
          setSelectedPaymentMethod={setSelectedPaymentMethod}
          onOpenQuickAdd={onOpenAddProduct || onOpenFreeProduct}
          onOpenPackages={onOpenAddProduct || onOpenFreeProduct}
          onOpenFavorites={onOpenFavoritesManagement}
          formatMoney={formatMoney}
          currency={currency}
        />

        {/* Center & Right: Products & Sales Workspace */}
        <WorkstationTableArea
          cart={cart}
          selectedItemId={activeSelectedItemId}
          onSelectItem={setActiveSelectedItemId}
          onUpdateQty={onUpdateQty}
          onRemoveItem={onRemoveFromCart}
          searchCriteria={searchCriteria}
          setSearchCriteria={setSearchCriteria}
          barcodeInput={barcodeInput}
          setBarcodeInput={setBarcodeInput}
          onBarcodeSubmit={onBarcodeSubmit}
          barcodeInputRef={barcodeInputRef}
          formatMoney={formatMoney}
          currency={currency}
        />
      </main>

      {/* 4. Bottom Command Bar (POS Function Keys Toolbar) */}
      <WorkstationBottomBar
        onEscape={onNavigateBack || (() => {})}
        onDeleteSelected={handleDeleteSelected}
        onOpenReturns={onOpenReturns}
        onOpenFreeProduct={onOpenFreeProduct}
        onToggleSearchCriteria={handleToggleSearchMode}
        onOpenPackages={onOpenAddProduct || onOpenFreeProduct}
        onSuspendSale={onSuspendSale}
        onOpenSuspended={onOpenSuspended}
        onDecrementQty={handleDecrementQty}
        onIncrementQty={handleIncrementQty}
        onConfirmSave={handleConfirmSave}
        onConfirmPrint={handleConfirmPrint}
        onOpenCustomize={onOpenCustomize}
        isSalePending={isSalePending}
        cartLength={cart.length}
      />
    </div>
  );
};
