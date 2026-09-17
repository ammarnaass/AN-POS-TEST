import React from 'react';
import type { useProductFormState } from '../../../hooks/useProductFormState';

interface ProductPricingSectionProps {
  formState: ReturnType<typeof useProductFormState>;
}

export const ProductPricingSection: React.FC<ProductPricingSectionProps> = ({ formState }) => {
  const {
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    isSubmitted,
    touchedFields,
    setTouchedFields,
    profitMargin,
  } = formState;

  return (
    <>
      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">سعر التكلفة</label>
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={formData.costPrice || ''}
            onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) || 0 })}
            className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">دج</span>
        </div>
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">سعر الجملة</label>
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={formData.wholesalePrice || ''}
            onChange={(e) => setFormData({ ...formData, wholesalePrice: Number(e.target.value) || 0 })}
            className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">دج</span>
        </div>
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">سعر التجزئة *</label>
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={formData.retailPrice || ''}
            onChange={(e) => {
              setFormData({ ...formData, retailPrice: Number(e.target.value) || 0 });
              if (formErrors.retailPrice) setFormErrors((prev) => ({ ...prev, retailPrice: undefined }));
            }}
            onBlur={() => setTouchedFields((prev) => ({ ...prev, retailPrice: true }))}
            className={`w-full px-4 py-3 border rounded-xl text-right bg-surface-container transition-all font-mono ${
              (isSubmitted || touchedFields.retailPrice) && formErrors.retailPrice
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary'
            }`}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">دج</span>
        </div>
        {(isSubmitted || touchedFields.retailPrice) && formErrors.retailPrice && (
          <p className="text-error text-body-xs mt-1">{formErrors.retailPrice}</p>
        )}
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">الحد الأدنى للجملة</label>
        <input
          type="number"
          placeholder="0"
          value={formData.wholesaleMinQty || ''}
          onChange={(e) => setFormData({ ...formData, wholesaleMinQty: Number(e.target.value) || 0 })}
          className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
        />
      </div>

      {/* Profit Margin Calculator */}
      <div className="col-span-2">
        <div
          className={`p-4 rounded-xl border ${
            profitMargin === null
              ? 'bg-surface-container-low border-outline-variant/20'
              : profitMargin < 0
              ? 'bg-error/5 border-error/20'
              : profitMargin < 10
              ? 'bg-amber-500/5 border-amber-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-label-md text-on-surface-variant font-medium">هامش الربح المتوقع</span>
            {profitMargin !== null ? (
              <span
                className={`font-cairo text-headline-sm font-bold ${
                  profitMargin < 0 ? 'text-error' : profitMargin < 10 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {profitMargin > 0 ? '+' : ''}
                {profitMargin.toFixed(1)}%
              </span>
            ) : (
              <span className="text-on-surface-variant text-body-sm">أدخل أسعار التكلفة والبيع</span>
            )}
          </div>
          {profitMargin !== null && (
            <div className="flex items-center justify-between mt-2 text-body-sm text-on-surface-variant pt-2 border-t border-outline-variant/10">
              <span>صافي ربح القطعة: <strong className="text-on-surface font-mono">{Math.max(0, formData.retailPrice - formData.costPrice).toFixed(2)} دج</strong></span>
              <span className="text-xs text-on-surface-variant/80">لكل عملية بيع بالتجزئة</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductPricingSection;
