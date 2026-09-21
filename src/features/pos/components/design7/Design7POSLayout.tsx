import React, { useCallback } from 'react';
import type { Design7POSLayoutProps } from './types';
import './design7.css';

import { Design7TopRibbon } from './components/Design7TopRibbon';
import { Design7DisplayAndCustomerBanner } from './components/Design7DisplayAndCustomerBanner';
import { Design7ActiveScanStrip } from './components/Design7ActiveScanStrip';
import { Design7FinancialSidebar } from './components/Design7FinancialSidebar';
import { Design7BasketTable } from './components/Design7BasketTable';
import { Design7ActionKeypad } from './components/Design7ActionKeypad';
import { Design7BottomFavoritesPad } from './components/Design7BottomFavoritesPad';
import { Design7ProductSearchModal } from './modals/Design7ProductSearchModal';
import { Design7ItemEditModal } from './modals/Design7ItemEditModal';
import { Design7VirtualKeyboardModal } from './modals/Design7VirtualKeyboardModal';
import {
  useDesign7CartSelection,
  useDesign7Favorites,
  useDesign7Modals,
  useDesign7BarcodeAndScale,
  useDesign7Payment,
  useDesign7Shortcuts,
} from './hooks';
import { getCartRowKey } from './utils/cartRow';

export const Design7POSLayout: React.FC<Design7POSLayoutProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  onEditPrice,
  saleSummary,
  products = [],
  allProducts = [],
  categories = [],
  selectedCategory,
  onSelectCategory,
  favoriteCategories: customFavoriteCategories,
  favoritePacks: customFavoritePacks,
  onOpenFavoritesManagement,
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
  returnMode = false,
  onOpenCustomize,
  wholesaleMode = false,
  toggleWholesaleMode,
  priceTier = '1',
  onSelectPriceTier,
  onSaveAsProforma,
  onSaveAsOrder,
  onNewOrder,
  onOpenSalesHistory,
  invoiceNumber = 1,
  formatMoney,
  currency = 'DA',
  userName = 'admin',
  storeName,
  isSessionOpen,
  isSalePending,
  onToggleFullscreen,
  isFullscreen = false,
  onNavigateBack,
  onOpenKeypad,
  onOpenKeypadForQty,
  onOpenKeyboard,
  onOpenAddProduct,
  isAnyModalOpen: isAnyGlobalModalOpen = false,
  onCloseAllModals,
}) => {
  // 1. Cart Row Selection & Item Navigation Hook
  const {
    selectedCartRowId,
    setSelectedCartRowId,
    activeItem,
    handleArrowUp,
    handleArrowDown,
    handleArrowRight,
    handleArrowLeft,
    handleDeleteSelectedRow,
  } = useDesign7CartSelection({
    cart,
    onUpdateQty,
    onRemoveFromCart,
  });

  // 2. Financial Accounting, Paid Amount & Settlement Hook
  const {
    paidAmount,
    setPaidAmount,
    itemCount,
    totalQuantity,
    handleConfirm,
  } = useDesign7Payment({
    cart,
    onSettleSale,
  });

  // 3. Barcode Scanner, Focus Ref & Electronic Scale Hook
  const {
    barcodeInputRef,
    handleBarcodeSubmit,
    handleReadScale,
  } = useDesign7BarcodeAndScale({
    onBarcodeSubmit,
    activeItem,
    onUpdateQty,
  });

  // 4. Modals Lifecycle & Dialog Management Hook
  const {
    isProductSearchOpen,
    openProductSearch,
    closeProductSearch,
    itemEditState,
    openItemEdit,
    closeItemEdit,
    isVirtualKeyboardOpen,
    openVirtualKeyboard,
    closeVirtualKeyboard,
    isAnyModalOpen,
    handleCloseModals,
    refocusBarcode,
  } = useDesign7Modals({
    isAnyGlobalModalOpen,
    onCloseAllModals,
    barcodeInputRef,
  });

  // 5. Favorites Packs & Categories Hook
  const {
    selectedFavoriteCatId,
    setSelectedFavoriteCatId,
    activeFavoriteCategories,
    activeFavoritesList,
    displayedFavoriteItems,
    handleSelectFavoritePack,
  } = useDesign7Favorites({
    customFavoriteCategories,
    customFavoritePacks,
    categories,
    products,
    allProducts,
    priceTier,
    onAddToCart,
  });

  // 6. Action Handlers for Item Details and Price Editing
  const handleItemDetails = useCallback(() => {
    if (activeItem) {
      openItemEdit('qty');
    } else if (onOpenFreeProduct) {
      onOpenFreeProduct();
    }
  }, [activeItem, openItemEdit, onOpenFreeProduct]);

  const handleEditPrice = useCallback(() => {
    if (activeItem) {
      openItemEdit('price');
    }
  }, [activeItem, openItemEdit]);

  // 7. Connect Keyboard Shortcuts (F1-F12, Arrows, Del, Enter, Esc, Alt+1..4)
  useDesign7Shortcuts({
    onSettleSale: (pAmount) => onSettleSale(pAmount ?? paidAmount),
    onOpenSalesHistory,
    onSuspendSale,
    onOpenReturns,
    onOpenSuspended,
    onOpenDiscount,
    onSelectCustomer,
    onNewOrder,
    onClearCart,
    onOpenCustomize,
    onToggleFullscreen,
    onBarcodeFocus: () => barcodeInputRef.current?.focus(),
    onOpenSearch: openProductSearch,
    onOpenFreeProduct,
    onToggleAutoPrint,
    onNavigateBack,
    isAnyModalOpen,
    onCloseModals: handleCloseModals,
    cart,
    selectedCartRowId,
    setSelectedCartRowId,
    onUpdateQty,
    onRemoveFromCart,
    onSelectPriceTier,
  });

  return (
    <div
      dir="rtl"
      lang="ar"
      className="d7-container w-full h-full flex-1 min-h-0 min-w-0 flex flex-col p-1 sm:p-1.5 bg-[#43494e] text-slate-900 select-none overflow-hidden text-xs"
    >
      {/* Main POS Desktop Application Window Wrapper */}
      <div
        className="flex-1 flex flex-col bg-[#e6ecf2] border-2 border-[#54606e] shadow-2xl rounded-xs overflow-hidden min-h-0 min-w-0"
        data-purpose="pos-window"
      >
        {/* Top Action Buttons Ribbon & Order Metadata Header */}
        <Design7TopRibbon
          onNavigateBack={onNavigateBack}
          onOpenSalesHistory={onOpenSalesHistory}
          onOpenReturns={onOpenReturns}
          onSaveAsOrder={onSaveAsOrder}
          onOpenSuspended={onOpenSuspended}
          suspendedCount={suspendedCount}
          autoPrintReceipt={autoPrintReceipt}
          onToggleAutoPrint={onToggleAutoPrint}
          onSettleSale={() => onSettleSale(paidAmount)}
          onOpenDiscount={onOpenDiscount}
          onOpenCustomize={onOpenCustomize}
          onNewOrder={onNewOrder}
          onClearCart={onClearCart}
          invoiceNumber={invoiceNumber}
          onToggleFullscreen={onToggleFullscreen}
          isFullscreen={isFullscreen}
          priceTier={priceTier}
          onSelectPriceTier={onSelectPriceTier}
        />

        {/* Main Workspace Middle Section */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0" data-purpose="primary-workspace">
          {/* Top LED Display & Customer Banner */}
          <Design7DisplayAndCustomerBanner
            totalAmount={saleSummary.total}
            formatMoney={formatMoney}
            currency={currency}
            selectedCustomerName={selectedCustomerName}
            onSelectCustomer={onSelectCustomer}
          />

          {/* Current Scanning / Active Item Notification Bar */}
          <Design7ActiveScanStrip
            inputRef={barcodeInputRef}
            activeItem={activeItem}
            barcodeInput={barcodeInput}
            setBarcodeInput={setBarcodeInput}
            onBarcodeSubmit={handleBarcodeSubmit}
            formatMoney={formatMoney}
            priceTier={priceTier}
            onReadScale={handleReadScale}
          />

          {/* Workspace Body: Financial Column (Right in RTL) + Basket Table (Center) + 3x5 Keypad (Left in RTL) */}
          <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
            {/* Financial Summary Sidebar (Right in RTL) */}
            <Design7FinancialSidebar
              subtotal={saleSummary.subtotal}
              discountAmount={saleSummary.discountAmount}
              total={saleSummary.total}
              tvaAmount={saleSummary.tvaAmount}
              itemCount={itemCount}
              totalQuantity={totalQuantity}
              paidAmount={paidAmount}
              onUpdatePaid={setPaidAmount}
              onOpenPaidCalculator={() => openItemEdit('paid')}
              formatMoney={formatMoney}
              onOpenDiscount={() => {
                if (onOpenDiscount) onOpenDiscount();
                else openItemEdit('discount');
              }}
              onSettleSale={(pAmount) => onSettleSale(pAmount ?? paidAmount)}
              userName={userName}
              priceTier={priceTier}
            />

            {/* Shopping Basket Table (Center) */}
            <Design7BasketTable
              cart={cart}
              selectedCartRowId={selectedCartRowId}
              onSelectRow={setSelectedCartRowId}
              onUpdateQty={onUpdateQty}
              onRemoveFromCart={onRemoveFromCart}
              formatMoney={formatMoney}
              priceTier={priceTier}
              products={products}
              allProducts={allProducts}
              onEditPrice={onEditPrice}
              onOpenItemEdit={(item, mode = 'qty') => {
                const idx = cart.indexOf(item);
                const rowKey = getCartRowKey(item, idx >= 0 ? idx : 0);
                setSelectedCartRowId(rowKey);
                openItemEdit(mode);
              }}
            />

            {/* Right/Left Action Keypad Matrix (Left in RTL) */}
            <Design7ActionKeypad
              onSelectCustomer={onSelectCustomer}
              onOpenSearch={openProductSearch}
              onItemDetails={handleItemDetails}
              onDeleteSelectedRow={handleDeleteSelectedRow}
              onArrowUp={handleArrowUp}
              onArrowDown={handleArrowDown}
              onArrowLeft={handleArrowLeft}
              onArrowRight={handleArrowRight}
              onConfirm={handleConfirm}
              onSettleSale={() => onSettleSale(paidAmount)}
              onOpenKeypad={() => {
                openItemEdit(activeItem ? 'qty' : 'paid');
              }}
              onOpenKeyboard={() => {
                if (onOpenKeyboard) onOpenKeyboard();
                openVirtualKeyboard();
              }}
              onOpenSalesHistory={onOpenSalesHistory}
              onSuspendSale={onSuspendSale}
              onOpenFreeProduct={onOpenFreeProduct}
              onEditPrice={handleEditPrice}
              hasSelectedItem={Boolean(selectedCartRowId)}
            />
          </div>
        </div>

        {/* Bottom Favorites & Speed Dial Matrix: عبوات المفضلة وتصنيفاتها فقط */}
        <Design7BottomFavoritesPad
          favoriteCategories={activeFavoriteCategories}
          selectedFavoriteCatId={selectedFavoriteCatId}
          onSelectFavoriteCategory={setSelectedFavoriteCatId}
          favoritePacks={displayedFavoriteItems}
          totalPacksCount={activeFavoritesList.length}
          onSelectFavoritePack={handleSelectFavoritePack}
          onOpenFavoritesManagement={onOpenFavoritesManagement}
          onAddToCart={onAddToCart}
          formatMoney={formatMoney}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          products={(allProducts && allProducts.length > 0 ? allProducts : products) || []}
          priceTier={priceTier}
        />
      </div>

      {/* Product Search & Catalog Modal (F10 / Search Icon) */}
      <Design7ProductSearchModal
        isOpen={isProductSearchOpen}
        onClose={closeProductSearch}
        products={products}
        onSelectProduct={(p) => {
          onAddToCart(p);
          refocusBarcode(40);
        }}
        formatMoney={formatMoney}
        categories={categories}
        priceTier={priceTier}
      />

      {/* Item Details, Quantity & Price Touch Calculator Modal */}
      <Design7ItemEditModal
        isOpen={itemEditState.isOpen}
        onClose={closeItemEdit}
        item={activeItem}
        mode={itemEditState.mode}
        totalAmount={saleSummary.total}
        paidAmount={paidAmount}
        discountAmount={saleSummary.discountAmount}
        onUpdateQty={(prodId, newQty) => {
          const effectiveId = activeItem?.productId || (activeItem as any)?.id || prodId;
          if (effectiveId) onUpdateQty(effectiveId, newQty);
        }}
        onUpdatePrice={
          onEditPrice
            ? (prodId, newPrice) => {
                const effectiveId = activeItem?.productId || (activeItem as any)?.id || prodId;
                if (effectiveId) onEditPrice(effectiveId, newPrice);
              }
            : undefined
        }
        onUpdatePaid={setPaidAmount}
        onUpdateDiscount={onOpenDiscount ? () => onOpenDiscount() : undefined}
        formatMoney={formatMoney}
        currency={currency}
      />

      {/* Virtual Touch Keyboard Modal (لوحة المفاتيح اللمسية للشاشات) */}
      <Design7VirtualKeyboardModal
        isOpen={isVirtualKeyboardOpen}
        onClose={closeVirtualKeyboard}
        initialValue={barcodeInput || searchQuery || ''}
        onConfirm={(val) => {
          if (setBarcodeInput) setBarcodeInput(val);
          if (setSearchQuery) setSearchQuery(val);
          if (handleBarcodeSubmit) handleBarcodeSubmit();
          refocusBarcode(40);
        }}
        title="لوحة المفاتيح اللمسية الافتراضية"
        placeholder="انقر على الأحرف أو الأرقام لكتابة الباركود والبحث..."
      />
    </div>
  );
};

export default Design7POSLayout;
