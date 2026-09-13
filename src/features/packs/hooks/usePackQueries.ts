import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import type { PackStats } from '../types';

export function usePackQueries() {
  // 1. جلب العبوات (Packs)
  const {
    data: packs = [],
    isLoading: isLoadingPacks,
    refetch: refetchPacks,
  } = useQuery<PackEntity[]>({
    queryKey: ['packs'],
    queryFn: async () => {
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      let all: any[] = [];
      if (api?.packs?.list) {
        try {
          const res = await api.packs.list();
          if (Array.isArray(res?.data)) all = res.data;
        } catch {
          /* fallback */
        }
      }
      if (all.length === 0) {
        all = (await db.packs.toArray()) as PackEntity[];
      }
      return all;
    },
  });

  // 2. جلب المنتجات (Products)
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (api?.products?.list) {
        try {
          const res = await api.products.list();
          if (Array.isArray(res?.data) && res.data.length > 0) {
            return res.data as Product[];
          }
        } catch {
          /* fallback */
        }
      }
      const r = await db.products.toArray();
      return r as unknown as Product[];
    },
  });

  // 3. جلب الإعدادات (Settings)
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await db.settings.toArray();
      return all[0] ?? null;
    },
  });

  const currencySymbol = (settings as any)?.baseCurrency || (settings as any)?.currency || 'دج';

  // 4. إحصائيات مالية وتصنيفية دقيقة للعبوات والحزم
  const stats: PackStats = useMemo(() => {
    const totalPacks = packs.length;
    const activePacks = packs.filter((p) => p.status !== 'inactive').length;
    const bundlesCount = packs.filter((p) => p.packType === 'bundle').length;
    const halfWholesaleCount = packs.filter((p) => p.packType === 'half_wholesale').length;
    const wholesaleCount = packs.filter((p) => p.packType === 'wholesale' || (!p.packType)).length;

    let marginSum = 0;
    let marginCount = 0;

    const totalProductsCount = packs.reduce((acc, p) => {
      let items: any[] = [];
      try {
        items = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
      } catch {
        items = [];
      }

      // حساب هامش الربح للعبوة
      const packPrice = Number(p.packPrice ?? p.pack_price ?? 0);
      if (packPrice > 0 && Array.isArray(items) && items.length > 0) {
        let cost = 0;
        for (const it of items) {
          const prod = products.find((pr) => pr.id === it.productId);
          cost += Number(prod?.costPrice ?? 0) * Number(it.qty || 1);
        }
        if (cost > 0) {
          marginSum += ((packPrice - cost) / packPrice) * 100;
          marginCount++;
        }
      }

      return acc + (Array.isArray(items) ? items.length : 0);
    }, 0);

    const avgMargin = marginCount > 0 ? Math.round((marginSum / marginCount) * 10) / 10 : 0;

    return {
      totalPacks,
      bundlesCount,
      wholesaleCount,
      halfWholesaleCount,
      activePacks,
      totalProductsCount,
      avgMargin,
    };
  }, [packs, products]);

  return {
    packs,
    products,
    settings,
    currencySymbol,
    stats,
    isLoadingPacks,
    isLoadingProducts,
    refetchPacks,
  };
}
