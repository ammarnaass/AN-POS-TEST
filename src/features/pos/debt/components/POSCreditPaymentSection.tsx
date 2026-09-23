import React from 'react';
import { UserCheck, UserPlus, Wallet } from 'lucide-react';
import type { Customer } from '@/types';
import { formatNumber, formatMoney } from '../../utils/format';
import type { CreditSaleValidation } from '../types';
import { CreditLimitAlert } from './CreditLimitAlert';

export interface POSCreditPaymentSectionProps {
  customerSelectRef?: React.RefObject<HTMLSelectElement | null>;
  selectedCustomer: string;
  setSelectedCustomer: (id: string) => void;
  customers: Array<Customer | { id: string; name: string; phone?: string; balance?: number; creditLimit?: number }>;
  onOpenAddCustomer: () => void;
  saleTotal: number;
  creditValidation: CreditSaleValidation;
  paidAmount?: number;
  setPaidAmount?: (amount: number) => void;
  currencySymbol?: string;
  isReturn?: boolean;
}

export const POSCreditPaymentSection: React.FC<POSCreditPaymentSectionProps> = ({
  customerSelectRef,
  selectedCustomer,
  setSelectedCustomer,
  customers,
  onOpenAddCustomer,
  saleTotal,
  creditValidation,
  paidAmount = 0,
  setPaidAmount,
  currencySymbol = 'دج',
  isReturn = false,
}) => {
  const {
    matchedCustomer,
    currentBalance,
    creditLimit,
    isCreditLimitExceeded,
    creditExcessAmount,
    hasCreditAdvance,
    overrideCreditLimit,
    setOverrideCreditLimit,
  } = creditValidation;

  const currentPaid = Math.min(saleTotal, Math.max(0, paidAmount || 0));
  const remainingDebtFromSale = Math.max(0, saleTotal - currentPaid);
  // في المرتجع: الدين ينخفض (خصم). في البيع: الدين يرتفع (إضافة).
  const projectedCustomerDebt = isReturn
    ? currentBalance - saleTotal
    : currentBalance + remainingDebtFromSale;

  return (
    <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-3.5">
      {/* Header & New Customer Trigger */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-primary" />
          <span>{isReturn ? 'تحديد حساب الزبون لقيد قيمة المرتجع:' : 'تحديد الزبون للبيع الآجل (دين):'}</span>
        </label>
        <button
          type="button"
          onClick={onOpenAddCustomer}
          className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>زبون جديد</span>
        </button>
      </div>

      {/* Customer Select Dropdown */}
      <div className="relative">
        <select
          ref={customerSelectRef as any}
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          className="w-full h-10 pr-3 pl-8 bg-surface-container-low border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
        >
          <option value="">— اختر الزبون من القائمة ({customers.length} مسجل) —</option>
          {customers.map((c) => {
            const isNeg = (c.balance || 0) < 0;
            const isExceeded = (c.creditLimit || 0) > 0 && (c.balance || 0) >= (c.creditLimit || 0);
            return (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}{' '}
                {isNeg
                  ? `[رصيد دائن: +${formatNumber(Math.abs(c.balance || 0))} ${currencySymbol}]`
                  : c.balance && c.balance > 0
                  ? `[دين سابق: ${formatNumber(c.balance)} ${currencySymbol}${isExceeded ? ' ⚠️ متجاوز' : ''}]`
                  : ''}
              </option>
            );
          })}
        </select>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/70 text-[10px]">
          ▼
        </div>
      </div>

      {/* Dynamic Debt / Return Credit Notice */}
      {selectedCustomer && matchedCustomer && (
        <div
          className={`p-3 rounded-xl border text-right space-y-1 ${
            isReturn
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
          data-purpose="dynamic-debt-notice-card"
          data-testid="dynamic-debt-notice-card"
        >
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-1.5 text-xs font-extrabold ${
              isReturn
                ? 'text-emerald-900 dark:text-emerald-200'
                : 'text-amber-900 dark:text-amber-200'
            }`}>
              <Wallet className={`w-4 h-4 shrink-0 ${
                isReturn
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`} />
              <span>{isReturn
                ? 'قيد المرتجع في حساب الزبون (خصم من الدين / رصيد دائن)'
                : 'إشعار: سيتم تسجيل الفاتورة كدين على الزبون'
              }</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isReturn
                ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
            }`}>
              {isReturn ? 'مرتجع' : (remainingDebtFromSale === saleTotal ? 'دين كامل' : 'دين جزئي متبقي')}
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {isReturn ? (
              <>
                سيتم خصم مبلغ <strong className="text-emerald-600 font-mono font-bold">{formatMoney(saleTotal)} {currencySymbol}</strong> من دين <strong className="text-on-surface font-bold">[{matchedCustomer.name}]</strong>، أو قيده كرصيد دائن لصالحه.
              </>
            ) : (
              <>
                سيتم قيد مبلغ <strong className="text-rose-600 font-mono font-bold">{formatMoney(remainingDebtFromSale)} {currencySymbol}</strong> على حساب <strong className="text-on-surface font-bold">[{matchedCustomer.name}]</strong>، وربط العملية بنظام ديون الزبائن والإشعارات المالية.
              </>
            )}
          </p>

          {/* Return: show debt impact summary inline */}
          {isReturn && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/15 text-center mt-2">
              <div className="p-2 rounded-xl bg-surface/60">
                <span className="text-[10px] text-on-surface-variant block font-bold">الدين الحالي:</span>
                <p className="text-xs font-mono font-black text-on-surface mt-0.5">
                  {formatMoney(currentBalance)} {currencySymbol}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-surface/60">
                <span className="text-[10px] text-on-surface-variant block font-bold">الدين بعد المرتجع:</span>
                <p className={`text-xs font-mono font-black mt-0.5 ${
                  projectedCustomerDebt < 0 ? 'text-emerald-600' : 'text-on-surface'
                }`}>
                  {projectedCustomerDebt < 0
                    ? `+${formatMoney(Math.abs(projectedCustomerDebt))} (رصيد دائن)`
                    : `${formatMoney(projectedCustomerDebt)} ${currencySymbol}`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Partial Payment Input (Down payment / Advance in Cash) — Sale only, not returns */}
      {!isReturn && selectedCustomer && setPaidAmount && (
        <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-on-surface">المدفوع نقداً فوراً (دفعة أولى / عربون):</span>
            <span className="text-[11px] font-bold text-primary">
              {currentPaid === 0 ? 'دين كامل 100%' : currentPaid < saleTotal ? 'دفع جزئي' : 'مسددة بالكامل'}
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              value={paidAmount === 0 ? '' : paidAmount}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                setPaidAmount(Math.min(saleTotal, val));
              }}
              placeholder="0.00 (دين كامل بدون دفعة أولى)"
              className="w-full h-10 px-3 bg-surface border border-outline-variant/30 rounded-xl text-sm font-mono font-bold text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
              {currencySymbol}
            </span>
          </div>

          {/* Quick partial payment buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setPaidAmount(0)}
              className={`py-1 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                currentPaid === 0
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-surface hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/20'
              }`}
            >
              دين كامل (0)
            </button>
            <button
              type="button"
              onClick={() => setPaidAmount(Math.round(saleTotal * 0.25))}
              className="py-1 px-1.5 rounded-lg text-[11px] font-bold bg-surface hover:bg-surface-container-high text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => setPaidAmount(Math.round(saleTotal * 0.5))}
              className="py-1 px-1.5 rounded-lg text-[11px] font-bold bg-surface hover:bg-surface-container-high text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setPaidAmount(Math.round(saleTotal * 0.75))}
              className="py-1 px-1.5 rounded-lg text-[11px] font-bold bg-surface hover:bg-surface-container-high text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
            >
              75%
            </button>
          </div>

          {/* Dynamic Debt Calculation Summary */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/15 text-center">
            <div className="p-2 rounded-xl bg-surface/60">
              <span className="text-[10px] text-on-surface-variant block font-bold">المتبقي كدين من الفاتورة:</span>
              <p className="text-xs font-mono font-black text-rose-600 mt-0.5">
                {formatMoney(remainingDebtFromSale)} {currencySymbol}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-surface/60">
              <span className="text-[10px] text-on-surface-variant block font-bold">إجمالي دين الزبون المتوقع:</span>
              <p className="text-xs font-mono font-black text-on-surface mt-0.5">
                {formatMoney(projectedCustomerDebt)} {currencySymbol}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notice when customer has credit advance */}
      {selectedCustomer && hasCreditAdvance && (
        <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs flex items-center gap-2">
          <span className="text-base shrink-0">💡</span>
          <span>
            العميل يمتلك رصيداً دائناً مسبقاً بقيمة: <strong>+{formatMoney(Math.abs(currentBalance))} {currencySymbol}</strong>
          </span>
        </div>
      )}

      {/* Warning when credit limit is exceeded — Sale only, returns decrease debt */}
      {!isReturn && isCreditLimitExceeded && (
        <CreditLimitAlert
          projectedDebt={projectedCustomerDebt}
          creditLimit={creditLimit}
          creditExcessAmount={creditExcessAmount}
          currentBalance={currentBalance}
          currentSaleTotal={saleTotal}
          overrideCreditLimit={overrideCreditLimit}
          setOverrideCreditLimit={setOverrideCreditLimit}
          currencySymbol={currencySymbol}
        />
      )}

      {/* Warning when no customer is selected */}
      {!selectedCustomer && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
          ⚠️ {isReturn
            ? 'يجب اختيار زبون من القائمة لقيد قيمة المرتجع في حسابه.'
            : 'يجب اختيار زبون من القائمة لتسجيل الفاتورة كدين آجل.'
          }
        </p>
      )}
    </div>
  );
};
