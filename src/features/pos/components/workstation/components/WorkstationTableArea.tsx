import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Filter,
  Barcode,
  Search,
  Trash2,
  Plus,
  Minus,
  Package,
  Pencil,
} from 'lucide-react';
import type { CartItem, Product } from '@/types';
import type { SearchCriteria } from '../types';
import { getProductTierPrice } from '@/services';

interface WorkstationTableAreaProps {
  cart: CartItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onEditPrice?: (productId: string, newPrice: number) => void;
  onOpenCalculator?: (item?: CartItem, mode?: 'price' | 'qty') => void;
  editingPriceFor?: string | null;
  setEditingPriceFor?: (id: string | null) => void;
  priceInput?: string;
  setPriceInput?: (val: string) => void;
  products?: Product[];
  onAddToCart?: (product: Product, customPrice?: number) => void;
  priceTier?: '1' | '2' | '3' | '4';
  searchCriteria: SearchCriteria;
  setSearchCriteria: (criteria: SearchCriteria) => void;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  className?: string;
}

export const WorkstationTableArea: React.FC<WorkstationTableAreaProps> = ({
  cart,
  selectedItemId,
  onSelectItem,
  onUpdateQty,
  onRemoveItem,
  onEditPrice,
  onOpenCalculator,
  editingPriceFor: propEditingPriceFor,
  setEditingPriceFor: propSetEditingPriceFor,
  priceInput: propPriceInput,
  setPriceInput: propSetPriceInput,
  products = [],
  onAddToCart,
  priceTier = '1',
  searchCriteria,
  setSearchCriteria,
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  barcodeInputRef,
  formatMoney,
  currency = 'د.ج',
  className = '',
}) => {
  const [localEditingPriceFor, setLocalEditingPriceFor] = useState<string | null>(null);
  const [localPriceInput, setLocalPriceInput] = useState<string>('');

  const editingPriceFor = propEditingPriceFor !== undefined ? propEditingPriceFor : localEditingPriceFor;
  const setEditingPriceFor = propSetEditingPriceFor || setLocalEditingPriceFor;
  const priceInput = propPriceInput !== undefined ? propPriceInput : localPriceInput;
  const setPriceInput = propSetPriceInput || setLocalPriceInput;

  const [showProfitMargin, setShowProfitMargin] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchFormRef = useRef<HTMLFormElement>(null);

  // Active item
  const activeItem = cart.find((item) => item.productId === selectedItemId) || cart[0] || null;

  const query = (barcodeInput || '').trim().toLowerCase();

  // Filtered search suggestions
  const suggestions = useMemo(() => {
    if (!products || !products.length || !query) return [];

    return products
      .filter((p) => {
        if (p.status === 'inactive') return false;

        const nameLower = (p.name || '').toLowerCase();
        const skuLower = (p.sku || (p as any).reference || (p as any).code || '').toLowerCase();
        const barcodeLower = (p.barcode || '').toLowerCase();

        if (searchCriteria === 'reference') {
          return skuLower.includes(query) || nameLower.includes(query) || barcodeLower === query;
        }

        if (searchCriteria === 'barcode') {
          return barcodeLower.includes(query) || skuLower === query || nameLower.includes(query);
        }

        // default: designation
        return nameLower.includes(query) || skuLower.includes(query) || barcodeLower === query;
      })
      .slice(0, 8);
  }, [products, query, searchCriteria]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length, query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (searchFormRef.current && !searchFormRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Handle select product from suggestions
  const handleSelectProduct = useCallback(
    (product: Product) => {
      if (onAddToCart) {
        onAddToCart(product);
      } else if (product.barcode) {
        setBarcodeInput(product.barcode);
        onBarcodeSubmit();
      }
      setBarcodeInput('');
      setIsDropdownOpen(false);
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 20);
    },
    [onAddToCart, setBarcodeInput, onBarcodeSubmit, barcodeInputRef]
  );

  // Form submit handler (Enter key or button)
  const handleFormSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!barcodeInput.trim()) return;

      // If dropdown is open and we have suggestions, pick the highlighted one
      if (isDropdownOpen && suggestions.length > 0) {
        const target = suggestions[selectedIndex] || suggestions[0];
        handleSelectProduct(target);
        return;
      }

      // If in designation or reference mode, check if exact match exists in products
      if (searchCriteria === 'designation' || searchCriteria === 'reference') {
        const term = barcodeInput.trim().toLowerCase();
        const exactMatch = products.find((p) => {
          if (p.status === 'inactive') return false;
          if (searchCriteria === 'reference') {
            const ref = (p.sku || (p as any).reference || (p as any).code || '').toLowerCase();
            return ref === term;
          }
          return (p.name || '').toLowerCase() === term;
        });

        if (exactMatch) {
          handleSelectProduct(exactMatch);
          return;
        }

        if (suggestions.length > 0) {
          handleSelectProduct(suggestions[0]);
          return;
        }
      }

      // Default fallback to barcode submit (scanner gun or backend search)
      onBarcodeSubmit(e);
      setIsDropdownOpen(false);
    },
    [
      barcodeInput,
      isDropdownOpen,
      suggestions,
      selectedIndex,
      handleSelectProduct,
      searchCriteria,
      products,
      onBarcodeSubmit,
    ]
  );

  // Input key down for arrow navigation and escape
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isDropdownOpen && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsDropdownOpen(false);
          return;
        }
      }
    },
    [isDropdownOpen, suggestions.length]
  );

  return (
    <section
      className={`flex-1 flex flex-col gap-2 min-w-0 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800 overflow-hidden select-none ${className}`}
    >
      {/* Top Search & Barcode Entry Banner with shortcuts */}
      <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 flex-shrink-0 relative z-30">
        {/* Criteria filter */}
        <div className="w-full sm:w-40 md:w-48 flex-shrink-0">
          <div className="relative">
            <select
              value={searchCriteria}
              onChange={(e) => {
                setSearchCriteria(e.target.value as SearchCriteria);
                setIsDropdownOpen(true);
                barcodeInputRef.current?.focus();
              }}
              className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 pr-9 pl-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="designation" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                بحث بالتسمية (Désignation)
              </option>
              <option value="barcode" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                بحث بالباركود (Code Barre)
              </option>
              <option value="reference" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                بحث بالمرجع (Référence)
              </option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <Filter className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Main Product Barcode / Name / Reference Input with F5 and Dropdown */}
        <form
          ref={searchFormRef}
          onSubmit={handleFormSubmit}
          className="flex-1 min-w-[200px] relative"
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-blue-600 dark:text-blue-400">
            <Barcode className="w-4 h-4" />
          </div>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => {
              setBarcodeInput(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (barcodeInput.trim().length > 0) {
                setIsDropdownOpen(true);
              }
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={
              searchCriteria === 'barcode'
                ? 'امسح الباركود للقراءة الفورية...'
                : searchCriteria === 'reference'
                ? 'اكتب مرجع المادة (Référence)...'
                : 'اكتب اسم المادة أو امسح الباركود للبحث الفوري...'
            }
            className="w-full bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-sm font-semibold rounded-lg pr-10 pl-24 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition shadow-inner outline-hidden"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 gap-1.5">
            <span className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs px-2 py-0.5 rounded shadow-2xs">
              F5 بحث
            </span>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-md w-7 h-7 flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-90"
              title="بحث"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Instant Autocomplete Suggestions Floating Dropdown */}
          {isDropdownOpen && query.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <span>
                  نتائج البحث ({suggestions.length}) - اضغط Enter للإضافة المباشرة
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  ↑↓ للتنقل | Esc للإغلاق
                </span>
              </div>

              {suggestions.length > 0 ? (
                suggestions.map((p, idx) => {
                  const isHighlighted = idx === selectedIndex;
                  const tierPrice = getProductTierPrice(p, priceTier);
                  const stock = Number(p.quantity ?? 0);
                  const sku = p.sku || (p as any).reference || (p as any).code || '';

                  return (
                    <div
                      key={p.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => handleSelectProduct(p)}
                      className={`px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-blue-50/90 dark:bg-blue-950/60 border-r-4 border-blue-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {p.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {sku && (
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                Réf: {sku}
                              </span>
                            )}
                            {p.barcode && <span>باركود: {p.barcode}</span>}
                            <span
                              className={
                                stock > 5
                                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                  : stock > 0
                                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                                  : 'text-rose-600 dark:text-rose-400 font-bold'
                              }
                            >
                              المتوفر: {stock}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatMoney(tierPrice)} {currency}
                        </div>
                        {isHighlighted && (
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                            [Enter ↵]
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-semibold">لم يُعثر على منتج مطابق</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    جرب البحث بتسمية أخرى أو تأكد من مرجع المادة
                  </p>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Cart items count badge */}
        <div className="flex items-center gap-2 bg-slate-200/70 dark:bg-slate-800 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
          <span className="hidden sm:inline">عدد المواد في السلة:</span>
          <span className="sm:hidden">السلة:</span>
          <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
            {cart.length}
          </span>
        </div>
      </div>

      {/* Current Sales Items Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-2 sm:px-3 min-h-[160px] custom-scrollbar">
        <table className="w-full text-right border-collapse min-w-[500px] sm:min-w-full">
          <thead>
            <tr className="text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
              <th className="py-2.5 px-2 sm:px-3 rounded-r-lg hidden md:table-cell">#</th>
              <th className="py-2.5 px-2 sm:px-3 hidden lg:table-cell">المرجع (Réf)</th>
              <th className="py-2.5 px-3 sm:px-4 w-auto sm:w-2/5">التسمية / اسم المنتج (Désignation)</th>
              <th className="py-2.5 px-2 sm:px-3 text-center">الكمية (Qté)</th>
              <th className="py-2.5 px-2 sm:px-3 text-left hidden sm:table-cell">سعر البيع (P.Vente)</th>
              <th className="py-2.5 px-2 sm:px-3 text-left">المبلغ (Montant)</th>
              {showProfitMargin && (
                <th className="py-2.5 px-2 sm:px-3 text-center text-emerald-600 dark:text-emerald-400 hidden xl:table-cell">
                  الهامش
                </th>
              )}
              <th className="py-2.5 px-2 sm:px-3 text-center rounded-l-lg">إجراء</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {cart.map((item, idx) => {
              const isSelected =
                selectedItemId === item.productId || (!selectedItemId && idx === 0);
              const unitPrice = item.unitPrice ?? (item as any).price ?? 0;
              const lineTotal = item.lineTotal ?? (unitPrice * item.qty);
              const ref = (item as any).reference || (item as any).product?.sku || `REF-${item.productId.slice(0, 5)}`;
              const barcode = (item as any).barcode || (item as any).product?.barcode || '';
              const costPrice = (item as any).costPrice || (item as any).cost || (item as any).product?.costPrice || (item as any).product?.buyPrice || 0;
              const margin = costPrice > 0 ? ((unitPrice - costPrice) * item.qty) : 0;

              return (
                <tr
                  key={item.productId}
                  onClick={() => onSelectItem(item.productId)}
                  className={`transition-colors group cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-50 dark:hover:bg-blue-950/60 border-r-4 border-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <td className="py-2.5 px-2 sm:px-3 font-mono text-xs text-blue-700 dark:text-blue-400 font-bold hidden md:table-cell">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-2 sm:px-3 font-mono text-xs text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                    {ref}
                  </td>
                  <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800 dark:text-slate-100">
                    <span>{item.name}</span>
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 font-normal font-mono mt-0.5">
                      <span className="lg:hidden">{ref}</span>
                      {barcode && <span>• باركود: {barcode}</span>}
                      <span className="sm:hidden text-blue-600 dark:text-blue-400 font-bold">• {formatMoney(unitPrice)} {currency}</span>
                    </div>
                  </td>

                  {/* Interactive Inline Quantity Controls */}
                  <td className="py-2.5 px-2 sm:px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-2xs overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.qty > 1) {
                            onUpdateQty(item.productId, item.qty - 1);
                          } else {
                            onRemoveItem(item.productId);
                          }
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-700 dark:hover:text-rose-300 text-slate-600 dark:text-slate-300 transition text-xs font-bold cursor-pointer active:scale-90"
                        title="إنقاص"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span
                        className={`font-mono font-extrabold text-blue-700 dark:text-blue-300 px-2 sm:px-3 py-0.5 text-xs sm:text-sm ${
                          onOpenCalculator ? 'hover:underline cursor-pointer' : ''
                        }`}
                        onClick={(e) => {
                          if (onOpenCalculator) {
                            e.stopPropagation();
                            onSelectItem(item.productId);
                            onOpenCalculator(item, 'qty');
                          }
                        }}
                        title={onOpenCalculator ? 'انقر لتعديل الكمية بواسطة الآلة الحاسبة' : undefined}
                      >
                        {Number.isInteger(item.qty) ? item.qty : Number(item.qty.toFixed(2))}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 transition text-xs font-bold cursor-pointer active:scale-90"
                        title="زيادة"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  {editingPriceFor === item.productId && onEditPrice ? (
                    <td className="py-1.5 px-2 sm:px-3 text-left hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const newP = parseFloat(priceInput);
                              if (!isNaN(newP) && newP >= 0) {
                                onEditPrice(item.productId, newP);
                              }
                              setEditingPriceFor(null);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingPriceFor(null);
                            }
                          }}
                          onBlur={() => {
                            const newP = parseFloat(priceInput);
                            if (!isNaN(newP) && newP >= 0) {
                              onEditPrice(item.productId, newP);
                            }
                            setEditingPriceFor(null);
                          }}
                          autoFocus
                          className="w-24 px-2 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-800 border-2 border-blue-500 rounded text-slate-800 dark:text-slate-100 outline-none shadow-xs"
                        />
                        <span className="text-[10px] text-slate-400 font-mono">↵</span>
                      </div>
                    </td>
                  ) : (
                    <td
                      className={`py-2.5 px-2 sm:px-3 text-left font-mono font-semibold text-slate-700 dark:text-slate-300 hidden sm:table-cell ${
                        onOpenCalculator || onEditPrice ? 'hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer group/price' : ''
                      }`}
                      onClick={(e) => {
                        if (onOpenCalculator) {
                          e.stopPropagation();
                          onSelectItem(item.productId);
                          onOpenCalculator(item, 'price');
                        } else if (onEditPrice) {
                          e.stopPropagation();
                          onSelectItem(item.productId);
                          setEditingPriceFor(item.productId);
                          setPriceInput(String(unitPrice));
                        }
                      }}
                      title={onOpenCalculator ? 'انقر لتعديل السعر بالآلة الحاسبة أو اضغط F4' : onEditPrice ? 'انقر لتعديل السعر المباشر أو اضغط F4' : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span>{formatMoney(unitPrice)}</span>
                        {(onOpenCalculator || onEditPrice) && (
                          <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover/price:opacity-100 transition-opacity" />
                        )}
                      </span>
                    </td>
                  )}
                  <td className="py-2.5 px-2 sm:px-3 text-left font-mono font-bold text-blue-800 dark:text-blue-300 text-sm sm:text-base">
                    {formatMoney(lineTotal)}
                  </td>

                  {showProfitMargin && (
                    <td className="py-2.5 px-2 sm:px-3 text-center font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold hidden xl:table-cell">
                      +{formatMoney(margin)}
                    </td>
                  )}

                  <td className="py-2.5 px-2 sm:px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.productId)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer active:scale-90"
                      title="حذف السطر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Empty or Guide row */}
            <tr className="h-12 border-dashed border-b border-slate-200 dark:border-slate-800">
              <td
                className="text-center text-xs text-slate-400 dark:text-slate-500 py-3"
                colSpan={showProfitMargin ? 8 : 7}
              >
                <span className="inline-flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  -- مساحة لإضافة منتج جديد بواسطة قارئ الباركود أو الضغط على F5 --
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Quick Action Active Row Status Strip */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs flex-shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-semibold">
            المادة النشطة المحددة:
          </span>
          {activeItem ? (
            <>
              <span className="font-bold text-blue-900 dark:text-blue-200 bg-blue-100/60 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                {activeItem.name}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                ({(activeItem as any).reference || (activeItem as any).product?.sku || `REF-${activeItem.productId.slice(0, 5)}`})
              </span>
            </>
          ) : (
            <span className="text-slate-400 italic">لا توجد مواد محددة</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 text-xs">
            <input
              type="checkbox"
              checked={showProfitMargin}
              onChange={(e) => setShowProfitMargin(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-blue-500 cursor-pointer"
            />
            <span>إظهار هامش الفائدة للسطر</span>
          </label>
          <span className="text-slate-400 text-[11px] hidden md:inline">
            استخدم مفاتيح [+] أو [-] لتعديل الكميات مباشرة
          </span>
        </div>
      </div>
    </section>
  );
};
