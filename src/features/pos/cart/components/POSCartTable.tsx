import React from 'react';
import { ScanLine, Plus, Minus, Trash2 } from 'lucide-react';
import type { POSCartTableProps } from '../types';

export const POSCartTable: React.FC<POSCartTableProps> = ({
  cart,
  selectedCartRowId,
  onSelectCartRow,
  onUpdateQty,
  onRemoveFromCart,
  onOpenKeypadForQty,
  productBarcodeMap,
  formatMoney,
  currency = 'دج',
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface border-b border-outline-variant/20 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-right border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-surface-container text-on-surface-variant font-extrabold border-b border-outline-variant/20 shadow-xs">
            <tr>
              <th className="py-2.5 px-3 text-center w-10">#</th>
              <th className="py-2.5 px-3">التعيين (اسم المنتج)</th>
              <th className="py-2.5 px-3 font-mono">الباركود</th>
              <th className="py-2.5 px-3 text-center w-36">الكمية</th>
              <th className="py-2.5 px-3 text-left font-mono">سعر الوحدة</th>
              <th className="py-2.5 px-3 text-left font-mono font-black">المجموع</th>
              <th className="py-2.5 px-2 text-center w-14">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10 font-sans">
            {cart.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-on-surface-variant/60">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <ScanLine className="w-9 h-9 text-primary/40 animate-pulse" />
                    <p className="text-sm font-black text-on-surface">السلة فارغة</p>
                    <p className="text-xs text-on-surface-variant/60 font-mono">
                      امسح باركود المنتج بواسطة القارئ أو اختر منتجاً من القائمة لبدء الفاتورة
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              cart.map((item, index) => {
                const isSelected = selectedCartRowId === item.productId;
                const barcode = item.barcode || (productBarcodeMap?.get(item.productId) ?? '—');
                const itemPrice = item.unitPrice ?? (item as any).price ?? 0;
                const lineTotal = item.lineTotal ?? itemPrice * item.qty;

                return (
                  <tr
                    key={`${item.productId}-${index}`}
                    onClick={() => onSelectCartRow(item.productId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/15 border-l-4 border-primary font-bold'
                        : index % 2 === 0
                        ? 'bg-surface hover:bg-surface-container-low'
                        : 'bg-surface-container-lowest/50 hover:bg-surface-container-low'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono text-on-surface-variant/70 text-xs">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-on-surface">
                      <div className="flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.isPack && (
                          <span className="text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded">
                            {item.packUnit || 'طرد'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-on-surface-variant/80 text-[11px]">
                      {barcode}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-surface-container border border-outline-variant/30 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateQty(item.productId, item.qty - 1);
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high transition active:scale-95 cursor-pointer"
                          title="تقليل (-1)"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenKeypadForQty?.(item);
                          }}
                          className="font-mono font-bold text-xs min-w-[28px] text-center hover:bg-primary/10 rounded px-1 cursor-pointer"
                          title="تعديل الكمية"
                        >
                          {item.qty}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateQty(item.productId, item.qty + 1);
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high transition active:scale-95 cursor-pointer"
                          title="زيادة (+1)"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono text-on-surface font-semibold">
                      {formatMoney(itemPrice)} {currency}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-black text-primary text-sm">
                      {formatMoney(lineTotal)} {currency}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromCart(item.productId);
                        }}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition active:scale-90 cursor-pointer"
                        title="حذف البند"
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
    </div>
  );
};
