import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Tag,
  DollarSign,
  Box,
  Settings,
  ExternalLink,
  X,
} from 'lucide-react';
import type { Category } from '@/services/api/categoriesApi';
import type { useProductFormState } from '../../hooks/useProductFormState';
import { ProductBasicSection } from './form/ProductBasicSection';
import { ProductCategorySection } from './form/ProductCategorySection';
import { ProductPricingSection } from './form/ProductPricingSection';
import { ProductStockSection } from './form/ProductStockSection';
import { ProductSettingsSection } from './form/ProductSettingsSection';

interface ProductFormModalProps {
  formState: ReturnType<typeof useProductFormState>;
  categories: Category[];
  isPending?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  formState,
  categories,
  isPending = false,
}) => {
  const navigate = useNavigate();

  const {
    showForm,
    editingProduct,
    formErrors,
    isSubmitted,
    activeFormSection,
    setActiveFormSection,
    closeFormModal,
    handleSubmit,
  } = formState;

  if (!showForm) return null;

  const formSections = [
    { id: 'basic', label: 'البيانات الأساسية', icon: <Package className="w-4 h-4" /> },
    { id: 'category', label: 'الفئة والوحدة', icon: <Tag className="w-4 h-4" /> },
    { id: 'pricing', label: 'الأسعار والربحية', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'stock', label: 'المخزون والتنبيهات', icon: <Box className="w-4 h-4" /> },
    { id: 'settings', label: 'الصلاحية والخيارات', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-surface-container rounded-3xl border border-outline-variant/30 w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-scale-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15 bg-surface-container-high/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cairo text-lg font-bold text-on-surface">
                {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة صنف جديد للمخزون'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                <kbd className="px-1.5 py-0.5 bg-surface-container-highest rounded text-[10px] font-mono">Ctrl+Enter</kbd> للحفظ السريع
                {' · '}
                <kbd className="px-1.5 py-0.5 bg-surface-container-highest rounded text-[10px] font-mono">Esc</kbd> للإغلاق
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const editId = editingProduct?.id;
                closeFormModal();
                if (editId) {
                  navigate(`/products/${editId}/edit`);
                } else {
                  navigate('/products/new');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-all font-medium cursor-pointer"
              title="فتح النموذج الموسع بجميع الأقسام والعبوات المتعددة"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>النموذج الموسّع</span>
            </button>
            <button
              onClick={closeFormModal}
              className="text-on-surface-variant hover:text-on-surface p-2 rounded-xl hover:bg-surface-container-highest transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-outline-variant/15 bg-surface-container-high/20 overflow-x-auto">
          {formSections.map((sec) => {
            const hasError =
              isSubmitted &&
              ((sec.id === 'basic' && (formErrors.name || formErrors.barcode)) ||
                (sec.id === 'pricing' && formErrors.retailPrice));
            return (
              <button
                key={sec.id}
                onClick={() => setActiveFormSection(sec.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeFormSection === sec.id
                    ? 'bg-surface-container text-primary border-b-2 border-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {sec.icon}
                <span>{sec.label}</span>
                {hasError && (
                  <span
                    className="w-2 h-2 rounded-full bg-error inline-block animate-pulse"
                    title="يحتوي على أخطاء يجب تصحيحها"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            {activeFormSection === 'basic' && <ProductBasicSection formState={formState} />}
            {activeFormSection === 'category' && (
              <ProductCategorySection formState={formState} categories={categories} />
            )}
            {activeFormSection === 'pricing' && <ProductPricingSection formState={formState} />}
            {activeFormSection === 'stock' && <ProductStockSection formState={formState} />}
            {activeFormSection === 'settings' && <ProductSettingsSection formState={formState} />}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/20 bg-surface-container-high/20">
          <button
            onClick={closeFormModal}
            className="flex-1 py-3 border border-outline-variant/20 rounded-xl text-on-surface-variant text-label-md hover:bg-surface-container-low transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-3 bg-primary text-on-primary rounded-xl text-label-md shadow-sm hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 font-bold"
          >
            {isPending && (
              <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            )}
            <span>{editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductFormModal;
