import React from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import type { SupplierFilterStatus, SupplierSortOption } from '../types';

interface SupplierFilterBarProps {
  filterTab: SupplierFilterStatus;
  setFilterTab: (tab: SupplierFilterStatus) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SupplierSortOption;
  setSortBy: (sort: SupplierSortOption) => void;
  totalSuppliers: number;
  debtSuppliersCount: number;
  settledSuppliersCount: number;
}

export const SupplierFilterBar: React.FC<SupplierFilterBarProps> = ({
  filterTab,
  setFilterTab,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  totalSuppliers,
  debtSuppliersCount,
  settledSuppliersCount,
}) => {
  return (
    <div className="bg-surface-container-low/95 p-3 sm:p-4 rounded-2xl border border-outline-variant/20 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar shrink-0">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filterTab === 'all'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          <span>جميع الموردين</span>
          <span className="font-mono text-[11px] opacity-80">({totalSuppliers})</span>
        </button>

        <button
          onClick={() => setFilterTab('debt')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filterTab === 'debt'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          <span>لهم مستحقات علينا</span>
          <span className="font-mono text-[11px] opacity-80">({debtSuppliersCount})</span>
        </button>

        <button
          onClick={() => setFilterTab('settled')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filterTab === 'settled'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          <span>حسابات مسواة (خالص)</span>
          <span className="font-mono text-[11px] opacity-80">({settledSuppliersCount})</span>
        </button>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center gap-2 flex-1 md:max-w-md">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المورد أو الهاتف..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SupplierSortOption)}
            className="h-9 pr-7 pl-3 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
          >
            <option value="debt_desc">الأعلى مستحقات أولاً</option>
            <option value="debt_asc">الأقل مستحقات</option>
            <option value="name_asc">ترتيب أبجدي (أ - ي)</option>
            <option value="recent">الأحدث إضافة</option>
          </select>
          <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
