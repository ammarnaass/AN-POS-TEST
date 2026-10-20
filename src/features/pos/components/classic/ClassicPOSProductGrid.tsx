import React from 'react';
import { Package, Tag, Layers, Check } from 'lucide-react';
import type { Product, Category } from '@/types';
import { getProductTierPrice } from '@/services';

interface ClassicPOSProductGridProps {
  displayedProducts: Product[];
  onAddToCart: (product: Product) => void;
  categories: (Category | { id: string; name: string } | string)[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  formatMoney: (amount?: number) => string;
  currency?: string;
  userName?: string;
  storeName?: string;
  isSessionOpen: boolean;
  priceTier?: '1' | '2' | '3' | '4';
}

export const ClassicPOSProductGrid: React.FC<ClassicPOSProductGridProps> = React.memo(({
  displayedProducts,
  onAddToCart,
  categories,
  selectedCategory,
  onSelectCategory,
  formatMoney,
  currency = 'دج',
  userName: _userName,
  storeName: _storeName,
  isSessionOpen: _isSessionOpen,
  priceTier = '1',
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-hidden select-none">
      {/* Category Filter Chips Bar */}
      <div className="bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`category-btn px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>الكل</span>
        </button>

        {categories.map((cat, idx) => {
          const catId = typeof cat === 'object' && cat !== null ? (cat as any).id || (cat as any).name : String(cat);
          const catName = typeof cat === 'object' && cat !== null ? (cat as any).name || (cat as any).id : String(cat);
          const isSelected = selectedCategory === catId;

          return (
            <button
              key={`${catId}-${idx}`}
              type="button"
              onClick={() => onSelectCategory(catId)}
              className={`category-btn px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isSelected && <Check className="w-3 h-3" />}
              <span>{catName}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Product Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar">
        {displayedProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs py-12">
            <Package className="w-10 h-10 opacity-30 mb-2" />
            <p className="font-bold">لا توجد منتجات مطابقة لهذا التصنيف</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {displayedProducts.map((prod, pIdx) => {
              const categoryName =
                (typeof prod.category === 'object' && prod.category !== null
                  ? (prod.category as any).name
                  : prod.category) || 'عام';
              const qty = prod.quantity ?? (prod as any).stock ?? 0;
              const isOutOfStock = qty <= 0;
              const price = getProductTierPrice(prod, priceTier);

              return (
                <button
                  key={prod.id || `prod-${pIdx}`}
                  type="button"
                  onClick={() => onAddToCart(prod)}
                  className="group relative rounded-xl bg-white dark:bg-slate-850 hover:bg-blue-50/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-right flex flex-col justify-between overflow-hidden transition-all duration-150 active:scale-[0.98] shadow-2xs hover:shadow-sm cursor-pointer p-2 min-h-[95px]"
                >
                  <div className="w-full flex items-start justify-between gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5 text-blue-500" />
                      <span className="truncate max-w-[65px]">{categoryName}</span>
                    </span>

                    {isOutOfStock ? (
                      <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold">
                        نفذ
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                        {qty}
                      </span>
                    )}
                  </div>

                  <div className="my-1.5">
                    <div className="font-bold text-slate-800 dark:text-white text-xs line-clamp-2 leading-snug">
                      {prod.name}
                    </div>
                  </div>

                  <div className="w-full flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                      {formatMoney(price)} {currency}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {prod.barcode ? `#${prod.barcode.slice(-4)}` : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default ClassicPOSProductGrid;
