import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ScanLine,
  Zap,
  Tag,
  Sparkles,
  RotateCcw,
  User,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  FileText,
  Printer,
  CheckCircle2,
  Sliders,
  Moon,
  Sun,
  Maximize,
  Minimize,
  LogOut,
  Bell,
  Package,
  Layers,
  ShoppingBag,
  Camera,
  X,
  Edit3,
} from 'lucide-react';
import type { CartItem, Product, Category } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { getProductTierPrice } from '@/services';

interface ModernPOSLayoutProps {
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onEditPrice?: (productId: string, newPrice: number) => void;
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
  discount: number;
  discountType: 'percent' | 'amount';
  onOpenFreeProduct: () => void;
  onOpenReturns: () => void;
  returnMode: boolean;
  onOpenCustomize: () => void;
  wholesaleMode: boolean;
  toggleWholesaleMode: () => void;
  allProducts?: Product[];
  priceTier?: '1' | '2' | '3' | '4';
  onSelectPriceTier?: (tier: '1' | '2' | '3' | '4') => void;
  onSaveAsProforma?: () => void;
  onNewOrder?: () => void;
  onOpenSalesHistory?: () => void;
  onOpenNotifications?: () => void;
  notificationsCount?: number;
  invoiceNumber?: string | number;
  formatMoney: (amount?: number) => string;
  currency?: string;
  userName?: string;
  storeName?: string;
  isSessionOpen: boolean;
  isSalePending: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onNavigateBack: () => void;
  onOpenKeypadForQty?: (item: CartItem) => void;
  viewMode?: 'grid' | 'list';
  showProductImages?: boolean;
}

const ITEMS_PER_PAGE = 20;

