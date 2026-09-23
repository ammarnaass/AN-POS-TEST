import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Printer, Plus, AlertTriangle, Wallet, ExternalLink, RotateCcw, Bell } from 'lucide-react';
import { formatNumber } from '@/features/pos/utils/format';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { printSaleReceipt } from '../services/posSalePrintingService';
import { useSuccessModalShortcuts } from '../hooks/usePOSCheckoutShortcuts';
import type { POSSaleSuccessModalProps } from '../types';

export const POSSaleSuccessModal: React.FC<POSSaleSuccessModalProps> = ({
  isOpen,
  onClose,
  completedSale,
}) => {
  const { user: currentUser } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);
  const openCenter = useNotificationStore((s) => s.openCenter);

  useSuccessModalShortcuts({
    isOpen,
    completedSale,
    onClose,
    currentUser,
  });

  if (!isOpen || !completedSale) return null;

  const isReturn = completedSale.type === 'return';
  const isCreditSale =
    !isReturn &&
    (completedSale.paymentMethod === 'credit' ||
      completedSale.status === 'unpaid' ||
      completedSale.status === 'partial');

  const debtAmount = Math.max(
    0,
    Number(completedSale.total || 0) - Number(completedSale.paidAmount || 0)
  );

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-200">
        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 text-center space-y-3 sm:space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Status Icon */}
          <div
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto border shadow-inner shrink-0 ${
            isCreditSale
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
          }`}
        >
          {isCreditSale ? <Wallet className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
        </div>

          {/* Title & Sequence */}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-on-surface">
              {isCreditSale ? 'تم تسجيل البيع بالآجل (دين) بنجاح' : 'تمت عملية البيع بنجاح'}
            </h3>
            <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-on-surface-variant font-mono">
                فاتورة رقم: #{completedSale.number}
              </p>
              <button
                type="button"
                onClick={() => openCenter?.()}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
                title="فتح مركز الإشعارات"
              >
                <Bell className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>{unreadCount > 0 ? `${unreadCount} إشعار جديد` : 'تم توثيق الإشعار بنجاح'}</span>
              </button>
            </div>
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

          {/* Dedicated Credit/Debt Alert Notice Card */}
          {isCreditSale && (
            <div
              className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-right space-y-1.5 mt-2"
              data-purpose="credit-sale-alert-card"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200 font-extrabold text-xs">
                  <span className="relative shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-ping opacity-75" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
                  </span>
                  <span>إشعار: قيد دين على الحساب</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-900 dark:text-amber-100 border border-amber-500/30">
                  {completedSale.status === 'unpaid' ? 'دين كامل' : 'دفعة جزئية + دين'}
                </span>
              </div>
              <div className="text-xs space-y-1 text-on-surface-variant pt-1 border-t border-amber-500/20">
                <div className="flex justify-between">
                  <span>الزبون:</span>
                  <span className="font-bold text-on-surface">
                    {completedSale.customerName || 'زبون مسجل'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>مبلغ الدين المستحق:</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                    {formatNumber(debtAmount)} دج
                  </span>
                </div>
                {typeof completedSale.paidAmount === 'number' && completedSale.paidAmount > 0 ? (
                  <div className="flex justify-between text-[11px]">
                    <span>المدفوع نقداً:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatNumber(completedSale.paidAmount)} دج
                    </span>
                  </div>
                ) : null}

                {/* Direct Link to Customer Debt Ledger */}
                {completedSale.customerId && (
                  <div className="pt-1.5 mt-1 border-t border-amber-500/20 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (typeof window !== 'undefined') {
                          window.location.href = `/customers?id=${completedSale.customerId}`;
                        }
                      }}
                      className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>عرض سجل ديون الزبون</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dedicated Return Confirmation Alert Notice Card */}
          {isReturn && (
            <div
              className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-right space-y-1 mt-2"
              data-purpose="return-sale-alert-card"
              data-testid="return-sale-alert-card"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-rose-800 dark:text-rose-200 font-extrabold text-xs">
                  <span className="relative shrink-0">
                    <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-ping opacity-75" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
                  </span>
                  <span>إشعار: تم تسجيل حركة المرتجع واسترجاع المبلغ</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-900 dark:text-rose-100 border border-rose-500/30">
                  توثيق المرتجعات
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                تم تحديث المخزون وحركة الصندوق وإرسال إشعار توثيقي بالعملية.
              </p>
            </div>
          )}

          {/* Dedicated Normal Sale Confirmation Alert Notice Card */}
          {!isCreditSale && !isReturn && (
            <div
              className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-right space-y-1 mt-2"
              data-purpose="regular-sale-alert-card"
              data-testid="regular-sale-alert-card"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs">
                  <span className="relative shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                  <span>إشعار: تم تسجيل وحفظ عملية البيع بنجاح</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border border-emerald-500/30">
                  توثيق فوري
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                تم تسجيل الفاتورة في سجل المبيعات والصندوق، وتحديث المخزون وإرسال إشعار للنظام.
              </p>
            </div>
          )}

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
      </div>

      {/* Print & Action Buttons (Fixed Footer) */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-surface-container/50 border-t border-outline-variant/15 flex flex-col gap-2 shrink-0">
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default POSSaleSuccessModal;
