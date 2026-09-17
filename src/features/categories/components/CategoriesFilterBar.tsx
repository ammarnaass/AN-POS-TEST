// src/features/categories/components/CategoriesFilterBar.tsx
// شريط البحث والفلترة السريعة وتبديل نمط العرض (AN POS)

import React from 'react';
import { Search, X, LayoutGrid, List } from 'lucide-react';
import type { CategoryFilterType, CategoryViewMode } from '../constants/categoryConstants';

interface CategoriesFilterBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  activeFilter: CategoryFilterType;
  onFilterChange: (filter: CategoryFilterType) => void;
  viewMode: CategoryViewMode;
  onViewModeChange: (mode: CategoryViewMode) => void;
  totalCount: number;
  withProductsCount: number;
  emptyCount: number;
}

export const CategoriesFilterBar: React.FC<CategoriesFilterBarProps> = ({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  totalCount,
  withProductsCount,
  emptyCount,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface p-3 rounded-2xl border border-outline-variant/20">
      {/* حقل البحث */}
      <div className="relative w-full md:w-80">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="بحث باسم العائلة أو الوصف..."
          className="w-full h-11 pr-10 pl-9 bg-surface-container-low rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20 placeholder:text-on-surface-variant/50 transition-all"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
            title="تفريغ البحث"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* أزرار الفلترة السريعة */}
      <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          الكل ({totalCount})
        </button>
        <button
          onClick={() => onFilterChange('with-products')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeFilter === 'with-products'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          بها منتجات ({withProductsCount})
        </button>
        <button
          onClick={() => onFilterChange('empty')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeFilter === 'empty'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          فارغة ({emptyCount})
        </button>
        <button
          onClick={() => onFilterChange('root')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeFilter === 'root'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          رئيسية
        </button>
      </div>

      {/* تبديل طريقة العرض */}
      <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/20 mr-auto md:mr-0">
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-2 rounded-lg transition-all cursor-pointer ${
            viewMode === 'grid'
              ? 'bg-surface text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          title="عرض البطاقات"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange('table')}
          className={`p-2 rounded-lg transition-all cursor-pointer ${
            viewMode === 'table'
              ? 'bg-surface text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
          title="عرض الجدول"
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
