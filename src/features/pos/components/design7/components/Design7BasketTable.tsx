import React from 'react';
import type { CartItem } from '@/types';
import { Plus, Minus, Trash2, Edit3 } from 'lucide-react';
import { getProductTierPrice } from '@/services';
import { getCartRowKey } from '../utils/cartRow';

interface Design7BasketTableProps {
  cart: CartItem[];
  selectedCartRowId: string | null;
  onSelectRow: (rowId: string) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  formatMoney: (amount?: number | null) => string;
  onOpenItemEdit?: (item: CartItem, mode?: 'qty' | 'price') => void;
  priceTier?: '1' | '2' | '3' | '4';
  products?: any[];
  allProducts?: any[];
  onEditPrice?: (productId: string, price: number) => void;
}

export const Design7BasketTable: React.FC<Design7BasketTableProps> = ({
  cart,
  selectedCartRowId,
  onSelectRow,
  onUpdateQty,
  onRemoveFromCart,
  formatMoney,
  onOpenItemEdit,
  priceTier = '1',
  products = [],
  allProducts = [],
  onEditPrice,
}) => {
  return (
    <main
      className="flex-1 bg-white flex flex-col border-l border-[#bcc9d6] overflow-hidden min-w-0 min-h-0"
      data-purpose="items-table-container"
    >
      <div className="overflow-y-auto flex-1 min-h-0">
        <table className="w-full text-right border-collapse text-xs select-none">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-b from-[#dce5ed] to-[#c7d3df] border-b border-[#9eb0c2] text-black font-black shadow-xs">
              <th className="py-1 sm:py-1.5 px-1 sm:px-2 border-l border-[#b5c4d3] text-center w-10 sm:w-12">رقم</th>
              <th className="py-1 sm:py-1.5 px-1 sm:px-2 border-l border-[#b5c4d3] text-center w-24 sm:w-32 md:w-36">كودبار</th>
              <th className="py-1 sm:py-1.5 px-2 sm:px-3 border-l border-[#b5c4d3] text-right">إسم المنتوج</th>
              <th className="py-1 sm:py-1.5 px-1 sm:px-2 border-l border-[#b5c4d3] text-center w-20 sm:w-24">سعر الوحدة</th>
              <th className="py-1 sm:py-1.5 px-1 sm:px-2 border-l border-[#b5c4d3] text-center w-24 sm:w-28">الكمية</th>
              <th className="py-1 sm:py-1.5 px-2 sm:px-3 border-l border-[#b5c4d3] text-center w-24 sm:w-28">المبلغ</th>
              <th className="py-1 sm:py-1.5 px-1 text-center w-9 sm:w-10">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-bold text-black">
            {cart.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-500 font-medium">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-3xl">🛒</span>
                    <span className="text-sm font-black text-black">السلة فارغة حالياً</span>
                    <span className="text-xs text-slate-500">
                      امسح الباركود (F3) أو اختر السلع من القائمة بالأسفل أو اضغط (F10) للبحث
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              cart.map((item, idx) => {
                const rowKey = getCartRowKey(item, idx);
                const effectiveProductId = item.productId || (item as any).id || rowKey;
                const isSelected =
                  selectedCartRowId === rowKey ||
                  (Boolean(selectedCartRowId) &&
                    !selectedCartRowId.includes('_') &&
                    (item.productId === selectedCartRowId || (item as any).id === selectedCartRowId) &&
                    idx === cart.findIndex((i) => (i.productId || (i as any).id) === selectedCartRowId));
                const barcode = item.barcode || '—';
                const name = item.name || (item as any).productName || 'مادة بدون اسم';
                const qty = item.qty ?? (item as any).quantity ?? 1;
                const unitPrice = item.unitPrice ?? (item as any).price ?? 0;
                const lineTotal = item.lineTotal ?? (item as any).total ?? (unitPrice * qty);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onSelectRow(rowKey)}
                    onDoubleClick={() => onOpenItemEdit?.(item, 'qty')}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-[#d7e9f7] hover:bg-[#c9e1f5] text-black font-extrabold'
                        : 'hover:bg-slate-100/80 text-black font-bold'
                    }`}
                  >
                    {/* رقم */}
                    <td
                      className={`py-1.5 px-2 text-center border-l font-mono font-bold text-black ${
                        isSelected ? 'border-[#bdd0e3]' : 'border-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </td>

                    {/* كودبار */}
                    <td
                      className={`py-1.5 px-2 text-center font-mono font-bold text-black border-l text-[11px] ${
                        isSelected ? 'border-[#bdd0e3]' : 'border-slate-300'
                      }`}
                    >
                      {barcode}
                    </td>

                    {/* إسم المنتوج */}
                    <td
                      className={`py-1.5 px-3 border-l font-extrabold text-black ${
                        isSelected ? 'border-[#bdd0e3]' : 'border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{name}</span>
                          {item.isPack && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 border ${
                                item.packMode === 'wholesale_packs'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {item.packMode === 'wholesale_packs'
                                ? `عبوة جملة (${item.packUnit || 'طرد'})`
                                : `عبوة تجزئة (${item.packPiecesCount || qty} قطع)`}
                            </span>
                          )}
                        </div>
                        {item.unit && (
                          <span className="text-[10px] text-slate-500 font-normal bg-slate-100 px-1 rounded">
                            {item.unit}
                          </span>
                        )}
                      </div>

                      {/* إمكانية تبديل فئة السعر للصنف المحدد عند تحديده */}
                      {isSelected && !item.isPack && onEditPrice && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-slate-500 font-normal">تبديل السعر:</span>
                          {(() => {
                            const productList = allProducts && allProducts.length > 0 ? allProducts : products;
                            const prod = productList.find(
                              (p: any) => p.id === item.productId || (item.barcode && p.barcode === item.barcode)
                            );
                            if (!prod) return null;
                            const p1 = getProductTierPrice(prod, '1');
                            const p2 = getProductTierPrice(prod, '2');
                            const p3 = getProductTierPrice(prod, '3');
                            const p4 = getProductTierPrice(prod, '4');
                            return (
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => onEditPrice(item.productId, p1)}
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    item.unitPrice === p1
                                      ? 'bg-sky-600 text-white'
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                  }`}
                                  title={`سعر تجزئة س1: ${formatMoney(p1)}`}
                                >
                                  س1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice(item.productId, p2)}
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    item.unitPrice === p2
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                  }`}
                                  title={`سعر نصف جملة س2: ${formatMoney(p2)}`}
                                >
                                  س2
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice(item.productId, p3)}
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    item.unitPrice === p3
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                  }`}
                                  title={`سعر جملة س3: ${formatMoney(p3)}`}
                                >
                                  س3
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onEditPrice(item.productId, p4)}
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    item.unitPrice === p4
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                  }`}
                                  title={`سعر خاص س4: ${formatMoney(p4)}`}
                                >
                                  س4
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </td>

                    {/* سعر الوحدة */}
                    <td
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRow(rowKey);
                        onOpenItemEdit?.(item, 'price');
                      }}
                      title="انقر لفتح الآلة الحاسبة اللمسية لتعديل السعر"
                      className={`py-1.5 px-2 text-center border-l cursor-pointer hover:bg-amber-50/70 transition-colors ${
                        isSelected ? 'border-[#bdd0e3]' : 'border-slate-300'
                      }`}
                    >
                      <span className="font-mono font-black text-black">{formatMoney(unitPrice)}</span>
                    </td>

                    {/* الكمية مع خيار فتح الآلة الحاسبة اللمسية */}
                    <td
                      className={`py-1 px-1 text-center border-l ${
                        isSelected ? 'border-[#bdd0e3]' : 'border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateQty(effectiveProductId, qty + 1);
                          }}
                          className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-black flex items-center justify-center font-bold text-xs cursor-pointer"
                          title={item.isPack && item.packMode === 'wholesale_packs' ? 'زيادة عدد العبوات' : 'زيادة الكمية'}
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRow(rowKey);
                            onOpenItemEdit?.(item, 'qty');
                          }}
                          className="min-w-[28px] px-1.5 py-0.5 rounded bg-white hover:bg-sky-100 border border-slate-300 hover:border-sky-500 text-center font-black text-xs text-black shadow-2xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                          title="انقر لفتح الآلة الحاسبة اللمسية لتعديل الكمية"
                        >
                          <span className="font-mono font-black text-black">{qty}</span>
                          <Edit3 className="w-2.5 h-2.5 opacity-60 text-black" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (qty > 1) {
                              onUpdateQty(effectiveProductId, qty - 1);
                            } else {
                              onRemoveFromCart(effectiveProductId);
                            }
                          }}
                          className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-black flex items-center justify-center font-bold text-xs cursor-pointer"
                          title={item.isPack && item.packMode === 'wholesale_packs' ? 'تقليل عدد العبوات' : 'إنقاص الكمية'}
                        >
                          <Minus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>

                      {/* تفصيل العبوات vs قطع التجزئة */}
                      {item.isPack && item.packMode === 'wholesale_packs' ? (
                        <div className="text-[10px] font-mono font-bold text-purple-700 leading-tight mt-0.5">
                          <span>{qty} {item.packUnit || 'عبوة'}</span>
                          <span className="text-[9px] text-slate-600 font-normal mr-1">
                            (×{item.packPiecesCount || 1} قطع = {qty * (item.packPiecesCount || 1)} قطعة)
                          </span>
                        </div>
                      ) : item.isPack ? (
                        <div className="text-[9px] font-bold text-emerald-800 mt-0.5">
                          {qty} قطعة (تجزئة)
                        </div>
                      ) : null}
                    </td>

                    {/* المبلغ */}
                    <td
                      className={`py-1.5 px-3 text-center font-black font-mono text-black border-l text-xs ${
                        isSelected ? 'border-[#bdd0e3]' : 'border-slate-300'
                      }`}
                    >
                      {formatMoney(lineTotal)}
                    </td>

                    {/* حذف */}
                    <td className="py-1 px-1 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromCart(effectiveProductId);
                        }}
                        className="w-6 h-6 rounded text-rose-500 hover:bg-rose-100 active:bg-rose-200 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                        title="حذف الصنف من السلة (Delete)"
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
    </main>
  );
};
