import React, { useMemo } from 'react';
import {
  ScanLine,
  Trash2,
  BookOpen,
  PenTool,
  Package,
  Layers,
  Banknote,
} from 'lucide-react';
import type { CartItem, Product } from '@/types';
import { getProductTierPrice } from '@/services';

interface ClassicPOSCartTableProps {
  cart: CartItem[];
  selectedCartRowId: string | null;
  onSelectCartRow: (id: string) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onOpenKeypadForQty?: (item: CartItem) => void;
  productBarcodeMap: Map<string, string>;
  formatMoney: (amount?: number) => string;
  totalItemsCount: number;
  totalUnitsCount: number;
  selectedCustomerName: string;
  subtotal?: number;
  discountAmount?: number;
  totalAmount?: number;
  products?: Product[];
  allProducts?: Product[];
  onEditPrice?: (productId: string, newPrice: number) => void;
  enabledPriceTiers?: Array<'1' | '2' | '3' | '4'>;
  currency?: string;
}

export const ClassicPOSCartTable: React.FC<ClassicPOSCartTableProps> = React.memo(({
  cart,
  selectedCartRowId,
  onSelectCartRow,
  onUpdateQty,
  onRemoveFromCart,
  onOpenKeypadForQty,
  productBarcodeMap,
  formatMoney,
  enabledPriceTiers,
  totalItemsCount,
  totalUnitsCount,
  selectedCustomerName: _selectedCustomerName,
  subtotal = 0,
  discountAmount = 0,
  totalAmount = 0,
  products = [],
  allProducts = [],
  onEditPrice,
  currency = 'دج',
}) => {
  // Map of products for fast O(1) lookup
  const productList = useMemo(
    () => (allProducts && allProducts.length > 0 ? allProducts : products),
    [allProducts, products]
  );

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of productList) {
      if (p.id) map.set(p.id, p);
    }
    return map;
  }, [productList]);

  // Visual helper for category colors and icons
  const getItemVisual = (catName: string, index: number) => {
    const lower = catName.toLowerCase();
    if (lower.includes('كراس') || lower.includes('كتب') || lower.includes('مدرسية')) {
      return {
        icon: BookOpen,
        colorClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
      };
    }
    if (lower.includes('قلم') || lower.includes('كتابة') || lower.includes('تصحيح')) {
      return {
        icon: PenTool,
        colorClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
      };
    }
    const palettes = [
      'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
      'bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400',
      'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400',
      'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    ];
    return {
      icon: Package,
      colorClass: palettes[index % palettes.length],
    };
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden select-none">
      {/* جدول المنتجات في الفاتورة */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10 font-bold uppercase shadow-2xs">
            <tr>
              <th className="py-2.5 px-3 text-center w-12">#</th>
              <th className="py-2.5 px-4 text-right">التعيين والتفاصيل (اسم المنتج، التصنيف)</th>
              <th className="py-2.5 px-3 text-center w-36">الباركود</th>
              <th className="py-2.5 px-3 text-center w-36">الكمية</th>
              <th className="py-2.5 px-4 text-left w-28">سعر الوحدة</th>
              <th className="py-2.5 px-3 text-center w-28">نسبة التخفيض</th>
              <th className="py-2.5 px-4 text-left w-36">المجموع الإجمالي</th>
              <th className="py-2.5 px-3 text-center w-16">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium" id="cart-items-body">
            {cart.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <ScanLine className="w-10 h-10 text-blue-500/50 animate-pulse" />
                    <p className="text-base font-bold text-slate-700 dark:text-slate-200">السلة فارغة</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                      امسح باركود المنتج بواسطة القارئ (F7) أو ابحث بالاسم في شريط البحث أعلاه
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              cart.map((item, index) => {
                const isSelected = selectedCartRowId === item.productId;
                const prod = productMap.get(item.productId);
                const barcode = item.barcode || productBarcodeMap.get(item.productId) || prod?.barcode || '-';
                const catName =
                  (typeof prod?.category === 'object' && prod?.category !== null
                    ? (prod.category as any).name
                    : prod?.category) || 'عام';
                const shelf = (prod as any)?.shelfLocation || (prod as any)?.shelf || `A-0${(index % 8) + 1}`;
                const visual = getItemVisual(catName, index);
                const VisualIcon = visual.icon;

                const unitPrice = (item as any).unitPrice ?? (item as any).price ?? 0;
                const itemDiscount = (item as any).discountAmount ?? (item as any).discount ?? 0;
                const lineTotal = item.qty * unitPrice - itemDiscount;

                return (
                  <tr
                    key={`${item.productId}-${index}`}
                    onClick={() => onSelectCartRow(item.productId)}
                    className={`transition-colors group cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-slate-800/90 font-bold ring-1 ring-inset ring-blue-400/40'
                        : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* 1. الترقيم */}
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-sm">
                      {index + 1}
                    </td>

                    {/* 2. التعيين والتفاصيل */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-8 h-8 rounded-lg ${visual.colorClass} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                        >
                          <VisualIcon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-white text-sm truncate">
                            {item.name}
                            {(item as any).variantName && (
                              <span className="mr-1.5 text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded font-mono font-bold">
                                {(item as any).variantName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-300">
                              {catName}
                            </span>
                            <span>•</span>
                            <span>الرف: {shelf}</span>
                          </div>

                          {/* فئات الأسعار السريعة للبند إذا توفرت */}
                          {prod && !item.isPack && onEditPrice && (
                            <div
                              className="flex items-center gap-1 mt-1 flex-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[10px] text-slate-400 font-bold">السعر:</span>
                              {(!enabledPriceTiers || enabledPriceTiers.includes('1')) && (
                                <button
                                  type="button"
                                  onClick={() => onEditPrice(item.productId, getProductTierPrice(prod, '1'))}
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    unitPrice === getProductTierPrice(prod, '1')
                                      ? 'bg-blue-600 text-white shadow-2xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-500/20'
                                  }`}
                                  title={`س1: ${formatMoney(getProductTierPrice(prod, '1'))}`}
                                >
                                  س1
                                </button>
                              )}
                              {(!enabledPriceTiers || enabledPriceTiers.includes('2')) && (
                                <button
                                  type="button"
                                  onClick={() => onEditPrice(item.productId, getProductTierPrice(prod, '2'))}
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    unitPrice === getProductTierPrice(prod, '2')
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/20'
                                  }`}
                                  title={`س2: ${formatMoney(getProductTierPrice(prod, '2'))}`}
                                >
                                  س2
                                </button>
                              )}
                              {(!enabledPriceTiers || enabledPriceTiers.includes('3')) && (
                                <button
                                  type="button"
                                  onClick={() => onEditPrice(item.productId, getProductTierPrice(prod, '3'))}
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    unitPrice === getProductTierPrice(prod, '3')
                                      ? 'bg-purple-600 text-white shadow-2xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-500/20'
                                  }`}
                                  title={`س3: ${formatMoney(getProductTierPrice(prod, '3'))}`}
                                >
                                  س3
                                </button>
                              )}
                              {(!enabledPriceTiers || enabledPriceTiers.includes('4')) && (
                                <button
                                  type="button"
                                  onClick={() => onEditPrice(item.productId, getProductTierPrice(prod, '4'))}
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono transition cursor-pointer ${
                                    unitPrice === getProductTierPrice(prod, '4')
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/20'
                                  }`}
                                  title={`س4: ${formatMoney(getProductTierPrice(prod, '4'))}`}
                                >
                                  س4
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. الباركود */}
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-300 text-xs bg-slate-50/50 dark:bg-slate-900/50">
                      <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 inline-block font-mono">
                        {barcode}
                      </span>
                    </td>

                    {/* 4. الكمية */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 w-32 mx-auto shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                          className="w-7 h-7 rounded bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-slate-600 dark:text-slate-200 active:scale-95 shadow-2xs transition cursor-pointer"
                          title="إنقاص الكمية (-)"
                        >
                          -
                        </button>
                        <span
                          onClick={() => onOpenKeypadForQty && onOpenKeypadForQty(item)}
                          className="w-10 text-center font-bold text-slate-900 dark:text-white text-sm font-mono cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="تعديل الكمية يدوياً"
                        >
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                          className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-700 flex items-center justify-center font-bold text-white active:scale-95 shadow-2xs transition cursor-pointer"
                          title="زيادة الكمية (+)"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* 5. سعر الوحدة */}
                    <td className="py-3 px-4 text-left font-mono font-semibold text-slate-700 dark:text-slate-200 text-sm">
                      {formatMoney(unitPrice)} {currency}
                    </td>

                    {/* 6. نسبة التخفيض */}
                    <td className="py-3 px-3 text-center">
                      {itemDiscount > 0 ? (
                        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-semibold border border-emerald-200 dark:border-emerald-800/60">
                          -{formatMoney(itemDiscount)} {currency}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          0,00 {currency}
                        </span>
                      )}
                    </td>

                    {/* 7. المجموع الإجمالي */}
                    <td className="py-3 px-4 text-left font-mono font-bold text-blue-700 dark:text-blue-400 text-base">
                      {formatMoney(lineTotal)} {currency}
                    </td>

                    {/* 8. إجراء */}
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onRemoveFromCart(item.productId)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center mx-auto transition cursor-pointer"
                        title="حذف السطر"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BEGIN: ملخص الحسابات السفلي للفاتورة الحالية */}
      <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2.5 text-xs shrink-0 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* الجانب الأيمن (في RTL): إحصائيات القطع والمواد والخصم */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">عدد المواد:</span>
              <strong
                className="text-slate-900 dark:text-white font-mono text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-md shadow-2xs"
                id="summary-items-count"
              >
                {totalItemsCount}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">إجمالي القطع:</span>
              <strong
                className="text-slate-900 dark:text-white font-mono text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-md shadow-2xs"
                id="summary-qty-count"
              >
                {totalUnitsCount}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">مجموع السلع الخام:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">
                {formatMoney(subtotal)} {currency}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">التخفيض المطبق:</span>
              <strong
                className={`font-mono text-sm px-2 py-0.5 rounded border ${
                  discountAmount > 0
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                    : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                -{discountAmount > 0 ? formatMoney(discountAmount) : '0,00'} {currency}
              </strong>
            </div>
          </div>

          {/* الجانب الأيسر (في RTL): طريقة الدفع + بطاقة المبلغ الصافي المستحق */}
          <div className="flex items-center gap-3 sm:gap-4 mr-auto">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
              <Banknote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                طريقة الدفع: <strong className="text-slate-800 dark:text-white">نقداً (Cash)</strong>
              </span>
            </div>

            <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white rounded-xl px-5 py-2 flex items-center gap-4 shadow-md">
              <div className="text-right">
                <span className="text-blue-200 text-[11px] block">المبلغ الصافي المستحق</span>
                <span className="text-[10px] text-blue-300 font-medium">(شامل الرسم على القيمة المضافة)</span>
              </div>
              <div className="font-mono font-black text-2xl text-white">
                {formatMoney(totalAmount)}{' '}
                <span className="text-sm font-sans font-bold text-blue-200">{currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* END: ملخص الحسابات السفلي */}
    </div>
  );
});

export default ClassicPOSCartTable;
