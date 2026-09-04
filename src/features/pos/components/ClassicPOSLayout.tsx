import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { CartItem, Product, Category } from '@/types';
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
}

const MAX_QUICK_PRODUCTS = 60;

export const ClassicPOSLayout: React.FC<ClassicPOSLayoutProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
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
  userName = 'Admin',
  storeName = 'AN POS',
  isSessionOpen,
  isSalePending,
  onOpenKeypad,
  onOpenKeypadForQty,
  onSaveAsProforma,
  onSaveAsOrder,
}) => {
  const [selectedCartRowId, setSelectedCartRowId] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Keep barcode input focused for direct scanning
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [cart.length]);

  // Handle keyboard shortcuts (Ctrl+D to delete selected item, Delete key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'd') || e.key === 'Delete') {
        if (selectedCartRowId) {
          e.preventDefault();
          onRemoveFromCart(selectedCartRowId);
          setSelectedCartRowId(null);
        } else if (cart.length > 0) {
          e.preventDefault();
          onRemoveFromCart(cart[cart.length - 1].productId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCartRowId, cart, onRemoveFromCart]);

  const handleDeleteSelectedOrLast = useCallback(() => {
    if (selectedCartRowId) {
      onRemoveFromCart(selectedCartRowId);
      setSelectedCartRowId(null);
    } else if (cart.length > 0) {
      onRemoveFromCart(cart[cart.length - 1].productId);
    }
  }, [selectedCartRowId, cart, onRemoveFromCart]);

  // Total items and quantity count
  const totalItemsCount = cart.length;
  const totalUnitsCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  // Fast O(1) barcode lookup map for cart rows (using allProducts when available)
  const productBarcodeMap = useMemo(() => {
    const list = allProducts || products;
    const map = new Map<string, string>();
    for (const p of list) {
      if (p.id && p.barcode) map.set(p.id, p.barcode);
    }
    return map;
  }, [allProducts, products]);

  // Quick products to display
  const displayedProducts = useMemo(
    () => products.slice(0, MAX_QUICK_PRODUCTS),
    [products]
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/40 select-none text-on-surface">
      {/* 1. TOP SECTION: ACTION BUTTONS TOOLBAR + LED DIGITAL DISPLAY */}
      <ClassicPOSTopBar
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
        totalAmount={saleSummary.total}
        totalItemsCount={totalItemsCount}
        totalUnitsCount={totalUnitsCount}
        currency={currency}
        formatMoney={formatMoney}
        onOpenKeypad={onOpenKeypad}
        onSaveAsProforma={onSaveAsProforma}
        onSaveAsOrder={onSaveAsOrder}
      />

      {/* 2. BARCODE & PRODUCT SEARCH BAR */}
      <ClassicPOSSearchBar
        barcodeInputRef={barcodeInputRef}
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        onBarcodeSubmit={onBarcodeSubmit}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 3. CENTER: THE CLASSIC CART TABLE */}
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
      />

      {/* 4. BOTTOM SECTION: QUICK ITEMS GRID & CATEGORIES */}
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
      />
    </div>
  );
};

export default ClassicPOSLayout;
