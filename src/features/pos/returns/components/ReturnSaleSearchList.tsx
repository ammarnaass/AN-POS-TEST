import React, { useState } from 'react';
import {
  Search,
  Loader2,
  Barcode,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Package,
  AlertCircle,
  CheckCircle2,
  X,
  User,
  Clock,
} from 'lucide-react';
import { formatNumber, formatMoney } from '@/features/pos/utils/format';
import type { Sale } from '@/types';
import type { ReturnSearchResultItem } from '../types';

export interface ReturnSaleSearchListProps {
  results?: ReturnSearchResultItem[];
  sales?: Sale[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectSale: (sale: Sale) => void;
  onQuickFullReturn?: (sale: Sale) => void;
  onLoadToCart?: (sale: Sale) => void;
  onBarcodeSubmit?: (barcode: string) => void;
}

export const ReturnSaleSearchList: React.FC<ReturnSaleSearchListProps> = ({
  results,
  sales: legacySales,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelectSale,
  onQuickFullReturn,
  onLoadToCart,
  onBarcodeSubmit,
}) => {
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // دعم التوافقية العكسية إذا تم تمرير sales بدلاً من results
  const items: ReturnSearchResultItem[] = React.useMemo(() => {
    if (results && results.length > 0) return results;
    if (legacySales && legacySales.length > 0) {
      return legacySales.map((s) => ({
        sale: s,
        alreadyReturnedCount: 0,
        totalPieces: s.items?.reduce((sum, i) => sum + (Number(i.qty) || 0), 0) || 0,
        remainingReturnablePieces: s.items?.reduce((sum, i) => sum + (Number(i.qty) || 0), 0) || 0,
        isFullyReturned: false,
        hasPriorReturns: false,
      }));
    }
    return [];
  }, [results, legacySales]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onBarcodeSubmit && searchQuery.trim()) {
        onBarcodeSubmit(searchQuery.trim());
      }
    }
  };

  const toggleExpand = (saleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSaleId((prev) => (prev === saleId ? null : saleId));
  };

  return (
    <div className="space-y-3">
      {/* حقل البحث مع زر المسح وقارئ الباركود */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="بحث برقم الفاتورة، اسم الزبون، باركود الوصل، أو اسم/باركود الصنف..."
          className="w-full h-11 pr-10 pl-10 bg-surface-container border border-outline-variant/25 rounded-2xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-red-500/25 transition-all"
          autoFocus
        />
        <Search className="w-4 h-4 text-on-surface-variant/60 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 flex items-center gap-1 text-[10px] pointer-events-none"
            title="يدعم المسح المباشر بقارئ الباركود"
          >
            <Barcode className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* قائمة الفواتير المطابقة */}
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-0.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant text-xs gap-2.5">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>جارٍ البحث في فواتير المبيعات...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant text-xs space-y-1 bg-surface-container/40 rounded-2xl border border-dashed border-outline-variant/20">
            <p className="font-bold text-on-surface">لم يتم العثور على فواتير مطابقة</p>
            <p className="text-[11px]">
              تأكد من رقم الفاتورة أو اسم الصنف، أو جرّب تغيير فترة التاريخ أو تصفية الأهلية.
            </p>
          </div>
        ) : (
          items.slice(0, 50).map(({ sale, remainingReturnablePieces, isFullyReturned, hasPriorReturns, matchedItemNames, alreadyReturnedCount, priorReturns }) => {
            const isExpanded = expandedSaleId === sale.id;
            const itemsCount = sale.items?.length || 0;

            return (
              <div
                key={sale.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isFullyReturned
                    ? 'bg-surface-container/40 border-outline-variant/15 opacity-75'
                    : 'bg-surface-container border-outline-variant/20 hover:border-red-500/35 hover:shadow-xs'
                }`}
              >
                {/* البطاقة الرئيسية */}
                <div
                  onClick={() => !isFullyReturned && onSelectSale(sale)}
                  className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isFullyReturned ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {/* معلومات الفاتورة */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-on-surface font-mono">
                        #{sale.number}
                      </span>

                      {/* شارات الحالة والأهلية */}
                      {isFullyReturned ? (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-700 dark:text-red-300 text-[10px] font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>مسترجع بالكامل</span>
                        </span>
                      ) : hasPriorReturns ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          <span>مرتجع جزئي سابق ({alreadyReturnedCount})</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>متاح للإرجاع</span>
                        </span>
                      )}

                      {/* شارة طريقة الدفع */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          sale.paymentMethod === 'credit'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {sale.paymentMethod === 'credit' ? 'آجل (دين)' : 'نقداً'}
                      </span>
                    </div>

                    {/* بيانات الزبون والتاريخ */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span>{new Date(sale.date).toLocaleDateString('ar-DZ')}</span>
                        <span>{new Date(sale.date).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>

                      {sale.customerName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 opacity-60" />
                          <span className="font-medium text-on-surface">{sale.customerName}</span>
                        </span>
                      )}

                      <span>• {itemsCount} صنف/أصناف ({remainingReturnablePieces} متبقية)</span>

                      {sale.soldBy && <span>• البائع: {sale.soldBy}</span>}
                    </div>

                    {/* إبراز الصنف المطابق عند البحث بالمنتج */}
                    {matchedItemNames && matchedItemNames.length > 0 && (
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md font-medium">
                          <Package className="w-2.5 h-2.5" />
                          <span>يحتوي على: {matchedItemNames.slice(0, 2).join('، ')}</span>
                          {matchedItemNames.length > 2 && ` (+${matchedItemNames.length - 2})`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* المبلغ وإجراءات الفاتورة */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-outline-variant/10">
                    <div className="text-right sm:text-left">
                      <div className="text-xs font-bold text-primary font-mono">
                        {formatMoney(sale.total)} دج
                      </div>
                    </div>

                    {/* أزرار الإجراءات السريعة */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* زر توسيع تفاصيل الأصناف والمرتجعات */}
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(sale.id, e)}
                        className="px-2 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                        title="معاينة أصناف وسجل إرجاعات الفاتورة"
                      >
                        <span>التفاصيل</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {/* زر التحميل للسلة */}
                      {onLoadToCart && !isFullyReturned && (
                        <button
                          type="button"
                          onClick={() => onLoadToCart(sale)}
                          className="p-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors cursor-pointer"
                          title="تحميل البنود إلى سلة البيع"
                        >
                          <Package className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* زر الإرجاع الكامل الفوري */}
                      {onQuickFullReturn && !isFullyReturned && (
                        <button
                          type="button"
                          onClick={() => onQuickFullReturn(sale)}
                          className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-[10px] font-bold transition-colors cursor-pointer"
                          title="إرجاع كامل الفاتورة بنقرة واحدة"
                        >
                          إرجاع كامل
                        </button>
                      )}

                      {/* زر الإرجاع الجزئي/المخصص (الأساسي) */}
                      {!isFullyReturned && (
                        <button
                          type="button"
                          onClick={() => onSelectSale(sale)}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>إرجاع مخصص</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* درج استعراض بنود الفاتورة والعمليات المرتجعة الموسّع */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/15 text-xs animate-in slide-in-from-top-1 duration-150 space-y-3">
                    {/* بنود الفاتورة الأصلية */}
                    {Array.isArray(sale.items) && (
                      <div>
                        <div className="font-bold text-[11px] text-on-surface-variant mb-1.5 flex items-center justify-between">
                          <span>بنود الفاتورة الأصلية (#{sale.number}):</span>
                          <span className="font-mono text-[10px]">{sale.items.length} صنف</span>
                        </div>

                        <div className="divide-y divide-outline-variant/10 max-h-36 overflow-y-auto custom-scrollbar">
                          {sale.items.map((item, idx) => (
                            <div key={idx} className="py-1.5 flex items-center justify-between text-[11px]">
                              <div className="min-w-0 pr-2">
                                <p className="font-medium text-on-surface truncate">{item.name}</p>
                                {(item as any).barcode && (
                                  <p className="text-[9px] text-on-surface-variant font-mono">
                                    باركود: {(item as any).barcode}
                                  </p>
                                )}
                              </div>
                              <div className="text-left font-mono shrink-0">
                                <span className="text-on-surface-variant">
                                  {formatNumber(item.qty)} {item.unit || 'قطعة'} × {formatMoney(item.unitPrice)} دج
                                </span>
                                <span className="block font-bold text-on-surface">
                                  = {formatMoney(item.lineTotal || (item.qty * item.unitPrice))} دج
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* سجل المرتجعات السابقة الخاصة بهذه الفاتورة إن وجدت */}
                    {priorReturns && priorReturns.length > 0 && (
                      <div className="pt-2 border-t border-outline-variant/15">
                        <div className="font-bold text-[11px] text-amber-800 dark:text-amber-300 mb-1.5 flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>سجل المرتجعات السابقة المنجزة ({priorReturns.length}):</span>
                        </div>

                        <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                          {priorReturns.map((ret) => (
                            <div
                              key={ret.id}
                              className="p-2 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center justify-between text-[10px]"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-on-surface">#{ret.number}</span>
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                                    {ret.paymentMethod === 'credit' || (ret as any).refundMethod === 'customer_credit'
                                      ? 'قيد في حساب الزبون'
                                      : 'مسترد نقداً من الخزينة'}
                                  </span>
                                </div>
                                <div className="text-on-surface-variant text-[9px]">
                                  {new Date(ret.date).toLocaleDateString('ar-DZ')} {new Date(ret.date).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                                  {ret.note ? ` • ${ret.note}` : ''}
                                </div>
                              </div>
                              <div className="font-mono font-bold text-red-600 dark:text-red-400 text-xs shrink-0">
                                -{formatMoney(ret.total)} دج
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
