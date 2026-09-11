import React from 'react';
import { QrCode, Plus, X, PauseCircle } from 'lucide-react';
import type { Product } from '@/types';
import { formatNumber } from '../../utils/format';

interface QuickPOSCatalogProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchClear: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  suspendedOrdersCount: number;
  onOpenHeldSales: () => void;
  onOpenNewProduct?: () => void;
  categories: string[] | readonly string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  totalProductsCount: number;
  filteredProducts: Product[];
  onAddProduct: (product: Product) => void;
  mobileTab: 'catalog' | 'cart';
  baseCurrency?: string;
}

export const QuickPOSCatalog: React.FC<QuickPOSCatalogProps> = React.memo(({
  searchQuery,
  onSearchChange,
  onSearchClear,
  searchInputRef,
  onSearchKeyDown,
  suspendedOrdersCount,
  onOpenHeldSales,
  onOpenNewProduct,
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductsCount,
  filteredProducts,
  onAddProduct,
  mobileTab,
  baseCurrency = 'دج',
}) => {
  return (
    <section
      className={`flex-1 flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${
        mobileTab === 'catalog' ? 'flex' : 'hidden md:flex'
      }`}
      data-purpose="product-catalog-explorer"
    >
      {/* 1. TOP SEARCH & BARCODE SCANNER FIELD */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-2.5">
        <div className="relative flex-1">
          {/* Barcode scanner icon */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-brand-600 dark:text-brand-400">
            <QrCode className="w-5 h-5" />
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="⚡ امسح الباركود بالكاشف أو اكتب اسم الصنف / الكود (F7)..."
            className="w-full pr-11 pl-16 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-brand-500 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition shadow-2xs"
            autoFocus
          />

          {/* Left accessories: Clear button and F7 shortcut badge */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={onSearchClear}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded font-mono select-none">
              F7
            </span>
          </div>
        </div>

        {/* New Item Button */}
        {onOpenNewProduct && (
          <button
            type="button"
            onClick={onOpenNewProduct}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
            title="إضافة صنف أو منتج حر جديد"
          >
            <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>صنف جديد</span>
          </button>
        )}

        {/* Suspended Orders Indicator Button */}
        {suspendedOrdersCount > 0 && (
          <button
            type="button"
            onClick={onOpenHeldSales}
            className="px-3 py-2.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-700 transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
            title="الفواتير المعلقة (F3)"
          >
            <PauseCircle className="w-4 h-4" />
            <span>المعلقة ({suspendedOrdersCount})</span>
          </button>
        )}
      </div>

      {/* 2. CATEGORIES FILTER PILLS */}
      <div
        className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0"
        data-purpose="category-pills"
      >
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          الكل ({totalProductsCount})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 3. PRODUCTS GRID */}
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar" data-purpose="product-grid">
        {filteredProducts.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <QrCode className="w-12 h-12 mb-2 opacity-25" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">لا توجد أصناف مطابقة للبحث</p>
            <p className="text-xs opacity-70 mt-1">امسح الباركود مباشرة للإضافة التلقائية</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => {
              const isOutOfStock =
                product.trackStock !== false && product.stock !== undefined && product.stock <= 0;
              const isLowStock =
                product.trackStock !== false &&
                product.stock !== undefined &&
                product.stock > 0 &&
                Boolean(product.minStockAlert && product.stock <= product.minStockAlert);

              const stockColorClass = isOutOfStock
                ? 'bg-rose-500'
                : isLowStock
                ? 'bg-amber-500'
                : 'bg-emerald-500';

              const stockTitle = isOutOfStock
                ? 'نفد المخزون'
                : isLowStock
                ? `مخزون منخفض (${product.stock})`
                : `متوفر (${product.stock ?? 'غير محدود'})`;

              return (
                <article
                  key={product.id}
                  onClick={() => onAddProduct(product)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer group relative select-none"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[80%]">
                        {product.barcode || product.sku || 'صنف سريع'}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${stockColorClass}`}
                        title={stockTitle}
                      />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition truncate">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-brand-600 dark:text-brand-400 font-extrabold text-sm font-mono">
                      {formatNumber(product.retailPrice)}{' '}
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                        {baseCurrency}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 group-hover:bg-brand-600 dark:group-hover:bg-brand-600 text-amber-800 dark:text-amber-300 group-hover:text-white flex items-center justify-center transition font-bold text-sm"
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

      {/* 4. CATALOG FOOTER STATS */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
        <div>عرض {filteredProducts.length} صنف متاح في قاعدة البيانات المحلية</div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>المزامنة السحابية: متصلة وجاهزة</span>
        </div>
      </div>
    </section>
  );
});
