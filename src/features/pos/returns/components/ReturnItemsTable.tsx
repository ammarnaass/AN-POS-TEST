import React from 'react';
import { CheckSquare, Square, Plus, Minus, Layers, Hash } from 'lucide-react';
import { formatNumber, formatMoney } from '@/features/pos/utils/format';
import type { ReturnItemSelection } from '../types';

export interface ReturnItemsTableProps {
  items: ReturnItemSelection[];
  onToggleSelectAll: () => void;
  onToggleItem: (productId: string) => void;
  onUpdateQty: (productId: string, newQty: number) => void;
  onSetAllToFullQty?: () => void;
  onSetAllToOneQty?: () => void;
}

export const ReturnItemsTable: React.FC<ReturnItemsTableProps> = ({
  items,
  onToggleSelectAll,
  onToggleItem,
  onUpdateQty,
  onSetAllToFullQty,
  onSetAllToOneQty,
}) => {
  const returnableItems = items.filter((i) => i.maxReturnableQty > 0);
  const allSelected = returnableItems.length > 0 && returnableItems.every((i) => i.isSelected);
  const selectedCount = items.filter((i) => i.isSelected && i.selectedQty > 0).length;

  const totalSoldPieces = items.reduce((sum, i) => sum + i.originalQty, 0);
  const totalSelectedPieces = items.reduce((sum, i) => sum + (i.isSelected ? i.selectedQty : 0), 0);

  return (
    <div className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-surface-container/50 space-y-0">
      {/* شريط التحكم السريع واختيار الكميات */}
      <div className="px-4 py-2.5 bg-surface-container border-b border-outline-variant/15 flex flex-wrap items-center justify-between gap-2">
        {/* تحديد / إلغاء تحديد الكل */}
        <button
          type="button"
          onClick={onToggleSelectAll}
          className="flex items-center gap-2 text-xs font-bold text-primary hover:underline cursor-pointer"
        >
          {allSelected ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4 text-on-surface-variant" />
          )}
          <span>تحديد / إلغاء تحديد كافة الأصناف ({returnableItems.length})</span>
        </button>

        {/* أزرار تعيين الكمية السريعة: كامل الأعداد الحقيقية مقابل قطعة واحدة */}
        <div className="flex items-center gap-1.5 text-xs">
          {onSetAllToFullQty && (
            <button
              type="button"
              onClick={onSetAllToFullQty}
              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              title="إرجاع كامل الكميات المباعة بعددها الحقيقي"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>الكميات كاملة (العدد الحقيقي)</span>
            </button>
          )}

          {onSetAllToOneQty && (
            <button
              type="button"
              onClick={onSetAllToOneQty}
              className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-medium transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              title="تحديد قطعة واحدة فقط لكل صنف للإرجاع الجزئي"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>قطعة واحدة فقط</span>
            </button>
          )}
        </div>
      </div>

      {/* ملخص أعداد القطع المحددة */}
      <div className="px-4 py-1.5 bg-surface-container-low/60 border-b border-outline-variant/10 flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
        <span>تم تحديد {selectedCount} من {items.length} صنف</span>
        <span className="font-mono">
          إجمالي القطع المحددة للإرجاع: <strong className="text-red-600 font-bold text-xs">{totalSelectedPieces}</strong> من {totalSoldPieces} قطعة مباعة
        </span>
      </div>

      {/* جدول بنود الفاتورة */}
      <div className="divide-y divide-outline-variant/10 max-h-64 overflow-y-auto custom-scrollbar">
        {items.map((item) => {
          const isFullyReturned = item.maxReturnableQty <= 0;
          return (
            <div
              key={item.productId}
              className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                isFullyReturned
                  ? 'opacity-50 bg-surface-container/20'
                  : item.isSelected
                  ? 'bg-red-500/5'
                  : 'hover:bg-surface-container/40'
              }`}
            >
              {/* مربع الاختيار وبيانات الصنف */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  disabled={isFullyReturned}
                  onClick={() => onToggleItem(item.productId)}
                  className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {item.isSelected ? (
                    <CheckSquare className="w-4 h-4 text-red-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-on-surface truncate">{item.name}</p>
                    {item.isPack && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/10 text-indigo-600 font-bold">
                        طرد
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-on-surface-variant mt-0.5">
                    <span>السعر: {formatMoney(item.unitPrice)} دج</span>
                    <span>•</span>
                    <span>المباع أصلاً: <strong className="font-mono text-on-surface font-bold">{item.originalQty}</strong></span>
                    <span>•</span>
                    <span>المتبقي للإرجاع: <strong className="font-mono text-emerald-600 font-bold">{item.maxReturnableQty}</strong></span>
                    {item.alreadyReturnedQty > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600 font-bold">أُرجع سابقاً: {item.alreadyReturnedQty}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* عداد الكمية المسترجعة */}
              {isFullyReturned ? (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-1 rounded-lg">
                  أُرجع كاملاً
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-outline-variant/20 rounded-xl overflow-hidden bg-surface-container-low shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.productId, item.selectedQty - 1)}
                      disabled={item.selectedQty <= 1}
                      className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 cursor-pointer"
                      title="تقليل الكمية"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.maxReturnableQty}
                      value={item.selectedQty}
                      onChange={(e) => onUpdateQty(item.productId, parseInt(e.target.value, 10) || 1)}
                      className="w-12 text-center font-mono font-bold text-xs bg-transparent text-on-surface focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.productId, item.selectedQty + 1)}
                      disabled={item.selectedQty >= item.maxReturnableQty}
                      className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 cursor-pointer"
                      title="زيادة الكمية"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="w-24 text-left">
                    <span className="text-xs font-bold text-red-600 font-mono">
                      {formatMoney(item.selectedQty * item.unitPrice)} دج
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
