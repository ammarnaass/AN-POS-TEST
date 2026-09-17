// src/features/packs/components/card/PackFinancialSummary.tsx
// ملخص التسعير وهوامش الربح وتوفير الزبون لبطاقة الباقة (AN POS)

import React from 'react';
import { formatPackMoney } from '../../services/packCalculations';

interface PackFinancialSummaryProps {
  price: number;
  totalCost: number;
  totalRetail: number;
  margin: number;
  savings: number;
  currencySymbol: string;
}

export const PackFinancialSummary: React.FC<PackFinancialSummaryProps> = ({
  price,
  totalCost,
  totalRetail,
  margin,
  savings,
  currencySymbol,
}) => {
  return (
    <div className="bg-surface-container-low/60 rounded-xl p-3 border border-outline-variant/15 space-y-2 mb-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-on-surface-variant font-medium">سعر الباقة:</span>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-primary font-cairo">
            {formatPackMoney(price)}
          </span>
          <span className="text-xs text-on-surface-variant font-medium">{currencySymbol}</span>
        </div>
      </div>

      {savings > 0 && totalRetail > 0 && (
        <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/15">
          <span className="text-on-surface-variant text-[11px]">توفير الزبون:</span>
          <span className="font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded text-[11px]">
            {formatPackMoney(savings)} {currencySymbol} (توفير{' '}
            {((savings / totalRetail) * 100).toFixed(0)}%)
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/15">
        <span className="text-on-surface-variant text-[11px]">هامش الربح:</span>
        <span
          className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
            margin >= 20
              ? 'bg-green-500/10 text-green-700 dark:text-green-300'
              : margin > 0
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          {margin.toFixed(1)}% ({formatPackMoney(price - totalCost)} {currencySymbol})
        </span>
      </div>
    </div>
  );
};
