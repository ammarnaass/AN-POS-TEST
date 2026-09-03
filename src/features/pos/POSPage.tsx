import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { SaleRepository } from '@/infrastructure/database/repositories/SaleRepository';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationStore } from '@/store/notificationStore';
import { generateId } from '@/utils';
import type { Product, Customer, CartItem, Sale } from '@/types';
import ImageUpload from '@/components/products/ImageUpload';
import { calculateSaleTotal, resolveUnitPrice, createSale, generateReceiptHTML } from '@/services';
import { printDocument } from '@/services/print/printService';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { useBarcodeScanner } from '@/features/barcode/useBarcodeScanner';
import { parseAndAddScannedCode, playAdded, playErrorBeep, unlockAudio } from '@/services/barcode';
import { useSaleCompletion } from './hooks/useSaleCompletion';
import { usePOSKeyboardShortcuts } from './hooks/usePOSKeyboardShortcuts';
import { POSActionBar } from './components/POSActionBar';
import { ClassicPOSLayout } from './components/ClassicPOSLayout';
import { useOpenCashSession } from '@/features/cash/useOpenCashSession';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Banknote, User, UserPlus, Clock, X, Package, RotateCcw,
  FileText, File, Truck, AlertTriangle, Receipt, Layers, ChevronLeft, ChevronRight, Wallet,
  Printer, Sun, Filter, Maximize, Bell, Moon, Menu, LayoutGrid, List, Barcode, Zap, ScanLine, ArrowRight,
  CreditCard, ArrowLeftRight, CheckCircle2, HelpCircle, Delete, PauseCircle, PlayCircle,
  Percent, ShieldCheck, DollarSign, Store, Tag, Sparkles, UserCheck, ArrowUpRight,
  Info, Smartphone, Cloud, CloudCheck, Keyboard, Star, SlidersHorizontal, PlusCircle,
  Edit3, Sliders, History, FileCheck, ChevronDown, ShoppingBag, Save, FileSpreadsheet,
  Minimize, Image as ImageIcon, Columns, Rows, PanelBottom, PanelRight, LayoutDashboard,
} from 'lucide-react';
import { v4 as createId } from 'uuid';
import {
  PaymentModal,
  SuccessModal,
  ShortcutsGuideModal,
  FreeProductModal,
  QuickCustomerModal,
  SuspendedOrdersModal,
  ReturnSaleModal,
  SessionWarningModal,
  OpenSessionModal,
  DiscountModal,
  AdvancedFiltersModal,
  CustomizeLayoutModal,
  SaveAsProformaModal,
  SaveAsOrderModal,
  QuickProductModal,
} from './modals';

const PRODUCTS_PER_PAGE = 12;

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

const emptyProduct: Omit<Product, 'id'> = {
  name: '', barcode: '', sku: '', category: '', unit: 'قطعة',
  costPrice: 0, wholesalePrice: 0, retailPrice: 0, wholesaleMinQty: 0,
  quantity: 0, lowStockThreshold: 0, reorderPoint: 0, maxStock: 0,
  variant: '', expiryDate: '', batchNumber: '', highlighted: false,
  status: 'active', image: '',
};

