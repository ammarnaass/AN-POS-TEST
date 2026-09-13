import React from 'react';
import { ChevronRight, PauseCircle, Trash2, User } from 'lucide-react';
import type { Customer } from '@/types';
import { formatNumber } from '../../../utils/format';

interface QuickPOSCartHeaderProps {
  cartCount: number;
  onHoldSale: () => void;
  onClearCart: () => void;
  customers: Customer[];
  selectedCustomer: string;
  onSelectCustomer: (id: string) => void;
  onOpenAddCustomerModal: () => void;
  onSwitchMobileTab: (tab: 'catalog' | 'cart') => void;
}

export const QuickPOSCartHeader: React.FC<QuickPOSCartHeaderProps> = ({
  cartCount,
  onHoldSale,
  onClearCart,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onOpenAddCustomerModal,
  onSwitchMobileTab,
}) => {
  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomer);

  return (
    <>
      {/* Mobile Header (When switching on small screens) */}
      <div className="md:hidden p-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between shrink-0">
        <button
          onClick={() => onSwitchMobileTab('catalog')}
          className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 shadow-2xs cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
          <span>العودة لاختيار الأصناف</span>
        </button>
        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
          السلة ({cartCount} أصناف)
        </span>
      </div>

      {/* Cart Header with Customer Selection */}
      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold text-xs font-mono">
              {cartCount}
            </span>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">سلة الكاشير</h2>
          </div>

          {/* Quick Cart Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onHoldSale}
              disabled={cartCount === 0}
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-2.5 py-1 rounded-lg border border-amber-200/70 dark:border-amber-700/60 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="تعليق السلة (F2)"
              type="button"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>تعليق (F2)</span>
            </button>
            <button
              onClick={onClearCart}
              disabled={cartCount === 0}
              className="text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-800 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2.5 py-1 rounded-lg border border-rose-200/70 dark:border-rose-700/60 transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="تفريغ السلة بالكامل (F4)"
              type="button"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تفريغ (F4)</span>
            </button>
          </div>
        </div>

        {/* Customer Selector Dropdown */}
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <User className="w-4 h-4" />
          </div>
          <select
            value={selectedCustomer}
            onChange={(e) => {
              if (e.target.value === '__add_new__') {
                onOpenAddCustomerModal();
              } else {
                onSelectCustomer(e.target.value);
              }
            }}
            className="w-full pl-8 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition cursor-pointer"
          >
            <option value="">زبون نقدي (افتراضي)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.balance && c.balance > 0 ? `(دين: ${formatNumber(c.balance)} دج)` : ''}
              </option>
            ))}
            <option value="__add_new__" className="text-brand-600 font-bold">
              + إضافة زبون جديد...
            </option>
          </select>
        </div>

        {/* Debts notification if customer has balance */}
        {selectedCustomerObj && selectedCustomerObj.balance > 0 && (
          <div className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-700/60 text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between">
            <span>ديون سابقة مستحقة على العميل:</span>
            <span className="font-mono">{formatNumber(selectedCustomerObj.balance)} دج</span>
          </div>
        )}
      </div>
    </>
  );
};
