import React from 'react';
import type { Customer } from '@/types';
import { formatMoney } from '../../utils/format';

export interface CustomerDebtStatusCardProps {
  customer: Customer;
  currentSaleTotal: number;
  currencySymbol?: string;
}

export const CustomerDebtStatusCard: React.FC<CustomerDebtStatusCardProps> = ({
  customer,
  currentSaleTotal,
  currencySymbol = 'دج',
}) => {
  const currentBalance = Number(customer.balance || 0);
  const creditLimit = Number(customer.creditLimit || 0);
  const projectedBalance = currentBalance + currentSaleTotal;
  const remainingAllowance = creditLimit > 0 ? Math.max(0, creditLimit - projectedBalance) : null;

  return (
    <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-2 text-xs">
      <div className="flex items-center justify-between text-on-surface-variant font-medium">
        <span>الدين السابق المستحق:</span>
        <span className={`font-mono font-bold ${currentBalance > 0 ? 'text-red-600' : 'text-teal-600'}`}>
          {currentBalance < 0 ? `+${formatMoney(Math.abs(currentBalance))}` : formatMoney(currentBalance)} {currencySymbol}
        </span>
      </div>

      <div className="flex items-center justify-between text-on-surface-variant font-medium">
        <span>قيمة الفاتورة الحالية:</span>
        <span className="font-mono font-bold text-primary">
          +{formatMoney(currentSaleTotal)} {currencySymbol}
        </span>
      </div>

      <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between font-black">
        <span className="text-on-surface">إجمالي الدين بعد الفاتورة:</span>
        <span className="font-mono text-sm text-red-600">
          {formatMoney(projectedBalance)} {currencySymbol}
        </span>
      </div>

      {creditLimit > 0 && (
        <div className="pt-1 flex items-center justify-between text-[11px] text-on-surface-variant">
          <span>سقف الائتمان المسموح:</span>
          <span className="font-mono font-bold">
            {formatMoney(creditLimit)} {currencySymbol}
            {remainingAllowance !== null && (
              <span className="text-emerald-600 mr-1.5 font-normal">
                (المتبقي: {formatMoney(remainingAllowance)} {currencySymbol})
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};
