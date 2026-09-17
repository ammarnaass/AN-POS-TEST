import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { Product, Supplier } from '@/types';
import { generateId } from '@/utils';
import { useNotificationStore } from '@/store/notificationStore';
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
    staleTime: 0,
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
      return newProduct;
    },
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      useNotificationStore.getState().addNotification({
        title: 'تمت إضافة المنتج بنجاح',
        message: `تم تسجيل الصنف "${newProduct.name}" بنجاح في المخزون.`,
        type: 'success',
        category: 'inventory',
      });
    },
    onError: (err: any) => {
      useNotificationStore.getState().addNotification({
        title: 'فشل إضافة المنتج',
        message: err?.message || 'حدث خطأ أثناء حفظ المنتج.',
        type: 'error',
        category: 'inventory',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const changes = { ...data, updatedAt: new Date().toISOString() };
      await db.products.update(id, changes as any);
      return changes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      useNotificationStore.getState().addNotification({
        title: 'تم تحديث بيانات الصنف',
        message: 'تم حفظ تعديلات المنتج بنجاح.',
        type: 'success',
        category: 'inventory',
      });
    },
    onError: (err: any) => {
      useNotificationStore.getState().addNotification({
        title: 'فشل تحديث المنتج',
        message: err?.message || 'حدث خطأ أثناء تعديل بيانات المنتج.',
        type: 'error',
        category: 'inventory',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.products.delete(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      useNotificationStore.getState().addNotification({
        title: 'تم حذف المنتج',
        message: 'تم إزالة الصنف من المخزون بنجاح.',
        type: 'info',
        category: 'inventory',
      });
    },
    onError: (err: any) => {
      useNotificationStore.getState().addNotification({
        title: 'فشل حذف المنتج',
        message: err?.message || 'تعذر حذف المنتج من قاعدة البيانات.',
        type: 'error',
        category: 'inventory',
      });
    },
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
      return prepared;
    },
    onSuccess: (imported) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      useNotificationStore.getState().addNotification({
        title: 'تم استيراد المنتجات بنجاح',
        message: `تم استيراد وتحديث ${imported.length} صنفاً بنجاح من ملف Excel.`,
        type: 'success',
        category: 'inventory',
      });
    },
    onError: (err: any) => {
      useNotificationStore.getState().addNotification({
        title: 'فشل استيراد المنتجات',
        message: err?.message || 'حدث خطأ أثناء استيراد ملف المنتجات.',
        type: 'error',
        category: 'inventory',
      });
    },
  });

  // تعديل رصيد الصنف مع تسجيل حركة رسمية في stock_movements_v2 لضمان الأثر التدقيقي
  const adjustStockMutation = useMutation({
    mutationFn: async ({
      product,
      newQuantity,
      delta,
      reason,
    }: {
      product: Product;
      newQuantity: number;
      delta?: number;
      reason?: string;
    }) => {
      const now = new Date().toISOString();
      const oldQty = product.quantity || 0;
      const effectiveDelta = delta !== undefined ? delta : newQuantity - oldQty;
      if (effectiveDelta === 0) return { product, newQuantity };

      // 1. تحديث كمية المنتج في قاعدة البيانات
      await db.products.update(product.id, {
        quantity: newQuantity,
        updatedAt: now,
      } as any);

      // 2. تسجيل حركة في stock_movements_v2
      try {
        await db.stock_movements_v2.add({
          id: generateId(),
          movementNumber: `ADJ-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
          date: now.slice(0, 10),
          type: 'adjust',
          warehouseId: product.warehouseId || 'main',
          itemId: product.id,
          quantity: Math.abs(effectiveDelta),
          unitPrice: product.costPrice || 0,
          totalAmount: Math.abs(effectiveDelta) * (product.costPrice || 0),
          reference: 'تعديل يدوي من شاشة المخزن',
          description: reason || (effectiveDelta > 0 ? `زيادة رصيد يدوية (+${effectiveDelta})` : `إنقاص رصيد يدوي (${effectiveDelta})`),
          isReviewed: true,
          createdBy: 'system',
          createdAt: now,
        } as any);
      } catch (err) {
        console.warn('[adjustStockMutation] Failed to record stock movement:', err);
      }

      return { product, newQuantity };
    },
    onMutate: async ({ product, newQuantity }) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousProducts = queryClient.getQueryData<Product[]>(['products']);
      queryClient.setQueryData<Product[]>(['products'], (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((p) => (p.id === product.id ? { ...p, quantity: newQuantity } : p));
      });
      return { previousProducts };
    },
    onSuccess: ({ product, newQuantity }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements_v2'] });
      useNotificationStore.getState().addNotification({
        title: 'تم تعديل كمية المخزون',
        message: `تم تحديث رصيد "${product.name}" إلى ${newQuantity} قطعة بنجاح وتسجيل الحركة.`,
        type: 'success',
        category: 'inventory',
      });
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
      useNotificationStore.getState().addNotification({
        title: 'فشل تعديل المخزون',
        message: err?.message || 'حدث خطأ أثناء تعديل رصيد المنتج.',
        type: 'error',
        category: 'inventory',
      });
    },
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
    adjustStockMutation,
    queryClient,
  };
}
