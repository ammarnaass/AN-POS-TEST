import React from 'react';
import { DEFAULT_RETURN_REASONS } from '../types';

export interface ReturnReasonSelectorProps {
  returnReason: string;
  customReason: string;
  onChangeReason: (reason: string) => void;
  onChangeCustomReason: (custom: string) => void;
}

export const ReturnReasonSelector: React.FC<ReturnReasonSelectorProps> = ({
  returnReason,
  customReason,
  onChangeReason,
  onChangeCustomReason,
}) => {
  return (
    <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2">
      <label className="text-xs font-bold text-on-surface block">سبب الإرجاع:</label>
      <select
        value={returnReason}
        onChange={(e) => onChangeReason(e.target.value)}
        className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/25 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {DEFAULT_RETURN_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {returnReason === 'أخرى' && (
        <input
          type="text"
          placeholder="اكتب سبب الإرجاع هنا..."
          value={customReason}
          onChange={(e) => onChangeCustomReason(e.target.value)}
          className="w-full h-8 px-3 bg-surface-container-low border border-outline-variant/25 rounded-xl text-xs text-on-surface focus:outline-none"
        />
      )}
    </div>
  );
};
