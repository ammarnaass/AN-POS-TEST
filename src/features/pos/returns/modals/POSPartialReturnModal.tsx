import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, AlertCircle, X, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { formatMoney } from '@/features/pos/utils/format';
import type { Sale } from '@/types';
import type { POSPartialReturnModalProps, RefundMethod } from '../types';
import {
  buildAlreadyReturnedMap,
  resolveEffectiveReason,
} from '../services/posReturnCalculationService';
import { useReturnItemSelection } from '../hooks/useReturnItemSelection';
import { ReturnItemsTable } from '../components/ReturnItemsTable';
import { ReturnReasonSelector } from '../components/ReturnReasonSelector';
import { RefundMethodSelector } from '../components/RefundMethodSelector';
import { ReturnFinancialSummary } from '../components/ReturnFinancialSummary';

const EMPTY_RETURNS: Sale[] = [];

export const POSPartialReturnModal: React.FC<POSPartialReturnModalProps> = ({
  isOpen,
  onClose,
  sale,
  onConfirmReturn,
  onLoadToCart,
}) => {
  const [returnReason, setReturnReason] = useState('طلب الزبون (تراجع عن الشراء)');
  const [customReason, setCustomReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('cash');

  // استعلام عن المرتجعات السابقة لنفس الفاتورة لمعرفة الكميات المرتجعة مسبقاً
  const { data: previousReturns = EMPTY_RETURNS } = useQuery<Sale[]>({
    queryKey: ['sales', 'returns-for-sale', sale?.id],
    queryFn: async () => {
      if (!sale?.id) return [];
      const all = await db.sales.toArray();
      return all.filter(
        (s) => s.originalSaleId === sale.id || s.note?.includes(`مرتجع للفاتورة #${sale.number}`)
      );
    },
    enabled: Boolean(isOpen && sale?.id),
  });

  // حساب الكميات المرتجعة سابقاً لكل منتج
  const alreadyReturnedMap = useMemo(() => {
    return buildAlreadyReturnedMap(previousReturns);
  }, [previousReturns]);

  // خطاف إدارة تحديد بنود المرتجع وتعديل الكميات
  const {
    items,
    selectedItems,
    summary,
    toggleSelectAll,
    toggleItem,
    updateQty,
    setAllToFullQty,
    setAllToOneQty,
    prepareCartItems,
  } = useReturnItemSelection({
    sale,
    isOpen,
    alreadyReturnedMap,
  });

  // تعيين طريقة الاسترداد الافتراضية بحسب وجود حساب للزبون
  useEffect(() => {
    if (!isOpen || !sale) return;

    if (sale.customerId) {
      setRefundMethod(sale.paymentMethod === 'credit' ? 'customer_credit' : 'cash');
    } else {
      setRefundMethod('cash');
    }
  }, [isOpen, sale?.id]);

  if (!isOpen || !sale) return null;

  const effectiveReason = resolveEffectiveReason(returnReason, customReason);
  const hasPriorReturns = (previousReturns?.length ?? 0) > 0;

  const handleDirectConfirm = () => {
    if (selectedItems.length === 0) return;
    onConfirmReturn({
      returnItems: prepareCartItems(),
      originalSale: sale,
      reason: effectiveReason,
      refundMethod,
    });
    onClose();
  };

  const handleLoadToCart = () => {
    if (selectedItems.length === 0) return;
    if (onLoadToCart) {
      onLoadToCart({
        returnItems: prepareCartItems(),
        originalSale: sale,
        reason: effectiveReason,
        refundMethod,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-on-surface">إرجاع جزئي / مخصص للفاتورة</h3>
                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold">
                  #{sale.number}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                تاريخ البيع: {new Date(sale.date).toLocaleDateString('ar-DZ')}
                {sale.customerName ? ` • الزبون: ${sale.customerName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="إلغاء (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Prior Returns Notification */}
          {hasPriorReturns && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                تنبيه: تم تسجيل <strong>{previousReturns.length}</strong> مرتجع(ات) سابقة لهذه الفاتورة. الكميات المتاحة للإرجاع أدناه محسوبة بعد خصم المرتجعات السابقة تلقائياً.
              </span>
            </div>
          )}

          {/* Table of items */}
          <ReturnItemsTable
            items={items}
            onToggleSelectAll={toggleSelectAll}
            onToggleItem={toggleItem}
            onUpdateQty={updateQty}
            onSetAllToFullQty={setAllToFullQty}
            onSetAllToOneQty={setAllToOneQty}
          />

          {/* Reason & Refund Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReturnReasonSelector
              returnReason={returnReason}
              customReason={customReason}
              onChangeReason={setReturnReason}
              onChangeCustomReason={setCustomReason}
            />

            <RefundMethodSelector
              refundMethod={refundMethod}
              onChangeMethod={setRefundMethod}
              hasCustomer={Boolean(sale.customerId)}
            />
          </div>

          {/* Refund Financial Summary Dominant Banner */}
          <ReturnFinancialSummary summary={summary} />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-surface-container border-t border-outline-variant/15 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
          >
            إلغاء
          </button>
          {onLoadToCart && (
            <button
              type="button"
              onClick={handleLoadToCart}
              disabled={selectedItems.length === 0}
              className="py-2.5 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span>تحميل للسلة للمعاينة</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDirectConfirm}
            disabled={selectedItems.length === 0}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>تأكيد واسترداد فوري ({formatMoney(summary.totalAmount)} دج)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
