import React from 'react';
import { Search, X, LayoutGrid, List, Layers, Gift, Package, ShoppingBag } from 'lucide-react';
import type { PackFilterStatus, PackTypeFilter, PackViewMode } from '../types';

interface PacksFilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: PackFilterStatus;
  setStatusFilter: (s: PackFilterStatus) => void;
  typeFilter: PackTypeFilter;
  setTypeFilter: (t: PackTypeFilter) => void;
  viewMode: PackViewMode;
  setViewMode: (m: PackViewMode) => void;
  totalCount: number;
}

export const PacksFilterBar: React.FC<PacksFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  viewMode,
  setViewMode,
  totalCount,
}) => {
  const typeOptions: { value: PackTypeFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'all', label: 'الكل', icon: Layers },
    { value: 'bundle', label: 'باقات وحزم مجمعة 🎁', icon: Gift },
    { value: 'wholesale', label: 'طرود كراتين جملة 📦', icon: Package },
    { value: 'half_wholesale', label: 'نصف جملة 🛍️', icon: ShoppingBag },
  ];

  return (
    <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 space-y-3.5 shadow-2xs">
      {/* الصف الأول: البحث، التبديل بين Grid/Table، وحالة النشاط */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* حقل البحث */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="ابحث بالاسم، الباركود، أو محتويات الباقة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-on-surface font-tajawal"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* فلاتر الحالة وأزرار العرض */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 justify-between sm:justify-start">
          {/* فلتر الحالة */}
          <div className="flex items-center p-1 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
            {(['all', 'active', 'inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {st === 'all' ? 'الكل' : st === 'active' ? 'نشطة' : 'معطلة'}
              </button>
            ))}
          </div>

          {/* تبديل طريقة العرض (Grid / Table) */}
          <div className="flex items-center p-1 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="عرض كشبكة بطاقات"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="عرض كجدول بيانات تفصيلي"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* الصف الثاني: تصنيفات الباقات والحزم (Type Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-outline-variant/15">
        <span className="text-xs font-semibold text-on-surface-variant shrink-0 ml-1">
          التصنيف:
        </span>
        {typeOptions.map((opt) => {
          const isSelected = typeFilter === opt.value;
          const Icon = opt.icon;

          return (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-on-surface text-surface shadow-sm ring-2 ring-on-surface/10'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-outline-variant/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
        <span className="text-[11px] text-on-surface-variant/70 mr-auto font-sans">
          ({totalCount} نتيجة)
        </span>
      </div>
    </div>
  );
};
