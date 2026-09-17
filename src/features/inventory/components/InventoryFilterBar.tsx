import React, { useMemo } from 'react';
import { Search, X, ArrowUpDown, List as ListIcon, LayoutGrid } from 'lucide-react';
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

  // دمج التصنيفات من قاعدة البيانات مع أي تصنيفات موجودة بالمنتجات
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
    <section
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xs"
      data-purpose="filters-panel"
      dir="rtl"
    >
      {/* 1. Top Search, Sorting & View Toggles */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Wide Search Input */}
        <div className="relative w-full md:flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، الباركود، أو رقم الصنف SKU..."
            className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sorting & Display Toggles */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none inline-flex items-center gap-2 pr-9 pl-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
            >
              <option value="newest">الأحدث إضافة</option>
              <option value="name_asc">الاسم (أ - ي)</option>
              <option value="qty_asc">الكمية: من الأقل</option>
              <option value="qty_desc">الكمية: من الأعلى</option>
              <option value="price_desc">السعر: من الأعلى</option>
              <option value="price_asc">السعر: من الأقل</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* View Mode: List vs Grid */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              aria-label="عرض قائمة"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="عرض كجدول بيانات"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="عرض شبكي"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="عرض كشبكة بطاقات"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Status Badges Filter */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <span className="text-slate-400 font-medium ml-1">الحالة:</span>
        <button
          onClick={() => setFilterStockStatus('all')}
          className={`px-3 py-1 font-bold rounded-lg transition cursor-pointer ${
            filterStockStatus === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          الكل
        </button>
        <button
          onClick={() => setFilterStockStatus('in_stock')}
          className={`px-2.5 py-1 font-medium rounded-lg transition cursor-pointer ${
            filterStockStatus === 'in_stock'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          متوفر <span className="font-mono text-slate-400 text-[11px]">({inStockCount})</span>
        </button>
        <button
          onClick={() => setFilterStockStatus('low_stock')}
          className={`px-2.5 py-1 font-medium rounded-lg transition cursor-pointer border ${
            filterStockStatus === 'low_stock'
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs font-bold'
              : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 border-amber-200 dark:border-amber-800/60'
          }`}
        >
          منخفض <span className="font-mono font-bold">{stats.lowStock}</span>
        </button>
        <button
          onClick={() => setFilterStockStatus('out_of_stock')}
          className={`px-2.5 py-1 font-medium rounded-lg transition cursor-pointer ${
            filterStockStatus === 'out_of_stock'
              ? 'bg-rose-600 text-white shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          نافذ <span className="font-mono text-slate-400 text-[11px]">({stats.outOfStock})</span>
        </button>
        <button
          onClick={() => setFilterStockStatus('expiring')}
          className={`px-2.5 py-1 font-medium rounded-lg transition cursor-pointer ${
            filterStockStatus === 'expiring'
              ? 'bg-amber-600 text-white shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          قريب الصلاحية <span className="font-mono text-slate-400 text-[11px]">({stats.expiringSoonCount})</span>
        </button>
      </div>

      {/* 3. Category Chips Filter (Horizontal Scrolling) */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap ml-1">العائلات / التصنيفات:</span>
        <button
          onClick={() => setFilterCategory('')}
          className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition cursor-pointer ${
            filterCategory === ''
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          جميع التصنيفات <span className="font-mono opacity-80">({products.length})</span>
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
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isSelected ? '#FFFFFF' : cat.color || '#3B82F6' }}
              />
              <span>{cat.name}</span>
              <span className={`text-[11px] font-mono ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default InventoryFilterBar;
