import React from 'react';
import { Package, Search, X, Wand2, Check } from 'lucide-react';
import type { ProductEntity } from '@/infrastructure/database/dexie/db';

interface ProductSelectionPanelProps {
  products: ProductEntity[];
  filteredProducts: ProductEntity[];
  selectedIds: Set<string>;
  productBars: Map<string, string>;
  search: string;
  setSearch: (s: string) => void;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  baseCurrency: string;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onGenerateForAll: () => void;
}

export const ProductSelectionPanel: React.FC<ProductSelectionPanelProps> = ({
  products,
  filteredProducts,
  selectedIds,
  productBars,
  search,
  setSearch,
  categories,
  selectedCategory,
  setSelectedCategory,
  baseCurrency,
  onToggleSelect,
  onSelectAll,
  onClearAll,
  onGenerateForAll,
}) => {
  return (
    <div className="lg:col-span-4 bg-surface-container rounded-2xl border border-outline-variant/20 flex flex-col shadow-sm no-print overflow-hidden">
      {/* Header with counts and select buttons */}
      <div className="p-3.5 border-b border-outline-variant/20 space-y-3 bg-surface-container-high/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <Package className="w-4 h-4 text-primary" />
            اختيار المنتجات ({selectedIds.size}/{products.length})
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onSelectAll}
              className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[11px] font-bold transition-all cursor-pointer"
            >
              الكل
            </button>
            <button
              onClick={onClearAll}
              className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-[11px] font-medium transition-all cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، الباركود، أو الفئة..."
            className="w-full h-9 pr-8 pl-8 bg-surface-container-high/70 rounded-xl text-xs text-on-surface border border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary transition-all font-tajawal"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              الكل ({products.length})
            </button>
            {categories.map((cat: any) => {
              const catName =
                typeof cat === 'object' && cat !== null ? cat.name || cat.id : String(cat);
              return (
                <button
                  key={catName}
                  onClick={() => setSelectedCategory(catName)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === catName
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {catName}
                </button>
              );
            })}
          </div>
        )}

        {/* Auto Generate Missing Button */}
        <button
          onClick={onGenerateForAll}
          disabled={selectedIds.size === 0}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>توليد باركود تلقائي للأصناف المحددة</span>
        </button>
      </div>

      {/* Product Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {filteredProducts.map((p) => {
          const selected = selectedIds.has(p.id);
          const code = productBars.get(p.id) || p.barcode || '';
          return (
            <div
              key={p.id}
              onClick={() => onToggleSelect(p.id)}
              className={`w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                selected
                  ? 'border-primary/60 bg-primary/5 shadow-sm'
                  : 'border-outline-variant/15 bg-surface-container-high/40 hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    selected
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline-variant/40 bg-surface-container'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5" />}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        code
                          ? 'bg-emerald-500/10 text-emerald-600 font-bold'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {code || 'بدون باركود'}
                    </span>
                    {p.category && (
                      <span className="text-[10px] text-on-surface-variant truncate">
                        • {typeof p.category === 'object' ? (p.category as any).name : p.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className="text-xs font-bold text-primary font-cairo shrink-0">
                {Number(p.retailPrice || 0).toFixed(0)}{' '}
                <span className="text-[10px] font-normal">{baseCurrency}</span>
              </span>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="text-center py-10 text-on-surface-variant text-xs">
            لا توجد منتجات مطابقة لخيارات البحث
          </div>
        )}
      </div>
    </div>
  );
};
