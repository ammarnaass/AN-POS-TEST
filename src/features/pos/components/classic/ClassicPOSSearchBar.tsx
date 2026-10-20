import React from 'react';
import { Barcode, Search, Plus, LayoutGrid, X } from 'lucide-react';

interface ClassicPOSSearchBarProps {
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  showProductGrid?: boolean;
  onToggleProductGrid?: () => void;
}

export const ClassicPOSSearchBar: React.FC<ClassicPOSSearchBarProps> = React.memo(({
  barcodeInputRef,
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  searchQuery,
  setSearchQuery,
  showProductGrid = false,
  onToggleProductGrid,
}) => {
  return (
    <div className="bg-slate-200/90 dark:bg-slate-800/90 border-b border-slate-300 dark:border-slate-700 px-3 py-2 flex items-center gap-2 shrink-0 select-none">
      {/* حقل مسح الباركود */}
      <form onSubmit={onBarcodeSubmit} className="flex-1 relative flex items-center">
        <div className="absolute right-3 text-slate-400 dark:text-slate-500 flex items-center gap-2 pointer-events-none">
          <Barcode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <kbd className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300 rounded px-1.5 py-0.5 text-[11px] font-mono">
            F7
          </kbd>
        </div>
        <input
          ref={barcodeInputRef}
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          placeholder="امسح الباركود (F7) أو اكتب الرمز واضغط Enter..."
          className="w-full pr-20 pl-9 py-2.5 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-lg text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white shadow-xs"
        />
        {barcodeInput && (
          <button
            type="button"
            onClick={() => setBarcodeInput('')}
            className="absolute left-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="مسح النص"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* حقل البحث بالاسم أو التعيين */}
      <div className="w-56 sm:w-72 relative flex items-center">
        <div className="absolute right-3 text-slate-400 dark:text-slate-500 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو التعيين..."
          className="w-full pr-9 pl-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute left-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="مسح البحث"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* زر إضافة يدوي */}
      <button
        type="button"
        onClick={onBarcodeSubmit}
        className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition shrink-0 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>إضافة</span>
      </button>

      {/* زر إظهار/إخفاء شبكة السلع F8 */}
      {onToggleProductGrid && (
        <button
          type="button"
          onClick={onToggleProductGrid}
          className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-3 py-2.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
          title="إظهار أو إخفاء شبكة المنتجات (F8)"
        >
          <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">{showProductGrid ? 'إخفاء شبكة السلع' : 'إظهار شبكة السلع'}</span>
          <kbd className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300 rounded px-1.5 py-0.5 text-[10px] font-mono">
            F8
          </kbd>
        </button>
      )}
    </div>
  );
});

export default ClassicPOSSearchBar;
