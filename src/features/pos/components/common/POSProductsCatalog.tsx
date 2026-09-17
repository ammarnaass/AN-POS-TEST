import React from 'react';
import { Package } from 'lucide-react';
import type { Product } from '@/types';
import { getProductTierPrice } from '@/services';

export interface POSProductsCatalogProps {
  displayedProducts: Product[];
  allProductsCount: number;
  onAddToCart: (product: Product) => void;
  priceTier?: '1' | '2' | '3' | '4';
  showProductImages?: boolean;
  viewMode?: 'grid' | 'list';
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  className?: string;
}

export const POSProductsCatalog: React.FC<POSProductsCatalogProps> = ({
  displayedProducts,
  allProductsCount,
  onAddToCart,
  priceTier = '1',
  showProductImages = true,
  viewMode = 'grid',
  currentPage,
  totalPages,
  setCurrentPage,
  formatMoney,
  currency = 'دج',
  className = '',
}) => {
  return (
    <div className={`flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}>
      {/* شبكة أو قائمة المنتجات */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
        {displayedProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <Package className="w-16 h-16 stroke-[1.2] mb-3 opacity-30 text-blue-500" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              لا توجد منتجات تطابق البحث أو التصنيف المختار
            </p>
            <p className="text-xs text-slate-400 mt-1">
              جرّب اختيار تصنيف آخر أو مسح عبارة البحث
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {displayedProducts.map((product) => {
              const stock = product.quantity ?? (product as any).stock ?? (product as any).stockQuantity ?? 0;
              const isLowStock = stock > 0 && stock <= 5;
              const isOutOfStock = stock <= 0;
              const activePrice = getProductTierPrice(product, priceTier);
              const categoryName =
                typeof product.category === 'object' && product.category
                  ? (product.category as any).name
                  : product.category || 'عام';

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
            {displayedProducts.map((product) => {
              const stock = product.quantity ?? (product as any).stock ?? (product as any).stockQuantity ?? 0;
              const isLowStock = stock > 0 && stock <= 5;
              const isOutOfStock = stock <= 0;
              const activePrice = getProductTierPrice(product, priceTier);
              const categoryName =
                typeof product.category === 'object' && product.category
                  ? (product.category as any).name
                  : product.category || 'عام';

              return (
                <article
                  key={product.id}
                  onClick={() => onAddToCart(product)}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer group p-3.5 select-none"
                >
                  <div>
                    {/* القسم وحالة المخزون */}
                    <div className="flex justify-between items-start mb-2 gap-1">
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold truncate max-w-[100px]">
                        {categoryName}
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

                    {/* صورة المنتج */}
                    {showProductImages && (
                      <div className="h-28 w-full bg-slate-50 dark:bg-slate-900/60 rounded-xl flex items-center justify-center mb-2.5 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/20 transition overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-contain p-2"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
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

      {/* شريط التصفح والصفحات (Pagination) */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5 font-medium">
          <span>عرض صفحة {currentPage} من {totalPages}</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span>إجمالي الأصناف: {allProductsCount}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, (typeof p === 'function' ? p(currentPage) : p) - 1))}
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, (typeof p === 'function' ? p(currentPage) : p) + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  );
};