export const ModernPOSLayout: React.FC<ModernPOSLayoutProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  onEditPrice,
  saleSummary,
  products,
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
  allProducts,
  priceTier: propPriceTier,
  onSelectPriceTier,
  onSaveAsProforma,
  onNewOrder,
  onOpenSalesHistory,
  onOpenNotifications,
  notificationsCount = 0,
  invoiceNumber = 1,
  formatMoney,
  currency = 'دج',
  isSalePending,
  onToggleFullscreen,
  isFullscreen,
  onNavigateBack,
  onOpenKeypadForQty,
  viewMode = 'grid',
  showProductImages = true,
}) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Pagination for products grid
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState('');

  // Active Price Tier ('1' = تجزئة, '2' = نصف جملة, '3' = جملة, '4' = خاص)
  const [internalPriceTier, setInternalPriceTier] = useState<'1' | '2' | '3' | '4'>('1');
  const priceTier = propPriceTier ?? internalPriceTier;

  const handleSelectPriceTier = (tier: '1' | '2' | '3' | '4') => {
    if (onSelectPriceTier) {
      onSelectPriceTier(tier);
    } else {
      setInternalPriceTier(tier);
      if (tier === '3' && !wholesaleMode) toggleWholesaleMode();
      if (tier === '1' && wholesaleMode) toggleWholesaleMode();
      const productList = allProducts && allProducts.length > 0 ? allProducts : products;
      if (onEditPrice && cart.length > 0) {
        cart.forEach((item) => {
          if (item.isPack) return;
          const prod = productList.find((p) => p.id === item.productId || (item.barcode && p.barcode === item.barcode));
          if (prod) {
            const newPrice = getProductTierPrice(prod, tier);
            if (newPrice > 0) {
              onEditPrice(item.productId, newPrice);
            }
          }
        });
      }
    }
  };

  // Total items and quantity count
  const totalUnitsCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  // Keep barcode input in focus
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [cart.length]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Paginated products
  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const displayedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return products.slice(start, start + ITEMS_PER_PAGE);
  }, [products, currentPage]);

  // Global Keyboard shortcuts (F1 - F9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        onSettleSale();
      } else if (e.key === 'F2') {
        e.preventDefault();
        onSuspendSale();
      } else if (e.key === 'F3') {
        e.preventDefault();
        onOpenSuspended();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) onClearCart();
      } else if (e.key === 'F5') {
        e.preventDefault();
        onToggleAutoPrint();
      } else if (e.key === 'F7') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        onOpenFreeProduct();
      } else if (e.key === 'F9') {
        e.preventDefault();
        onOpenReturns();
      } else if (e.altKey && e.key === '1') {
        e.preventDefault();
        handleSelectPriceTier('1');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        handleSelectPriceTier('2');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        handleSelectPriceTier('3');
      } else if (e.altKey && e.key === '4') {
        e.preventDefault();
        handleSelectPriceTier('4');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSettleSale, onSuspendSale, onOpenSuspended, onClearCart, onToggleAutoPrint, onOpenFreeProduct, onOpenReturns, cart.length, onSelectPriceTier, wholesaleMode, toggleWholesaleMode, allProducts, products, onEditPrice, propPriceTier]);

  const handlePriceSubmit = (productId: string) => {
    const num = parseFloat(customPriceInput);
    if (!isNaN(num) && num >= 0 && onEditPrice) {
      onEditPrice(productId, num);
    }
    setEditingPriceItemId(null);
    setCustomPriceInput('');
  };

  return (
    <div className="h-full w-full flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 font-cairo select-none" dir="rtl">
      {/* ─── 1. TOP NAVIGATION BAR ─── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Right side: Logo & Status & Mode switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/30">
              AN
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-tight">نظام نقاط البيع</h1>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                متصل بالشبكة (أونلاين)
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>

          {/* Quick Mode Switches */}
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => navigate('/pos/quick')}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs flex items-center gap-1.5 hover:bg-blue-50 transition cursor-pointer"
              title="الانتقال لنقطة البيع السريع"
            >
              <Zap className="w-4 h-4 fill-current text-blue-600 dark:text-blue-400" />
              <span>نقطة البيع السريع</span>
            </button>
            {/* فئات الأسعار الأربعة: س1 تجزئة، س2 نصف جملة، س3 جملة، س4 خاص */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleSelectPriceTier('1')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-bold ${
                  priceTier === '1'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="سعر التجزئة س1 (Alt+1)"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '1' ? 'bg-white' : 'bg-blue-500'}`} />
                <span>س1 (تجزئة)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPriceTier('2')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-bold ${
                  priceTier === '2'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="سعر نصف الجملة س2 (Alt+2)"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '2' ? 'bg-white' : 'bg-emerald-500'}`} />
                <span>س2</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPriceTier('3')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-bold ${
                  priceTier === '3'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="سعر الجملة س3 (Alt+3)"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '3' ? 'bg-white' : 'bg-purple-500'}`} />
                <span>س3 (جملة)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPriceTier('4')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-bold ${
                  priceTier === '4'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="سعر خاص س4 (Alt+4)"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '4' ? 'bg-white' : 'bg-amber-500'}`} />
                <span>س4 (خاص)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center: Universal Search & Barcode Entry */}
        <div className="flex-1 max-w-xl mx-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (barcodeInput.trim()) {
                onBarcodeSubmit(e);
              }
            }}
            className="relative flex items-center"
          >
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput || searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setBarcodeInput(val);
                setSearchQuery(val);
              }}
              placeholder="امسح الباركود أو ابحث باسم المنتج... (F7)"
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 rounded-xl pr-11 pl-20 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium transition-all outline-none"
            />
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center gap-1">
              <kbd className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded shadow-2xs">
                F7
              </kbd>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                type="submit"
                className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                title="مسح باركود"
              >
                <ScanLine className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>

        {/* Left side: Quick actions & utilities */}
        <div className="flex items-center gap-2">
          {/* Active Orders Count / Invoice Number */}
          <div className="flex items-center bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl font-bold text-xs border border-blue-100 dark:border-blue-800/50">
            <span className="w-2 h-2 rounded-full bg-blue-500 ml-1.5"></span>
            فاتورة رقم: #{invoiceNumber}
          </div>

          {/* Suspended orders / Notifications */}
          <button
            type="button"
            onClick={onOpenSuspended}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 relative cursor-pointer"
            title="الفواتير المعلقة"
          >
            <Bell className="w-4 h-4" />
            {suspendedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-bounce">
                {suspendedCount}
              </span>
            )}
          </button>

          {/* Dark/Light mode toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition"
            title="تبديل المظهر"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition"
            title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

          {/* Back button */}
          <button
            type="button"
            onClick={onNavigateBack}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="الرجوع للرئيسية"
          >
            <LogOut className="w-4 h-4 text-slate-300" />
            <span>الرجوع</span>
          </button>
        </div>
      </header>

      {/* ─── 2. HERO TOTAL BANNER (الشريط الإجمالي البارز) ─── */}
      <section
        className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shadow-lg z-10 px-6 py-3.5 flex flex-wrap items-center justify-between border-b border-blue-900 shrink-0"
        data-purpose="hero-total-indicator"
      >
        {/* Right Indicator: Grand Total (Prominent Highlight) */}
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wider text-blue-200 uppercase">المبلغ الإجمالي المستحق للدفع</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-xs font-mono">
                  {formatMoney(saleSummary.total)}
                </span>
                <span className="text-xl md:text-2xl font-black text-amber-400">{currency}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="hidden lg:flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs">
            <div>
              <span className="text-blue-200 block">المجموع الصافي:</span>
              <span className="font-bold text-white text-sm font-mono">{formatMoney(saleSummary.subtotal)} {currency}</span>
            </div>
            <div className="h-7 w-px bg-white/20"></div>
            <div>
              <span className="text-blue-200 block">الخصم المطبق:</span>
              <span className="font-bold text-emerald-300 text-sm font-mono">
                {formatMoney(saleSummary.discountAmount)} {currency} ({discount}%)
              </span>
            </div>
            <div className="h-7 w-px bg-white/20"></div>
            <div>
              <span className="text-blue-200 block">عدد العناصر:</span>
              <span className="font-bold text-white text-sm">
                {cart.length} أصناف ({totalUnitsCount} قطعة)
              </span>
            </div>
          </div>
        </div>

        {/* Left Controls: Quick Transaction Keys */}
        <div className="flex items-center gap-2">
          {/* Open discount modal */}
          <button
            type="button"
            onClick={onOpenDiscount}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition border border-white/20 cursor-pointer active:scale-95"
          >
            <Tag className="w-4 h-4" />
            <span>تطبيق تخفيض</span>
          </button>

          {/* F8 Free product */}
          <button
            type="button"
            onClick={onOpenFreeProduct}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-slate-900" />
            <span>منتج حر</span>
            <kbd className="px-1.5 py-0.2 bg-amber-500/40 rounded text-[10px] font-bold">F8</kbd>
          </button>

          {/* F9 Return */}
          <button
            type="button"
            onClick={onOpenReturns}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition border cursor-pointer active:scale-95 ${
              returnMode
                ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400 shadow-md'
                : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{returnMode ? 'إلغاء الإرجاع' : 'إرجاع'}</span>
            <kbd className="px-1.5 py-0.2 bg-black/20 rounded text-[10px] font-bold">F9</kbd>
          </button>
        </div>
      </section>

      {/* ─── 3. MAIN POS CONTENT (السلة يميناً والمنتجات يساراً) ─── */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* ── CART SIDEBAR (الجانب الأيمن - قائمة الفاتورة) ── */}
        <aside
          className="w-[380px] xl:w-[420px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col shrink-0 overflow-hidden"
          data-purpose="pos-cart-panel"
        >
          {/* Customer Info Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {selectedCustomerName || 'زبون عام (افتراضي)'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {selectedCustomerName ? 'زبون معتمد' : 'حساب عادي - دفع فوري'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onSelectCustomer}
              className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 transition cursor-pointer"
            >
              + تغيير الزبون
            </button>
          </div>

          {/* Items List in Cart */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Package className="w-12 h-12 stroke-[1.2] mb-2 opacity-40 text-blue-500" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">السلة فارغة</p>
                <p className="text-[11px] text-slate-400 mt-1">اختر أصنافاً من الشبكة أو امسح الباركود مباشرة للإضافة</p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const isEditing = editingPriceItemId === item.productId;
                const lineTotal = item.lineTotal ?? item.unitPrice * item.qty;

                return (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="p-3 rounded-xl hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          #{idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                            {item.name}
                          </h4>
                          <div className="text-xs text-slate-400 mt-0.5">
                            سعر الوحدة:{' '}
                            <span className="text-slate-600 dark:text-slate-300 font-semibold font-mono">
                              {formatMoney(item.unitPrice)} {currency}
                            </span>
                          </div>
                          {/* أزرار فئات السعر السريعة للبند (س1، س2، س3، س4) */}
                          {(() => {
                            const productList = allProducts && allProducts.length > 0 ? allProducts : products;
                            const prod = productList.find((p) => p.id === item.productId || (item.barcode && p.barcode === item.barcode));
                            if (!prod || item.isPack) return null;
                            const p1 = getProductTierPrice(prod, '1');
                            const p2 = getProductTierPrice(prod, '2');
                            const p3 = getProductTierPrice(prod, '3');
                            const p4 = getProductTierPrice(prod, '4');
                            const currentPrice = item.unitPrice ?? (item as any).price;
                            return (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-bold">السعر:</span>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice && onEditPrice(item.productId, p1)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    currentPrice === p1
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-700'
                                  }`}
                                  title={`س1 (تجزئة): ${formatMoney(p1)}`}
                                >
                                  س1: {formatMoney(p1)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice && onEditPrice(item.productId, p2)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    currentPrice === p2
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-slate-200 dark:border-slate-700'
                                  }`}
                                  title={`س2 (نصف جملة): ${formatMoney(p2)}`}
                                >
                                  س2: {formatMoney(p2)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice && onEditPrice(item.productId, p3)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    currentPrice === p3
                                      ? 'bg-purple-600 text-white shadow-2xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-slate-200 dark:border-slate-700'
                                  }`}
                                  title={`س3 (جملة): ${formatMoney(p3)}`}
                                >
                                  س3: {formatMoney(p3)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice && onEditPrice(item.productId, p4)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    currentPrice === p4
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-slate-200 dark:border-slate-700'
                                  }`}
                                  title={`س4 (خاص): ${formatMoney(p4)}`}
                                >
                                  س4: {formatMoney(p4)}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-base font-black text-blue-700 dark:text-blue-400 block font-mono">
                          {formatMoney(lineTotal)} {currency}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {/* Quantity adjustment */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                          className="w-7 h-7 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-blue-50 hover:text-blue-600 shadow-2xs flex items-center justify-center transition cursor-pointer"
                        >
                          +
                        </button>
                        <span
                          onClick={() => onOpenKeypadForQty?.(item)}
                          className="w-9 text-center font-bold text-xs text-slate-800 dark:text-slate-100 font-mono cursor-pointer hover:underline"
                          title="نقر لتغيير الكمية"
                        >
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                          className="w-7 h-7 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-rose-50 hover:text-rose-600 shadow-2xs flex items-center justify-center transition cursor-pointer"
                        >
                          -
                        </button>
                      </div>

                      {/* Price & Delete actions */}
                      <div className="flex items-center gap-1.5">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              autoFocus
                              value={customPriceInput}
                              onChange={(e) => setCustomPriceInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePriceSubmit(item.productId);
                                if (e.key === 'Escape') setEditingPriceItemId(null);
                              }}
                              className="w-16 px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-slate-800 border border-blue-500 rounded text-center outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handlePriceSubmit(item.productId)}
                              className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPriceItemId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPriceItemId(item.productId);
                              setCustomPriceInput(String(item.unitPrice));
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition cursor-pointer"
                          >
                            تعديل السعر
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveFromCart(item.productId)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition cursor-pointer"
                          title="حذف من السلة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Checkout Actions & Bottom Controls */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            {/* Action Buttons Row (تعليق / مسودات / إلغاء / طباعة) */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={onSuspendSale}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer active:scale-95"
              >
                <PauseCircle className="w-4 h-4 text-amber-500 mb-1" />
                <span className="text-[11px] font-bold">تعليق</span>
                <span className="text-[9px] text-slate-400">F2</span>
              </button>

              <button
                type="button"
                onClick={onOpenSuspended}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer active:scale-95 relative"
              >
                <FileText className="w-4 h-4 text-indigo-500 mb-1" />
                <span className="text-[11px] font-bold">مسودات</span>
                <span className="text-[9px] text-slate-400">F3</span>
                {suspendedCount > 0 && (
                  <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (cart.length > 0 && window.confirm('هل أنت متأكد من إلغاء وتفريغ السلة الحالية؟')) {
                    onClearCart();
                  }
                }}
                disabled={cart.length === 0}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 text-slate-700 dark:text-slate-200 hover:text-rose-600 transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 text-rose-500 mb-1" />
                <span className="text-[11px] font-bold">إلغاء</span>
                <span className="text-[9px] text-slate-400">F4</span>
              </button>

              <button
                type="button"
                onClick={onToggleAutoPrint}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition cursor-pointer active:scale-95 ${
                  autoPrintReceipt
                    ? 'bg-blue-50/70 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
                title="الطباعة التلقائية (F5)"
              >
                <Printer className={`w-4 h-4 mb-1 ${autoPrintReceipt ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`} />
                <span className="text-[11px] font-bold">طباعة</span>
                <span className="text-[9px] text-slate-400">F5</span>
              </button>
            </div>

            {/* Main Complete Button (تسوية الفاتورة F1) */}
            <button
              type="button"
              onClick={onSettleSale}
              disabled={cart.length === 0 || isSalePending}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-extrabold text-base flex items-center justify-between shadow-lg shadow-blue-500/25 transition active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                <span>تسوية الفاتورة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-100">دفع نقدي</span>
                <kbd className="px-2 py-0.5 bg-white/20 rounded-md text-xs font-bold border border-white/20">
                  F1
                </kbd>
              </div>
            </button>

            {/* Secondary Bottom Toolbar */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (onNewOrder) onNewOrder();
                  else if (cart.length > 0) onClearCart();
                }}
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold text-center transition cursor-pointer"
              >
                طلبية جديدة
              </button>
              <button
                type="button"
                onClick={onSaveAsProforma}
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold text-center transition cursor-pointer"
              >
                فاتورة مبدئية
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenSalesHistory) onOpenSalesHistory();
                  else navigate('/sales');
                }}
                className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold text-center transition cursor-pointer"
              >
                سجل الفواتير
              </button>
            </div>
          </div>
        </aside>

        {/* ── PRODUCTS AREA (القسم الأيسر - شبكة المنتجات والتصنيفات) ── */}
        <section
          className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
          data-purpose="pos-products-view"
        >
          {/* Categories Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => onSelectCategory('')}
                className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer shadow-xs ${
                  !selectedCategory || selectedCategory === 'ALL'
                    ? 'bg-blue-600 text-white shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                الكل
              </button>
              {categories.map((cat) => {
                const catId = typeof cat === 'string' ? cat : cat.id;
                const catName = typeof cat === 'string' ? cat : cat.name;
                const isSelected = selectedCategory === catId;

                return (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => onSelectCategory(catId)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer shadow-xs ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-blue-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {catName}
                  </button>
                );
              })}
            </div>

            {/* Filter & Layout Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenCustomize}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>تخصيص العرض</span>
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {displayedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <Package className="w-16 h-16 stroke-[1.2] mb-3 opacity-30 text-blue-500" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد منتجات تطابق البحث أو التصنيف المختار</p>
                <p className="text-xs text-slate-400 mt-1">جرّب اختيار تصنيف آخر أو مسح عبارة البحث</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                {displayedProducts.map((product) => {
                  const stock = product.stockQuantity ?? (product as any).quantity ?? 0;
                  const isLowStock = stock > 0 && stock <= 5;
                  const isOutOfStock = stock <= 0;
                  const categoryName = typeof product.category === 'object' && product.category
                    ? product.category.name
                    : (product.category || 'عام');

                  return (
                    <div
                      key={product.id}
                      onClick={() => onAddToCart(product)}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3 cursor-pointer select-none group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {showProductImages && (
                          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-contain p-1" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {product.name}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                              {categoryName}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {product.barcode || product.sku || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                            isOutOfStock
                              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                              : isLowStock
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {stock} قطع
                        </span>

                        <div className="text-left font-mono font-extrabold text-sm text-blue-700 dark:text-blue-400 min-w-[70px]">
                          {formatMoney(getProductTierPrice(product, priceTier))} <span className="text-[10px] font-sans text-slate-400">{currency}</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                          className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-600 dark:group-hover:text-white flex items-center justify-center font-bold transition shadow-2xs cursor-pointer active:scale-95"
                          title="إضافة للسلة"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                {displayedProducts.map((product) => {
                  const stock = product.stockQuantity ?? (product as any).quantity ?? 0;
                  const isLowStock = stock > 0 && stock <= 5;
                  const isOutOfStock = stock <= 0;
                  const categoryName = typeof product.category === 'object' && product.category
                    ? product.category.name
                    : (product.category || 'عام');

                  return (
                    <div
                      key={product.id}
                      onClick={() => onAddToCart(product)}
                      className="group bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 p-3 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer select-none relative active:scale-[0.98]"
                    >
                      <div>
                        {/* Tags: Category & Stock */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 line-clamp-1 max-w-[90px]">
                            {categoryName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                              isOutOfStock
                                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                                : isLowStock
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {stock} قطع
                          </span>
                        </div>

                        {/* Product Visual Container (Image or 3D vector box) */}
                        {showProductImages && (
                          <div className="w-full h-28 bg-slate-50 dark:bg-slate-900/60 rounded-xl mb-3 flex items-center justify-center overflow-hidden p-2 group-hover:scale-105 transition-transform">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <svg className="w-12 h-12 stroke-current text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24">
                                <path
                                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.5"
                                />
                              </svg>
                            )}
                          </div>
                        )}

                        {/* Product Title & Barcode */}
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {product.barcode || product.sku || '-'}
                        </p>
                      </div>

                      {/* Bottom Row: Price & Quick Add Button */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">سعر الوحدة</span>
                          <span className="text-base font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                            {formatMoney(getProductTierPrice(product, priceTier))} <span className="text-xs">{currency}</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                          className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white flex items-center justify-center font-bold transition shadow-2xs cursor-pointer active:scale-95"
                          title="إضافة للسلة"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination & Bottom Bar */}
          <footer className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition cursor-pointer"
              >
                السابق
              </button>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                صفحة {currentPage} من {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition cursor-pointer"
              >
                التالي
              </button>
            </div>
            <div className="text-xs text-slate-400">
              إجمالي المنتجات المعروضة:{' '}
              <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                {products.length} منتجات
              </span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
};

export default ModernPOSLayout;
