import React, { useState, useRef, useEffect } from 'react';
import {
  Receipt,
  Trash2,
  PauseCircle,
  History,
  Printer,
  User,
  Calculator,
  ScanLine,
  Search,
  Plus,
  Minus,
  X,
  Package,
  Clock,
  Layers,
  Sparkles,
  Edit3,
  Check,
  FolderOpen,
} from 'lucide-react';
import type { CartItem } from '../types';
import type { Product, Category } from '../../../types';

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
  categories: Category[];
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
}

export const ClassicPOSLayout: React.FC<ClassicPOSLayoutProps> = ({
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveFromCart,
  onClearCart,
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
  onOpenReturns,
  formatMoney,
  currency = 'دج',
  userName = 'Admin',
  storeName = 'AN POS',
  isSessionOpen,
  isSalePending,
}) => {
  const [selectedCartRowId, setSelectedCartRowId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Clock updater
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Total items and quantity count
  const totalItemsCount = cart.length;
  const totalUnitsCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Filtered products for the bottom quick items grid
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      !selectedCategory ||
      selectedCategory === 'ALL' ||
      p.category === selectedCategory ||
      p.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/40 select-none text-on-surface">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP SECTION: ACTION BUTTONS TOOLBAR + LED DIGITAL DISPLAY   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface-container-low border-b border-outline-variant/20 p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0 shadow-sm">
        
        {/* Left / Center: Action Buttons Toolbar (F1 .. F10) */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          {/* تأكيد بيع (F1) - Big Dominant Action Button */}
          <button
            type="button"
            onClick={onSettleSale}
            disabled={cart.length === 0 || isSalePending}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            title="تأكيد البيع وتسوية الفاتورة (F1)"
          >
            <Receipt className="w-4 h-4" />
            <span>تأكيد بيع</span>
            <span className="bg-black/25 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F1</span>
          </button>

          {/* إلغاء الوصل (F8 / F4) */}
          <button
            type="button"
            onClick={onClearCart}
            disabled={cart.length === 0}
            className="px-2.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all"
            title="إلغاء الفاتورة الحالية بالكامل (F4)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>إلغاء الوصل</span>
            <span className="bg-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono">F4</span>
          </button>

          {/* حذف سلعة (Ctrl+D) */}
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
            className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all"
            title="حذف السلعة المحددة (Ctrl+D)"
          >
            <X className="w-3.5 h-3.5 text-red-400" />
            <span>حذف سلعة</span>
            <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">Ctrl+D</span>
          </button>

          <div className="w-px h-6 bg-outline-variant/30 mx-0.5 hidden sm:block" />

          {/* سلة جديدة / تعليق (F2) */}
          <button
            type="button"
            onClick={onSuspendSale}
            disabled={cart.length === 0}
            className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-amber-500/15 text-on-surface hover:text-amber-500 border border-outline-variant/20 hover:border-amber-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 disabled:opacity-40 cursor-pointer transition-all"
            title="تعليق البيع / سلة جديدة (F2)"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>تعليق البيع</span>
            <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F2</span>
          </button>

          {/* مسودات (F3) */}
          <button
            type="button"
            onClick={onOpenSuspended}
            className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-purple-500/15 text-on-surface hover:text-purple-500 border border-outline-variant/20 hover:border-purple-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer relative transition-all"
            title="قائمة الفواتير المعلقة والمسودات (F3)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
            <span>مسودات</span>
            <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F3</span>
            {suspendedCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>

          {/* اختيار الزبون (F6) */}
          <button
            type="button"
            onClick={onSelectCustomer}
            className={`px-2.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all ${
              selectedCustomerName
                ? 'bg-primary/15 text-primary border-primary/40'
                : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/20 text-on-surface'
            }`}
            title="تحديد أو تغيير الزبون (F6)"
          >
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="max-w-[100px] truncate">{selectedCustomerName || 'زبون (F6)'}</span>
          </button>

          {/* تخفيض */}
          <button
            type="button"
            onClick={onOpenDiscount}
            className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all"
            title="إضافة تخفيض أو زيادة على الفاتورة"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
            <span>تخفيض: {formatMoney(saleSummary.discountAmount)}</span>
          </button>

          {/* طباعة (F5) */}
          <button
            type="button"
            onClick={onToggleAutoPrint}
            className={`px-2.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all ${
              autoPrintReceipt
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                : 'bg-surface-container text-on-surface-variant border-outline-variant/20'
            }`}
            title="الطباعة التلقائية (F5)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
            <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F5</span>
          </button>

          {/* سجل المبيعات (F9) */}
          <button
            type="button"
            onClick={onOpenReturns}
            className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 cursor-pointer transition-all"
            title="سجل المبيعات والمرتجع (F9)"
          >
            <History className="w-3.5 h-3.5 text-amber-500" />
            <span>سجل</span>
            <span className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[10px] font-mono opacity-80">F9</span>
          </button>
        </div>

        {/* Right: The Classic LED Digital Total Display (شاشة العرض الرقمية الكلاسيكية) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-black/95 rounded-2xl border-2 border-slate-700/80 px-4 py-2 shadow-2xl flex items-center justify-between gap-4 min-w-[200px] sm:min-w-[260px]">
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 block">الإجمالي الكلي:</span>
              <span className="text-[10px] font-mono text-emerald-400/80 block">
                {cart.length > 0 ? `${totalItemsCount} سلع (${totalUnitsCount} قطع)` : 'شاشة جاهزة'}
              </span>
            </div>
            <div className="text-left flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-wider drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]">
                {formatMoney(saleSummary.total)}
              </span>
              <span className="text-xs font-bold text-emerald-500">{currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. BARCODE & PRODUCT SEARCH BAR                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface-container-low/70 border-b border-outline-variant/15 px-3 py-2 flex items-center gap-2.5 shrink-0">
        {/* Barcode Input with Instant Scan Capability */}
        <form onSubmit={onBarcodeSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-primary">
              <ScanLine className="w-4 h-4" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="امسح الباركود هنا أو اكتب الرمز واضغط Enter..."
              className="w-full bg-surface-container border border-outline-variant/30 rounded-xl pr-9 pl-3 py-2 text-xs sm:text-sm font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold rounded-xl active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            إضافة
          </button>
        </form>

        {/* Search Input for Quick Finding */}
        <div className="relative w-48 sm:w-64 hidden sm:block">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-on-surface-variant/60">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو التعيين..."
            className="w-full bg-surface-container border border-outline-variant/30 rounded-xl pr-8 pl-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-hidden focus:border-primary transition-all shadow-inner"
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CENTER: THE CLASSIC CART TABLE (جدول المبيعات بالوسط)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 bg-surface border-b border-outline-variant/20 overflow-hidden">
        {/* Table Container with Custom Scrollbar */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-surface-container text-on-surface-variant font-bold border-b border-outline-variant/20 shadow-xs">
              <tr>
                <th className="py-2 px-3 text-center w-10">#</th>
                <th className="py-2 px-3">التعيين (اسم المنتج)</th>
                <th className="py-2 px-3 font-mono">الباركود</th>
                <th className="py-2 px-3 text-center w-28">الكمية</th>
                <th className="py-2 px-3 text-left font-mono">سعر الوحدة</th>
                <th className="py-2 px-3 text-left font-mono">التخفيض</th>
                <th className="py-2 px-3 text-left font-mono font-black">المجموع</th>
                <th className="py-2 px-2 text-center w-12">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 font-sans">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant/60">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ScanLine className="w-8 h-8 text-primary/40 animate-pulse" />
                      <p className="text-xs sm:text-sm font-bold">السلة فارغة</p>
                      <p className="text-[11px] text-on-surface-variant/50 font-mono">
                        امسح باركود المنتج بواسطة القارئ أو اضغط على أي منتج من القائمة بالأسفل
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                cart.map((item, index) => {
                  const isSelected = selectedCartRowId === item.productId;
                  return (
                    <tr
                      key={item.productId}
                      onClick={() => setSelectedCartRowId(item.productId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/15 border-l-4 border-primary font-bold'
                          : index % 2 === 0
                          ? 'bg-surface hover:bg-surface-container-low'
                          : 'bg-surface-container-lowest/50 hover:bg-surface-container-low'
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-mono text-on-surface-variant/70">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 font-medium text-on-surface">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{item.name}</span>
                          {item.variantName && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-primary/10 text-primary rounded font-mono">
                              {item.variantName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-on-surface-variant text-[11px]">
                        {item.barcode || '—'}
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.productId, Math.max(1, item.qty - 1))}
                            className="w-5 h-5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val > 0) onUpdateQty(item.productId, val);
                            }}
                            className="w-11 text-center font-mono font-bold bg-surface-container border border-outline-variant/20 rounded py-0.5 text-xs focus:outline-hidden focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                            className="w-5 h-5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-left font-mono text-on-surface-variant">
                        {formatMoney(item.price)}
                      </td>
                      <td className="py-2 px-3 text-left font-mono text-emerald-500">
                        {item.discount && item.discount > 0 ? `-${formatMoney(item.discount)}` : '0.00'}
                      </td>
                      <td className="py-2 px-3 text-left font-mono font-black text-on-surface text-sm">
                        {formatMoney(item.lineTotal)}
                      </td>
                      <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onRemoveFromCart(item.productId)}
                          className="w-6 h-6 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer mx-auto"
                          title="حذف هذا المنتج"
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

        {/* Table Footer Status Bar */}
        <div className="bg-surface-container-low/90 border-t border-outline-variant/15 px-3 py-1.5 flex items-center justify-between text-[11px] text-on-surface-variant shrink-0 font-mono">
          <div className="flex items-center gap-4">
            <span>التاريخ: {currentTime.toLocaleDateString('ar-DZ')} {currentTime.toLocaleTimeString('ar-DZ')}</span>
            <span>عدد المواد: <strong className="text-on-surface">{totalItemsCount}</strong></span>
            <span>إجمالي القطع: <strong className="text-on-surface">{totalUnitsCount}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>الزبون: <strong className="text-primary font-sans">{selectedCustomerName || 'زبون عام'}</strong></span>
            <span className="text-emerald-500 font-sans font-bold">تقبض فقط</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. BOTTOM SECTION: QUICK ITEMS GRID & CATEGORIES (شبكة بالأسفل) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="h-[38vh] min-h-[190px] max-h-[320px] flex flex-row overflow-hidden bg-surface-container-lowest/60 shrink-0">
        
        {/* Left / Center: Quick Product Buttons Grid */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant/60 text-xs py-8">
              <Package className="w-8 h-8 opacity-40 mb-1" />
              <p>لا توجد منتجات مطابقة لهذا التصنيف أو البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
              {filteredProducts.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => onAddToCart(prod)}
                  className="p-2 rounded-xl bg-surface-container hover:bg-primary/10 border border-outline-variant/20 hover:border-primary/40 text-right flex flex-col justify-between transition-all active:scale-95 shadow-2xs hover:shadow-xs group cursor-pointer h-20"
                >
                  <p className="text-xs font-bold text-on-surface line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {prod.name}
                  </p>
                  <div className="flex items-baseline justify-between w-full pt-1 border-t border-outline-variant/10 mt-1">
                    <span className="text-[10px] text-on-surface-variant/70 font-mono">
                      {prod.stock !== undefined ? `المخزون: ${prod.stock}` : ''}
                    </span>
                    <span className="text-xs font-black font-mono text-primary">
                      {formatMoney(prod.price)} {currency}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right (In RTL): Vertical Category Tabs */}
        <div className="w-36 sm:w-44 border-r border-outline-variant/20 bg-surface-container-low flex flex-col overflow-y-auto custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => onSelectCategory('ALL')}
            className={`px-3 py-2 text-right text-xs font-bold border-b border-outline-variant/10 flex items-center justify-between transition-all cursor-pointer ${
              !selectedCategory || selectedCategory === 'ALL'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'hover:bg-surface-container text-on-surface'
            }`}
          >
            <span>جميع السلع</span>
            <Layers className="w-3.5 h-3.5 opacity-70" />
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-2 text-right text-xs font-bold border-b border-outline-variant/10 flex items-center justify-between transition-all cursor-pointer truncate ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'hover:bg-surface-container text-on-surface'
                }`}
              >
                <span className="truncate">{cat.name}</span>
                {isSelected && <Check className="w-3 h-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. BOTTOM STATUS BAR: USER & STORE INFO                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface-container border-t border-outline-variant/20 px-3 py-1 flex items-center justify-between text-[11px] text-on-surface-variant shrink-0 font-cairo">
        <div className="flex items-center gap-3">
          <span>المستخدم: <strong className="text-on-surface">{userName}</strong></span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">المحل: <strong className="text-on-surface">{storeName}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isSessionOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span>{isSessionOpen ? 'الجلسة مفتوحة' : 'الجلسة مغلقة'}</span>
        </div>
      </div>
    </div>
  );
};
export default ClassicPOSLayout;
