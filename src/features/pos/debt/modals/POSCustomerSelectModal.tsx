import React from 'react';
import { User, Search, UserPlus, X, Check, Phone, Wallet, DollarSign, BookOpen, PlusCircle, AlertTriangle } from 'lucide-react';
import type { Customer } from '@/types';
import { useCustomerSearch } from '../hooks/useCustomerSearch';
import { formatMoney } from '../../utils/format';

export interface POSCustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  onOpenAddCustomer: () => void;
  onOpenCustomerInvoices?: (customer?: Customer) => void;
  onOpenSettlementModal?: (customer: Customer) => void;
  onOpenAddDebtModal?: (customer: Customer) => void;
  formatMoney?: (amount?: number | null) => string;
  currencySymbol?: string;
}

export const POSCustomerSelectModal: React.FC<POSCustomerSelectModalProps> = ({
  isOpen,
  onClose,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenAddCustomer,
  onOpenCustomerInvoices,
  onOpenSettlementModal,
  onOpenAddDebtModal,
  formatMoney: customFormatMoney,
  currencySymbol = 'دج',
}) => {
  const moneyFormatter = customFormatMoney || ((val?: number | null) => formatMoney(val));
  const {
    search,
    setSearch,
    filterCategory,
    setFilterCategory,
    filteredCustomers,
    debtorCount,
  } = useCustomerSearch(customers);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface font-cairo">تحديد زبون الفاتورة وحسابات الديون</h3>
              <p className="text-[11px] text-on-surface-variant font-mono">
                اختر زبوناً للبيع، أو افتح كشف الحساب، أو سدد دين، أو قيد ديناً مباشراً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Quick Add & Ledger Button */}
        <div className="p-3 border-b border-outline-variant/15 bg-surface-container/50 space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="البحث بالاسم أو رقم الهاتف..."
                className="w-full h-10 pr-9 pl-3 rounded-xl bg-surface border border-outline-variant/20 focus:border-primary/50 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-hidden transition-all shadow-inner"
              />
            </div>

            {/* دفتر الديون الشامل */}
            {onOpenCustomerInvoices && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCustomerInvoices();
                }}
                className="h-10 px-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-600/25 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs"
                title="فتح دفتر حسابات الزبائن والديون الشامل"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">دفتر الديون</span>
              </button>
            )}

            {/* زبون جديد */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddCustomer();
              }}
              className="h-10 px-3.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>زبون جديد</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto custom-scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface hover:bg-surface-container text-on-surface-variant border border-outline-variant/15'
              }`}
            >
              الكل ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('with_debt')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterCategory === 'with_debt'
                  ? 'bg-red-600 text-white'
                  : 'bg-surface hover:bg-surface-container text-red-600 border border-red-500/20'
              }`}
            >
              <Wallet className="w-3 h-3" />
              <span>أصحاب الديون ({debtorCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('advance')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterCategory === 'advance'
                  ? 'bg-teal-600 text-white'
                  : 'bg-surface hover:bg-surface-container text-teal-600 border border-teal-500/20'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>أرصدة دائنة</span>
            </button>
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {/* General Customer (Default Option) */}
          <div
            onClick={() => {
              onSelectCustomer('');
              onClose();
            }}
            className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition-all cursor-pointer ${
              !selectedCustomerId
                ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                : 'bg-surface hover:bg-surface-container border-outline-variant/15 text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">زبون عام (افتراضي)</p>
                <p className="text-[10px] text-on-surface-variant font-mono">بدون حساب ديون أو كشف حساب آجل</p>
              </div>
            </div>
            {!selectedCustomerId && <Check className="w-4 h-4 text-primary shrink-0" />}
          </div>

          {/* Filtered Customers */}
          {filteredCustomers.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant/60 text-xs">
              لا يوجد زبون مطابق للبحث
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const isSelected = selectedCustomerId === c.id;
              const balance = Number(c.balance || 0);
              const creditLimit = Number(c.creditLimit || 0);
              const hasDebt = balance > 0;
              const hasAdvance = balance < 0;
              const isLimitExceeded = creditLimit > 0 && balance > creditLimit;
              const remainingCredit = creditLimit > 0 ? Math.max(0, creditLimit - balance) : null;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCustomer(c.id);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                      : 'bg-surface hover:bg-surface-container border-outline-variant/15 text-on-surface'
                  }`}
                >
                  {/* Customer Info */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold truncate">{c.name}</p>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-on-surface-variant/80 font-mono">
                        {c.phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{c.phone}</span>
                          </span>
                        )}

                        {creditLimit > 0 && (
                          <span
                            className={`flex items-center gap-0.5 ${
                              isLimitExceeded ? 'text-red-600 font-bold' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <span>سقف: {moneyFormatter(creditLimit)}</span>
                            {isLimitExceeded && <span className="text-red-600 font-black">(تجاوز السقف!)</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Balance & Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Debt / Advance Badge */}
                    {hasDebt ? (
                      <span
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1 ${
                          isLimitExceeded
                            ? 'bg-red-500/20 border-red-500/40 text-red-600'
                            : 'bg-red-500/10 border-red-500/20 text-red-600'
                        }`}
                      >
                        {isLimitExceeded ? <AlertTriangle className="w-3 h-3 text-red-600" /> : <Wallet className="w-3 h-3" />}
                        <span>دين: {moneyFormatter(balance)} {currencySymbol}</span>
                      </span>
                    ) : hasAdvance ? (
                      <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 text-[10px] font-mono font-bold flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span>دائن: +{moneyFormatter(Math.abs(balance))} {currencySymbol}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">متوازن</span>
                    )}

                    {/* Quick Action Buttons Group */}
                    <div className="flex items-center gap-1 mr-1">
                      {/* 1. كشف الحساب ودفتر الفواتير */}
                      {onOpenCustomerInvoices && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onOpenCustomerInvoices(c);
                          }}
                          title="عرض دفتر حسابات وفواتير وكشف حساب الزبون"
                          className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-2xs"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* 2. تسديد دين الزبون */}
                      {onOpenSettlementModal && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onOpenSettlementModal(c);
                          }}
                          title="تسديد نقدي مباشر لدين الزبون"
                          className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* 3. قيد دين جديد */}
                      {onOpenAddDebtModal && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onOpenAddDebtModal(c);
                          }}
                          title="قيد دين إضافي مباشر على الزبون"
                          className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-2xs"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-outline-variant/15 bg-surface-container flex items-center justify-between text-xs text-on-surface-variant shrink-0 font-mono">
          <span>إجمالي الزبائن المسجلين: {customers.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
