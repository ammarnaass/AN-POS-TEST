// src/features/sales/__tests__/InvoicesBulkDelete.test.tsx
// اختبارات الحذف الجماعي والتحديد وتحديد الكل في الفواتير والمبيعات

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/infrastructure/database/dexie/db';
import { seedDefaultTemplates } from '@/services/print/defaultTemplates';
import { ensureDefaultPrinter } from '@/services/print/printerService';
import { useAuthStore } from '@/store/authStore';
import InvoicesTab from '../InvoicesTab';

const mockSales = [
  {
    id: 'sale-1',
    number: 'INV-001',
    date: '2026-03-10T10:00:00Z',
    customerName: 'زبون نقدي',
    subtotal: 1000,
    discount: 0,
    tvaAmount: 0,
    total: 1000,
    paidAmount: 1000,
    remainingAmount: 0,
    status: 'completed',
    paymentMethod: 'cash',
    type: 'sale',
    docType: 'facture',
    soldBy: 'الكاشير',
    items: JSON.stringify([{ id: 'item-1', name: 'دفتر', qty: 2, price: 500, lineTotal: 1000 }]),
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'sale-2',
    number: 'INV-002',
    date: '2026-03-11T11:00:00Z',
    customerName: 'زبون عام',
    subtotal: 2500,
    discount: 0,
    tvaAmount: 0,
    total: 2500,
    paidAmount: 2500,
    remainingAmount: 0,
    status: 'completed',
    paymentMethod: 'cash',
    type: 'sale',
    docType: 'facture',
    soldBy: 'الكاشير',
    items: JSON.stringify([{ id: 'item-2', name: 'أقلام تلوين', qty: 5, price: 500, lineTotal: 2500 }]),
    createdAt: '2026-03-11T11:00:00Z',
    updatedAt: '2026-03-11T11:00:00Z',
  },
  {
    id: 'sale-3',
    number: 'INV-003',
    date: '2026-03-12T12:00:00Z',
    customerName: 'زبون آجل',
    subtotal: 1500,
    discount: 0,
    tvaAmount: 0,
    total: 1500,
    paidAmount: 1500,
    remainingAmount: 0,
    status: 'completed',
    paymentMethod: 'cash',
    type: 'sale',
    docType: 'facture',
    soldBy: 'الكاشير',
    items: JSON.stringify([{ id: 'item-3', name: 'مسطرة', qty: 10, price: 150, lineTotal: 1500 }]),
    createdAt: '2026-03-12T12:00:00Z',
    updatedAt: '2026-03-12T12:00:00Z',
  },
];

function renderInvoicesTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InvoicesTab />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('InvoicesTab — ميزة التحديد وتحديد الكل والحذف الجماعي للفواتير', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedDefaultTemplates();
    await ensureDefaultPrinter();

    useAuthStore.setState({
      user: {
        id: 'admin-1',
        name: 'المدير',
        role: 'admin' as never,
        permissions: ['reprint', 'manage_sales'],
        email: 'admin@test.com',
        username: 'admin',
        createdAt: '',
      } as any,
    });

    await db.sales.bulkAdd(mockSales as any);
  });

  it('يظهر شريط الإجراءات الجماعية مع احتساب الإجمالي عند تحديد فاتورة', async () => {
    renderInvoicesTab();

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    const checkbox1 = screen.getByLabelText('تحديد الفاتورة INV-001');
    expect(checkbox1).not.toBeChecked();

    fireEvent.click(checkbox1);
    expect(checkbox1).toBeChecked();

    await waitFor(() => {
      expect(screen.getByText(/تم تحديد/)).toBeInTheDocument();
      expect(screen.getByText(/حذف الفواتير المحددة/)).toBeInTheDocument();
    });
  });

  it('يقوم بتحديد جميع الفواتير عند النقر على تحديد الكل في رأس الجدول', async () => {
    renderInvoicesTab();

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    const selectAllHeader = screen.getByLabelText('تحديد كل الفواتير المعروضة');
    expect(selectAllHeader).not.toBeChecked();

    fireEvent.click(selectAllHeader);

    const cb1 = screen.getByLabelText('تحديد الفاتورة INV-001');
    const cb2 = screen.getByLabelText('تحديد الفاتورة INV-002');
    const cb3 = screen.getByLabelText('تحديد الفاتورة INV-003');

    expect(cb1).toBeChecked();
    expect(cb2).toBeChecked();
    expect(cb3).toBeChecked();

    await waitFor(() => {
      expect(screen.getByText(/حذف الفواتير المحددة \(3\)/)).toBeInTheDocument();
    });

    // إلغاء التحديد
    const clearBtn = screen.getByText('إلغاء التحديد');
    fireEvent.click(clearBtn);

    expect(cb1).not.toBeChecked();
    expect(cb2).not.toBeChecked();
    expect(cb3).not.toBeChecked();
  });

  it('يفتح نافذة تأكيد حذف الفواتير ويحذف الفواتير المحددة بنجاح', async () => {
    renderInvoicesTab();

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    // تحديد فاتورتين
    fireEvent.click(screen.getByLabelText('تحديد الفاتورة INV-001'));
    fireEvent.click(screen.getByLabelText('تحديد الفاتورة INV-002'));

    const deleteBtn = await screen.findByText(/حذف الفواتير المحددة \(2\)/);
    fireEvent.click(deleteBtn);

    // التحقق من ظهور نافذة التأكيد
    expect(await screen.findByText('تأكيد حذف الفواتير المحددة')).toBeInTheDocument();
    expect(screen.getByText(/أنت على وشك حذف/)).toBeInTheDocument();

    // تأكيد الحذف
    const confirmBtn = screen.getByText('تأكيد الحذف (2)');
    fireEvent.click(confirmBtn);

    // التحقق من حذف الفاتورتين وبقاء الفاتورة الثالثة
    await waitFor(async () => {
      const remaining = await db.sales.toArray();
      expect(remaining.length).toBe(1);
      expect(remaining[0].number).toBe('INV-003');
    });
  });
});
