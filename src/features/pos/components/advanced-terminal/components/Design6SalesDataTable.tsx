import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, Check, X, Edit3 } from 'lucide-react';
import type { CartItem, Product } from '@/types';

export interface Design6SalesDataTableProps {
  cart: CartItem[];
  products?: Product[];
  selectedCartRowId: string | null;
  setSelectedCartRowId: (id: string | null) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  formatMoney: (amount?: number) => string;
  currency?: string;
  tvaRate?: number;
  tvaAmount?: number;
  onOpenKeypadForQty?: (item: CartItem) => void;
  editingPriceItemId?: string | null;
  setEditingPriceItemId?: (id: string | null) => void;
  onEditPrice?: (productId: string, newPrice: number) => void;
}

export const Design6SalesDataTable: React.FC<Design6SalesDataTableProps> = ({
  cart,
  products = [],
  selectedCartRowId,
  setSelectedCartRowId,
  onUpdateQty,
  onRemoveFromCart,
  formatMoney,
  currency = 'دج',
  tvaRate = 19,
  tvaAmount,
  onOpenKeypadForQty,
  editingPriceItemId,
  setEditingPriceItemId,
  onEditPrice,
}) => {
  const [editingPriceVal, setEditingPriceVal] = useState<string>('');

  useEffect(() => {
    if (editingPriceItemId) {
      const item = cart.find((i) => i.productId === editingPriceItemId);
      if (item) {
        setEditingPriceVal(String(item.unitPrice));
      }
    }
  }, [editingPriceItemId, cart]);
  const minRows = 7;
  const totalUnits = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const rowsCount = cart.length;

  // Calculate TVA if not provided
  const calculatedTva =
    tvaAmount !== undefined
      ? tvaAmount
      : cart.reduce((sum, item) => {
          const line = item.lineTotal || item.unitPrice * item.qty;
          return sum + (line * (tvaRate / 100)) / (1 + tvaRate / 100);
        }, 0);

  const emptyRowsNeeded = Math.max(0, minRows - cart.length);
  const emptyRows = Array.from({ length: emptyRowsNeeded }, (_, i) => cart.length + i + 1);

  return (
    <div className="flex-1 bg-white dark:bg-[#060a14] flex flex-col justify-between overflow-hidden border-b border-slate-200 dark:border-slate-800 select-none transition-colors">
      {/* Table Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-right border-collapse text-xs table-fixed">
          {/* Column Sizing Definition */}
          <colgroup>
            <col className="w-12" />
            <col className="w-28 sm:w-32" />
            <col className="w-auto" />
            <col className="w-24 sm:w-28" />
            <col className="w-32" />
            <col className="w-28 sm:w-32" />
            <col className="w-14" />
          </colgroup>

          {/* Table Header: Natural RTL Order (Right to Left) */}
          <thead className="bg-slate-100 dark:bg-[#0b1222] border-b-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10 text-[11px] select-none transition-colors">
            <tr>
              <th className="py-2.5 px-2 text-center font-mono">#</th>
              <th className="py-2.5 px-3 font-mono text-center">الرمز / الباركود</th>
              <th className="py-2.5 px-4 text-right">اسم المنتج / البيان</th>
              <th className="py-2.5 px-3 text-left font-mono">سعر الوحدة</th>
              <th className="py-2.5 px-2 text-center font-mono">الكمية</th>
              <th className="py-2.5 px-4 text-left font-mono">المجموع ({currency})</th>
              <th className="py-2.5 px-2 text-center">حذف</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-150 dark:divide-slate-800/70 font-sans">
            {/* 1. Actual Cart Items */}
            {cart.map((item, index) => {
              const rowNum = String(index + 1).padStart(2, '0');
              const isSelected = selectedCartRowId === item.productId;
              const hasDiscount = (item.discount && item.discount > 0) || Boolean((item as any).isOffer);

              // Resolve product from props if item.barcode is missing
              const matchedProduct = products.find(
                (p) =>
                  p.id === item.productId ||
                  (item.isPack && (p.id === item.packId || `pack-${p.id}` === item.productId)) ||
                  (p.name && item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
              );

              const barcodeVal =
                item.barcode ||
                matchedProduct?.barcode ||
                (item as any).sku ||
                matchedProduct?.sku ||
                '---';

              return (
                <tr
                  key={item.productId || index}
                  onClick={() => setSelectedCartRowId(item.productId)}
                  className={`cursor-pointer transition-colors group ${
                    isSelected
                      ? 'bg-cyan-50/90 dark:bg-cyan-950/40 border-r-4 border-cyan-500 shadow-inner'
                      : index % 2 === 0
                      ? 'bg-white dark:bg-[#070b16] hover:bg-slate-50 dark:hover:bg-[#0c1426]'
                      : 'bg-slate-50/60 dark:bg-[#090f1e] hover:bg-slate-50 dark:hover:bg-[#0c1426]'
                  }`}
                >
                  {/* 1. Row Number (#) */}
                  <td className="py-2.5 px-2 text-center font-mono text-slate-500 dark:text-slate-400 font-bold text-xs">
                    <span className="inline-block min-w-[22px] py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                      {rowNum}
                    </span>
                  </td>

                  {/* 2. Barcode / SKU */}
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                    <span
                      dir="ltr"
                      title={barcodeVal !== '---' ? barcodeVal : 'بدون باركود'}
                      className="inline-block truncate max-w-[110px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold select-all"
                    >
                      {barcodeVal}
                    </span>
                  </td>

                  {/* 3. Product Designation & Badges */}
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-start gap-2">
                      {hasDiscount && (
                        <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs shrink-0">
                          عرض خاص
                        </span>
                      )}
                      {(item as any).isPack && (
                        <span className="bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
                          ×{(item as any).packQty || 1}
                        </span>
                      )}
                      <span className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </span>
                    </div>
                  </td>

                  {/* 4. Unit Price (مع دعم التعديل المباشر F4) */}
                  <td className="py-2 px-3 text-left font-mono font-bold" onClick={(e) => e.stopPropagation()}>
                    {editingPriceItemId === item.productId ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          autoFocus
                          value={editingPriceVal}
                          onChange={(e) => setEditingPriceVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const newP = parseFloat(editingPriceVal);
                              if (!isNaN(newP) && newP >= 0 && onEditPrice) {
                                onEditPrice(item.productId, newP);
                              }
                              setEditingPriceItemId?.(null);
                            } else if (e.key === 'Escape') {
                              setEditingPriceItemId?.(null);
                            }
                          }}
                          className="w-20 px-1.5 py-0.5 bg-white dark:bg-[#0e172a] border-2 border-cyan-500 rounded text-cyan-800 dark:text-cyan-300 font-mono text-xs font-bold focus:outline-hidden shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newP = parseFloat(editingPriceVal);
                            if (!isNaN(newP) && newP >= 0 && onEditPrice) {
                              onEditPrice(item.productId, newP);
                            }
                            setEditingPriceItemId?.(null);
                          }}
                          className="w-6 h-6 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded flex items-center justify-center cursor-pointer shadow-xs"
                          title="تأكيد السعر (Enter)"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPriceItemId?.(null)}
                          className="w-6 h-6 bg-slate-200 hover:bg-rose-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:hover:bg-rose-700 dark:text-slate-300 active:scale-95 rounded flex items-center justify-center cursor-pointer shadow-xs"
                          title="إلغاء (Esc)"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          if (onEditPrice && setEditingPriceItemId) {
                            setSelectedCartRowId(item.productId);
                            setEditingPriceItemId(item.productId);
                            setEditingPriceVal(String(item.unitPrice));
                          }
                        }}
                        className="cursor-pointer group/price flex items-center gap-1 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors py-1 px-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 inline-flex"
                        title="انقر لتعديل السعر المباشر (F4)"
                      >
                        <span className="text-slate-800 dark:text-slate-200 group-hover/price:text-cyan-600 dark:group-hover/price:text-cyan-300 font-mono font-bold text-xs sm:text-[13px]">
                          {formatMoney(item.unitPrice)}
                        </span>
                        <Edit3 className="w-3 h-3 opacity-0 group-hover/price:opacity-100 text-cyan-600 dark:text-cyan-400 transition-opacity shrink-0" />
                      </div>
                    )}
                  </td>

                  {/* 5. Quantity with Direct Touch Buttons (+ / -) */}
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Decrease (-) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.qty > 1) {
                            onUpdateQty(item.productId, item.qty - 1);
                          } else {
                            onRemoveFromCart(item.productId);
                          }
                        }}
                        className="w-7 h-7 bg-slate-100 hover:bg-rose-600 text-slate-700 hover:text-white dark:bg-slate-800/90 dark:hover:bg-rose-600 dark:text-slate-200 dark:hover:text-white active:scale-90 rounded-md flex items-center justify-center font-bold text-sm transition-colors border border-slate-300 dark:border-slate-700/80 cursor-pointer shadow-xs"
                        title={item.qty > 1 ? 'إنقاص الكمية (-1)' : 'حذف الصنف'}
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      {/* Numeric Quantity Display / Keypad trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenKeypadForQty) {
                            onOpenKeypadForQty(item);
                          }
                        }}
                        className="min-w-[34px] h-7 px-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-[#0b1222] dark:hover:bg-slate-800 active:scale-95 border border-amber-400/80 hover:border-amber-500 rounded-md font-mono font-black text-amber-700 dark:text-amber-400 text-sm flex items-center justify-center transition-colors cursor-pointer"
                        title="انقر لتعديل الكمية"
                      >
                        {item.qty}
                      </button>

                      {/* Increase (+) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateQty(item.productId, item.qty + 1);
                        }}
                        className="w-7 h-7 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white dark:bg-slate-800/90 dark:hover:bg-blue-600 dark:text-slate-200 dark:hover:text-white active:scale-90 rounded-md flex items-center justify-center font-bold text-sm transition-colors border border-slate-300 dark:border-slate-700/80 cursor-pointer shadow-xs"
                        title="زيادة الكمية (+1)"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </td>

                  {/* 6. Line Total */}
                  <td className="py-2.5 px-4 text-left font-mono font-black text-cyan-700 dark:text-cyan-400 text-sm sm:text-[15px]">
                    {formatMoney(item.lineTotal || item.unitPrice * item.qty)}
                  </td>

                  {/* 7. Delete Button (Leftmost in RTL) */}
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromCart(item.productId);
                      }}
                      className="w-8 h-8 mx-auto text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-600 dark:text-rose-400 dark:bg-rose-950/30 dark:hover:bg-rose-600 active:scale-90 rounded-lg flex items-center justify-center transition-all cursor-pointer border border-rose-200 dark:border-rose-900/40 shadow-2xs"
                      title="حذف الصنف من السلة (Del)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* 2. Empty Placeholder Rows (Matching exact same column order) */}
            {emptyRows.map((num, i) => {
              const rowNum = String(num).padStart(2, '0');
              return (
                <tr key={`empty-${num}`} className="opacity-40 select-none">
                  {/* Col 1: # */}
                  <td className="py-2 px-2 text-center font-mono text-slate-400 dark:text-slate-600 font-bold text-xs">
                    {rowNum}
                  </td>
                  {/* Col 2: Barcode */}
                  <td className="py-2 px-3 text-center font-mono text-slate-400 dark:text-slate-600 text-[11px]">
                    ---
                  </td>
                  {/* Col 3: Product Name */}
                  <td className="py-2 px-4 text-right text-slate-500 dark:text-slate-600 italic text-xs">
                    {i < 2 ? 'في انتظار إدخال المادة...' : ''}
                  </td>
                  {/* Col 4: Unit Price */}
                  <td className="py-2 px-3 text-left font-mono text-slate-400 dark:text-slate-600 text-xs">
                    0.00
                  </td>
                  {/* Col 5: Qty */}
                  <td className="py-2 px-2 text-center font-mono text-slate-400 dark:text-slate-600 text-xs">
                    0
                  </td>
                  {/* Col 6: Line Total */}
                  <td className="py-2 px-4 text-left font-mono text-slate-400 dark:text-slate-600 text-xs">
                    0.00
                  </td>
                  {/* Col 7: Delete */}
                  <td className="py-2 px-2 text-center text-slate-400 dark:text-slate-700"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Summary Bar */}
      <div className="w-full bg-slate-100 dark:bg-[#0b1222] border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors">
        {/* Left: TVA Calculation */}
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-slate-500 dark:text-slate-400 font-sans">الرسم على القيمة المضافة {tvaRate}%:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {currency} {calculatedTva.toFixed(2)}
          </span>
        </div>

        {/* Right: Items Count & Units Count */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">إجمالي القطع:</span>
            <span className="font-mono text-amber-700 dark:text-amber-400 font-black text-sm bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700/50">
              {totalUnits}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">عدد الأسطر:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-bold bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
              {rowsCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

