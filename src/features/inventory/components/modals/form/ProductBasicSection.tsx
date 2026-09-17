import React from 'react';
import { ScanLine, Sparkles } from 'lucide-react';
import ImageUpload from '@/components/products/ImageUpload';
import type { useProductFormState } from '../../../hooks/useProductFormState';

interface ProductBasicSectionProps {
  formState: ReturnType<typeof useProductFormState>;
}

export const ProductBasicSection: React.FC<ProductBasicSectionProps> = ({ formState }) => {
  const {
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    isSubmitted,
    touchedFields,
    setTouchedFields,
    barcodeDuplicate,
    barcodeScanMode,
    setBarcodeScanMode,
    barcodeInputRef,
    handleGenerateBarcode,
  } = formState;

  return (
    <>
      <div className="col-span-2">
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">اسم المنتج *</label>
        <input
          placeholder="مثال: بيبسي 1 لتر"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
          }}
          onBlur={() => setTouchedFields((prev) => ({ ...prev, name: true }))}
          className={`w-full px-4 py-3 border rounded-xl text-right bg-surface-container transition-all ${
            (isSubmitted || touchedFields.name) && formErrors.name
              ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
              : 'border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary'
          }`}
        />
        {(isSubmitted || touchedFields.name) && formErrors.name && (
          <p className="text-error text-body-xs mt-1">{formErrors.name}</p>
        )}
      </div>

      <div className="col-span-2">
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">صورة المنتج</label>
        <ImageUpload value={formData.image || ''} onChange={(image) => setFormData({ ...formData, image })} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-label-sm text-on-surface-variant font-medium">الباركود</label>
          <button
            type="button"
            onClick={handleGenerateBarcode}
            className="flex items-center gap-1 text-[11px] text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-lg transition-colors font-medium cursor-pointer"
            title="توليد باركود EAN-13 تلقائي"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>توليد تلقائي</span>
          </button>
        </div>
        <div className="relative">
          <input
            ref={barcodeInputRef as any}
            placeholder="امسح أو اكتب الباركود"
            value={formData.barcode}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            className={`w-full px-4 py-3 pl-12 border rounded-xl text-right bg-surface-container transition-all font-mono ${
              formErrors.barcode || barcodeDuplicate
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              setBarcodeScanMode(true);
              barcodeInputRef.current?.focus();
            }}
            className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
              barcodeScanMode ? 'bg-primary text-on-primary animate-pulse' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
            title="امسح الباركود بالجهاز"
          >
            <ScanLine className="w-5 h-5" />
          </button>
        </div>
        {formErrors.barcode && <p className="text-error text-body-xs mt-1">{formErrors.barcode}</p>}
        {barcodeDuplicate && !formErrors.barcode && (
          <p className="text-amber-500 text-body-xs mt-1">الباركود مستخدم بالفعل في: {barcodeDuplicate}</p>
        )}
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">رقم الصنف (SKU)</label>
        <input
          placeholder="رقم الصنف"
          value={formData.sku || ''}
          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
        />
      </div>
    </>
  );
};

export default ProductBasicSection;
