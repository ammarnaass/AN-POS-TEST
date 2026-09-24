import React, { useState } from 'react';
import {
  Package,
  RotateCcw,
  Banknote,
  UserCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import type { CartItem } from '@/types';
import { type RefundMethod, DEFAULT_RETURN_REASONS } from '../types';

export interface POSReturnGoodsConfirmationProps {
  cart: CartItem[];
  formatMoney: (val: number) => string;
  total?: number;
  returnReason: string;
  customReason: string;
  onChangeReason: (reason: string) => void;
  onChangeCustomReason: (custom: string) => void;
  refundMethod: RefundMethod;
  onChangeRefundMethod: (method: RefundMethod) => void;
  originalSaleNumber?: string;
  matchedCustomer?: { id: string; name: string; balance?: number } | null;
  goodsCondition?: 'restock' | 'damaged';
  onChangeGoodsCondition?: (condition: 'restock' | 'damaged') => void;
}

export const POSReturnGoodsConfirmation: React.FC<POSReturnGoodsConfirmationProps> = ({
  cart,
  formatMoney,
  total,
  returnReason,
  customReason,
  onChangeReason,
  onChangeCustomReason,
  refundMethod,
  onChangeRefundMethod,
  originalSaleNumber,
  matchedCustomer,
  goodsCondition,
  onChangeGoodsCondition,
}) => {
  const [isItemsExpanded, setIsItemsExpanded] = useState(true);
  const [internalCondition, setInternalCondition] = useState<'restock' | 'damaged'>('restock');

  const currentCondition = goodsCondition ?? internalCondition;

  const handleSetCondition = (cond: 'restock' | 'damaged') => {
    setInternalCondition(cond);
    onChangeGoodsCondition?.(cond);
  };

  // إجمالي القطع المسترجعة
  const totalPieces = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalItemsCount = cart.length;

  // احتساب الإجمالي الفعلي للمرتجع إذا لم يمرر
  const effectiveTotal =
    total !== undefined
      ? total
      : cart.reduce((sum, item) => {
          const qty = Number(item.qty) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          return sum + Number(item.lineTotal ?? qty * unitPrice);
        }, 0);

  return (
    <div className="space-y-4" data-testid="pos-return-goods-confirmation">
      {/* 1. بطاقة رقم الفاتورة الأصلية إن وجدت */}
      {originalSaleNumber && (
        <div className="p-3 rounded-2xl bg-surface-container border border-outline-variant/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-bold text-on-surface">مرتجع مرتبط بالفاتورة الأصلية:</span>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-mono font-extrabold text-xs">
            #{originalSaleNumber}
          </span>
        </div>
      )}

      {/* 2. قسم تأكيد البضائع المسترجعة وتوثيق حالتها */}
      {cart && cart.length > 0 && (
        <div className="rounded-2xl border border-rose-500/25 bg-surface-container overflow-hidden shadow-2xs">
          {/* شريط رأس البضائع وقابلية الطي */}
          <div
            onClick={() => setIsItemsExpanded(!isItemsExpanded)}
            className="p-3.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
              <Package className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-bold">
                تأكيد استرجاع البضاعة ({totalItemsCount} صنف • {totalPieces} قطعة)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  currentCondition === 'restock'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                }`}
              >
                {currentCondition === 'restock' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>حالة المخزون: متاح للبيع</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>حالة المخزون: تالف / مستبعد</span>
                  </>
                )}
              </span>
              {isItemsExpanded ? (
                <ChevronUp className="w-4 h-4 text-on-surface-variant" />
              ) : (
                <ChevronDown className="w-4 h-4 text-on-surface-variant" />
              )}
            </div>
          </div>

          {/* محدد حالة البضاعة المسترجعة (فحص جودة البضاعة) */}
          <div className="px-3.5 py-2.5 bg-surface-container-low/70 border-b border-outline-variant/15 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
              <span>حالة البضاعة المسترجعة:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSetCondition('restock')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  currentCondition === 'restock'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/20'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>إعادة للمخزون فورياً</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetCondition('damaged')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  currentCondition === 'damaged'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/20'
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                <span>تالفة / معيبة (تجنيب الهالك)</span>
              </button>
            </div>
          </div>

          {/* تنبيه عند اختيار البضاعة التالفة */}
          {currentCondition === 'damaged' && (
            <div className="p-2.5 bg-rose-500/10 border-b border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>
                تنبيه: تم تحديد البضاعة كتالفة، سيتم تسجيلها في التوالف وتجنيبها دون إضافتها للرصيد المتاح للبيع.
              </span>
            </div>
          )}

          {/* قائمة بنود البضائع المسترجعة */}
          {isItemsExpanded && (
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-surface-container-low/50">
              {cart.map((item, idx) => {
                const qty = Number(item.qty) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                const lineTotal = Number(item.lineTotal ?? qty * unitPrice);

                return (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 pr-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface truncate">{item.name}</span>
                        {item.barcode && (
                          <span className="text-[10px] font-mono text-on-surface-variant opacity-70">
                            [{item.barcode}]
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-on-surface-variant flex items-center gap-2">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          +{qty} {item.unit || 'قطعة'}
                        </span>
                        <span>× {formatMoney(unitPrice)} دج</span>
                      </div>
                    </div>

                    <div className="text-left font-mono shrink-0 pl-1">
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 text-xs">
                        {formatMoney(lineTotal)} دج
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. سبب الإرجاع */}
      <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2">
        <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5 text-primary" />
          <span>سبب الإرجاع:</span>
        </label>
        <select
          aria-label="سبب الإرجاع"
          value={returnReason}
          onChange={(e) => onChangeReason(e.target.value)}
          className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {DEFAULT_RETURN_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {returnReason === 'أخرى' && (
          <input
            type="text"
            placeholder="اكتب سبب الإرجاع التفصيلي هنا..."
            value={customReason}
            onChange={(e) => onChangeCustomReason(e.target.value)}
            className="w-full h-8 px-3 bg-surface-container-low border border-outline-variant/25 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        )}
      </div>

      {/* 4. اختيار طريقة صرف واسترداد المبلغ للزبون */}
      <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-3">
        <label className="text-xs font-bold text-on-surface block">
          طريقة صرف المبلغ المسترجع للزبون:
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onChangeRefundMethod('cash')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              refundMethod === 'cash'
                ? 'bg-primary text-on-primary border-primary shadow-xs ring-2 ring-primary/20'
                : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
            }`}
          >
            <Banknote className="w-5 h-5" />
            <span>نقداً من الخزينة</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeRefundMethod('customer_credit')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              refundMethod === 'customer_credit'
                ? 'bg-primary text-on-primary border-primary shadow-xs ring-2 ring-primary/20'
                : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span>قيد في حساب الزبون</span>
          </button>
        </div>

        {/* بطاقة الشرح المحاسبي والتأثير المالي اللحظي */}
        <div className="p-2.5 rounded-xl bg-surface-container-low text-[11px] text-on-surface-variant leading-relaxed border border-outline-variant/15">
          {refundMethod === 'cash' ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Banknote className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface block font-bold">صرف نقدي فوري:</strong>
                  سيتم خصم قيمة المرتجع من درج نقدية المناوبة الحالية وتسليمها للزبون نقداً،{' '}
                  <span className="text-emerald-600 font-bold">دون المساس برصيد ديون الزبون</span>.
                </div>
              </div>
              <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-on-surface-variant">المبلغ المنصرف من الدرج:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                  -{formatMoney(effectiveTotal)} دج
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <UserCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface block font-bold">قيد كرصيد في حساب الزبون:</strong>
                  سيتم خصم قيمة المرتجع من ديون الزبون السابقة أو قيدها كرصيد دائن لصالحه في كشف الحساب،{' '}
                  <span className="text-amber-600 font-bold">ولن يخرج أي نقد من صندوق الكاشير</span>.
                </div>
              </div>
              {matchedCustomer ? (
                <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-xs">
                  <span className="text-on-surface font-bold">الزبون: {matchedCustomer.name}</span>
                  <span className="font-mono text-primary font-bold">
                    الرصيد المسجل: {formatMoney(matchedCustomer.balance || 0)} دج
                  </span>
                </div>
              ) : (
                <div className="pt-2 border-t border-outline-variant/15 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                  * يرجى تحديد حساب الزبون في قسم الدفع أدناه لإتمام القيد.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
