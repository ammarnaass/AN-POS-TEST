import React from 'react';
import { AlertTriangle, Trash2, X, Loader2, Package } from 'lucide-react';
import type { Product } from '@/types';

interface BulkDeleteProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedProducts: Product[];
  isPending?: boolean;
}

export const BulkDeleteProductsModal: React.FC<BulkDeleteProductsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedProducts,
  isPending = false,
}) => {
  if (!isOpen) return null;

  const count = selectedProducts.length;
  const previewList = selectedProducts.slice(0, 5);
  const remainingCount = count - previewList.length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold font-cairo text-slate-900 dark:text-slate-100">
                تأكيد حذف المنتجات المحددة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                عملية الحذف نهائية ولا يمكن التراجع عنها
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Body */}
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 text-xs text-rose-800 dark:text-rose-300 space-y-1">
          <p className="font-bold">
            أنت على وشك حذف <span className="font-mono text-sm underline px-1">{count}</span> منتجاً من قاعدة البيانات.
          </p>
          <p className="text-rose-700 dark:text-rose-400">
            سيتم مسح هذه المنتجات وسجل أسعارها وكمياتها فورياً من المخزون.
          </p>
        </div>

        {/* Products Preview */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            معاينة لبعض المنتجات المستهدفة:
          </span>
          <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/40 custom-scrollbar">
            {previewList.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-2 truncate max-w-[200px]">
                  <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {p.name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {p.quantity ?? 0} {p.unit || 'قطعة'}
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 py-1">
                ... بالإضافة إلى {remainingCount} منتج آخر
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-rose-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ الحذف...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف ({count})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkDeleteProductsModal;
