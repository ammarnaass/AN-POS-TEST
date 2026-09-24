import { useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useBarcodeScanner } from '@/features/barcode/useBarcodeScanner';
import { usePOSCartActions } from './cart';
import { usePOSKeyboardShortcuts } from './hooks/usePOSKeyboardShortcuts';
import { useMobileScanner } from './hooks/useMobileScanner';
import { usePOSData } from './hooks/usePOSData';
import { usePOSCatalogFilter } from './hooks/usePOSCatalogFilter';
import { usePOSModalsState } from './hooks/usePOSModalsState';
import { usePOSPageState } from './hooks/usePOSPageState';
import { usePOSNavigation } from './hooks/usePOSNavigation';
import { usePOSPagePaymentFlow } from './hooks/usePOSPagePaymentFlow';
import { usePOSReturnFlow } from './returns';
import { POSTopBar } from './components/POSTopBar';
import { POSLayoutDispatcher } from './components/POSLayoutDispatcher';
import { POSModalsContainer } from './components/POSModalsContainer';
import { usePOSSessionStore } from './store/usePOSSessionStore';
import { getTrialState } from '@/services/trialService';
import { isLicensed } from '@/services/licenseService';

const formatMoney = (val: number | null | undefined, decimals = 2) => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('ar-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatNumber = (val: number | null | undefined) => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('ar-DZ');
};

