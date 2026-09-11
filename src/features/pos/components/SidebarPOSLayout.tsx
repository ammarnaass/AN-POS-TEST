import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ScanLine,
  Zap,
  Tag,
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
  Package,
  Layers,
  ShoppingBag,
  Camera,
  X,
  Edit3,
  CreditCard,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import type { CartItem, Product, Category } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { getProductTierPrice } from '@/services';

interface SidebarPOSLayoutProps {
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

export const SidebarPOSLayout: React.FC<SidebarPOSLayoutProps> = ({
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
  priceTier: propPriceTier,
  onSelectPriceTier,
  onSaveAsProforma,
  onNewOrder,
  onOpenSalesHistory,
  onOpenNotifications,
  notificationsCount = 0,
  invoiceNumber = '00128',
  formatMoney,
  currency = 'دج',
  userName = 'أحمد (كاشير 1)',
  storeName = 'AN POS',
  isSessionOpen,
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

  // Pagination for products catalog
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

  // Helper function to extract category name
  const getCatName = (c: Category | { id: string; name: string } | string): string => {
    if (typeof c === 'string') return c;
    return c.name || '';
  };

  const getCatId = (c: Category | { id: string; name: string } | string): string => {
    if (typeof c === 'string') return c;
    return c.id || '';
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category || 'other';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [products]);

  // Color generator for category placeholder icons
  const getProductColor = (index: number) => {
    const colors = [
      'bg-blue-100/70 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      'bg-indigo-100/70 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      'bg-amber-100/70 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      'bg-emerald-100/70 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      'bg-purple-100/70 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      'bg-cyan-100/70 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
      'bg-rose-100/70 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 h-full w-full flex-1 overflow-hidden flex flex-col antialiased font-cairo select-none" dir="rtl">
      {/* ========================================================= */}
      {/* 1. GIANT TOTAL HEADER (الشريط الإجمالي المستحق للدفع بالأعلى) */}
      {/* ========================================================= */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-900 text-white px-5 sm:px-6 py-3 shadow-md flex items-center justify-between z-30 shrink-0 border-b border-blue-400/20">
        {/* شعار النظام ومعلومات الجلسة */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/15 shadow-inner">
            <span className="w-8 h-8 rounded-lg bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-base sm:text-lg tracking-wider shadow-sm">
              AN
            </span>
            <div>
              <h1 className="font-black text-sm tracking-wide leading-none">{storeName || 'AN POS'}</h1>
              <span className="text-[10px] text-blue-200 font-medium leading-none">نظام الكاشير الذكي v2.4</span>
            </div>
          </div>

          {/* تفاصيل الفاتورة السريعة */}
          <div className="hidden lg:flex items-center gap-3 text-xs bg-black/20 px-3.5 py-2 rounded-xl border border-white/10 shadow-inner">
            <div className="flex items-center gap-1.5">
              <span className="text-blue-300">رقم الفاتورة:</span>
              <span className="font-bold text-white bg-blue-500/40 px-2 py-0.5 rounded text-xs font-mono">
                #{String(invoiceNumber).startsWith('INV-') ? invoiceNumber : `INV-${String(invoiceNumber).padStart(5, '0')}`}
              </span>
            </div>
            <span className="text-white/30">|</span>
            <button
              type="button"
              onClick={onSelectCustomer}
              className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer"
              title="تحديد أو تغيير العميل"
            >
              <span className="text-blue-300">العميل:</span>
              <span className="font-semibold text-emerald-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {selectedCustomerName || 'زبون عام (افتراضي)'}
              </span>
            </button>
            <span className="text-white/30">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-blue-300">الأصناف:</span>
              <span className="font-bold text-amber-300">
                {cart.length} مواد ({totalUnitsCount} قطعة)
              </span>
            </div>
          </div>
        </div>

        {/* المبلغ الضخم المستحق للدفع البارز جداً */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right flex items-baseline gap-2 sm:gap-3 bg-white/10 backdrop-blur-md px-3 sm:px-5 py-1 rounded-2xl border border-white/20 shadow-inner">
            <div className="text-xs uppercase tracking-wider text-blue-200 font-semibold self-center hidden sm:block">
              المبلغ الإجمالي المستحق:
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-300 tracking-tight drop-shadow-sm font-mono" id="grand-total">
                {formatMoney(saleSummary.total)}
              </span>
              <span className="text-sm sm:text-base font-bold text-white/90">{currency}</span>
            </div>
          </div>

          {/* أزرار الإجراءات العلوية السريعة */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white/90 hover:text-white cursor-pointer"
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white/90 hover:text-white cursor-pointer"
              title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button
              onClick={onOpenCustomize}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white/90 hover:text-white cursor-pointer"
              title="تخصيص التخطيط والشاشة"
            >
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={onNavigateBack}
              className="bg-rose-500/80 hover:bg-rose-600 px-3 sm:px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition text-white shadow-sm mr-1 cursor-pointer"
              title="الخروج إلى لوحة التحكم"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN CONTENT GRID (سلة المشتريات + كتالوج المنتجات) */}
      {/* ========================================================= */}
      <main className="flex-1 flex overflow-hidden p-2.5 sm:p-3 gap-2.5 sm:gap-3">
        {/* ========================================================= */}
        {/* LEFT / CART PANEL (سلة المشتريات والحساب) */}
        {/* ========================================================= */}
        <section
          className="w-full lg:w-[410px] xl:w-[440px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0"
          data-purpose="cart-section"
        >
          {/* هيدر السلة الصغير وأزرار العمليات */}
          <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">سلة المشتريات</h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {cart.length > 0 ? `${cart.length} أصناف محددة` : 'قائمة العناصر المحددة'}
                </span>
              </div>
            </div>

            {/* تبديل العميل */}
            <button
              onClick={onSelectCustomer}
              className="text-xs bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition cursor-pointer"
            >
              <span>{selectedCustomerName ? selectedCustomerName.slice(0, 14) : 'تغيير العميل'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* قائمة المنتجات المضافة في السلة */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 px-3 py-2 space-y-1 custom-scrollbar" data-purpose="cart-items-list">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">السلة فارغة حالياً</p>
                <p className="text-xs mt-1 text-slate-400 max-w-[200px]">
                  امسح الباركود أو اختر منتجاً من القائمة لبدء الفاتورة
                </p>
              </div>
            ) : (
              cart.map((item, index) => {
                const lineTotal = item.price * item.qty;
                const isEditingPrice = editingPriceItemId === item.productId;

                return (
                  <div
                    key={item.productId}
                    className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 border border-slate-100 dark:border-slate-800/60 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">
                            {item.name}
                          </h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {formatMoney(item.price)} {currency} × {item.qty} {item.unit || 'قطعة'}
                          </span>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                          {formatMoney(lineTotal)}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                          {currency}
                        </span>
                      </div>
                    </div>

                    {/* أزرار فئات السعر السريعة للبند (س1 تجزئة، س2 نصف جملة، س3 جملة، س4 خاص) */}
                    {(() => {
                      const productList = allProducts && allProducts.length > 0 ? allProducts : products;
                      const prod = productList.find((p) => p.id === item.productId || (item.barcode && p.barcode === item.barcode));
                      if (!prod || item.isPack) return null;
                      const p1 = getProductTierPrice(prod, '1');
                      const p2 = getProductTierPrice(prod, '2');
                      const p3 = getProductTierPrice(prod, '3');
                      const p4 = getProductTierPrice(prod, '4');
                      const currentPrice = item.price ?? (item as any).unitPrice;
                      return (
                        <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <span className="text-[10px] text-slate-400 font-bold ml-0.5">تبديل السعر:</span>
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

                    {/* تعديل السعر المباشر إذا كان مفتوحاً */}
                    {isEditingPrice && (
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                        <input
                          type="number"
                          step="any"
                          value={customPriceInput}
                          onChange={(e) => setCustomPriceInput(e.target.value)}
                          placeholder="السعر الجديد..."
                          className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded text-xs font-bold font-mono focus:outline-hidden"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePriceSubmit(item.productId);
                            if (e.key === 'Escape') setEditingPriceItemId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handlePriceSubmit(item.productId)}
                          className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                        >
                          تأكيد
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPriceItemId(null)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <button
                        onClick={() => onRemoveFromCart(item.productId)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded transition cursor-pointer"
                        title="حذف من السلة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingPriceItemId(item.productId);
                          setCustomPriceInput(String(item.price));
                        }}
                        className="text-blue-600 dark:text-blue-400 text-[11px] font-medium hover:underline bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        تعديل السعر
                      </button>

                      {/* أزرار زيادة ونقصان الكمية */}
                      <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
                        <button
                          onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                          className="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
                          title="إنقاص الكمية"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span
                          onClick={() => onOpenKeypadForQty && onOpenKeypadForQty(item)}
                          className="px-3 py-1 font-bold text-slate-800 dark:text-slate-100 font-mono text-xs bg-slate-50 dark:bg-slate-900 cursor-pointer"
                          title="انقر لتعديل الكمية"
                        >
                          {item.qty}
                        </span>
                        <button
                          onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                          className="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
                          title="زيادة الكمية"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ملخص الحساب والمجموع والخصم */}
          <div className="bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
              <span>المجموع الفرعي:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                {formatMoney(saleSummary.subtotal)} {currency}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <span>الخصم المطبق:</span>
                <button
                  type="button"
                  onClick={onOpenDiscount}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-[11px] font-bold border border-blue-200 dark:border-blue-800 cursor-pointer"
                >
                  {saleSummary.discountAmount > 0 ? 'تعديل الخصم' : 'تطبيق تخفيض'}
                </button>
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {saleSummary.discountAmount > 0 ? `-${formatMoney(saleSummary.discountAmount)}` : '0.00'} {currency}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-sm font-black text-slate-900 dark:text-white">صافي الدفع:</span>
              <span className="text-2xl font-black text-blue-700 dark:text-blue-400 font-mono">
                {formatMoney(saleSummary.total)}{' '}
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{currency}</span>
              </span>
            </div>
          </div>

          {/* أزرار الإجراءات السريعة (طباعة، تعليق، مسودة، إلغاء) */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onToggleAutoPrint}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                autoPrintReceipt
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="الطباعة التلقائية (F5)"
            >
              <Printer className="w-4 h-4 mb-0.5 text-slate-600 dark:text-slate-300" />
              <span>طباعة [F5]</span>
            </button>

            <button
              type="button"
              onClick={onSuspendSale}
              disabled={cart.length === 0}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
              title="تعليق البيع مؤقتاً (F2)"
            >
              <PauseCircle className="w-4 h-4 mb-0.5 text-amber-600 dark:text-amber-400" />
              <span>تعليق [F2]</span>
            </button>

            <button
              type="button"
              onClick={onOpenSuspended}
              className="relative flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition cursor-pointer"
              title="المعلقات والمسودات (F3)"
            >
              {suspendedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {suspendedCount}
                </span>
              )}
              <FileText className="w-4 h-4 mb-0.5 text-blue-600 dark:text-blue-400" />
              <span>مسودة [F3]</span>
            </button>

            <button
              type="button"
              onClick={onClearCart}
              disabled={cart.length === 0}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
              title="إلغاء وتفريغ السلة (F4)"
            >
              <X className="w-4 h-4 mb-0.5 text-rose-600 dark:text-rose-400" />
              <span>إلغاء [F4]</span>
            </button>
          </div>

          {/* زر تسوية الفاتورة الرئيسي الضخم F1 */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onSettleSale}
              disabled={cart.length === 0 || isSalePending}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-6 h-6" />
              <span>تسوية وقبض الفاتورة</span>
              <span className="bg-white/20 text-xs px-2.5 py-1 rounded-md font-mono tracking-wider font-bold">
                F1
              </span>
            </button>
          </div>
        </section>

        {/* ========================================================= */}
        {/* RIGHT / PRODUCT CATALOG (شبكة المنتجات والأقسام) */}
        {/* ========================================================= */}
        <section
          className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
          data-purpose="catalog-section"
        >
          {/* شريط البحث السريع والعمليات */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
            {/* حقل قراءة الباركود والبحث */}
            <div className="flex-1 min-w-[280px] flex items-center gap-2">
              <div className="relative w-full">
                <input
                  ref={barcodeInputRef}
                  value={barcodeInput || searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBarcodeInput(val);
                    setSearchQuery(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onBarcodeSubmit(e);
                    }
                  }}
                  type="text"
                  placeholder="امسح الباركود أو ابحث باسم المنتج... (F7)"
                  className="w-full pr-10 pl-20 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs transition placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
                />
                <span className="absolute right-3 top-3 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <span className="absolute left-2 top-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-600 font-semibold pointer-events-none">
                  F7 للبحث
                </span>
              </div>
            </div>

            {/* أزرار خيارات سريعة */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => navigate('/pos/quick')}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-200 dark:border-amber-800/60 transition cursor-pointer"
                title="الانتقال إلى نقطة البيع السريع"
              >
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500" />
                <span>نقطة البيع السريع</span>
              </button>

              <button
                type="button"
                onClick={onOpenFreeProduct}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                title="إضافة منتج حر غير مسجل (F8)"
              >
                <Plus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>منتج حر (F8)</span>
              </button>

              <button
                type="button"
                onClick={onOpenReturns}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                  returnMode
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
                title="فاتورة إرجاع (F9)"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إرجاع (F9)</span>
              </button>

              {/* تبديل فئات الأسعار الأربعة: س1 تجزئة، س2 نصف جملة، س3 جملة، س4 خاص */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold gap-0.5">
                <button
                  type="button"
                  onClick={() => handleSelectPriceTier('1')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs ${
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
                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs ${
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
                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs ${
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
                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs ${
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

          {/* شريط التصنيفات السريعة (Categories Pills) */}
          <div
            className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto bg-white dark:bg-slate-900 shrink-0 scrollbar-none"
            data-purpose="category-filters"
          >
            <button
              type="button"
              onClick={() => onSelectCategory('')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                !selectedCategory || selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              الكل ({products.length})
            </button>

            {categories.map((cat) => {
              const catId = getCatId(cat);
              const catName = getCatName(cat);
              const isSelected = selectedCategory === catId || selectedCategory === catName;
              const count = categoryCounts[catName] || categoryCounts[catId] || 0;

              return (
                <button
                  key={catId || catName}
                  type="button"
                  onClick={() => onSelectCategory(catId)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {catName} {count > 0 ? `(${count})` : ''}
                </button>
              );
            })}
          </div>

          {/* شبكة أو قائمة المنتجات (Product Cards Grid or List) */}
          <div
            className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50"
            data-purpose="products-container"
          >
            {displayedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">لا توجد منتجات مطابقة</p>
                <p className="text-xs text-slate-400 mt-1">جرّب تغيير التصنيف أو مصطلح البحث</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {displayedProducts.map((product) => {
                  const stock = product.quantity ?? product.stock ?? 0;
                  const isLowStock = stock > 0 && stock <= 5;
                  const isOutOfStock = stock <= 0;
                  const activePrice = getProductTierPrice(product, priceTier);

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
                              {product.category || 'عام'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {product.barcode || product.sku || 'بدون باركود'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 border ${
                            isOutOfStock
                              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                              : isLowStock
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {isOutOfStock ? 'نفد' : isLowStock ? `${stock} (قليل)` : `${stock} قطعة`}
                        </span>

                        <div className="text-left font-mono font-extrabold text-sm text-blue-700 dark:text-blue-400 min-w-[70px]">
                          {formatMoney(activePrice)}{' '}
                          <span className="text-[10px] font-sans text-slate-400">{currency}</span>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                {displayedProducts.map((product, idx) => {
                  const stock = product.quantity ?? product.stock ?? 0;
                  const isLowStock = stock > 0 && stock <= 5;
                  const isOutOfStock = stock <= 0;
                  const activePrice = getProductTierPrice(product, priceTier);

                  return (
                    <article
                      key={product.id}
                      onClick={() => onAddToCart(product)}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer group p-3.5"
                    >
                      <div>
                        {/* القسم وحالة المخزون */}
                        <div className="flex justify-between items-start mb-2 gap-1">
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold truncate max-w-[100px]">
                            {product.category || 'عام'}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap border ${
                              isOutOfStock
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                : isLowStock
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {isOutOfStock ? 'نفد' : isLowStock ? `${stock} (قليل)` : `${stock} قطعة`}
                          </span>
                        </div>

                        {/* مجسم / أيقونة أو صورة المنتج */}
                        {showProductImages && (
                          <div className="h-28 w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-center mb-2.5 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/20 transition overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-contain p-2"
                                loading="lazy"
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getProductColor(idx)}`}>
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                        )}

                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate leading-snug">
                          {product.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                          {product.barcode || product.sku || 'بدون باركود'}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-none">السعر</span>
                          <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                            {formatMoney(activePrice)}{' '}
                            <span className="text-xs font-normal text-slate-500">{currency}</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                          className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-600 dark:group-hover:text-white flex items-center justify-center transition shadow-xs font-bold text-lg cursor-pointer"
                          title="إضافة للسلة"
                        >
                          +
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* تذييل التصفح والصفحات للشبكة (Pagination) */}
          <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-medium">
              <span>عرض صفحة {currentPage} من {totalPages}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>إجمالي الأصناف: {products.length}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                السابق
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                التالي
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* 3. SHORTCUTS FOOTER BAR (شريط الاختصارات والحالة السفلي) */}
      {/* ========================================================= */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
              F1
            </kbd>{' '}
            تسوية ودفع
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
              F2
            </kbd>{' '}
            تعليق البيع
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
              F5
            </kbd>{' '}
            طباعة سريعة
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
              F7
            </kbd>{' '}
            تركيز البحث
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            الجهاز متصل (Online)
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>
            المستخدم: <strong className="text-slate-800 dark:text-slate-100">{userName}</strong>
          </span>
        </div>
      </footer>
    </div>
  );
};

export default SidebarPOSLayout;
