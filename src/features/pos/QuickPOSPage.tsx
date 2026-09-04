import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { usePOSSessionStore } from '@/features/pos/store/usePOSSessionStore';
import { useBarcodeScanner } from '@/features/barcode/useBarcodeScanner';
import { useSaleCompletion } from '@/features/pos/hooks/useSaleCompletion';
import { calculateSaleTotal } from '@/services';
import { printDocument } from '@/services/print/printService';
import { generateId } from '@/utils';
import type { Product, Customer, Sale, CartItem } from '@/types';
import { Zap, ShoppingCart } from 'lucide-react';

// Subcomponents
import { QuickPOSHeader } from './quick/components/QuickPOSHeader';
import { QuickPOSCatalog } from './quick/components/QuickPOSCatalog';
import { QuickPOSCart } from './quick/components/QuickPOSCart';

// Shared Modals
import {
  SuccessModal,
  SuspendedOrdersModal,
  QuickCustomerModal,
  OpenSessionModal,
  FreeProductModal,
  ShortcutsGuideModal,
} from './modals';
import { formatMoney } from './utils/format';

export default function QuickPOSPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals visibility
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showFreeProductModal, setShowFreeProductModal] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search bar on mount and after cart updates
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [cart.length, showSuccessModal]);

  // Audio Beep
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio not supported
    }
  }, [soundEnabled]);

  // Database Queries
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const list = await db.products.toArray();
      return list.filter((p: Product) => p.status === 'active' || !p.status);
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: packs = [] } = useQuery({
    queryKey: ['packs'],
    queryFn: () => db.packs.toArray(),
  });

  const { data: rawCategories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const [cats, prods] = await Promise.all([
          db.categories.toArray().catch(() => []),
          db.products.toArray().catch(() => []),
        ]);
        const all = new Set<string>();
        if (Array.isArray(cats)) {
          cats.forEach((c: any) => {
            const name = typeof c === 'object' && c !== null ? c.name : c;
            if (name && typeof name === 'string' && name.trim()) all.add(name.trim());
          });
        }
        if (Array.isArray(prods)) {
          prods.forEach((p: any) => {
            const cat = typeof p.category === 'object' && p.category !== null ? p.category.name : p.category;
            if (cat && typeof cat === 'string' && cat.trim()) all.add(cat.trim());
          });
        }
        return Array.from(all);
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(rawCategories)) {
      rawCategories.forEach((c: any) => {
        const name = typeof c === 'object' && c !== null ? c.name : c;
        if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
      });
    }
    if (Array.isArray(products)) {
      products.forEach((p: any) => {
        const cat = typeof p.category === 'object' && p.category !== null ? p.category.name : p.category;
        if (cat && typeof cat === 'string' && cat.trim()) set.add(cat.trim());
      });
    }
    return Array.from(set);
  }, [rawCategories, products]);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => db.customers.toArray(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });

  const currentSession = useMemo(() => {
    return allSessions.find((s: any) => s.status === 'open') || null;
  }, [allSessions]);

  const isSessionOpen = currentSession !== null;

  const { data: suspendedOrders = [] } = useQuery({
    queryKey: ['suspendedOrders'],
    queryFn: () => db.suspended_orders.toArray(),
  });

  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
    staleTime: 1000 * 60 * 10,
  });

  const settingsOrDefault = useMemo(() => ({
    tvaRate: Number(rawSettings?.tvaRate ?? (rawSettings as any)?.tva_rate ?? 0),
    invoicePrefix: rawSettings?.invoicePrefix ?? 'INV-',
    baseCurrency: rawSettings?.baseCurrency ?? 'دج',
    shopName: rawSettings?.shopName ?? 'AN POS',
    phone: rawSettings?.phone ?? '',
    receiptFooter: rawSettings?.receiptFooter ?? 'شكراً لزيارتكم',
    allowNegativeStock: rawSettings?.allowNegativeStock ?? true,
    allowCardPayment: Boolean((rawSettings as any)?.allowCardPayment ?? false),
    allowTransferPayment: Boolean((rawSettings as any)?.allowTransferPayment ?? false),
  }), [rawSettings]);

  // Auto-reset payment method to cash if disabled in settings
  useEffect(() => {
    if (paymentMethod === 'card' && !settingsOrDefault.allowCardPayment) {
      setPaymentMethod('cash');
    } else if (paymentMethod === 'transfer' && !settingsOrDefault.allowTransferPayment) {
      setPaymentMethod('cash');
    }
  }, [paymentMethod, settingsOrDefault.allowCardPayment, settingsOrDefault.allowTransferPayment, setPaymentMethod]);

  // Sale Calculations
  const saleSummary = useMemo(() => {
    return calculateSaleTotal(cart, discount, discountType, settingsOrDefault.tvaRate);
  }, [cart, discount, discountType, settingsOrDefault.tvaRate]);

  // Sync cash tendered with total if 0
  useEffect(() => {
    if (cashTendered === 0 && saleSummary.total > 0) {
      setCashTendered(saleSummary.total);
    }
  }, [saleSummary.total, cashTendered]);

  const handleAddProduct = useCallback((product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      unitPrice: product.retailPrice,
      qty: 1,
      lineTotal: product.retailPrice,
    });
    playBeep();
  }, [addItem, playBeep]);

  const handleBarcodeScan = useCallback((code: string) => {
    const cleanCode = code.trim().toLowerCase();
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === cleanCode) ||
        (p.sku && p.sku.toLowerCase() === cleanCode) ||
        p.name.toLowerCase() === cleanCode
    );

    if (found) {
      handleAddProduct(found);
      setSearchQuery('');
      playBeep();
    } else {
      addNotification({
        title: 'المنتج غير موجود',
        message: `لم يتم العثور على باركود: ${code}`,
        type: 'warning',
      });
    }
  }, [products, handleAddProduct, playBeep, addNotification]);

  // Barcode Scanner Listener
  useBarcodeScanner({
    onScan: (barcode) => {
      handleBarcodeScan(barcode);
    },
  });

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

  // Sale Completion Hook (Atomic ACID)
  const { completeSale, isPending: isSalePending } = useSaleCompletion(
    settingsOrDefault,
    (sale) => {
      setCompletedSale(sale);
      setShowSuccessModal(true);
      clearCart();
      setDiscount(0);
      setCashTendered(0);
      setSelectedCustomer('');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });

      if (autoPrintReceipt) {
        printDocument(sale.id, 'thermal-receipt', {
          userId: currentUser?.id || '',
          userName: currentUser?.name || '',
          copies: 1,
        });
      }

      addNotification({
        title: 'تم تسجيل البيع السريع بنجاح',
        message: `فاتورة #${sale.number} بمبلغ ${formatMoney(sale.total)} دج`,
        type: 'success',
      });
    }
  );

  // Quick Pay Trigger
  const handleQuickPay = useCallback(() => {
    if (cart.length === 0 || isSalePending) return;
    if (!isSessionOpen) {
      setShowOpenSessionModal(true);
      return;
    }
    if (paymentMethod === 'credit' && !selectedCustomer) {
      addNotification({
        title: 'تنبيه العميل',
        message: 'يجب اختيار زبون مسجل لعملية البيع بالآجل (الديون).',
        type: 'warning',
      });
      return;
    }

    completeSale({
      cart,
      discount,
      discountType,
      selectedCustomer,
      paymentMethod: paymentMethod === 'credit' ? 'credit' : 'cash',
      isReturn: false,
      currentSession,
      settings: settingsOrDefault,
      products: products as any[],
      packs: packs as any[],
      customers: customers as any[],
    });
  }, [
    cart,
    isSalePending,
    isSessionOpen,
    paymentMethod,
    selectedCustomer,
    completeSale,
    discount,
    discountType,
    currentSession,
    settingsOrDefault,
    products,
    packs,
    customers,
    addNotification,
  ]);

  // Hold Sale
  const handleHoldSale = useCallback(() => {
    if (cart.length === 0) return;
    const newOrder = {
      id: generateId(),
      items: cart.map((it) => ({
        productId: it.productId,
        name: it.name,
        qty: it.qty,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
        isCustom: it.isCustom,
        isPack: it.isPack,
        packId: it.packId,
        batchNumber: it.batchNumber,
      })),
      customerId: selectedCustomer,
      discount,
      discountType,
      createdAt: new Date().toISOString(),
      note: '',
      createdBy: currentUser?.name || '',
    };

    db.suspended_orders.add(newOrder).then(() => {
      queryClient.invalidateQueries({ queryKey: ['suspendedOrders'] });
      clearCart();
      setSelectedCustomer('');
      setDiscount(0);
      addNotification({
        title: 'تم تعليق البيع',
        message: `تم حفظ ${cart.length} أصناف في الفواتير المعلقة`,
        type: 'info',
      });
    });
  }, [cart, selectedCustomer, discount, discountType, currentUser?.name, clearCart, setSelectedCustomer, setDiscount, queryClient, addNotification]);

  // Restore Held Sale
  const handleRestoreHeldSale = useCallback((order: any) => {
    clearCart();
    for (const item of order.items) {
      addItem({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        isCustom: item.isCustom,
        isPack: item.isPack,
        packId: item.packId,
        batchNumber: item.batchNumber,
      });
    }
    setSelectedCustomer(order.customerId || '');
    setDiscount(order.discount || 0);
    setDiscountType(order.discountType || 'percent');
    db.suspended_orders.delete(order.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ['suspendedOrders'] });
    });
    setShowHeldSalesModal(false);
    addNotification({ title: 'تم استرجاع الفاتورة', message: 'تم تحميل الأصناف للسلة', type: 'success' });
  }, [clearCart, addItem, setSelectedCustomer, setDiscount, setDiscountType, queryClient, addNotification]);

  // Keyboard Shortcuts Listener (F1 - F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuccessModal(false);
        setShowAddCustomerModal(false);
        setShowHeldSalesModal(false);
        setShowShortcutsModal(false);
        setShowFreeProductModal(false);
        setShowOpenSessionModal(false);
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && e.target === searchInputRef.current && searchQuery.trim()) {
          e.preventDefault();
          if (filteredProducts.length === 1) {
            handleAddProduct(filteredProducts[0]);
            setSearchQuery('');
          } else {
            handleBarcodeScan(searchQuery);
          }
          return;
        }
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          if (cart.length > 0) {
            clearCart();
            setSelectedCustomer('');
            setDiscount(0);
            setCashTendered(0);
            addNotification({
              title: 'إفراغ السلة (F1)',
              message: 'تم تفريغ سلة المبيعات بالكامل',
              type: 'info',
            });
          }
          break;

        case 'F2':
          e.preventDefault();
          if (cart.length > 0) {
            handleHoldSale();
          } else {
            addNotification({
              title: 'السلة فارغة',
              message: 'أضف منتجات أولاً لحفظ السلة كمسودة (F2)',
              type: 'warning',
            });
          }
          break;

        case 'F3':
          e.preventDefault();
          setShowHeldSalesModal(true);
          break;

        case 'F4':
          e.preventDefault();
          navigate('/sales');
          break;

        case 'F5':
          e.preventDefault();
          setAutoPrintReceipt(!autoPrintReceipt);
          addNotification({
            title: !autoPrintReceipt ? 'الطباعة التلقائية: مفعلة (F5)' : 'الطباعة التلقائية: معطلة (F5)',
            message: !autoPrintReceipt ? 'سيتم طباعة الوصل تلقائياً عند إتمام الدفع' : 'تم إيقاف الطباعة التلقائية',
            type: 'info',
          });
          break;

        case 'F6':
          e.preventDefault();
          if (categories.length > 0) {
            setSelectedCategory((prev) => {
              if (prev === 'all') return categories[0] || 'all';
              const currIdx = categories.indexOf(prev);
              if (currIdx === -1 || currIdx === categories.length - 1) return 'all';
              return categories[currIdx + 1];
            });
          }
          break;

        case 'F7':
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
          break;

        case 'F8':
          e.preventDefault();
          setShowFreeProductModal(true);
          break;

        case 'F9':
        case 'F10':
          e.preventDefault();
          navigate('/sales');
          break;

        case 'F12':
          e.preventDefault();
          if (cart.length > 0) {
            const lastItem = cart[cart.length - 1];
            const newQtyStr = prompt(`أدخل الكمية الجديدة لـ (${lastItem.name}):`, lastItem.qty.toString());
            if (newQtyStr) {
              const q = parseFloat(newQtyStr);
              if (!isNaN(q) && q > 0) updateQty(lastItem.productId, q);
            }
          }
          break;

        case '?':
          e.preventDefault();
          setShowShortcutsModal(true);
          break;

        case 'Delete': {
          e.preventDefault();
          if (cart.length > 0) {
            removeItem(cart[cart.length - 1].productId);
          }
          break;
        }

        case '+':
        case '=': {
          e.preventDefault();
          if (cart.length > 0) {
            const lastItem = cart[cart.length - 1];
            updateQty(lastItem.productId, lastItem.qty + 1);
          }
          break;
        }

        case '-':
        case '_': {
          e.preventDefault();
          if (cart.length > 0) {
            const lastItem = cart[cart.length - 1];
            updateQty(lastItem.productId, Math.max(1, lastItem.qty - 1));
          }
          break;
        }

        case 'Enter':
          if (!showSuccessModal && !showAddCustomerModal && !showHeldSalesModal && !showFreeProductModal && !showOpenSessionModal && cart.length > 0) {
            if (!(e.target instanceof HTMLInputElement) || e.target === searchInputRef.current) {
              e.preventDefault();
              handleQuickPay();
            }
          } else if (showSuccessModal) {
            e.preventDefault();
            setShowSuccessModal(false);
            searchInputRef.current?.focus();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    searchQuery,
    filteredProducts,
    showSuccessModal,
    showAddCustomerModal,
    showHeldSalesModal,
    showShortcutsModal,
    showFreeProductModal,
    showOpenSessionModal,
    categories,
    autoPrintReceipt,
    setAutoPrintReceipt,
    handleQuickPay,
    handleHoldSale,
    handleAddProduct,
    handleBarcodeScan,
    clearCart,
    setSelectedCustomer,
    setDiscount,
    navigate,
    addNotification,
    updateQty,
    removeItem,
  ]);

  return (
    <div className="flex flex-col h-screen w-full bg-surface-container-lowest text-on-surface select-none overflow-hidden font-sans">
      {/* 1. TOP HEADER */}
      <QuickPOSHeader
        shopName={settingsOrDefault.shopName}
        cartCount={cart.length}
        totalAmount={saleSummary.total}
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
      />

      {/* MOBILE VIEW SWITCHER */}
      <div className="md:hidden flex items-center bg-surface-container/90 p-1 mx-3 my-1.5 rounded-2xl border border-outline-variant/20 shrink-0 gap-1 shadow-xs">
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'catalog'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>الأصناف ({products.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'cart'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
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

      {/* 2. BODY SPLIT */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <QuickPOSCatalog
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClear={() => {
            setSearchQuery('');
            searchInputRef.current?.focus();
          }}
          searchInputRef={searchInputRef}
          suspendedOrdersCount={suspendedOrders.length}
          onOpenHeldSales={() => setShowHeldSalesModal(true)}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          totalProductsCount={products.length}
          filteredProducts={filteredProducts}
          onAddProduct={handleAddProduct}
          mobileTab={mobileTab}
        />

        <QuickPOSCart
          cart={cart}
          onUpdateQty={updateQty}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
          onHoldSale={handleHoldSale}
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
      </div>

      {/* 3. SHARED MODALS */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          searchInputRef.current?.focus();
        }}
        completedSale={completedSale}
      />

      <SuspendedOrdersModal
        isOpen={showHeldSalesModal}
        onClose={() => setShowHeldSalesModal(false)}
        orders={suspendedOrders}
        onResumeOrder={(orderId) => {
          const order = suspendedOrders.find((o: any) => o.id === orderId);
          if (order) handleRestoreHeldSale(order);
        }}
      />

      <QuickCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onSelectCustomer={(id) => {
          setSelectedCustomer(id);
          setShowAddCustomerModal(false);
        }}
      />

      <OpenSessionModal
        isOpen={showOpenSessionModal}
        onClose={() => setShowOpenSessionModal(false)}
        existingSessionsCount={allSessions.length}
      />

      <FreeProductModal
        isOpen={showFreeProductModal}
        onClose={() => setShowFreeProductModal(false)}
        onAddCustomItem={(item: CartItem) => {
          addItem(item);
          setShowFreeProductModal(false);
          addNotification({
            title: 'تمت إضافة منتج حر',
            message: `${item.name} بمبلغ ${formatMoney(item.unitPrice)} دج`,
            type: 'success',
          });
        }}
      />

      <ShortcutsGuideModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