export default function POSPage() {
  const navigate = useNavigate();
  const { items: cart, addItem, removeItem, updateQty, updatePrice, clear: clearCart } = useCartStore();
  const { user: currentUser } = useAuthStore();
  const trial = getTrialState(currentUser?.role);
  const { open: openSidebar } = useSidebarStore();
  const { theme, toggleTheme } = useThemeStore();
  const notifications = useNotificationStore((s) => s.notifications);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // 1. Centralized Data Query Hook
  const {
    products,
    customers,
    suppliers,
    promotions,
    packs,
    dbCategories,
    purchases,
    purchaseItems,
    settings,
    sales,
    allSessions,
    currentSession,
    suspendedOrders,
    posSettings,
    refetchSuspended,
  } = usePOSData();

  // 2. POS Session Store
  const {
    selectedCustomer,
    setSelectedCustomer,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    paymentMethod,
    setPaymentMethod,
    paidAmount,
    setPaidAmount,
    returnMode,
    setReturnMode,
    returnContext,
    setReturnContext,
    selectedItemId,
    setSelectedItemId,
    quickMode,
    autoPrintReceipt,
    setAutoPrintReceipt,
    posLayout,
    setPosLayout,
    showProductImages,
    setShowProductImages,
    viewMode,
    setViewMode,
    uiZoom,
    setUiZoom,
    screenResolution,
    setScreenResolution,
    customResolution,
    setCustomResolution,
    resolutionScaleMode,
    setResolutionScaleMode,
    wholesaleMode,
    setWholesaleMode,
    toggleWholesaleMode,
  } = usePOSSessionStore();

  // 3. Centralized Modals State
  const modals = usePOSModalsState();

  // 4. Centralized Catalog Filtering Hook
  const {
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filterSupplier,
    setFilterSupplier,
    filterStockStatus,
    setFilterStockStatus,
    isFeaturedOnly,
    setIsFeaturedOnly,
    currentPage,
    setCurrentPage,
    availableCategories,
    activeFiltersCount,
    handleClearAllFilters,
    filteredProducts,
    paginatedProducts,
    totalPages,
  } = usePOSCatalogFilter({
    products,
    packs,
    dbCategories,
    purchases,
    purchaseItems,
    onNotify: addNotification,
  });

  // 5. Extracted UI & Screen State Hook
  const pageState = usePOSPageState({
    products: products as any[],
    cart,
    updatePrice,
    updateQty,
    customers,
    selectedCustomer,
    promotions: promotions as any[],
    settings,
    posSettings,
    discount,
    discountType,
    paymentMethod,
    setPaymentMethod,
    posLayout,
    uiZoom,
    screenResolution,
    customResolution,
    resolutionScaleMode,
    wholesaleMode,
    setWholesaleMode,
    toggleWholesaleMode,
    addNotification,
  });

  const isSessionOpen = currentSession !== null;

  // 6. Centralized Cart Actions Hook
  const {
    handleAddProduct,
    handleUpdateQty,
    handleRemoveItem,
    handleClearCart,
    handleExternalScan,
  } = usePOSCartActions({
    products: products as any[],
    packs: packs as any,
    promotions: promotions as any,
    isWholesaleActive: pageState.isWholesaleActive,
    priceTier: pageState.priceTier,
    posSettings,
    posLayout,
    addNotification,
    quickMode,
    scanInputRef: pageState.scanInputRef,
    setSearchQuery,
  });

  // 7. Extracted Payment Flow Hook
  const paymentFlow = usePOSPagePaymentFlow({
    cart,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    selectedCustomer,
    setSelectedCustomer,
    paymentMethod,
    paidAmount,
    setPaidAmount,
    returnMode,
    setReturnMode,
    selectedItemId,
    priceTier: pageState.priceTier,
    isWholesaleActive: pageState.isWholesaleActive,
    currentSession,
    isSessionOpen,
    settingsOrDefault: pageState.settingsOrDefault,
    products: products as any[],
    packs: packs as any[],
    customers: customers as any[],
    currentUser,
    suspendedOrders,
    refetchSuspended,
    clearCart,
    addItem,
    handleUpdateQty,
    modals,
    addNotification,
  });

  // 8. Extracted Return Flow Hook
  const returnFlow = usePOSReturnFlow({
    isSessionOpen,
    completeSale: paymentFlow.completeSale,
    currentSession,
    settingsOrDefault: pageState.settingsOrDefault,
    products: products as any[],
    packs: packs as any[],
    customers: customers as any[],
    clearCart,
    addItem,
    setReturnMode,
    setReturnContext,
    setSelectedCustomer,
    modals,
    addNotification,
  });

  // Shared robust navigation (exit fullscreen, navigate, hash fallback for Electron)
  const { goHome: handleNavigateBack, goSalesHistory: handleOpenSalesHistory } = usePOSNavigation();

  // Shared modal-close + modal-open state (keyboard shortcuts + layouts Esc handling)
  const handleCloseAllModals = useCallback(() => {
    modals.setShowPaymentModal(false);
    modals.setShowSuccessModal(false);
    modals.setShowShortcutsModal(false);
    modals.setShowSuspended(false);
    modals.setShowReturnSaleModal(false);
    modals.setShowAddProduct(false);
    modals.setShowAddCustomer(false);
    modals.setShowFreeProductModal(false);
    modals.setShowOpenSession(false);
    modals.setShowSessionWarning(false);
    modals.setShowCustomizeModal(false);
    modals.setShowDiscountModal(false);
    modals.setShowSaveAsProformaModal(false);
    modals.setShowSaveAsOrderModal(false);
    modals.setShowFiltersModal(false);
    modals.setShowKeypad(false);
    pageState.setEditingPriceFor(null);
  }, [modals, pageState]);

  const isAnyModalOpen = useMemo(
    () =>
      modals.showPaymentModal ||
      modals.showSuccessModal ||
      modals.showShortcutsModal ||
      modals.showSuspended ||
      modals.showReturnSaleModal ||
      modals.showAddProduct ||
      modals.showAddCustomer ||
      modals.showFreeProductModal ||
      modals.showOpenSession ||
      modals.showSessionWarning ||
      modals.showCustomizeModal ||
      modals.showDiscountModal ||
      modals.showSaveAsProformaModal ||
      modals.showSaveAsOrderModal ||
      modals.showFiltersModal ||
      modals.showKeypad ||
      pageState.editingPriceFor !== null,
    [
      modals.showPaymentModal,
      modals.showSuccessModal,
      modals.showShortcutsModal,
      modals.showSuspended,
      modals.showReturnSaleModal,
      modals.showAddProduct,
      modals.showAddCustomer,
      modals.showFreeProductModal,
      modals.showOpenSession,
      modals.showSessionWarning,
      modals.showCustomizeModal,
      modals.showDiscountModal,
      modals.showSaveAsProformaModal,
      modals.showSaveAsOrderModal,
      modals.showFiltersModal,
      modals.showKeypad,
      pageState.editingPriceFor,
    ]
  );

  // Barcode & Mobile Scanners
  useBarcodeScanner({
    onScan: handleExternalScan,
    enabled: true,
    respectInputFocus: false,
    beepOnSuccess: false,
    beepOnFailure: false,
  });

  useMobileScanner({
    onScan: handleExternalScan,
    enabled: true,
  });

  // Keyboard Shortcuts Hook
  usePOSKeyboardShortcuts({
    enabled: posLayout !== 'advanced' && posLayout !== 'design7',
    cart,
    selectedItemId,
    isSessionOpen,
    total: pageState.saleSummary.total,
    isAnyModalOpen,
    isPaymentModalOpen: modals.showPaymentModal,
    isSuccessModalOpen: modals.showSuccessModal,
    onCloseAllModals: handleCloseAllModals,
    onExecutePayment: paymentFlow.handleExecutePayment,
    onCloseSuccessModal: () => modals.setShowSuccessModal(false),
    onOpenPayment: () => {
      setPaidAmount(pageState.saleSummary.total);
      modals.setShowPaymentModal(true);
    },
    onSuspendSale: paymentFlow.handleSuspend,
    onOpenSuspended: () => modals.setShowSuspended(true),
    onClearCart: () => {
      clearCart();
      setSelectedCustomer('');
      setDiscount(0);
    },
    onOpenReturns: () => modals.setShowReturnSaleModal(true),
    onOpenShortcuts: () => modals.setShowShortcutsModal(true),
    onOpenFreeProduct: () => modals.setShowFreeProductModal(true),
    onOpenAddProduct: () => modals.setShowAddProduct(true),
    onOpenAddCustomer: () => modals.setShowAddCustomer(true),
    onToggleAutoPrint: () => {
      setAutoPrintReceipt((prev) => {
        const next = !prev;
        addNotification({
          title: next ? 'الطباعة التلقائية: مفعلة (F5)' : 'الطباعة التلقائية: معطلة (F5)',
          message: next ? 'سيتم طباعة الوصل تلقائياً عند إتمام الدفع' : 'تم إيقاف الطباعة التلقائية',
          type: 'info',
        });
        return next;
      });
    },
    onFocusSearch: () => {
      pageState.barcodeInputRef.current?.focus();
      pageState.barcodeInputRef.current?.select();
    },
    onOpenOpenSession: () => modals.setShowOpenSession(true),
    onOpenSessionWarning: () => modals.setShowSessionWarning(true),
    onOpenCustomize: () => modals.setShowCustomizeModal(true),
    onOpenDiscount: () => modals.setShowDiscountModal(true),
    onToggleWholesale: () => {
      const next = !wholesaleMode;
      toggleWholesaleMode();
      pageState.handleSelectPriceTier(next ? '3' : '1');
    },
    onUpdateQty: handleUpdateQty,
    onRemoveItem: removeItem,
    onNavigateBack: handleNavigateBack,
    onOpenSalesHistory: handleOpenSalesHistory,
    addNotification,
  });

  return (
    <div
      className={
        resolutionScaleMode === 'fixed_canvas' && pageState.targetDims
          ? 'w-screen h-screen overflow-hidden bg-slate-950 flex items-center justify-center select-none p-2'
          : 'contents'
      }
    >
      <div
        className={`flex flex-col overflow-hidden bg-background dark:bg-slate-950 select-none font-cairo text-on-surface dark:text-slate-100 ${
          resolutionScaleMode === 'fixed_canvas' && pageState.targetDims
            ? 'shadow-2xl border border-slate-800 rounded-2xl shrink-0'
            : ''
        }`}
        dir="rtl"
        style={pageState.canvasStyle}
      >
        {/* TOP BAR (Rendered in non-fullscreen layouts) */}
        {posLayout !== 'classic' && posLayout !== 'modern' && posLayout !== 'sidebar' && posLayout !== 'terminal' && posLayout !== 'advanced' && posLayout !== 'design7' && (
          <POSTopBar
            currentUser={currentUser}
            trial={trial}
            isLicensed={isLicensed()}
            theme={theme}
            toggleTheme={toggleTheme}
            unreadCount={unreadCount}
            openSidebar={openSidebar}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            barcodeHeaderInput={pageState.barcodeHeaderInput}
            setBarcodeHeaderInput={pageState.setBarcodeHeaderInput}
            onExternalScan={handleExternalScan}
            searchInputRef={pageState.searchInputRef}
            barcodeInputRef={pageState.barcodeInputRef}
            products={products}
            onAddProduct={handleAddProduct}
            isFullscreen={pageState.isFullscreen}
            toggleFullscreen={pageState.toggleFullscreen}
            currentSession={currentSession}
            onOpenSession={() => modals.setShowOpenSession(true)}
            wholesaleMode={wholesaleMode}
            toggleWholesaleMode={() => {
              toggleWholesaleMode();
              addNotification({
                title: !wholesaleMode ? 'وضع الجملة مفعّل (Gros)' : 'وضع التجزئة مفعّل (Détail)',
                message: !wholesaleMode
                  ? 'تم تفعيل أسعار وفواتير الجملة تلقائياً (Alt+W)'
                  : 'تم العودة إلى أسعار التجزئة العادية (Alt+W)',
                type: !wholesaleMode ? 'success' : 'info',
              });
            }}
            onSelectPriceTier={pageState.handleSelectPriceTier}
            isWholesaleActive={pageState.isWholesaleActive}
            currentPriceTier={pageState.priceTier}
            onOpenShortcuts={() => modals.setShowShortcutsModal(true)}
            onOpenFilters={() => modals.setShowFiltersModal(true)}
            activeFiltersCount={activeFiltersCount}
            onClearAllFilters={handleClearAllFilters}
            isFeaturedOnly={isFeaturedOnly}
            setIsFeaturedOnly={setIsFeaturedOnly}
            returnMode={returnMode}
            setReturnMode={setReturnMode}
            clearCart={clearCart}
            onOpenReturnSale={() => modals.setShowReturnSaleModal(true)}
            onOpenFreeProduct={() => modals.setShowFreeProductModal(true)}
            onOpenCustomize={() => modals.setShowCustomizeModal(true)}
            onNavigateBack={handleNavigateBack}
            onOpenSalesHistory={handleOpenSalesHistory}
            onNotify={addNotification}
          />
        )}

        {/* MAIN WORKSPACE LAYOUT DISPATCHER */}
        <POSLayoutDispatcher
          posLayout={posLayout}
          cart={cart}
          onAddToCart={handleAddProduct}
          onUpdateQty={handleUpdateQty}
          onRemoveFromCart={handleRemoveItem}
          onClearCart={() => {
            handleClearCart();
            setSelectedCustomer('');
            setDiscount(0);
          }}
          onEditPrice={(productId, newPrice) => {
            updatePrice(productId, newPrice);
          }}
          priceTier={pageState.priceTier}
          onSelectPriceTier={pageState.handleSelectPriceTier}
          saleSummary={pageState.saleSummary}
          products={filteredProducts as any}
          allProducts={products as any}
          categories={availableCategories}
          selectedCategory={filterCategory}
          onSelectCategory={(catId) => setFilterCategory(catId === 'ALL' ? '' : catId)}
          barcodeInput={pageState.barcodeHeaderInput}
          setBarcodeInput={pageState.setBarcodeHeaderInput}
          onBarcodeSubmit={(e) => {
            e?.preventDefault();
            if (pageState.barcodeHeaderInput.trim()) {
              handleExternalScan(pageState.barcodeHeaderInput.trim());
              pageState.setBarcodeHeaderInput('');
            }
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSettleSale={(customPaid?: number) => {
            if (!isSessionOpen) {
              modals.setShowSessionWarning(true);
              return;
            }
            if (cart.length === 0) return;
            const finalPaid =
              typeof customPaid === 'number' && customPaid > 0
                ? customPaid
                : pageState.saleSummary.total;
            setPaidAmount(finalPaid);
            modals.setShowPaymentModal(true);
          }}
          onSuspendSale={paymentFlow.handleSuspend}
          onOpenSuspended={() => modals.setShowSuspended(true)}
          suspendedCount={suspendedOrders.length}
          onSelectCustomer={() => modals.setShowCustomerSelect(true)}
          selectedCustomerName={
            selectedCustomer ? customers.find((c) => c.id === selectedCustomer)?.name || pageState.selectedCustomerObj?.name || '' : ''
          }
          autoPrintReceipt={autoPrintReceipt}
          onToggleAutoPrint={() => {
            setAutoPrintReceipt(!autoPrintReceipt);
            addNotification({
              title: 'الطباعة التلقائية',
              message: !autoPrintReceipt
                ? 'تم تفعيل الطباعة التلقائية للإيصالات'
                : 'تم إيقاف الطباعة التلقائية',
              type: 'info',
            });
          }}
          onOpenDiscount={() => modals.setShowDiscountModal(true)}
          discount={discount}
          discountType={discountType}
          onOpenFreeProduct={() => modals.setShowFreeProductModal(true)}
          onOpenReturns={() => modals.setShowReturnSaleModal(true)}
          returnMode={returnMode}
          onOpenCustomize={() => modals.setShowCustomizeModal(true)}
          wholesaleMode={wholesaleMode}
          toggleWholesaleMode={() => {
            toggleWholesaleMode();
            addNotification({
              title: !wholesaleMode ? 'وضع الجملة مفعّل (Gros)' : 'وضع التجزئة مفعّل (Détail)',
              message: !wholesaleMode
                ? 'تم تفعيل أسعار وفواتير الجملة تلقائياً (Alt+W)'
                : 'تم العودة إلى أسعار التجزئة العادية (Alt+W)',
              type: !wholesaleMode ? 'success' : 'info',
            });
          }}
          onSaveAsProforma={() => {
            if (cart.length === 0) return;
            modals.setShowSaveAsProformaModal(true);
          }}
          onSaveAsOrder={() => {
            if (cart.length === 0) return;
            modals.setShowSaveAsOrderModal(true);
          }}
          onNewOrder={() => {
            if (cart.length > 0) {
              clearCart();
              setSelectedCustomer('');
              setDiscount(0);
            }
          }}
          onOpenSalesHistory={handleOpenSalesHistory}
          formatMoney={formatMoney}
          currency="دج"
          storeName={pageState.settingsOrDefault?.shopName || 'AN POS'}
          userName={currentUser?.name || 'Admin'}
          isSessionOpen={isSessionOpen}
          isSalePending={paymentFlow.isSalePending}
          onToggleFullscreen={pageState.toggleFullscreen}
          isFullscreen={pageState.isFullscreen}
          onNavigateBack={handleNavigateBack}
          onOpenFavoritesManagement={() => navigate('/favorites')}
          onOpenKeypad={() => {
            modals.setKeypadTarget('paid');
            modals.setKeypadInput(String(pageState.saleSummary.total || ''));
            modals.setShowKeypad(true);
          }}
          onOpenKeypadForQty={(item) => {
            setSelectedItemId(item.productId);
            modals.setKeypadTarget('qty');
            modals.setKeypadInput(String(item.qty));
            modals.setShowKeypad(true);
          }}
          viewMode={viewMode}
          showProductImages={showProductImages}
          paginatedProducts={paginatedProducts as any}
          posSettings={posSettings}
          onOpenAddProduct={() => modals.setShowAddProduct(true)}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          mobileTab={pageState.mobileTab}
          setMobileTab={pageState.setMobileTab}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customers={customers}
          selectedCustomerObj={pageState.selectedCustomerObj}
          onOpenCustomerSelect={() => modals.setShowCustomerSelect(true)}
          onOpenAddCustomer={() => modals.setShowAddCustomer(true)}
          isWholesaleActive={pageState.isWholesaleActive}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          editingPriceFor={pageState.editingPriceFor}
          setEditingPriceFor={pageState.setEditingPriceFor}
          priceInput={pageState.priceInput}
          setPriceInput={pageState.setPriceInput}
          onUpdatePrice={updatePrice}
          onRemoveItem={removeItem}
          formatNumber={formatNumber}
          isAnyModalOpen={isAnyModalOpen}
          onCloseAllModals={handleCloseAllModals}
        />

        {/* CONSOLIDATED POS MODALS CONTAINER */}
        <POSModalsContainer
          modals={modals}
          cart={cart}
          saleSummary={pageState.saleSummary}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paidAmount={paidAmount}
          setPaidAmount={setPaidAmount}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customers={customers}
          products={products}
          suppliers={suppliers}
          availableCategories={availableCategories}
          suspendedOrders={suspendedOrders}
          sales={sales}
          allSessions={allSessions}
          discount={discount}
          setDiscount={setDiscount}
          discountType={discountType}
          setDiscountType={setDiscountType}
          posLayout={posLayout}
          setPosLayout={setPosLayout}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showProductImages={showProductImages}
          setShowProductImages={setShowProductImages}
          uiZoom={uiZoom}
          setUiZoom={setUiZoom}
          screenResolution={screenResolution}
          setScreenResolution={setScreenResolution}
          customResolution={customResolution}
          setCustomResolution={setCustomResolution}
          resolutionScaleMode={resolutionScaleMode}
          setResolutionScaleMode={setResolutionScaleMode}
          posSettings={posSettings}
          settings={settings}
          currentUser={currentUser}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterSupplier={filterSupplier}
          setFilterSupplier={setFilterSupplier}
          filterStockStatus={filterStockStatus}
          setFilterStockStatus={setFilterStockStatus}
          returnMode={returnMode}
          returnContext={returnContext}
          setReturnContext={setReturnContext}
          onConfirmPayment={async (paid, custId, method, refundMethod) => {
            const finalMethod = method || paymentMethod;
            const finalCustomer = custId !== undefined ? custId : selectedCustomer;
            const isCredit = finalMethod === 'credit';
            const finalPaid =
              typeof paid === 'number' && !isNaN(paid)
                ? (isCredit && paid >= pageState.saleSummary.total ? 0 : paid)
                : (isCredit ? 0 : pageState.saleSummary.total);

            setPaidAmount(finalPaid);
            if (custId !== undefined) setSelectedCustomer(finalCustomer);
            if (method) setPaymentMethod(finalMethod);

            const effectiveRefundMethod =
              refundMethod ||
              (returnMode
                ? (finalMethod === 'credit' ? 'customer_credit' : 'cash')
                : undefined);

            await paymentFlow.handleExecutePayment({
              paidAmount: finalPaid,
              selectedCustomer: finalCustomer,
              paymentMethod: finalMethod,
              refundMethod: effectiveRefundMethod,
              originalSaleId: returnContext?.originalSaleId,
              originalSaleNumber: returnContext?.originalSaleNumber,
              returnReason: returnContext?.reason,
            });
          }}
          isSalePending={paymentFlow.isSalePending}
          onAddProduct={handleAddProduct}
          onResumeOrder={paymentFlow.handleResumeOrder}
          onDeleteSuspendedOrder={paymentFlow.handleDeleteSuspendedOrder}
          onSelectReturnSale={returnFlow.handleSelectReturnSale}
          onConfirmPartialReturn={returnFlow.handleConfirmPartialReturn}
          onLoadReturnToCart={returnFlow.handleLoadReturnToCart}
          onKeypadPress={paymentFlow.handleKeypadPress}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          onUpdateQty={(productId, qty) => {
            const it = cart.find((c) => c.productId === productId);
            if (it) handleUpdateQty(it, qty);
          }}
          formatMoney={formatMoney}
        />
      </div>
    </div>
  );
}
