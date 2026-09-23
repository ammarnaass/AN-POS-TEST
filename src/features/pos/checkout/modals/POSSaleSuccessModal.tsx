import React from 'react';
import { CheckCircle2, Printer, Plus } from 'lucide-react';
import { formatNumber } from '@/features/pos/utils/format';
import { useAuthStore } from '@/store/authStore';
import { printSaleReceipt } from '../services/posSalePrintingService';
import { useSuccessModalShortcuts } from '../hooks/usePOSCheckoutShortcuts';
import type { POSSaleSuccessModalProps } from '../types';

export const POSSaleSuccessModal: React.FC<POSSaleSuccessModalProps> = ({
  isOpen,
  onClose,
  completedSale,
}) => {
  const { user: currentUser } = useAuthStore();

  useSuccessModalShortcuts({
    isOpen,
    completedSale,
    onClose,
    currentUser,
  });

  if (!isOpen || !completedSale) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        {/* Title & Sequence */}
        <div>
          <h3 className="text-lg font-bold text-on-surface">تمت عملية البيع بنجاح</h3>
          <p className="text-xs text-on-surface-variant font-mono mt-0.5">
            فاتورة رقم: #{completedSale.number}
          </p>
        </div>

        {/* Financial Details Card */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-1.5 text-xs">
          <div className="flex justify-between text-on-surface-variant">
            <span>المبلغ الإجمالي:</span>
            <span className="font-bold text-on-surface font-mono">
              {formatNumber(completedSale.total)} دج
            </span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span>وسيلة الدفع:</span>
            <span className="font-bold text-on-surface">
              {completedSale.paymentMethod === 'cash'
                ? 'نقداً'
                : (completedSale.paymentMethod as string) === 'card'
                ? 'بطاقة'
                : (completedSale.paymentMethod as string) === 'transfer'
                ? 'تحويل'
                : 'آجل (دين)'}
            </span>
          </div>

          {typeof completedSale.paidAmount === 'number' && completedSale.paidAmount > completedSale.total && (
            <>
              <div className="flex justify-between text-on-surface-variant pt-1 border-t border-outline-variant/10">
                <span>المبلغ المستلم (المدفوع):</span>
                <span className="font-bold text-on-surface font-mono">
                  {formatNumber(completedSale.paidAmount)} دج
                </span>
              </div>
              <div className="flex justify-between items-center bg-emerald-500/15 border border-emerald-500/35 rounded-xl px-3 py-2 text-emerald-800 dark:text-emerald-300 font-bold mt-1 shadow-2xs">
                <span className="text-xs">الباقي للزبون (الفكة):</span>
                <span className="text-sm sm:text-base font-black font-mono">
                  +{formatNumber(completedSale.paidAmount - completedSale.total)} دج
                </span>
              </div>
            </>
          )}
        </div>

        {/* Print & Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            {completedSale.docType === 'wholesale' ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    printSaleReceipt(completedSale.id, 'wholesale-invoice', currentUser)
                  }
                  className="py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="طباعة فاتورة الجملة (P / F1)"
                >
                  <Printer className="w-4 h-4" />
                  <span>فاتورة جملة (P/F1)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    printSaleReceipt(completedSale.id, 'thermal-receipt', currentUser)
                  }
                  className="py-3 rounded-xl border border-outline-variant/20 hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="طباعة تذكرة صغيرة حرارية (F2)"
                >
                  <Printer className="w-4 h-4" />
                  <span>تذكرة حرارية (F2)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    printSaleReceipt(completedSale.id, 'thermal-receipt', currentUser)
                  }
                  className="py-3 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-on-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="طباعة التذكرة الحرارية (P / F1)"
                >
                  <Printer className="w-4 h-4" />
                  <span>إيصال حراري (P/F1)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    printSaleReceipt(completedSale.id, 'sale-invoice', currentUser)
                  }
                  className="py-3 rounded-xl border border-outline-variant/20 hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="طباعة فاتورة عادية A4/A5 (F2)"
                >
                  <Printer className="w-4 h-4" />
                  <span>فاتورة عادية (F2)</span>
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-outline-variant/20 hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="بدء فاتورة جديدة (Enter / Esc)"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>فاتورة جديدة (Enter / Esc)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSSaleSuccessModal;
