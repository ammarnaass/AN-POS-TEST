import React, { useMemo } from 'react';
import { Search, X, ArrowUpDown, List as ListIcon, LayoutGrid, Tag } from 'lucide-react';
import type { Product } from '@/types';
import type { Category } from '@/services/api/categoriesApi';
import type { SortOption, ViewMode, StockFilterStatus } from '../hooks/useInventoryFilter';

interface InventoryFilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  filterStockStatus: StockFilterStatus;
  setFilterStockStatus: (s: StockFilterStatus) => void;
  filterCategory: string;
  setFilterCategory: (c: string) => void;
  categories: Category[];
  products: Product[];
  stats: {
    lowStock: number;
    outOfStock: number;
    expiringSoonCount: number;
  };
  getStockStatus: (product: Product) => 'in_stock' | 'low_stock' | 'out_of_stock';
}

export const InventoryFilterBar: React.FC<InventoryFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  filterStockStatus,
  setFilterStockStatus,
  filterCategory,
  setFilterCategory,
  categories,
  products,
  stats,
  getStockStatus,
}) => {
  const inStockCount = products.filter((p) => getStockStatus(p) === 'in_stock').length;

  // دمج التصنيفات من قاعدة البيانات مع أي تصنيفات موجودة بالمنتجات لضمان ظهور أي تصنيف قادم من تطبيق الهاتف فوراً
  const mergedCategories = useMemo(() => {
    const list = [...categories];
    const existingNames = new Set(list.map((c) => (c?.name || '').trim().toLowerCase()));

    for (const p of products) {
      const cName = typeof p.category === 'object' && p.category !== null ? (p.category as any).name : p.category;
      if (typeof cName === 'string' && cName.trim() && cName !== 'عام' && cName.toLowerCase() !== 'general') {
        const cleanName = cName.trim();
        if (!existingNames.has(cleanName.toLowerCase())) {
          existingNames.add(cleanName.toLowerCase());
          list.push({
            id: p.categoryId || `cat-${cleanName}`,
            name: cleanName,
            color: '#3B82F6',
            icon: 'Tag',
            description: '',
            productCount: 0,
          });
        }
      }
    }
    return list;
  }, [categories, products]);

  return (
    <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 space-y-3.5 shadow-sm" dir="rtl">
      {/* Search, Sort & View Mode Row */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search Box */}
        <div className="flex-1 w-full relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، الباركود، أو رقم الصنف SKU..."
            className="w-full bg-surface-container-high/60 border border-outline-variant/30 rounded-xl py-2.5 pr-10 pl-9 text-body-sm focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
          />
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full bg-surface-container-high/60 border border-outline-variant/30 rounded-xl py-2.5 pr-9 pl-3 text-body-sm appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer font-medium text-on-surface"
            >
              <option value="newest">الأحدث إضافة</option>
              <option value="name_asc">الاسم (أ - ي)</option>
              <option value="qty_asc">الكمية: من الأقل</option>
              <option value="qty_desc">الكمية: من الأعلى</option>
              <option value="price_desc">السعر: من الأعلى</option>
              <option value="price_asc">السعر: من الأقل</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface-container-high/60 p-1 rounded-xl border border-outline-variant/30">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="عرض جدولي"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="عرض بطاقات"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Status Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-outline-variant/10">
        <span className="text-xs font-semibold text-on-surface-variant ml-2">الحالة:</span>
        {[
          { value: 'all' as const, label: 'الكل' },
          { value: 'in_stock' as const, label: 'متوفر', count: inStockCount },
          { value: 'low_stock' as const, label: 'منخفض', count: stats.lowStock, alert: stats.lowStock > 0 },
          { value: 'out_of_stock' as const, label: 'نافذ', count: stats.outOfStock, alert: stats.outOfStock > 0 },
          { value: 'expiring' as const, label: 'قريب الصلاحية', count: stats.expiringSoonCount, alert: stats.expiringSoonCount > 0 },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStockStatus(opt.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
              filterStockStatus === opt.value
                ? 'bg-primary text-on-primary shadow-sm font-bold'
                : 'bg-surface-container-high/60 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
            }`}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                  filterStockStatus === opt.value
                    ? 'bg-white/20 text-white'
                    : opt.alert
                    ? 'bg-rose-500/20 text-rose-500 font-bold'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category Filter Pills */}
      {mergedCategories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-outline-variant/10">
          <span className="text-xs font-semibold text-on-surface-variant ml-2">العائلات / التصنيفات:</span>
          <button
            onClick={() => setFilterCategory('')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              filterCategory === ''
                ? 'bg-on-surface text-surface font-bold shadow-sm'
                : 'bg-surface-container-high/50 text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            جميع التصنيفات ({products.length})
          </button>
          {mergedCategories.map((cat) => {
            const count = products.filter((p) => {
              const cName = typeof p.category === 'object' && p.category !== null ? (p.category as any).name : p.category;
              return cName === cat.name || p.categoryId === cat.id;
            }).length;
            const isSelected = filterCategory === cat.name || filterCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(isSelected ? '' : cat.name)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'bg-surface-container-high/50 text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color || '#3B82F6' }}
                />
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InventoryFilterBar;
