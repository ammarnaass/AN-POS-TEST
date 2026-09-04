import React from 'react';
import { Barcode, X, PauseCircle, Plus } from 'lucide-react';
import type { Product } from '@/types';
import { formatNumber } from '../../utils/format';

interface QuickPOSCatalogProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchClear: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  suspendedOrdersCount: number;
  onOpenHeldSales: () => void;
  categories: string[] | readonly string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  totalProductsCount: number;
  filteredProducts: Product[];
  onAddProduct: (product: Product) => void;
  mobileTab: 'catalog' | 'cart';
}

export const QuickPOSCatalog: React.FC<QuickPOSCatalogProps> = React.memo(({
  searchQuery,
  onSearchChange,
  onSearchClear,
  searchInputRef,
  suspendedOrdersCount,
  onOpenHeldSales,
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductsCount,
  filteredProducts,
  onAddProduct,
  mobileTab,
}) => {
  return (
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
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="⚡ امسح الباركود بالكاشف أو اكتب اسم الصنف / الكود (F2)..."
            className="w-full h-11 pr-10 pl-4 bg-surface rounded-xl border-2 border-amber-500/40 focus:border-amber-500 text-sm font-bold text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
            autoFocus
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none">
            <Barcode className="w-5 h-5" />
          </div>
          {searchQuery && (
            <button
              onClick={onSearchClear}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Held Sales Button */}
        {suspendedOrdersCount > 0 && (
          <button
            onClick={onOpenHeldSales}
            className="h-11 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
          >
            <PauseCircle className="w-4 h-4" />
            <span>المعلقة ({suspendedOrdersCount})</span>
          </button>
        )}
      </div>

      {/* Quick Categories Bar */}
      <div className="px-3 py-2 bg-surface-container-lowest border-b border-outline-variant/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-scroll shrink-0">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
          }`}
        >
          الكل ({totalProductsCount})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
            {filteredProducts.slice(0, 36).map((product) => (
              <button
                key={product.id}
                onClick={() => onAddProduct(product)}
                className="p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container hover:border-amber-500/50 border border-outline-variant/15 flex flex-col justify-between text-right transition-all duration-150 active:scale-95 shadow-2xs hover:shadow-sm cursor-pointer min-h-[95px] group"
              >
                <div>
                  <h4 className="text-xs font-bold text-on-surface line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
                    {product.name}
                  </h4>
                  <span className="text-[10px] text-on-surface-variant font-mono mt-0.5 block truncate">
                    {product.barcode || product.sku || (typeof product.category === 'object' && product.category ? (product.category as any).name : product.category) || 'عام'}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
