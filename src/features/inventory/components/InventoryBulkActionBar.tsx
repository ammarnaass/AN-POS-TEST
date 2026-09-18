import React from 'react';
import { Trash2, X, CheckSquare, Layers } from 'lucide-react';

interface InventoryBulkActionBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  isAllFilteredSelected: boolean;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
  onOpenDeleteModal: () => void;
}

export const InventoryBulkActionBar: React.FC<InventoryBulkActionBarProps> = ({
  selectedCount,
  totalFilteredCount,
  isAllFilteredSelected,
  onSelectAllFiltered,
  onClearSelection,
  onOpenDeleteModal,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[92%] sm:w-auto min-w-[340px] sm:min-w-[540px] bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-5 duration-200"
      dir="rtl"
    >
      {/* Count & Info */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
          <CheckSquare className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold font-cairo">
              تم تحديد <span className="text-blue-400 font-mono text-base px-1">{selectedCount}</span> منتج
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              (من إجمالي {totalFilteredCount})
            </span>
          </div>

          {!isAllFilteredSelected && totalFilteredCount > selectedCount && (
            <button
              type="button"
              onClick={onSelectAllFiltered}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors mt-0.5"
            >
              <Layers className="w-3 h-3" />
              <span>تحديد كل الـ {totalFilteredCount} منتج المفلترة</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 mr-auto">
        <button
          type="button"
          onClick={onClearSelection}
          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>إلغاء التحديد</span>
        </button>

        <button
          type="button"
          onClick={onOpenDeleteModal}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-900/30 flex items-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>حذف المحددة ({selectedCount})</span>
        </button>
      </div>
    </div>
  );
};

export default InventoryBulkActionBar;
