// src/features/packs/modals/components/PackFinancialSimulator.tsx
// محاكي التسعير وهوامش الربح وتوفير الزبون مع فحص الخسارة (AN POS)

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatPackMoney } from '../../services/packCalculations';
import type { PackCalculations } from '../../types';

interface PackFinancialSimulatorProps {
  packPrice: string;
  setPackPrice: (price: string) => void;
  packCalculations: PackCalculations;
  selectedItemsCount: number;
  currencySymbol: string;
}

export const PackFinancialSimulator: React.FC<PackFinancialSimulatorProps> = ({
  packPrice,
  setPackPrice,
  packCalculations,
  selectedItemsCount,
  currencySymbol,
}) => {
  const priceNum = parseFloat(packPrice) || 0;
  const isLoss = priceNum > 0 && packCalculations.totalCost > priceNum;

  return (
    <div className="bg-surface-container-low/70 p-4 rounded-2xl border border-outline-variant/25 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-on-surface font-tajawal">
            سعر بيع الباقة النهائي ({currencySymbol}) <span className="text-error">*</span>
          </label>
          {packCalculations.totalRetail > 0 && (
            <span className="text-[11px] text-on-surface-variant font-medium">
              سعر التجزئة المقارن: {formatPackMoney(packCalculations.totalRetail)} {currencySymbol}
            </span>
          )}
        </div>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={packPrice}
          onChange={(e) => setPackPrice(e.target.value)}
          className="w-full px-4 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/40 text-xl font-black text-primary focus:outline-none focus:border-primary font-cairo shadow-inner"
        />
      </div>

      {/* مؤشر الربحية والتوفير */}
      {selectedItemsCount > 0 && (
        <div className="pt-2 border-t border-outline-variant/20 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/15">
              <span className="text-on-surface-variant block text-[10px]">إجمالي التكلفة:</span>
              <span className="font-bold text-on-surface">
                {formatPackMoney(packCalculations.totalCost)} {currencySymbol}
              </span>
            </div>

            <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/15">
              <span className="text-on-surface-variant block text-[10px]">هامش الربح:</span>
              <span
                className={`font-bold ${
                  packCalculations.margin >= 20
                    ? 'text-green-600'
                    : packCalculations.margin > 0
                    ? 'text-blue-600'
                    : 'text-rose-600'
                }`}
              >
                {packCalculations.margin.toFixed(1)}%
              </span>
            </div>

            <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/15">
              <span className="text-on-surface-variant block text-[10px]">توفير الزبون:</span>
              <span className="font-bold text-blue-600">
                {formatPackMoney(packCalculations.savings)} {currencySymbol} (
                {packCalculations.savingsPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          {isLoss && (
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>تنبيه: سعر البيع أقل من تكلفة الأصناف الإجمالية! ستسجل خسارة عند البيع.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
