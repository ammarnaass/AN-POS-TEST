import React from 'react';
import {
  Search,
  ShoppingCart,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Keyboard,
  Coins,
  Printer,
  Home,
} from 'lucide-react';

export interface Design6LeftToolsSidebarProps {
  onNavigateBack?: () => void;
  onOpenSearch: () => void;
  onOpenMiscProduct: () => void;
  onArrowUp: () => void;
  onArrowDown: () => void;
  onArrowLeft: () => void;
  onArrowRight: () => void;
  onConfirm: () => void;
  onOpenKeyboard?: () => void;
  onOpenDrawer?: () => void;
  onReprintReceipt?: () => void;
}

export const Design6LeftToolsSidebar: React.FC<Design6LeftToolsSidebarProps> = ({
  onNavigateBack,
  onOpenSearch,
  onOpenMiscProduct,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onConfirm,
  onOpenKeyboard,
  onOpenDrawer,
  onReprintReceipt,
}) => {
  return (
    <aside className="w-[170px] bg-slate-50 dark:bg-[#070b14] border-l border-slate-200 dark:border-slate-800/80 p-2 flex flex-col justify-between select-none shrink-0 transition-colors">
      {/* Top Action Tools (Non-duplicate, focused tools) */}
      <div className="flex flex-col gap-2">
        {/* صنف حر / خدمة يدوية F5 */}
        <button
          type="button"
          onClick={onOpenMiscProduct}
          className="w-full h-[48px] bg-gradient-to-r from-[#c2410c] to-[#ea580c] hover:from-[#9a3412] hover:to-[#c2410c] active:scale-95 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-xs border border-amber-500/30"
          title="إضافة منتج متنوع أو خدمة بدون باركود مسجل (F5)"
        >
          <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
          <span>صنف حر (F5)</span>
        </button>

        {/* بحث وقائمة المواد F10 */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full h-[48px] bg-gradient-to-r from-[#0f766e] to-[#14b8a6] hover:from-[#115e59] hover:to-[#0f766e] active:scale-95 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-xs border border-teal-400/30"
          title="البحث السريع واستعراض قائمة السلع (F10)"
        >
          <Search className="w-4 h-4 stroke-[2.5]" />
          <span>بحث السلع (F10)</span>
        </button>
      </div>

      {/* Middle: Touch D-Pad (توجيه لمسي مدمج) */}
      <div className="my-auto py-2 flex flex-col items-center">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 font-mono tracking-wider">
          التوجيه اللمسي
        </span>
        <div className="relative w-[124px] h-[124px] flex items-center justify-center">
          {/* UP Button */}
          <button
            type="button"
            onClick={onArrowUp}
            className="absolute top-0 w-10 h-10 bg-white hover:bg-slate-100 dark:bg-[#1e293b] dark:hover:bg-[#334155] active:bg-cyan-600 text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center justify-center shadow-xs dark:shadow-md cursor-pointer transition-all"
            title="السطر السابق (سهم للأعلى)"
          >
            <ChevronUp className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* DOWN Button */}
          <button
            type="button"
            onClick={onArrowDown}
            className="absolute bottom-0 w-10 h-10 bg-white hover:bg-slate-100 dark:bg-[#1e293b] dark:hover:bg-[#334155] active:bg-cyan-600 text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center justify-center shadow-xs dark:shadow-md cursor-pointer transition-all"
            title="السطر التالي (سهم للأسفل)"
          >
            <ChevronDown className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* LEFT Button (Decrease qty) */}
          <button
            type="button"
            onClick={onArrowLeft}
            className="absolute left-0 w-10 h-10 bg-white hover:bg-slate-100 dark:bg-[#1e293b] dark:hover:bg-[#334155] active:bg-cyan-600 text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center justify-center shadow-xs dark:shadow-md cursor-pointer transition-all"
            title="إنقاص الكمية (سهم لليسار)"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* RIGHT Button (Increase qty) */}
          <button
            type="button"
            onClick={onArrowRight}
            className="absolute right-0 w-10 h-10 bg-white hover:bg-slate-100 dark:bg-[#1e293b] dark:hover:bg-[#334155] active:bg-cyan-600 text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center justify-center shadow-xs dark:shadow-md cursor-pointer transition-all"
            title="زيادة الكمية (سهم لليمين)"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* CENTER Confirm Button */}
          <button
            type="button"
            onClick={onConfirm}
            className="w-10 h-10 bg-[#059669] hover:bg-[#047857] active:scale-95 text-white rounded-lg border border-emerald-500/50 flex items-center justify-center shadow-[0_0_12px_rgba(5,150,105,0.4)] cursor-pointer transition-all"
            title="تأكيد / الانتقال للدفع (Enter)"
          >
            <Check className="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Bottom: 3 Utility Buttons + Home Navigate Button */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onOpenKeyboard}
            className="h-11 bg-white hover:bg-slate-100 dark:bg-[#0f172a] dark:hover:bg-[#1e293b] text-cyan-600 dark:text-cyan-400 rounded-lg border border-slate-200 dark:border-slate-700/70 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-xs"
            title="لوحة المفاتيح الرقمية الافتراضية"
          >
            <Keyboard className="w-4 h-4" />
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">لوحة</span>
          </button>

          <button
            type="button"
            onClick={onOpenDrawer}
            className="h-11 bg-white hover:bg-slate-100 dark:bg-[#0f172a] dark:hover:bg-[#1e293b] text-amber-600 dark:text-amber-400 rounded-lg border border-slate-200 dark:border-slate-700/70 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-xs"
            title="فتح درج النقود كهربائياً"
          >
            <Coins className="w-4 h-4" />
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">الدرج</span>
          </button>

          <button
            type="button"
            onClick={onReprintReceipt}
            className="h-11 bg-white hover:bg-slate-100 dark:bg-[#0f172a] dark:hover:bg-[#1e293b] text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700/70 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-xs"
            title="إعادة طباعة آخر إيصال"
          >
            <Printer className="w-4 h-4" />
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">طباعة</span>
          </button>
        </div>

        {/* Home navigate button — always visible */}
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="w-full h-9 bg-white hover:bg-rose-50 text-rose-600 dark:bg-[#0f172a] dark:hover:bg-rose-950/40 dark:text-rose-400 dark:hover:text-rose-300 rounded-lg border border-slate-200 dark:border-slate-700/70 hover:border-rose-300 dark:hover:border-rose-800/60 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs font-bold shadow-xs dark:shadow-none"
            title="الرجوع إلى الصفحة الرئيسية (Esc)"
          >
            <Home className="w-3.5 h-3.5" />
            <span>الرئيسية (Esc)</span>
          </button>
        )}
      </div>
    </aside>
  );
};
