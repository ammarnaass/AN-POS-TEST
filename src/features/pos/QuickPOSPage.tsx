import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { usePOSSessionStore } from '@/features/pos/store/usePOSSessionStore';
import { calculateSaleTotal } from '@/services';
import type { Product, CartItem } from '@/types';
import { Zap, ShoppingCart } from 'lucide-react';
import { formatMoney } from './utils/format';

// Domain Services, Hooks & Types
import {
  useQuickPOSData,
  useQuickPOSScanner,
  useQuickPOSSuspendedOrders,
  useQuickPOSCheckout,
  playQuickPOSBeep,
  calculateTotalPieces,
  type QuickPOSMobileTab,
} from './quick';

// Decomposed Subcomponents
import {
  QuickPOSHeader,
  QuickPOSCart,
  QuickPOSCatalog,
  QuickPOSModals,
} from './quick';

import { usePOSKeyboardShortcuts } from './hooks/usePOSKeyboardShortcuts';

export default function QuickPOSPage() {
  const navigate = useNavigate();
  const { items: cart, addItem, removeItem, updateQty, clear: clearCart } = useCartStore();
  const { user: currentUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { open: openSidebar } = useSidebarStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Zustand POS Session Store
  const selectedCustomer = usePOSSessionStore((s) => s.selectedCustomer);
  const setSelectedCustomer = usePOSSessionStore((s) => s.setSelectedCustomer);
  const discount = usePOSSessionStore((s) => s.discount);
  const setDiscount = usePOSSessionStore((s) => s.setDiscount);
  const discountType = usePOSSessionStore((s) => s.discountType);
  const setDiscountType = usePOSSessionStore((s) => s.setDiscountType);
  const paymentMethod = usePOSSessionStore((s) => s.paymentMethod);
  const setPaymentMethod = usePOSSessionStore((s) => s.setPaymentMethod);
  const autoPrintReceipt = usePOSSessionStore((s) => s.autoPrintReceipt);
  const setAutoPrintReceipt = usePOSSessionStore((s) => s.setAutoPrintReceipt);

  // Local UI States
  const [mobileTab, setMobileTab] = useState<QuickPOSMobileTab>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals Visibility State
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showFreeProductModal, setShowFreeProductModal] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Data Layer Hook
  const {
    products,
    packs,
    categories,
    customers,
    allSessions,
    currentSession,
    isSessionOpen,
    suspendedOrders,
    settingsOrDefault,
  } = useQuickPOSData();

  // 2. Calculations
  const saleSummary = useMemo(() => {
    return calculateSaleTotal(cart, discount, discountType, settingsOrDefault.tvaRate);
  }, [cart, discount, discountType, settingsOrDefault.tvaRate]);

  const totalPiecesCount = useMemo(() => {
    return calculateTotalPieces(cart);
  }, [cart]);

  // Auto-reset payment method to cash if disabled in settings
  useEffect(() => {
    if (paymentMethod === 'card' && !settingsOrDefault.allowCardPayment) {
      setPaymentMethod('cash');
    } else if (paymentMethod === 'transfer' && !settingsOrDefault.allowTransferPayment) {
      setPaymentMethod('cash');
    }
  }, [paymentMethod, settingsOrDefault.allowCardPayment, settingsOrDefault.allowTransferPayment, setPaymentMethod]);

  // Sync cash tendered with total if 0
  useEffect(() => {
    if (cashTendered === 0 && saleSummary.total > 0) {
      setCashTendered(saleSummary.total);
    }
  }, [saleSummary.total, cashTendered]);

  // 3. Checkout Hook (ACID, Thermal Receipt, Notifications)
  const {
    handleQuickPay,
    isSalePending,
    completedSale,
    showSuccessModal,
    setShowSuccessModal,
  } = useQuickPOSCheckout({
    cart,
    clearCart,
    discount,
    setDiscount,
    discountType,
    selectedCustomer,
    setSelectedCustomer,
    paymentMethod,
    autoPrintReceipt,
    settingsOrDefault,
    currentSession,
    isSessionOpen,
    products,
    packs,
    customers,
    currentUser,
    setCashTendered,
    onOpenSessionWarning: () => setShowOpenSessionModal(true),
    addNotification,
  });

  // 4. Suspended Orders Hook
  const {
    handleHoldSale,
    handleRestoreHeldSale,
    handleDeleteHeldSale,
  } = useQuickPOSSuspendedOrders({
    cart,
    clearCart,
    addItem,
    setSelectedCustomer,
    setDiscount,
    setDiscountType,
    addNotification,
  });

  const onHoldCurrentSale = useCallback(() => {
    handleHoldSale(selectedCustomer, discount, discountType, customers, currentUser?.name);
  }, [handleHoldSale, selectedCustomer, discount, discountType, customers, currentUser?.name]);

  // 5. Barcode Scanner Hook (USB + Mobile SSE + 400ms Debounce)
  const { handleBarcodeScan } = useQuickPOSScanner({
    products,
    packs,
    allowNegativeStock: settingsOrDefault.allowNegativeStock,
    addItem,
    playBeep: () => playQuickPOSBeep(soundEnabled),
    onClearSearch: () => setSearchQuery(''),
    addNotification,
  });

  // 6. User Interactions
  const handleAddProduct = useCallback(
    (product: Product) => {
      addItem({
        productId: product.id,
        name: product.name,
        barcode: product.barcode || '',
        unitPrice: product.retailPrice,
        qty: 1,
        lineTotal: product.retailPrice,
      });
      playQuickPOSBeep(soundEnabled);
    },
    [addItem, soundEnabled]
  );

  // Focus search bar on mount, after cart changes, and modal closes
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [cart.length, showSuccessModal]);

  // Search filter
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'all') {
      list = list.filter((p) => {
        const cat = typeof p.category === 'object' && p.category !== null ? (p.category as any).name : p.category;
        return cat === selectedCategory || (p as any).categoryId === selectedCategory;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  // Search input Enter key handler
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && searchQuery.trim()) {
        e.preventDefault();
        const query = searchQuery.trim();

        const exactProduct = products.find(
          (p) => (p.barcode && p.barcode.trim() === query) || (p.sku && p.sku.trim() === query)
        );
        const exactPack = packs.find(
          (pk: any) => pk.barcode && pk.barcode.trim() === query
        );

        if (exactProduct || exactPack) {
          handleBarcodeScan(query);
        } else if (filteredProducts.length === 1) {
          handleBarcodeScan(filteredProducts[0].barcode || filteredProducts[0].name);
        } else {
          handleBarcodeScan(query);
        }
      }
    },
    [searchQuery, filteredProducts, products, packs, handleBarcodeScan]
  );

  // 7. Global Keyboard Shortcuts Listener (F1 - F12)
  usePOSKeyboardShortcuts({
    cart,
    selectedItemId: null,
    isSessionOpen,
    total: saleSummary.total,
    isAnyModalOpen:
      showSuccessModal ||
      showAddCustomerModal ||
      showHeldSalesModal ||
      showShortcutsModal ||
      showFreeProductModal ||
      showOpenSessionModal,
    isPaymentModalOpen: false,
    isSuccessModalOpen: showSuccessModal,
    onCloseAllModals: () => {
      setShowSuccessModal(false);
      setShowAddCustomerModal(false);
      setShowHeldSalesModal(false);
      setShowShortcutsModal(false);
      setShowFreeProductModal(false);
      setShowOpenSessionModal(false);
    },
    onCloseSuccessModal: () => {
      setShowSuccessModal(false);
      searchInputRef.current?.focus();
    },
    onOpenPayment: handleQuickPay,
    onSuspendSale: onHoldCurrentSale,
    onOpenSuspended: () => setShowHeldSalesModal(true),
    onClearCart: () => {
      clearCart();
      setSelectedCustomer('');
      setDiscount(0);
      setCashTendered(0);
    },
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
    onOpenAddCustomer: () => setShowAddCustomerModal(true),
    onFocusSearch: () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    onOpenFreeProduct: () => setShowFreeProductModal(true),
    onOpenReturns: () => navigate('/sales'),
    onOpenOpenSession: () => setShowOpenSessionModal(true),
    onOpenSessionWarning: () => setShowOpenSessionModal(true),
    onOpenShortcuts: () => setShowShortcutsModal(true),
    onUpdateQty: (item, newQty) => updateQty(item.productId, newQty),
    onRemoveItem: removeItem,
    addNotification,
  });

  return (
    <div className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans h-screen flex flex-col overflow-hidden select-none">
      {/* 1. TOP HEADER */}
      <QuickPOSHeader
        shopName={settingsOrDefault.shopName}
        cartCount={cart.length}
        totalPiecesCount={totalPiecesCount}
        totalAmount={saleSummary.total}
        appliedDiscount={saleSummary.discountAmount}
        baseCurrency={settingsOrDefault.baseCurrency}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        autoPrintReceipt={autoPrintReceipt}
        onToggleAutoPrint={() => setAutoPrintReceipt(!autoPrintReceipt)}
        onNavigateHome={() => navigate('/')}
        onNavigateAdvancedPOS={() => navigate('/pos')}
        onOpenSidebar={openSidebar}
        theme={theme}
        onToggleTheme={toggleTheme}
        cashierName={currentUser?.name || 'محمد العربي'}
        terminalName={currentSession ? `#POS-${currentSession.id.slice(-2)}` : '#POS-01'}
      />

      {/* MOBILE VIEW SWITCHER */}
      <div className="md:hidden flex items-center bg-white dark:bg-slate-900 p-1 mx-3 my-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0 gap-1 shadow-2xs">
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'catalog'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>الأصناف ({products.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'cart'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>السلة ({cart.length})</span>
          {cart.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-white text-[10px] font-mono font-bold">
              {formatMoney(saleSummary?.total)} دج
            </span>
          )}
        </button>
      </div>

      {/* 2. MAIN CONTENT LAYOUT */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* In RTL: Child 1 renders on the RIGHT (Cashier Cart) */}
        <QuickPOSCart
          cart={cart}
          onUpdateQty={updateQty}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
          onHoldSale={onHoldCurrentSale}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          onOpenAddCustomerModal={() => setShowAddCustomerModal(true)}
          paymentMethod={paymentMethod}
          onSelectPaymentMethod={setPaymentMethod}
          allowCardPayment={settingsOrDefault.allowCardPayment}
          allowTransferPayment={settingsOrDefault.allowTransferPayment}
          cashTendered={cashTendered}
          onChangeCashTendered={setCashTendered}
          saleSummary={saleSummary}
          onQuickPay={handleQuickPay}
          isSalePending={isSalePending}
          mobileTab={mobileTab}
          onSwitchMobileTab={setMobileTab}
          baseCurrency={settingsOrDefault.baseCurrency}
        />

        {/* In RTL: Child 2 renders on the LEFT (Product Catalog) */}
        <QuickPOSCatalog
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClear={() => {
            setSearchQuery('');
            searchInputRef.current?.focus();
          }}
          searchInputRef={searchInputRef}
          onSearchKeyDown={handleSearchKeyDown}
          suspendedOrdersCount={suspendedOrders.length}
          onOpenHeldSales={() => setShowHeldSalesModal(true)}
          onOpenNewProduct={() => setShowFreeProductModal(true)}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          totalProductsCount={products.length}
          filteredProducts={filteredProducts}
          onAddProduct={handleAddProduct}
          mobileTab={mobileTab}
          baseCurrency={settingsOrDefault.baseCurrency}
        />
      </main>

      {/* 3. SHARED MODALS */}
      <QuickPOSModals
        showSuccessModal={showSuccessModal}
        onCloseSuccessModal={() => {
          setShowSuccessModal(false);
          searchInputRef.current?.focus();
        }}
        completedSale={completedSale}
        showHeldSalesModal={showHeldSalesModal}
        onCloseHeldSalesModal={() => setShowHeldSalesModal(false)}
        suspendedOrders={suspendedOrders}
        onResumeOrder={(orderId) => {
          const order = suspendedOrders.find((o: any) => o.id === orderId);
          if (order) handleRestoreHeldSale(order, () => setShowHeldSalesModal(false));
        }}
        onDeleteOrder={handleDeleteHeldSale}
        showAddCustomerModal={showAddCustomerModal}
        onCloseAddCustomerModal={() => setShowAddCustomerModal(false)}
        onSelectCustomer={(id) => {
          setSelectedCustomer(id);
          setShowAddCustomerModal(false);
        }}
        showOpenSessionModal={showOpenSessionModal}
        onCloseOpenSessionModal={() => setShowOpenSessionModal(false)}
        allSessionsCount={allSessions.length}
        showFreeProductModal={showFreeProductModal}
        onCloseFreeProductModal={() => setShowFreeProductModal(false)}
        onAddCustomItem={(item: CartItem) => {
          addItem(item);
          setShowFreeProductModal(false);
          addNotification({
            title: 'تمت إضافة منتج حر',
            message: `${item.name} بمبلغ ${formatMoney(item.unitPrice)} دج`,
            type: 'success',
          });
        }}
        showShortcutsModal={showShortcutsModal}
        onCloseShortcutsModal={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
