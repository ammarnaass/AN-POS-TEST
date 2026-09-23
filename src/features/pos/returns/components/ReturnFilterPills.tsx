import React from 'react';
import { Calendar, Filter, Search, Tag, Package } from 'lucide-react';
import type {
  ReturnDateRangeFilter,
  ReturnEligibilityStatus,
  ReturnSearchMode,
} from '../types';

export interface ReturnFilterPillsProps {
  dateRange: ReturnDateRangeFilter;
  onDateRangeChange: (r: ReturnDateRangeFilter) => void;
  eligibilityStatus: ReturnEligibilityStatus;
  onEligibilityChange: (s: ReturnEligibilityStatus) => void;
  searchMode: ReturnSearchMode;
  onSearchModeChange: (m: ReturnSearchMode) => void;
  refundableCount?: number;
  partiallyReturnedCount?: number;
  fullyReturnedCount?: number;
}

export const ReturnFilterPills: React.FC<ReturnFilterPillsProps> = ({
  dateRange,
  onDateRangeChange,
  eligibilityStatus,
  onEligibilityChange,
  searchMode,
  onSearchModeChange,
  refundableCount,
  partiallyReturnedCount,
  fullyReturnedCount,
}) => {
  return (
    <div className="space-y-2">
      {/* الصف الأول: وضع البحث والنطاق الزمني */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* أوضاع البحث: شامل، بالفاتورة، بالصنف */}
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant/15">
          <button
            type="button"
            onClick={() => onSearchModeChange('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
              searchMode === 'all'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Search className="w-3 h-3" />
            <span>بحث شامل</span>
          </button>
          <button
            type="button"
            onClick={() => onSearchModeChange('invoice')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
              searchMode === 'invoice'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>الفاتورة / الزبون</span>
          </button>
          <button
            type="button"
            onClick={() => onSearchModeChange('product')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
              searchMode === 'product'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Package className="w-3 h-3" />
            <span>المنتج / الباركود</span>
          </button>
        </div>

        {/* فلاتر النطاق الزمني */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <span className="text-[10px] text-on-surface-variant flex items-center gap-1 ml-1">
            <Calendar className="w-3 h-3" />
          </span>
          {(
            [
              { id: 'all', label: 'كافة الفترات' },
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday', label: 'أمس' },
              { id: 'week', label: 'آخر 7 أيام' },
              { id: 'month', label: 'آخر شهر' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onDateRangeChange(t.id)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                dateRange === t.id
                  ? 'bg-secondary-container text-on-secondary-container font-bold'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* الصف الثاني: فلاتر حالة الأهلية للإرجاع */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-1">
        <span className="text-[10px] text-on-surface-variant flex items-center gap-1 ml-1">
          <Filter className="w-3 h-3" />
          <span>الأهلية:</span>
        </span>

        <button
          type="button"
          onClick={() => onEligibilityChange('all')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            eligibilityStatus === 'all'
              ? 'bg-surface-container-highest text-on-surface font-bold border border-outline-variant/30'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          الكل
        </button>

        <button
          type="button"
          onClick={() => onEligibilityChange('refundable')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            eligibilityStatus === 'refundable'
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>متاح للإرجاع</span>
          {typeof refundableCount === 'number' && (
            <span className="text-[10px] opacity-75 font-mono">({refundableCount})</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onEligibilityChange('partially_returned')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            eligibilityStatus === 'partially_returned'
              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/30'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>مرتجع جزئي سابق</span>
          {typeof partiallyReturnedCount === 'number' && (
            <span className="text-[10px] opacity-75 font-mono">({partiallyReturnedCount})</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onEligibilityChange('fully_returned')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            eligibilityStatus === 'fully_returned'
              ? 'bg-red-500/20 text-red-700 dark:text-red-300 font-bold border border-red-500/30'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span>مسترجع بالكامل</span>
          {typeof fullyReturnedCount === 'number' && (
            <span className="text-[10px] opacity-75 font-mono">({fullyReturnedCount})</span>
          )}
        </button>
      </div>
    </div>
  );
};
