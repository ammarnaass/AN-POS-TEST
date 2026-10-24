import React, { useState } from 'react';
import {
  Filter,
  Barcode,
  Search,
  Trash2,
  Plus,
  Minus,
} from 'lucide-react';
import type { CartItem } from '@/types';
import type { SearchCriteria } from '../types';

interface WorkstationTableAreaProps {
  cart: CartItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  searchCriteria: SearchCriteria;
  setSearchCriteria: (criteria: SearchCriteria) => void;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
}

export const WorkstationTableArea: React.FC<WorkstationTableAreaProps> = ({
  cart,
  selectedItemId,
  onSelectItem,
  onUpdateQty,
  onRemoveItem,
  searchCriteria,
  setSearchCriteria,
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  barcodeInputRef,
  formatMoney,
  currency = 'د.ج',
}) => {
  const [showProfitMargin, setShowProfitMargin] = useState(false);

  // Active item
  const activeItem = cart.find((item) => item.productId === selectedItemId) || cart[0] || null;

  return (
    <section className="flex-1 flex flex-col gap-2 min-w-0 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-800 overflow-hidden select-none">
      {/* Top Search & Barcode Entry Banner with shortcuts */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 flex-shrink-0">
        {/* Criteria filter */}
        <div className="w-44 sm:w-48 flex-shrink-0">
          <div className="relative">
            <select
              value={searchCriteria}
              onChange={(e) => setSearchCriteria(e.target.value as SearchCriteria)}
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

        {/* Main Product Barcode Input with F5 and Scan indicator */}
        <form onSubmit={onBarcodeSubmit} className="flex-1 relative">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-blue-600 dark:text-blue-400">
            <Barcode className="w-4 h-4" />
          </div>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder={
              searchCriteria === 'barcode'
                ? 'امسح الباركود للقراءة الفورية...'
                : searchCriteria === 'reference'
                ? 'اكتب مرجع المادة (Référence)...'
                : 'امسح الباركود أو اكتب اسم المادة للبحث الفوري...'
            }
            className="w-full bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-sm font-semibold rounded-lg pr-10 pl-24 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition shadow-inner outline-hidden"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 gap-1.5">
            <span className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs px-2 py-0.5 rounded shadow-2xs">
              F5 بحث
            </span>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-md w-7 h-7 flex items-center justify-center transition shadow-2xs cursor-pointer"
              title="بحث"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Cart items count badge */}
        <div className="flex items-center gap-2 bg-slate-200/70 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
          <span>عدد المواد في السلة:</span>
          <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
            {cart.length}
          </span>
        </div>
      </div>

      {/* Current Sales Items Table */}
      <div className="flex-1 overflow-y-auto px-3">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
              <th className="py-2.5 px-3 rounded-r-lg">#</th>
              <th className="py-2.5 px-3">المرجع (Réf)</th>
              <th className="py-2.5 px-4 w-2/5">التسمية / اسم المنتج (Désignation)</th>
              <th className="py-2.5 px-3 text-center">الكمية (Qté)</th>
              <th className="py-2.5 px-3 text-left">سعر البيع (P.Vente)</th>
              <th className="py-2.5 px-3 text-left">المبلغ (Montant)</th>
              {showProfitMargin && (
                <th className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400">
                  الهامش
                </th>
              )}
              <th className="py-2.5 px-3 text-center rounded-l-lg">إجراء</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {cart.map((item, idx) => {
              const isSelected =
                selectedItemId === item.productId || (!selectedItemId && idx === 0);
              const lineTotal = item.price * item.qty;
              const ref = (item as any).reference || (item as any).product?.sku || `REF-${item.productId.slice(0, 5)}`;
              const barcode = (item as any).barcode || (item as any).product?.barcode || '';
              const costPrice = (item as any).costPrice || (item as any).product?.buyPrice || 0;
              const margin = costPrice > 0 ? ((item.price - costPrice) * item.qty) : 0;

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
                  <td className="py-2.5 px-3 font-mono text-xs text-blue-700 dark:text-blue-400 font-bold">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                    {ref}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                    <span>{item.name}</span>
                    {barcode && (
                      <span className="block text-[11px] text-slate-400 font-normal font-mono">
                        باركود: {barcode}
                      </span>
                    )}
                  </td>

                  {/* Interactive Inline Quantity Controls */}
                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
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
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-700 dark:hover:text-rose-300 text-slate-600 dark:text-slate-300 transition text-xs font-bold cursor-pointer"
                        title="إنقاص"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-extrabold text-blue-700 dark:text-blue-300 px-3 py-0.5 text-sm">
                        {item.qty.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 transition text-xs font-bold cursor-pointer"
                        title="زيادة"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 text-left font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {formatMoney(item.price)}
                  </td>
                  <td className="py-2.5 px-3 text-left font-mono font-bold text-blue-800 dark:text-blue-300 text-base">
                    {formatMoney(lineTotal)}
                  </td>

                  {showProfitMargin && (
                    <td className="py-2.5 px-3 text-center font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      +{formatMoney(margin)}
                    </td>
                  )}

                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.productId)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 w-7 h-7 inline-flex items-center justify-center rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
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
