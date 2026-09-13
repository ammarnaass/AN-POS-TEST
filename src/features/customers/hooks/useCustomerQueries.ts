import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { Customer, Sale, Payment, Settings } from '@/types';

export function useCustomerQueries() {
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => db.customers.toArray(),
  });

  const { data: sales = [], isLoading: isLoadingSales } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: () => db.sales.toArray(),
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: () => db.payments.toArray(),
  });

  const { data: settings } = useQuery<Settings | undefined>({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const currencySymbol = settings?.baseCurrency || 'دج';
  const shopName = settings?.shopName || 'متجرنا';
  const shopPhone = settings?.phone || '—';

  const getCustomerSales = (customerId: string) =>
    sales.filter((s) => s.customerId === customerId && s.type === 'sale');

  const getCustomerPayments = (customerId: string) =>
    payments.filter((p) => (p as any).customerId === customerId || (p as any).partyId === customerId || (p as any).party_id === customerId);

  return {
    customers,
    sales,
    payments,
    settings,
    currencySymbol,
    shopName,
    shopPhone,
    isLoading: isLoadingCustomers || isLoadingSales || isLoadingPayments,
    getCustomerSales,
    getCustomerPayments,
  };
}
