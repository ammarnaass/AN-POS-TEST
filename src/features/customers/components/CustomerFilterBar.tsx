import React from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import type { CustomerFilterTab, CustomerSortBy } from '../types';

export interface CustomerFilterBarProps {
  filterTab: CustomerFilterTab;
  onSelectTab?: (tab: CustomerFilterTab) => void;
  setFilterTab?: (tab: CustomerFilterTab) => void;
  totalCustomersCount?: number;
  totalCustomers?: number;
  customersWithDebtCount?: number;
  debtCount?: number;
  exceededLimitCount?: number;
  exceededCount?: number;
  settledCount?: number;
  searchQuery: string;
  onSearchChange?: (query: string) => void;
  setSearchQuery?: (query: string) => void;
  sortBy: CustomerSortBy;
  onSortChange?: (sort: CustomerSortBy) => void;
  setSortBy?: (sort: CustomerSortBy) => void;
}

export const CustomerFilterBar: React.FC<CustomerFilterBarProps> = ({
  filterTab,
  onSelectTab,
  setFilterTab,
  totalCustomersCount,
  totalCustomers,
  customersWithDebtCount,
  debtCount,
  exceededLimitCount,
  exceededCount,
  settledCount,
  searchQuery,
  onSearchChange,
  setSearchQuery,
  sortBy,
  onSortChange,
  setSortBy,
}) => {
  const handleSelectTab = setFilterTab || onSelectTab || (() => {});
  const handleSearchChange = setSearchQuery || onSearchChange || (() => {});
  const handleSortChange = setSortBy || onSortChange || (() => {});

  const total = totalCustomers ?? totalCustomersCount ?? 0;
  const debt = debtCount ?? customersWithDebtCount ?? 0;
  const exceeded = exceededCount ?? exceededLimitCount ?? 0;
  const settled = settledCount ?? Math.max(0, total - debt);

  return (
    <div className="bg-surface-container-low/95 p-3 sm:p-4 rounded-2xl border border-outline-variant/20 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Smart Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar shrink-0">
        <button
          onClick={() => handleSelectTab('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filterTab === 'all'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          <span>جميع الزبائن</span>
          <span className="font-mono text-[11px] opacity-80">({total})</span>
        </button>

        <button
          onClick={() => handleSelectTab('debt')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filterTab === 'debt'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          <span>عليهم ديون</span>
          <span className="font-mono text-[11px] opacity-80">({debt})</span>
        </button>

        <button
          onClick={() => handleSelectTab('exceeded')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filterTab === 'exceeded'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          <span>تجاوزوا سقف الائتمان</span>
          <span className="font-mono text-[11px] opacity-80">({exceeded})</span>
        </button>

        <button
          onClick={() => handleSelectTab('settled')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filterTab === 'settled'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
        >
          <span>خالص (بدون دين)</span>
          <span className="font-mono text-[11px] opacity-80">({settled})</span>
        </button>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center gap-2 flex-1 md:max-w-md">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="ابحث بالاسم، الهاتف، أو السجل التجاري..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as CustomerSortBy)}
            className="h-9 pr-7 pl-3 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
          >
            <option value="debt_desc">الأعلى ديوناً أولاً</option>
            <option value="debt_asc">الأقل ديوناً</option>
            <option value="name_asc">ترتيب أبجدي (أ - ي)</option>
            <option value="recent">الأحدث تسجيلاً</option>
          </select>
          <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
