import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { db } from '@/infrastructure/database/dexie/db';
import { useSaleCompletion } from '../useSaleCompletion';
import { useAuthStore } from '@/store/authStore';

const NOW = '2026-09-17T12:00:00.000Z';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: qc }, children)
  );
}

describe('useSaleCompletion — منطق البيع وتحديث المخزون بدقة (Stock Deduction Parity)', () => {
  const defaultSettings = {
    tvaRate: 0,
    invoicePrefix: 'INV-',
    baseCurrency: 'دج',
    shopName: 'متجر الاختبار',
    phone: '0555000000',
    receiptFooter: 'شكراً لزيارتكم',
    allowNegativeStock: true,
  };

  beforeEach(async () => {
    await db.delete();
    await db.open();

    useAuthStore.setState({
      user: {
        id: 'u-dev',
        name: 'المطور',
        role: 'developer' as any,
        branchId: 'b1',
        permissions: [],
        email: 'dev@test.com',
        username: 'dev',
        createdAt: NOW,
      },
    });

    delete (window as any).electronAPI;
  });

  it('1. يخصم كمية المنتج الفردي بدقة في بيع التجزئة العادي', async () => {
    // منتج برصيد 50 قطعة
    await db.products.put({
      id: 'prod-pen',
      name: 'قلم حبر أزرق',
      quantity: 50,
      retailPrice: 50,
      costPrice: 30,
      category: 'أدوات مكتبية',
    } as any);

    const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
      wrapper: createWrapper(),
    });

    const products = await db.products.toArray();

    await act(async () => {
      await result.current.completeSale({
        cart: [
          {
            productId: 'prod-pen',
            name: 'قلم حبر أزرق',
            qty: 3,
            unitPrice: 50,
            lineTotal: 150,
          } as any,
        ],
        discount: 0,
        discountType: 'percent',
        selectedCustomer: '',
        paymentMethod: 'cash',
        isReturn: false,
        settings: defaultSettings,
        products,
        packs: [],
        customers: [],
        currentSession: null,
      } as any);
    });

    // التحقق من خصم 3 قطع بالضبط (50 - 3 = 47)
    const updated = await db.products.get('prod-pen');
    expect(updated?.quantity).toBe(47);

    // التحقق من حفظ الفاتورة في Dexie
    const salesCount = await db.sales.count();
    expect(salesCount).toBe(1);
  });

  it('2. يخصم إجمالي القطع (qty × packageSize) عند بيع طرد جملة', async () => {
    // كرتونة عصير تحتوي على 24 قارورة برصيد 240 قارورة (10 كراتين)
    await db.products.put({
      id: 'prod-juice-box',
      name: 'عصير برتقال كرتونة 24',
      packageSize: '24',
      quantity: 240,
      retailPrice: 100,
      wholesalePrice: 80,
      unit: 'طرد',
    } as any);

    const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
      wrapper: createWrapper(),
    });

    const products = await db.products.toArray();

    await act(async () => {
      await result.current.completeSale({
        cart: [
          {
            productId: 'prod-juice-box',
            name: 'عصير برتقال كرتونة 24',
            qty: 2, // بيع 2 كرتونة
            unitPrice: 1920,
            lineTotal: 3840,
            packPiecesCount: 24,
            packMode: 'wholesale_packs',
            isPack: true,
          } as any,
        ],
        discount: 0,
        discountType: 'percent',
        selectedCustomer: '',
        paymentMethod: 'cash',
        docType: 'wholesale',
        priceTier: '3',
        settings: defaultSettings,
        products,
        packs: [],
        customers: [],
        currentSession: null,
      } as any);
    });

    // يجب أن يخصم 2 × 24 = 48 قطعة، الرصيد المتبقي = 240 - 48 = 192
    const updated = await db.products.get('prod-juice-box');
    expect(updated?.quantity).toBe(192);
  });

  it('3. يسترجع كامل القطع (qty × packageSize) عند إرجاع فاتورة جملة', async () => {
    await db.products.put({
      id: 'prod-water-pack',
      name: 'ماء معدني حزمة 6',
      packageSize: '6',
      quantity: 100,
      unit: 'حزمة',
    } as any);

    const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
      wrapper: createWrapper(),
    });

    const products = await db.products.toArray();

    await act(async () => {
      await result.current.completeSale({
        cart: [
          {
            productId: 'prod-water-pack',
            name: 'ماء معدني حزمة 6',
            qty: 3, // إرجاع 3 حزم
            unitPrice: 180,
            lineTotal: 540,
            packPiecesCount: 6,
            packMode: 'wholesale_packs',
            isPack: true,
          } as any,
        ],
        discount: 0,
        discountType: 'percent',
        selectedCustomer: '',
        paymentMethod: 'cash',
        isReturn: true,
        docType: 'wholesale',
        priceTier: '3',
        settings: defaultSettings,
        products,
        packs: [],
        customers: [],
        currentSession: null,
      } as any);
    });

    // الإرجاع يزيد المخزون بمقدار 3 × 6 = 18 قطعة (100 + 18 = 118)
    const updated = await db.products.get('prod-water-pack');
    expect(updated?.quantity).toBe(118);
  });

  it('4. يفكك مكونات الباقة (Pack) ويخصم من رصيد كل منتج مكوّن على حدة', async () => {
    await db.products.put({
      id: 'prod-shampoo',
      name: 'شامبو',
      quantity: 30,
    } as any);

    await db.products.put({
      id: 'prod-soap',
      name: 'صابون',
      quantity: 50,
    } as any);

    const pack = {
      id: 'pack-care-set',
      name: 'طقم العناية (1 شامبو + 2 صابون)',
      piecesCount: 3,
      items: [
        { productId: 'prod-shampoo', qty: 1 },
        { productId: 'prod-soap', qty: 2 },
      ],
    };

    const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
      wrapper: createWrapper(),
    });

    const products = await db.products.toArray();

    await act(async () => {
      await result.current.completeSale({
        cart: [
          {
            productId: 'pack-pack-care-set',
            name: 'طقم العناية',
            qty: 2, // بيع طقمين
            unitPrice: 800,
            lineTotal: 1600,
            isPack: true,
            packId: 'pack-care-set',
            packMode: 'wholesale_packs',
          } as any,
        ],
        discount: 0,
        discountType: 'percent',
        selectedCustomer: '',
        paymentMethod: 'cash',
        settings: defaultSettings,
        products,
        packs: [pack],
        customers: [],
        currentSession: null,
      } as any);
    });

    // الشامبو: 30 - (1 × 2) = 28
    const updatedShampoo = await db.products.get('prod-shampoo');
    expect(updatedShampoo?.quantity).toBe(28);

    // الصابون: 50 - (2 × 2) = 46
    const updatedSoap = await db.products.get('prod-soap');
    expect(updatedSoap?.quantity).toBe(46);
  });

  it('5. يضمن تحديث كاش Dexie المحلي فوراً حتى عند تشغيل Electron IPC', async () => {
    // محاكاة استجابة Electron IPC
    (window as any).electronAPI = {
      sales: {
        create: vi.fn().mockResolvedValue({ data: { id: 'mock-sale-1' } }),
      },
    };

    await db.products.put({
      id: 'prod-biscuit',
      name: 'بسكويت علبة 12',
      packageSize: '12',
      quantity: 120,
    } as any);

    const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
      wrapper: createWrapper(),
    });

    const products = await db.products.toArray();

    await act(async () => {
      await result.current.completeSale({
        cart: [
          {
            productId: 'prod-biscuit',
            name: 'بسكويت علبة 12',
            qty: 1, // 1 علبة جملة
            unitPrice: 500,
            lineTotal: 500,
            packPiecesCount: 12,
            packMode: 'wholesale_packs',
            isPack: true,
          } as any,
        ],
        discount: 0,
        discountType: 'percent',
        selectedCustomer: '',
        paymentMethod: 'cash',
        docType: 'wholesale',
        priceTier: '3',
        settings: defaultSettings,
        products,
        packs: [],
        customers: [],
        currentSession: null,
      } as any);
    });

    // تم استدعاء الـ IPC
    expect((window as any).electronAPI.sales.create).toHaveBeenCalledTimes(1);

    // التحقق من تحديث Dexie فوراً لمنع وميض الواجهة: 120 - 12 = 108
    const updated = await db.products.get('prod-biscuit');
    expect(updated?.quantity).toBe(108);

    // التحقق من حفظ الفاتورة في كاش Dexie
    const sales = await db.sales.toArray();
    expect(sales.length).toBe(1);
  });
});
