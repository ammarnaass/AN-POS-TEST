import React from 'react';

export interface SaleSummaryBreakdownProps {
  total: number;
  subtotal?: number;
  discount?: number;
  formatMoney: (val: number) => string;
  isReturn?: boolean;
}

export const SaleSummaryBreakdown: React.FC<SaleSummaryBreakdownProps> = ({
  total,
  subtotal,
  discount,
  formatMoney,
  isReturn = false,
}) => {
  return (
    <div
      className={`p-4 rounded-2xl border flex items-center justify-between text-right shadow-2xs ${
        isReturn
          ? 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300'
          : 'bg-primary/10 border-primary/20 text-primary'
      }`}
    >
      <div>
        <span className="text-xs font-bold text-on-surface-variant block">
          {isReturn ? 'إجمالي قيمة البضاعة المسترجعة للزبون:' : 'المبلغ المطلوب للدفع:'}
        </span>
        {discount && discount > 0 ? (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            (تم تطبيق خصم بقيمة {formatMoney(discount)} دج)
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline gap-1 font-mono">
        <span
          className={`text-2xl font-extrabold ${
            isReturn ? 'text-rose-600 dark:text-rose-400' : 'text-primary'
          }`}
        >
          {formatMoney(total)}
        </span>
        <span
          className={`text-xs font-bold ${
            isReturn ? 'text-rose-600 dark:text-rose-400' : 'text-primary'
          }`}
        >
          دج
        </span>
      </div>
    </div>
  );
};
