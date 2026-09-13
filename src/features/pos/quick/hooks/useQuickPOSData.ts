import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { Product, Customer } from '@/types';
import type { QuickPOSSettings } from '../types';

export function useQuickPOSData() {
  // 1. المنتجات النشطة
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const list = await db.products.toArray();
      return list.filter((p: Product) => p.status === 'active' || !p.status);
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2. الباقات والكراتين
  const { data: packs = [] } = useQuery({
    queryKey: ['packs'],
    queryFn: () => db.packs.toArray(),
  });

  // 3. التصنيفات الخام
  const { data: rawCategories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const [cats, prods] = await Promise.all([
          db.categories.toArray().catch(() => []),
          db.products.toArray().catch(() => []),
        ]);
        const all = new Set<string>();
        if (Array.isArray(cats)) {
          cats.forEach((c: any) => {
            const name = typeof c === 'object' && c !== null ? c.name : c;
            if (name && typeof name === 'string' && name.trim()) all.add(name.trim());
          });
        }
        if (Array.isArray(prods)) {
          prods.forEach((p: any) => {
            const cat =
              typeof p.category === 'object' && p.category !== null
                ? p.category.name
                : p.category;
            if (cat && typeof cat === 'string' && cat.trim()) all.add(cat.trim());
          });
        }
        return Array.from(all);
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(rawCategories)) {
      rawCategories.forEach((c: any) => {
        const name = typeof c === 'object' && c !== null ? c.name : c;
        if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
      });
    }
    if (Array.isArray(products)) {
      products.forEach((p: any) => {
        const cat =
          typeof p.category === 'object' && p.category !== null ? p.category.name : p.category;
        if (cat && typeof cat === 'string' && cat.trim()) set.add(cat.trim());
      });
    }
    return Array.from(set);
  }, [rawCategories, products]);

  // 4. العملاء
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => db.customers.toArray(),
    staleTime: 1000 * 60 * 5,
  });

  // 5. جلسات الصندوق
  const { data: allSessions = [] } = useQuery({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });

  const currentSession = useMemo(() => {
    return allSessions.find((s: any) => s.status === 'open') || null;
  }, [allSessions]);

  const isSessionOpen = currentSession !== null;

  // 6. الفواتير المعلقة
  const { data: suspendedOrders = [] } = useQuery({
    queryKey: ['suspendedOrders'],
    queryFn: () => db.suspended_orders.toArray(),
  });

  // 7. إعدادات النظام
  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
    staleTime: 1000 * 60 * 10,
  });

  const settingsOrDefault: QuickPOSSettings = useMemo(
    () => ({
      tvaRate: Number(rawSettings?.tvaRate ?? (rawSettings as any)?.tva_rate ?? 0),
      invoicePrefix: rawSettings?.invoicePrefix ?? 'INV-',
      baseCurrency: rawSettings?.baseCurrency ?? 'دج',
      shopName: rawSettings?.shopName ?? 'AN POS',
      phone: rawSettings?.phone ?? '',
      receiptFooter: rawSettings?.receiptFooter ?? 'شكراً لزيارتكم',
      allowNegativeStock: rawSettings?.allowNegativeStock ?? true,
      allowCardPayment: Boolean((rawSettings as any)?.allowCardPayment ?? false),
      allowTransferPayment: Boolean((rawSettings as any)?.allowTransferPayment ?? false),
    }),
    [rawSettings]
  );

  return {
    products,
    packs,
    categories,
    customers,
    allSessions,
    currentSession,
    isSessionOpen,
    suspendedOrders,
    settingsOrDefault,
  };
}
