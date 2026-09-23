import { useState, useEffect, useCallback } from 'react';
import type { CustomerStatementEntry, CustomerStatementSummary, CustomerStatementFilter } from '../types';
import { fetchCustomerStatement } from '../services/posCustomerDebtService';

export interface UseCustomerStatementProps {
  customerId?: string;
  isOpen?: boolean;
}

export function useCustomerStatement({ customerId, isOpen = true }: UseCustomerStatementProps) {
  const [statement, setStatement] = useState<CustomerStatementSummary>({
    entries: [],
    openingBalance: 0,
    totalDebit: 0,
    totalCredit: 0,
    netChange: 0,
    finalBalance: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<CustomerStatementFilter['type']>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const loadStatement = useCallback(async () => {
    if (!customerId || !isOpen) {
      setStatement({
        entries: [],
        openingBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
        netChange: 0,
        finalBalance: 0,
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchCustomerStatement(customerId, {
        type: filterType,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setStatement(res);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل كشف حساب الزبون.');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, isOpen, filterType, dateFrom, dateTo]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const resetFilters = useCallback(() => {
    setFilterType('all');
    setDateFrom('');
    setDateTo('');
  }, []);

  return {
    statement,
    entries: statement.entries,
    summary: statement,
    isLoading,
    error,
    filterType,
    setFilterType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    refreshStatement: loadStatement,
    resetFilters,
  };
}
