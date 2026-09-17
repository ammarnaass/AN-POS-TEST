import React from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import type { useProductFormState } from '../../../hooks/useProductFormState';

interface ProductSettingsSectionProps {
  formState: ReturnType<typeof useProductFormState>;
}

export const ProductSettingsSection: React.FC<ProductSettingsSectionProps> = ({ formState }) => {
  const { formData, setFormData } = formState;

  return (
    <>
      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">تاريخ الصلاحية</label>
        <input
          type="date"
          value={formData.expiryDate || ''}
          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
          className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
        />
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">رقم الدفعة (Batch No)</label>
        <input
          placeholder="رقم الدفعة / التشغيلة"
          value={formData.batchNumber || ''}
          onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
          className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
        />
      </div>

      <div className="col-span-2">
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">حالة المنتج في النظام</label>
        <button
          type="button"
          onClick={() =>
            setFormData({
              ...formData,
              status: formData.status === 'active' ? 'inactive' : 'active',
            })
          }
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-label-md transition-all cursor-pointer font-medium ${
            formData.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
              : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/20'
          }`}
        >
          {formData.status === 'active' ? (
            <ToggleRight className="w-5 h-5 text-emerald-600" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-on-surface-variant" />
          )}
          <span>
            {formData.status === 'active'
              ? 'صنف نشط — متاح للبيع والمسح في الكاشير ونقاط البيع'
              : 'صنف غير نشط — مخفي وموقوف مؤقتاً من الكاشير'}
          </span>
        </button>
      </div>
    </>
  );
};

export default ProductSettingsSection;
