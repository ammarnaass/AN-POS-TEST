import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { Product, Customer, Supplier, Promotion, Pack, Category, Purchase, PurchaseItem, Settings, Sale, CashSession, SuspendedOrder } from '@/types';

export interface POSSettings {
  quickSale: boolean;
  accountingOnly: boolean;
  allowNegativeStock: boolean;
  confirmNoStock: boolean;
  averagePricing: boolean;
  allowCardPayment: boolean;
  allowTransferPayment: boolean;
}

export function usePOSData() {
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => db.customers.toArray(),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: () => db.suppliers.toArray(),
  });

  const { data: promotions = [] } = useQuery<Promotion[]>({
    queryKey: ['promotions'],
    queryFn: () => db.promotions.toArray(),
  });

  const { data: packs = [] } = useQuery<Pack[]>({
    queryKey: ['packs'],
    queryFn: () => db.packs.toArray(),
  });

  const { data: dbCategories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => db.categories.toArray().catch(() => []),
  });

  const { data: purchases = [] } = useQuery<Purchase[]>({
    queryKey: ['purchases'],
    queryFn: () => db.purchases.toArray().catch(() => []),
  });

  const { data: purchaseItems = [] } = useQuery<PurchaseItem[]>({
    queryKey: ['purchase_items'],
    queryFn: () => db.purchase_items.toArray().catch(() => []),
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const posSettings: POSSettings = useMemo(() => ({
    quickSale: settings?.quickSale ?? true,
    accountingOnly: settings?.accountingOnly ?? false,
    allowNegativeStock: settings?.allowNegativeStock ?? false,
    confirmNoStock: settings?.confirmNoStock ?? true,
    averagePricing: settings?.averagePricing ?? false,
    allowCardPayment: Boolean((settings as any)?.allowCardPayment ?? false),
    allowTransferPayment: Boolean((settings as any)?.allowTransferPayment ?? false),
  }), [settings]);

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ['sales'],
    queryFn: () => db.sales.toArray(),
  });

  const { data: allSessions = [] } = useQuery<CashSession[]>({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });

  const currentSession = useMemo(() => {
    return allSessions.find((s) => s.status === 'open') || null;
  }, [allSessions]);

  const { data: suspendedOrders = [] } = useQuery<SuspendedOrder[]>({
    queryKey: ['suspendedOrders'],
    queryFn: () => db.suspended_orders.toArray(),
  });

  return {
    products,
    isLoadingProducts,
    customers,
    suppliers,
    promotions,
    packs,
    dbCategories,
    purchases,
    purchaseItems,
    settings,
    posSettings,
    sales,
    allSessions,
    currentSession,
    suspendedOrders,
  };
}
