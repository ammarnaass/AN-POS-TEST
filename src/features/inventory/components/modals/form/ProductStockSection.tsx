import React from 'react';
import type { useProductFormState } from '../../../hooks/useProductFormState';

interface ProductStockSectionProps {
  formState: ReturnType<typeof useProductFormState>;
}

export const ProductStockSection: React.FC<ProductStockSectionProps> = ({ formState }) => {
  const { formData, setFormData } = formState;

  return (
    <>
      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">الكمية الحالية</label>
        <div className="relative">
          <input
            type="number"
            placeholder="0"
            value={formData.quantity || ''}
            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 0 })}
            className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">
            {formData.unit || 'قطعة'}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">حد التنبيه (الأمان)</label>
        <input
          type="number"
          placeholder="يتنبه عند وصول الكمية لهذا العدد"
          value={formData.lowStockThreshold || ''}
          onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) || 0 })}
          className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
        />
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">نقطة إعادة الطلب</label>
        <input
          type="number"
          placeholder="يتم طلب جديد عند هذا الحد"
          value={formData.reorderPoint || ''}
          onChange={(e) => setFormData({ ...formData, reorderPoint: Number(e.target.value) || 0 })}
          className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
        />
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">الحد الأعلى للمخزون</label>
        <input
          type="number"
          placeholder="الحد الأقصى المسموح"
          value={formData.maxStock || ''}
          onChange={(e) => setFormData({ ...formData, maxStock: Number(e.target.value) || 0 })}
          className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
        />
      </div>

      {/* Stock Visual Indicator */}
      <div className="col-span-2">
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-md text-on-surface-variant font-medium">حالة المخزون المتوقعة</span>
            {formData.quantity > 0 && formData.lowStockThreshold > 0 && (
              <span
                className={`text-body-sm font-bold ${
                  formData.quantity <= formData.lowStockThreshold ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formData.quantity <= formData.lowStockThreshold ? 'مخزون منخفض' : 'متوفر بشكل ممتاز'}
              </span>
            )}
            {formData.quantity <= 0 && <span className="text-body-sm font-bold text-error">نافذ من المخزون</span>}
          </div>
          {formData.lowStockThreshold > 0 && (
            <div className="w-full h-2.5 bg-outline-variant/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  formData.quantity <= 0
                    ? 'bg-error'
                    : formData.quantity <= formData.lowStockThreshold
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, (formData.quantity / (formData.lowStockThreshold * 3)) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductStockSection;
