import React from 'react';
import { QrCode } from 'lucide-react';
import type { Product } from '@/types';
import type { QuickPOSMobileTab } from '../types';
import { QuickPOSCatalogSearchBar } from './catalog/QuickPOSCatalogSearchBar';
import { QuickPOSCategoryPills } from './catalog/QuickPOSCategoryPills';
import { QuickPOSProductCard } from './catalog/QuickPOSProductCard';

export interface QuickPOSCatalogProps {
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
  mobileTab: QuickPOSMobileTab;
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
      <QuickPOSCatalogSearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearchClear={onSearchClear}
        searchInputRef={searchInputRef}
        onSearchKeyDown={onSearchKeyDown}
        suspendedOrdersCount={suspendedOrdersCount}
        onOpenHeldSales={onOpenHeldSales}
        onOpenNewProduct={onOpenNewProduct}
      />

      {/* 2. CATEGORIES FILTER PILLS */}
      <QuickPOSCategoryPills
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        totalProductsCount={totalProductsCount}
      />

      {/* 3. PRODUCTS GRID */}
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar" data-purpose="product-grid">
        {filteredProducts.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <QrCode className="w-12 h-12 mb-2 opacity-25" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              لا توجد أصناف مطابقة للبحث
            </p>
            <p className="text-xs opacity-70 mt-1">امسح الباركود مباشرة للإضافة التلقائية</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <QuickPOSProductCard
                key={product.id}
                product={product}
                onAddProduct={onAddProduct}
                baseCurrency={baseCurrency}
              />
            ))}
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

export default QuickPOSCatalog;
