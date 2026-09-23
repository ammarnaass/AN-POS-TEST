import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Zap,
  Plus,
} from 'lucide-react';
import { POSReturnButton } from '@/features/pos/returns';
import type { Category } from '@/types';

export interface POSSearchBarcodeHeaderProps {
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  onOpenFreeProduct: () => void;
  onOpenReturns: () => void;
  returnMode: boolean;
  priceTier?: '1' | '2' | '3' | '4';
  onSelectPriceTier?: (tier: '1' | '2' | '3' | '4') => void;
  categories: (Category | { id: string; name: string } | string)[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  totalProductsCount?: number;
  categoryCounts?: Record<string, number>;
  onNavigateQuickPOS?: () => void;
  showCategoryFilters?: boolean;
}

export const POSSearchBarcodeHeader: React.FC<POSSearchBarcodeHeaderProps> = ({
  barcodeInputRef,
  barcodeInput,
  setBarcodeInput,
  searchQuery,
  setSearchQuery,
  onBarcodeSubmit,
  onOpenFreeProduct,
  onOpenReturns,
  returnMode,
  priceTier = '1',
  onSelectPriceTier,
  categories,
  selectedCategory,
  onSelectCategory,
  totalProductsCount = 0,
  categoryCounts = {},
  onNavigateQuickPOS,
  showCategoryFilters = true,
}) => {
  const navigate = useNavigate();

  const getCatId = (cat: any) => (typeof cat === 'string' ? cat : cat.id || cat.name);
  const getCatName = (cat: any) => (typeof cat === 'string' ? cat : cat.name || cat.id);

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 shrink-0 overflow-hidden">
      {/* شريط الإدخال والبحث والأزرار السريعة */}
      <div className="p-3 sm:p-3.5 flex flex-col md:flex-row items-stretch md:items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-800/80">
        {/* حقل البحث وقراءة الباركود */}
        <div className="relative flex-1">
          <input
            ref={barcodeInputRef}
            value={barcodeInput || searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setBarcodeInput(val);
              setSearchQuery(val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onBarcodeSubmit(e);
              }
            }}
            type="text"
            placeholder="امسح الباركود أو ابحث باسم المنتج... (F7)"
            className="w-full pr-10 pl-20 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs transition placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
          />
          <span className="absolute right-3 top-3 text-slate-400 dark:text-slate-500 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <span className="absolute left-2 top-2 bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px] px-2 py-1 rounded border border-slate-300 dark:border-slate-600 font-semibold pointer-events-none">
            F7 للبحث
          </span>
        </div>

        {/* أزرار خيارات سريعة */}
        <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
          <button
            type="button"
            onClick={onNavigateQuickPOS || (() => navigate('/pos/quick'))}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-200 dark:border-amber-800/60 transition cursor-pointer"
            title="الانتقال إلى نقطة البيع السريع"
          >
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500" />
            <span>نقطة البيع السريع</span>
          </button>

          <button
            type="button"
            onClick={onOpenFreeProduct}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="إضافة منتج حر غير مسجل (F8)"
          >
            <Plus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>منتج حر (F8)</span>
          </button>

          {/* زر الإرجاع الموحد (F9) */}
          <POSReturnButton variant="compact" onOpenReturns={onOpenReturns} />

          {/* تبديل فئات الأسعار الأربعة: س1 تجزئة، س2 نصف جملة، س3 جملة، س4 خاص */}
          {onSelectPriceTier && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold gap-0.5">
              <button
                type="button"
                onClick={() => onSelectPriceTier('1')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs ${
                  priceTier === '1'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="سعر التجزئة س1 (Alt+1)"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '1' ? 'bg-white' : 'bg-blue-500'}`} />
                <span>س1 (تجزئة)</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPriceTier('2')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs ${
                  priceTier === '2'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="سعر نصف الجملة س2 (Alt+2)"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '2' ? 'bg-white' : 'bg-emerald-500'}`} />
                <span>س2</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPriceTier('3')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs ${
                  priceTier === '3'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="سعر الجملة س3 (Alt+3)"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '3' ? 'bg-white' : 'bg-purple-500'}`} />
                <span>س3 (جملة)</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPriceTier('4')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs ${
                  priceTier === '4'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                title="سعر خاص س4 (Alt+4)"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priceTier === '4' ? 'bg-white' : 'bg-amber-500'}`} />
                <span>س4 (خاص)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* شريط التصنيفات السريعة (Categories Pills) */}
      {showCategoryFilters && (
        <div
          className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto bg-slate-50/60 dark:bg-slate-900/60 shrink-0 scrollbar-none"
          data-purpose="category-filters"
        >
          <button
            type="button"
            onClick={() => onSelectCategory('')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              !selectedCategory || selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            الكل {totalProductsCount > 0 ? `(${totalProductsCount})` : ''}
          </button>

          {categories.map((cat) => {
            const catId = getCatId(cat);
            const catName = getCatName(cat);
            const isSelected = selectedCategory === catId || selectedCategory === catName;
            const count = categoryCounts[catName] || categoryCounts[catId] || 0;

            return (
              <button
                key={catId || catName}
                type="button"
                onClick={() => onSelectCategory(catId)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {catName} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
