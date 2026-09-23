import React from 'react';

export interface SaleSummaryBreakdownProps {
  total: number;
  subtotal?: number;
  discount?: number;
  formatMoney: (val: number) => string;
}

export const SaleSummaryBreakdown: React.FC<SaleSummaryBreakdownProps> = ({
  total,
  subtotal,
  discount,
  formatMoney,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-right shadow-2xs">
      <div>
        <span className="text-xs font-bold text-on-surface-variant block">المبلغ المطلوب للدفع:</span>
        {discount && discount > 0 ? (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            (تم تطبيق خصم بقيمة {formatMoney(discount)} دج)
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline gap-1 font-mono">
        <span className="text-2xl font-extrabold text-primary">
          {formatMoney(total)}
        </span>
        <span className="text-xs font-bold text-primary">دج</span>
      </div>
    </div>
  );
};
