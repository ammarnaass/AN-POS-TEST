import React from 'react';
import { Package, Tag, Plus, Layers, Check } from 'lucide-react';
import type { Product, Category } from '@/types';

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
}

export const ClassicPOSProductGrid: React.FC<ClassicPOSProductGridProps> = React.memo(({
  displayedProducts,
  onAddToCart,
  categories,
  selectedCategory,
  onSelectCategory,
  formatMoney,
  currency = 'دج',
  userName = 'Admin',
  storeName = 'AN POS',
  isSessionOpen,
}) => {
  return (
    <>
      {/* 4. BOTTOM SECTION: QUICK ITEMS GRID & CATEGORIES */}
      <div className="h-[28vh] sm:h-[30vh] min-h-[190px] max-h-[265px] flex flex-row overflow-hidden bg-surface-container-lowest/60 shrink-0">
        {/* Left / Center: Quick Product Buttons Grid */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {displayedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant/60 text-xs py-8">
              <Package className="w-8 h-8 opacity-40 mb-1" />
              <p>لا توجد منتجات مطابقة لهذا التصنيف أو البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {displayedProducts.map((prod, pIdx) => {
                const categoryName =
                  (typeof prod.category === 'object' && prod.category !== null
                    ? (prod.category as any).name
                    : prod.category) || 'عام';
                const qty = prod.quantity ?? (prod as any).stock ?? 0;
                const isOutOfStock = qty <= 0;
                const price = (prod as any).price ?? prod.retailPrice ?? 0;

                return (
                  <button
                    key={prod.id || `prod-${pIdx}`}
                    type="button"
                    onClick={() => onAddToCart(prod)}
                    className="group relative rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/20 hover:border-primary/50 text-right flex flex-col justify-between overflow-hidden transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-md cursor-pointer h-36"
                  >
                    {/* Top 60%: Image & Surface Badges */}
                    <div className="h-[58%] w-full relative overflow-hidden bg-surface-container/60 shrink-0">
                      {/* Category Badge */}
                      <div className="absolute top-1.5 right-1.5 z-10">
                        <span className="px-1.5 py-0.5 rounded-md bg-surface-container-highest/90 backdrop-blur-xs text-on-surface border border-outline-variant/30 text-[9px] font-bold flex items-center gap-1 shadow-2xs">
                          <Tag className="w-2 h-2 text-primary" />
                          <span className="truncate max-w-[65px]">{categoryName}</span>
                        </span>
                      </div>

                      {/* Stock Badge */}
                      <div className="absolute top-1.5 left-1.5 z-10">
                        {isOutOfStock ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-error/15 backdrop-blur-xs text-error border border-error/30 text-[9px] font-black shadow-2xs">
                            نفذ
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md bg-surface-container-highest/90 backdrop-blur-xs text-emerald-600 dark:text-emerald-400 border border-outline-variant/30 text-[9px] font-mono font-bold shadow-2xs flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{qty}</span>
                          </span>
                        )}
                      </div>

                      {/* Product Image or Fallback */}
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container/40 text-on-surface-variant/40 group-hover:text-primary/70 transition-colors relative">
                          <Package className="w-7 h-7 opacity-40 group-hover:scale-110 transition-transform" />
                        </div>
                      )}

                      {/* Quick Add Hover Overlay */}
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center pointer-events-none">
                        <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                    {/* Bottom 40%: Name, Category, Price */}
                    <div className="h-[42%] p-2 flex flex-col justify-between bg-surface-container-lowest group-hover:bg-surface-container-low border-t border-outline-variant/15 flex-1">
                      <p className="text-xs font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors leading-tight">
                        {prod.name}
                      </p>
                      <div className="flex items-baseline justify-between w-full pt-0.5">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xs sm:text-sm font-black font-mono text-primary">
                            {formatMoney(price)}
                          </span>
                          <span className="text-[9px] font-bold text-on-surface-variant font-cairo">
                            {currency}
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-primary/10 group-hover:bg-primary text-primary group-hover:text-on-primary border border-primary/20 group-hover:border-transparent flex items-center justify-center transition-colors shadow-2xs active:scale-90 shrink-0">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right (In RTL): Vertical Category Tabs */}
        <div className="w-36 sm:w-44 border-r border-outline-variant/20 bg-surface-container-low flex flex-col overflow-y-auto custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => onSelectCategory('')}
            className={`px-3.5 py-3 text-right text-xs font-bold border-b border-outline-variant/10 flex items-center justify-between min-h-[44px] transition-all cursor-pointer active:scale-[0.98] ${
              !selectedCategory || selectedCategory === 'ALL'
                ? 'bg-primary text-on-primary shadow-xs font-black'
                : 'hover:bg-surface-container text-on-surface'
            }`}
          >
            <span>جميع السلع</span>
            <Layers className="w-4 h-4 opacity-80" />
          </button>

          {categories.map((cat, cIdx) => {
            const catName = typeof cat === 'object' && cat !== null ? (cat as any).name : String(cat);
            const catId = typeof cat === 'object' && cat !== null ? (cat as any).id : catName;
            const isSelected = selectedCategory === catName || selectedCategory === catId;
            return (
              <button
                key={catId || `cat-${cIdx}`}
                type="button"
                onClick={() => onSelectCategory(catName)}
                className={`px-3.5 py-3 text-right text-xs font-bold border-b border-outline-variant/10 flex items-center justify-between min-h-[44px] transition-all cursor-pointer truncate active:scale-[0.98] ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-xs font-black'
                    : 'hover:bg-surface-container text-on-surface'
                }`}
              >
                <span className="truncate">{catName}</span>
                {isSelected && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. BOTTOM STATUS BAR: USER & STORE INFO */}
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
    </>
  );
});
