import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Check,
  X,
  Trash2,
  Receipt,
  Plus,
  Minus,
  Search,
  ScanLine,
  User,
  Settings,
  RotateCcw,
  Scale,
  Sun,
  Moon,
  Maximize,
  Minimize,
  MoreVertical,
  Clock,
  Store,
  Eye,
  Calculator,
  Home,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
  Star,
} from 'lucide-react';
import type { CartItem, Product, Category } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { getProductTierPrice } from '@/services';
import { useFavoritesStore } from '@/features/favorites/store/useFavoritesStore';
import { usePOSSessionStore } from '../store/usePOSSessionStore';

interface TerminalPOSLayoutProps {
  cart: CartItem[];
  onAddToCart: (product: Product, customPrice?: number) => void;
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
  onOpenKeypad?: () => void;
  onOpenKeypadForQty?: (item: CartItem) => void;
  viewMode?: 'grid' | 'list';
  showProductImages?: boolean;
}

export const TerminalPOSLayout: React.FC<TerminalPOSLayoutProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
  onEditPrice,
  saleSummary,
  products,
  allProducts = [],
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
  invoiceNumber = 1,
  formatMoney,
  currency = 'دج',
  userName = 'Admin',
  storeName = 'AN POS',
  isSessionOpen,
  isSalePending,
  onToggleFullscreen,
  isFullscreen,
  onNavigateBack,
  onOpenKeypad,
  onOpenKeypadForQty,
}) => {
  const { theme, toggleTheme } = useThemeStore();

  // Price tier: 1 = retail, 2 = semi-wholesale, 3 = wholesale, 4 = special
  const [internalPriceTier, setInternalPriceTier] = useState<'1' | '2' | '3' | '4'>('1');
  const priceTier = propPriceTier ?? internalPriceTier;
  const setPriceTier = useCallback((tier: '1' | '2' | '3' | '4') => {
    setInternalPriceTier(tier);
    if (onSelectPriceTier) onSelectPriceTier(tier);
  }, [onSelectPriceTier]);
  const [isLockedBarcode, setIsLockedBarcode] = useState(true);
  const [selectedCartRowId, setSelectedCartRowId] = useState<string | null>(null);
  const [tableSearchBarcode, setTableSearchBarcode] = useState('');
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState('');

  // Favorites & Category Mode Integration
  const { categories: favoriteCategories, items: favoriteItems } = useFavoritesStore();
  const { terminalCategoryMode, setTerminalCategoryMode } = usePOSSessionStore();
  const [selectedFavoriteCatId, setSelectedFavoriteCatId] = useState<string>('ALL');

  const displayedFavoriteItems = useMemo(() => {
    if (selectedFavoriteCatId === 'ALL') {
      return favoriteItems;
    }
    return favoriteItems.filter((it) => it.categoryId === selectedFavoriteCatId);
  }, [favoriteItems, selectedFavoriteCatId]);

  // Dedicated Price Checker Mode (عارض الأسعار التفاعلي)
  const [isPriceCheckerMode, setIsPriceCheckerMode] = useState(false);
  const [priceCheckerResult, setPriceCheckerResult] = useState<{
    product: Product;
    price: number;
  } | null>(null);
  const [priceCheckerNotFound, setPriceCheckerNotFound] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Live clock
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard Shortcuts (F1, F2, F3, F4, F6, F8, F9, F10, F12, Ctrl+D, Ctrl+E, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an open input that is not barcode
      const active = document.activeElement;
      const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (isInput && active !== barcodeInputRef.current) return;

      if (e.key === 'F1') {
        e.preventDefault();
        if (cart.length > 0) onSettleSale();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) onClearCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (onNewOrder) onNewOrder();
        else if (cart.length > 0) onClearCart();
      } else if (e.key === 'F3') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F6') {
        e.preventDefault();
        onSelectCustomer();
      } else if (e.key === 'F2') {
        e.preventDefault();
        onSelectCustomer();
      } else if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0) onSuspendSale();
        else onOpenSuspended();
      } else if (e.key === 'F10') {
        e.preventDefault();
        onOpenCustomize();
      } else if (e.key === 'Escape') {
        if (isPriceCheckerMode) {
          setIsPriceCheckerMode(false);
          setPriceCheckerResult(null);
          setPriceCheckerNotFound(null);
        } else {
          onNavigateBack();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedCartRowId) {
          onRemoveFromCart(selectedCartRowId);
          setSelectedCartRowId(null);
        } else if (cart.length > 0) {
          onRemoveFromCart(cart[cart.length - 1].productId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const targetItem = selectedCartRowId
          ? cart.find((c) => c.productId === selectedCartRowId)
          : cart[cart.length - 1];
        if (targetItem && onOpenKeypadForQty) {
          onOpenKeypadForQty(targetItem);
        } else if (onOpenKeypad) {
          onOpenKeypad();
        }
      } else if ((e.altKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        handleSelectPriceTier('1');
      } else if ((e.altKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        handleSelectPriceTier('2');
      } else if ((e.altKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        handleSelectPriceTier('3');
      } else if ((e.altKey || e.ctrlKey) && e.key === '4') {
        e.preventDefault();
        handleSelectPriceTier('4');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    onSettleSale,
    onClearCart,
    onNewOrder,
    onSelectCustomer,
    onSuspendSale,
    onOpenSuspended,
    onOpenCustomize,
    selectedCartRowId,
    onRemoveFromCart,
    onOpenKeypadForQty,
    onOpenKeypad,
    isPriceCheckerMode,
    onNavigateBack,
    handleSelectPriceTier,
  ]);

  // Auto-refocus barcode input if 'العودة للرمز دائماً' is active
  useEffect(() => {
    if (isLockedBarcode && !isPriceCheckerMode) {
      const timer = setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT') {
          barcodeInputRef.current?.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [cart.length, isLockedBarcode, isPriceCheckerMode]);

  // Total items and units calculation
  const totalUnitsCount = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
    [cart]
  );

  // Quick products grid (top 15 products for 3 rows x 5 cols)
  const quickProducts = useMemo(() => {
    let list = products.length > 0 ? products : (allProducts || []);
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
      );
    }
    return list.slice(0, 15);
  }, [products, allProducts, searchQuery]);

  // Helper to calculate price according to active tier
  const getProductPriceByTier = (prod: Product, tier: '1' | '2' | '3' | '4') => {
    return getProductTierPrice(prod, tier);
  };

  // Handle price tier switch
  const handleSelectPriceTier = useCallback((tier: '1' | '2' | '3' | '4') => {
    setPriceTier(tier);
    if (tier === '3') {
      if (!wholesaleMode) toggleWholesaleMode();
    } else if (tier === '1') {
      if (wholesaleMode) toggleWholesaleMode();
    }
    // Synchronize current cart items to chosen tier
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
  }, [allProducts, products, cart, onEditPrice, wholesaleMode, toggleWholesaleMode, setPriceTier]);

  // Dedicated Price Checker Submit / Scan Handler
  const handleBarcodeOrQuerySubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    if (isPriceCheckerMode) {
      const all = allProducts.length > 0 ? allProducts : products;
      const found = all.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
          p.name.toLowerCase().includes(code.toLowerCase()) ||
          p.id === code
      );
      if (found) {
        setPriceCheckerResult({
          product: found,
          price: getProductPriceByTier(found, priceTier),
        });
        setPriceCheckerNotFound(null);
      } else {
        setPriceCheckerNotFound(code);
        setPriceCheckerResult(null);
      }
      setBarcodeInput('');
    } else {
      onBarcodeSubmit(e);
    }
  };

  // Filtered cart if table search is used
  const displayCart = useMemo(() => {
    if (!tableSearchBarcode.trim()) return cart;
    const q = tableSearchBarcode.toLowerCase().trim();
    return cart.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q))
    );
  }, [cart, tableSearchBarcode]);

  const formattedDate = useMemo(() => {
    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, '0');
    const d = String(currentTime.getDate()).padStart(2, '0');
    const hh = String(currentTime.getHours()).padStart(2, '0');
    const mm = String(currentTime.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${d} ${hh}:${mm}`;
  }, [currentTime]);

  const invoiceFormattedNumber = useMemo(() => {
    if (String(invoiceNumber).startsWith('INV-')) return invoiceNumber;
    return `26${String(invoiceNumber).padStart(10, '0')}`;
  }, [invoiceNumber]);

  return (
    <div
      className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 h-full w-full flex-1 overflow-hidden flex flex-col justify-between p-1 sm:p-2 font-cairo select-none antialiased"
      dir="rtl"
    >
      {/* ─── POS MAIN CONTAINER ─── */}
      <main className="flex flex-col flex-1 bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-300 dark:border-slate-800 overflow-hidden relative">
        
        {/* ─── PRICE CHECKER FLOATING BANNER (عارض الأسعار التفاعلي) ─── */}
        {isPriceCheckerMode && (
          <div className="bg-blue-600 text-white px-3 py-2 flex items-center justify-between shadow-md z-30 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 animate-pulse text-blue-200 shrink-0" />
              <span className="text-xs font-bold">
                وضع عارض الأسعار مفعّل: امسح أي باركود أو اكتب الرمز للاستعلام عن السعر والمخزون دون إضافته للسلة
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsPriceCheckerMode(false);
                setPriceCheckerResult(null);
                setPriceCheckerNotFound(null);
              }}
              className="px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="إنهاء وضع عارض الأسعار (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>إغلاق (Esc)</span>
            </button>
          </div>
        )}

        {/* ─── PRICE CHECKER RESULT MODAL / POPUP ─── */}
        {priceCheckerResult && (
          <div className="absolute top-12 inset-x-4 mx-auto max-w-lg z-40 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-2xl shadow-2xl p-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>بيانات السلعة المستعلم عنها</span>
              </div>
              <button
                type="button"
                onClick={() => setPriceCheckerResult(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {priceCheckerResult.product.name}
                </h4>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                  الباركود: {priceCheckerResult.product.barcode || 'غير مسجل'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    المخزون: {priceCheckerResult.product.stockQuantity ?? (priceCheckerResult.product as any).stock ?? 0}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-bold">
                    الفئة: {priceTier === '3' ? 'س 3 (جملة)' : priceTier === '2' ? 'س 2 (نصف جملة)' : priceTier === '4' ? 'س 4 (خاص)' : 'س 1 (تجزئة)'}
                  </span>
                </div>
                {/* استعراض مستويات الأسعار الأربعة للمنتج المستعلم عنه */}
                <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 font-mono">
                    <span className="text-slate-500 font-sans">س1 (تجزئة):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatMoney(getProductTierPrice(priceCheckerResult.product, '1'))} {currency}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 font-mono">
                    <span className="text-slate-500 font-sans">س2 (نصف جملة):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatMoney(getProductTierPrice(priceCheckerResult.product, '2'))} {currency}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 font-mono">
                    <span className="text-slate-500 font-sans">س3 (جملة):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatMoney(getProductTierPrice(priceCheckerResult.product, '3'))} {currency}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 font-mono">
                    <span className="text-slate-500 font-sans">س4 (خاص):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatMoney(getProductTierPrice(priceCheckerResult.product, '4'))} {currency}</span>
                  </div>
                </div>
              </div>
              <div className="text-left bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-4 py-2 shrink-0">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-bold">السعر</span>
                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatMoney(priceCheckerResult.price)}
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mr-1">{currency}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPriceCheckerResult(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddToCart({
                    ...priceCheckerResult.product,
                    price: priceCheckerResult.price,
                    retailPrice: priceCheckerResult.price,
                  }, priceCheckerResult.price);
                  setPriceCheckerResult(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة إلى الفاتورة</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── PRICE CHECKER NOT FOUND BANNER ─── */}
        {priceCheckerNotFound && (
          <div className="absolute top-12 inset-x-4 mx-auto max-w-md z-40 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl p-3 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>لم يتم العثور على سلعة مطابقة للرمز: {priceCheckerNotFound}</span>
            </div>
            <button
              type="button"
              onClick={() => setPriceCheckerNotFound(null)}
              className="text-rose-600 hover:text-rose-800 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ─── 1. TOP COMMAND BAR (شريط الأوامر السريعة العلوية F1-F12) ─── */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 sm:px-3 py-1.5 flex items-center justify-between gap-1.5 shadow-2xs shrink-0 flex-wrap lg:flex-nowrap">
          {/* Right Actions: وظائف البيع والأزرار الرئيسية الموحدة */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* زر الصفحة الرئيسية (Esc) */}
            <button
              type="button"
              onClick={onNavigateBack}
              className="bg-blue-700 hover:bg-blue-800 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
              title="الرجوع إلى الصفحة الرئيسية (Esc)"
              aria-label="الصفحة الرئيسية"
            >
              <Home className="w-3.5 h-3.5" />
              <span>الصفحة الرئيسية (Esc)</span>
            </button>

            {/* زر تأكيد البيع (F1) */}
            <button
              type="button"
              onClick={onSettleSale}
              disabled={cart.length === 0 || isSalePending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              title="تأكيد وتسوية عملية البيع (F1)"
              aria-label="تأكيد وتسوية عملية البيع"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>تأكيد بيع (F1)</span>
            </button>

            {/* زر إلغاء الوصل (F8) */}
            <button
              type="button"
              onClick={onClearCart}
              disabled={cart.length === 0}
              className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40 active:scale-95"
              title="إلغاء الفاتورة الحالية وتفريغ السلة (F8)"
              aria-label="إلغاء الوصل وتفريغ السلة"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>إلغاء الوصل (F8)</span>
            </button>

            {/* زر حذف سلعة (Ctrl+D) */}
            <button
              type="button"
              onClick={() => {
                if (selectedCartRowId) {
                  onRemoveFromCart(selectedCartRowId);
                  setSelectedCartRowId(null);
                } else if (cart.length > 0) {
                  onRemoveFromCart(cart[cart.length - 1].productId);
                }
              }}
              disabled={cart.length === 0}
              className="bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40 active:scale-95"
              title="حذف السلعة المحددة أو الأخيرة من السلة (Ctrl+D)"
              aria-label="حذف سلعة من السلة"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف سلعة (Ctrl+D)</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0 hidden sm:block" />

            {/* زر الصندوق والمناوبة والإرجاع (الصندوق / Caisse) */}
            <button
              type="button"
              onClick={onOpenReturns}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 ${
                returnMode
                  ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400/40 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
              title={returnMode ? 'وضع إرجاع البضائع مفعّل' : 'سجل المبيعات وحركات الصندوق (Caisse)'}
              aria-label="سجل المبيعات والصندوق"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{returnMode ? 'إرجاع (مفعّل)' : 'الصندوق (Caisse)'}</span>
            </button>

            {/* زر سلة جديدة (F9) */}
            <button
              type="button"
              onClick={() => {
                if (onNewOrder) onNewOrder();
                else if (cart.length > 0) onClearCart();
              }}
              className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
              title="فتح سلة بيع جديدة فارغة (F9)"
              aria-label="فتح سلة جديدة"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>سلة جديدة (F9)</span>
            </button>

            {/* زر تعليق واسترجاع السلة (تعليق F12) */}
            <button
              type="button"
              onClick={() => {
                if (cart.length > 0) onSuspendSale();
                else onOpenSuspended();
              }}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
              title="تعليق السلة الحالية أو استرجاع الفواتير المعلقة (F12)"
              aria-label="تعليق السلة الحالية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تعليق (F12)</span>
              {suspendedCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mr-0.5">
                  {suspendedCount}
                </span>
              )}
            </button>

            {/* زر اختيار العميل (F6) */}
            <button
              type="button"
              onClick={onSelectCustomer}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
              title="اختيار أو تغيير الزبون (F6)"
              aria-label="اختيار الزبون"
            >
              <User className="w-3 h-3 text-slate-500" />
              <span className="truncate max-w-[100px] inline-block">
                {selectedCustomerName ? selectedCustomerName : 'زبون (F6)'}
              </span>
            </button>

            {/* زر الزبون الوفي (F2) */}
            <button
              type="button"
              onClick={onSelectCustomer}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
              title="برنامج الولاء والزبائن الأوفياء (F2)"
              aria-label="برنامج الولاء والزبون الوفي"
            >
              <UserCheck className="w-3 h-3 text-blue-500" />
              <span>زبون وفي (F2)</span>
            </button>

            {/* زر الخدمات (F10) */}
            <button
              type="button"
              onClick={onOpenCustomize}
              className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
              title="إعدادات تخصيص العرض ودقة الشاشة (F10)"
              aria-label="إعدادات وتخصيص العرض"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>خدمات (F10)</span>
            </button>
          </div>

          {/* Left Actions: عارض الأسعار، صنف حر، الحسبة، الخصم، الثيم، الشاشة (ظاهرة دائماً لجميع الشاشات) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* عارض الأسعار (ظاهر دائماً وبدون إخفاء شرطي) */}
            <button
              type="button"
              onClick={() => {
                const nextState = !isPriceCheckerMode;
                setIsPriceCheckerMode(nextState);
                if (nextState) {
                  setPriceCheckerResult(null);
                  setPriceCheckerNotFound(null);
                  setTimeout(() => {
                    barcodeInputRef.current?.focus();
                    barcodeInputRef.current?.select();
                  }, 50);
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                isPriceCheckerMode
                  ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400/50 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
              title="تفعيل وضع استعلام سعر ومخزون السلع عبر الباركود"
              aria-label="عارض الأسعار"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>عارض الأسعار</span>
            </button>

            {/* منتج حر غير مسجل (/ Diver) */}
            <button
              type="button"
              onClick={onOpenFreeProduct}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              title="إضافة منتج حر غير مسجل بالمخزون بالاسم والسعر"
              aria-label="إضافة منتج حر"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>منتج حر (/ Diver)</span>
            </button>

            {/* آلة الحسبة / لوحة الأرقام (ظاهرة دائماً وبدون إخفاء شرطي) */}
            <button
              type="button"
              onClick={() => {
                if (selectedCartRowId) {
                  const target = cart.find((c) => c.productId === selectedCartRowId);
                  if (target && onOpenKeypadForQty) return onOpenKeypadForQty(target);
                }
                if (onOpenKeypad) {
                  onOpenKeypad();
                } else if (cart.length > 0 && onOpenKeypadForQty) {
                  onOpenKeypadForQty(cart[cart.length - 1]);
                }
              }}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              title="فتح الحاسبة واللوحة الرقمية التفاعلية"
              aria-label="لوحة الأرقام والحاسبة"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>الحسبة (أرقام)</span>
            </button>

            {/* كبسولة تخفيض الفاتورة */}
            <button
              type="button"
              onClick={onOpenDiscount}
              className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 rounded-lg px-2.5 py-1 text-center font-bold text-xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all active:scale-95"
              title="إضافة تخفيض على إجمالي الفاتورة"
              aria-label="تخفيض الفاتورة"
            >
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-none">
                تخفيض{discount > 0 ? (discountType === 'percent' ? ` (${discount}%)` : ` (${discount})`) : ''}:
              </div>
              <span className="font-mono">{saleSummary.discountAmount > 0 ? formatMoney(saleSummary.discountAmount) : '0.00'}</span>
            </button>

            {/* زر تبديل الوضع الليلي / النهاري */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                theme === 'dark'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
              }`}
              title={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
              aria-label="تبديل مظهر الواجهة"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* زر ملء الشاشة */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
              title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
              aria-label="تبديل ملء الشاشة"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* ─── 2. MAIN CONTENT AND CORE WORKSPACE ─── */}
        <section className="flex-1 flex flex-col p-2 sm:p-2.5 gap-2 overflow-hidden min-h-0">
          
          {/* Upper Section: فلاتر الأسعار + شاشة النيون الرقمية الفسفورية + باركود F3 */}
          <div className="flex items-stretch justify-between gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0 flex-wrap lg:flex-nowrap">
            
            {/* Column 1: حقول خيارات فئات الأسعار والطباعة والتركيز */}
            <div className="flex flex-col justify-between text-xs text-slate-600 dark:text-slate-300 gap-1.5 min-w-[250px] flex-1 lg:flex-initial">
              {/* تبديل فئات السعر الأربعة بالمسميات الموحدة */}
              <div className="flex items-center justify-between gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 select-none">
                <button
                  type="button"
                  onClick={() => handleSelectPriceTier('1')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                    priceTier === '1'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
                  }`}
                  title="سعر التجزئة العادي س1 (Alt+1)"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '1' ? 'bg-white' : 'bg-blue-500'}`} />
                  <span>س1 (تجزئة)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPriceTier('2')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                    priceTier === '2'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
                  }`}
                  title="سعر نصف الجملة س2 (Alt+2)"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '2' ? 'bg-white' : 'bg-emerald-500'}`} />
                  <span>س2</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPriceTier('3')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                    priceTier === '3'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
                  }`}
                  title="سعر الجملة س3 (Alt+3)"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '3' ? 'bg-white' : 'bg-purple-500'}`} />
                  <span>س3 (جملة)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPriceTier('4')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg transition-all cursor-pointer text-xs font-bold ${
                    priceTier === '4'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
                  }`}
                  title="سعر خاص للزبائن المميزين س4 (Alt+4)"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '4' ? 'bg-white' : 'bg-amber-500'}`} />
                  <span>س4 (خاص)</span>
                </button>
              </div>

              {/* خيارات الطباعة وتثبيت المؤشر */}
              <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
                <label className="flex items-center gap-1 cursor-pointer" title="تثبيت قارئ الباركود دائماً">
                  <input
                    type="checkbox"
                    checked={isLockedBarcode}
                    onChange={(e) => setIsLockedBarcode(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>تثبيت الرمز</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer" title="تفعيل الطباعة التلقائية للإيصال فور تأكيد البيع">
                  <input
                    type="checkbox"
                    checked={autoPrintReceipt}
                    onChange={onToggleAutoPrint}
                    className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>طباعة تلقائية</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer" title="إعادة المؤشر تلقائياً لحقل الباركود بعد كل عملية">
                  <input
                    type="checkbox"
                    checked={isLockedBarcode}
                    onChange={(e) => setIsLockedBarcode(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>العودة للرمز دائماً</span>
                </label>
              </div>

              {/* رصيد الصندوق وسلة رقم */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <span>المبلغ المستحق: <strong className="text-blue-900 dark:text-blue-300 font-mono">{formatMoney(saleSummary.total)} {currency}</strong></span>
                <span className="text-slate-400 font-mono font-bold">سلة: 1</span>
              </div>
            </div>

            {/* Column 2: شاشة المجموع الفسفوري الأخضر الرقمي الكبير النيون (Neon Total Screen) */}
            <div className="flex-1 flex flex-col items-center justify-center bg-[#050b14] rounded-xl border-2 border-slate-700 px-5 py-2 shadow-inner relative overflow-hidden min-w-[260px] sm:min-w-[320px]">
              <div className="absolute top-1 right-3 text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
                المجموع الإجمالي / TOTAL
              </div>
              <div className="text-emerald-400 font-bold text-4xl sm:text-5xl tracking-wider select-text flex items-baseline gap-2 font-mono drop-shadow-[0_0_12px_rgba(34,197,94,0.75)] pt-2.5">
                <span>{formatMoney(saleSummary.total)}</span>
                <span className="text-xl sm:text-2xl font-normal text-emerald-400/90">{currency}</span>
              </div>
              <div className="w-full flex items-center justify-between text-xs text-emerald-500 border-t border-slate-800 mt-1 pt-1 font-mono">
                <span className="flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 inline" />
                  <span>الوزن: 0.000 KG</span>
                </span>
                <span className="text-slate-400 text-[11px]">
                  {cart.length > 0 ? `${cart.length} أصناف (${totalUnitsCount} قطع)` : 'حالة الصندوق: جاهز'}
                </span>
              </div>
            </div>

            {/* Column 3: شريط إدخال الباركود والرمز السريع F3 / F4 */}
            <div className="flex flex-col justify-between w-full sm:w-80 gap-1.5 flex-1 lg:flex-initial">
              <div>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5 flex justify-between items-center">
                  <span>الباركود أو الرمز (F3):</span>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedCartRowId
                        ? cart.find((c) => c.productId === selectedCartRowId) || cart[cart.length - 1]
                        : cart[cart.length - 1];
                      if (target && onOpenKeypadForQty) {
                        onOpenKeypadForQty(target);
                      } else if (onOpenKeypad) {
                        onOpenKeypad();
                      } else {
                        barcodeInputRef.current?.focus();
                      }
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold cursor-pointer hover:underline"
                    title="تعيين كمية الصنف المحدد أو تركيز الحقل (F4)"
                  >
                    التعيين (F4)
                  </button>
                </div>
                <form onSubmit={handleBarcodeOrQuerySubmit} className="flex gap-1">
                  <div className="relative flex-1">
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder={isPriceCheckerMode ? 'امسح الباركود للاستعلام...' : 'امسح الباركود أو اكتب الرمز...'}
                      className={`w-full text-xs rounded-lg px-2.5 py-1.5 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 font-semibold shadow-inner placeholder-slate-400 font-mono transition-colors ${
                        isPriceCheckerMode
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-500 text-blue-950 dark:text-blue-200 focus:ring-blue-400'
                          : 'bg-amber-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700/60 text-slate-800 dark:text-white focus:ring-blue-500'
                      }`}
                    />
                    <span className="absolute left-2 top-1.5 text-slate-400 font-mono text-[10px]">F3</span>
                  </div>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
                    title="بحث وإدخال الرمز (Enter)"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>بحث (Enter)</span>
                  </button>
                </form>
              </div>

              {/* أزرار الماسح ووضع الدفع */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    barcodeInputRef.current?.focus();
                    barcodeInputRef.current?.select();
                  }}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-[11px] font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer active:scale-95"
                  title="تركيز قارئ الباركود"
                >
                  <ScanLine className="w-3 h-3 text-slate-500" />
                  <span>قارئ الباركود</span>
                </button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">وضع الدفع المباشر</span>
              </div>
            </div>
          </div>

          {/* Center Area: جدول عناصر الفاتورة مع التنسيق الدائم الكامل */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col relative overflow-hidden min-h-[140px]">
            {/* باركود رأس الجدول وعنوان الوصل */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>فاتورة البيع الحالية</span>
                <span className="text-[11px] text-slate-400 font-normal">| قائمة السلع الممسوحة ({cart.length} أصناف)</span>
              </div>

              {/* شريط بحث بالباركود داخل الجدول */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-0.5 text-xs shadow-2xs">
                  <ScanLine className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                  <span className="text-slate-500 font-medium ml-1 text-[11px] hidden sm:inline">بحث بالسلة:</span>
                  <input
                    type="text"
                    value={tableSearchBarcode}
                    onChange={(e) => setTableSearchBarcode(e.target.value)}
                    placeholder="000000..."
                    className="border-0 p-0 text-xs w-28 focus:ring-0 placeholder-slate-300 dark:bg-slate-900 font-mono text-slate-800 dark:text-slate-200"
                  />
                  {tableSearchBarcode && (
                    <button
                      type="button"
                      onClick={() => setTableSearchBarcode('')}
                      className="text-slate-400 hover:text-slate-600 text-xs mr-1 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table Area: تعرض جدول الفاتورة بشكل دائم ومنظم */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white dark:bg-slate-900">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700 shadow-2xs">
                  <tr>
                    <th className="py-2 px-3 text-center w-10">#</th>
                    <th className="py-2 px-3">التعيين (اسم السلعة)</th>
                    <th className="py-2 px-3 font-mono">الباركود</th>
                    <th className="py-2 px-3 text-center w-36">الكمية (+/-)</th>
                    <th className="py-2 px-3 text-left font-mono">سعر الوحدة</th>
                    <th className="py-2 px-3 text-left font-mono">التخفيض</th>
                    <th className="py-2 px-3 text-left font-mono font-black">المجموع</th>
                    <th className="py-2 px-2 text-center w-12">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {displayCart.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2.5 text-slate-400 dark:text-slate-500 select-none">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 shadow-inner">
                            <ScanLine className="w-7 h-7" />
                          </div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            الفاتورة فارغة حالياً
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed">
                            امسح باركود السلعة <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">(F3)</span> أو اختر من شبكة الأصناف بالأسفل للبدء
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayCart.map((item, index) => {
                      const isSelected = selectedCartRowId === item.productId;
                      return (
                        <tr
                          key={`${item.productId}-${index}`}
                          onClick={() => setSelectedCartRowId(item.productId)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-r-4 border-blue-600 font-bold'
                              : index % 2 === 0
                              ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              : 'bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <td className="py-2 px-3 text-center font-mono text-slate-400 text-xs">
                            {index + 1}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-100 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{item.name}</span>
                              {(item as any).variantName && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-mono font-bold">
                                  {(item as any).variantName}
                                </span>
                              )}
                            </div>
                            {isSelected && !item.isPack && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] text-slate-400 font-normal">تبديل السعر:</span>
                                {(() => {
                                  const productList = allProducts && allProducts.length > 0 ? allProducts : products;
                                  const prod = productList.find((p) => p.id === item.productId || (item.barcode && p.barcode === item.barcode));
                                  if (!prod) return null;
                                  const p1 = getProductTierPrice(prod, '1');
                                  const p2 = getProductTierPrice(prod, '2');
                                  const p3 = getProductTierPrice(prod, '3');
                                  const p4 = getProductTierPrice(prod, '4');
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => onEditPrice && onEditPrice(item.productId, p1)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                          item.unitPrice === p1
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-700 dark:text-slate-300'
                                        }`}
                                        title="سعر 1 (تجزئة)"
                                      >
                                        س1: {formatMoney(p1)}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onEditPrice && onEditPrice(item.productId, p2)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                          item.unitPrice === p2
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-700 dark:text-slate-300'
                                        }`}
                                        title="سعر 2 (نصف جملة)"
                                      >
                                        س2: {formatMoney(p2)}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onEditPrice && onEditPrice(item.productId, p3)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                          item.unitPrice === p3
                                            ? 'bg-purple-600 text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-slate-700 dark:text-slate-300'
                                        }`}
                                        title="سعر 3 (جملة)"
                                      >
                                        س3: {formatMoney(p3)}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onEditPrice && onEditPrice(item.productId, p4)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                          item.unitPrice === p4
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-slate-700 dark:text-slate-300'
                                        }`}
                                        title="سعر 4 (خاص / بالفاتورة)"
                                      >
                                        س4: {formatMoney(p4)}
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {item.barcode || '—'}
                          </td>
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                                className="w-6 h-6 rounded bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer shadow-2xs active:scale-90 transition-all"
                                title="تقليل الكمية (أو الحذف عند 1)"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span
                                onClick={() => onOpenKeypadForQty && onOpenKeypadForQty(item)}
                                className="w-8 text-center font-mono font-black text-xs text-blue-700 dark:text-blue-400 cursor-pointer hover:underline"
                                title="تعديل الكمية عبر اللوحة الرقمية"
                              >
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                                className="w-6 h-6 rounded bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer shadow-2xs active:scale-90 transition-all"
                                title="زيادة الكمية"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-left font-mono text-slate-700 dark:text-slate-300 font-bold text-xs" onClick={(e) => e.stopPropagation()}>
                            {editingPriceItemId === item.productId ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  autoFocus
                                  value={customPriceInput}
                                  onChange={(e) => setCustomPriceInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const p = parseFloat(customPriceInput);
                                      if (!isNaN(p) && p >= 0 && onEditPrice) {
                                        onEditPrice(item.productId, p);
                                      }
                                      setEditingPriceItemId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingPriceItemId(null);
                                    }
                                  }}
                                  className="w-16 px-1 py-0.5 rounded border border-blue-400 bg-white dark:bg-slate-900 text-xs font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const p = parseFloat(customPriceInput);
                                    if (!isNaN(p) && p >= 0 && onEditPrice) {
                                      onEditPrice(item.productId, p);
                                    }
                                    setEditingPriceItemId(null);
                                  }}
                                  className="text-emerald-600 hover:text-emerald-700 font-bold text-xs cursor-pointer"
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <span
                                onClick={() => {
                                  if (onEditPrice) {
                                    setEditingPriceItemId(item.productId);
                                    setCustomPriceInput(String(item.unitPrice));
                                  }
                                }}
                                className="cursor-pointer hover:underline hover:text-blue-600"
                                title="اضغط لتعديل السعر المباشر"
                              >
                                {formatMoney(item.unitPrice)}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-left font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            {(item as any).discount && (item as any).discount > 0
                              ? `-${formatMoney((item as any).discount)}`
                              : '0.00'}
                          </td>
                          <td className="py-2 px-3 text-left font-mono font-black text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
                            {formatMoney(item.lineTotal)}
                          </td>
                          <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => onRemoveFromCart(item.productId)}
                              className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center transition-colors cursor-pointer mx-auto active:scale-90"
                              title="حذف هذا الصنف من الفاتورة"
                              aria-label="حذف الصنف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* شريط تفاصيل الفاتورة السفلي (التاريخ، رقم الوصل، عدد المنتجات، إجمالي القطع) */}
            <div className="bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 px-4 py-1.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-bold shrink-0">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-normal">التاريخ:</span>
                  <span className="font-mono text-blue-800 dark:text-blue-400">{formattedDate}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-normal">رقم الوصل:</span>
                  <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                    {invoiceFormattedNumber}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-normal">عدد المنتجات:</span>
                  <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded font-mono font-bold">
                    {cart.length}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-normal">إجمالي القطع:</span>
                  <span className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono">
                    {totalUnitsCount}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Section: جدول الأصناف الأكثر مبيعاً / المفضلة + تبويبات الفئات */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-2xs flex gap-2 h-48 sm:h-52 shrink-0">
            {/* شبكة الأصناف (منتجات سريعة أو عبوات المفضلة) */}
            <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 overflow-y-auto custom-scrollbar p-0.5">
              {terminalCategoryMode === 'favorites' ? (
                displayedFavoriteItems.length > 0 ? (
                  displayedFavoriteItems.map((favItem, fIdx) => {
                    const isPack = favItem.type === 'pack';
                    let price = favItem.price;
                    if (!isPack) {
                      const matchedProd = allProducts.find((p) => p.id === favItem.itemId);
                      if (matchedProd) {
                        price = getProductPriceByTier(matchedProd, priceTier);
                      }
                    }

                    return (
                      <button
                        key={favItem.id || `fav-${fIdx}`}
                        type="button"
                        onClick={() => {
                          if (isPack) {
                            onAddToCart(
                              {
                                id: `pack-${favItem.itemId}`,
                                name: favItem.name,
                                barcode: favItem.barcode,
                                retailPrice: favItem.price,
                                price: favItem.price,
                                isPack: true,
                                packId: favItem.itemId,
                                packPiecesCount: favItem.packQty || 1,
                              } as any,
                              favItem.price
                            );
                          } else {
                            const matchedProd = allProducts.find((p) => p.id === favItem.itemId);
                            if (matchedProd) {
                              onAddToCart({ ...matchedProd, price, retailPrice: price }, price);
                            } else {
                              onAddToCart(
                                {
                                  id: favItem.itemId,
                                  name: favItem.name,
                                  barcode: favItem.barcode,
                                  retailPrice: price,
                                  price,
                                } as any,
                                price
                              );
                            }
                          }
                        }}
                        className={`rounded-lg p-1.5 flex flex-col justify-between items-center text-center shadow-2xs transition group cursor-pointer active:scale-95 min-h-[46px] border ${
                          isPack
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/60 text-slate-800 dark:text-slate-100'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                        }`}
                        title={`إضافة ${favItem.name} بسعر ${formatMoney(price)} ${currency}`}
                      >
                        <div className="w-full flex items-center justify-between gap-1 mb-0.5">
                          {isPack ? (
                            <span className="text-[9px] font-bold px-1 rounded bg-emerald-600 text-white truncate max-w-full">
                              ×{favItem.packQty || 1} {favItem.packUnit || 'عبوة'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1 rounded bg-blue-600 text-white">
                              تجزئة
                            </span>
                          )}
                          {favItem.barcode && (
                            <span className="text-[8px] font-mono text-slate-400 truncate max-w-[50px]">
                              {favItem.barcode}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-bold leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 line-clamp-2 w-full text-center">
                          {favItem.name}
                        </span>

                        <span
                          className={`font-bold text-[10px] font-mono px-2 py-0.5 rounded-full mt-1 ${
                            isPack
                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {formatMoney(price)} {currency}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-6 text-slate-400 text-xs">
                    <Star className="w-6 h-6 mb-1 text-amber-400 stroke-1" />
                    <span>لا توجد عبوات أو منتجات في هذا التصنيف المفضل</span>
                  </div>
                )
              ) : (
                quickProducts.map((prod, pIdx) => {
                  const price = getProductPriceByTier(prod, priceTier);
                  return (
                    <button
                      key={prod.id || `qp-${pIdx}`}
                      type="button"
                      onClick={() => onAddToCart({ ...prod, price, retailPrice: price }, price)}
                      className="bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 flex flex-col justify-between items-center text-center shadow-2xs transition group cursor-pointer active:scale-95 min-h-[44px]"
                      title={`إضافة ${prod.name} بسعر ${formatMoney(price)} ${currency}`}
                    >
                      <span className="text-[11px] font-bold leading-tight group-hover:text-blue-700 dark:group-hover:text-blue-400 line-clamp-2">
                        {prod.name}
                      </span>
                      <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold text-[10px] font-mono px-2 py-0.5 rounded-full mt-1">
                        {formatMoney(price)} {currency}
                      </span>
                    </button>
                  );
                })
              )}

              {/* أزرار حرة إضافية تحاكي "+ منتج حر" */}
              {Array.from({
                length: Math.max(
                  0,
                  15 -
                    (terminalCategoryMode === 'favorites'
                      ? displayedFavoriteItems.length
                      : quickProducts.length)
                ),
              }).map((_, idx) => (
                <button
                  key={`empty-slot-${idx}`}
                  type="button"
                  onClick={onOpenFreeProduct}
                  className="bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-1 flex items-center justify-center text-xs transition cursor-pointer active:scale-95 min-h-[44px]"
                  title="إضافة منتج حر فوري"
                >
                  + منتج حر
                </button>
              ))}
            </div>

            {/* أزرار الفئات الجانبية القائمة مع مبدل الوضع السريع */}
            <div className="w-36 sm:w-40 flex flex-col gap-1 border-r border-slate-200 dark:border-slate-800 pr-1.5 overflow-y-auto custom-scrollbar max-h-full">
              {/* مبدل نمط العرض السريع: المفضلة والعبوات ★ | تصنيفات التجزئة 📦 */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 mb-0.5">
                <button
                  type="button"
                  onClick={() => setTerminalCategoryMode('favorites')}
                  className={`flex-1 py-1 text-[10px] font-black rounded transition text-center cursor-pointer ${
                    terminalCategoryMode === 'favorites'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="عرض المفضلة والعبوات"
                >
                  ★ المفضلة
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalCategoryMode('products')}
                  className={`flex-1 py-1 text-[10px] font-black rounded transition text-center cursor-pointer ${
                    terminalCategoryMode === 'products'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="عرض تصنيفات التجزئة"
                >
                  📦 التجزئة
                </button>
              </div>

              {terminalCategoryMode === 'favorites' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedFavoriteCatId('ALL')}
                    className={`font-bold text-xs py-1.5 px-2 rounded-lg transition text-center cursor-pointer shadow-2xs shrink-0 active:scale-95 flex items-center justify-between ${
                      selectedFavoriteCatId === 'ALL'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="عرض جميع العبوات المفضلة"
                  >
                    <span className="truncate">جميع المفضلة</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-black/15">
                      {favoriteItems.length}
                    </span>
                  </button>

                  {favoriteCategories.map((favCat) => {
                    const isSelected = selectedFavoriteCatId === favCat.id;
                    const catCount = favoriteItems.filter((i) => i.categoryId === favCat.id).length;

                    return (
                      <button
                        key={favCat.id}
                        type="button"
                        onClick={() => setSelectedFavoriteCatId(favCat.id)}
                        className={`font-bold text-xs py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer shrink-0 active:scale-95 flex items-center justify-between gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={`تصفية عبوات: ${favCat.name}`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: favCat.color || '#059669' }}
                          />
                          <span className="truncate">{favCat.name}</span>
                        </div>
                        <span className="text-[10px] font-mono px-1 rounded bg-black/15 shrink-0">
                          {catCount}
                        </span>
                      </button>
                    );
                  })}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectCategory('ALL')}
                    className={`font-bold text-xs py-2 px-2 rounded-lg transition text-center cursor-pointer shadow-2xs shrink-0 active:scale-95 ${
                      !selectedCategory || selectedCategory === 'ALL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="عرض جميع الأصناف دون تصفية"
                  >
                    جميع الأصناف
                  </button>

                  {categories.map((cat, cIdx) => {
                    const catId = typeof cat === 'object' && cat !== null ? (cat as any).id : String(cat);
                    const catName = typeof cat === 'object' && cat !== null ? (cat as any).name : String(cat);
                    const isSelected = selectedCategory === catId;
                    return (
                      <button
                        key={catId || `cat-${cIdx}`}
                        type="button"
                        onClick={() => onSelectCategory(catId)}
                        className={`font-bold text-xs py-2 px-2 rounded-lg transition text-center truncate cursor-pointer shrink-0 active:scale-95 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={`تصفية حسب: ${catName}`}
                      >
                        {catName}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* زر المزيد F10 وأيقونة البحث الجانبية */}
            <div className="flex flex-col justify-between items-center w-10 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => {
                  barcodeInputRef.current?.focus();
                  if (searchQuery && setSearchQuery) setSearchQuery('');
                }}
                className="w-7 h-7 flex items-center justify-center rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer active:scale-90"
                title="البحث في أصناف المخزون"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onOpenCustomize}
                className="[writing-mode:vertical-rl] text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                title="خيارات وتخصيص العرض (F10)"
              >
                المزيد (F10)
              </button>

              <button
                type="button"
                onClick={onOpenCustomize}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer active:scale-90"
                title="إعدادات إضافية"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ─── 3. BOTTOM STATUS BAR (شريط الحالة الاحترافي والأنيق) ─── */}
        <footer className="bg-blue-950 dark:bg-slate-950 text-slate-200 text-xs px-3 py-1.5 flex items-center justify-between border-t border-blue-900 dark:border-slate-800 shrink-0">
          {/* Right: معلومات المحل والمستخدم */}
          <div className="flex items-center gap-3 font-medium">
            <div className={`flex items-center gap-1.5 ${isSessionOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isSessionOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-bold">{isSessionOpen ? 'النظام متصل (جلسة مفتوحة)' : 'الجلسة مغلقة'}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-slate-300">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>المستخدم: <strong className="text-white">{userName}</strong></span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-slate-300">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>المحل: <strong className="text-white">{storeName}</strong></span>
            </div>
            {onOpenSalesHistory && (
              <>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={onOpenSalesHistory}
                  className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer hover:underline"
                  title="عرض سجل المبيعات والفواتير السابقة"
                >
                  <Receipt className="w-3 h-3 text-blue-400" />
                  <span>سجل المبيعات</span>
                </button>
              </>
            )}
          </div>

          {/* Left: حالة النظام والوقت ورقم النسخة */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            {onSaveAsProforma && (
              <button
                type="button"
                onClick={onSaveAsProforma}
                disabled={cart.length === 0}
                className="hover:text-blue-300 disabled:opacity-30 cursor-pointer font-sans flex items-center gap-1 hover:underline"
                title="حفظ الفاتورة كعرض سعر / فاتورة مبدئية شكلية (Devis)"
              >
                <FileText className="w-3 h-3 text-amber-400" />
                <span>فاتورة شكلية (Devis)</span>
              </button>
            )}
            <span className="bg-blue-900/80 dark:bg-slate-800 text-blue-200 px-2 py-0.5 rounded border border-blue-800 dark:border-slate-700">
              POS-AN Terminal v5.0
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 inline text-slate-400" />
              <span>{formattedDate}</span>
            </span>
          </div>
        </footer>
      </main>

      {/* ─── 4. SUBTLE MONITOR BEZEL SIMULATION (أسفل الشاشة كما بالصورة الأصلية) ─── */}
      <div className="w-full flex items-center justify-between px-3 pt-1 text-[10px] text-slate-400 font-sans tracking-wide shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">AN-POS RETAIL</span>
          <span className="text-slate-500">SyncStation Terminal 5</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-slate-400">60Hz POS STATION</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-slate-400">POWER ON</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalPOSLayout;
