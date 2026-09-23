import React from 'react';
import { X, PlusCircle, AlertTriangle, Printer, User, Wallet, CheckCircle2 } from 'lucide-react';
import type { POSAddCustomerDebtModalProps } from '../types';
import { useAddCustomerDebt } from '../hooks/useAddCustomerDebt';
import { formatMoney } from '@/features/pos/utils/format';
import { CreditLimitAlert } from '../components/CreditLimitAlert';

export const POSAddCustomerDebtModal: React.FC<POSAddCustomerDebtModalProps> = ({
  isOpen,
  onClose,
  customer,
  currentSessionId,
  onDebtAdded,
  currencySymbol = 'دج',
  shopName = 'نقطة البيع',
}) => {
  const {
    amount,
    setAmount,
    numericAmount,
    reason,
    setReason,
    note,
    setNote,
    overrideCreditLimit,
    setOverrideCreditLimit,
    printReceipt,
    setPrintReceipt,
    isSubmitting,
    error,
    currentBalance,
    creditLimit,
    projectedBalance,
    isLimitExceeded,
    excessAmount,
    commonReasons,
    amountPresets,
    handleApplyPresetAmount,
    handleAddPresetAmount,
    handleSubmit,
    resetForm,
  } = useAddCustomerDebt({
    customer,
    currentSessionId,
    shopName,
    currencySymbol,
    onSuccess: (res) => {
      onDebtAdded?.(res);
      onClose();
    },
    onClose,
  });

  if (!isOpen) return null;

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shadow-2xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">إضافة دين مباشر للعميل</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                قيد ذري لزيادة رصيد الدين المحاسبي على حساب الزبون
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {/* Customer Summary Card */}
          {customer ? (
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{customer.name}</h4>
                    {customer.phone && (
                      <p className="text-[11px] text-on-surface-variant font-mono">{customer.phone}</p>
                    )}
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[10px] text-on-surface-variant block">الرصيد السابق:</span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatMoney(currentBalance)} {currencySymbol}
                  </span>
                </div>
              </div>

              {creditLimit > 0 && (
                <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>سقف الائتمان المسموح:</span>
                  <span className="font-mono font-bold text-on-surface">
                    {formatMoney(creditLimit)} {currencySymbol}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>يرجى اختيار زبون مسجل أولاً لإضافة دين على حسابه.</span>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface block">
              مبلغ الدين المراد قيده <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-12 pr-4 pl-12 rounded-2xl bg-surface-container-low border border-outline-variant/20 focus:border-rose-500/50 text-base font-mono font-bold text-on-surface focus:outline-hidden transition-all shadow-inner text-left"
                dir="ltr"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-xs text-on-surface-variant">
                {currencySymbol}
              </span>
            </div>

            {/* Quick Amount Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-on-surface-variant">مبالغ سريعة:</span>
              {amountPresets.map((presetVal) => (
                <button
                  key={presetVal}
                  type="button"
                  onClick={() => handleAddPresetAmount(presetVal)}
                  className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 font-mono text-[11px] font-bold text-on-surface transition-all cursor-pointer active:scale-95"
                >
                  +{presetVal.toLocaleString('fr-DZ')}
                </button>
              ))}
            </div>
          </div>

          {/* Reason / Purpose Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface block">
              سبب القيد / نوع الدين
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {commonReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`p-2 rounded-xl text-right text-[11px] font-medium border transition-all cursor-pointer truncate ${
                    reason === r
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 font-bold'
                      : 'bg-surface-container-low border-outline-variant/15 text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface block">
              ملاحظات أو تفاصيل إضافية (اختياري)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: رقم إذن التسليم، بيان البضاعة، صيانة حاسوب..."
              className="w-full h-10 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 focus:border-primary/50 text-xs text-on-surface focus:outline-hidden transition-all shadow-inner"
            />
          </div>

          {/* Projected Balance Display */}
          {numericAmount > 0 && customer && (
            <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between font-bold">
              <span className="text-on-surface">إجمالي الرصيد بعد قيد الدين:</span>
              <span className="font-mono text-sm text-rose-600 font-black">
                {formatMoney(projectedBalance)} {currencySymbol}
              </span>
            </div>
          )}

          {/* Credit Limit Alert & Supervisor Override */}
          {isLimitExceeded && (
            <div className="space-y-2">
              <CreditLimitAlert
                creditLimit={creditLimit}
                projectedDebt={projectedBalance}
                excessAmount={excessAmount}
                overrideCreditLimit={overrideCreditLimit}
                setOverrideCreditLimit={setOverrideCreditLimit}
                currencySymbol={currencySymbol}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Print receipt option */}
          <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none text-xs font-medium text-on-surface">
            <input
              type="checkbox"
              checked={printReceipt}
              onChange={(e) => setPrintReceipt(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500/20"
            />
            <Printer className="w-4 h-4 text-on-surface-variant" />
            <span>طباعة وصل قيد دين حراري للزبون فور التأكيد</span>
          </label>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-surface-container border-t border-outline-variant/15 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleModalClose}
            className="py-2.5 px-4 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={isSubmitting || !customer || numericAmount <= 0}
            onClick={handleSubmit}
            className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>جارٍ التسجيل...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد قيد الدين ({formatMoney(numericAmount)} {currencySymbol})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
