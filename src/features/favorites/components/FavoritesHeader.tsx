import React from 'react';
import { Star, Terminal, Zap, FolderPlus } from 'lucide-react';

interface FavoritesHeaderProps {
  terminalCategoryMode: 'favorites' | 'products';
  onToggleTerminalMode: () => void;
  onOpenQuickPack: () => void;
  onOpenNewCategory: () => void;
}

export const FavoritesHeader: React.FC<FavoritesHeaderProps> = ({
  terminalCategoryMode,
  onToggleTerminalMode,
  onOpenQuickPack,
  onOpenNewCategory,
}) => {
  return (
    <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xs">
          <Star className="w-8 h-8 fill-amber-500 text-amber-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black font-cairo text-on-surface dark:text-white">
              إدارة المفضلة والعبوات السريعة
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              نقطة البيع · تصميم 5
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
            قم بإنشاء تصنيفات مخصصة وتصنيف العبوات والباقات بداخلها لتظهر مباشرة كأزرار سريعة في كاشير تصميم 5
          </p>
        </div>
      </div>

      {/* Quick controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status badge & toggle for Design 5 */}
        <div className="flex items-center gap-2 bg-surface-container dark:bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-outline-variant/20 dark:border-slate-700">
          <Terminal className="w-4 h-4 text-emerald-500" />
          <div className="text-right">
            <span className="text-[11px] font-bold text-on-surface dark:text-slate-300 block">
              عرض تصميم 5:
            </span>
            <span className="text-[10px] text-on-surface-variant dark:text-slate-400">
              {terminalCategoryMode === 'favorites' ? '★ مفعل (المفضلة والعبوات)' : '📦 تصنيفات التجزئة'}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleTerminalMode}
            className={`mr-2 px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
              terminalCategoryMode === 'favorites'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            {terminalCategoryMode === 'favorites' ? 'المفضلة نشطة' : 'تفعيل المفضلة'}
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenQuickPack}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl font-bold text-sm shadow-sm transition active:scale-95 cursor-pointer"
          title="إنشاء كرتونة أو باقة بدون باركود من منتج تجزئة موجود"
        >
          <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
          <span>⚡ إنشاء عبوة سريعة +</span>
        </button>

        <button
          type="button"
          onClick={onOpenNewCategory}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 rounded-2xl font-bold text-sm shadow-sm transition active:scale-95 cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" />
          <span>تصنيف مفضلة جديد +</span>
        </button>
      </div>
    </div>
  );
};
