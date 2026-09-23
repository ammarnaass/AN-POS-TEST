import React from 'react';

export interface PaymentChangeDisplayProps {
  changeAmount: number;
  isPaidSufficient: boolean;
  formatMoney: (val: number) => string;
}

export const PaymentChangeDisplay: React.FC<PaymentChangeDisplayProps> = ({
  changeAmount,
  isPaidSufficient,
  formatMoney,
}) => {
  return (
    <div
      className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
        isPaidSufficient
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 shadow-2xs'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
      }`}
    >
      <span className="text-xs font-bold">
        {isPaidSufficient ? 'المبلغ المتبقي للزبون (الفكة):' : 'المبلغ المدفوع غير كافٍ:'}
      </span>
      <span className="text-xl font-extrabold font-mono">
        {formatMoney(changeAmount)} دج
      </span>
    </div>
  );
};
