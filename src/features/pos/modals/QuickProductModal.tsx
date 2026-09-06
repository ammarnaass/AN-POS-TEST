import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { db } from '@/infrastructure/database/dexie/db';
import { v4 as createId } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import type { Product } from '@/types';
import { syncProductCreate } from '@/lib/products-sync';

interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreatedAndAdded: (product: Product) => void;
}

export const QuickProductModal: React.FC<QuickProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreatedAndAdded,
}) => {
  const [form, setForm] = useState({
    name: '',
    barcode: '',
    category: '',
    retailPrice: 0,
    quantity: 10,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!form.name.trim() || form.retailPrice <= 0) return;
    setIsSubmitting(true);
    const newId = createId();
    const newProduct: any = {
      id: newId,
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      category: form.category.trim(),
      retailPrice: form.retailPrice,
      purchasePrice: 0,
      quantity: form.quantity,
      minStock: 5,
      unit: 'piece',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await db.products.add(newProduct);
      // Write-Through → SQLite (for mobile sync)
      await syncProductCreate(newProduct);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onProductCreatedAndAdded(newProduct);
      setForm({ name: '', barcode: '', category: '', retailPrice: 0, quantity: 10 });
      onClose();
      addNotification({
        title: 'تمت الإضافة',
        message: 'تم حفظ المنتج وإضافته للسلة',
        type: 'success',
      });
    } catch {
      addNotification({
        title: 'خطأ',
        message: 'تعذر حفظ المنتج الجديد',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">إضافة منتج سريع للمحل</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="col-span-2">
            <label className="block font-bold text-on-surface mb-1">اسم المنتج *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="اسم المنتج..."
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-bold text-on-surface mb-1">الباركود</label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="باركود..."
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block font-bold text-on-surface mb-1">التصنيف</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="مشروبات، إلكترونيات..."
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block font-bold text-on-surface mb-1">سعر البيع (دج) *</label>
            <input
              type="number"
              value={form.retailPrice || ''}
              onChange={(e) => setForm({ ...form, retailPrice: Number(e.target.value) || 0 })}
              placeholder="0.00"
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block font-bold text-on-surface mb-1">الكمية الافتتاحية</label>
            <input
              type="number"
              value={form.quantity || ''}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) || 0 })}
              placeholder="10"
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/15">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.name.trim() || form.retailPrice <= 0 || isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold disabled:opacity-50 shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ وإضافة للسلة'}
          </button>
        </div>
      </div>
    </div>
  );
};
