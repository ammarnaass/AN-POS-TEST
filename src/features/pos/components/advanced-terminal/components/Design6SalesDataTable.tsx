import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import type { CartItem } from '@/types';

export interface Design6SalesDataTableProps {
  cart: CartItem[];
  selectedCartRowId: string | null;
  setSelectedCartRowId: (id: string | null) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  formatMoney: (amount?: number) => string;
  currency?: string;
  tvaRate?: number;
  tvaAmount?: number;
  onOpenKeypadForQty?: (item: CartItem) => void;
}

export const Design6SalesDataTable: React.FC<Design6SalesDataTableProps> = ({
  cart,
  selectedCartRowId,
  setSelectedCartRowId,
  onUpdateQty,
  onRemoveFromCart,
  formatMoney,
  currency = 'دج',
  tvaRate = 19,
  tvaAmount,
  onOpenKeypadForQty,
}) => {
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
    <div className="flex-1 bg-[#060a14] flex flex-col justify-between overflow-hidden border-b border-slate-800 select-none">
      {/* Table Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-right border-collapse text-xs">
          <thead className="bg-[#0b1222] border-b border-slate-800 text-slate-400 font-bold sticky top-0 z-10 text-[11px]">
            <tr>
              <th className="py-2.5 px-2 text-center w-14">حذف</th>
              <th className="py-2.5 px-4 text-left font-mono">المجموع ({currency})</th>
              <th className="py-2.5 px-3 text-center font-mono w-28">الكمية</th>
              <th className="py-2.5 px-4 text-left font-mono">سعر الوحدة</th>
              <th className="py-2.5 px-4">اسم المنتج / البيان</th>
              <th className="py-2.5 px-4 font-mono text-center">الرمز / الباركود</th>
              <th className="py-2.5 px-3 text-center w-12">الرقم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {/* 1. Actual Cart Items */}
            {cart.map((item, index) => {
              const rowNum = String(index + 1).padStart(2, '0');
              const isSelected = selectedCartRowId === item.productId;
              const hasDiscount = (item.discount && item.discount > 0) || Boolean((item as any).isOffer);

              return (
                <tr
                  key={item.productId || index}
                  onClick={() => setSelectedCartRowId(item.productId)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-950/50 border-y border-cyan-500/50 shadow-inner'
                      : index % 2 === 0
                      ? 'bg-[#080d1a] hover:bg-[#0f172a]'
                      : 'bg-[#060a14] hover:bg-[#0f172a]'
                  }`}
                >
                  {/* Delete Button (32x32px Touch Target) */}
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromCart(item.productId);
                      }}
                      className="w-8 h-8 mx-auto text-rose-400 hover:text-white bg-rose-950/30 hover:bg-rose-600 active:scale-90 rounded-lg flex items-center justify-center transition-all cursor-pointer border border-rose-900/40"
                      title="حذف الصنف من السلة (Del)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>

                  {/* Line Total (Cyan bold) */}
                  <td className="py-2 px-4 text-left font-mono font-black text-cyan-400 text-sm">
                    {formatMoney(item.lineTotal || item.unitPrice * item.qty)}
                  </td>

                  {/* Quantity with Direct Touch Buttons (+ / -) */}
                  <td className="py-1.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Increase (+) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateQty(item.productId, item.qty + 1);
                        }}
                        className="w-7 h-7 bg-slate-800/90 hover:bg-blue-600 active:scale-90 text-slate-200 hover:text-white rounded-md flex items-center justify-center font-bold text-sm transition-colors border border-slate-700/80 cursor-pointer shadow-xs"
                        title="زيادة الكمية (+1)"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
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
                        className="min-w-[34px] h-7 px-1.5 bg-[#0b1222] hover:bg-slate-800 active:scale-95 border border-amber-500/60 hover:border-amber-400 rounded-md font-mono font-black text-amber-400 text-sm flex items-center justify-center transition-colors cursor-pointer"
                        title="انقر لتعديل الكمية"
                      >
                        {item.qty}
                      </button>

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
                        className="w-7 h-7 bg-slate-800/90 hover:bg-rose-600 active:scale-90 text-slate-200 hover:text-white rounded-md flex items-center justify-center font-bold text-sm transition-colors border border-slate-700/80 cursor-pointer shadow-xs"
                        title={item.qty > 1 ? 'إنقاص الكمية (-1)' : 'حذف الصنف'}
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </td>

                  {/* Unit Price */}
                  <td className="py-2 px-4 text-left font-mono font-bold text-slate-300">
                    {formatMoney(item.unitPrice)}
                  </td>

                  {/* Product Designation & Badges */}
                  <td className="py-2 px-4 font-bold text-slate-100 flex items-center justify-end gap-2">
                    {hasDiscount && (
                      <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                        عرض خاص
                      </span>
                    )}
                    <span>{item.name}</span>
                  </td>

                  {/* Barcode / SKU */}
                  <td className="py-2 px-4 text-center font-mono text-slate-400 text-[11px]">
                    {(item as any).barcode || (item as any).sku || '---'}
                  </td>

                  {/* Row Number */}
                  <td className="py-2 px-3 text-center font-mono text-slate-500 font-bold">
                    {rowNum}
                  </td>
                </tr>
              );
            })}

            {/* 2. Empty Placeholder Rows */}
            {emptyRows.map((num, i) => {
              const rowNum = String(num).padStart(2, '0');
              return (
                <tr key={`empty-${num}`} className="opacity-40 select-none">
                  <td className="py-2 px-2 text-center text-slate-700"></td>
                  <td className="py-2 px-4 text-left font-mono text-slate-600">0.00</td>
                  <td className="py-2 px-3 text-center font-mono text-slate-600">0</td>
                  <td className="py-2 px-4 text-left font-mono text-slate-600">0.00</td>
                  <td className="py-2 px-4 text-slate-600 italic">
                    {i < 2 ? 'في انتظار إدخال المادة...' : ''}
                  </td>
                  <td className="py-2 px-4 text-center font-mono text-slate-700">---</td>
                  <td className="py-2 px-3 text-center font-mono text-slate-700">{rowNum}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Summary Bar */}
      <div className="w-full bg-[#0b1222] border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-bold text-slate-400">
        {/* Left: TVA Calculation */}
        <div className="flex items-center gap-1">
          <span>الرسم على القيمة المضافة {tvaRate}%:</span>
          <span className="font-mono text-slate-200">
            {currency} {calculatedTva.toFixed(2)}
          </span>
        </div>

        {/* Right: Items Count & Units Count */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span>إجمالي القطع:</span>
            <span className="font-mono text-amber-400 font-black text-sm">{totalUnits}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>عدد الأسطر:</span>
            <span className="font-mono text-slate-200">{rowsCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

