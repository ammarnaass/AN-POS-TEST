// src/features/inventory/__tests__/InventoryBulkDelete.test.tsx
// اختبارات الحذف الجماعي والتحديد وتحديد الكل في المخزون

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/infrastructure/database/dexie/db';
import { categoriesApi } from '@/services/api/categoriesApi';
import InventoryPage from '../InventoryPage';

vi.mock('@/services/api/categoriesApi', () => ({
  categoriesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const mockCategories = [
  { id: 'cat-1', name: 'أدوات مدرسية', color: '#2563EB', icon: 'Book' },
];

const mockProducts = [
  {
    id: 'prod-1',
    name: 'كراس 96 صفحة',
    barcode: '111111',
    category: 'أدوات مدرسية',
    unit: 'قطعة',
    costPrice: 40,
    wholesalePrice: 50,
    retailPrice: 60,
    wholesaleMinQty: 10,
    quantity: 100,
    lowStockThreshold: 10,
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    name: 'قلم جاف أزرق',
    barcode: '222222',
    category: 'أدوات مدرسية',
    unit: 'قطعة',
    costPrice: 15,
    wholesalePrice: 20,
    retailPrice: 25,
    wholesaleMinQty: 50,
    quantity: 200,
    lowStockThreshold: 20,
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    name: 'ممحاة بيضاء',
    barcode: '333333',
    category: 'أدوات مدرسية',
    unit: 'قطعة',
    costPrice: 10,
    wholesalePrice: 15,
    retailPrice: 20,
    wholesaleMinQty: 20,
    quantity: 50,
    lowStockThreshold: 5,
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function renderInventoryPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('InventoryPage — ميزة التحديد وتحديد الكل والحذف الجماعي', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.categories.clear();
    await db.settings.clear();
    await db.network_settings.clear();

    await db.settings.add({
      id: 'default',
      shopName: 'متجر اختبار',
      baseCurrency: 'دج',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    await db.categories.bulkAdd(mockCategories as any);
    vi.mocked(categoriesApi.list).mockResolvedValue(mockCategories as any);
    await db.products.bulkAdd(mockProducts as any);
  });

  it('يظهر شريط الإجراءات الجماعية عند تحديد منتج واحد عبر خانة الاختيار', async () => {
    renderInventoryPage();

    await waitFor(() => {
      expect(screen.getByText('كراس 96 صفحة')).toBeInTheDocument();
    });

    const checkbox1 = screen.getByLabelText('تحديد المنتج كراس 96 صفحة');
    expect(checkbox1).not.toBeChecked();

    fireEvent.click(checkbox1);
    expect(checkbox1).toBeChecked();

    await waitFor(() => {
      expect(screen.getByText(/تم تحديد/)).toBeInTheDocument();
      expect(screen.getByText(/حذف المحددة/)).toBeInTheDocument();
    });
  });

  it('يقوم بتحديد جميع المنتجات المعروضة عند النقر على تحديد الكل في رأس الجدول', async () => {
    renderInventoryPage();

    await waitFor(() => {
      expect(screen.getByText('كراس 96 صفحة')).toBeInTheDocument();
    });

    const selectAllHeader = screen.getByLabelText('تحديد كل المنتجات المعروضة');
    expect(selectAllHeader).not.toBeChecked();

    fireEvent.click(selectAllHeader);

    const cb1 = screen.getByLabelText('تحديد المنتج كراس 96 صفحة');
    const cb2 = screen.getByLabelText('تحديد المنتج قلم جاف أزرق');
    const cb3 = screen.getByLabelText('تحديد المنتج ممحاة بيضاء');

    expect(cb1).toBeChecked();
    expect(cb2).toBeChecked();
    expect(cb3).toBeChecked();

    await waitFor(() => {
      expect(screen.getByText(/حذف المحددة \(3\)/)).toBeInTheDocument();
    });

    // إلغاء التحديد
    const clearBtn = screen.getByText('إلغاء التحديد');
    fireEvent.click(clearBtn);

    expect(cb1).not.toBeChecked();
    expect(cb2).not.toBeChecked();
    expect(cb3).not.toBeChecked();
  });

  it('يفتح نافذة تأكيد الحذف الجماعي ويحذف المنتجات المختارة بنجاح', async () => {
    renderInventoryPage();

    await waitFor(() => {
      expect(screen.getByText('كراس 96 صفحة')).toBeInTheDocument();
    });

    // تحديد صنفين
    fireEvent.click(screen.getByLabelText('تحديد المنتج كراس 96 صفحة'));
    fireEvent.click(screen.getByLabelText('تحديد المنتج قلم جاف أزرق'));

    const deleteBtn = await screen.findByText(/حذف المحددة \(2\)/);
    fireEvent.click(deleteBtn);

    // التحقق من ظهور نافذة التأكيد
    expect(await screen.findByText('تأكيد حذف المنتجات المحددة')).toBeInTheDocument();
    expect(screen.getByText(/أنت على وشك حذف/)).toBeInTheDocument();

    // تأكيد الحذف
    const confirmBtn = screen.getByText('تأكيد الحذف (2)');
    fireEvent.click(confirmBtn);

    // التحقق من حذف الصنفين وبقاء الصنف الثالث
    await waitFor(async () => {
      const remaining = await db.products.toArray();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('prod-3');
    });
  });
});
