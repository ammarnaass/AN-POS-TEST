import React from 'react';
import { Users, X } from 'lucide-react';
import type { Customer } from '@/types';
import type { CustomerFormData } from '../types';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingCustomer: Customer | null;
  formData: CustomerFormData;
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  isSubmitting?: boolean;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingCustomer,
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
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">
                {editingCustomer ? 'تعديل بيانات الزبون' : 'إضافة زبون جديد'}
              </h3>
              <p className="text-xs text-on-surface-variant">سجل بيانات الزبون وسقف الائتمان المتاح</p>
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
          <label className="text-xs font-bold text-on-surface-variant mb-1 block">اسم الزبون الكامل *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="مثال: أحمد بوعلام"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1 block">رقم الهاتف</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0550... أو 0660..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            dir="ltr"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1 block">سقف الائتمان المسموح (دج)</label>
          <input
            type="number"
            value={formData.creditLimit || ''}
            onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) || 0 })}
            placeholder="0 يعني بدون سقف دين"
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-[10px] text-on-surface-variant mt-1">الحد الأقصى للديون المسموح بها لهذا العميل قبل التنبيه</p>
        </div>

        {/* Customer Type Selector */}
        <div>
          <label className="text-xs font-bold text-on-surface-variant mb-1.5 block">تصنيف العميل ونوع التسعير</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'retail', label: 'تجزئة (عادي)' },
              { id: 'wholesale', label: 'تاجر جملة (Gros)' },
              { id: 'semi_wholesale', label: 'نصف جملة' },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData({ ...formData, customerType: type.id as any })}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  formData.customerType === type.id
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/20'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Wholesale Trade & Tax Details (RC, NIF, NIS, Address) */}
        {(formData.customerType === 'wholesale' || formData.customerType === 'semi_wholesale') && (
          <div className="p-3.5 rounded-2xl bg-surface-container/70 border border-blue-500/20 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>البيانات التجارية والضريبية (لفاتورة الجملة A4)</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant mb-1 block">السجل التجاري (RC)</label>
                <input
                  type="text"
                  value={formData.rc}
                  onChange={(e) => setFormData({ ...formData, rc: e.target.value })}
                  placeholder="رقم السجل التجاري"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant/25 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant mb-1 block">التعريف الجبائي (NIF)</label>
                <input
                  type="text"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  placeholder="NIF 15 رقم"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant/25 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant mb-1 block">التعريف الإحصائي (NIS)</label>
                <input
                  type="text"
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  placeholder="رقم NIS"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant/25 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant mb-1 block">المقر / العنوان التجاري</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="المدينة أو العنوان"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant/25 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        )}

        {editingCustomer && (
          <div>
            <label className="text-xs font-bold text-on-surface-variant mb-1 block">الرصيد / الدين المسجل حالياً (دج)</label>
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
            {isSubmitting ? 'جاري الحفظ...' : editingCustomer ? 'حفظ التعديلات' : 'إضافة الزبون'}
          </button>
        </div>
      </form>
    </div>
  );
};
