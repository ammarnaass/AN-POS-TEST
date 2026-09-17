import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  Tag,
} from 'lucide-react';
import type { CartItem, Product } from '@/types';
import { getProductTierPrice } from '@/services';

export interface POSCartContainerProps {
  cart: CartItem[];
  allProducts?: Product[];
  products?: Product[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onEditPrice?: (productId: string, newPrice: number) => void;
  onSelectCustomer?: () => void;
  selectedCustomerName?: string;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  onOpenKeypadForQty?: (item: CartItem) => void;
  variant?: 'sidebar' | 'modern' | 'table';
  className?: string;
}

export const POSCartContainer: React.FC<POSCartContainerProps> = ({
  cart,
  allProducts,
  products = [],
  onUpdateQty,
  onRemoveFromCart,
  onEditPrice,
  onSelectCustomer,
  selectedCustomerName,
  formatMoney,
  currency = 'دج',
  onOpenKeypadForQty,
  variant = 'sidebar',
  className = '',
}) => {
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState('');

  const totalUnitsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const handlePriceSubmit = (productId: string) => {
    const num = parseFloat(customPriceInput);
    if (!isNaN(num) && num >= 0 && onEditPrice) {
      onEditPrice(productId, num);
      setEditingPriceItemId(null);
    }
  };

  return (
    <section
      className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 ${className}`}
      data-purpose="cart-section"
    >
      {/* هيدر السلة الصغير وتبديل العميل */}
      <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">سلة المشتريات</h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {cart.length > 0 ? `${cart.length} أصناف (${totalUnitsCount} قطعة)` : 'قائمة العناصر المحددة'}
            </span>
          </div>
        </div>

        {onSelectCustomer && (
          <button
            type="button"
            onClick={onSelectCustomer}
            className="text-xs bg-slate-200/70 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition cursor-pointer"
          >
            <span>{selectedCustomerName ? selectedCustomerName.slice(0, 14) : 'تغيير العميل'}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* قائمة بنود السلة */}
      <div
        className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 px-3 py-2 space-y-1 custom-scrollbar"
        data-purpose="cart-items-list"
      >
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <ShoppingBag className="w-7 h-7 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">السلة فارغة حالياً</p>
            <p className="text-xs mt-1 text-slate-400 max-w-[200px]">
              امسح الباركود أو اختر منتجاً من القائمة لبدء الفاتورة
            </p>
          </div>
        ) : (
          cart.map((item, index) => {
            const itemPrice = item.unitPrice ?? (item as any).price ?? 0;
            const lineTotal = item.lineTotal ?? itemPrice * item.qty;
            const isEditingPrice = editingPriceItemId === item.productId;

            return (
              <div
                key={item.productId}
                className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 border border-slate-100 dark:border-slate-800/60 transition-all flex flex-col gap-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">
                        {item.name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {formatMoney(itemPrice)} {currency} × {item.qty} {item.unit || item.packUnit || 'قطعة'}
                      </span>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {formatMoney(lineTotal)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                      {currency}
                    </span>
                  </div>
                </div>

                {/* أزرار فئات السعر السريعة للبند (س1 تجزئة، س2 نصف جملة، س3 جملة، س4 خاص) */}
                {(() => {
                  const productList = allProducts && allProducts.length > 0 ? allProducts : products;
                  const prod = productList.find(
                    (p) => p.id === item.productId || (item.barcode && p.barcode === item.barcode)
                  );
                  if (!prod || item.isPack) return null;
                  const p1 = getProductTierPrice(prod, '1');
                  const p2 = getProductTierPrice(prod, '2');
                  const p3 = getProductTierPrice(prod, '3');
                  const p4 = getProductTierPrice(prod, '4');
                  const currentPrice = item.unitPrice ?? (item as any).price ?? 0;
                  return (
                    <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-[10px] text-slate-400 font-bold ml-0.5">تبديل السعر:</span>
                      <button
                        type="button"
                        onClick={() => onEditPrice && onEditPrice(item.productId, p1)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                          Math.abs(currentPrice - p1) < 0.001
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={`س1 (تجزئة): ${formatMoney(p1)}`}
                      >
                        س1: {formatMoney(p1)}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditPrice && onEditPrice(item.productId, p2)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                          Math.abs(currentPrice - p2) < 0.001
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={`س2 (نصف جملة): ${formatMoney(p2)}`}
                      >
                        س2: {formatMoney(p2)}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditPrice && onEditPrice(item.productId, p3)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                          Math.abs(currentPrice - p3) < 0.001
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={`س3 (جملة): ${formatMoney(p3)}`}
                      >
                        س3: {formatMoney(p3)}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditPrice && onEditPrice(item.productId, p4)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                          Math.abs(currentPrice - p4) < 0.001
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={`س4 (خاص): ${formatMoney(p4)}`}
                      >
                        س4: {formatMoney(p4)}
                      </button>
                    </div>
                  );
                })()}

                {/* تعديل السعر المباشر */}
                {isEditingPrice && (
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                    <input
                      type="number"
                      step="any"
                      value={customPriceInput}
                      onChange={(e) => setCustomPriceInput(e.target.value)}
                      placeholder="السعر الجديد..."
                      className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded text-xs font-bold font-mono focus:outline-hidden"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePriceSubmit(item.productId);
                        if (e.key === 'Escape') setEditingPriceItemId(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handlePriceSubmit(item.productId)}
                      className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                    >
                      تأكيد
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPriceItemId(null)}
                      className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded"
                    >
                      إلغاء
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <button
                    type="button"
                    onClick={() => onRemoveFromCart(item.productId)}
                    className="text-slate-400 hover:text-rose-500 p-1 rounded transition cursor-pointer"
                    title="حذف من السلة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingPriceItemId(item.productId);
                      setCustomPriceInput(String(itemPrice));
                    }}
                    className="text-blue-600 dark:text-blue-400 text-[11px] font-medium hover:underline bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    تعديل السعر
                  </button>

                  {/* أزرار زيادة ونقصان الكمية */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      title="تقليل الكمية"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span
                      onClick={() => onOpenKeypadForQty && onOpenKeypadForQty(item)}
                      className={`min-w-[28px] text-center font-bold text-xs font-mono text-slate-800 dark:text-slate-100 ${
                        onOpenKeypadForQty ? 'cursor-pointer hover:text-blue-600' : ''
                      }`}
                      title={onOpenKeypadForQty ? 'اضغط لتعديل الكمية عبر لوحة الأرقام' : undefined}
                    >
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      title="زيادة الكمية"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
