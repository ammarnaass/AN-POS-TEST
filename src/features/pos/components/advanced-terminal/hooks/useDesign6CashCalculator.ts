import { useState, useMemo, useCallback } from 'react';

export interface UseDesign6CashCalculatorProps {
  totalAmount: number;
}

export const useDesign6CashCalculator = ({ totalAmount }: UseDesign6CashCalculatorProps) => {
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Auto-update default paid amount to match total if unset or reset
  const effectivePaid = paidAmount > 0 ? paidAmount : totalAmount;

  // Calculate change
  const changeAmount = useMemo(() => {
    if (effectivePaid <= totalAmount) return 0;
    return Math.max(0, effectivePaid - totalAmount);
  }, [effectivePaid, totalAmount]);

  const setDenomination = useCallback((amount: number) => {
    setPaidAmount(amount);
  }, []);

  const resetPaid = useCallback(() => {
    setPaidAmount(0);
  }, []);

  return {
    paidAmount: effectivePaid,
    changeAmount,
    setPaidAmount,
    setDenomination,
    resetPaid,
  };
};
