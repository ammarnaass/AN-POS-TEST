import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  CheckSquare,
  Square,
  AlertCircle,
  Plus,
  Minus,
  X,
  Banknote,
  UserCheck,
  Package,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { formatNumber, formatMoney } from '../utils/format';
import type { Sale, CartItem } from '@/types';

export interface ReturnItemSelection {
  productId: string;
  name: string;
  unitPrice: number;
  originalQty: number;
  alreadyReturnedQty: number;
  maxReturnableQty: number;
  selectedQty: number;
  isSelected: boolean;
  unit?: string;
  barcode?: string;
  isPack?: boolean;
  packId?: string;
  packQty?: number;
  packUnit?: string;
}

interface PartialReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onConfirmReturn: (params: {
    returnItems: CartItem[];
    originalSale: Sale;
    reason: string;
    refundMethod: 'cash' | 'customer_credit';
  }) => void;
  onLoadToCart?: (params: {
    returnItems: CartItem[];
    originalSale: Sale;
    reason: string;
    refundMethod: 'cash' | 'customer_credit';
  }) => void;
}

const EMPTY_RETURNS: Sale[] = [];

export const PartialReturnModal: React.FC<PartialReturnModalProps> = ({
  isOpen,
  onClose,
  sale,
  onConfirmReturn,
  onLoadToCart,
}) => {
  const [items, setItems] = useState<ReturnItemSelection[]>([]);
  const [returnReason, setReturnReason] = useState('طلب الزبون (تراجع عن الشراء)');
  const [customReason, setCustomReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'customer_credit'>('cash');

  // استعلام عن المرتجعات السابقة لنفس الفاتورة لمعرفة الكميات المرتجعة مسبقاً
  const { data: previousReturns = EMPTY_RETURNS } = useQuery<Sale[]>({
    queryKey: ['sales', 'returns-for-sale', sale?.id],
    queryFn: async () => {
      if (!sale?.id) return [];
      const all = await db.sales.toArray();
      return all.filter((s) => s.originalSaleId === sale.id || s.note?.includes(`مرتجع للفاتورة #${sale.number}`));
    },
    enabled: Boolean(isOpen && sale?.id),
  });

  // حساب الكميات المرتجعة سابقاً لكل منتج
  const alreadyReturnedMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!previousReturns || !Array.isArray(previousReturns)) return map;
    for (const retSale of previousReturns) {
      if (Array.isArray(retSale.items)) {
        for (const item of retSale.items) {
          const prev = map.get(item.productId) || 0;
          map.set(item.productId, prev + (Number(item.qty) || 0));
        }
      }
    }
    return map;
  }, [previousReturns]);

  // تهيئة الأصناف عند فتح النافذة أو تغير الفاتورة
  useEffect(() => {
    if (!isOpen || !sale) {
      setItems((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const initialSelections: ReturnItemSelection[] = (sale.items || []).map((item) => {
      const alreadyReturnedQty = alreadyReturnedMap.get(item.productId) || 0;
      const originalQty = Number(item.qty) || 1;
      const maxReturnableQty = Math.max(0, originalQty - alreadyReturnedQty);

      return {
        productId: item.productId,
        name: item.name,
        unitPrice: Number(item.unitPrice) || 0,
        originalQty,
        alreadyReturnedQty,
        maxReturnableQty,
        selectedQty: maxReturnableQty > 0 ? 1 : 0,
        isSelected: maxReturnableQty > 0,
        unit: item.unit,
        barcode: (item as any).barcode || '',
        isPack: item.isPack,
        packId: item.packId,
        packQty: item.packQty,
        packUnit: item.packUnit,
      };
    });

    setItems(initialSelections);

    // إذا كان للزبون حساب مسجل، نتيح له خيار إضافة الرصيد الدائن
    if (sale.customerId) {
      setRefundMethod(sale.paymentMethod === 'credit' ? 'customer_credit' : 'cash');
    } else {
      setRefundMethod('cash');
    }
  }, [isOpen, sale?.id, alreadyReturnedMap]);

  if (!isOpen || !sale) return null;

  const toggleSelectAll = () => {
    const allSelected = items.filter((i) => i.maxReturnableQty > 0).every((i) => i.isSelected);
    setItems((prev) =>
      prev.map((i) =>
        i.maxReturnableQty > 0 ? { ...i, isSelected: !allSelected } : i
      )
    );
  };

  const toggleItem = (productId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.maxReturnableQty > 0
          ? { ...i, isSelected: !i.isSelected }
          : i
      )
    );
  };

  const updateQty = (productId: string, newQty: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const clamped = Math.max(1, Math.min(i.maxReturnableQty, newQty));
        return { ...i, selectedQty: clamped, isSelected: true };
      })
    );
  };

  const selectedItems = items.filter((i) => i.isSelected && i.selectedQty > 0);
  const totalReturnAmount = selectedItems.reduce(
    (sum, i) => sum + i.selectedQty * i.unitPrice,
    0
  );
  const totalPieces = selectedItems.reduce((sum, i) => sum + i.selectedQty, 0);

  const effectiveReason =
    returnReason === 'أخرى' && customReason.trim()
      ? customReason.trim()
      : returnReason;

  const prepareCartItems = (): CartItem[] => {
    return selectedItems.map((i) => ({
      productId: i.productId,
      name: i.name,
      qty: i.selectedQty,
      unitPrice: i.unitPrice,
      lineTotal: i.selectedQty * i.unitPrice,
      unit: i.unit || 'قطعة',
      barcode: i.barcode,
      isPack: i.isPack,
      packId: i.packId,
      packQty: i.packQty,
      packUnit: i.packUnit,
    }));
  };

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

  const hasPriorReturns = (previousReturns?.length ?? 0) > 0;

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
          <div className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-surface-container/50">
            <div className="px-4 py-2.5 bg-surface-container border-b border-outline-variant/15 flex items-center justify-between">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                {items.filter((i) => i.maxReturnableQty > 0).every((i) => i.isSelected) ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>تحديد / إلغاء تحديد الكل المتاح</span>
              </button>
              <span className="text-[11px] text-on-surface-variant font-bold">
                تم تحديد {selectedItems.length} من {items.length} صنف
              </span>
            </div>

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
                    {/* Item checkbox and title */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        disabled={isFullyReturned}
                        onClick={() => toggleItem(item.productId)}
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
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-0.5">
                          <span>السعر: {formatMoney(item.unitPrice)} دج</span>
                          <span>•</span>
                          <span>المباع: {item.originalQty}</span>
                          {item.alreadyReturnedQty > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600">أُرجع سابقاً: {item.alreadyReturnedQty}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity counter */}
                    {isFullyReturned ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-1 rounded-lg">
                        أُرجع كاملاً
                      </span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-outline-variant/20 rounded-xl overflow-hidden bg-surface-container-low">
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, item.selectedQty - 1)}
                            disabled={item.selectedQty <= 1}
                            className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.maxReturnableQty}
                            value={item.selectedQty}
                            onChange={(e) => updateQty(item.productId, parseInt(e.target.value, 10) || 1)}
                            className="w-10 text-center font-mono font-bold text-xs bg-transparent text-on-surface focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, item.selectedQty + 1)}
                            disabled={item.selectedQty >= item.maxReturnableQty}
                            className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="w-20 text-left">
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

          {/* Reason & Refund Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Reason */}
            <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2">
              <label className="text-xs font-bold text-on-surface block">سبب الإرجاع:</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="طلب الزبون (تراجع عن الشراء)">طلب الزبون (تراجع عن الشراء)</option>
                <option value="عيب مصنعي أو كسر">عيب مصنعي أو كسر</option>
                <option value="منتج غير مطابق أو صنف خاطئ">منتج غير مطابق أو صنف خاطئ</option>
                <option value="انتهاء أو قرب الصلاحية">انتهاء أو قرب الصلاحية</option>
                <option value="أخرى">سبب آخر (كتابة يدوية)</option>
              </select>
              {returnReason === 'أخرى' && (
                <input
                  type="text"
                  placeholder="اكتب سبب الإرجاع هنا..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full h-8 px-3 bg-surface-container-low border border-outline-variant/25 rounded-xl text-xs text-on-surface focus:outline-none"
                />
              )}
            </div>

            {/* Refund Method */}
            <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2">
              <label className="text-xs font-bold text-on-surface block">طريقة استرداد القيمة:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMethod('cash')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                    refundMethod === 'cash'
                      ? 'bg-primary text-on-primary border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>نقداً من الخزينة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRefundMethod('customer_credit')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                    refundMethod === 'customer_credit'
                      ? 'bg-primary text-on-primary border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>رصيد للعميل</span>
                </button>
              </div>
              <p className="text-[10px] text-on-surface-variant">
                {refundMethod === 'cash'
                  ? 'سيتم تسجيل خروج المبلغ من مناوبة الصندوق الحالية.'
                  : 'سيتم خصم المبلغ من دين العميل أو قيده كرصيد دائن لصالحه.'}
              </p>
            </div>
          </div>

          {/* Refund Financial Summary Dominant Banner */}
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between text-right">
            <div>
              <span className="text-xs font-bold text-red-800 dark:text-red-300 block">
                إجمالي المبلغ المسترد للزبون:
              </span>
              <span className="text-[11px] text-red-600 dark:text-red-400">
                {totalPieces} قطعة من {selectedItems.length} صنف محدد
              </span>
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-black text-red-600">
                {formatMoney(totalReturnAmount)}
              </span>
              <span className="text-xs font-bold text-red-600">دج</span>
            </div>
          </div>
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
            <span>تأكيد واسترداد فوري ({formatMoney(totalReturnAmount)} دج)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
