import React from 'react';
import { X } from 'lucide-react';
import type { Category } from '@/services/api/categoriesApi';
import { commonUnits, type useProductFormState } from '../../../hooks/useProductFormState';

interface ProductCategorySectionProps {
  formState: ReturnType<typeof useProductFormState>;
  categories: Category[];
}

export const ProductCategorySection: React.FC<ProductCategorySectionProps> = ({
  formState,
  categories,
}) => {
  const {
    formData,
    setFormData,
    showNewCategory,
    setShowNewCategory,
    newCategory,
    setNewCategory,
    handleAddNewCategory,
  } = formState;

  return (
    <>
      <div className="col-span-2">
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">الفئة</label>
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
              className="flex-1 px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer text-on-surface"
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
              className="flex-1 px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            <button
              type="button"
              onClick={handleAddNewCategory}
              className="px-4 py-3 bg-primary text-on-primary rounded-xl text-label-md hover:bg-primary-container transition-all cursor-pointer font-bold shadow-xs"
            >
              إضافة
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewCategory(false);
                setNewCategory('');
              }}
              className="px-4 py-3 border border-outline-variant/20 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">الوحدة</label>
        <select
          value={formData.unit}
          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
        >
          {commonUnits.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-label-sm text-on-surface-variant mb-1.5 font-medium">المقاس / اللون</label>
        <input
          placeholder="مثال: أحمر / XL"
          value={formData.variant || ''}
          onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
          className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      </div>
    </>
  );
};

export default ProductCategorySection;
