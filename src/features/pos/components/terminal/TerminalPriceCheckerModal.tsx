import React from 'react';
import { Eye, X, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import type { Product } from '@/types';
import { getProductTierPrice } from '@/services';

export interface TerminalPriceCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: { product: Product; price: number } | null;
  onClearResult: () => void;
  notFoundBarcode: string | null;
  onClearNotFound: () => void;
  priceTier: '1' | '2' | '3' | '4';
  currency?: string;
  formatMoney: (amount?: number) => string;
  onAddToCart: (product: Product, customPrice?: number) => void;
}

export const TerminalPriceCheckerModal: React.FC<TerminalPriceCheckerModalProps> = ({
  isOpen,
  onClose,
  result,
  onClearResult,
  notFoundBarcode,
  onClearNotFound,
  priceTier,
  currency = 'دج',
  formatMoney,
  onAddToCart,
}) => {
  if (!isOpen && !result && !notFoundBarcode) return null;

  return (
    <>
      {/* ─── PRICE CHECKER FLOATING BANNER ─── */}
      {isOpen && (
        <div className="bg-blue-600 text-white px-3 py-2 flex items-center justify-between shadow-md z-30 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 animate-pulse text-blue-200 shrink-0" />
            <span className="text-xs font-bold">
              وضع عارض الأسعار مفعّل: امسح أي باركود أو اكتب الرمز للاستعلام عن السعر والمخزون دون إضافته للسلة
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="إنهاء وضع عارض الأسعار (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>إغلاق (Esc)</span>
          </button>
        </div>
      )}

      {/* ─── PRICE CHECKER RESULT POPUP ─── */}
      {result && (
        <div className="absolute top-12 inset-x-4 mx-auto max-w-lg z-40 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-2xl shadow-2xl p-4 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>بيانات السلعة المستعلم عنها</span>
            </div>
            <button
              type="button"
              onClick={onClearResult}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {result.product.name}
              </h4>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                الباركود: {result.product.barcode || 'غير مسجل'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  المخزون: {result.product.stockQuantity ?? (result.product as any).stock ?? 0}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-bold">
                  الفئة: {priceTier === '3' ? 'س 3 (جملة)' : priceTier === '2' ? 'س 2 (نصف جملة)' : priceTier === '4' ? 'س 4 (خاص)' : 'س 1 (تجزئة)'}
                </span>
              </div>
              {/* مستويات الأسعار الأربعة */}
              <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 font-mono">
                  <span className="text-slate-500 font-sans">س1 (تجزئة):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatMoney(getProductTierPrice(result.product, '1'))} {currency}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 font-mono">
                  <span className="text-slate-500 font-sans">س2 (نصف جملة):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatMoney(getProductTierPrice(result.product, '2'))} {currency}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 font-mono">
                  <span className="text-slate-500 font-sans">س3 (جملة):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatMoney(getProductTierPrice(result.product, '3'))} {currency}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 font-mono">
                  <span className="text-slate-500 font-sans">س4 (خاص):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatMoney(getProductTierPrice(result.product, '4'))} {currency}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-left bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-4 py-2 shrink-0">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-bold">السعر</span>
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatMoney(result.price)}
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mr-1">{currency}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClearResult}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={() => {
                onAddToCart(
                  {
                    ...result.product,
                    price: result.price,
                    retailPrice: result.price,
                  },
                  result.price
                );
                onClearResult();
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة إلى الفاتورة</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── PRICE CHECKER NOT FOUND BANNER ─── */}
      {notFoundBarcode && (
        <div className="absolute top-12 inset-x-4 mx-auto max-w-md z-40 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl p-3 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>لم يتم العثور على سلعة مطابقة للرمز: {notFoundBarcode}</span>
          </div>
          <button
            type="button"
            onClick={onClearNotFound}
            className="text-rose-600 hover:text-rose-800 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
