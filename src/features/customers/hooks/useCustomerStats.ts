import { useMemo } from 'react';
import type { Customer, Payment } from '@/types';
import type { CustomerStatsData } from '../types';

export function useCustomerStats(customers: Customer[], payments: Payment[]): CustomerStatsData {
  return useMemo(() => {
    const totalCustomers = customers.length;
    const totalDebt = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
    const customersWithDebt = customers.filter((c) => c.balance > 0).length;
    const totalCollections = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const exceededLimitCount = customers.filter((c) => c.creditLimit > 0 && c.balance >= c.creditLimit).length;
    const totalCreditLimit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    const debtUtilization = totalCreditLimit > 0 ? Math.min(100, Math.round((totalDebt / totalCreditLimit) * 100)) : 0;

    return {
      totalCustomers,
      totalDebt,
      customersWithDebt,
      totalCollections,
      exceededLimitCount,
      totalCreditLimit,
      debtUtilization,
    };
  }, [customers, payments]);
}
