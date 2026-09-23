import React from 'react';
import { Banknote, UserCheck } from 'lucide-react';
import type { RefundMethod } from '../types';

export interface RefundMethodSelectorProps {
  refundMethod: RefundMethod;
  onChangeMethod: (method: RefundMethod) => void;
  hasCustomer?: boolean;
}

export const RefundMethodSelector: React.FC<RefundMethodSelectorProps> = ({
  refundMethod,
  onChangeMethod,
  hasCustomer = false,
}) => {
  return (
    <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2">
      <label className="text-xs font-bold text-on-surface block">طريقة استرداد القيمة:</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChangeMethod('cash')}
          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
            refundMethod === 'cash'
              ? 'bg-primary text-on-primary border-primary shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>نقداً من الخزينة</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeMethod('customer_credit')}
          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
            refundMethod === 'customer_credit'
              ? 'bg-primary text-on-primary border-primary shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>رصيد للعميل</span>
        </button>
      </div>
      <p className="text-[10px] text-on-surface-variant">
        {refundMethod === 'cash'
          ? 'سيتم تسجيل خروج المبلغ من مناوبة الصندوق الحالية.'
          : hasCustomer
          ? 'سيتم خصم المبلغ من دين العميل أو قيده كرصيد دائن لصالحه.'
          : 'تنبيه: يُفضل اختيار زبون مسجل لإضافة الرصيد إلى حسابه.'}
      </p>
    </div>
  );
};
