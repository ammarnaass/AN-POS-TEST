import React from 'react';
import { Package } from 'lucide-react';

interface InventoryEmptyStateProps {
  onResetFilters: () => void;
  onOpenCreateProduct: () => void;
}

export const InventoryEmptyState: React.FC<InventoryEmptyStateProps> = ({
  onResetFilters,
  onOpenCreateProduct,
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 bg-surface-container rounded-2xl border border-outline-variant/20 p-8 text-center"
      dir="rtl"
    >
      <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-4 shadow-inner">
        <Package className="w-10 h-10" />
      </div>
      <h3 className="font-cairo text-xl font-bold text-on-surface mb-2">لا توجد منتجات مطابقة</h3>
      <p className="text-body-sm text-on-surface-variant mb-6 max-w-sm">
        لم يتم العثور على أية منتجات مطابقة للبحث أو التصفية الحالية. جرب تغيير معايير البحث أو إضافة صنف جديد.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onResetFilters}
          className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant hover:text-on-surface text-body-sm font-medium transition-all cursor-pointer"
        >
          إعادة ضبط التصفية
        </button>
        <button
          onClick={onOpenCreateProduct}
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-body-sm font-bold shadow-md hover:bg-primary-container transition-all cursor-pointer"
        >
          إضافة منتج جديد
        </button>
      </div>
    </div>
  );
};

export default InventoryEmptyState;
