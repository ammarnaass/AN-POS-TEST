import React from 'react';
import {
  Package,
  Plus,
  Tag,
  Minus,
  Trash2,
  Edit3,
  Check,
  X,
  User,
  UserPlus,
  ChevronDown,
  Layers,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import type { CartItem, Product, Customer } from '@/types';
import type { POSSettings } from '../hooks/usePOSData';
import type { POSLayout } from '../store/usePOSSessionStore';
import { POSActionBar } from './POSActionBar';

export interface DefaultGridPOSLayoutProps {
  paginatedProducts: Product[];
  showProductImages: boolean;
  posSettings: POSSettings;
  onAddProduct: (product: Product) => void;
  viewMode: 'grid' | 'list';
  onOpenAddProduct: () => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (p: number) => void;
  posLayout: POSLayout;
  cart: CartItem[];
  saleSummary: {
    subtotal: number;
    discountAmount: number;
    total: number;
  };
  isSessionOpen: boolean;
  isSalePending: boolean;
  suspendedCount: number;
  autoPrintReceipt: boolean;
  onSettleSale: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  onClearCart: () => void;
  onOpenReturns: () => void;
  onToggleAutoPrint: () => void;
  onOpenDiscount: () => void;
  onSaveAsProforma: () => void;
  onSaveAsOrder: () => void;
  mobileTab: 'products' | 'cart';
  setMobileTab: (tab: 'products' | 'cart') => void;
  selectedCustomer: string;
  setSelectedCustomer: (id: string) => void;
  customers: Customer[];
  selectedCustomerObj?: Customer;
  onOpenCustomerSelect: () => void;
  onOpenAddCustomer: () => void;
  isWholesaleActive: boolean;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  onUpdateQty: (item: CartItem, newQty: number) => void;
  editingPriceFor: string | null;
  setEditingPriceFor: (id: string | null) => void;
  priceInput: string;
  setPriceInput: (val: string) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onRemoveItem: (productId: string) => void;
  formatNumber: (val: number | null | undefined) => string;
  formatMoney: (val: number | null | undefined) => string;
}

export const DefaultGridPOSLayout: React.FC<DefaultGridPOSLayoutProps> = ({
  paginatedProducts,
  showProductImages,
  posSettings,
  onAddProduct,
  viewMode,
  onOpenAddProduct,
  currentPage,
  totalPages,
  setCurrentPage,
  posLayout,
  cart,
  saleSummary,
  isSessionOpen,
  isSalePending,
  suspendedCount,
  autoPrintReceipt,
  onSettleSale,
  onSuspendSale,
  onOpenSuspended,
  onClearCart,
  onOpenReturns,
  onToggleAutoPrint,
  onOpenDiscount,
  onSaveAsProforma,
  onSaveAsOrder,
  mobileTab,
  setMobileTab,
  selectedCustomer,
  setSelectedCustomer,
  customers,
  selectedCustomerObj,
  onOpenCustomerSelect,
  onOpenAddCustomer,
  isWholesaleActive,
  selectedItemId,
  setSelectedItemId,
  onUpdateQty,
  editingPriceFor,
  setEditingPriceFor,
  priceInput,
  setPriceInput,
  onUpdatePrice,
  onRemoveItem,
  formatNumber,
  formatMoney,
}) => {
  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
      {/* --------------------------------------------------------- */}
      {/* RIGHT (IN RTL): PRODUCT DISCOVERY AREA (ZONE 2)           */}
      {/* --------------------------------------------------------- */}
      <main
        className={`flex-1 flex-col min-w-0 bg-background dark:bg-slate-950 border-l border-outline-variant/20 dark:border-slate-800 overflow-hidden ${
          mobileTab === 'products' ? 'flex' : 'hidden md:flex'
        }`}
      >
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
                onClick={onOpenAddProduct}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة منتج جديد</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Product Cards Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5">
              {paginatedProducts.map((product) => {
                const isPack = String(product.id).startsWith('pack-') || Boolean((product as any).isPack);
                const isOutOfStock = !posSettings.allowNegativeStock && !posSettings.accountingOnly && product.quantity <= 0;
                const categoryName =
                  (typeof product.category === 'object' && product.category !== null
                    ? (product.category as any).name
                    : product.category) || 'عام';
                const packPieces = (product as any).packPiecesCount || 1;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && onAddProduct(product)}
                    className={`group relative rounded-3xl bg-surface-container-low/95 dark:bg-slate-900/95 backdrop-blur-xs border transition-all duration-300 flex flex-col overflow-hidden cursor-pointer ${
                      showProductImages ? 'h-72 sm:h-80' : 'min-h-[140px]'
                    } select-none shadow-xs hover:shadow-xl hover:border-primary/50 hover:-translate-y-1.5 active:scale-[0.98] ${
                      isOutOfStock
                        ? 'border-red-500/30 bg-red-500/5 cursor-not-allowed opacity-80'
                        : 'border-outline-variant/20 dark:border-slate-800'
                    }`}
                  >
                    {/* Top Area: Image */}
                    {showProductImages && (
                      <div className="h-[60%] w-full relative overflow-hidden bg-surface-container/60 shrink-0">
                        {/* Category Badge */}
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <span className="px-2.5 py-1 rounded-xl bg-surface-container-highest/90 backdrop-blur-md border border-outline-variant/30 text-on-surface text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                            <Tag className="w-2.5 h-2.5 text-primary" />
                            <span className="max-w-[90px] truncate">{categoryName}</span>
                          </span>
                        </div>

                        {/* Stock Status Badge */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          {isOutOfStock ? (
                            <span className="px-2.5 py-1 rounded-xl bg-error-container/90 backdrop-blur-md border border-error/30 text-on-error-container text-[10px] font-extrabold shadow-sm">
                              نفذ
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl bg-surface-container-highest/90 backdrop-blur-md border border-outline-variant/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold shadow-sm flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{product.quantity} {isPack ? 'عبوة' : 'قطع'}</span>
                            </span>
                          )}
                        </div>

                        {/* Pack Badge */}
                        {isPack && (
                          <div className="absolute bottom-2.5 right-2.5 z-10">
                            <span className="px-2.5 py-0.5 rounded-lg bg-primary/95 text-on-primary text-[10px] font-bold shadow-sm flex items-center gap-1 backdrop-blur-xs">
                              <Package className="w-3 h-3" />
                              <span>عبوة جملة (×{packPieces})</span>
                            </span>
                          </div>
                        )}

                        {/* Image */}
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container via-surface-container-high/50 to-surface-container-highest/40 text-on-surface-variant/40 group-hover:text-primary/70 transition-colors relative">
                            <span className="absolute text-5xl sm:text-6xl font-black font-mono text-on-surface/5 select-none pointer-events-none tracking-widest">
                              {product.name ? product.name.slice(0, 2) : 'AN'}
                            </span>
                            <Package className="w-12 h-12 opacity-50 group-hover:scale-110 group-hover:opacity-80 transition-all duration-300 text-primary/70" />
                          </div>
                        )}

                        {/* Quick Add Overlay */}
                        {!isOutOfStock && (
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                            <span className="px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-bold text-xs shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200 flex items-center gap-1.5">
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة للسلة</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Area: Name, Price & Details */}
                    <div
                      className={`${
                        showProductImages ? 'h-[40%]' : 'h-full'
                      } p-3 sm:p-3.5 flex flex-col justify-between bg-surface-container-low/95 border-t border-outline-variant/15 flex-1`}
                    >
                      <div>
                        <h4
                          className="text-xs sm:text-sm font-black text-on-surface line-clamp-1 group-hover:text-primary transition-colors font-cairo leading-snug"
                          title={product.name}
                        >
                          {product.name}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-on-surface-variant/70 font-mono mt-0.5">
                          <span className="truncate max-w-[110px]">{product.barcode || product.sku || 'بدون باركود'}</span>
                          <span className="text-primary/80 font-bold truncate max-w-[90px]">{categoryName}</span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between pt-1 border-t border-outline-variant/10 mt-1">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-on-surface-variant font-medium">سعر الوحدة:</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-base sm:text-lg font-black font-mono text-primary tracking-tight">
                              {formatNumber(product.retailPrice)}
                            </span>
                            <span className="text-[11px] font-bold text-on-surface-variant font-cairo">دج</span>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-primary/10 group-hover:bg-primary text-primary group-hover:text-on-primary border border-primary/20 group-hover:border-transparent flex items-center justify-center transition-all duration-200 shadow-2xs group-hover:shadow-xs shrink-0">
                          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
                        </div>
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
                const isPack = String(product.id).startsWith('pack-') || Boolean((product as any).isPack);
                const isOutOfStock = !posSettings.allowNegativeStock && !posSettings.accountingOnly && product.quantity <= 0;
                const packPieces = (product as any).packPiecesCount || 1;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && onAddProduct(product)}
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
                          <span>
                            {(typeof product.category === 'object' && product.category !== null
                              ? (product.category as any).name
                              : product.category) || 'عام'}
                          </span>
                          <span>·</span>
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-md bg-error/10 text-error font-extrabold border border-error/20">
                              نفذ {isPack ? `(0 عبوة)` : ``}
                            </span>
                          ) : isPack ? (
                            <span className="font-bold text-primary">
                              ({product.quantity} عبوة متاحة · ×{packPieces} قطع)
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-600">({product.quantity} قطعة)</span>
                          )}
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
            className="px-4 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 hover:border-primary/30 text-xs font-bold text-on-surface disabled:opacity-40 transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            السابق
          </button>
          <span className="font-mono text-xs font-bold text-on-surface bg-surface-container px-3 py-1 rounded-xl border border-outline-variant/15 shadow-2xs">
            صفحة {currentPage} من {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 hover:border-primary/30 text-xs font-bold text-on-surface disabled:opacity-40 transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            التالي
          </button>
        </div>

        {/* Bottom Financial & Action Bar for Design 2 (bottom layout) */}
        {posLayout === 'bottom' && (
          <POSActionBar
            layoutVariant="bottom"
            cartLength={cart.length}
            subtotal={saleSummary.subtotal}
            total={saleSummary.total}
            discountAmount={saleSummary.discountAmount}
            isSessionOpen={isSessionOpen}
            isSalePending={isSalePending}
            suspendedCount={suspendedCount}
            autoPrintReceipt={autoPrintReceipt}
            onSettleSale={onSettleSale}
            onSuspendSale={onSuspendSale}
            onOpenSuspended={onOpenSuspended}
            onClearCart={onClearCart}
            onOpenReturns={onOpenReturns}
            onToggleAutoPrint={onToggleAutoPrint}
            onOpenDiscount={onOpenDiscount}
            onSaveAsProforma={onSaveAsProforma}
            onSaveAsOrder={onSaveAsOrder}
            showFinancialSummary={true}
          />
        )}
      </main>

      {/* --------------------------------------------------------- */}
      {/* LEFT (IN RTL): CART PANEL (ZONES 3 & 4)                   */}
      {/* --------------------------------------------------------- */}
      <aside
        className={`bg-surface-container-low/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col h-full shrink-0 shadow-xl border-r border-outline-variant/20 dark:border-slate-800 z-10 transition-all duration-200 ${
          mobileTab === 'cart' ? 'flex w-full' : 'hidden md:flex'
        } ${posLayout === 'bottom' ? 'md:w-[320px] lg:w-[350px]' : 'md:w-[420px] lg:w-[450px]'}`}
      >
        {/* Mobile Top Bar inside Cart */}
        <div className="md:hidden p-2.5 bg-primary/10 border-b border-primary/20 flex items-center justify-between shrink-0">
          <button
            onClick={() => setMobileTab('products')}
            className="text-xs font-bold text-primary flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-surface hover:bg-surface-container-high transition-colors shadow-2xs cursor-pointer"
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
                onClick={onOpenCustomerSelect}
                className="w-full py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold flex items-center justify-between transition-colors text-right cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <User className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    {selectedCustomer
                      ? `${customers.find((c) => c.id === selectedCustomer)?.name}${
                          selectedCustomerObj?.customerType === 'wholesale' ? ' (تاجر جملة)' : ''
                        }`
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
              onClick={onOpenAddCustomer}
              className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors cursor-pointer"
              title="إضافة زبون جديد"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isWholesaleActive && (
            <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>وضع بيع الجملة نشط (Gros)</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 font-mono font-black">
                فاتورة A4
              </span>
            </div>
          )}
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
                        <span className="text-[10px] text-on-surface-variant font-mono px-1.5 py-0.2 rounded bg-surface-container-high/60 border border-outline-variant/15">
                          #{idx + 1}
                        </span>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateQty(item, item.qty + 1);
                        }}
                        className="w-7 h-7 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary flex items-center justify-center transition-colors text-on-surface active:scale-95 cursor-pointer"
                        title="زيادة (+)"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-black font-mono text-on-surface">
                        {item.qty}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateQty(item, item.qty - 1);
                        }}
                        className="w-7 h-7 rounded-lg bg-surface-container hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-on-surface active:scale-95 cursor-pointer"
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
                                if (p > 0) onUpdatePrice(item.productId, p);
                                setEditingPriceFor(null);
                              }
                            }}
                            className="w-16 h-7 px-1.5 bg-surface-container-lowest border border-primary rounded-lg text-xs font-mono text-center shadow-xs"
                          />
                          <button
                            onClick={() => {
                              const p = Number(priceInput);
                              if (p > 0) onUpdatePrice(item.productId, p);
                              setEditingPriceFor(null);
                            }}
                            className="p-1 rounded bg-emerald-500 text-white cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingPriceFor(null)}
                            className="p-1 rounded bg-surface-container text-on-surface-variant cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPriceFor(item.productId);
                            setPriceInput(String(item.unitPrice));
                          }}
                          className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                          title="تعديل السعر"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item.productId);
                        }}
                        className="p-1.5 rounded-lg bg-surface-container hover:bg-red-500/10 text-on-surface-variant hover:text-red-500 transition-colors cursor-pointer"
                        title="حذف من السلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Aside Footer & Action Bar for Default Layout */}
        {posLayout !== 'bottom' && (
          <POSActionBar
            layoutVariant="aside"
            cartLength={cart.length}
            subtotal={saleSummary.subtotal}
            total={saleSummary.total}
            discountAmount={saleSummary.discountAmount}
            isSessionOpen={isSessionOpen}
            isSalePending={isSalePending}
            suspendedCount={suspendedCount}
            autoPrintReceipt={autoPrintReceipt}
            onSettleSale={onSettleSale}
            onSuspendSale={onSuspendSale}
            onOpenSuspended={onOpenSuspended}
            onClearCart={onClearCart}
            onOpenReturns={onOpenReturns}
            onToggleAutoPrint={onToggleAutoPrint}
            onOpenDiscount={onOpenDiscount}
            onSaveAsProforma={onSaveAsProforma}
            onSaveAsOrder={onSaveAsOrder}
            showFinancialSummary={true}
          />
        )}

        {/* Mini Cart Anchor Footer in Bottom Layout */}
        {posLayout === 'bottom' && mobileTab !== 'cart' && (
          <div className="p-3 bg-surface-container/95 border-t border-outline-variant/20 shrink-0 shadow-lg flex items-center justify-between gap-2.5 animate-in slide-in-from-bottom-2 duration-200">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
                <span>الإجمالي ({cart.length} أصناف):</span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-primary truncate">
                {formatMoney(saleSummary.total)} <span className="text-xs font-extrabold">دج</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onClearCart}
                disabled={cart.length === 0}
                title="إلغاء وإفراغ السلة (F4)"
                className="p-2 rounded-xl bg-surface-container-low hover:bg-red-500/15 text-red-600 border border-outline-variant/20 hover:border-red-500/30 transition-all cursor-pointer disabled:opacity-40 shadow-2xs active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onSettleSale}
                disabled={cart.length === 0 || isSalePending}
                title="تسوية الفاتورة والدفع السريع (F1)"
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 text-on-primary font-black text-xs flex items-center gap-1.5 shadow-md shadow-primary/20 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              >
                <Receipt className="w-4 h-4" />
                <span>دفع (F1)</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Floating Mobile Cart Summary Bar */}
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
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
