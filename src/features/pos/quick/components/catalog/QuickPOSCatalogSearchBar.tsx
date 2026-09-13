import React from 'react';
import { QrCode, X, Plus, PauseCircle } from 'lucide-react';

interface QuickPOSCatalogSearchBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchClear: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  suspendedOrdersCount: number;
  onOpenHeldSales: () => void;
  onOpenNewProduct?: () => void;
}

export const QuickPOSCatalogSearchBar: React.FC<QuickPOSCatalogSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchClear,
  searchInputRef,
  onSearchKeyDown,
  suspendedOrdersCount,
  onOpenHeldSales,
  onOpenNewProduct,
}) => {
  return (
    <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-2.5">
      <div className="relative flex-1">
        {/* Barcode scanner icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-brand-600 dark:text-brand-400">
          <QrCode className="w-5 h-5" />
        </div>

        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="⚡ امسح الباركود بالكاشف أو اكتب اسم الصنف / الكود (F7)..."
          className="w-full pr-11 pl-16 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-brand-500 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition shadow-2xs"
          autoFocus
        />

        {/* Left accessories: Clear button and F7 shortcut badge */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center gap-1.5">
          {searchQuery && (
            <button
              type="button"
              onClick={onSearchClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded font-mono select-none">
            F7
          </span>
        </div>
      </div>

      {/* New Item Button */}
      {onOpenNewProduct && (
        <button
          type="button"
          onClick={onOpenNewProduct}
          className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
          title="إضافة صنف أو منتج حر جديد"
        >
          <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>صنف جديد</span>
        </button>
      )}

      {/* Suspended Orders Indicator Button */}
      {suspendedOrdersCount > 0 && (
        <button
          type="button"
          onClick={onOpenHeldSales}
          className="px-3 py-2.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-700 transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
          title="الفواتير المعلقة (F3)"
        >
          <PauseCircle className="w-4 h-4" />
          <span>المعلقة ({suspendedOrdersCount})</span>
        </button>
      )}
    </div>
  );
};
