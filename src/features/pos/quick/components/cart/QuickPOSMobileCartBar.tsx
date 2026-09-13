import React from 'react';
import { ShoppingCart, ChevronLeft } from 'lucide-react';
import { formatMoney } from '../../../utils/format';
import type { QuickPOSSaleSummary } from '../../types';

interface QuickPOSMobileCartBarProps {
  cartCount: number;
  saleSummary: QuickPOSSaleSummary;
  onSwitchMobileTab: (tab: 'catalog' | 'cart') => void;
  baseCurrency?: string;
}

export const QuickPOSMobileCartBar: React.FC<QuickPOSMobileCartBarProps> = ({
  cartCount,
  saleSummary,
  onSwitchMobileTab,
  baseCurrency = 'دج',
}) => {
  if (cartCount === 0) return null;

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-brand-500/40 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-md shadow-brand-500/25 relative shrink-0">
          <ShoppingCart className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center font-mono shadow-xs">
            {cartCount}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">إجمالي السلة:</p>
          <p className="text-sm font-black font-mono text-brand-600 dark:text-brand-400 truncate">
            {formatMoney(saleSummary?.total)} {baseCurrency}
          </p>
        </div>
      </div>

      <button
        onClick={() => onSwitchMobileTab('cart')}
        className="px-4 py-2.5 bg-gradient-to-r from-brand-600 via-orange-600 to-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-brand-500/25 flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
        type="button"
      >
        <span>عرض السلة والدفع</span>
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
};
