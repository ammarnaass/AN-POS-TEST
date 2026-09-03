import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { formatMoney } from '../utils/format';
import type { CartItem } from '@/types';

interface FreeProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomItem: (item: CartItem) => void;
}

export const FreeProductModal: React.FC<FreeProductModalProps> = ({
  isOpen,
  onClose,
  onAddCustomItem,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [qty, setQty] = useState<number>(1);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim() || price < 0) return;
    const finalQty = qty > 0 ? qty : 1;
    onAddCustomItem({
      productId: `custom-${Date.now()}`,
      name: name.trim(),
      qty: finalQty,
      unitPrice: price,
      lineTotal: finalQty * price,
      isCustom: true,
    });
    setName('');
    setPrice(0);
    setQty(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-on-surface">إضافة منتج حر (F8)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">اسم المنتج / الخدمة *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: خدمة توصيل / منتج مخصص"
              className="w-full h-11 px-3 bg-surface border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">السعر الإفرادي (دج) *</label>
              <input
                type="number"
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full h-11 px-3 bg-surface border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">الكمية</label>
              <input
                type="number"
                value={qty || ''}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                placeholder="1"
                className="w-full h-11 px-3 bg-surface border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
          >
            إلغاء (Esc)
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
          >
            إضافة للسلة (Enter)
          </button>
        </div>
      </div>
    </div>
  );
};
