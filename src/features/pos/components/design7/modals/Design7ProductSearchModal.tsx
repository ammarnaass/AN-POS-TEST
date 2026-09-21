import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Package, Plus, Check } from 'lucide-react';
import type { Product, Category } from '@/types';
import { getProductTierPrice } from '@/services';

export interface Design7ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  formatMoney: (val?: number | null) => string;
  categories?: (Category | { id: string; name: string } | string)[];
  priceTier?: '1' | '2' | '3' | '4';
}

export const Design7ProductSearchModal: React.FC<Design7ProductSearchModalProps> = ({
  isOpen,
  onClose,
  products = [],
  onSelectProduct,
  formatMoney,
  categories = [],
  priceTier = '1',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [addedId, setAddedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedCat('ALL');
      setSelectedIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Extract category names
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
      if (selectedCat !== 'ALL') {
        const pCat = p.category || '';
        const pCatId = (p as any).category_id || p.categoryId || '';
        if (pCat !== selectedCat && pCatId !== selectedCat) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    });
  }, [products, searchTerm, selectedCat]);

  // Reset selected index whenever the search filter updates
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredProducts.length, searchTerm, selectedCat]);

  const handleAdd = (product: Product) => {
    onSelectProduct(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredProducts.length > 0) {
        const targetIdx = selectedIndex >= 0 && selectedIndex < filteredProducts.length ? selectedIndex : 0;
        handleAdd(filteredProducts[targetIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredProducts.length - 1)));
    } else if (e.key === 'Delete') {
      // حماية صارمة: منع حذف أي صنف من السلة نهائياً أثناء فتح نافذة البحث
      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
      }
    } else if (e.key === 'Backspace') {
      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
      }
    } else if (e.key.startsWith('F') && e.key !== 'F10') {
      // إيقاف وتجميد كافة مفاتيح الوظائف F1-F12 في الخلفية (دفع، تفريغ، إلخ)
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div
        className="w-full max-w-4xl max-h-[85vh] bg-[#e6ecf2] border-2 border-[#54606e] rounded-lg shadow-2xl flex flex-col overflow-hidden text-black font-sans"
        dir="rtl"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-4 py-2.5 bg-gradient-to-b from-[#e3e8ee] to-[#cad3de] border-b border-[#9ba8b7] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded d7-glossy-action-tile flex items-center justify-center text-teal-800">
              <Search className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-black flex items-center gap-2">
                <span>بحث واستعراض السلع والمواد</span>
                <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-900 border border-teal-400 px-1.5 py-0.5 rounded">
                  F10
                </span>
                <span
                  className={`text-[10px] font-black border px-1.5 py-0.5 rounded ${
                    priceTier === '3'
                      ? 'bg-purple-100 text-purple-950 border-purple-400'
                      : priceTier === '2'
                      ? 'bg-amber-100 text-amber-950 border-amber-400'
                      : priceTier === '4'
                      ? 'bg-blue-100 text-blue-950 border-blue-400'
                      : 'bg-emerald-100 text-emerald-950 border-emerald-400'
                  }`}
                >
                  فئة السعر: س{priceTier} ({priceTier === '3' ? 'جملة' : priceTier === '2' ? 'نصف جملة' : priceTier === '4' ? 'خاص' : 'تجزئة'})
                </span>
              </h3>
              <p className="text-[11px] text-black font-semibold">
                ابحث بالاسم أو الباركود وأضف السلع مباشرة إلى الفاتورة النشطة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded d7-glossy-top-btn text-black hover:text-rose-700 flex items-center justify-center cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-[#dbe5ee] border-b border-[#b4c3d2] flex flex-col gap-2.5">
          <div className="relative w-full">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب اسم السلعة أو امسح الباركود للبحث..."
              className="w-full h-10 bg-white border border-[#9ba8b7] focus:border-teal-600 rounded-md pl-10 pr-10 text-xs text-black placeholder-slate-500 focus:outline-hidden font-bold shadow-inner"
            />
            <Search className="w-4 h-4 text-black absolute right-3 top-3 pointer-events-none" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-2.5 text-black hover:text-rose-700 p-0.5 cursor-pointer font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedCat('ALL')}
              className={`px-3 py-1 rounded font-black transition-all cursor-pointer whitespace-nowrap text-xs ${
                selectedCat === 'ALL'
                  ? 'd7-pill-gloss-red text-white'
                  : 'bg-white text-black border border-[#9ba8b7] shadow-xs hover:border-teal-500 hover:bg-slate-50'
              }`}
            >
              الكل ({products.length})
            </button>
            {categoryNames.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1 rounded font-black transition-all cursor-pointer whitespace-nowrap text-xs ${
                  selectedCat === cat
                    ? 'd7-pill-gloss-red text-white'
                    : 'bg-white text-black border border-[#9ba8b7] shadow-xs hover:border-teal-500 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1 p-3 overflow-y-auto max-h-[50vh] bg-white">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Package className="w-12 h-12 stroke-[1.5]" />
              <p className="font-bold text-xs text-black">لم يتم العثور على سلع مطابقة للبحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredProducts.map((p, idx) => {
                const isRecentlyAdded = addedId === p.id;
                const isSelected = selectedIndex === idx;
                const price = getProductTierPrice(p, priceTier || '1');
                const stock = p.quantity ?? 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedIndex(idx);
                      handleAdd(p);
                    }}
                    className={`bg-white rounded-lg p-2.5 flex flex-col justify-between gap-2 cursor-pointer transition-all border shadow-xs ${
                      isRecentlyAdded
                        ? 'border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50'
                        : isSelected
                        ? 'border-teal-500 ring-2 ring-teal-400 bg-teal-50'
                        : 'border-[#9ba8b7] hover:border-teal-500 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-black text-xs text-black line-clamp-2 leading-tight">
                          {p.name}
                        </span>
                        {isRecentlyAdded ? (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded d7-glossy-action-tile flex items-center justify-center text-black shrink-0">
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      {p.barcode && (
                        <span className="text-[10px] font-mono font-bold text-slate-600 block mt-1">
                          {p.barcode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-300">
                      <span className="text-[10px] text-slate-700 font-bold">
                        المخزون: <b className={stock <= 0 ? 'text-rose-600' : 'text-emerald-600 font-black'}>{stock}</b>
                      </span>
                      <span className="font-black text-xs text-amber-700 font-mono">
                        {formatMoney(price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#dbe5ee] border-t border-[#b4c3d2] flex items-center justify-between text-xs text-black font-bold gap-2">
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <span>السلع المعروضة: <b className="font-black">{filteredProducts.length}</b></span>
            <span className="text-[10px] bg-teal-100/90 text-teal-950 border border-teal-300 px-2 py-0.5 rounded font-mono font-bold hidden sm:inline truncate">
              Enter للإضافة بالسلة • الأسهم ↑↓ للتنقل • Esc للإغلاق
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="d7-glossy-top-btn px-4 py-1.5 rounded font-black text-black cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
