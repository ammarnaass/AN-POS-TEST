import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ScanLine, Plus, Tag } from 'lucide-react';
import type { Product } from '@/types';

export interface Design6BarcodeScannerBarProps {
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  pendingQty: number;
  setPendingQty: (qty: number) => void;
  onOpenPriceEdit?: () => void;
  quantityInputRef?: React.RefObject<HTMLInputElement | null>;
  barcodeInputRef?: React.RefObject<HTMLInputElement | null>;
  products?: Product[];
  onSelectProduct?: (product: Product, qty: number) => void;
  onOpenAddProduct?: () => void;
  onSettleSale?: () => void;
  cartCount?: number;
  formatMoney?: (val?: number) => string;
  currency?: string;
}

export const Design6BarcodeScannerBar: React.FC<Design6BarcodeScannerBarProps> = ({
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  pendingQty,
  setPendingQty,
  onOpenPriceEdit,
  quantityInputRef,
  barcodeInputRef,
  products = [],
  onSelectProduct,
  onOpenAddProduct,
  onSettleSale,
  cartCount = 0,
  formatMoney,
  currency = 'دج',
}) => {
  const localBarcodeInputRef = useRef<HTMLInputElement>(null);
  const activeBarcodeRef = barcodeInputRef || localBarcodeInputRef;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  useEffect(() => {
    // Keep focus on barcode input
    activeBarcodeRef.current?.focus();
  }, [activeBarcodeRef]);

  // Filter matching suggestions as user types
  const matchingSuggestions = useMemo(() => {
    const q = barcodeInput.trim().toLowerCase();
    if (!q || q.length < 1 || !products || products.length === 0) return [];
    return products
      .filter((p) => {
        if (p.status === 'inactive') return false;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);
  }, [barcodeInput, products]);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (product: Product) => {
    if (onSelectProduct) {
      onSelectProduct(product, pendingQty);
    }
    setBarcodeInput('');
    setIsSuggestionsOpen(false);
    setHighlightedIndex(-1);
    activeBarcodeRef.current?.focus();
  };

  const handleAddAction = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = barcodeInput.trim();
    if (!query) {
      // Empty input -> Proceed to payment if cart has items, or open Add Product modal
      if (cartCount > 0 && onSettleSale) {
        onSettleSale();
        return;
      }
      if (onOpenAddProduct) {
        onOpenAddProduct();
      }
      return;
    }

    // If a suggestion is highlighted via arrow keys, select it
    if (highlightedIndex >= 0 && matchingSuggestions[highlightedIndex]) {
      handleSelectSuggestion(matchingSuggestions[highlightedIndex]);
      return;
    }

    // Check if there is an exact or first matching product in memory
    const exact = products.find(
      (p) =>
        (p.barcode && p.barcode.trim() === query) ||
        (p.sku && p.sku.trim() === query) ||
        p.name.toLowerCase().trim() === query.toLowerCase()
    );

    if (exact) {
      handleSelectSuggestion(exact);
      return;
    }

    if (matchingSuggestions.length > 0) {
      handleSelectSuggestion(matchingSuggestions[0]);
      return;
    }

    // Fallback to barcode submission (IndexedDB / Server barcode scanner)
    onBarcodeSubmit(e);
    setIsSuggestionsOpen(false);
  };

  return (
    <form
      onSubmit={handleAddAction}
      className="w-full bg-slate-50 dark:bg-[#070b14] p-2 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 select-none relative transition-colors"
    >
      {/* 1. Add Button (+ إضافة) */}
      <button
        type="button"
        onClick={() => {
          if (barcodeInput.trim()) {
            handleAddAction();
          } else if (onOpenAddProduct) {
            onOpenAddProduct();
          }
        }}
        className="h-11 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 text-xs border border-blue-400/40"
        title={barcodeInput.trim() ? 'إضافة المادة المحددة إلى السلة' : 'إضافة منتج جديد للمحل'}
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>إضافة</span>
      </button>

      {/* 2. Price Shortcut Button ([F4 السعر]) */}
      <button
        type="button"
        onClick={onOpenPriceEdit}
        className="h-11 px-3 bg-white hover:bg-slate-100 text-slate-700 dark:bg-[#1e293b] dark:hover:bg-[#334155] dark:text-slate-200 active:scale-95 rounded-lg border border-slate-300 dark:border-slate-700/80 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-xs"
        title="تعديل سعر الصنف المحدد في السلة (F4)"
      >
        <Tag className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        <span>F4 السعر</span>
      </button>

      {/* 3. Barcode & Search Input Bar with Floating Live Suggestions */}
      <div ref={containerRef} className="flex-1 relative flex items-center">
        <input
          ref={activeBarcodeRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={barcodeInput}
          onChange={(e) => {
            setBarcodeInput(e.target.value);
            setIsSuggestionsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (barcodeInput.trim().length >= 1) setIsSuggestionsOpen(true);
          }}
          onKeyDown={(e) => {
            if (isSuggestionsOpen && matchingSuggestions.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  prev < matchingSuggestions.length - 1 ? prev + 1 : 0
                );
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  prev > 0 ? prev - 1 : matchingSuggestions.length - 1
                );
              } else if (e.key === 'Escape') {
                setIsSuggestionsOpen(false);
              } else if (e.key === 'Enter') {
                if (highlightedIndex >= 0) {
                  e.preventDefault();
                  handleSelectSuggestion(matchingSuggestions[highlightedIndex]);
                }
              }
            }
          }}
          placeholder="مسح الباركود أو ادخل اسم السلعة..."
          className="w-full h-11 bg-white dark:bg-[#0c1220] border-2 border-slate-300 dark:border-slate-700/80 focus:border-cyan-500 rounded-lg pl-3 pr-10 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden font-medium transition-all shadow-xs dark:shadow-inner"
        />
        <div className="absolute right-3 flex items-center pointer-events-none text-slate-400">
          <ScanLine className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        </div>

        {/* Live Search Suggestions Dropdown */}
        {isSuggestionsOpen && matchingSuggestions.length > 0 && (
          <div className="absolute top-full right-0 left-0 mt-1.5 bg-white dark:bg-[#070d1a] border border-cyan-500/50 rounded-xl shadow-xl dark:shadow-[0_10px_25px_rgba(0,0,0,0.85)] z-50 overflow-hidden max-h-72 overflow-y-auto custom-scrollbar">
            <div className="px-3 py-1.5 bg-slate-100 dark:bg-[#0b1324] border-b border-slate-200 dark:border-slate-800 text-[10px] text-cyan-700 dark:text-cyan-400 font-bold flex items-center justify-between">
              <span>نتائج البحث الفوري ({matchingSuggestions.length})</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[9px]">انقر أو اضغط Enter للإضافة</span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {matchingSuggestions.map((item, idx) => {
                const isSelected = idx === highlightedIndex;
                const price = item.retailPrice ?? (item as any).price ?? 0;
                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelectSuggestion(item)}
                    className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected ? 'bg-cyan-50 dark:bg-cyan-950/80 border-r-4 border-cyan-500 dark:border-cyan-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {item.barcode && <span dir="ltr">{item.barcode}</span>}
                        {item.category && <span className="text-teal-600 dark:text-teal-400">{item.category}</span>}
                        <span className={(item.quantity ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          المخزون: {item.quantity ?? 0}
                        </span>
                      </div>
                    </div>
                    <div className="text-left font-mono shrink-0">
                      <span className="font-bold text-xs text-cyan-700 dark:text-cyan-300">
                        {formatMoney ? formatMoney(price) : price.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 mr-1">{currency}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Quantity Input ([F3 الكمية]) */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#0c1220] border-2 border-[#f59e0b]/80 rounded-lg px-2.5 h-11 shrink-0 shadow-xs dark:shadow-none">
        <input
          ref={quantityInputRef as React.RefObject<HTMLInputElement>}
          type="number"
          min="1"
          step="1"
          value={pendingQty}
          onChange={(e) => setPendingQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-12 bg-transparent text-center font-mono font-black text-sm text-[#f59e0b] focus:outline-hidden"
          title="الكمية قبل المسح (F3)"
        />
        <div className="text-right border-r border-slate-300 dark:border-slate-700/80 pr-2">
          <div className="text-[10px] font-bold text-[#f59e0b] leading-tight">الكمية</div>
          <div className="text-[8px] font-mono text-slate-500 dark:text-slate-400 leading-tight">[F3]</div>
        </div>
      </div>
    </form>
  );
};
