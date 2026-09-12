import React from 'react';
import { ScanLine, Plus, Minus, Trash2 } from 'lucide-react';
import type { CartItem, Product } from '@/types';
import { getProductTierPrice } from '@/services';

export interface TerminalPOSCartTableProps {
  displayCart: CartItem[];
  cartLength: number;
  tableSearchBarcode?: string;
  setTableSearchBarcode?: (val: string) => void;
  selectedCartRowId: string | null;
  setSelectedCartRowId: (id: string | null) => void;
  allProducts?: Product[];
  products: Product[];
  onEditPrice?: (productId: string, newPrice: number) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onOpenKeypadForQty?: (item: CartItem) => void;
  formatMoney: (amount?: number) => string;
  formattedDate: string;
  invoiceFormattedNumber: string | number;
  totalUnitsCount: number;
  editingPriceItemId: string | null;
  setEditingPriceItemId: (id: string | null) => void;
  customPriceInput: string;
  setCustomPriceInput: (val: string) => void;
}

export const TerminalPOSCartTable: React.FC<TerminalPOSCartTableProps> = ({
  displayCart,
  cartLength,
  tableSearchBarcode = '',
  setTableSearchBarcode,
  selectedCartRowId,
  setSelectedCartRowId,
  allProducts,
  products,
  onEditPrice,
  onUpdateQty,
  onRemoveFromCart,
  onOpenKeypadForQty,
  formatMoney,
  formattedDate,
  invoiceFormattedNumber,
  totalUnitsCount,
  editingPriceItemId,
  setEditingPriceItemId,
  customPriceInput,
  setCustomPriceInput,
}) => {
  return (
    <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col relative overflow-hidden min-h-[140px]">
      {/* باركود رأس الجدول وعنوان الوصل */}
      <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span>فاتورة البيع الحالية</span>
          <span className="text-[11px] text-slate-400 font-normal">| قائمة السلع الممسوحة ({cartLength} أصناف)</span>
        </div>

        {/* شريط بحث بالباركود داخل الجدول */}
        {setTableSearchBarcode && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-0.5 text-xs shadow-2xs">
              <ScanLine className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              <span className="text-slate-500 font-medium ml-1 text-[11px] hidden sm:inline">بحث بالسلة:</span>
              <input
                type="text"
                value={tableSearchBarcode}
                onChange={(e) => setTableSearchBarcode(e.target.value)}
                placeholder="000000..."
                className="border-0 p-0 text-xs w-28 focus:ring-0 placeholder-slate-300 dark:bg-slate-900 font-mono text-slate-800 dark:text-slate-200"
              />
              {tableSearchBarcode && (
                <button
                  type="button"
                  onClick={() => setTableSearchBarcode('')}
                  className="text-slate-400 hover:text-slate-600 text-xs mr-1 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-right border-collapse select-none">
          <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs sticky top-0 z-10">
            <tr>
              <th className="py-2 px-3 text-center w-10">#</th>
              <th className="py-2 px-3">التعيين (اسم السلعة)</th>
              <th className="py-2 px-3 font-mono">الباركود</th>
              <th className="py-2 px-3 text-center w-36">الكمية (+/-)</th>
              <th className="py-2 px-3 text-left font-mono">سعر الوحدة</th>
              <th className="py-2 px-3 text-left font-mono">التخفيض</th>
              <th className="py-2 px-3 text-left font-mono font-black">المجموع</th>
              <th className="py-2 px-2 text-center w-12">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
            {displayCart.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2.5 text-slate-400 dark:text-slate-500 select-none">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 shadow-inner">
                      <ScanLine className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      الفاتورة فارغة حالياً
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed">
                      امسح باركود السلعة <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">(F3)</span> أو اختر من شبكة الأصناف بالأسفل للبدء
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayCart.map((item, index) => {
                const isSelected = selectedCartRowId === item.productId;
                return (
                  <tr
                    key={`${item.productId}-${index}`}
                    onClick={() => setSelectedCartRowId(item.productId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-r-4 border-blue-600 font-bold'
                        : index % 2 === 0
                        ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        : 'bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <td className="py-2 px-3 text-center font-mono text-slate-400 text-xs">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{item.name}</span>
                        {item.isPack && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded font-bold shrink-0">
                            {item.packMode === 'wholesale_packs'
                              ? `عبوة جملة (${item.packUnit || 'طرد'})`
                              : `عبوة (${item.packPiecesCount || item.qty} قطع)`}
                          </span>
                        )}
                        {(item as any).variantName && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-mono font-bold">
                            {(item as any).variantName}
                          </span>
                        )}
                      </div>
                      {isSelected && !item.isPack && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-slate-400 font-normal">تبديل السعر:</span>
                          {(() => {
                            const productList = allProducts && allProducts.length > 0 ? allProducts : products;
                            const prod = productList.find((p) => p.id === item.productId || (item.barcode && p.barcode === item.barcode));
                            if (!prod) return null;
                            const p1 = getProductTierPrice(prod, '1');
                            const p2 = getProductTierPrice(prod, '2');
                            const p3 = getProductTierPrice(prod, '3');
                            const p4 = getProductTierPrice(prod, '4');
                            return (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice && onEditPrice(item.productId, p1)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    item.unitPrice === p1
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-700 dark:text-slate-300'
                                  }`}
                                  title="سعر 1 (تجزئة)"
                                >
                                  س1: {formatMoney(p1)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice && onEditPrice(item.productId, p2)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    item.unitPrice === p2
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-700 dark:text-slate-300'
                                  }`}
                                  title="سعر 2 (نصف جملة)"
                                >
                                  س2: {formatMoney(p2)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice && onEditPrice(item.productId, p3)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    item.unitPrice === p3
                                      ? 'bg-purple-600 text-white shadow-xs'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-slate-700 dark:text-slate-300'
                                  }`}
                                  title="سعر 3 (جملة)"
                                >
                                  س3: {formatMoney(p3)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice && onEditPrice(item.productId, p4)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    item.unitPrice === p4
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-slate-700 dark:text-slate-300'
                                  }`}
                                  title="سعر 4 (خاص / بالفاتورة)"
                                >
                                  س4: {formatMoney(p4)}
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {item.barcode || '—'}
                    </td>
                    <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="inline-flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                            className="w-6 h-6 rounded bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer shadow-2xs active:scale-90 transition-all"
                            title={item.isPack && item.packMode === 'wholesale_packs' ? 'تقليل عدد العبوات' : 'تقليل الكمية (أو الحذف عند 1)'}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            onClick={() => onOpenKeypadForQty && onOpenKeypadForQty(item)}
                            className={`w-8 text-center font-mono font-black text-xs cursor-pointer hover:underline ${
                              item.isPack && item.packMode === 'wholesale_packs'
                                ? 'text-purple-700 dark:text-purple-400'
                                : 'text-blue-700 dark:text-blue-400'
                            }`}
                            title={item.isPack && item.packMode === 'wholesale_packs' ? 'تعديل عدد العبوات عبر اللوحة الرقمية' : 'تعديل الكمية عبر اللوحة الرقمية'}
                          >
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                            className="w-6 h-6 rounded bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer shadow-2xs active:scale-90 transition-all"
                            title={item.isPack && item.packMode === 'wholesale_packs' ? 'زيادة عدد العبوات' : 'زيادة الكمية'}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        {item.isPack && item.packMode === 'wholesale_packs' ? (
                          <div className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 leading-tight">
                            <span>{item.qty} {item.packUnit || 'عبوة'}</span>
                            <span className="text-[9px] text-slate-400 font-normal mr-1">
                              (×{item.packPiecesCount || 1} قطع = {item.qty * (item.packPiecesCount || 1)} قطعة)
                            </span>
                          </div>
                        ) : item.isPack ? (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                            {item.qty} قطعة
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-left font-mono text-slate-700 dark:text-slate-300 font-bold text-xs" onClick={(e) => e.stopPropagation()}>
                      {editingPriceItemId === item.productId ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            autoFocus
                            value={customPriceInput}
                            onChange={(e) => setCustomPriceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const p = parseFloat(customPriceInput);
                                if (!isNaN(p) && p >= 0 && onEditPrice) {
                                  onEditPrice(item.productId, p);
                                }
                                setEditingPriceItemId(null);
                              } else if (e.key === 'Escape') {
                                setEditingPriceItemId(null);
                              }
                            }}
                            className="w-16 px-1 py-0.5 rounded border border-blue-400 bg-white dark:bg-slate-900 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const p = parseFloat(customPriceInput);
                              if (!isNaN(p) && p >= 0 && onEditPrice) {
                                onEditPrice(item.productId, p);
                              }
                              setEditingPriceItemId(null);
                            }}
                            className="text-emerald-600 hover:text-emerald-700 font-bold text-xs cursor-pointer"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            if (onEditPrice) {
                              setEditingPriceItemId(item.productId);
                              setCustomPriceInput(String(item.unitPrice));
                            }
                          }}
                          className="cursor-pointer hover:underline hover:text-blue-600"
                          title="اضغط لتعديل السعر المباشر"
                        >
                          {formatMoney(item.unitPrice)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-left font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      {(item as any).discount && (item as any).discount > 0
                        ? `-${formatMoney((item as any).discount)}`
                        : '0.00'}
                    </td>
                    <td className="py-2 px-3 text-left font-mono font-black text-blue-700 dark:text-blue-400 text-xs sm:text-sm">
                      {formatMoney(item.lineTotal)}
                    </td>
                    <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onRemoveFromCart(item.productId)}
                        className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center transition-colors cursor-pointer mx-auto active:scale-90"
                        title="حذف هذا الصنف من الفاتورة"
                        aria-label="حذف الصنف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Details Footer Bar */}
      <div className="bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 px-4 py-1.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-bold shrink-0">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500 font-normal">التاريخ:</span>
            <span className="font-mono text-blue-800 dark:text-blue-400">{formattedDate}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500 font-normal">رقم الوصل:</span>
            <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              {invoiceFormattedNumber}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500 font-normal">عدد المنتجات:</span>
            <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded font-mono font-bold">
              {displayCart.length}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500 font-normal">إجمالي القطع:</span>
            <span className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono">
              {totalUnitsCount}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
