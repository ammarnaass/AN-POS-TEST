import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useBarcodeScanner } from '@/features/barcode/useBarcodeScanner';
import { useSaleCompletion } from '@/features/pos/hooks/useSaleCompletion';
import { calculateSaleTotal } from '@/services';
import { printDocument } from '@/services/print/printService';
import { generateId } from '@/utils';
import type { Product, Customer, Sale } from '@/types';
import {
  Zap,
  ShoppingCart,
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  CreditCard,
  Banknote,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  PauseCircle,
  PlayCircle,
  UserPlus,
  X,
  Volume2,
  VolumeX,
  HelpCircle,
  Clock,
  Layers,
  ArrowLeftRight,
  UserCheck,
  Percent,
  Wallet,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

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

export default function QuickPOSPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items: cart, addItem, removeItem, updateQty, updatePrice, clear: clearCart } = useCartStore();
  const { user: currentUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  // States
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'credit'>('cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);

  // Modals & UI
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showFreeProductModal, setShowFreeProductModal] = useState(false);
  const [freeProductName, setFreeProductName] = useState('');
  const [freeProductPrice, setFreeProductPrice] = useState<number>(0);
  const [freeProductQty, setFreeProductQty] = useState<number>(1);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search bar permanently on mount and after actions
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [cart.length, showSuccessModal]);

  // Audio Beep
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  };

  // Queries
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const list = await db.products.toArray();
      return list.filter((p) => p.status === 'active' || !p.status);
    },
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
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });

  const currentSession = useMemo(() => {
    return allSessions.find((s) => s.status === 'open') || null;
  }, [allSessions]);

  const isSessionOpen = currentSession !== null;

  const { data: suspendedOrders = [] } = useQuery({
    queryKey: ['suspendedOrders'],
    queryFn: () => db.suspended_orders.toArray(),
  });

  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
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

  // Auto-reset payment method to cash if currently selected method is disabled in settings
  useEffect(() => {
    if (paymentMethod === 'card' && !settingsOrDefault.allowCardPayment) {
      setPaymentMethod('cash');
    } else if (paymentMethod === 'transfer' && !settingsOrDefault.allowTransferPayment) {
      setPaymentMethod('cash');
    }
  }, [paymentMethod, settingsOrDefault.allowCardPayment, settingsOrDefault.allowTransferPayment]);

  // Sale Calculations
  const saleSummary = useMemo(() => {
    return calculateSaleTotal(cart, discount, discountType, settingsOrDefault.tvaRate);
  }, [cart, discount, discountType, settingsOrDefault.tvaRate]);

  // Sync cash tendered with total if 0
  useEffect(() => {
    if (cashTendered === 0 && saleSummary.total > 0) {
      setCashTendered(saleSummary.total);
    }
  }, [saleSummary.total]);

  const changeDue = Math.max(0, cashTendered - saleSummary.total);
  const isPaidSufficient = cashTendered >= saleSummary.total;

  // Barcode Scanner Listener
  useBarcodeScanner({
    onScan: (barcode) => {
      handleBarcodeScan(barcode);
    },
  });

  const handleBarcodeScan = (code: string) => {
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
  };

  const handleAddProduct = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      unitPrice: product.retailPrice,
      costPrice: product.costPrice,
      qty: 1,
    });
    playBeep();
  };

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

  // Sale Completion Hook
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
        printDocument(sale.id, 'thermal-receipt', { copies: 1 });
      }

      addNotification({
        title: 'تم تسجيل البيع السريع بنجاح',
        message: `فاتورة #${sale.number} بمبلغ ${formatMoney(sale.total)} دج`,
        type: 'success',
      });
    }
  );

  // Handle Quick Pay
  const handleQuickPay = () => {
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
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Always handle Escape
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
        // شاشة المبيعات
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

        // عمليات سريعة
        case 'F5':
          e.preventDefault();
          setAutoPrintReceipt((prev) => {
            const next = !prev;
            addNotification({
              title: next ? 'الطباعة التلقائية: مفعلة (F5)' : 'الطباعة التلقائية: معطلة (F5)',
              message: next ? 'سيتم طباعة الوصل تلقائياً عند إتمام الدفع' : 'تم إيقاف الطباعة التلقائية',
              type: 'info',
            });
            return next;
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
    isSessionOpen,
    isSalePending,
    categories,
  ]);

  // Hold Sale
  const handleHoldSale = () => {
    if (cart.length === 0) return;
    const newOrder = {
      id: generateId(),
      items: cart.map((it) => ({
        productId: it.productId, name: it.name, qty: it.qty, unitPrice: it.unitPrice, lineTotal: it.lineTotal,
        isCustom: it.isCustom, isPack: it.isPack, packId: it.packId, batchNumber: it.batchNumber,
      })),
      customerId: selectedCustomer, discount, discountType, createdAt: new Date().toISOString(),
      note: '', createdBy: currentUser?.name || '',
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
  };

  // Restore Held Sale
  const handleRestoreHeldSale = (order: any) => {
    clearCart();
    for (const item of order.items) {
      addItem({
        productId: item.productId, name: item.name, qty: item.qty, unitPrice: item.unitPrice,
        lineTotal: item.lineTotal, isCustom: item.isCustom, isPack: item.isPack, packId: item.packId, batchNumber: item.batchNumber,
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
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomer);

  return (
    <div className="flex flex-col h-screen w-full bg-surface-container-lowest text-on-surface select-none overflow-hidden font-sans">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER: High Contrast & Streamlined Fast Bar           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="h-14 px-3 sm:px-4 bg-surface-container border-b border-outline-variant/20 flex items-center justify-between shrink-0 shadow-xs z-20 gap-2">
        
        {/* Left / Start: Brand & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-extrabold shadow-sm shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-extrabold tracking-tight text-on-surface truncate max-w-[100px] sm:max-w-none">
                  {settingsOrDefault.shopName}
                </span>
                <span className="hidden xs:inline px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  ⚡ كاشير سريع
                </span>
              </div>
            </div>
          </div>

          <div className="h-5 w-px bg-outline-variant/25 mx-1 hidden sm:block" />

          {/* Switch to Advanced POS Button */}
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all border border-primary/25 cursor-pointer shadow-2xs shrink-0"
            title="الانتقال إلى نقطة البيع المتقدمة"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">نقطة البيع المتقدمة</span>
            <span className="px-1 py-0.2 text-[9px] bg-primary text-on-primary rounded font-mono">PRO</span>
          </button>
        </div>

        {/* Center: Dominant Total Bar (hidden on very small screens, visible in mobile tab) */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="px-3.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <span className="text-xs font-bold">المجموع ({cart.length} أصناف):</span>
            <span className="text-base sm:text-lg font-black font-mono tracking-tight">
              {formatMoney(saleSummary.total)} {settingsOrDefault.baseCurrency}
            </span>
          </div>
        </div>

        {/* Right / End Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Quick Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 sm:p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title={soundEnabled ? 'صوت التنبيه مفعل' : 'صوت التنبيه معطل'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
          </button>

          {/* Auto Print Receipt Toggle */}
          <button
            onClick={() => setAutoPrintReceipt(!autoPrintReceipt)}
            className={`px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              autoPrintReceipt
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                : 'bg-surface text-on-surface-variant border-outline-variant/20'
            }`}
            title="طباعة الإيصال فورياً عند الدفع"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">طباعة فورية</span>
          </button>

          {/* Clock */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-on-surface-variant font-mono px-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{currentTime.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Exit / Return to Dashboard */}
          <button
            onClick={() => navigate('/')}
            className="p-1.5 sm:p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-red-500 transition-colors"
            title="العودة للوحة التحكم"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MOBILE VIEW SWITCHER (Visible on screens < md)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center bg-surface-container/90 p-1 mx-3 my-1.5 rounded-2xl border border-outline-variant/20 shrink-0 gap-1 shadow-xs">
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. BODY SPLIT: Left Catalog & Right Cart/Tender               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* ──────── LEFT/MAIN PANEL: Rapid Search & Quick Touch Grid ──────── */}
        <div className={`flex-1 flex-col border-l border-outline-variant/15 overflow-hidden bg-surface ${
          mobileTab === 'catalog' ? 'flex' : 'hidden md:flex'
        }`}>
          
          {/* Top Permanent Barcode / Search Box */}
          <div className="p-3 border-b border-outline-variant/15 bg-surface-container-low flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="⚡ امسح الباركود بالكاشف أو اكتب اسم الصنف / الكود (F2)..."
                className="w-full h-11 pr-10 pl-4 bg-surface rounded-xl border-2 border-amber-500/40 focus:border-amber-500 text-sm font-bold text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none">
                <Barcode className="w-5 h-5" />
              </div>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Held Sales Button */}
            {suspendedOrders.length > 0 && (
              <button
                onClick={() => setShowHeldSalesModal(true)}
                className="h-11 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
              >
                <PauseCircle className="w-4 h-4" />
                <span>المعلقة ({suspendedOrders.length})</span>
              </button>
            )}
          </div>

          {/* Quick Categories Bar */}
          <div className="px-3 py-2 bg-surface-container-lowest border-b border-outline-variant/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-scroll shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              الكل ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Rapid Touch Items Grid */}
          <div className="flex-1 p-3 overflow-y-auto custom-scrollbar pb-24 md:pb-3">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-on-surface-variant">
                <Barcode className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm font-bold">لا توجد أصناف مطابقة للبحث</p>
                <p className="text-xs opacity-70 mt-1">امسح الباركود مباشرة للإضافة الفورية</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
                {filteredProducts.slice(0, 36).map((product) => {
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container hover:border-amber-500/50 border border-outline-variant/15 flex flex-col justify-between text-right transition-all duration-150 active:scale-95 shadow-2xs hover:shadow-sm cursor-pointer min-h-[95px] group"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-on-surface line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
                          {product.name}
                        </h4>
                        <span className="text-[10px] text-on-surface-variant font-mono mt-0.5 block truncate">
                          {product.barcode || product.sku || product.category || 'عام'}
                        </span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-outline-variant/10 flex items-center justify-between w-full">
                        <span className="text-xs font-extrabold font-mono text-amber-600 dark:text-amber-400">
                          {formatNumber(product.retailPrice)} دج
                        </span>
                        <div className="w-5 h-5 rounded-md bg-amber-500/15 group-hover:bg-amber-500 text-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
                          <Plus className="w-3 h-3" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ──────── RIGHT PANEL: Cart, Fast Cash Tender & Checkout ──────── */}
        <div className={`w-full md:w-[380px] lg:w-[420px] bg-surface-container flex-col border-r border-outline-variant/20 shadow-md shrink-0 ${
          mobileTab === 'cart' ? 'flex' : 'hidden md:flex'
        }`}>
          
          {/* Mobile Top Bar inside Cart */}
          <div className="md:hidden p-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between shrink-0">
            <button
              onClick={() => setMobileTab('catalog')}
              className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-surface shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
              <span>العودة لاختيار الأصناف</span>
            </button>
            <span className="text-xs font-black text-on-surface">
              السلة ({cart.length} أصناف)
            </span>
          </div>

          {/* Cart Header & Customer */}
          <div className="p-3 border-b border-outline-variant/15 space-y-2 bg-surface-container-high/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-on-surface">سلة الكاشير</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono font-bold">
                  {cart.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleHoldSale}
                  disabled={cart.length === 0}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-amber-600 hover:bg-amber-500/10 disabled:opacity-40 transition-colors flex items-center gap-1"
                  title="تعليق البيع مؤقتاً (F5)"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>تعليق (F5)</span>
                </button>
                <button
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-40 transition-colors flex items-center gap-1"
                  title="تفريغ السلة بالكامل"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تفريغ</span>
                </button>
              </div>
            </div>

            {/* Customer Quick Selector */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="flex-1 h-8 px-2.5 bg-surface border border-outline-variant/20 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">زبون نقدي (افتراضي)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.balance && c.balance > 0 ? `(دين: ${formatNumber(c.balance)} دج)` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="h-8 px-2 rounded-xl bg-surface hover:bg-surface-container-high border border-outline-variant/20 text-amber-600 text-xs font-bold flex items-center gap-1"
                title="إضافة عميل جديد (F4)"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Debtor Warning */}
            {selectedCustomerObj && selectedCustomerObj.balance > 0 && (
              <div className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between">
                <span>ديون سابقة:</span>
                <span className="font-mono">{formatNumber(selectedCustomerObj.balance)} دج</span>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                <ShoppingCart className="w-10 h-10 opacity-20 mb-2" />
                <p className="text-xs font-bold">السلة فارغة</p>
                <p className="text-[10px] opacity-70 mt-0.5">امسح الباركود أو انقر على المنتجات</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={item.productId}
                  className="p-2 rounded-xl bg-surface border border-outline-variant/15 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-on-surface truncate">{item.name}</h5>
                    <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-mono mt-0.5">
                      <span>{formatNumber(item.unitPrice)} دج</span>
                      <span>×</span>
                      <span className="font-bold text-on-surface">{item.qty}</span>
                      <span>=</span>
                      <span className="font-bold text-amber-600">{formatNumber(item.lineTotal)} دج</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-surface-container-low rounded-lg p-0.5 border border-outline-variant/20">
                    <button
                      onClick={() => updateQty(item.productId, item.qty + 1)}
                      className="w-6 h-6 rounded bg-surface hover:bg-amber-500 hover:text-white text-on-surface flex items-center justify-center text-xs font-bold transition-colors"
                    >
                      +
                    </button>
                    <span className="w-7 text-center font-mono font-bold text-xs text-on-surface">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.productId, item.qty - 1)}
                      className="w-6 h-6 rounded bg-surface hover:bg-red-500 hover:text-white text-on-surface flex items-center justify-center text-xs font-bold transition-colors"
                    >
                      -
                    </button>
                  </div>

                  {/* Delete Item */}
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* ──────── FAST TENDER & CHECKOUT ZONE ──────── */}
          <div className="p-3 bg-surface-container-high/60 border-t border-outline-variant/20 space-y-2.5 shrink-0 shadow-lg">
            
            {/* Payment Method Selector */}
            {(() => {
              const availableMethods: { id: 'cash' | 'card' | 'transfer' | 'credit'; label: string; icon: any }[] = [
                { id: 'cash', label: 'نقداً', icon: Banknote },
              ];
              if (settingsOrDefault.allowCardPayment) {
                availableMethods.push({ id: 'card', label: 'بطاقة', icon: CreditCard });
              }
              if (settingsOrDefault.allowTransferPayment) {
                availableMethods.push({ id: 'transfer', label: 'تحويل', icon: ArrowLeftRight });
              }
              availableMethods.push({ id: 'credit', label: 'آجل', icon: UserCheck });

              const gridColsClass =
                availableMethods.length === 2
                  ? 'grid-cols-2'
                  : availableMethods.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-4';

              return (
                <div className={`grid ${gridColsClass} gap-1.5`}>
                  {availableMethods.map((m) => {
                    const Icon = m.icon;
                    const active = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`py-1.5 px-1 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-surface hover:bg-surface-container text-on-surface-variant border-outline-variant/15'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Rapid Cash Tender Buttons (When Cash is active) */}
            {paymentMethod === 'cash' && saleSummary.total > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: 'بالضبط', val: saleSummary.total },
                    { label: '+200', val: Math.ceil(saleSummary.total / 200) * 200 },
                    { label: '+500', val: Math.ceil(saleSummary.total / 500) * 500 },
                    { label: '+1,000', val: Math.ceil(saleSummary.total / 1000) * 1000 },
                    { label: '+2,000', val: Math.ceil(saleSummary.total / 2000) * 2000 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => setCashTendered(btn.val)}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        cashTendered === btn.val
                          ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                          : 'bg-surface hover:bg-surface-container border-outline-variant/15 text-on-surface'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Cash Tender Input & Change Due Display */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-on-surface-variant font-bold mb-0.5">المبلغ المقبوض:</label>
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                      placeholder={saleSummary.total.toString()}
                      className="w-full h-9 px-3 bg-surface border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-[10px] text-on-surface-variant font-bold mb-0.5">الفكة (الباقي):</label>
                    <div className="h-9 px-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-mono font-extrabold text-sm">
                      <span>{formatMoney(changeDue)}</span>
                      <span className="text-[10px]">دج</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Giant Instant Pay Button */}
            <button
              onClick={handleQuickPay}
              disabled={cart.length === 0 || isSalePending}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-base flex items-center justify-between px-5 transition-all shadow-md shadow-amber-500/25 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 fill-current" />
                <span>{isSalePending ? 'جاري الحفظ...' : 'دفع فوري وحفظ (Enter)'}</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono text-lg">
                <span>{formatMoney(saleSummary.total)}</span>
                <span className="text-xs font-normal opacity-90">دج</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING MOBILE CART SUMMARY BAR (Visible on mobile during catalog browsing) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {mobileTab === 'catalog' && cart.length > 0 && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-surface-container-high/95 backdrop-blur-xl border border-amber-500/40 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/25 relative shrink-0">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center font-mono shadow-xs">
                {cart.length}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant font-bold">إجمالي السلة:</p>
              <p className="text-sm font-black font-mono text-amber-600 truncate">
                {formatMoney(saleSummary?.total)} {settingsOrDefault.baseCurrency}
              </p>
            </div>
          </div>

          <button
            onClick={() => setMobileTab('cart')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/25 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>عرض السلة والدفع</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MODALS                                                     */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* Payment Success Instant Modal */}
      {showSuccessModal && completedSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-on-surface">تمت عملية البيع بنجاح</h3>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                فاتورة رقم: #{completedSale.number}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-1 text-xs">
              <div className="flex justify-between text-on-surface-variant">
                <span>المبلغ الإجمالي:</span>
                <span className="font-bold text-on-surface font-mono">{formatNumber(completedSale.total)} دج</span>
              </div>
              {paymentMethod === 'cash' && changeDue > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>الفكة للزبون:</span>
                  <span className="font-mono">{formatMoney(changeDue)} دج</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => printDocument(completedSale.id, 'thermal-receipt', { copies: 1 })}
                className="py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>إعادة الطباعة</span>
              </button>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  searchInputRef.current?.focus();
                }}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs"
                autoFocus
              >
                بيع جديد (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Sales Modal */}
      {showHeldSalesModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-on-surface">المبيعات المعلقة مؤقتاً ({suspendedOrders.length})</h3>
              </div>
              <button onClick={() => setShowHeldSalesModal(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            {suspendedOrders.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant text-xs font-bold">
                لا توجد فواتير معلقة حالياً
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {suspendedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 hover:border-amber-500/40 hover:bg-amber-500/5 flex items-center justify-between transition-all"
                  >
                    <div>
                      <p className="text-xs font-bold text-on-surface">
                        طلب معلق — {order.items.length} أصناف
                      </p>
                      <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                        {new Date(order.createdAt).toLocaleTimeString('ar-DZ')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreHeldSale(order)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs transition-all"
                    >
                      استرجاع ↵
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fast Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
              <h3 className="text-sm font-bold text-on-surface">إضافة زبون جديد سريع</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">اسم العميل *:</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="مثال: أحمد بن علي"
                  className="w-full h-10 px-3 bg-surface border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">رقم الهاتف:</label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="06XXXXXXXX"
                  className="w-full h-10 px-3 bg-surface border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  if (!newCustName.trim()) return;
                  const newId = generateId();
                  await db.customers.add({
                    id: newId,
                    name: newCustName.trim(),
                    phone: newCustPhone.trim(),
                    balance: 0,
                    totalSpent: 0,
                    points: 0,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  } as Customer);
                  queryClient.invalidateQueries({ queryKey: ['customers'] });
                  setSelectedCustomer(newId);
                  setShowAddCustomerModal(false);
                  setNewCustName('');
                  setNewCustPhone('');
                  addNotification({
                    title: 'تمت إضافة الزبون',
                    message: 'تم اختيار الزبون الجديد للفاتورة',
                    type: 'success',
                  });
                }}
                disabled={!newCustName.trim()}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
              >
                حفظ واختيار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Cash Session Modal */}
      {showOpenSessionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/30">
              <Wallet className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-on-surface">فتح مناوبة جديدة</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                يجب فتح مناوبة الصندوق لبدء تسجيل المبيعات النقدية
              </p>
            </div>

            <div className="text-right">
              <label className="block text-xs font-bold text-on-surface mb-1">الرصيد الافتتاحي (دج):</label>
              <input
                type="number"
                value={openingBalance || ''}
                onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full h-11 px-3 bg-surface border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface text-center focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowOpenSessionModal(false)}
                className="py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  const sessionId = generateId();
                  const sessionNumber = allSessions.length + 1;
                  await db.cash_sessions.add({
                    id: sessionId,
                    sessionNumber,
                    openedBy: currentUser?.name || 'الكاشير',
                    openedAt: new Date().toISOString(),
                    closedAt: '',
                    openingBalance,
                    deposits: [],
                    totalSales: 0,
                    totalReturns: 0,
                    status: 'open',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                  queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
                  setShowOpenSessionModal(false);
                  setOpeningBalance(0);
                  addNotification({
                    title: 'تم فتح المناوبة',
                    message: `مناوبة رقم #${sessionNumber} مفتوحة وجاهزة`,
                    type: 'success',
                  });
                }}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all"
              >
                تأكيد الفتح
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Product Modal (F8) */}
      {showFreeProductModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-on-surface">إضافة منتج حر (F8)</h3>
              </div>
              <button onClick={() => setShowFreeProductModal(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">اسم المنتج / الخدمة *</label>
                <input
                  type="text"
                  value={freeProductName}
                  onChange={(e) => setFreeProductName(e.target.value)}
                  placeholder="مثال: صنف حر / خدمة سريعة"
                  className="w-full h-11 px-3 bg-surface border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">السعر (دج) *</label>
                  <input
                    type="number"
                    value={freeProductPrice || ''}
                    onChange={(e) => setFreeProductPrice(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full h-11 px-3 bg-surface border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">الكمية</label>
                  <input
                    type="number"
                    value={freeProductQty || ''}
                    onChange={(e) => setFreeProductQty(Math.max(1, Number(e.target.value) || 1))}
                    placeholder="1"
                    className="w-full h-11 px-3 bg-surface border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowFreeProductModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant"
              >
                إلغاء (Esc)
              </button>
              <button
                onClick={() => {
                  if (!freeProductName.trim() || freeProductPrice < 0) return;
                  addItem({
                    productId: `custom-${Date.now()}`,
                    name: freeProductName.trim(),
                    qty: freeProductQty || 1,
                    unitPrice: freeProductPrice,
                    lineTotal: (freeProductQty || 1) * freeProductPrice,
                    isCustom: true,
                  });
                  setShowFreeProductModal(false);
                  setFreeProductName('');
                  setFreeProductPrice(0);
                  setFreeProductQty(1);
                  addNotification({
                    title: 'تمت إضافة منتج حر',
                    message: `${freeProductName} بمبلغ ${formatMoney(freeProductPrice)} دج`,
                    type: 'success',
                  });
                }}
                disabled={!freeProductName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
              >
                إضافة للسلة (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Guide Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">اختصارات لوحة المفاتيح (Quick POS)</h3>
                  <p className="text-xs text-on-surface-variant">تحكم كامل وسريع بدون استخدام الفأرة</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-3 py-1.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center gap-1.5 transition-all"
              >
                <span>إغلاق</span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface border border-outline-variant/30 text-[10px] font-mono">Esc</kbd>
              </button>
            </div>

            {/* Modal Body with 3 Distinct Sections */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              {/* Group 1: Sales Screen */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">شاشة المبيعات</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { key: 'F7', label: 'البحث عن منتج بالاسم / الكود', desc: 'التركيز الفوري على حقل البحث' },
                    { key: 'F1', label: 'إفراغ السلة', desc: 'حذف جميع الأصناف الحالية' },
                    { key: 'F4', label: 'المبيعات السابقة / مرتجعات', desc: 'فتح نافذة الفواتير السابقة' },
                    { key: 'F2', label: 'حفظ السلة كمسودة', desc: 'تعليق الفاتورة والاحتفاظ بها' },
                    { key: 'F3', label: 'فتح المسودات للإسترجاع', desc: 'عرض الطلبات المعلقة واستعادتها' },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between hover:border-amber-500/30 transition-all"
                    >
                      <div>
                        <p className="text-xs font-bold text-on-surface">{s.label}</p>
                        <p className="text-[10px] text-on-surface-variant">{s.desc}</p>
                      </div>
                      <kbd className="px-3 py-1.5 rounded-xl bg-surface border-2 border-outline-variant/30 text-amber-600 dark:text-amber-400 font-mono font-extrabold text-xs shadow-xs min-w-10 text-center">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 2: Quick Operations */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary">عمليات سريعة</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { key: 'F9 / F10', label: 'التنقل بين الطلبات السابقة', desc: 'استعراض سجل المبيعات' },
                    { key: 'F5', label: 'الطباعة التلقائية (تفعيل/إيقاف)', desc: 'تبديل وضع الطباعة الفورية' },
                    { key: 'F6', label: 'فلتر المنتجات والتصنيفات', desc: 'التبديل بين تصنيفات الأصناف' },
                    { key: 'F12', label: 'تعديل كمية آخر سطر في السلة', desc: 'إدخال سريع للكمية باللوحة' },
                    { key: '+ / -', label: 'زيادة / إنقاص كمية السطر المحدد', desc: 'تعديل مباشر على الكمية' },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between hover:border-primary/30 transition-all"
                    >
                      <div>
                        <p className="text-xs font-bold text-on-surface">{s.label}</p>
                        <p className="text-[10px] text-on-surface-variant">{s.desc}</p>
                      </div>
                      <kbd className="px-2.5 py-1.5 rounded-xl bg-surface border-2 border-outline-variant/30 text-primary font-mono font-extrabold text-xs shadow-xs text-center">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 3: Fast Navigation & Special */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">التنقل السريع</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { key: 'F8', label: 'منتج حر / صنف مخصص', desc: 'إضافة منتج أو خدمة بدون كود' },
                    { key: 'Enter', label: 'إتمام ودفع الفاتورة', desc: 'تأكيد الدفع واستخراج الوصل' },
                    { key: 'Delete', label: 'حذف الصنف المحدد', desc: 'إزالة الصنف المختار من السلة' },
                    { key: 'Esc', label: 'إغلاق النوافذ والقوائم', desc: 'الرجوع لشاشة البيع الرئيسية' },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between hover:border-emerald-500/30 transition-all"
                    >
                      <div>
                        <p className="text-xs font-bold text-on-surface">{s.label}</p>
                        <p className="text-[10px] text-on-surface-variant">{s.desc}</p>
                      </div>
                      <kbd className="px-3 py-1.5 rounded-xl bg-surface border-2 border-outline-variant/30 text-emerald-600 dark:text-emerald-400 font-mono font-extrabold text-xs shadow-xs min-w-10 text-center">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
