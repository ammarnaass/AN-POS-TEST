import { useMemo } from 'react';
import type { Supplier, Purchase } from '@/types';
import type { SupplierStats } from '../types';

export function useSupplierStats(suppliers: Supplier[], purchases: Purchase[]): SupplierStats {
  return useMemo(() => {
    const totalSuppliers = suppliers.length;
    const totalDebt = suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
    const suppliersWithDebt = suppliers.filter((s) => s.balance > 0).length;
    const totalPurchasesAmount = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalPaidPurchases = purchases.reduce((sum, p) => sum + ((p as any).paidAmount || 0), 0);
    const today = new Date().toDateString();
    const todayPurchases = purchases.filter((p) => new Date(p.date).toDateString() === today);
    const todayTotal = todayPurchases.reduce((sum, p) => sum + p.total, 0);

    return {
      totalSuppliers,
      totalDebt,
      suppliersWithDebt,
      totalPurchasesAmount,
      totalPaidPurchases,
      todayPurchasesCount: todayPurchases.length,
      todayTotal,
    };
  }, [suppliers, purchases]);
}
