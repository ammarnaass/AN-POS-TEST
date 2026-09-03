import React from 'react';
import { Edit3, X } from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  discount: number;
  setDiscount: (val: number) => void;
  discountType: 'percent' | 'amount';
  setDiscountType: (type: 'percent' | 'amount') => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  isOpen,
  onClose,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">تخفيض / زيادة على الفاتورة</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center bg-surface-container rounded-xl p-1 border border-outline-variant/20">
            <button
              onClick={() => setDiscountType('percent')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                discountType === 'percent'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant'
              }`}
            >
              نسبة مئوية (%)
            </button>
            <button
              onClick={() => setDiscountType('amount')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                discountType === 'amount'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant'
              }`}
            >
              مبلغ مباشر (دج)
            </button>
          </div>

          <div>
            <label className="block font-bold text-on-surface mb-1">قيمة الخصم</label>
            <input
              type="number"
              value={discount || ''}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0.00"
              className="w-full h-11 px-4 bg-surface-container border border-outline-variant/20 rounded-xl text-center font-mono text-base font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/15">
          <button
            onClick={() => {
              setDiscount(0);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
          >
            إلغاء الخصم
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            تطبيق
          </button>
        </div>
      </div>
    </div>
  );
};
