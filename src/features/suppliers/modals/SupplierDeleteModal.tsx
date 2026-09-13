import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Supplier } from '@/types';
import { formatSupplierMoney } from '../services/supplierStatus';

interface SupplierDeleteModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
  currencySymbol?: string;
}

export const SupplierDeleteModal: React.FC<SupplierDeleteModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onConfirm,
  isPending = false,
  currencySymbol = 'دج',
}) => {
  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-red-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-black text-on-surface font-cairo">تأكيد حذف المورد</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            هل أنت متأكد من حذف المورد <strong className="text-on-surface">"{supplier.name}"</strong>؟
          </p>
          {supplier.balance > 0 && (
            <div className="mt-2.5 p-2 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-600 font-bold">
              تنبيه: هذا المورد لديه مستحقات قائمة بقيمة {formatSupplierMoney(supplier.balance)} {currencySymbol}!
            </div>
          )}
        </div>
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer disabled:opacity-40"
          >
            {isPending ? 'جاري الحذف...' : 'نعم، حذف'}
          </button>
        </div>
      </div>
    </div>
  );
};