export default function POSPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items: cart, addItem, removeItem, updateQty, updatePrice, clear: clearCart } = useCartStore();
  const { user: currentUser } = useAuthStore();
  const { open: openSidebar } = useSidebarStore();
  const { theme, toggleTheme } = useThemeStore();
  const notifications = useNotificationStore((s) => s.notifications);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Database Queries
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.toArray(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => db.suppliers.toArray(),
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => db.promotions.toArray(),
  });

  const { data: packs = [] } = useQuery({
    queryKey: ['packs'],
    queryFn: () => db.packs.toArray(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const posSettings = useMemo(() => ({
    quickSale: settings?.quickSale ?? true,
    accountingOnly: settings?.accountingOnly ?? false,
    allowNegativeStock: settings?.allowNegativeStock ?? false,
    confirmNoStock: settings?.confirmNoStock ?? true,
    averagePricing: settings?.averagePricing ?? false,
    allowCardPayment: Boolean((settings as any)?.allowCardPayment ?? false),
    allowTransferPayment: Boolean((settings as any)?.allowTransferPayment ?? false),
  }), [settings]);

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.toArray(),
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });

  const currentSession = useMemo(() => {
    return allSessions.find(s => s.status === 'open') || null;
  }, [allSessions]);

  const { data: suspendedOrders = [] } = useQuery({
    queryKey: ['suspendedOrders'],
    queryFn: () => db.suspended_orders.toArray(),
  });

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [showSuspended, setShowSuspended] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all');
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadInput, setKeypadInput] = useState('');
  const [keypadTarget, setKeypadTarget] = useState<'qty' | 'price' | 'paid' | 'discount'>('paid');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Auto-reset payment method to cash if currently selected method is disabled in settings
  useEffect(() => {
    if (paymentMethod === 'card' && !posSettings.allowCardPayment) {
      setPaymentMethod('cash');
    } else if (paymentMethod === 'transfer' && !posSettings.allowTransferPayment) {
      setPaymentMethod('cash');
    }
  }, [paymentMethod, posSettings.allowCardPayment, posSettings.allowTransferPayment]);

  const [returnMode, setReturnMode] = useState(false);
  const [showReturnSaleModal, setShowReturnSaleModal] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingPriceFor, setEditingPriceFor] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');

  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductForm, setAddProductForm] = useState<Omit<Product, 'id'>>(emptyProduct);
  const [barcodeScanMode, setBarcodeScanMode] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [quickMode, setQuickMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Quick Add Customer Modal
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Free Product Modal (F8)
  const [showFreeProductModal, setShowFreeProductModal] = useState(false);
  const [freeProductName, setFreeProductName] = useState('');
  const [freeProductPrice, setFreeProductPrice] = useState<number>(0);
  const [freeProductQty, setFreeProductQty] = useState<number>(1);

  // Auto Print Toggle (F5)
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);

  // Past Sales Quick Cycle Index (F9 / F10)
  const [pastSaleIndex, setPastSaleIndex] = useState<number>(-1);

  // Top Bar dedicated barcode input
  const [barcodeHeaderInput, setBarcodeHeaderInput] = useState('');

  // Toolbar filters & modals
  const [isFeaturedOnly, setIsFeaturedOnly] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSaveAsProformaModal, setShowSaveAsProformaModal] = useState(false);
  const [showSaveAsOrderModal, setShowSaveAsOrderModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const filtersDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (filtersDropdownRef.current && !filtersDropdownRef.current.contains(event.target as Node)) {
        setShowFiltersModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Display & Layout customization states (إعدادات العرض)
  const [posLayout, setPosLayout] = useState<'sidebar' | 'bottom' | 'classic'>(() => {
    return (localStorage.getItem('pos_layout_mode') as 'sidebar' | 'bottom' | 'classic') || 'bottom';
  });
  const [showProductImages, setShowProductImages] = useState<boolean>(() => {
    const saved = localStorage.getItem('pos_show_images');
    return saved !== null ? saved === 'true' : true;
  });
  const [uiZoom, setUiZoom] = useState<number>(() => {
    const saved = localStorage.getItem('pos_ui_zoom');
    return saved ? Number(saved) : 100;
  });
  // التبديل بين المنتجات والسلة على الشاشات الصغيرة (الهواتف والأجهزة اللوحية)
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const availableCategories = useMemo(() => {
    const cats = new Set(
      products
        .map((p) => (typeof p.category === 'object' && p.category !== null ? (p.category as any).name : p.category))
        .filter(Boolean)
    );
    return Array.from(cats) as string[];
  }, [products]);

  const activeFiltersCount = useMemo(() => {
    return (filterCategory ? 1 : 0) + (filterSupplier ? 1 : 0) + (filterStockStatus !== 'all' ? 1 : 0) + (isFeaturedOnly ? 1 : 0);
  }, [filterCategory, filterSupplier, filterStockStatus, isFeaturedOnly]);

  const handleClearAllFilters = useCallback(() => {
    setFilterCategory('');
    setFilterSupplier('');
    setFilterStockStatus('all');
    setIsFeaturedOnly(false);
    setSearchQuery('');
    addNotification({
      title: 'مسح الفلاتر',
      message: 'تمت استعادة عرض جميع المنتجات بدون أي تصفية',
      type: 'info',
    });
  }, [addNotification]);

  const filteredProducts = useMemo(() => {
    const activePacks = packs.filter((p) => p.status === 'active');
    let baseProducts = products;

    // 1. Filter by Category / Family (العائلة)
    if (filterCategory) {
      baseProducts = baseProducts.filter((p) => p.category === filterCategory || (p as any).categoryId === filterCategory);
    }

    // 2. Filter by Supplier (المورد)
    if (filterSupplier) {
      baseProducts = baseProducts.filter((p) => (p as any).supplierId === filterSupplier || (p as any).supplier === filterSupplier);
    }

    // 3. Filter by Stock Status (حالة المخزون)
    if (filterStockStatus === 'in_stock') {
      baseProducts = baseProducts.filter((p) => p.quantity > 0);
    } else if (filterStockStatus === 'out_of_stock') {
      baseProducts = baseProducts.filter((p) => p.quantity <= 0);
    } else if (filterStockStatus === 'low_stock') {
      baseProducts = baseProducts.filter((p) => p.quantity > 0 && p.quantity <= (p.lowStockThreshold || 5));
    }

    // 4. Filter by Featured (المميزة)
    if (isFeaturedOnly) {
      baseProducts = baseProducts.filter((p) => p.highlighted || (p.quantity > 0));
    }

    // 5. Search Query
    if (!searchQuery) {
      const stockProducts = baseProducts.filter((p) => p.status === 'active' && !('items' in p));
      const mappedPacks = (filterSupplier || filterStockStatus !== 'all') ? [] : activePacks.map((p) => ({
        ...p, id: `pack-${p.id}`, retailPrice: p.packPrice, quantity: 9999,
      }));
      return [...stockProducts, ...mappedPacks];
    }
    const q = searchQuery.toLowerCase().trim();
    const matchedProducts = baseProducts.filter(
      (p) => p.status === 'active' && (
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      )
    );
    const mappedPacks = (filterSupplier || filterStockStatus !== 'all') ? [] : activePacks.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q)))
      .map((p) => ({ ...p, id: `pack-${p.id}`, retailPrice: p.packPrice, quantity: 9999 }));
    return [...matchedProducts, ...matchedPacks];
  }, [products, packs, searchQuery, filterCategory, filterSupplier, filterStockStatus, isFeaturedOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterCategory, filterSupplier, filterStockStatus, isFeaturedOnly]);

  const settingsOrDefault = useMemo(() => ({
    tvaRate: Number(settings?.tvaRate ?? (settings as any)?.tva_rate ?? 0),
    invoicePrefix: settings?.invoicePrefix ?? 'INV-',
    baseCurrency: settings?.baseCurrency ?? 'دج',
    shopName: settings?.shopName ?? 'AN POS',
    phone: settings?.phone ?? '',
    receiptFooter: settings?.receiptFooter ?? 'شكراً لزيارتكم',
    allowNegativeStock: settings?.allowNegativeStock ?? true,
  }), [settings]);

  const saleSummary = useMemo(
    () => calculateSaleTotal(cart, discount, discountType, settingsOrDefault.tvaRate),
    [cart, discount, discountType, settingsOrDefault.tvaRate]
  );

  const selectedCustomerObj = useMemo(() => {
    return customers.find(c => c.id === selectedCustomer) || null;
  }, [customers, selectedCustomer]);

  const isSessionOpen = currentSession !== null;

  // Sale Completion Hook
  const { completeSale, isPending: isSalePending } = useSaleCompletion(
    settingsOrDefault,
    (sale: Sale) => {
      setCompletedSale(sale);
      setShowPaymentModal(false);
      setShowSuccessModal(true);
      setReturnMode(false);
      setSelectedCustomer('');
      setDiscount(0);
      setPaidAmount(0);
    }
  );

  // BARCODE-MGMT-001: استقبال ماسحات USB/Bluetooth تلقائياً
  const handleExternalScan = useCallback(async (code: string) => {
    unlockAudio();
    setSearchQuery('');
    const productsArr = products as any[];
    const result = await parseAndAddScannedCode(code, {
      products: productsArr, packs: packs as any, promotions: promotions as any, addItem,
    });
    if (result.added) {
      playAdded(0.08);
      setScanInput('');
      if (quickMode) setTimeout(() => scanInputRef.current?.focus(), 100);
    } else {
      playErrorBeep();
      addNotification({
        title: 'باركود غير معروف',
        message: `${result.message ?? 'لم يُعثر'}: ${code}`,
        type: 'error',
      });
    }
  }, [products, packs, promotions, addItem, addNotification, quickMode]);

  useBarcodeScanner({
    onScan: handleExternalScan,
    enabled: true,
    respectInputFocus: false,
    beepOnSuccess: false,
    beepOnFailure: false,
  });

  const handleAddProduct = useCallback(
    (product: any) => {
      const isPack = String(product.id).startsWith('pack-');
      if (isPack) {
        const packId = product.id.replace('pack-', '');
        const pack = packs.find((p) => p.id === packId);
        if (!pack) return;
        addItem({
          productId: `pack-${packId}`, name: pack.name, qty: 1, unitPrice: pack.packPrice,
          lineTotal: pack.packPrice, isPack: true, packId: packId,
        });
      } else {
        const existing = cart.find((item) => item.productId === product.id && !item.isCustom);
        const newQty = existing ? existing.qty + 1 : 1;
        const price = resolveUnitPrice(product, newQty, promotions);
        addItem({
          productId: product.id, name: product.name, qty: 1, unitPrice: price, lineTotal: price,
          batchNumber: product.batchNumber,
        });
      }
      playAdded(0.05);
      setSearchQuery('');
      if (quickMode) {
        setScanInput('');
        setTimeout(() => scanInputRef.current?.focus(), 100);
      }
    },
    [addItem, promotions, cart, packs, quickMode]
  );

  const handleUpdateQty = useCallback(
    (item: CartItem, newQty: number) => {
      if (newQty < 1) { removeItem(item.productId); return; }
      if (item.isPack) {
        updateQty(item.productId, newQty, item.unitPrice);
        return;
      }
      const product = products.find((p) => p.id === item.productId);
      if (product && !item.isCustom) {
        const finalPrice = resolveUnitPrice(product, newQty, promotions);
        updateQty(item.productId, newQty, finalPrice);
      } else {
        updateQty(item.productId, newQty);
      }
    },
    [removeItem, updateQty, products, promotions]
  );

  const handleSuspend = () => {
    if (cart.length === 0) return;
    const newOrder = {
      id: createId(),
      items: cart.map((it) => ({
        productId: it.productId, name: it.name, qty: it.qty, unitPrice: it.unitPrice, lineTotal: it.lineTotal,
        isCustom: it.isCustom, isPack: it.isPack, packId: it.packId, batchNumber: it.batchNumber,
      })),
      customerId: selectedCustomer, discount, discountType, createdAt: new Date().toISOString(),
      note: '', createdBy: currentUser?.name || '',
    };
    db.suspended_orders.add(newOrder).then(() => {
      queryClient.invalidateQueries({ queryKey: ['suspendedOrders'] });
      setSelectedCustomer(''); setDiscount(0); clearCart();
      addNotification({
        title: 'تم تعليق الفاتورة',
        message: `تم حفظ ${cart.length} أصناف في قائمة الفواتير المعلقة`,
        type: 'info',
      });
    });
  };

  const handleResumeOrder = (orderId: string) => {
    const order = suspendedOrders.find(o => o.id === orderId);
    if (!order) return;
    for (const item of order.items) {
      addItem({
        productId: item.productId, name: item.name, qty: item.qty, unitPrice: item.unitPrice,
        lineTotal: item.lineTotal, isCustom: item.isCustom, isPack: item.isPack, packId: item.packId, batchNumber: item.batchNumber,
      });
    }
    setSelectedCustomer(order.customerId || '');
    setDiscount(order.discount || 0);
    setDiscountType(order.discountType || 'percent');
    db.suspended_orders.delete(orderId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['suspendedOrders'] });
    });
    setShowSuspended(false);
    addNotification({ title: 'تم استرجاع الفاتورة', message: 'تم تحميل الأصناف للسلة', type: 'success' });
  };

  const handleExecutePayment = () => {
    if (cart.length === 0) return;
    if (!isSessionOpen) { setShowSessionWarning(true); return; }
    
    const dbPaymentMethod = paymentMethod === 'credit' ? 'credit' : 'cash';
    completeSale({
      cart, discount, discountType, selectedCustomer, paymentMethod: dbPaymentMethod,
      isReturn: returnMode, currentSession, settings: settingsOrDefault,
      products: products as any[], packs: packs as any[], customers: customers as any[],
    });
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'clear') {
      setKeypadInput('');
      if (keypadTarget === 'paid') setPaidAmount(0);
      return;
    }
    if (val === 'backspace') {
      const next = keypadInput.slice(0, -1);
      setKeypadInput(next);
      if (keypadTarget === 'paid') setPaidAmount(Number(next) || 0);
      return;
    }
    const next = keypadInput + val;
    setKeypadInput(next);
    const num = Number(next);
    if (keypadTarget === 'paid') {
      setPaidAmount(num || 0);
    } else if (keypadTarget === 'qty') {
      const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
      if (targetId) {
        const it = cart.find(c => c.productId === targetId);
        if (it && num > 0) handleUpdateQty(it, num);
      }
    } else if (keypadTarget === 'discount') {
      setDiscount(num || 0);
    }
  };

  // Unified Global Keyboard Shortcuts Handler
  usePOSKeyboardShortcuts({
    cart,
    selectedItemId,
    isSessionOpen,
    total: saleSummary.total,
    isAnyModalOpen:
      showPaymentModal ||
      showSuccessModal ||
      showShortcutsModal ||
      showSuspended ||
      showReturnSaleModal ||
      showAddProduct ||
      showAddCustomer ||
      showFreeProductModal ||
      showOpenSession ||
      showSessionWarning ||
      showCustomizeModal ||
      showDiscountModal ||
      showSaveAsProformaModal ||
      showSaveAsOrderModal ||
      showFiltersModal ||
      showKeypad ||
      editingPriceFor !== null,
    isPaymentModalOpen: showPaymentModal,
    isSuccessModalOpen: showSuccessModal,
    onCloseAllModals: () => {
      setShowPaymentModal(false);
      setShowSuccessModal(false);
      setShowShortcutsModal(false);
      setShowSuspended(false);
      setShowReturnSaleModal(false);
      setShowAddProduct(false);
      setShowAddCustomer(false);
      setShowFreeProductModal(false);
      setShowOpenSession(false);
      setShowSessionWarning(false);
      setShowCustomizeModal(false);
      setShowDiscountModal(false);
      setShowSaveAsProformaModal(false);
      setShowSaveAsOrderModal(false);
      setShowFiltersModal(false);
      setShowKeypad(false);
      setEditingPriceFor(null);
    },
    onExecutePayment: handleExecutePayment,
    onCloseSuccessModal: () => setShowSuccessModal(false),
    onOpenPayment: () => {
      setPaidAmount(saleSummary.total);
      setShowPaymentModal(true);
    },
    onSuspendSale: handleSuspend,
    onOpenSuspended: () => setShowSuspended(true),
    onClearCart: () => {
      clearCart();
      setSelectedCustomer('');
      setDiscount(0);
    },
    onOpenReturns: () => setShowReturnSaleModal(true),
    onOpenShortcuts: () => setShowShortcutsModal(true),
    onOpenFreeProduct: () => setShowFreeProductModal(true),
    onOpenAddProduct: () => setShowAddProduct(true),
    onOpenAddCustomer: () => setShowAddCustomer(true),
    onOpenOpenSession: () => setShowOpenSession(true),
    onOpenSessionWarning: () => setShowSessionWarning(true),
    onOpenCustomize: () => setShowCustomizeModal(true),
    onOpenDiscount: () => setShowDiscountModal(true),
    onUpdateQty: handleUpdateQty,
    onRemoveItem: removeItem,
    addNotification,
  });

  // Quick Customer Creation
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;
    const newId = createId();
    await db.customers.add({
      id: newId,
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      balance: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Customer);
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    setSelectedCustomer(newId);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setShowAddCustomer(false);
    addNotification({ title: 'تمت إضافة الزبون', message: 'تم اختيار الزبون الجديد للفاتورة', type: 'success' });
  };

  const handleSelectReturnSale = (sale: Sale) => {
    for (const item of sale.items) {
      addItem({
        productId: item.productId, name: item.name, qty: item.qty,
        unitPrice: item.unitPrice, lineTotal: item.lineTotal,
      });
    }
    setShowReturnSaleModal(false);
    setReturnMode(true);
    addNotification({ title: 'وضع الإرجاع مفعّل', message: `تم استيراد ${sale.items.length} أصناف من الفاتورة #${sale.number}`, type: 'warning' });
  };

  const changeDue = Math.max(0, (paidAmount || saleSummary.total) - saleSummary.total);
  const isPaidSufficient = (paidAmount || 0) >= saleSummary.total;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background select-none font-cairo text-on-surface" dir="rtl" style={{ zoom: `${uiZoom}%` }}>
      {/* ========================================================= */}
      {/* ZONE 1: TOP HEADER                                        */}
      {/* ========================================================= */}
      <header className="h-16 px-3 sm:px-4 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/20 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-20 shadow-xs">
        {/* Right Side (RTL): Menu Toggle + Search + Barcode + Trial Badge */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-3xl">
          {/* Distinctive Back Button (زر الرجوع المميز) */}
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary/10 via-primary/15 to-blue-500/10 hover:from-primary/20 hover:to-blue-500/20 text-primary border border-primary/30 hover:border-primary/50 text-xs font-black transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
            title="الرجوع إلى لوحة التحكم الرئيسية"
          >
            <ArrowRight className="w-4 h-4 text-primary transition-transform duration-200 group-hover:translate-x-1" />
            <span className="font-cairo font-black text-xs hidden sm:inline">الرجوع</span>
          </button>

          {/* Sidebar Menu Button (ظاهر دائماً على جميع الشاشات) */}
          <button
            onClick={openSidebar}
            className="text-on-surface-variant hover:text-primary p-2 sm:p-2.5 rounded-xl bg-surface-container/70 hover:bg-surface-container-high border border-outline-variant/25 hover:border-primary/40 transition-all cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center"
            title="القائمة الجانبية"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Switch to Quick POS Button (التحويل إلى نقطة البيع السريعة) */}
          <button
            onClick={() => navigate('/pos/quick')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/35 hover:border-amber-500/50 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer shrink-0"
            title="الانتقال إلى نقطة البيع السريعة"
          >
            <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span className="font-cairo font-extrabold hidden md:inline">كاشير سريع</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white shadow-2xs">⚡ FAST</span>
          </button>

          {/* Search by Name */}
          <div className="relative flex-1 min-w-[110px] max-w-xs group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  const exact = products.find(
                    (p) => (p.barcode && p.barcode.trim() === searchQuery.trim()) ||
                           (p.sku && p.sku.trim() === searchQuery.trim()) ||
                           p.name.toLowerCase().trim() === searchQuery.toLowerCase().trim()
                  );
                  if (exact) {
                    handleAddProduct(exact as any);
                    setSearchQuery('');
                  }
                }
              }}
              placeholder="البحث بالاسم..."
              className="w-full h-10 pr-8 pl-8 sm:pr-9 sm:pl-9 bg-surface-container/60 hover:bg-surface-container border border-outline-variant/20 focus:border-primary/60 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-3 focus:ring-primary/15 transition-all placeholder-on-surface-variant/70 shadow-2xs"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline absolute left-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface-container-high/80 border border-outline-variant/30 text-[10px] font-mono font-bold text-on-surface-variant pointer-events-none shadow-2xs">
                F7
              </span>
            )}
          </div>

          {/* Dedicated Barcode Scanner Input */}
          <div className="relative hidden sm:flex flex-1 min-w-[110px] max-w-xs group">
            <ScanLine className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-focus-within:scale-110 transition-transform" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeHeaderInput}
              onChange={(e) => setBarcodeHeaderInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && barcodeHeaderInput.trim()) {
                  e.preventDefault();
                  handleExternalScan(barcodeHeaderInput.trim());
                  setBarcodeHeaderInput('');
                }
              }}
              placeholder="امسح/اكتب الباركود..."
              className="w-full h-10 pr-9 pl-4 bg-surface-container/60 hover:bg-surface-container border border-outline-variant/20 focus:border-primary/60 rounded-xl text-xs font-mono text-on-surface focus:outline-none focus:ring-3 focus:ring-primary/15 transition-all placeholder-on-surface-variant/70 shadow-2xs"
            />
          </div>

          {/* Trial / License info pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0 shadow-2xs">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <span>متبقي 97 مبيعات</span>
          </div>
        </div>

        {/* Left Side (RTL End): Uniform-Sized Animated Action Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {/* 1. Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-surface-container/70 hover:bg-primary/10 border border-outline-variant/20 hover:border-primary/40 flex items-center justify-center text-on-surface-variant hover:text-primary hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
            title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4 transition-transform duration-300 group-hover:scale-90" />
            ) : (
              <Maximize className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" />
            )}
          </button>

          {/* 2. Help */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-surface-container/70 hover:bg-cyan-500/10 border border-outline-variant/20 hover:border-cyan-500/40 flex items-center justify-center text-on-surface-variant hover:text-cyan-600 dark:hover:text-cyan-400 hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
            title="المساعدة والاختصارات"
          >
            <HelpCircle className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
          </button>

          {/* 3. Active Sessions / Shifts */}
          <button
            onClick={() => {
              if (currentSession) {
                navigate('/cash');
              } else {
                setShowOpenSession(true);
              }
            }}
            className={`group relative h-8.5 sm:h-9 md:h-10 px-2 sm:px-2.5 rounded-xl border flex items-center gap-1.5 transition-all duration-200 shadow-2xs cursor-pointer ${
              currentSession
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/25'
            }`}
            title={currentSession ? `مناوبة نشطة #${currentSession.sessionNumber} - إدارة الصندوق` : 'فتح مناوبة جديدة'}
          >
            {currentSession ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold font-mono hidden sm:inline">#{currentSession.sessionNumber}</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-bold hidden md:inline font-cairo">فتح مناوبة</span>
              </>
            )}
          </button>

          {/* 4. Keyboard Shortcuts */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="hidden sm:flex group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-surface-container/70 hover:bg-purple-500/10 border border-outline-variant/20 hover:border-purple-500/40 items-center justify-center text-on-surface-variant hover:text-purple-600 dark:hover:text-purple-400 hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
            title="اختصارات لوحة المفاتيح"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* 5. Notifications */}
          <NotificationDropdown>
            <button
              className="group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-surface-container/70 hover:bg-amber-500/10 border border-outline-variant/20 hover:border-amber-500/40 flex items-center justify-center text-on-surface-variant hover:text-amber-500 hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
              title="الإشعارات والتنبيهات"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-tr from-red-600 to-rose-500 text-white text-[9px] font-black items-center justify-center font-mono shadow-xs">
                    {unreadCount}
                  </span>
                </span>
              )}
            </button>
          </NotificationDropdown>

          {/* 6. Connected Devices */}
          <button
            onClick={() => navigate('/settings')}
            className="hidden md:flex group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-500/50 text-emerald-600 dark:text-emerald-400 items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
            title="الأجهزة المتصلة"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* 7. Cloud Sync */}
          <div
            className="hidden sm:flex group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 items-center justify-center shadow-2xs transition-all duration-200 cursor-default"
            title="المزامنة السحابية مكتملة"
          >
            <CloudCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>

          {/* 8. Dark / Light Mode */}
          <button
            onClick={toggleTheme}
            className={`group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl border flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xs ${
              theme === 'dark'
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-400'
                : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/25 text-indigo-600'
            }`}
            title={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SUBHEADER: CATEGORY & ACTION TOOLBAR                      */}
      {/* ========================================================= */}
      <div className="px-3 sm:px-4 py-2 bg-surface-container-low/90 backdrop-blur-xs border-b border-outline-variant/15 flex items-center justify-between gap-2 shrink-0 shadow-2xs relative z-30 overflow-x-auto no-scrollbar touch-scroll">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap sm:flex-wrap shrink-0">


          {/* Star / Featured Filter (F6) */}
          <button
            onClick={() => setIsFeaturedOnly(!isFeaturedOnly)}
            className={`h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs hover:-translate-y-0.5 active:translate-y-0 shrink-0 ${
              isFeaturedOnly
                ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/25'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant/20 hover:border-amber-500/40'
            }`}
          >
            <Star className={`w-4 h-4 ${isFeaturedOnly ? 'fill-current' : 'text-amber-500'}`} />
            <span>مميزة</span>
            <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-container-high/90 border border-outline-variant/30 text-on-surface-variant font-bold shadow-2xs">F6</span>
          </button>

          {/* Filters Dropdown (قائمة الفلاتر المنسدلة) */}
          <div className="relative shrink-0" ref={filtersDropdownRef}>
            <button
              onClick={() => setShowFiltersModal(!showFiltersModal)}
              className={`h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs hover:-translate-y-0.5 active:translate-y-0 shrink-0 ${
                showFiltersModal || activeFiltersCount > 0
                  ? 'bg-primary/15 text-primary border-primary/40 shadow-primary/10'
                  : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/20 hover:border-primary/40 text-on-surface'
              }`}
            >
              <SlidersHorizontal className={`w-4 h-4 ${activeFiltersCount > 0 ? 'text-primary' : 'text-on-surface-variant'}`} />
              <span>الفلاتر</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-black flex items-center justify-center font-mono shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${showFiltersModal ? 'rotate-180' : ''}`} />
            </button>

            {showFiltersModal && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-surface-container-low/95 backdrop-blur-md rounded-3xl shadow-2xl border border-outline-variant/25 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-on-surface">الفلاتر</h3>
                      <p className="text-[10px] text-on-surface-variant">تصفية المنتجات المعروضة</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFiltersModal(false)}
                    className="w-7 h-7 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 1. العائلة (Family / Category) */}
                <div className="space-y-1 text-right">
                  <label className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>العائلة</span>
                  </label>
                  <div className="relative">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full h-9.5 pr-3 pl-8 bg-surface-container border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all shadow-2xs"
                    >
                      <option value="">جميع العائلات</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/70 text-[10px]">
                      ▼
                    </div>
                  </div>
                </div>

                {/* 2. المورد (Supplier) */}
                <div className="space-y-1 text-right">
                  <label className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    <span>المورد</span>
                  </label>
                  <div className="relative">
                    <select
                      value={filterSupplier}
                      onChange={(e) => setFilterSupplier(e.target.value)}
                      className="w-full h-9.5 pr-3 pl-8 bg-surface-container border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all shadow-2xs"
                    >
                      <option value="">جميع الموردين</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name} {sup.phone ? `(${sup.phone})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/70 text-[10px]">
                      ▼
                    </div>
                  </div>
                </div>

                {/* 3. حالة المخزون (Stock Status) */}
                <div className="space-y-1 text-right">
                  <label className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    <span>حالة المخزون</span>
                  </label>
                  <div className="relative">
                    <select
                      value={filterStockStatus}
                      onChange={(e) => setFilterStockStatus(e.target.value as any)}
                      className="w-full h-9.5 pr-3 pl-8 bg-surface-container border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all shadow-2xs"
                    >
                      <option value="all">جميع الحالات</option>
                      <option value="in_stock">متوفر في المخزون</option>
                      <option value="out_of_stock">نفذ من المخزون</option>
                      <option value="low_stock">مخزون منخفض</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/70 text-[10px]">
                      ▼
                    </div>
                  </div>
                </div>

                {/* 4. مسح الفلاتر (clear_all) */}
                <div className="pt-2 border-t border-outline-variant/15 flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleClearAllFilters();
                      setShowFiltersModal(false);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/25 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                    <span>مسح الفلاتر</span>
                  </button>
                </div>
              </div>
            )}
          </div>



          {/* Return Mode (F4) */}
          <button
            onClick={() => {
              if (returnMode) { setReturnMode(false); clearCart(); }
              else setShowReturnSaleModal(true);
            }}
            className={`h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs hover:-translate-y-0.5 active:translate-y-0 shrink-0 ${
              returnMode
                ? 'bg-red-500/15 text-red-600 border-red-500/35 shadow-red-500/10'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant/20 hover:border-red-500/30'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-red-500" />
            <span>الإرجاع</span>
            <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-container-high/90 border border-outline-variant/30 text-on-surface-variant font-bold shadow-2xs">F4</span>
          </button>

          {/* Free Product (F8) */}
          <button
            onClick={() => setShowFreeProductModal(true)}
            className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>منتج حر</span>
            <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-800 dark:text-amber-200 font-extrabold shadow-2xs">F8</span>
          </button>

          {/* Customize Layout */}
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 hover:border-primary/40 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all shadow-xs hover:-translate-y-0.5 active:translate-y-0 shrink-0"
          >
            <Sliders className="w-4 h-4 text-on-surface-variant" />
            <span>تخصيص</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MOBILE VIEW SWITCHER (Visible on screens < md)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {posLayout !== 'classic' && (
        <div className="md:hidden flex items-center bg-surface-container/90 p-1 mx-3 my-1.5 rounded-2xl border border-outline-variant/20 shrink-0 gap-1 shadow-xs">
          <button
            onClick={() => setMobileTab('products')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'products'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>الأصناف ({products.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'cart'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>السلة ({cart.length})</span>
            {cart.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[10px] font-mono font-bold">
                {formatNumber(saleSummary?.total)} دج
              </span>
            )}
          </button>
        </div>
      )}


      {/* ========================================================= */}
      {/* MAIN CONTENT AREA: CART PANEL + PRODUCT CATALOG            */}
      {/* ========================================================= */}
      {posLayout === 'classic' ? (
        <ClassicPOSLayout
          cart={cart}
          onAddToCart={(p) => handleAddProduct(p as any)}
          onUpdateQty={(productId, qty) => {
            const it = cart.find((c) => c.productId === productId);
            if (it) handleUpdateQty(it, qty);
          }}
          onRemoveFromCart={(productId) => removeItem(productId)}
          onClearCart={() => {
            clearCart();
            setSelectedCustomer('');
            setDiscount(0);
          }}
          saleSummary={saleSummary}
          products={products as any}
          categories={availableCategories}
          selectedCategory={filterCategory}
          onSelectCategory={(catId) => setFilterCategory(catId)}
          barcodeInput={barcodeInput}
          setBarcodeInput={setBarcodeInput}
          onBarcodeSubmit={handleBarcodeSubmit}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSettleSale={() => {
            if (!isSessionOpen) {
              setShowSessionWarning(true);
              return;
            }
            if (cart.length === 0) return;
            setPaidAmount(saleSummary.total);
            setShowPaymentModal(true);
          }}
          onSuspendSale={handleSuspend}
          onOpenSuspended={() => setShowSuspended(true)}
          suspendedCount={suspendedOrders.length}
          onSelectCustomer={() => setShowCustomerSelect(true)}
          selectedCustomerName={selectedCustomer ? customers.find((c) => c.id === selectedCustomer)?.name || '' : ''}
          autoPrintReceipt={autoPrintReceipt}
          onToggleAutoPrint={() => {
            setAutoPrintReceipt(!autoPrintReceipt);
            addNotification({
              title: 'الطباعة التلقائية',
              message: !autoPrintReceipt ? 'تم تفعيل الطباعة التلقائية للإيصالات' : 'تم إيقاف الطباعة التلقائية',
              type: 'info',
            });
          }}
          onOpenDiscount={() => setShowDiscountModal(true)}
          onOpenReturns={() => setShowReturnSaleModal(true)}
          formatMoney={formatMoney}
          currency="دج"
          userName={currentUser?.name || 'Admin'}
          storeName={settingsOrDefault?.shopName || 'AN POS'}
          isSessionOpen={isSessionOpen}
          isSalePending={isSalePending}
        />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* --------------------------------------------------------- */}
        {/* RIGHT (IN RTL): PRODUCT DISCOVERY AREA (ZONE 2)           */}
        {/* --------------------------------------------------------- */}
        <main className={`flex-1 flex-col min-w-0 bg-background border-l border-outline-variant/20 overflow-hidden ${
          mobileTab === 'products' ? 'flex' : 'hidden md:flex'
        }`}>
          
          {/* Product Grid / List Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar pb-24 md:pb-4">
            {paginatedProducts.length === 0 ? (
              /* Empty Product State */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-surface-container flex items-center justify-center text-on-surface-variant/40 mb-3 border border-outline-variant/20 shadow-inner">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-on-surface">لا توجد منتجات</h3>
                <p className="text-xs text-on-surface-variant mt-1 mb-4 leading-relaxed">
                  لم يتم العثور على منتجات مطابقة للبحث أو التصنيف المحدد.
                </p>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة منتج جديد</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* Product Cards Grid matching the Reference Design */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5">
                {paginatedProducts.map((product) => {
                  const isPack = String(product.id).startsWith('pack-');
                  const isOutOfStock = !isPack && !posSettings.allowNegativeStock && !posSettings.accountingOnly && product.quantity <= 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && handleAddProduct(product as any)}
                      className={`group relative rounded-3xl bg-surface-container-low/90 backdrop-blur-xs border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer ${
                        isOutOfStock
                          ? 'border-red-500/30 bg-red-500/5 cursor-not-allowed opacity-85'
                          : 'border-outline-variant/20 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.98]'
                      }`}
                    >
                      {/* Top Banner Tag */}
                      {isOutOfStock ? (
                        <div className="w-full bg-red-600/90 backdrop-blur-xs text-white text-[11px] font-extrabold py-1 px-3 flex items-center justify-between shrink-0 shadow-xs">
                          <span>الكمية غير متوفرة</span>
                          <span className="bg-white/20 px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold">(نفذ)</span>
                        </div>
                      ) : (
                        <div className="pt-3 px-3 flex justify-end">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold flex items-center gap-1.5 border border-emerald-500/20 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{product.quantity} قطعة</span>
                          </span>
                        </div>
                      )}

                      {/* Image / Icon container */}
                      <div className="p-3.5 flex flex-col items-center justify-center text-center">
                        {showProductImages && (
                          <div className="w-16 h-16 rounded-2xl bg-surface-container/60 flex items-center justify-center text-on-surface-variant/50 border border-outline-variant/15 mb-2.5 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-200">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-8 h-8 opacity-40 text-primary" />
                            )}
                          </div>
                        )}

                        {/* Title */}
                        <h4 className="text-sm font-extrabold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                          {product.name}
                        </h4>

                        {/* Batches Info */}
                        <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                          {isOutOfStock ? '0 دفعات متوفرة للبيع' : '1 دفعات متوفرة للبيع'}
                        </p>

                        {/* Price Banner */}
                        <div className="mt-3 text-center">
                          <span className="text-base font-black font-mono text-primary tracking-tight">
                            {formatNumber(product.retailPrice)} دج
                          </span>
                          <span className="text-[11px] text-on-surface-variant mr-1">/ قطعة</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Product List Mode */
              <div className="space-y-2">
                {paginatedProducts.map((product) => {
                  const isPack = String(product.id).startsWith('pack-');
                  const isOutOfStock = !isPack && !posSettings.allowNegativeStock && !posSettings.accountingOnly && product.quantity <= 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && handleAddProduct(product as any)}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer ${
                        isOutOfStock
                          ? 'border-red-500/30 bg-red-500/5 opacity-60 cursor-not-allowed'
                          : 'bg-surface-container-low/90 hover:bg-surface-container border-outline-variant/20 hover:border-primary/40 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {showProductImages && (
                          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary overflow-hidden border border-outline-variant/10 shadow-inner">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 opacity-40" />
                            )}
                          </div>
                        )}
                        <div className="text-right min-w-0">
                          <h4 className="text-xs font-bold text-on-surface truncate">{product.name}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-mono mt-0.5">
                            <span>{product.barcode || product.sku || 'بدون باركود'}</span>
                            <span>·</span>
                            <span>{(typeof product.category === 'object' && product.category !== null ? (product.category as any).name : product.category) || 'عام'}</span>
                            {!isPack && <span className="font-bold text-emerald-600">({product.quantity} قطعة)</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-primary font-mono">
                          {formatNumber(product.retailPrice)} دج
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Toolbar */}
          <div className="p-3 bg-surface-container-low/90 backdrop-blur-xs border-t border-outline-variant/15 flex items-center justify-between text-xs text-on-surface-variant shrink-0 shadow-2xs">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 hover:border-primary/30 text-xs font-bold text-on-surface disabled:opacity-40 transition-all shadow-2xs active:scale-95"
            >
              السابق
            </button>
            <span className="font-mono text-xs font-bold text-on-surface bg-surface-container px-3 py-1 rounded-xl border border-outline-variant/15 shadow-2xs">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 hover:border-primary/30 text-xs font-bold text-on-surface disabled:opacity-40 transition-all shadow-2xs active:scale-95"
            >
              التالي
            </button>
          </div>

          {/* Bottom Financial & Action Bar for Design 2 */}
          {posLayout === 'bottom' && (
            <POSActionBar
              cartLength={cart.length}
              subtotal={saleSummary.subtotal}
              total={saleSummary.total}
              discountAmount={saleSummary.discountAmount}
              isSessionOpen={isSessionOpen}
              isSalePending={isSalePending}
              suspendedCount={suspendedOrders.length}
              autoPrintReceipt={autoPrintReceipt}
              onSettleSale={() => {
                if (!isSessionOpen) {
                  setShowSessionWarning(true);
                  return;
                }
                if (cart.length === 0) return;
                setPaidAmount(saleSummary.total);
                setShowPaymentModal(true);
              }}
              onSuspendSale={handleSuspend}
              onOpenSuspended={() => setShowSuspended(true)}
              onClearCart={() => {
                clearCart();
                setSelectedCustomer('');
                setDiscount(0);
              }}
              onOpenReturns={() => setShowReturnSaleModal(true)}
              onToggleAutoPrint={() => {
                setAutoPrintReceipt(!autoPrintReceipt);
                addNotification({
                  title: 'الطباعة التلقائية',
                  message: !autoPrintReceipt ? 'تم تفعيل الطباعة التلقائية للإيصالات' : 'تم إيقاف الطباعة التلقائية',
                  type: 'info',
                });
              }}
              onOpenDiscount={() => setShowDiscountModal(true)}
              onSaveAsProforma={() => {
                if (cart.length === 0) return;
                setShowSaveAsProformaModal(true);
              }}
              onSaveAsOrder={() => {
                if (cart.length === 0) return;
                setShowSaveAsOrderModal(true);
              }}
              showFinancialSummary={true}
            />
          )}
        </main>

        {/* --------------------------------------------------------- */}
        {/* LEFT (IN RTL): CART PANEL (ZONES 3 & 4)                   */}
        {/* --------------------------------------------------------- */}
        <aside className={`bg-surface-container-low/95 backdrop-blur-md flex flex-col h-full shrink-0 shadow-xl border-r border-outline-variant/20 z-10 transition-all duration-200 ${
          mobileTab === 'cart' ? 'flex w-full' : 'hidden md:flex'
        } ${
          posLayout === 'bottom' ? 'md:w-[320px] lg:w-[350px]' : 'md:w-[420px] lg:w-[450px]'
        }`}>
          
          {/* Mobile Top Bar inside Cart */}
          <div className="md:hidden p-2.5 bg-primary/10 border-b border-primary/20 flex items-center justify-between shrink-0">
            <button
              onClick={() => setMobileTab('products')}
              className="text-xs font-bold text-primary flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-surface hover:bg-surface-container-high transition-colors shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
              <span>متابعة اختيار المنتجات</span>
            </button>
            <span className="text-xs font-black text-on-surface font-cairo">
              السلة ({cart.length} أصناف)
            </span>
          </div>

          {/* Cart Customer Selector */}
          <div className="p-3 bg-surface-container-low border-b border-outline-variant/20 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setShowCustomerSelect(true)}
                  className="w-full py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold flex items-center justify-between transition-colors text-right cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <User className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {selectedCustomer
                        ? customers.find((c) => c.id === selectedCustomer)?.name
                        : 'زبون عام (افتراضي)'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant/70 shrink-0" />
                </button>
              </div>

              {selectedCustomer && (
                <button
                  type="button"
                  onClick={() => setSelectedCustomer('')}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 transition-colors cursor-pointer"
                  title="إلغاء تحديد الزبون"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAddCustomer(true)}
                className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors cursor-pointer"
                title="إضافة زبون جديد"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                <div className="w-16 h-16 rounded-3xl bg-surface-container/60 flex items-center justify-center mb-3 shadow-inner border border-outline-variant/10">
                  <ShoppingCart className="w-8 h-8 opacity-30 text-primary" />
                </div>
                <p className="text-sm font-bold text-on-surface">الطلب فارغ، قم باختيار المنتجات</p>
                <p className="text-xs opacity-70 mt-1">
                  امسح الباركود أو انقر على المنتجات لإضافتها للسلة
                </p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const isSelected = selectedItemId === item.productId;
                return (
                  <div
                    key={item.productId}
                    onClick={() => setSelectedItemId(isSelected ? null : item.productId)}
                    className={`p-3 rounded-2xl border transition-all duration-150 text-right ${
                      isSelected
                        ? 'border-primary/60 bg-primary/5 shadow-sm border-r-4 border-r-primary'
                        : 'bg-surface-container/70 border-outline-variant/15 hover:border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-on-surface-variant font-mono px-1.5 py-0.2 rounded bg-surface-container-high/60 border border-outline-variant/15">#{idx + 1}</span>
                          <h4 className="text-xs font-bold text-on-surface truncate">{item.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant font-mono">
                          <span>{formatNumber(item.unitPrice)} دج</span>
                          <span>×</span>
                          <span className="font-extrabold text-on-surface">{item.qty}</span>
                        </div>
                      </div>

                      {/* Total for this line */}
                      <div className="text-left shrink-0">
                        <span className="text-xs font-black font-mono text-primary">
                          {formatNumber(item.lineTotal)}
                        </span>
                        <span className="text-[10px] text-on-surface-variant mr-1">دج</span>
                      </div>
                    </div>

                    {/* Actions & Quantity Stepper */}
                    <div className="mt-2.5 pt-2 border-t border-outline-variant/10 flex items-center justify-between">
                      {/* Stepper */}
                      <div className="flex items-center bg-surface-container-low/90 rounded-xl p-0.5 border border-outline-variant/20 shadow-2xs">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateQty(item, item.qty + 1); }}
                          className="w-7 h-7 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary flex items-center justify-center transition-colors text-on-surface active:scale-95"
                          title="زيادة (+)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-black font-mono text-on-surface">
                          {item.qty}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateQty(item, item.qty - 1); }}
                          className="w-7 h-7 rounded-lg bg-surface-container hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-on-surface active:scale-95"
                          title="تقليل (-)"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Price edit / remove */}
                      <div className="flex items-center gap-1.5">
                        {editingPriceFor === item.productId ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              autoFocus
                              value={priceInput}
                              onChange={(e) => setPriceInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const p = Number(priceInput);
                                  if (p > 0) updatePrice(item.productId, p);
                                  setEditingPriceFor(null);
                                }
                              }}
                              className="w-16 h-7 px-1.5 bg-surface-container-lowest border border-primary rounded-lg text-xs font-mono text-center shadow-xs"
                            />
                            <button
                              onClick={() => {
                                const p = Number(priceInput);
                                if (p > 0) updatePrice(item.productId, p);
                                setEditingPriceFor(null);
                              }}
                              className="px-2 py-1 bg-primary text-on-primary rounded-lg text-[10px] font-bold shadow-xs"
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPriceFor(item.productId);
                              setPriceInput(String(item.unitPrice));
                            }}
                            className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/15 text-[10px] font-mono text-on-surface-variant transition-all shadow-2xs hover:-translate-y-0.5 active:translate-y-0"
                            title="تعديل السعر المباشر"
                          >
                            تعديل السعر
                          </button>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); removeItem(item.productId); }}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
                          title="حذف الصنف (Delete)"
                        >
                          <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Summary & Action Buttons (VISIBLE IN SIDEBAR MODE OR MOBILE CART VIEW) */}
          {(posLayout === 'sidebar' || mobileTab === 'cart') && (
            <POSActionBar
              cartLength={cart.length}
              subtotal={saleSummary.subtotal}
              total={saleSummary.total}
              discountAmount={saleSummary.discountAmount}
              isSessionOpen={isSessionOpen}
              isSalePending={isSalePending}
              suspendedCount={suspendedOrders.length}
              autoPrintReceipt={autoPrintReceipt}
              onSettleSale={() => {
                if (!isSessionOpen) {
                  setShowSessionWarning(true);
                  return;
                }
                if (cart.length === 0) return;
                setPaidAmount(saleSummary.total);
                setShowPaymentModal(true);
              }}
              onSuspendSale={handleSuspend}
              onOpenSuspended={() => setShowSuspended(true)}
              onClearCart={() => {
                clearCart();
                setSelectedCustomer('');
                setDiscount(0);
              }}
              onOpenReturns={() => setShowReturnSaleModal(true)}
              onToggleAutoPrint={() => {
                setAutoPrintReceipt(!autoPrintReceipt);
                addNotification({
                  title: 'الطباعة التلقائية',
                  message: !autoPrintReceipt ? 'تم تفعيل الطباعة التلقائية للإيصالات' : 'تم إيقاف الطباعة التلقائية',
                  type: 'info',
                });
              }}
              onOpenDiscount={() => setShowDiscountModal(true)}
              onSaveAsProforma={() => {
                if (cart.length === 0) return;
                setShowSaveAsProformaModal(true);
              }}
              onSaveAsOrder={() => {
                if (cart.length === 0) return;
                setShowSaveAsOrderModal(true);
              }}
              showFinancialSummary={true}
            />
          )}
        </aside>
      </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING MOBILE CART SUMMARY BAR (Visible on mobile during product browsing) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {posLayout !== 'classic' && mobileTab === 'products' && cart.length > 0 && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-surface-container-high/95 backdrop-blur-xl border border-primary/30 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-md shadow-primary/25 relative shrink-0">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center font-mono shadow-xs">
                {cart.length}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-on-surface-variant font-bold">إجمالي السلة:</p>
              <p className="text-sm font-black font-mono text-primary truncate">
                {formatMoney(saleSummary?.total)} دج
              </p>
            </div>
          </div>

          <button
            onClick={() => setMobileTab('cart')}
            className="px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl text-xs font-black shadow-md shadow-primary/25 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span>عرض السلة والدفع</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS                                                    */}
      {/* ========================================================= */}

      {/* 1. Complete Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={saleSummary.total}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paidAmount={paidAmount}
        setPaidAmount={setPaidAmount}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        customers={customers}
        onOpenAddCustomer={() => setShowAddCustomer(true)}
        onConfirmPayment={handleExecutePayment}
        isPending={isSalePending}
        allowCardPayment={posSettings.allowCardPayment}
        allowTransferPayment={posSettings.allowTransferPayment}
      />

      {/* 2. Payment Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        completedSale={completedSale}
      />

      {/* 3. Keyboard Shortcuts Guide Modal */}
      <ShortcutsGuideModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* 4. Free Product Modal (F8) */}
      <FreeProductModal
        isOpen={showFreeProductModal}
        onClose={() => setShowFreeProductModal(false)}
        onAddCustomItem={(item) => {
          addItem(item);
          addNotification({
            title: 'تمت إضافة منتج حر',
            message: `${item.name} بمبلغ ${formatMoney(item.unitPrice)} دج`,
            type: 'success',
          });
        }}
      />

      {/* 5. Quick Add Customer Modal */}
      <QuickCustomerModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSelectCustomer={(id) => setSelectedCustomer(id)}
      />

      {/* 6. Suspended Orders Modal */}
      <SuspendedOrdersModal
        isOpen={showSuspended}
        onClose={() => setShowSuspended(false)}
        orders={suspendedOrders}
        onResumeOrder={handleResumeOrder}
      />

      {/* 7. Return Sale Selection Modal */}
      <ReturnSaleModal
        isOpen={showReturnSaleModal}
        onClose={() => setShowReturnSaleModal(false)}
        sales={sales}
        onSelectReturnSale={handleSelectReturnSale}
      />

      {/* 8. Session Warning Modal */}
      <SessionWarningModal
        isOpen={showSessionWarning}
        onClose={() => setShowSessionWarning(false)}
        onOpenSessionRequested={() => setShowOpenSession(true)}
      />

      {/* 9. Open Session Modal */}
      <OpenSessionModal
        isOpen={showOpenSession}
        onClose={() => setShowOpenSession(false)}
        existingSessionsCount={allSessions.length}
      />

      {/* 10. Discount & Adjustment Modal */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        discount={discount}
        setDiscount={setDiscount}
        discountType={discountType}
        setDiscountType={setDiscountType}
      />

      {/* 11. Filters Modal (الفلاتر المتقدمة) */}
      <AdvancedFiltersModal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        productsCount={products.length}
        availableCategories={availableCategories}
        suppliers={suppliers}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterSupplier={filterSupplier}
        setFilterSupplier={setFilterSupplier}
        filterStockStatus={filterStockStatus}
        setFilterStockStatus={setFilterStockStatus}
        isFeaturedOnly={isFeaturedOnly}
        setIsFeaturedOnly={setIsFeaturedOnly}
        onClearAll={handleClearAllFilters}
      />

      {/* 12. Customize Layout Modal (إعدادات العرض) */}
      <CustomizeLayoutModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        posLayout={posLayout}
        setPosLayout={setPosLayout}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showProductImages={showProductImages}
        setShowProductImages={setShowProductImages}
        uiZoom={uiZoom}
        setUiZoom={setUiZoom}
      />

      {/* 13. Save as Proforma / Quotation Modal */}
      <SaveAsProformaModal
        isOpen={showSaveAsProformaModal}
        onClose={() => setShowSaveAsProformaModal(false)}
        onConfirm={async () => {
          const saleId = createId();
          const proformaSale: Sale = {
            id: saleId,
            number: `PRF-${Date.now().toString().slice(-6)}`,
            type: 'facture',
            status: 'draft',
            items: cart.map((i) => ({
              productId: i.productId,
              name: i.name,
              qty: i.qty,
              unitPrice: i.unitPrice,
              lineTotal: i.lineTotal,
            })),
            customerId: selectedCustomer || undefined,
            subtotal: saleSummary.subtotal,
            discount: saleSummary.discountAmount,
            discountType,
            tva: saleSummary.tvaAmount,
            tvaRate: settingsOrDefault.tvaRate,
            total: saleSummary.total,
            paidAmount: 0,
            changeDue: 0,
            paymentMethod: 'cash',
            cashierId: currentUser?.id || 'cashier',
            cashierName: currentUser?.name || 'الكاشير',
            notes: 'فاتورة مبدئية / عرض أسعار',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await db.sales.add(proformaSale);
          queryClient.invalidateQueries({ queryKey: ['sales'] });
          clearCart();
          addNotification({ title: 'تم الحفظ', message: 'تم حفظ الفاتورة المبدئية بنجاح', type: 'success' });
        }}
      />

      {/* 14. Save as Order Modal */}
      <SaveAsOrderModal
        isOpen={showSaveAsOrderModal}
        onClose={() => setShowSaveAsOrderModal(false)}
        onConfirm={async () => {
          const saleId = createId();
          const orderSale: Sale = {
            id: saleId,
            number: `ORD-${Date.now().toString().slice(-6)}`,
            type: 'bon',
            status: 'draft',
            items: cart.map((i) => ({
              productId: i.productId,
              name: i.name,
              qty: i.qty,
              unitPrice: i.unitPrice,
              lineTotal: i.lineTotal,
            })),
            customerId: selectedCustomer || undefined,
            subtotal: saleSummary.subtotal,
            discount: saleSummary.discountAmount,
            discountType,
            tva: saleSummary.tvaAmount,
            tvaRate: settingsOrDefault.tvaRate,
            total: saleSummary.total,
            paidAmount: 0,
            changeDue: 0,
            paymentMethod: 'cash',
            cashierId: currentUser?.id || 'cashier',
            cashierName: currentUser?.name || 'الكاشير',
            notes: 'طلبية زبون معلقة للتجهيز',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await db.sales.add(orderSale);
          queryClient.invalidateQueries({ queryKey: ['sales'] });
          clearCart();
          addNotification({ title: 'تم الحفظ', message: 'تم تسجيل طلبيّة الزبون بنجاح', type: 'success' });
        }}
      />

      {/* 15. Quick Add Product Modal */}
      <QuickProductModal
        isOpen={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onProductCreatedAndAdded={(product) => {
          handleAddProduct(product);
        }}
      />
    </div>
  );
}
