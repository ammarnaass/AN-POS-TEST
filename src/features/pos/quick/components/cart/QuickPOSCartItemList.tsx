import React from 'react';
import { ShoppingCart, X } from 'lucide-react';
import type { CartItem } from '@/types';
import { formatNumber } from '../../../utils/format';

interface QuickPOSCartItemListProps {
  cart: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
}

export const QuickPOSCartItemList: React.FC<QuickPOSCartItemListProps> = ({
  cart,
  onUpdateQty,
  onRemoveItem,
}) => {
  return (
    <div
      className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 space-y-1 custom-scrollbar"
      data-purpose="cart-items-list"
    >
      {cart.length === 0 ? (
        <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <ShoppingCart className="w-10 h-10 opacity-25 mb-2" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">السلة فارغة</p>
          <p className="text-[11px] opacity-70 mt-0.5">امسح الباركود بالكاشف أو انقر على الأصناف</p>
        </div>
      ) : (
        cart.map((item) => (
          <div
            key={item.productId}
            className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl flex items-center justify-between gap-2 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition"
          >
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {item.name}
              </h4>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                <span>{formatNumber(item.unitPrice)} دج</span>
                <span>×</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{item.qty}</span>
                <span>=</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  {formatNumber(item.lineTotal)} دج
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                title="زيادة الكمية"
                type="button"
              >
                +
              </button>
              <span className="w-7 text-center font-bold text-xs text-slate-800 dark:text-slate-200 font-mono">
                {item.qty}
              </span>
              <button
                onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                title="إنقاص الكمية"
                type="button"
              >
                -
              </button>
              <button
                onClick={() => onRemoveItem(item.productId)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition mr-1 cursor-pointer"
                title="حذف من السلة"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
