import React from 'react';
import { formatMoney } from '@/features/pos/utils/format';
import type { ReturnFinancialSummary as ReturnFinancialSummaryType } from '../types';

export interface ReturnFinancialSummaryProps {
  summary: ReturnFinancialSummaryType;
  currency?: string;
}

export const ReturnFinancialSummary: React.FC<ReturnFinancialSummaryProps> = ({
  summary,
  currency = 'دج',
}) => {
  return (
    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between text-right">
      <div>
        <span className="text-xs font-bold text-red-800 dark:text-red-300 block">
          إجمالي المبلغ المسترد للزبون:
        </span>
        <span className="text-[11px] text-red-600 dark:text-red-400">
          {summary.totalPieces} قطعة من {summary.selectedItemsCount} صنف محدد
        </span>
      </div>
      <div className="flex items-baseline gap-1 font-mono">
        <span className="text-2xl font-black text-red-600">
          {formatMoney(summary.totalAmount)}
        </span>
        <span className="text-xs font-bold text-red-600">{currency}</span>
      </div>
    </div>
  );
};
