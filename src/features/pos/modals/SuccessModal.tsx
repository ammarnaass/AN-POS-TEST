import React from 'react';
import { CheckCircle2, Printer, Plus } from 'lucide-react';
import { formatNumber } from '../utils/format';
import { printDocument } from '@/services/print/printService';
import type { Sale } from '@/types';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedSale: Sale | null;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  completedSale,
}) => {
  if (!isOpen || !completedSale) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-on-surface">تمت عملية البيع بنجاح</h3>
          <p className="text-xs text-on-surface-variant font-mono mt-0.5">
            فاتورة رقم: #{completedSale.number}
          </p>
        </div>

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
                : completedSale.paymentMethod === 'card'
                ? 'بطاقة'
                : completedSale.paymentMethod === 'transfer'
                ? 'تحويل'
                : 'آجل'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => {
              printDocument(completedSale.id, 'thermal-receipt', { copies: 1 });
            }}
            className="py-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>إعادة الطباعة</span>
          </button>

          <button
            onClick={onClose}
            className="py-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            autoFocus
          >
            <Plus className="w-4 h-4" />
            <span>بيع جديد (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
