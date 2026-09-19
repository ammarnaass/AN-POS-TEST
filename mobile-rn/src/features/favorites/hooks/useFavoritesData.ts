import { useState, useEffect, useCallback, useMemo } from 'react';
import { db, ensureInit } from '@/lib/db';
import type { Pack, Product } from '@shared/types';
import { useFavoritesStore } from '../store/useFavoritesStore';

export function useFavoritesData() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { categories, items, initStore, initialized } = useFavoritesStore();

  const loadData = useCallback(async () => {
    try {
      await ensureInit();
      if (!initialized) {
        await initStore();
      }
      const [loadedPacks, loadedProducts] = await Promise.all([
        db.packs.toArray(),
        db.products.toArray(),
      ]);
      setPacks(loadedPacks || []);
      setProducts(loadedProducts || []);
    } catch (err) {
      console.warn('Failed to load favorites data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [initStore, initialized]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  // خريطة سريعة للمنتجات لحساب الرصيد الفعلي المتاح للعبوات
  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // حساب الرصيد المتاح لأي عبوة
  const getPackStock = useCallback(
    (parentProductId?: string, packQty?: number): number => {
      if (!parentProductId || !packQty || packQty <= 0) return 0;
      const parent = productsMap.get(parentProductId);
      if (!parent) return 0;
      const parentStock = Number(parent.quantity ?? (parent as any).qty ?? 0);
      return Math.max(0, Math.floor(parentStock / packQty));
    },
    [productsMap]
  );

  return {
    packs,
    products,
    productsMap,
    categories,
    items,
    loading,
    refreshing,
    onRefresh,
    getPackStock,
    stats: {
      categoriesCount: categories.length,
      favoritePacksCount: items.filter((it) => it.type === 'pack').length,
      productsCount: products.length,
      allPacksCount: packs.length,
    },
  };
}
