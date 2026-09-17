import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useSaleCompletion } from '../hooks/useSaleCompletion';
import { useInventoryData } from '@/features/inventory/hooks/useInventoryData';
import { db } from '@/infrastructure/database/dexie/db';
import type { CartItem, Product } from '@/types';

describe('التحديث اللحظي للمخزون (Instantaneous Zero-Latency Stock Updates)', () => {
  let queryClient: QueryClient;

  const mockProduct: Product = {
    id: 'prod-instant-1',
    name: 'شاحن سريع أصلي',
    barcode: '613000000001',
    quantity: 50,
    costPrice: 500,
    retailPrice: 800,
    category: 'إلكترونيات',
    unit: 'قطعة',
    status: 'active',
    lowStockThreshold: 10,
    allowNegativeStock: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 1000 * 60 },
      },
    });

    queryClient.setQueryDefaults(['products'], {
      queryFn: async () => {
        const p = await db.products.toArray();
        return p as unknown as Product[];
      },
    });

    // إعداد الكاش بالبيانات المبدئية
    await db.products.clear();
    await db.products.add(mockProduct as any);
    queryClient.setQueryData<Product[]>(['products'], [mockProduct]);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  it('يخصم كمية المنتج في كاش الذاكرة لحظياً (0ms) فور استدعاء completeSale', async () => {
    const cart: CartItem[] = [
      {
        id: 'cart-1',
        productId: mockProduct.id,
        name: mockProduct.name,
        price: 800,
        qty: 3,
        lineTotal: 2400,
      },
    ];

    const { result } = renderHook(
      () => useSaleCompletion({ allowNegativeStock: false } as any),
      { wrapper }
    );

    // التحقق من الرصيد الأولي قبل البيع
    const beforeProducts = queryClient.getQueryData<Product[]>(['products']);
    expect(beforeProducts?.[0].quantity).toBe(50);

    // تنفيذ عملية البيع
    await act(async () => {
      await result.current.completeSale({
        cart,
        saleSummary: { subtotal: 2400, tvaAmount: 0, total: 2400 },
        discount: 0,
        discountType: 'fixed',
        paymentMethod: 'cash',
        selectedCustomer: '',
        customerName: 'زبون عام',
        effectivePaidAmount: 2400,
        note: '',
        priceTier: '1',
        docType: 'facture',
        saleType: 'sale',
      });
    });

    // التأكد من أن الكاش تم تحديثه لحظياً وأصبح الرصيد 47 (50 - 3)
    const afterProducts = queryClient.getQueryData<Product[]>(['products']);
    expect(afterProducts?.[0].quantity).toBe(47);
  });

  it('يعكس رصيد المرتجع لحظياً بزيادة الكمية في الكاش التفاؤلي', async () => {
    const cart: CartItem[] = [
      {
        id: 'cart-ret-1',
        productId: mockProduct.id,
        name: mockProduct.name,
        price: 800,
        qty: 2,
        lineTotal: 1600,
      },
    ];

    const { result } = renderHook(
      () => useSaleCompletion({ allowNegativeStock: false } as any),
      { wrapper }
    );

    // تنفيذ عملية الإرجاع
    await act(async () => {
      await result.current.completeSale({
        cart,
        saleSummary: { subtotal: 1600, tvaAmount: 0, total: 1600 },
        discount: 0,
        discountType: 'fixed',
        paymentMethod: 'cash',
        selectedCustomer: '',
        customerName: 'زبون عام',
        effectivePaidAmount: 1600,
        note: 'مرتجع سليم',
        priceTier: '1',
        docType: 'facture',
        saleType: 'return',
      });
    });

    // في المرتجع: 50 + 2 = 52
    const afterProducts = queryClient.getQueryData<Product[]>(['products']);
    expect(afterProducts?.[0].quantity).toBe(52);
  });

  it('يُحدّث رصيد المخزن تفاؤلياً فورياً عند استدعاء adjustStockMutation (+1 / -1)', async () => {
    const { result } = renderHook(() => useInventoryData(), { wrapper });

    // زيادة رصيد المنتج من 50 إلى 55
    await act(async () => {
      await result.current.adjustStockMutation.mutateAsync({
        product: mockProduct,
        newQuantity: 55,
        delta: 5,
        reason: 'جرد إضافي سريع',
      });
    });

    const productsInCache = queryClient.getQueryData<Product[]>(['products']);
    // يجب أن تكون القيمة في الكاش قد أصبحت 55 فوراً
    expect(productsInCache?.[0]?.quantity).toBe(55);
  });
});
