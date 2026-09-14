import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Package, Plus, Check, Tag } from 'lucide-react';
import type { Product, Category } from '@/types';

export interface Design6ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  formatMoney: (val?: number) => string;
  currency?: string;
  categories?: (Category | { id: string; name: string } | string)[];
}

export const Design6ProductSearchModal: React.FC<Design6ProductSearchModalProps> = ({
  isOpen,
  onClose,
  products = [],
  onSelectProduct,
  formatMoney,
  currency = 'دج',
  categories = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [addedId, setAddedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedCat('ALL');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Normalize categories
  const categoryNames = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    categories.forEach((c) => {
      const name = typeof c === 'string' ? c : c.name;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [products, categories]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      if (p.status === 'inactive') return false;
      // Category filter
      if (selectedCat !== 'ALL') {
        const pCat = p.category || (p as any).category_id;
        if (pCat !== selectedCat) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    });
  }, [products, searchTerm, selectedCat]);

  const handleAdd = (product: Product) => {
    onSelectProduct(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[88vh] bg-white dark:bg-[#070c18] border border-slate-300 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 transition-colors"
        dir="rtl"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-[#0b1324] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-500/20 border border-teal-300 dark:border-teal-500/40 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <Search className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>بحث واستعراض السلع والمواد</span>
                <span className="text-[10px] font-mono bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800/60 px-1.5 py-0.5 rounded">
                  F10
                </span>
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                ابحث بالاسم أو الباركود وأضف السلع مباشرة إلى الفاتورة النشطة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/60 text-slate-600 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-200 border border-slate-300 dark:border-slate-700/60 flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 bg-slate-50 dark:bg-[#080e1c] border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 transition-colors">
          {/* Live Search Input */}
          <div className="relative w-full">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اكتب اسم السلعة أو امسح الباركود للبحث السريع..."
              className="w-full h-11 bg-white dark:bg-[#050913] border-2 border-slate-300 dark:border-slate-700 focus:border-teal-500 rounded-xl pl-10 pr-11 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden font-medium transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Chips Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCat('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCat === 'ALL'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-800'
              }`}
            >
              جميع السلع ({products.length})
            </button>
            {categoryNames.map((catName) => (
              <button
                key={catName}
                type="button"
                onClick={() => setSelectedCat(catName)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedCat === catName
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-800'
                }`}
              >
                {catName}
              </button>
            ))}
          </div>
        </div>

        {/* Results List / Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-100/60 dark:bg-[#050913] transition-colors">
          {filteredProducts.length === 0 ? (
            <div className="py-14 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Package className="w-10 h-10 text-slate-400 dark:text-slate-600 stroke-[1.5]" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">لم يتم العثور على أي منتج مطابق للبحث</p>
              <p className="text-xs text-slate-500 dark:text-slate-600">تأكد من كتابة الاسم أو الباركود بشكل صحيح</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredProducts.map((prod) => {
                const isJustAdded = addedId === prod.id;
                const price = prod.retailPrice ?? (prod as any).price ?? 0;
                const inStock = prod.quantity ?? 0;

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleAdd(prod)}
                    className="p-3 bg-white dark:bg-[#0a1122] hover:bg-teal-50/70 dark:hover:bg-[#0f1a33] border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-500/60 rounded-xl flex flex-col justify-between gap-2.5 transition-all cursor-pointer group shadow-xs active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors line-clamp-2 leading-snug">
                          {prod.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                          {prod.barcode ? (
                            <span dir="ltr" className="truncate max-w-[110px] bg-slate-100 dark:bg-black/40 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                              {prod.barcode}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">بدون باركود</span>
                          )}
                          {prod.category && (
                            <span className="text-teal-700 dark:text-teal-400/90 truncate max-w-[80px]">
                              {prod.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="text-sm font-black font-mono text-cyan-700 dark:text-cyan-300">
                          {formatMoney(price)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">{currency}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-2 text-[10px]">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded ${
                          inStock > 5
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900/60'
                            : inStock > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60'
                            : 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900/60'
                        }`}
                      >
                        المخزون: {inStock}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdd(prod);
                        }}
                        className={`h-7 px-2.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                          isJustAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-teal-600 hover:bg-teal-500 text-white active:scale-95 shadow-xs'
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>تمت الإضافة</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 stroke-[3]" />
                            <span>إضافة</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-100 dark:bg-[#0b1324] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 transition-colors">
          <span>النتائج المعروضة: {filteredProducts.length} مادة</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer text-xs"
          >
            إغلاق (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
