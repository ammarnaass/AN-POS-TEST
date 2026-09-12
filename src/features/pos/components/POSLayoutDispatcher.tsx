import React from 'react';
import type { CartItem, Product, Customer, Category } from '@/types';
import type { POSLayout } from '../store/usePOSSessionStore';
import type { POSSettings } from '../hooks/usePOSData';
import { SidebarPOSLayout } from './SidebarPOSLayout';
import { ClassicPOSLayout } from './ClassicPOSLayout';
import { ModernPOSLayout } from './ModernPOSLayout';
import { TerminalPOSLayout } from './TerminalPOSLayout';
import { DefaultGridPOSLayout } from './DefaultGridPOSLayout';

export interface POSLayoutDispatcherProps {
  posLayout: POSLayout;
  cart: CartItem[];
  onAddToCart: (product: any, customPrice?: number) => void;
  onUpdateQty: (item: CartItem, newQty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onEditPrice: (productId: string, newPrice: number) => void;
  priceTier: '1' | '2' | '3' | '4';
  onSelectPriceTier: (tier: '1' | '2' | '3' | '4') => void;
  saleSummary: {
    subtotal: number;
    discountAmount: number;
    total: number;
  };
  products: Product[];
  allProducts?: Product[];
  categories: (Category | { id: string; name: string } | string)[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
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
  onSaveAsProforma: () => void;
  onSaveAsOrder: () => void;
  onNewOrder: () => void;
  onOpenSalesHistory: () => void;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  storeName: string;
  userName: string;
  isSessionOpen: boolean;
  isSalePending: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onNavigateBack: () => void;
  onOpenKeypad?: () => void;
  onOpenKeypadForQty?: (item: CartItem) => void;
  viewMode: 'grid' | 'list';
  showProductImages: boolean;

  // Grid/List Specific Props
  paginatedProducts: Product[];
  posSettings: POSSettings;
  onOpenAddProduct: () => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (p: number) => void;
  mobileTab: 'products' | 'cart';
  setMobileTab: (tab: 'products' | 'cart') => void;
  selectedCustomer: string;
  setSelectedCustomer: (id: string) => void;
  customers: Customer[];
  selectedCustomerObj?: Customer;
  onOpenCustomerSelect: () => void;
  onOpenAddCustomer: () => void;
  isWholesaleActive: boolean;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  editingPriceFor: string | null;
  setEditingPriceFor: (id: string | null) => void;
  priceInput: string;
  setPriceInput: (val: string) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onRemoveItem: (productId: string) => void;
  formatNumber: (val: number | null | undefined) => string;
}

export const POSLayoutDispatcher: React.FC<POSLayoutDispatcherProps> = ({
  posLayout,
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  onEditPrice,
  priceTier,
  onSelectPriceTier,
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
  wholesaleMode,
  toggleWholesaleMode,
  onSaveAsProforma,
  onSaveAsOrder,
  onNewOrder,
  onOpenSalesHistory,
  formatMoney,
  currency = 'دج',
  storeName,
  userName,
  isSessionOpen,
  isSalePending,
  onToggleFullscreen,
  isFullscreen,
  onNavigateBack,
  onOpenKeypad,
  onOpenKeypadForQty,
  viewMode,
  showProductImages,
  paginatedProducts,
  posSettings,
  onOpenAddProduct,
  currentPage,
  totalPages,
  setCurrentPage,
  mobileTab,
  setMobileTab,
  selectedCustomer,
  setSelectedCustomer,
  customers,
  selectedCustomerObj,
  onOpenCustomerSelect,
  onOpenAddCustomer,
  isWholesaleActive,
  selectedItemId,
  setSelectedItemId,
  editingPriceFor,
  setEditingPriceFor,
  priceInput,
  setPriceInput,
  onUpdatePrice,
  onRemoveItem,
  formatNumber,
}) => {
  const handleItemQtyChange = (productId: string, qty: number) => {
    const it = cart.find((c) => c.productId === productId);
    if (it) onUpdateQty(it, qty);
  };

  if (posLayout === 'sidebar') {
    return (
      <SidebarPOSLayout
        cart={cart}
        onAddToCart={onAddToCart}
        onUpdateQty={handleItemQtyChange}
        onRemoveFromCart={onRemoveFromCart}
        onClearCart={onClearCart}
        onEditPrice={onEditPrice}
        priceTier={priceTier}
        onSelectPriceTier={onSelectPriceTier}
        saleSummary={saleSummary}
        products={products as any}
        allProducts={allProducts as any}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        onBarcodeSubmit={onBarcodeSubmit}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSettleSale={onSettleSale}
        onSuspendSale={onSuspendSale}
        onOpenSuspended={onOpenSuspended}
        suspendedCount={suspendedCount}
        onSelectCustomer={onSelectCustomer}
        selectedCustomerName={selectedCustomerName}
        autoPrintReceipt={autoPrintReceipt}
        onToggleAutoPrint={onToggleAutoPrint}
        onOpenDiscount={onOpenDiscount}
        discount={discount}
        discountType={discountType}
        onOpenFreeProduct={onOpenFreeProduct}
        onOpenReturns={onOpenReturns}
        returnMode={returnMode}
        onOpenCustomize={onOpenCustomize}
        wholesaleMode={wholesaleMode}
        toggleWholesaleMode={toggleWholesaleMode}
        onSaveAsProforma={onSaveAsProforma}
        onNewOrder={onNewOrder}
        onOpenSalesHistory={onOpenSalesHistory}
        invoiceNumber={1}
        formatMoney={formatMoney}
        currency={currency}
        storeName={storeName}
        userName={userName}
        isSessionOpen={isSessionOpen}
        isSalePending={isSalePending}
        onToggleFullscreen={onToggleFullscreen}
        isFullscreen={isFullscreen}
        onNavigateBack={onNavigateBack}
        onOpenKeypadForQty={onOpenKeypadForQty}
        viewMode={viewMode}
        showProductImages={showProductImages}
      />
    );
  }

  if (posLayout === 'classic') {
    return (
      <ClassicPOSLayout
        cart={cart}
        onAddToCart={onAddToCart}
        onUpdateQty={handleItemQtyChange}
        onRemoveFromCart={onRemoveFromCart}
        onClearCart={onClearCart}
        onEditPrice={onEditPrice}
        priceTier={priceTier}
        onSelectPriceTier={onSelectPriceTier}
        wholesaleMode={wholesaleMode}
        toggleWholesaleMode={toggleWholesaleMode}
        saleSummary={saleSummary}
        products={products as any}
        allProducts={allProducts as any}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        onBarcodeSubmit={onBarcodeSubmit}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSettleSale={onSettleSale}
        onSuspendSale={onSuspendSale}
        onOpenSuspended={onOpenSuspended}
        suspendedCount={suspendedCount}
        onSelectCustomer={onSelectCustomer}
        selectedCustomerName={selectedCustomerName}
        autoPrintReceipt={autoPrintReceipt}
        onToggleAutoPrint={onToggleAutoPrint}
        onOpenDiscount={onOpenDiscount}
        onOpenReturns={onOpenReturns}
        onOpenKeypad={onOpenKeypad}
        onOpenKeypadForQty={onOpenKeypadForQty}
        formatMoney={formatMoney}
        currency={currency}
        userName={userName}
        storeName={storeName}
        isSessionOpen={isSessionOpen}
        isSalePending={isSalePending}
        onSaveAsProforma={onSaveAsProforma}
        onSaveAsOrder={onSaveAsOrder}
      />
    );
  }

  if (posLayout === 'modern') {
    return (
      <ModernPOSLayout
        cart={cart}
        onAddToCart={onAddToCart}
        onUpdateQty={handleItemQtyChange}
        onRemoveFromCart={onRemoveFromCart}
        onClearCart={onClearCart}
        onEditPrice={onEditPrice}
        priceTier={priceTier}
        onSelectPriceTier={onSelectPriceTier}
        saleSummary={saleSummary}
        products={products as any}
        allProducts={allProducts as any}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        onBarcodeSubmit={onBarcodeSubmit}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSettleSale={onSettleSale}
        onSuspendSale={onSuspendSale}
        onOpenSuspended={onOpenSuspended}
        suspendedCount={suspendedCount}
        onSelectCustomer={onSelectCustomer}
        selectedCustomerName={selectedCustomerName}
        autoPrintReceipt={autoPrintReceipt}
        onToggleAutoPrint={onToggleAutoPrint}
        onOpenDiscount={onOpenDiscount}
        discount={discount}
        discountType={discountType}
        onOpenFreeProduct={onOpenFreeProduct}
        onOpenReturns={onOpenReturns}
        returnMode={returnMode}
        onOpenCustomize={onOpenCustomize}
        wholesaleMode={wholesaleMode}
        toggleWholesaleMode={toggleWholesaleMode}
        onSaveAsProforma={onSaveAsProforma}
        onNewOrder={onNewOrder}
        onOpenSalesHistory={onOpenSalesHistory}
        invoiceNumber={1}
        formatMoney={formatMoney}
        currency={currency}
        storeName={storeName}
        userName={userName}
        isSessionOpen={isSessionOpen}
        isSalePending={isSalePending}
        onToggleFullscreen={onToggleFullscreen}
        isFullscreen={isFullscreen}
        onNavigateBack={onNavigateBack}
        onOpenKeypadForQty={onOpenKeypadForQty}
        viewMode={viewMode}
        showProductImages={showProductImages}
      />
    );
  }

  if (posLayout === 'terminal') {
    return (
      <TerminalPOSLayout
        cart={cart}
        onAddToCart={onAddToCart}
        onUpdateQty={handleItemQtyChange}
        onRemoveFromCart={onRemoveFromCart}
        onClearCart={onClearCart}
        onEditPrice={onEditPrice}
        priceTier={priceTier}
        onSelectPriceTier={onSelectPriceTier}
        saleSummary={saleSummary}
        products={products as any}
        allProducts={allProducts as any}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        onBarcodeSubmit={onBarcodeSubmit}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSettleSale={onSettleSale}
        onSuspendSale={onSuspendSale}
        onOpenSuspended={onOpenSuspended}
        suspendedCount={suspendedCount}
        onSelectCustomer={onSelectCustomer}
        selectedCustomerName={selectedCustomerName}
        autoPrintReceipt={autoPrintReceipt}
        onToggleAutoPrint={onToggleAutoPrint}
        onOpenDiscount={onOpenDiscount}
        discount={discount}
        discountType={discountType}
        onOpenFreeProduct={onOpenFreeProduct}
        onOpenReturns={onOpenReturns}
        returnMode={returnMode}
        onOpenCustomize={onOpenCustomize}
        wholesaleMode={wholesaleMode}
        toggleWholesaleMode={toggleWholesaleMode}
        onSaveAsProforma={onSaveAsProforma}
        onNewOrder={onNewOrder}
        onOpenSalesHistory={onOpenSalesHistory}
        invoiceNumber={1}
        formatMoney={formatMoney}
        currency={currency}
        storeName={storeName}
        userName={userName}
        isSessionOpen={isSessionOpen}
        isSalePending={isSalePending}
        onToggleFullscreen={onToggleFullscreen}
        isFullscreen={isFullscreen}
        onNavigateBack={onNavigateBack}
        onOpenKeypad={onOpenKeypad}
        onOpenKeypadForQty={onOpenKeypadForQty}
      />
    );
  }

  return (
    <DefaultGridPOSLayout
      paginatedProducts={paginatedProducts as any}
      showProductImages={showProductImages}
      posSettings={posSettings}
      onAddProduct={onAddToCart}
      viewMode={viewMode}
      onOpenAddProduct={onOpenAddProduct}
      currentPage={currentPage}
      totalPages={totalPages}
      setCurrentPage={setCurrentPage}
      posLayout={posLayout}
      cart={cart}
      saleSummary={saleSummary}
      isSessionOpen={isSessionOpen}
      isSalePending={isSalePending}
      suspendedCount={suspendedCount}
      autoPrintReceipt={autoPrintReceipt}
      onSettleSale={onSettleSale}
      onSuspendSale={onSuspendSale}
      onOpenSuspended={onOpenSuspended}
      onClearCart={onClearCart}
      onOpenReturns={onOpenReturns}
      onToggleAutoPrint={onToggleAutoPrint}
      onOpenDiscount={onOpenDiscount}
      onSaveAsProforma={onSaveAsProforma}
      onSaveAsOrder={onSaveAsOrder}
      mobileTab={mobileTab}
      setMobileTab={setMobileTab}
      selectedCustomer={selectedCustomer}
      setSelectedCustomer={setSelectedCustomer}
      customers={customers}
      selectedCustomerObj={selectedCustomerObj}
      onOpenCustomerSelect={onOpenCustomerSelect}
      onOpenAddCustomer={onOpenAddCustomer}
      isWholesaleActive={isWholesaleActive}
      selectedItemId={selectedItemId}
      setSelectedItemId={setSelectedItemId}
      onUpdateQty={onUpdateQty}
      editingPriceFor={editingPriceFor}
      setEditingPriceFor={setEditingPriceFor}
      priceInput={priceInput}
      setPriceInput={setPriceInput}
      onUpdatePrice={onUpdatePrice}
      onRemoveItem={onRemoveItem}
      formatNumber={formatNumber}
      formatMoney={formatMoney}
    />
  );
};
