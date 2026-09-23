import React from 'react';
import { ShoppingBag, ChevronDown, User, BookOpen, Wallet, PlusCircle } from 'lucide-react';
import { POSCustomerButton } from '@/features/pos/debt';
import type { POSCartHeaderProps } from '../types';

export const POSCartHeader: React.FC<POSCartHeaderProps> = ({
  itemsCount,
  unitsCount,
  selectedCustomerName,
  customer,
  onSelectCustomer,
  onOpenCustomerInvoices,
  onOpenSettlementModal,
  onOpenAddDebtModal,
  formatMoney,
  currencySymbol = 'دج',
}) => {
  const balance = Number(customer?.balance || 0);
  const creditLimit = Number(customer?.creditLimit || 0);
  const hasDebt = balance > 0;
  const hasAdvance = balance < 0;
  const isLimitExceeded = creditLimit > 0 && balance > creditLimit;

  const moneyFmt = formatMoney || ((v) => (v != null ? Number(v).toLocaleString() : '0'));

  return (
    <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
          <ShoppingBag className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
            سلة المشتريات
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {itemsCount > 0
              ? `${itemsCount} أصناف (${unitsCount} قطعة)`
              : 'قائمة العناصر المحددة'}
          </span>
        </div>
      </div>

      {/* Customer & Debt Section */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Quick Ledger & Statement Button */}
        {customer && onOpenCustomerInvoices && (
          <button
            type="button"
            onClick={onOpenCustomerInvoices}
            title="دفتر حسابات وكشف حساب الزبون"
            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick Settle Debt Button */}
        {customer && hasDebt && onOpenSettlementModal && (
          <button
            type="button"
            onClick={onOpenSettlementModal}
            title="تسديد دين الزبون"
            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick Add Debt Button */}
        {customer && onOpenAddDebtModal && (
          <button
            type="button"
            onClick={onOpenAddDebtModal}
            title="إضافة دين على الزبون"
            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Unified Robust POS Customer Button */}
        <POSCustomerButton
          variant="cart_header"
          onSelectCustomer={onSelectCustomer}
          onOpenCustomerLedger={onOpenCustomerInvoices}
          onOpenSettlement={onOpenSettlementModal}
          onOpenAddDebt={onOpenAddDebtModal}
          currency={currencySymbol}
        />
      </div>
    </div>
  );
};
