import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { Product, Supplier } from '@/types';
import { generateId } from '@/utils';
import {
  syncProductCreate,
  syncProductUpdate,
  syncProductDelete,
  syncProductBulkCreate,
} from '@/lib/products-sync';
import { categoriesApi, type Category } from '@/services/api/categoriesApi';

export function useInventoryData() {
  const queryClient = useQueryClient();

  const { data: products = [], isFetching, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await db.products.toArray();
      return r as unknown as Product[];
    },
    refetchOnWindowFocus: true,
  });

  // تحديث فوري مبني على الأحداث بدلاً من الـ Polling المستمر
  useEffect(() => {
    const electron = (window as any).electronAPI;
    if (electron?.db?.onTableUpdated) {
      return electron.db.onTableUpdated((data: { table: string }) => {
        if (data.table === 'products' || data.table === 'categories') {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
      });
    }
  }, [queryClient]);

  useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const s = await db.suppliers.toArray();
      return s as unknown as Supplier[];
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const list = await categoriesApi.list();
        return (list || []).filter((c) => c && c.name && c.name.trim());
      } catch {
        const fallback = await db.categories.toArray();
        return (fallback || []).map((c: any) => ({
          id: c.id,
          name: typeof c === 'object' && c !== null ? c.name : String(c),
          color: c.color || '#3B82F6',
          icon: c.icon || 'FolderTree',
          description: c.description || '',
          productCount: 0,
        }));
      }
    },
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const addMutation = useMutation({
    mutationFn: async (data: Omit<Product, 'id'>) => {
      const newProduct = {
        id: generateId(),
        ...data,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.products.add(newProduct as any);
      // Write-Through → SQLite (for mobile sync)
      await syncProductCreate(newProduct);
      return newProduct;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const changes = { ...data, updatedAt: new Date().toISOString() };
      await db.products.update(id, changes as any);
      // Write-Through → SQLite (for mobile sync)
      await syncProductUpdate(id, changes);
      return changes;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.products.delete(id);
      // Write-Through → SQLite (for mobile sync)
      await syncProductDelete(id);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const importMutation = useMutation({
    mutationFn: async (importedProducts: Product[]) => {
      const now = new Date().toISOString();
      const prepared = importedProducts.map((p) => ({
        ...p,
        id: p.id || generateId(),
        createdAt: p.createdAt || now,
        updatedAt: now,
      }));
      await db.products.bulkAdd(prepared as any);
      // Write-Through → SQLite (for mobile sync)
      await syncProductBulkCreate(prepared);
      return prepared;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  return {
    products,
    suppliers,
    categories,
    isFetching,
    refetch,
    addMutation,
    updateMutation,
    deleteMutation,
    importMutation,
    queryClient,
  };
}
