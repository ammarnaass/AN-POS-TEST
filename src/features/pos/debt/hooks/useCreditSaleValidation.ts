import { useState, useEffect, useMemo } from 'react';
import type { Customer } from '@/types';
import type { CreditSaleValidation } from '../types';
import { validateCreditSaleParams } from '../services/posCustomerDebtService';

export interface UseCreditSaleValidationParams {
  customer?: Customer | null;
  saleTotal: number;
  isCreditSale: boolean;
  isOpen?: boolean;
}

/**
 * Hook for validating credit sales, credit limits, projected debts, and supervisor overrides.
 */
export function useCreditSaleValidation({
  customer,
  saleTotal,
  isCreditSale,
  isOpen = true,
}: UseCreditSaleValidationParams): CreditSaleValidation {
  const [overrideCreditLimit, setOverrideCreditLimit] = useState(false);

  // Reset override whenever customer or modal open state changes
  useEffect(() => {
    setOverrideCreditLimit(false);
  }, [customer?.id, isOpen]);

  return useMemo(() => {
    if (!isCreditSale) {
      return {
        isCreditSale: false,
        matchedCustomer: customer || undefined,
        currentBalance: Number(customer?.balance || 0),
        creditLimit: Number(customer?.creditLimit || 0),
        projectedDebt: 0,
        isCreditLimitExceeded: false,
        creditExcessAmount: 0,
        hasCreditAdvance: Number(customer?.balance || 0) < 0,
        overrideCreditLimit: false,
        setOverrideCreditLimit,
        isConfirmDisabled: false,
        validationError: null,
      };
    }

    const validation = validateCreditSaleParams({
      customer,
      saleTotal,
      overrideCreditLimit,
    });

    return {
      ...validation,
      setOverrideCreditLimit,
    };
  }, [customer, saleTotal, isCreditSale, overrideCreditLimit]);
}
