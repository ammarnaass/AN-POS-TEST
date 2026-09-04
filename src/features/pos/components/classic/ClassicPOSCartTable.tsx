import React, { useState, useEffect } from 'react';
import { ScanLine, Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem } from '@/types';

const POSLiveClock = React.memo(() => {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span>التاريخ: {time.toLocaleDateString('ar-DZ')} {time.toLocaleTimeString('ar-DZ')}</span>;
});

interface ClassicPOSCartTableProps {
  cart: CartItem[];
  selectedCartRowId: string | null;
  onSelectCartRow: (id: string) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  productBarcodeMap: Map<string, string>;
  formatMoney: (amount?: number) => string;
  totalItemsCount: number;
  totalUnitsCount: number;
  selectedCustomerName: string;
}

export const ClassicPOSCartTable: React.FC<ClassicPOSCartTableProps> = React.memo(({
  cart,
  selectedCartRowId,
  onSelectCartRow,
  onUpdateQty,
  onRemoveFromCart,
  productBarcodeMap,
  formatMoney,
  totalItemsCount,
  totalUnitsCount,
  selectedCustomerName,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface border-b border-outline-variant/20 overflow-hidden">
      {/* Table Container with Custom Scrollbar */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-right border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-surface-container text-on-surface-variant font-bold border-b border-outline-variant/20 shadow-xs">
            <tr>
              <th className="py-2 px-3 text-center w-10">#</th>
              <th className="py-2 px-3">التعيين (اسم المنتج)</th>
              <th className="py-2 px-3 font-mono">الباركود</th>
              <th className="py-2 px-3 text-center w-28">الكمية</th>
              <th className="py-2 px-3 text-left font-mono">سعر الوحدة</th>
              <th className="py-2 px-3 text-left font-mono">التخفيض</th>
              <th className="py-2 px-3 text-left font-mono font-black">المجموع</th>
              <th className="py-2 px-2 text-center w-12">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10 font-sans">
            {cart.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-on-surface-variant/60">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ScanLine className="w-8 h-8 text-primary/40 animate-pulse" />
                    <p className="text-xs sm:text-sm font-bold">السلة فارغة</p>
                    <p className="text-[11px] text-on-surface-variant/50 font-mono">
                      امسح باركود المنتج بواسطة القارئ أو اضغط على أي منتج من القائمة بالأسفل
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              cart.map((item, index) => {
                const isSelected = selectedCartRowId === item.productId;
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
                    <td className="py-2 px-3 text-center font-mono text-on-surface-variant/70">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 font-medium text-on-surface">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{item.name}</span>
                        {(item as any).variantName && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-primary/10 text-primary rounded font-mono">
                            {(item as any).variantName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-on-surface-variant text-[11px]">
                      {(item as any).barcode || productBarcodeMap.get(item.productId) || '—'}
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.productId, Math.max(1, item.qty - 1))}
                          className="w-5 h-5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) onUpdateQty(item.productId, val);
                          }}
                          className="w-11 text-center font-mono font-bold bg-surface-container border border-outline-variant/20 rounded py-0.5 text-xs focus:outline-hidden focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                          className="w-5 h-5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-left font-mono text-on-surface-variant">
                      {formatMoney((item as any).unitPrice ?? (item as any).price ?? 0)}
                    </td>
                    <td className="py-2 px-3 text-left font-mono text-emerald-500">
                      {(item as any).discount && (item as any).discount > 0 ? `-${formatMoney((item as any).discount)}` : '0.00'}
                    </td>
                    <td className="py-2 px-3 text-left font-mono font-black text-on-surface text-sm">
                      {formatMoney(item.lineTotal)}
                    </td>
                    <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onRemoveFromCart(item.productId)}
                        className="w-6 h-6 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer mx-auto"
                        title="حذف هذا المنتج"
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

      {/* Table Footer Status Bar */}
      <div className="bg-surface-container-low/90 border-t border-outline-variant/15 px-3 py-1.5 flex items-center justify-between text-[11px] text-on-surface-variant shrink-0 font-mono">
        <div className="flex items-center gap-4">
          <POSLiveClock />
          <span>عدد المواد: <strong className="text-on-surface">{totalItemsCount}</strong></span>
          <span>إجمالي القطع: <strong className="text-on-surface">{totalUnitsCount}</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <span>الزبون: <strong className="text-primary font-sans">{selectedCustomerName || 'زبون عام'}</strong></span>
          <span className="text-emerald-500 font-sans font-bold">تقبض فقط</span>
        </div>
      </div>
    </div>
  );
});
