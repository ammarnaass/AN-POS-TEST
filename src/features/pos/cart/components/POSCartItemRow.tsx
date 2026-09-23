import React, { useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import type { CartItem, Product } from '@/types';
import { getProductTierPrice } from '@/services';

export interface POSCartItemRowProps {
  item: CartItem;
  index: number;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onEditPrice?: (productId: string, newPrice: number) => void;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  onOpenKeypadForQty?: (item: CartItem) => void;
  allProducts?: Product[];
  products?: Product[];
}

export const POSCartItemRow: React.FC<POSCartItemRowProps> = ({
  item,
  index,
  onUpdateQty,
  onRemoveFromCart,
  onEditPrice,
  formatMoney,
  currency = 'دج',
  onOpenKeypadForQty,
  allProducts,
  products = [],
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState('');

  const itemPrice = item.unitPrice ?? (item as any).price ?? 0;
  const lineTotal = item.lineTotal ?? itemPrice * item.qty;

  const handlePriceSubmit = () => {
    const num = parseFloat(customPriceInput);
    if (!isNaN(num) && num >= 0 && onEditPrice) {
      onEditPrice(item.productId, num);
      setIsEditingPrice(false);
    }
  };

  const productList = allProducts && allProducts.length > 0 ? allProducts : products;
  const prod = productList.find(
    (p) => p.id === item.productId || (item.barcode && p.barcode === item.barcode)
  );

  return (
    <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 border border-slate-100 dark:border-slate-800/60 transition-all flex flex-col gap-2">
      {/* الصف العلوي: التسلسل، الاسم، السعر الفردي، والمجموع */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0 font-mono">
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
      {prod && !item.isPack && (
        <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-bold ml-0.5">تبديل السعر:</span>
          {[
            { tier: '1' as const, label: 'س1', desc: 'تجزئة' },
            { tier: '2' as const, label: 'س2', desc: 'نصف جملة' },
            { tier: '3' as const, label: 'س3', desc: 'جملة' },
            { tier: '4' as const, label: 'س4', desc: 'خاص' },
          ].map(({ tier, label, desc }) => {
            const price = getProductTierPrice(prod, tier);
            const isSelected = Math.abs(itemPrice - price) < 0.001;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => onEditPrice && onEditPrice(item.productId, price)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
                title={`${label} (${desc}): ${formatMoney(price)}`}
              >
                {label}: {formatMoney(price)}
              </button>
            );
          })}
        </div>
      )}

      {/* حقل تعديل السعر المباشر */}
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
              if (e.key === 'Enter') handlePriceSubmit();
              if (e.key === 'Escape') setIsEditingPrice(false);
            }}
          />
          <button
            type="button"
            onClick={handlePriceSubmit}
            className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 cursor-pointer"
          >
            تأكيد
          </button>
          <button
            type="button"
            onClick={() => setIsEditingPrice(false)}
            className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* شريط الإجراءات: حذف، تعديل السعر، وزيادة/نقصان الكمية */}
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
            setIsEditingPrice(true);
            setCustomPriceInput(String(itemPrice));
          }}
          className="text-blue-600 dark:text-blue-400 text-[11px] font-medium hover:underline bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          تعديل السعر
        </button>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onUpdateQty(item.productId, item.qty - 1)}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
            title="تقليل الكمية (-1)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onOpenKeypadForQty && onOpenKeypadForQty(item)}
            className="font-bold text-xs min-w-[28px] text-center font-mono hover:bg-slate-100 dark:hover:bg-slate-700 px-1 py-0.5 rounded cursor-pointer"
            title="تعديل الكمية بواسطة لوحة الأرقام"
          >
            {item.qty}
          </button>
          <button
            type="button"
            onClick={() => onUpdateQty(item.productId, item.qty + 1)}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
            title="زيادة الكمية (+1)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
