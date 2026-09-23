import React from 'react';
import { Banknote, CreditCard, ArrowLeftRight, UserCheck } from 'lucide-react';
import type { PaymentMethod } from '../types';

export interface PaymentMethodSelectorProps {
  paymentMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  allowCardPayment?: boolean;
  allowTransferPayment?: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethod,
  onSelectMethod,
  allowCardPayment = false,
  allowTransferPayment = false,
}) => {
  const methods = [
    { id: 'cash' as const, label: 'نقداً', icon: Banknote, shortcut: 'F1', visible: true },
    { id: 'card' as const, label: 'بطاقة', icon: CreditCard, shortcut: 'F2', visible: allowCardPayment },
    { id: 'transfer' as const, label: 'تحويل', icon: ArrowLeftRight, shortcut: 'F3', visible: allowTransferPayment },
    { id: 'credit' as const, label: 'آجل (دين)', icon: UserCheck, shortcut: 'F4', visible: true },
  ].filter((m) => m.visible);

  const gridColsClass =
    methods.length === 4
      ? 'grid-cols-4'
      : methods.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-2';

  return (
    <div className={`grid ${gridColsClass} gap-2`}>
      {methods.map((m) => {
        const Icon = m.icon;
        const active = paymentMethod === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelectMethod(m.id)}
            className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer relative ${
              active
                ? 'bg-primary text-on-primary border-primary shadow-sm ring-2 ring-primary/30'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/15'
            }`}
            title={`${m.label} (${m.shortcut})`}
          >
            <span
              className={`absolute top-2 left-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                active ? 'bg-black/20 text-white' : 'bg-outline-variant/20 text-on-surface-variant'
              }`}
            >
              {m.shortcut}
            </span>
            <Icon className="w-5 h-5" />
            <span className="text-xs font-bold">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
