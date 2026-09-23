import React from 'react';
import { getCashPresets, type CashPresetOption } from '../services/posPaymentCalculationService';

export interface CashPresetsButtonsProps {
  total: number;
  onSelectAmount: (val: number) => void;
}

export const CashPresetsButtons: React.FC<CashPresetsButtonsProps> = ({
  total,
  onSelectAmount,
}) => {
  const presets: CashPresetOption[] = getCashPresets(total);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={() => onSelectAmount(btn.val)}
          className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
          title={`${btn.label} (${btn.shortcut})`}
        >
          <span>{btn.label}</span>
          <span className="text-[10px] font-mono text-on-surface-variant/70 font-semibold">
            ({btn.shortcut})
          </span>
        </button>
      ))}
    </div>
  );
};
