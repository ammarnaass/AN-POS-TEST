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
import { useOpenCashSession } from '@/features/cash/useOpenCashSession';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Banknote, UserPlus, Clock, X, Package, RotateCcw,
  FileText, File, Truck, AlertTriangle, Receipt, Layers, ChevronLeft, ChevronRight, Wallet,
  Printer, Sun, Filter, Maximize, Bell, Moon, Menu, LayoutGrid, List, Barcode, Zap, ScanLine,
  CreditCard, ArrowLeftRight, CheckCircle2, HelpCircle, Delete, PauseCircle, PlayCircle,
  Percent, ShieldCheck, DollarSign, Store, Tag, Sparkles, UserCheck, ArrowUpRight,
  Info, Smartphone, Cloud, CloudCheck, Keyboard, Star, SlidersHorizontal, PlusCircle,
  Edit3, Sliders, History, FileCheck, ChevronDown, ShoppingBag, Save, FileSpreadsheet,
  Minimize, Image as ImageIcon, Columns, Rows, PanelBottom, PanelRight, LayoutDashboard
} from 'lucide-react';
import { v4 as createId } from 'uuid';

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

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Database Queries
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.where('status').equals('active').toArray(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => db.suppliers.where('status').equals('active').toArray(),
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
  const [posLayout, setPosLayout] = useState<'sidebar' | 'bottom'>(() => {
    return (localStorage.getItem('pos_layout_mode') as 'sidebar' | 'bottom') || 'bottom';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Always handle Escape to close any open modal
      if (e.key === 'Escape') {
        e.preventDefault();
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
        return;
      }

      // If user is typing in an input/textarea (and not pressing F-keys), let default text entry work
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isInput) {
        if (e.key === 'Enter') {
          if (showPaymentModal) {
            e.preventDefault();
            handleExecutePayment();
            return;
          }
          if (showSuccessModal) {
            e.preventDefault();
            setShowSuccessModal(false);
            return;
          }
        }
        if (!e.key.startsWith('F') && e.key !== 'Escape') {
          return;
        }
      }

      switch (e.key) {
        // شاشة المبيعات
        case 'F1':
          e.preventDefault();
          if (cart.length > 0) {
            if (e.shiftKey) {
              clearCart();
              setSelectedCustomer('');
              setDiscount(0);
              addNotification({
                title: 'إفراغ السلة (F1)',
                message: 'تم تفريغ سلة المشتريات بالكامل',
                type: 'info',
              });
            } else {
              if (!isSessionOpen) {
                setShowSessionWarning(true);
                return;
              }
              setPaidAmount(saleSummary.total);
              setShowPaymentModal(true);
            }
          } else {
            addNotification({
              title: 'السلة فارغة',
              message: 'أضف منتجات للسلة لتسوية الفاتورة (F1)',
              type: 'info',
            });
          }
          break;

        case 'F2':
          e.preventDefault();
          if (cart.length > 0) {
            handleSuspend();
          } else {
            addNotification({
              title: 'السلة فارغة',
              message: 'أضف منتجات للسلة لتعليق الطلب كمسودة (F2)',
              type: 'warning',
            });
          }
          break;

        case 'F3':
          e.preventDefault();
          setShowSuspended(true);
          break;

        case 'F4':
          e.preventDefault();
          if (e.shiftKey || cart.length === 0) {
            setShowReturnSaleModal(true);
          } else {
            clearCart();
            setSelectedCustomer('');
            setDiscount(0);
            addNotification({
              title: 'إلغاء السلة (F4)',
              message: 'تم تفريغ سلة المشتريات بالكامل',
              type: 'info',
            });
          }
          break;

        // عمليات سريعة
        case 'F5':
          e.preventDefault();
          setAutoPrintReceipt((prev) => {
            const next = !prev;
            addNotification({
              title: next ? 'الطباعة التلقائية: مفعلة (F5)' : 'الطباعة التلقائية: معطلة (F5)',
              message: next ? 'سيتم طباعة الوصل تلقائياً عند تسوية الفاتورة' : 'تم إيقاف الطباعة التلقائية',
              type: 'info',
            });
            return next;
          });
          break;

        case 'F6':
          e.preventDefault();
          setIsFeaturedOnly((prev) => {
            const next = !prev;
            addNotification({
              title: next ? 'فلتر المميزة: مفعّل (F6)' : 'عرض جميع المنتجات',
              message: next ? 'يتم عرض المنتجات المميزة فقط' : 'تم إلغاء تصفية المميزة',
              type: 'info',
            });
            return next;
          });
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
          setShowReturnSaleModal(true);
          break;

        case 'F12':
          e.preventDefault();
          if (cart.length > 0) {
            const targetItem = selectedItemId
              ? cart.find((i) => i.productId === selectedItemId) || cart[cart.length - 1]
              : cart[cart.length - 1];
            const newQtyStr = prompt(`أدخل الكمية الجديدة لـ (${targetItem.name}):`, targetItem.qty.toString());
            if (newQtyStr) {
              const q = parseFloat(newQtyStr);
              if (!isNaN(q) && q > 0) {
                handleUpdateQty(targetItem, q);
              }
            }
          }
          break;

        case '+':
        case '=':
          e.preventDefault();
          if (cart.length > 0) {
            const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
            if (targetId) {
              const it = cart.find((c) => c.productId === targetId);
              if (it) handleUpdateQty(it, it.qty + 1);
            }
          }
          break;

        case '-':
        case '_':
          e.preventDefault();
          if (cart.length > 0) {
            const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
            if (targetId) {
              const it = cart.find((c) => c.productId === targetId);
              if (it) handleUpdateQty(it, Math.max(1, it.qty - 1));
            }
          }
          break;

        case 'Delete':
          e.preventDefault();
          if (cart.length > 0) {
            const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
            if (targetId) {
              removeItem(targetId);
              if (selectedItemId === targetId) setSelectedItemId(null);
            }
          }
          break;

        case '?':
          e.preventDefault();
          setShowShortcutsModal(true);
          break;

        case 'Enter':
          if (showSuccessModal) {
            e.preventDefault();
            setShowSuccessModal(false);
          } else if (showPaymentModal) {
            e.preventDefault();
            handleExecutePayment();
          } else if (!showFreeProductModal && !showAddCustomer && !showAddProduct && !showSuspended && !showReturnSaleModal && !showCustomizeModal && !showDiscountModal && cart.length > 0) {
            if (!(e.target instanceof HTMLInputElement) || e.target === searchInputRef.current) {
              e.preventDefault();
              if (isSessionOpen) {
                setPaidAmount(saleSummary.total);
                setShowPaymentModal(true);
              } else {
                setShowSessionWarning(true);
              }
            }
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    selectedItemId,
    isSessionOpen,
    saleSummary.total,
    showPaymentModal,
    showSuccessModal,
    showShortcutsModal,
    showSuspended,
    showReturnSaleModal,
    showCustomizeModal,
    showDiscountModal,
    showAddProduct,
    showAddCustomer,
    showFreeProductModal,
    showOpenSession,
    showSessionWarning,
    handleSuspend,
    handleExecutePayment,
    handleUpdateQty,
    clearCart,
    removeItem,
    addNotification,
  ]);

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
          {/* Sidebar Menu Button on smaller screens */}
          <button
            onClick={openSidebar}
            className="lg:hidden text-on-surface-variant hover:text-on-surface p-2 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
            title="القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
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
            onClick={() => setShowOpenSession(true)}
            className="group relative w-8.5 h-8.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/25 hover:border-primary/50 flex items-center justify-center text-primary hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xs"
            title="المناوبات والجلسات النشطة"
          >
            <PlayCircle className="w-4 h-4 text-primary" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
              <span className="relative w-4 h-4 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white text-[9px] font-black flex items-center justify-center font-mono shadow-xs">
                3
              </span>
            </span>
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
          {/* Category Dropdown Button */}
          <div className="relative shrink-0" ref={categoryDropdownRef}>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 hover:border-primary/40 text-xs font-bold text-on-surface flex items-center gap-1.5 sm:gap-2 transition-all shadow-xs shrink-0"
            >
              <Layers className="w-4 h-4 text-primary" />
              <span className="max-w-[120px] truncate">{filterCategory || 'جميع المنتجات'}</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCategoryDropdown && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-surface-container-low/95 backdrop-blur-md rounded-2xl shadow-xl border border-outline-variant/25 p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => { setFilterCategory(''); setShowCategoryDropdown(false); }}
                  className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    !filterCategory ? 'bg-primary text-on-primary shadow-xs' : 'hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  جميع المنتجات ({products.length})
                </button>
                {availableCategories.map((cat) => {
                  const catName = typeof cat === 'object' && cat !== null ? (cat as any).name : String(cat);
                  return (
                    <button
                      key={catName}
                      onClick={() => { setFilterCategory(catName); setShowCategoryDropdown(false); }}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        filterCategory === catName ? 'bg-primary text-on-primary shadow-xs' : 'hover:bg-surface-container-high text-on-surface'
                      }`}
                    >
                      {catName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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

          {/* Add Product Prominent Gradient Button */}
          <button
            onClick={() => setShowAddProduct(true)}
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-on-primary text-xs font-extrabold transition-all flex items-center gap-1.5 sm:gap-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة منتج</span>
          </button>

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

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA: CART PANEL + PRODUCT CATALOG            */}
      {/* ========================================================= */}
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

          {/* Bottom Financial & Action Bar for Design 2 (الملخص أسفل المنتجات) */}
          {posLayout === 'bottom' && (
            <div className="bg-surface-container/90 backdrop-blur-md border-t border-outline-variant/20 p-4 shrink-0 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Right Column (RTL): Financial Summary */}
                <div className="lg:col-span-5 flex flex-col justify-center space-y-2.5 border-l border-outline-variant/15 pl-4">
                  <div className="bg-surface-container-lowest/80 rounded-2xl p-3.5 border border-outline-variant/15 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs text-on-surface-variant">
                      <span className="font-bold text-xs">المجموع الفرعي:</span>
                      <span className="font-mono font-bold text-on-surface text-sm">
                        {formatMoney(saleSummary?.subtotal)} دج
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-on-surface-variant">
                      <button
                        onClick={() => setShowDiscountModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تخفيض / زيادة</span>
                      </button>
                      <span className="font-mono font-bold text-primary text-sm">
                        {saleSummary && saleSummary.discountAmount > 0 ? `-${formatMoney(saleSummary.discountAmount)}` : '0.00'} دج
                      </span>
                    </div>

                    <div className="pt-2 border-t border-dashed border-outline-variant/25 flex items-baseline justify-between">
                      <span className="text-xs font-extrabold text-on-surface">الإجمالي المستحق</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl lg:text-4xl font-black font-mono text-primary tracking-tight drop-shadow-xs">
                          {formatMoney(saleSummary?.total)}
                        </span>
                        <span className="text-base font-extrabold text-primary">دج</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left Column (RTL): Action Buttons & Settlement */}
                <div className="lg:col-span-7 space-y-2.5">
                  {/* 5 Quick Action Buttons */}
                  <div className="grid grid-cols-5 gap-2">
                    {/* إلغاء F4 */}
                    <button
                      onClick={() => clearCart()}
                      disabled={cart.length === 0}
                      className="py-2.5 px-1 rounded-2xl bg-surface-container-low/90 hover:bg-red-500/15 text-red-600 border border-outline-variant/20 hover:border-red-500/30 flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-xs hover:-translate-y-0.5 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4 mb-0.5 text-red-500" />
                      <span className="text-[11px] font-bold">إلغاء</span>
                      <span className="text-[9px] font-mono opacity-75">F4</span>
                    </button>

                    {/* تعليق F2 */}
                    <button
                      onClick={handleSuspend}
                      disabled={cart.length === 0}
                      className="py-2.5 px-1 rounded-2xl bg-surface-container-low/90 hover:bg-amber-500/15 text-amber-600 border border-outline-variant/20 hover:border-amber-500/30 flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-xs hover:-translate-y-0.5 active:scale-95"
                    >
                      <Save className="w-4 h-4 mb-0.5 text-amber-500" />
                      <span className="text-[11px] font-bold">تعليق</span>
                      <span className="text-[9px] font-mono opacity-75">F2</span>
                    </button>

                    {/* سجل */}
                    <button
                      onClick={() => setShowReturnSaleModal(true)}
                      className="py-2.5 px-1 rounded-2xl bg-surface-container-low/90 hover:bg-blue-500/15 text-blue-600 border border-outline-variant/20 hover:border-blue-500/30 flex flex-col items-center justify-center transition-all shadow-xs hover:-translate-y-0.5 active:scale-95"
                    >
                      <History className="w-4 h-4 mb-0.5 text-blue-500" />
                      <span className="text-[11px] font-bold">سجل</span>
                      <span className="text-[9px] font-mono opacity-75">F4</span>
                    </button>

                    {/* مسودات F3 */}
                    <button
                      onClick={() => setShowSuspended(true)}
                      className="py-2.5 px-1 rounded-2xl bg-surface-container-low/90 hover:bg-purple-500/15 text-purple-600 border border-outline-variant/20 hover:border-purple-500/30 flex flex-col items-center justify-center transition-all relative shadow-xs hover:-translate-y-0.5 active:scale-95"
                    >
                      <PauseCircle className="w-4 h-4 mb-0.5 text-purple-500" />
                      <span className="text-[11px] font-bold">مسودات</span>
                      <span className="text-[9px] font-mono opacity-75">F3</span>
                      {suspendedOrders.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                      )}
                    </button>

                    {/* طباعة F5 */}
                    <button
                      onClick={() => {
                        setAutoPrintReceipt(!autoPrintReceipt);
                        addNotification({
                          title: 'الطباعة التلقائية',
                          message: !autoPrintReceipt ? 'تم تفعيل الطباعة التلقائية للإيصالات' : 'تم إيقاف الطباعة التلقائية',
                          type: 'info'
                        });
                      }}
                      className={`py-2.5 px-1 rounded-2xl border flex flex-col items-center justify-center transition-all shadow-xs hover:-translate-y-0.5 active:scale-95 ${
                        autoPrintReceipt
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shadow-emerald-500/10'
                          : 'bg-surface-container-low/90 text-on-surface-variant border-outline-variant/20'
                      }`}
                    >
                      <Printer className="w-4 h-4 mb-0.5 text-emerald-600" />
                      <span className="text-[11px] font-bold">طباعة</span>
                      <span className="text-[9px] font-mono opacity-75">F5</span>
                    </button>
                  </div>

                  {/* Giant Dominant Blue Button: تسوية الفاتورة F1 */}
                  <button
                    onClick={() => {
                      if (!isSessionOpen) { setShowSessionWarning(true); return; }
                      if (cart.length === 0) return;
                      setPaidAmount(saleSummary.total);
                      setShowPaymentModal(true);
                    }}
                    disabled={cart.length === 0 || isSalePending}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-on-primary font-black flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Receipt className="w-5 h-5" />
                    <span className="text-base font-black">تسوية الفاتورة</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-lg bg-white/20 font-mono font-bold">
                      F1
                    </span>
                  </button>

                  {/* Two Auxiliary Action Buttons: حفظ كفاتورة مبدئية (Right) & حفظ كطلبية (Left) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (cart.length === 0) return;
                        setShowSaveAsProformaModal(true);
                      }}
                      disabled={cart.length === 0}
                      className="py-2.5 px-3 rounded-2xl bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/30 text-amber-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95"
                    >
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span>حفظ كفاتورة مبدئية</span>
                    </button>

                    <button
                      onClick={() => {
                        if (cart.length === 0) return;
                        setShowSaveAsOrderModal(true);
                      }}
                      disabled={cart.length === 0}
                      className="py-2.5 px-3 rounded-2xl bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/30 text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95"
                    >
                      <FileCheck className="w-4 h-4 text-blue-500" />
                      <span>حفظ كطلبية</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
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

          {/* Customer Search / Selector Bar */}
          <div className="p-3 bg-surface-container/80 border-b border-outline-variant/15 flex items-center gap-2 shrink-0 shadow-2xs">
            <div className="relative flex-1 group">
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full h-10 pr-3.5 pl-8 bg-surface-container-low/90 hover:bg-surface-container border border-outline-variant/20 focus:border-primary/50 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all shadow-2xs"
              >
                <option value="">البحث عن زبون بالاسم أو المعرف...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.balance && c.balance > 0 ? `(دين: ${formatNumber(c.balance)} دج)` : ''}
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/70 text-[10px]">
                ▼
              </div>
            </div>

            <button
              onClick={() => setShowAddCustomer(true)}
              className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-600 flex items-center justify-center font-bold transition-all shrink-0 shadow-2xs hover:scale-105 active:scale-95"
              title="إضافة زبون جديد"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Items Scrollable List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
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
            <div className="p-4 bg-surface-container/90 backdrop-blur-md border-t border-outline-variant/20 space-y-3 shrink-0 shadow-2xl">
              
              {/* Financial Summary */}
              <div className="bg-surface-container-lowest/80 rounded-2xl p-3.5 border border-outline-variant/15 shadow-xs space-y-2 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span className="font-bold text-xs">المجموع الفرعي:</span>
                  <span className="font-mono font-bold text-on-surface text-sm">
                    {formatMoney(saleSummary?.subtotal)} دج
                  </span>
                </div>

                {/* Discount / Extra with Edit Button */}
                <div className="flex items-center justify-between text-on-surface-variant">
                  <button
                    onClick={() => setShowDiscountModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تخفيض / زيادة</span>
                  </button>
                  <span className="font-mono font-bold text-primary text-sm">
                    {saleSummary && saleSummary.discountAmount > 0 ? `-${formatMoney(saleSummary.discountAmount)}` : '0.00'} دج
                  </span>
                </div>

                {/* Giant Dominant Total Line */}
                <div className="pt-2 border-t border-dashed border-outline-variant/25 flex justify-between items-baseline">
                  <span className="text-xs font-extrabold text-on-surface">الإجمالي المستحق:</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-mono text-primary tracking-tight drop-shadow-xs">
                      {formatMoney(saleSummary?.total)}
                    </span>
                    <span className="text-xs text-primary font-bold">دج</span>
                  </div>
                </div>
              </div>

              {/* Row of 5 Quick Action Buttons */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {/* إلغاء F4 */}
                <button
                  onClick={() => clearCart()}
                  disabled={cart.length === 0}
                  className="py-2 px-1 rounded-xl bg-surface-container hover:bg-red-500/15 text-red-600 border border-outline-variant/15 flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-xs hover:-translate-y-0.5 active:scale-95"
                >
                  <Trash2 className="w-4 h-4 mb-0.5 text-red-500" />
                  <span className="text-[11px] font-bold">إلغاء</span>
                  <span className="text-[9px] font-mono opacity-75">F4</span>
                </button>

                {/* تعليق F2 */}
                <button
                  onClick={handleSuspend}
                  disabled={cart.length === 0}
                  className="py-2 px-1 rounded-xl bg-surface-container hover:bg-amber-500/15 text-amber-600 border border-outline-variant/15 flex flex-col items-center justify-center transition-all disabled:opacity-40 shadow-xs hover:-translate-y-0.5 active:scale-95"
                >
                  <Save className="w-4 h-4 mb-0.5 text-amber-500" />
                  <span className="text-[11px] font-bold">تعليق</span>
                  <span className="text-[9px] font-mono opacity-75">F2</span>
                </button>

                {/* سجل */}
                <button
                  onClick={() => setShowReturnSaleModal(true)}
                  className="py-2 px-1 rounded-xl bg-surface-container hover:bg-blue-500/15 text-blue-600 border border-outline-variant/15 flex flex-col items-center justify-center transition-all shadow-xs hover:-translate-y-0.5 active:scale-95"
                >
                  <History className="w-4 h-4 mb-0.5 text-blue-500" />
                  <span className="text-[11px] font-bold">سجل</span>
                  <span className="text-[9px] font-mono opacity-75">F4</span>
                </button>

                {/* مسودات F3 */}
                <button
                  onClick={() => setShowSuspended(true)}
                  className="py-2 px-1 rounded-xl bg-surface-container hover:bg-purple-500/15 text-purple-600 border border-outline-variant/15 flex flex-col items-center justify-center transition-all relative shadow-xs hover:-translate-y-0.5 active:scale-95"
                >
                  <PauseCircle className="w-4 h-4 mb-0.5 text-purple-500" />
                  <span className="text-[11px] font-bold">مسودات</span>
                  <span className="text-[9px] font-mono opacity-75">F3</span>
                  {suspendedOrders.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  )}
                </button>

                {/* طباعة F5 */}
                <button
                  onClick={() => {
                    setAutoPrintReceipt(!autoPrintReceipt);
                    addNotification({
                      title: 'الطباعة التلقائية',
                      message: !autoPrintReceipt ? 'تم تفعيل الطباعة التلقائية للإيصالات' : 'تم إيقاف الطباعة التلقائية',
                      type: 'info'
                    });
                  }}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all shadow-xs hover:-translate-y-0.5 active:scale-95 ${
                    autoPrintReceipt
                      ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shadow-emerald-500/10'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant/15'
                  }`}
                >
                  <Printer className="w-4 h-4 mb-0.5 text-emerald-600" />
                  <span className="text-[11px] font-bold">طباعة</span>
                  <span className="text-[9px] font-mono opacity-75">F5</span>
                </button>
              </div>

              {/* Giant Dominant Blue Button: تسوية الفاتورة F1 */}
              <button
                onClick={() => {
                  if (!isSessionOpen) { setShowSessionWarning(true); return; }
                  if (cart.length === 0) return;
                  setPaidAmount(saleSummary.total);
                  setShowPaymentModal(true);
                }}
                disabled={cart.length === 0 || isSalePending}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-on-primary font-black flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Receipt className="w-5 h-5" />
                <span className="text-base font-black">تسوية الفاتورة</span>
                <span className="text-xs px-2.5 py-0.5 rounded-lg bg-white/20 font-mono font-bold">
                  F1
                </span>
              </button>

              {/* Two Bottom Auxiliary Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    if (cart.length === 0) return;
                    setShowSaveAsProformaModal(true);
                  }}
                  disabled={cart.length === 0}
                  className="py-2.5 px-2 rounded-xl bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/30 text-amber-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>حفظ كفاتورة مبدئية</span>
                </button>

                <button
                  onClick={() => {
                    if (cart.length === 0) return;
                    setShowSaveAsOrderModal(true);
                  }}
                  disabled={cart.length === 0}
                  className="py-2.5 px-2 rounded-xl bg-blue-500/5 hover:bg-blue-500/15 border border-blue-500/30 text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>حفظ كطلبية</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FLOATING MOBILE CART SUMMARY BAR (Visible on mobile during product browsing) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {mobileTab === 'products' && cart.length > 0 && (
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

      {/* 1. Complete Payment Modal (F8) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">إتمام الدفع وتأكيد البيع</h3>
                  <p className="text-xs text-on-surface-variant">اختر وسيلة الدفع واستلم المبلغ من الزبون</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Grand Total Dominant Banner */}
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-right">
                <span className="text-xs font-bold text-on-surface-variant">المبلغ المطلوب للدفع:</span>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-2xl font-extrabold text-primary">
                    {formatMoney(saleSummary?.total)}
                  </span>
                  <span className="text-xs font-bold text-primary">دج</span>
                </div>
              </div>

              {/* Payment Methods Tabs */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'نقداً', icon: Banknote },
                  { id: 'card', label: 'بطاقة', icon: CreditCard },
                  { id: 'transfer', label: 'تحويل', icon: ArrowLeftRight },
                  { id: 'credit', label: 'آجل / ذمم', icon: UserCheck },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                        active
                          ? 'bg-primary text-on-primary border-primary shadow-sm'
                          : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/15'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-bold">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Denominations and Paid Input */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">المبلغ المدفوع من الزبون:</label>
                    <input
                      type="number"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                      placeholder={saleSummary.total.toString()}
                      className="w-full h-12 px-4 bg-surface-container border border-outline-variant/20 rounded-xl text-lg font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { label: 'المبلغ بالضبط', val: saleSummary.total },
                      { label: '+500 دج', val: saleSummary.total + 500 },
                      { label: '+1,000 دج', val: saleSummary.total + 1000 },
                      { label: '+2,000 دج', val: saleSummary.total + 2000 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setPaidAmount(btn.val)}
                        className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface transition-all"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Live Change Calculation Card */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isPaidSufficient
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                  }`}>
                    <span className="text-xs font-bold">
                      {isPaidSufficient ? 'المبلغ المتبقي للزبون (الفكة):' : 'المبلغ المتبقي غير كافٍ:'}
                    </span>
                    <span className="text-xl font-extrabold font-mono">
                      {formatMoney(changeDue)} دج
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'credit' && !selectedCustomer && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-bold">
                  ⚠️ يجب اختيار زبون من القائمة لتسجيل الفاتورة كدين آجل.
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-surface-container border-t border-outline-variant/15 flex items-center gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all"
              >
                إلغاء (Esc)
              </button>
              <button
                onClick={handleExecutePayment}
                disabled={isSalePending || (paymentMethod === 'credit' && !selectedCustomer)}
                className="flex-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isSalePending ? 'جاري الحفظ...' : 'تأكيد ودفع الفاتورة (Enter)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Payment Success Modal */}
      {showSuccessModal && completedSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-on-surface">تمت عملية البيع بنجاح</h3>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                فاتورة رقم: #{completedSale.number}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-1.5 text-xs">
              <div className="flex justify-between text-on-surface-variant">
                <span>المبلغ الإجمالي:</span>
                <span className="font-bold text-on-surface font-mono">
                  {formatNumber(completedSale.total)} دج
                </span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>وسيلة الدفع:</span>
                <span className="font-bold text-on-surface">{completedSale.paymentMethod === 'cash' ? 'نقداً' : 'آجل'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  printDocument(completedSale.id, 'thermal-receipt', { copies: 1 });
                }}
                className="py-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>إعادة الطباعة</span>
              </button>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="py-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                autoFocus
              >
                <Plus className="w-4 h-4" />
                <span>بيع جديد (Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Keyboard Shortcuts Guide Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">اختصارات لوحة المفاتيح</h3>
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
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary">شاشة المبيعات</h4>
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
                      className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between hover:border-primary/30 transition-all"
                    >
                      <div>
                        <p className="text-xs font-bold text-on-surface">{s.label}</p>
                        <p className="text-[10px] text-on-surface-variant">{s.desc}</p>
                      </div>
                      <kbd className="px-3 py-1.5 rounded-xl bg-surface border-2 border-outline-variant/30 text-primary font-mono font-extrabold text-xs shadow-xs min-w-10 text-center">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 2: Quick Operations */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">عمليات سريعة</h4>
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
                      className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between hover:border-amber-500/30 transition-all"
                    >
                      <div>
                        <p className="text-xs font-bold text-on-surface">{s.label}</p>
                        <p className="text-[10px] text-on-surface-variant">{s.desc}</p>
                      </div>
                      <kbd className="px-2.5 py-1.5 rounded-xl bg-surface border-2 border-outline-variant/30 text-amber-600 dark:text-amber-400 font-mono font-extrabold text-xs shadow-xs text-center">
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

      {/* Free Product Modal (F8) */}
      {showFreeProductModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
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
                  placeholder="مثال: خدمة توصيل / منتج مخصص"
                  className="w-full h-11 px-3 bg-surface border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">السعر الإفرادي (دج) *</label>
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
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
              >
                إضافة للسلة (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Quick Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">إضافة زبون سريع</h3>
              </div>
              <button onClick={() => setShowAddCustomer(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">اسم الزبون *</label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="مثال: أحمد بن علي"
                  className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="05 / 06 / 07..."
                  className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowAddCustomer(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={!newCustomerName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold disabled:opacity-50"
              >
                إضافة واختيار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Suspended Orders Modal */}
      {showSuspended && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">الفواتير والطلبات المعلقة ({suspendedOrders.length})</h3>
              </div>
              <button onClick={() => setShowSuspended(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            {suspendedOrders.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant text-xs">
                لا توجد طلبات معلقة حالياً
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {suspendedOrders.map((order) => (
                  <div key={order.id} className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-on-surface">{order.items.length} أصناف في الطلب</p>
                      <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                        {new Date(order.createdAt).toLocaleTimeString('ar-DZ')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleResumeOrder(order.id)}
                      className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-2xs hover:bg-primary/90"
                    >
                      استرجاع للبيع
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Return Sale Selection Modal */}
      {showReturnSaleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold text-on-surface">اختر فاتورة سابقة للإرجاع</h3>
              </div>
              <button onClick={() => setShowReturnSaleModal(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {sales.slice(0, 30).map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectReturnSale(s)}
                  className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 hover:border-red-500/40 hover:bg-red-500/5 cursor-pointer flex items-center justify-between transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-on-surface">فاتورة #{s.number}</p>
                    <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                      {new Date(s.date).toLocaleDateString('ar-DZ')} — {s.items.length} أصناف
                    </p>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-primary font-mono">{formatNumber(s.total)} دج</span>
                    <p className="text-[10px] text-on-surface-variant">{s.soldBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Session Warning Modal */}
      {showSessionWarning && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">يجب فتح مناوبة أولاً</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                لا يمكن إتمام المبيعات أو تحصيل النقود بدون جلسة ومناوبة صندوق مفتوحة.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSessionWarning(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant"
              >
                إلغاء
              </button>
              <button
                onClick={() => { setShowSessionWarning(false); setShowOpenSession(true); }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm"
              >
                فتح المناوبة الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Open Session Modal */}
      {showOpenSession && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">فتح مناوبة جديدة</h3>
              </div>
              <button onClick={() => setShowOpenSession(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">الرصيد الافتتاحي للصندوق (دج):</label>
              <input
                type="number"
                value={openingBalance || ''}
                onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full h-11 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface"
                autoFocus
              />
            </div>

            <button
              onClick={async () => {
                const sessionId = createId();
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
                setShowOpenSession(false);
                setOpeningBalance(0);
                addNotification({ title: 'تم فتح المناوبة', message: `مناوبة رقم #${sessionNumber} مفتوحة وجاهزة`, type: 'success' });
              }}
              className="w-full py-3 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 transition-all"
            >
              تأكيد فتح المناوبة
            </button>
          </div>
        </div>
      )}

      {/* 10. Discount & Adjustment Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">تخفيض / زيادة على الفاتورة</h3>
              </div>
              <button onClick={() => setShowDiscountModal(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center bg-surface-container rounded-xl p-1 border border-outline-variant/20">
                <button
                  onClick={() => setDiscountType('percent')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                    discountType === 'percent' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  نسبة مئوية (%)
                </button>
                <button
                  onClick={() => setDiscountType('amount')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                    discountType === 'amount' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  مبلغ مباشر (دج)
                </button>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">قيمة الخصم</label>
                <input
                  type="number"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full h-11 px-4 bg-surface-container border border-outline-variant/20 rounded-xl text-center font-mono text-base font-bold text-on-surface"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/15">
              <button
                onClick={() => { setDiscount(0); setShowDiscountModal(false); }}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container"
              >
                إلغاء الخصم
              </button>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm"
              >
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Customize Layout Modal (إعدادات العرض) */}
      {showCustomizeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-on-surface">إعدادات العرض</h3>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Section 1: التخطيط */}
              <div>
                <h4 className="text-xs font-bold text-on-surface-variant mb-2.5">التخطيط</h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: تصميم 1 - الملخص أسفل السلة */}
                  <button
                    onClick={() => {
                      setPosLayout('sidebar');
                      localStorage.setItem('pos_layout_mode', 'sidebar');
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 ${
                      posLayout === 'sidebar'
                        ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                        : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Columns className={`w-5 h-5 ${posLayout === 'sidebar' ? 'text-primary' : 'text-on-surface-variant'}`} />
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        posLayout === 'sidebar' ? 'border-primary' : 'border-outline-variant/40'
                      }`}>
                        {posLayout === 'sidebar' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">تصميم 1</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">الملخص أسفل السلة</p>
                    </div>
                  </button>

                  {/* Option 2: تصميم 2 - الملخص أسفل المنتجات */}
                  <button
                    onClick={() => {
                      setPosLayout('bottom');
                      localStorage.setItem('pos_layout_mode', 'bottom');
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 ${
                      posLayout === 'bottom'
                        ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                        : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Rows className={`w-5 h-5 ${posLayout === 'bottom' ? 'text-primary' : 'text-on-surface-variant'}`} />
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        posLayout === 'bottom' ? 'border-primary' : 'border-outline-variant/40'
                      }`}>
                        {posLayout === 'bottom' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">تصميم 2</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">الملخص أسفل المنتجات</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 2: نمط العرض */}
              <div>
                <h4 className="text-xs font-bold text-on-surface-variant mb-2.5">نمط العرض</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setViewMode('grid');
                      localStorage.setItem('pos_view_mode', 'grid');
                    }}
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                      viewMode === 'grid'
                        ? 'border-primary bg-primary text-on-primary font-bold shadow-xs'
                        : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container text-on-surface'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-xs font-bold">عرض شبكي</span>
                  </button>

                  <button
                    onClick={() => {
                      setViewMode('list');
                      localStorage.setItem('pos_view_mode', 'list');
                    }}
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                      viewMode === 'list'
                        ? 'border-primary bg-primary text-on-primary font-bold shadow-xs'
                        : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container text-on-surface'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span className="text-xs font-bold">عرض قائمة</span>
                  </button>
                </div>
              </div>

              {/* Section 3: إظهار الصور */}
              <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-on-surface">إظهار الصور</span>
                </div>
                <button
                  onClick={() => {
                    const next = !showProductImages;
                    setShowProductImages(next);
                    localStorage.setItem('pos_show_images', String(next));
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    showProductImages ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      showProductImages ? 'translate-x-0' : '-translate-x-5'
                    }`}
                  />
                </button>
              </div>

              {/* Section 4: تكبير الواجهة */}
              <div>
                <h4 className="text-xs font-bold text-on-surface-variant mb-2.5">تكبير الواجهة</h4>
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-container border border-outline-variant/15">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const next = Math.max(75, uiZoom - 5);
                        setUiZoom(next);
                        localStorage.setItem('pos_ui_zoom', String(next));
                      }}
                      className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center font-bold transition-all shadow-2xs"
                      title="تصغير (-)"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-14 text-center font-mono font-extrabold text-sm text-primary">
                      {uiZoom}%
                    </span>
                    <button
                      onClick={() => {
                        const next = Math.min(130, uiZoom + 5);
                        setUiZoom(next);
                        localStorage.setItem('pos_ui_zoom', String(next));
                      }}
                      className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center font-bold transition-all shadow-2xs"
                      title="تكبير (+)"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setUiZoom(100);
                      localStorage.setItem('pos_ui_zoom', '100');
                    }}
                    className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 text-xs font-bold"
                    title="إعادة ضبط (100%)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إعادة ضبط</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. Save as Proforma / Quotation Modal */}
      {showSaveAsProformaModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center mx-auto border border-blue-500/30">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">حفظ كفاتورة مبدئية / عرض أسعار</h3>
              <p className="text-xs text-on-surface-variant mt-1">سيتم حفظ الفاتورة بدون خصم من المخزون أو تسجيل مدفوعات مالية</p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/15">
              <button
                onClick={() => setShowSaveAsProformaModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  const saleId = createId();
                  const proformaSale: Sale = {
                    id: saleId,
                    number: `PRF-${Date.now().toString().slice(-6)}`,
                    type: 'facture',
                    status: 'draft',
                    items: cart.map(i => ({
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
                  setShowSaveAsProformaModal(false);
                  addNotification({ title: 'تم الحفظ', message: 'تم حفظ الفاتورة المبدئية بنجاح', type: 'success' });
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm"
              >
                تأكيد الحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. Save as Order Modal */}
      {showSaveAsOrderModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/30">
              <FileCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">حفظ كطلبية زبون معلقة</h3>
              <p className="text-xs text-on-surface-variant mt-1">سيتم تسجيل الطلبية لتجهيزها وتسليمها لاحقاً</p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/15">
              <button
                onClick={() => setShowSaveAsOrderModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  const saleId = createId();
                  const orderSale: Sale = {
                    id: saleId,
                    number: `ORD-${Date.now().toString().slice(-6)}`,
                    type: 'bon',
                    status: 'draft',
                    items: cart.map(i => ({
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
                  setShowSaveAsOrderModal(false);
                  addNotification({ title: 'تم الحفظ', message: 'تم تسجيل طلبيّة الزبون بنجاح', type: 'success' });
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm"
              >
                تأكيد الطلبية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. Quick Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">إضافة منتج سريع للمحل</h3>
              </div>
              <button onClick={() => setShowAddProduct(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block font-bold text-on-surface mb-1">اسم المنتج *</label>
                <input
                  type="text"
                  value={addProductForm.name}
                  onChange={(e) => setAddProductForm({ ...addProductForm, name: e.target.value })}
                  placeholder="اسم المنتج..."
                  className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">الباركود</label>
                <input
                  type="text"
                  value={addProductForm.barcode}
                  onChange={(e) => setAddProductForm({ ...addProductForm, barcode: e.target.value })}
                  placeholder="باركود..."
                  className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">التصنيف</label>
                <input
                  type="text"
                  value={addProductForm.category}
                  onChange={(e) => setAddProductForm({ ...addProductForm, category: e.target.value })}
                  placeholder="مشروبات، إلكترونيات..."
                  className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">سعر البيع (دج) *</label>
                <input
                  type="number"
                  value={addProductForm.retailPrice || ''}
                  onChange={(e) => setAddProductForm({ ...addProductForm, retailPrice: Number(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">الكمية الافتتاحية</label>
                <input
                  type="number"
                  value={addProductForm.quantity || ''}
                  onChange={(e) => setAddProductForm({ ...addProductForm, quantity: Number(e.target.value) || 0 })}
                  placeholder="10"
                  className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/15">
              <button
                onClick={() => setShowAddProduct(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  if (!addProductForm.name.trim() || addProductForm.retailPrice <= 0) return;
                  const newId = createId();
                  await db.products.add({
                    id: newId,
                    ...addProductForm,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  } as any);
                  queryClient.invalidateQueries({ queryKey: ['products'] });
                  handleAddProduct({ id: newId, ...addProductForm } as any);
                  setShowAddProduct(false);
                  setAddProductForm(emptyProduct);
                  addNotification({ title: 'تمت الإضافة', message: 'تم حفظ المنتج وإضافته للسلة', type: 'success' });
                }}
                disabled={!addProductForm.name.trim() || addProductForm.retailPrice <= 0}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold disabled:opacity-50 shadow-sm"
              >
                حفظ وإضافة للسلة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 15. Keyboard Shortcuts Help Modal (اختصارات لوحة المفاتيح) */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">اختصارات لوحة المفاتيح</h3>
                  <p className="text-[11px] text-on-surface-variant">التحكم السريع بدون استخدام الفأرة</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs">
              {/* Section 1: شاشة المبيعات */}
              <div>
                <h4 className="font-bold text-primary mb-2.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>شاشة المبيعات</span>
                </h4>
                <div className="space-y-1.5 bg-surface-container p-3 rounded-2xl border border-outline-variant/15">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-on-surface">البحث عن منتج بالاسم</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-primary text-xs shadow-2xs">F7</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">إفراغ السلة</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-red-600 text-xs shadow-2xs">F1</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">المبيعات السابقة / مرتجعات</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-blue-600 text-xs shadow-2xs">F4</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">حفظ السلة كمسودة</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-amber-600 text-xs shadow-2xs">F2</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">فتح المسودات للإسترجاع</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-purple-600 text-xs shadow-2xs">F3</kbd>
                  </div>
                </div>
              </div>

              {/* Section 2: عمليات سريعة */}
              <div>
                <h4 className="font-bold text-emerald-600 mb-2.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>عمليات سريعة</span>
                </h4>
                <div className="space-y-1.5 bg-surface-container p-3 rounded-2xl border border-outline-variant/15">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-on-surface">التنقل بين الطلبات السابقة</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-0.5 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-xs">F10</kbd>
                      <kbd className="px-2 py-0.5 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-xs">F9</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">الطباعة التلقائية (تفعيل/إيقاف)</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-emerald-600 text-xs shadow-2xs">F5</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">فلتر المنتجات المميزة</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-amber-500 text-xs shadow-2xs">F6</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">تعديل كمية آخر سطر في السلة</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-xs shadow-2xs">F12</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">زيادة / إنقاص كمية السطر المحدد</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-xs">+</kbd>
                      <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-xs">-</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: التنقل السريع */}
              <div>
                <h4 className="font-bold text-amber-600 mb-2.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  <span>التنقل السريع</span>
                </h4>
                <div className="space-y-1.5 bg-surface-container p-3 rounded-2xl border border-outline-variant/15">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-on-surface">منتج حر</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-amber-500 text-xs shadow-2xs">F8</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">تسوية الفاتورة والدفع</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-mono font-bold text-xs shadow-2xs">Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">حذف الصنف المحدد</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-red-600 text-xs shadow-2xs">Delete</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface">إغلاق النوافذ</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono font-bold text-xs shadow-2xs">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-container border-t border-outline-variant/15">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm"
              >
                إغلاق (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
