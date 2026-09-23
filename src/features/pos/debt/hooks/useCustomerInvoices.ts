import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Sale } from '@/types';
import type { InvoiceLookupFilter } from '../types';
import { fetchCustomerInvoices, filterInvoices } from '../services/posInvoiceLookupService';
import { calculateCustomerInvoicesMetrics } from '../services/posInvoiceStatusService';

export interface UseCustomerInvoicesProps {
  customerId?: string;
  isOpen?: boolean;
  initialSales?: Sale[];
}

export function useCustomerInvoices({
  customerId,
  isOpen = true,
  initialSales,
}: UseCustomerInvoicesProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'return'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // استعلام الفواتير عبر TanStack Query
  const { data: fetchedSales = [], isLoading, refetch } = useQuery<Sale[]>({
    queryKey: ['sales', 'customer-invoices', customerId],
    queryFn: () => fetchCustomerInvoices(customerId, 100),
    enabled: Boolean(isOpen),
    staleTime: 1000 * 30,
  });

  const activeSales = initialSales && initialSales.length > 0 ? initialSales : fetchedSales;

  // تطبيق التصفية والبحث
  const filter: InvoiceLookupFilter = useMemo(() => ({
    searchQuery,
    status: statusFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [searchQuery, statusFilter, dateFrom, dateTo]);

  const filteredInvoices = useMemo(() => {
    return filterInvoices(activeSales, filter);
  }, [activeSales, filter]);

  // حساب المؤشرات المالية
  const metrics = useMemo(() => {
    return calculateCustomerInvoicesMetrics(activeSales);
  }, [activeSales]);

  return {
    invoices: filteredInvoices,
    rawInvoices: activeSales,
    metrics,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    refetch,
  };
}
