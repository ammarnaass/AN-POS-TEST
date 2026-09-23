import React from 'react';
import { User, BookOpen, Wallet, PlusCircle, AlertTriangle } from 'lucide-react';
import type { Customer } from '@/types';

export interface Design7DisplayAndCustomerBannerProps {
  totalAmount: number;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  selectedCustomerName: string;
  customer?: Customer | null;
  onSelectCustomer: () => void;
  onOpenCustomerLedger?: () => void;
  onOpenSettlement?: () => void;
  onOpenAddDebt?: () => void;
}

export const Design7DisplayAndCustomerBanner: React.FC<Design7DisplayAndCustomerBannerProps> = ({
  totalAmount,
  formatMoney,
  currency = 'DA',
  selectedCustomerName,
  customer,
  onSelectCustomer,
  onOpenCustomerLedger,
  onOpenSettlement,
  onOpenAddDebt,
}) => {
  // Format total string for the classic digital display
  const displayTotal = formatMoney(totalAmount);

  const balance = Number(customer?.balance || 0);
  const creditLimit = Number(customer?.creditLimit || 0);
  const hasDebt = balance > 0;
  const hasAdvance = balance < 0;
  const isLimitExceeded = creditLimit > 0 && balance > creditLimit;
  const remainingCredit = creditLimit > 0 ? Math.max(0, creditLimit - balance) : null;

  const displayName = customer?.name || selectedCustomerName?.trim() || '';

  return (
    <div
      className="flex items-stretch h-14 sm:h-16 md:h-20 border-b border-[#204060] shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-900"
      data-purpose="digital-banner"
    >
      {/* Large LED Digital Amount Banner (Right in RTL) */}
      <div className="flex-[5] sm:flex-[4] d7-led-display-bg flex items-center justify-center px-2 sm:px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
        <span
          className="text-red-500 font-black tracking-wider text-2xl sm:text-3xl md:text-5xl drop-shadow-[0_2px_8px_rgba(255,0,0,0.7)] select-none truncate max-w-full px-1"
          style={{ fontFamily: "'Courier New', monospace, sans-serif" }}
        >
          {displayTotal}
        </span>
      </div>

      {/* Customer Identity, Balance, Credit Limit & Actions (Left in RTL) */}
      <div className="flex-[6] sm:flex-[5] bg-[#cde4f9] dark:bg-[#1a2c3d] border-r-2 border-[#5a8bb8] flex items-center px-2 sm:px-3 justify-between overflow-hidden gap-1 sm:gap-2">
        {/* Customer Information & Debt Badges */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              onClick={onSelectCustomer}
              title={displayName || 'زبون عام (افتراضي)'}
              className="text-amber-800 dark:text-amber-400 hover:text-amber-900 font-extrabold text-xs sm:text-sm md:text-base drop-shadow-xs truncate cursor-pointer transition-colors max-w-[140px] sm:max-w-[200px]"
            >
              {displayName || 'زبون عام (افتراضي)'}
            </span>

            {customer?.phone && (
              <span className="hidden md:inline-block text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                ({customer.phone})
              </span>
            )}
          </div>

          {/* Financial Balance & Credit Limit Status */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[10px] sm:text-xs">
            {customer ? (
              <>
                {/* Debt / Advance Badge */}
                {hasDebt ? (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-black font-mono shadow-2xs border ${
                      isLimitExceeded
                        ? 'bg-red-600 text-white border-red-700 animate-pulse'
                        : 'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400'
                    }`}
                    title={`الدين المستحق: ${formatMoney(balance)} ${currency}`}
                  >
                    {isLimitExceeded && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
                    <span>دين: {formatMoney(balance)} {currency}</span>
                  </span>
                ) : hasAdvance ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-bold font-mono bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300">
                    <span>دائن: +{formatMoney(Math.abs(balance))} {currency}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold text-[9px] sm:text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 font-mono">
                    الحساب متوازن (0 {currency})
                  </span>
                )}

                {/* Credit Limit Badge */}
                {creditLimit > 0 && (
                  <span
                    className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-mono text-[9px] sm:text-[10px] border ${
                      isLimitExceeded
                        ? 'bg-rose-100 text-rose-800 border-rose-300 font-black'
                        : 'bg-blue-50/80 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    }`}
                    title={`سقف الائتمان: ${formatMoney(creditLimit)} ${currency} (المتبقي: ${formatMoney(remainingCredit)} ${currency})`}
                  >
                    <span>سقف: {formatMoney(creditLimit)}</span>
                    {remainingCredit !== null && !isLimitExceeded && (
                      <span className="text-emerald-700 dark:text-emerald-400 text-[9px]">
                        (متبقي: {formatMoney(remainingCredit)})
                      </span>
                    )}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                تسجيل نقدي مباشر بدون حساب آجل
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-1 shrink-0">
          {/* دفتر الحساب وكشف الحساب والفواتير */}
          {onOpenCustomerLedger && (
            <button
              onClick={onOpenCustomerLedger}
              type="button"
              title="فتح دفتر حسابات وفواتير وكشف حساب الزبون (كشف الحساب والديون)"
              className="bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] text-white border border-[#1e40af] rounded-lg px-1.5 sm:px-2.5 py-1 sm:py-1.5 font-bold shadow-xs text-[10px] sm:text-xs cursor-pointer transition-all flex items-center gap-1 active:scale-95"
            >
              <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden sm:inline">دفتر الحساب</span>
            </button>
          )}

          {/* تسديد دين الزبون (يظهر عند وجود زبون) */}
          {customer && onOpenSettlement && (
            <button
              onClick={onOpenSettlement}
              type="button"
              title="تسديد نقدي مباشر لحساب الزبون"
              className="bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white border border-emerald-700 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 font-bold shadow-xs text-[10px] sm:text-xs cursor-pointer transition-all flex items-center gap-1 active:scale-95"
            >
              <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden md:inline">تسديد</span>
            </button>
          )}

          {/* إضافة دين مباشر */}
          {customer && onOpenAddDebt && (
            <button
              onClick={onOpenAddDebt}
              type="button"
              title="قيد دين إضافي مباشر على حساب الزبون"
              className="bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white border border-rose-700 rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 font-bold shadow-xs text-[10px] sm:text-xs cursor-pointer transition-all flex items-center gap-1 active:scale-95"
            >
              <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="hidden md:inline">دين</span>
            </button>
          )}

          {/* تغيير أو اختيار الزبون */}
          <button
            onClick={onSelectCustomer}
            type="button"
            title="تغيير أو اختيار الزبون (F3)"
            className="bg-gradient-to-b from-[#7ec5f9] to-[#3a99e0] hover:from-[#6db6ee] hover:to-[#2c8ed6] active:from-[#2c8ed6] active:to-[#1e7dc4] text-white border border-[#2684cd] rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 font-bold shadow-xs text-[10px] sm:text-xs cursor-pointer transition-all flex items-center gap-1 shrink-0"
          >
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">{customer ? 'تغيير' : 'الزبون'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
