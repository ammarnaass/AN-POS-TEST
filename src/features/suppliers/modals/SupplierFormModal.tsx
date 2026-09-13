import React from 'react';
import { Truck, X } from 'lucide-react';
import type { Supplier } from '@/types';
import type { SupplierFormData } from '../types';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingSupplier: Supplier | null;
  formData: SupplierFormData;
  setFormData: React.Dispatch<React.SetStateAction<SupplierFormData>>;
  isSubmitting?: boolean;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingSupplier,
  formData,
  setFormData,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95"
      >
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">
                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
              </h3>
              <p className="text-xs text-on-surface-variant">سجل بيانات المورد والاتصال</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1 block">اسم المورد أو الشركة *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="مثال: شركة البركة للمواد الغذائية"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1 block">رقم الهاتف أو WhatsApp</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0550... أو 0660..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            dir="ltr"
          />
        </div>

        {editingSupplier && (
          <div>
            <label className="text-xs font-bold text-on-surface-variant mb-1 block">الرصيد المستحق للمورد حالياً (دج)</label>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) || 0 })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-black transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'جاري الحفظ...' : editingSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}
          </button>
        </div>
      </form>
    </div>
  );
};
