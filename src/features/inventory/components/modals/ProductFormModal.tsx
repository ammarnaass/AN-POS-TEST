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
  ScanLine,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { Category } from '@/services/api/categoriesApi';
import ImageUpload from '@/components/products/ImageUpload';
import { commonUnits, type useProductFormState } from '../../hooks/useProductFormState';

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
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    isSubmitted,
    touchedFields,
    setTouchedFields,
    barcodeDuplicate,
    showNewCategory,
    setShowNewCategory,
    newCategory,
    setNewCategory,
    activeFormSection,
    setActiveFormSection,
    barcodeScanMode,
    setBarcodeScanMode,
    barcodeInputRef,
    profitMargin,
    closeFormModal,
    handleSubmit,
    handleAddNewCategory,
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
            const hasError = isSubmitted && (
              (sec.id === 'basic' && (formErrors.name || formErrors.barcode)) ||
              (sec.id === 'pricing' && formErrors.retailPrice)
            );
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
                  <span className="w-2 h-2 rounded-full bg-error inline-block animate-pulse" title="يحتوي على أخطاء يجب تصحيحها" />
                )}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">

            {/* === Section: المنتج === */}
            {activeFormSection === 'basic' && (
              <>
                <div className="col-span-2">
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">اسم المنتج *</label>
                  <input
                    placeholder="مثال: بيبسي 1 لتر"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    onBlur={() => setTouchedFields(prev => ({ ...prev, name: true }))}
                    className={`w-full px-4 py-3 border rounded-lg text-right bg-surface-container transition-all ${
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
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">صورة المنتج</label>
                  <ImageUpload value={formData.image || ''} onChange={(image) => setFormData({ ...formData, image })} />
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">الباركود</label>
                  <div className="relative">
                    <input
                      ref={barcodeInputRef as any}
                      placeholder="امسح أو اكتب الباركود"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className={`w-full px-4 py-3 pl-12 border rounded-lg text-right bg-surface-container transition-all font-mono ${
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
                      className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
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
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">رقم الصنف (SKU)</label>
                  <input
                    placeholder="رقم الصنف"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </>
            )}

            {/* === Section: الفئة والوحدة === */}
            {activeFormSection === 'category' && (
              <>
                <div className="col-span-2">
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">الفئة</label>
                  {!showNewCategory ? (
                    <div className="flex gap-2">
                      <select
                        value={formData.category || ''}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            setShowNewCategory(true);
                          } else {
                            const found = categories.find((c) => c.name === e.target.value);
                            setFormData({
                              ...formData,
                              category: e.target.value,
                              categoryId: found?.id || undefined,
                            });
                          }
                        }}
                        className="flex-1 px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer text-on-surface"
                      >
                        <option value="">اختر التصنيف / العائلة...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                        <option value="__new__">+ إضافة تصنيف جديد</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        placeholder="اسم الفئة الجديدة"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNewCategory();
                          if (e.key === 'Escape') {
                            setShowNewCategory(false);
                            setNewCategory('');
                          }
                        }}
                        className="flex-1 px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                      <button
                        onClick={handleAddNewCategory}
                        className="px-4 py-3 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container transition-all cursor-pointer"
                      >
                        إضافة
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategory('');
                        }}
                        className="px-4 py-3 border border-outline-variant/20 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">الوحدة</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                  >
                    {commonUnits.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">المقاس / اللون</label>
                  <input
                    placeholder="مثال: أحمر / XL"
                    value={formData.variant || ''}
                    onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </>
            )}

            {/* === Section: الأسعار === */}
            {activeFormSection === 'pricing' && (
              <>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">سعر التكلفة</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.costPrice || ''}
                      onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">دج</span>
                  </div>
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">سعر الجملة</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.wholesalePrice || ''}
                      onChange={(e) => setFormData({ ...formData, wholesalePrice: Number(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">دج</span>
                  </div>
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">سعر التجزئة *</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.retailPrice || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, retailPrice: Number(e.target.value) || 0 });
                        if (formErrors.retailPrice) setFormErrors(prev => ({ ...prev, retailPrice: undefined }));
                      }}
                      onBlur={() => setTouchedFields(prev => ({ ...prev, retailPrice: true }))}
                      className={`w-full px-4 py-3 border rounded-lg text-right bg-surface-container transition-all ${
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
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">الحد الأدنى للجملة</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.wholesaleMinQty || ''}
                    onChange={(e) => setFormData({ ...formData, wholesaleMinQty: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {/* Profit Margin Calculator */}
                <div className="col-span-2">
                  <div
                    className={`p-4 rounded-lg border ${
                      profitMargin === null
                        ? 'bg-surface-container-low border-outline-variant/20'
                        : profitMargin < 0
                        ? 'bg-error/5 border-error/20'
                        : profitMargin < 10
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-tertiary/5 border-tertiary/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-label-md text-on-surface-variant">هامش الربح</span>
                      {profitMargin !== null ? (
                        <span
                          className={`font-cairo text-headline-sm font-bold ${
                            profitMargin < 0 ? 'text-error' : profitMargin < 10 ? 'text-amber-500' : 'text-tertiary'
                          }`}
                        >
                          {profitMargin > 0 ? '+' : ''}
                          {profitMargin.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-on-surface-variant text-body-sm">أدخل الأسعار</span>
                      )}
                    </div>
                    {profitMargin !== null && (
                      <div className="flex items-center justify-between mt-2 text-body-sm text-on-surface-variant">
                        <span>ربح: {Math.max(0, formData.retailPrice - formData.costPrice).toFixed(2)} دج</span>
                        <span>من كل 100 دج بيع</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* === Section: المخزون === */}
            {activeFormSection === 'stock' && (
              <>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">الكمية الحالية</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.quantity || ''}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-sm">{formData.unit}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">حد التنبيه</label>
                  <input
                    type="number"
                    placeholder="يتنبه عند وصول الكمية لهذا العدد"
                    value={formData.lowStockThreshold || ''}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">نقطة إعادة الطلب</label>
                  <input
                    type="number"
                    placeholder="يتم طلب جديد عند هذا الحد"
                    value={formData.reorderPoint || ''}
                    onChange={(e) => setFormData({ ...formData, reorderPoint: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">الحد الأعلى للمخزون</label>
                  <input
                    type="number"
                    placeholder="الحد الأقصى المسموح"
                    value={formData.maxStock || ''}
                    onChange={(e) => setFormData({ ...formData, maxStock: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {/* Stock Visual Indicator */}
                <div className="col-span-2">
                  <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-label-md text-on-surface-variant">حالة المخزون المتوقعة</span>
                      {formData.quantity > 0 && formData.lowStockThreshold > 0 && (
                        <span
                          className={`text-body-sm font-bold ${
                            formData.quantity <= formData.lowStockThreshold ? 'text-amber-500' : 'text-tertiary'
                          }`}
                        >
                          {formData.quantity <= formData.lowStockThreshold ? 'منخفض' : 'متوفر'}
                        </span>
                      )}
                      {formData.quantity <= 0 && (
                        <span className="text-body-sm font-bold text-error">نافذ</span>
                      )}
                    </div>
                    {formData.lowStockThreshold > 0 && (
                      <div className="w-full h-3 bg-outline-variant/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            formData.quantity <= 0
                              ? 'bg-error'
                              : formData.quantity <= formData.lowStockThreshold
                              ? 'bg-amber-500'
                              : 'bg-tertiary'
                          }`}
                          style={{ width: `${Math.min(100, (formData.quantity / (formData.lowStockThreshold * 3)) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* === Section: إعدادات === */}
            {activeFormSection === 'settings' && (
              <>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">تاريخ الصلاحية</label>
                  <input
                    type="date"
                    value={formData.expiryDate || ''}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">رقم الدفعة</label>
                  <input
                    placeholder="رقم الدفعة"
                    value={formData.batchNumber || ''}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">حالة المنتج</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: formData.status === 'active' ? 'inactive' : 'active' })}
                    className={`flex items-center gap-2 px-5 py-3 rounded-lg text-label-md transition-all cursor-pointer ${
                      formData.status === 'active'
                        ? 'bg-tertiary-container text-on-tertiary-container border border-tertiary/20'
                        : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/20'
                    }`}
                  >
                    {formData.status === 'active' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    {formData.status === 'active' ? 'نشط - يظهر في نقاط البيع' : 'غير نشط - مخفي من نقاط البيع'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/20">
          <button
            onClick={closeFormModal}
            className="flex-1 py-3 border border-outline-variant/20 rounded-lg text-on-surface-variant text-label-md hover:bg-surface-container-low transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg text-label-md shadow-sm hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
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
