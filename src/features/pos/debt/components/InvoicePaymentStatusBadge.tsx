import React from 'react';
import { CheckCircle2, AlertCircle, CircleDollarSign, RotateCcw } from 'lucide-react';
import type { Sale } from '@/types';

export interface InvoicePaymentStatusBadgeProps {
  status?: string;
  type?: string;
  total?: number;
  paidAmount?: number;
}

export const InvoicePaymentStatusBadge: React.FC<InvoicePaymentStatusBadgeProps> = ({
  status = 'paid',
  type = 'sale',
  total = 0,
  paidAmount,
}) => {
  if (type === 'return') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
        <RotateCcw className="w-3 h-3" />
        <span>مرتجع</span>
      </span>
    );
  }

  const effectivePaid = paidAmount !== undefined ? paidAmount : (status === 'paid' ? total : 0);
  const isFullyPaid = status === 'paid' || (total > 0 && effectivePaid >= total);
  const isPartiallyPaid = !isFullyPaid && effectivePaid > 0;

  if (isFullyPaid) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        <span>مدفوعة</span>
      </span>
    );
  }

  if (isPartiallyPaid) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <CircleDollarSign className="w-3 h-3" />
        <span>مسددة جزئياً</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
      <AlertCircle className="w-3 h-3" />
      <span>غير مسددة (دين)</span>
    </span>
  );
};
