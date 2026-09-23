import React from 'react';
import { ShoppingBag } from 'lucide-react';
import type { POSCartEmptyStateProps } from '../types';

export const POSCartEmptyState: React.FC<POSCartEmptyStateProps> = ({
  onScanPrompt = 'امسح الباركود أو اختر منتجاً من القائمة لبدء الفاتورة',
}) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500 animate-in fade-in duration-200">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <ShoppingBag className="w-7 h-7 text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">السلة فارغة حالياً</p>
      <p className="text-xs mt-1 text-slate-400 dark:text-slate-500 max-w-[220px] leading-relaxed">
        {onScanPrompt}
      </p>
    </div>
  );
};
