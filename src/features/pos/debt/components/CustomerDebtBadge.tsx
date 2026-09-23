import React from 'react';
import { User, Wallet, AlertTriangle } from 'lucide-react';
import type { Customer } from '@/types';
import { formatMoney } from '../../utils/format';

export interface CustomerDebtBadgeProps {
  customer?: Customer | null;
  customerName?: string;
  onClick?: () => void;
  variant?: 'compact' | 'standard' | 'detailed';
  currencySymbol?: string;
  className?: string;
}

export const CustomerDebtBadge: React.FC<CustomerDebtBadgeProps> = ({
  customer,
  customerName,
  onClick,
  variant = 'standard',
  currencySymbol = 'دج',
  className = '',
}) => {
  const displayName = customer?.name || customerName || 'زبون عام (افتراضي)';
  const balance = Number(customer?.balance || 0);
  const creditLimit = Number(customer?.creditLimit || 0);
  const hasDebt = balance > 0;
  const hasAdvance = balance < 0;
  const isLimitExceeded = creditLimit > 0 && balance > creditLimit;

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
          hasDebt
            ? isLimitExceeded
              ? 'bg-red-500/10 border-red-500/30 text-red-600'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
            : hasAdvance
            ? 'bg-teal-500/10 border-teal-500/30 text-teal-600'
            : 'bg-surface-container border-outline-variant/20 text-on-surface'
        } ${className}`}
        title={displayName}
      >
        <User className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[100px]">{displayName}</span>
        {hasDebt && (
          <span className="font-mono text-[10px] font-black">
            ({formatMoney(balance)})
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-2 p-2 rounded-xl transition-all cursor-pointer border text-right ${
        hasDebt
          ? isLimitExceeded
            ? 'bg-red-500/10 border-red-500/30 text-red-600 hover:bg-red-500/20'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
          : hasAdvance
          ? 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20'
          : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/20 text-on-surface'
      } ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0 shadow-2xs">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold truncate leading-tight">{displayName}</p>
          <p className="text-[10px] text-on-surface-variant/80 font-mono">
            {!customer?.id
              ? 'نقدي (بدون حساب دين)'
              : customer.phone || 'زبون مسجل'}
          </p>
        </div>
      </div>

      {hasDebt && (
        <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 font-mono font-bold text-[10px]">
          {isLimitExceeded ? <AlertTriangle className="w-3 h-3 text-red-600" /> : <Wallet className="w-3 h-3" />}
          <span>دين: {formatMoney(balance)} {currencySymbol}</span>
        </div>
      )}

      {hasAdvance && (
        <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 font-mono font-bold text-[10px]">
          <span>دائن: +{formatMoney(Math.abs(balance))} {currencySymbol}</span>
        </div>
      )}
    </button>
  );
};
