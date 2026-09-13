import { useQuery } from '@tanstack/react-query';
import { db, type PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';

export function useFavoritesData() {
  // Fetch packs from SQLite / Dexie
  const { data: packs = [], isLoading: isLoadingPacks } = useQuery<PackEntity[]>({
    queryKey: ['packs'],
    queryFn: async () => {
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      let all: any[] = [];
      if (api?.packs?.list) {
        try {
          const res = await api.packs.list();
          if (Array.isArray(res?.data)) all = res.data;
        } catch {
          // fallback
        }
      }
      if (all.length === 0) {
        all = (await db.packs.toArray()) as PackEntity[];
      }
      return all;
    },
  });

  // Fetch products
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
          // fallback
        }
      }
      return (await db.products.toArray()) as Product[];
    },
  });

  return {
    packs,
    products,
    isLoading: isLoadingPacks || isLoadingProducts,
  };
}
