import { useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // مزامنة فورية لحظية مع SQLite عبر IPC عند أي تعديل في المخزون أو الفئات أو الباقات
  useEffect(() => {
    const electron = (window as any).electronAPI;
    if (electron?.db?.onTableUpdated) {
      return electron.db.onTableUpdated((data: { table: string }) => {
        if (data.table === 'products' || data.table === 'packs' || data.table === 'categories') {
          queryClient.invalidateQueries({ queryKey: [data.table] });
        } else if (data.table === 'customers') {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        } else if (data.table === 'cash_sessions') {
          queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
        }
      });
    }
  }, [queryClient]);

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

  // ترشيد استهلاك الذاكرة (Over-fetching Prevention):
  // لا نسحب جداول المبيعات والمشتريات العملاقة إلى الذاكرة عند فتح نقطة البيع
  // فواتير الإرجاع تُجلب كسولاً (Lazily) داخل ReturnSaleModal فقط عند فتح النافذة
  const purchases: Purchase[] = [];
  const purchaseItems: PurchaseItem[] = [];
  const sales: Sale[] = [];

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

  const { data: allSessions = [] } = useQuery<CashSession[]>({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });

  const currentSession = useMemo(() => {
    return allSessions.find((s) => s.status === 'open') || null;
  }, [allSessions]);

  const { data: suspendedOrders = [], refetch } = useQuery<SuspendedOrder[]>({
    queryKey: ['suspendedOrders'],
    queryFn: () => db.suspended_orders.toArray(),
  });

  const refetchSuspended = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['suspendedOrders'] });
    return refetch();
  }, [queryClient, refetch]);

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
    refetchSuspended,
  };
}
