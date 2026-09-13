import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Product } from '@/types';

interface QuickAdjustStockModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product, newQuantity: number) => void;
}

export const QuickAdjustStockModal: React.FC<QuickAdjustStockModalProps> = ({
  product,
  onClose,
  onSave,
}) => {
  const [adjustQtyInput, setAdjustQtyInput] = useState<string>('');

  useEffect(() => {
    if (product) {
      setAdjustQtyInput(String(product.quantity || 0));
    } else {
      setAdjustQtyInput('');
    }
  }, [product]);

  if (!product) return null;

  const handleSave = () => {
    const val = Number(adjustQtyInput);
    if (isNaN(val) || val < 0) return;
    onSave(product, val);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <h3 className="font-bold text-on-surface text-base">تعديل كمية المخزون</h3>
          <button
            onClick={onClose}
            className="text-on-surface-variant p-1 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant mb-1">المنتج</p>
          <p className="font-bold text-on-surface text-sm truncate">{product.name}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
            الكمية الجديدة الفعلية ({product.unit || 'قطعة'})
          </label>
          <input
            type="number"
            autoFocus
            value={adjustQtyInput}
            onChange={(e) => setAdjustQtyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            className="w-full px-4 py-2.5 bg-surface-container-high border border-outline-variant/30 rounded-xl text-center font-cairo text-xl font-bold focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-surface-container-high text-on-surface-variant rounded-xl text-xs font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
          >
            تحديث الكمية
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickAdjustStockModal;
