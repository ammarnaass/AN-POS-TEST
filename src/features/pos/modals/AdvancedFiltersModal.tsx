import React from 'react';
import {
  SlidersHorizontal,
  Layers,
  Truck,
  Package,
  Star,
  Check,
  RotateCcw,
  X,
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
}

interface SupplierItem {
  id: string;
  name: string;
  phone?: string;
}

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  productsCount: number;
  availableCategories: CategoryItem[];
  suppliers: SupplierItem[];
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  filterSupplier: string;
  setFilterSupplier: (sup: string) => void;
  filterStockStatus: 'all' | 'in_stock' | 'out_of_stock' | 'low_stock';
  setFilterStockStatus: (status: 'all' | 'in_stock' | 'out_of_stock' | 'low_stock') => void;
  isFeaturedOnly: boolean;
  setIsFeaturedOnly: (val: boolean) => void;
  onClearAll: () => void;
}

export const AdvancedFiltersModal: React.FC<AdvancedFiltersModalProps> = ({
  isOpen,
  onClose,
  productsCount,
  availableCategories,
  suppliers,
  filterCategory,
  setFilterCategory,
  filterSupplier,
  setFilterSupplier,
  filterStockStatus,
  setFilterStockStatus,
  isFeaturedOnly,
  setIsFeaturedOnly,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-on-surface">الفلاتر المتقدمة</h3>
              <p className="text-[11px] text-on-surface-variant">تصفية المنتجات حسب معايير متعددة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* 1. العائلة / التصنيف */}
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              <span>العائلة / التصنيف</span>
            </label>
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full h-10 pr-3 pl-8 bg-surface-container border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all shadow-2xs"
              >
                <option value="">جميع العائلات ({productsCount} صنف)</option>
                {availableCategories.map((cat) => {
                  const name = typeof cat === 'object' && cat !== null ? cat.name : String(cat);
                  return (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  );
                })}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/70 text-[10px]">
                ▼
              </div>
            </div>
          </div>

          {/* 2. المورد */}
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-primary" />
              <span>المورد</span>
            </label>
            <div className="relative">
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full h-10 pr-3 pl-8 bg-surface-container border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all shadow-2xs"
              >
                <option value="">جميع الموردين ({suppliers.length} مورد)</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} {sup.phone ? `(${sup.phone})` : ''}
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/70 text-[10px]">
                ▼
              </div>
            </div>
          </div>

          {/* 3. حالة المخزون */}
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <Package className="w-4 h-4 text-primary" />
              <span>حالة المخزون</span>
            </label>
            <div className="relative">
              <select
                value={filterStockStatus}
                onChange={(e) => setFilterStockStatus(e.target.value as any)}
                className="w-full h-10 pr-3 pl-8 bg-surface-container border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all shadow-2xs"
              >
                <option value="all">جميع الحالات</option>
                <option value="in_stock">متوفر في المخزون (الكمية &gt; 0)</option>
                <option value="out_of_stock">نفذ من المخزون (الكمية ≤ 0)</option>
                <option value="low_stock">مخزون منخفض (تحت حد التنبيه)</option>
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/70 text-[10px]">
                ▼
              </div>
            </div>
          </div>

          {/* 4. المنتجات المميزة */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsFeaturedOnly(!isFeaturedOnly)}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                isFeaturedOnly
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/20 text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${isFeaturedOnly ? 'fill-current text-amber-500' : 'text-on-surface-variant'}`} />
                <span>عرض المنتجات المميزة فقط</span>
              </div>
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                isFeaturedOnly ? 'bg-amber-500 border-amber-500 text-white' : 'border-outline-variant/40'
              }`}>
                {isFeaturedOnly && <Check className="w-3.5 h-3.5" />}
              </span>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-outline-variant/15 flex items-center gap-2.5">
            <button
              onClick={() => {
                onClearAll();
                onClose();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/25 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-500" />
              <span>إعادة تعيين</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>تطبيق الفلاتر</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
