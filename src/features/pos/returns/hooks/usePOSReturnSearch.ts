import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Sale } from '@/types';
import type {
  ReturnDateRangeFilter,
  ReturnEligibilityStatus,
  ReturnSearchMode,
  ReturnSearchResultItem,
} from '../types';
import {
  fetchSalesCandidatesForReturn,
  filterSalesForReturnAdvanced,
  findSaleByBarcode,
} from '../services/posReturnSearchService';

export interface UsePOSReturnSearchProps {
  isOpen: boolean;
  initialSales?: Sale[];
  defaultCustomerId?: string;
  onAutoSelectSale?: (sale: Sale) => void;
}

export function usePOSReturnSearch({
  isOpen,
  initialSales,
  defaultCustomerId,
  onAutoSelectSale,
}: UsePOSReturnSearchProps) {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<ReturnSearchMode>('all');
  const [dateRange, setDateRange] = useState<ReturnDateRangeFilter>('all');
  const [eligibilityStatus, setEligibilityStatus] = useState<ReturnEligibilityStatus>('all');
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'credit'>('all');
  const [customerId, setCustomerId] = useState<string | undefined>(defaultCustomerId);

  // جلب الفواتير والمرتجعات من SQLite/Dexie عند فتح النافذة مع تحديث آني (0ms)
  const { data: fetchedData, isLoading, refetch } = useQuery<{ sales: Sale[]; returns: Sale[] }>({
    queryKey: ['sales', 'return-candidates'],
    queryFn: fetchSalesCandidatesForReturn,
    enabled: isOpen && (!initialSales || initialSales.length === 0),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // الاستماع اللحظي لتحديثات جدول المبيعات عبر IPC لإعادة احتساب الأهلية والمرتجعات فورياً
  useEffect(() => {
    const electron = (window as any).electronAPI;
    if (isOpen && electron?.db?.onTableUpdated) {
      return electron.db.onTableUpdated((data: { table: string }) => {
        if (data.table === 'sales' || data.table === 'sale_items' || data.table === 'sales_items') {
          refetch();
        }
      });
    }
  }, [isOpen, refetch]);

  const activeSales = useMemo(() => {
    if (initialSales && initialSales.length > 0) {
      return initialSales.filter((s) => s.type !== 'return');
    }
    return fetchedData?.sales || [];
  }, [initialSales, fetchedData?.sales]);

  const activeReturns = useMemo(() => {
    if (initialSales && initialSales.length > 0) {
      return initialSales.filter((s) => s.type === 'return');
    }
    return fetchedData?.returns || [];
  }, [initialSales, fetchedData?.returns]);

  // فلترة النتائج وحساب الأهلية والمرتجعات السابقة
  const results = useMemo<ReturnSearchResultItem[]>(() => {
    return filterSalesForReturnAdvanced(activeSales, activeReturns, {
      query,
      searchMode,
      dateRange,
      eligibilityStatus,
      paymentMethod,
      customerId,
    });
  }, [activeSales, activeReturns, query, searchMode, dateRange, eligibilityStatus, paymentMethod, customerId]);

  // إحصائيات سريعة للنتائج
  const stats = useMemo(() => {
    let refundable = 0;
    let partiallyReturned = 0;
    let fullyReturned = 0;

    for (const r of results) {
      if (!r.isFullyReturned) refundable++;
      if (r.hasPriorReturns && !r.isFullyReturned) partiallyReturned++;
      if (r.isFullyReturned) fullyReturned++;
    }

    return {
      totalCandidates: activeSales.length,
      matchedCount: results.length,
      refundableCount: refundable,
      partiallyReturnedCount: partiallyReturned,
      fullyReturnedCount: fullyReturned,
    };
  }, [activeSales.length, results]);

  // معالجة إدخال قارئ الباركود السريع (مسح باركود الوصل)
  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      const found = findSaleByBarcode(barcode, activeSales);
      if (found) {
        onAutoSelectSale?.(found);
        return found;
      }
      return null;
    },
    [activeSales, onAutoSelectSale]
  );

  const resetFilters = useCallback(() => {
    setQuery('');
    setSearchMode('all');
    setDateRange('all');
    setEligibilityStatus('all');
    setPaymentMethod('all');
    setCustomerId(defaultCustomerId);
  }, [defaultCustomerId]);

  return {
    query,
    setQuery,
    searchMode,
    setSearchMode,
    dateRange,
    setDateRange,
    eligibilityStatus,
    setEligibilityStatus,
    paymentMethod,
    setPaymentMethod,
    customerId,
    setCustomerId,
    resetFilters,
    results,
    stats,
    isLoading,
    handleBarcodeScan,
  };
}
