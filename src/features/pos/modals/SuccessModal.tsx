import React, { useEffect } from 'react';
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
  // Self-contained keyboard shortcuts for sale completion
  useEffect(() => {
    if (!isOpen || !completedSale) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Enter or Escape: Close modal and start new sale
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // 2. 'P' or 'p' or F1: Print thermal receipt
      if (e.key === 'p' || e.key === 'P' || e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        printDocument(completedSale.id, 'thermal-receipt', {
          userId: '',
          userName: '',
          copies: 1,
        });
        return;
      }

      // 3. F2: Print invoice (wholesale or A4 sale invoice)
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        const docType = completedSale.docType === 'wholesale' ? 'wholesale-invoice' : 'sale-invoice';
        printDocument(completedSale.id, docType, {
          userId: '',
          userName: '',
          copies: 1,
        });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, completedSale, onClose]);

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
                : (completedSale.paymentMethod as string) === 'card'
                ? 'بطاقة'
                : (completedSale.paymentMethod as string) === 'transfer'
                ? 'تحويل'
                : 'آجل'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            {completedSale.docType === 'wholesale' ? (
              <>
                <button
                  onClick={() => {
                    printDocument(completedSale.id, 'wholesale-invoice', {
                      userId: '',
                      userName: '',
                      copies: 1,
                    });
                  }}
                  className="py-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/25 text-xs font-bold text-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="طباعة فاتورة الجملة (F2)"
                >
                  <Printer className="w-4 h-4" />
                  <span>فاتورة جملة (F2)</span>
                </button>

                <button
                  onClick={() => {
                    printDocument(completedSale.id, 'thermal-receipt', {
                      userId: '',
                      userName: '',
                      copies: 1,
                    });
                  }}
                  className="py-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="وصل حراري (P / F1)"
                >
                  <Printer className="w-4 h-4" />
                  <span>وصل حراري (P/F1)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    printDocument(completedSale.id, 'thermal-receipt', {
                      userId: '',
                      userName: '',
                      copies: 1,
                    });
                  }}
                  className="py-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="طباعة الإيصال (P / F1)"
                >
                  <Printer className="w-4 h-4" />
                  <span>إيصال حراري (P/F1)</span>
                </button>

                <button
                  onClick={() => {
                    printDocument(completedSale.id, 'sale-invoice', {
                      userId: '',
                      userName: '',
                      copies: 1,
                    });
                  }}
                  className="py-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/25 text-xs font-bold text-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="فاتورة بيع عادية A4 (F2)"
                >
                  <Printer className="w-4 h-4" />
                  <span>فاتورة A4 (F2)</span>
                </button>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            autoFocus
          >
            <Plus className="w-4 h-4" />
            <span>بيع جديد (Enter / Esc)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

