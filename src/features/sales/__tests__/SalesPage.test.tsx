// SalesPage اختبارات — POS-PRINT-001 / D phase
// يغطي: العرض، التبويبات الخمسة، الصلاحيات (إخفاء التبويبات)، إعادة توجيه المسار، initial tab.
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/infrastructure/database/dexie/db';
import { seedDefaultTemplates } from '@/services/print/defaultTemplates';
import { ensureDefaultPrinter } from '@/services/print/printerService';
import SalesPage from '@/features/sales/SalesPage';
import { useAuthStore } from '@/store/authStore';

function withProviders(routerProps: { initialEntries: string[]; initialIndex?: number }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter {...routerProps}>
        <SalesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function setUserRole(role: 'admin' | 'cashier' | 'seller' | 'inventory_manager' | undefined) {
  useAuthStore.setState({
    user: role
      ? {
          id: 'u1',
          name: 'مستخدم اختبار',
          role: role as never,
          branchId: 'br1',
          permissions: [],
          email: 'test@test.com',
          username: 'test',
          createdAt: '',
        }
      : (undefined as never),
  });
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  await seedDefaultTemplates();
  await ensureDefaultPrinter();
  setUserRole('admin');
});

describe('SalesPage — التبويبات العمودية', () => {
  it('يعرض الترويسة "الفواتير والطباعة"', async () => {
    render(withProviders({ initialEntries: ['/sales'] }));
    await waitFor(() => expect(screen.getByText('الفواتير والطباعة')).toBeInTheDocument());
  });

  it('يعرض كل التبويبات الخمسة للأدمن', async () => {
    render(withProviders({ initialEntries: ['/sales'] }));
    await waitFor(() => expect(screen.getByText('الفواتير والطباعة')).toBeInTheDocument());
    expect(screen.getByText('الفواتير')).toBeInTheDocument();
    expect(screen.getByText('القوالب')).toBeInTheDocument();
    expect(screen.getByText('السجل')).toBeInTheDocument();
    expect(screen.getByText('الطابعات')).toBeInTheDocument();
    expect(screen.getByText('الطابور')).toBeInTheDocument();
  });

  it('يُخفي تبويب "القوالب" لغير المخوَّلين (cashier)، ويبقي "الفواتير" و "الطابور"', async () => {
    setUserRole('cashier');
    render(withProviders({ initialEntries: ['/sales'] }));
    await waitFor(() => expect(screen.getByText('الفواتير والطباعة')).toBeInTheDocument());
    expect(screen.getByText('الفواتير')).toBeInTheDocument();
    expect(screen.queryByText('القوالب')).not.toBeInTheDocument();
    expect(screen.queryByText('الطابعات')).not.toBeInTheDocument();
    expect(screen.getByText('السجل')).toBeInTheDocument();
    expect(screen.getByText('الطابور')).toBeInTheDocument();
  });

  it('يُخفي "الطابعات" و "القوالب" لـ seller لكن يبقي البقية', async () => {
    setUserRole('seller');
    render(withProviders({ initialEntries: ['/sales'] }));
    await waitFor(() => expect(screen.getByText('الفواتير والطباعة')).toBeInTheDocument());
    expect(screen.getByText('الفواتير')).toBeInTheDocument();
    expect(screen.queryByText('القوالب')).not.toBeInTheDocument();
    expect(screen.queryByText('الطابعات')).not.toBeInTheDocument();
    expect(screen.queryByText('السجل')).not.toBeInTheDocument();
    expect(screen.getByText('الطابور')).toBeInTheDocument();
  });

  it('الـ inventory_manager يرى تبويب الطابعات لأن لديه manage_printers', async () => {
    setUserRole('inventory_manager');
    render(withProviders({ initialEntries: ['/sales'] }));
    await waitFor(() => expect(screen.getByText('الفواتير والطباعة')).toBeInTheDocument());
    expect(screen.getByText('الطابعات')).toBeInTheDocument();
    expect(screen.queryByText('القوالب')).not.toBeInTheDocument(); // inventory_manager لا يملك assign_template
  });
});

describe('SalesPage — التنقل بين التبويبات', () => {
  it('تبديل التبويب يحدث المحتوى', async () => {
    render(withProviders({ initialEntries: ['/sales'] }));
    await waitFor(() => expect(screen.getByText('الفواتير والطباعة')).toBeInTheDocument());
    // افتراضياً تبويب الفواتير. النقر على "الطابور":
    fireEvent.click(screen.getByText('الطابور'));
    // محتوى طابور الطباعة — نتحقق من ظهور heading أوizations(لا نتحقق نصاً معيناً)
    await waitFor(() => {
      // طابور الطباعة يحتوي على status filters
      const allBtn = screen.getAllByRole('button').find((b) => /الكل|الجميع/.test(b.textContent ?? ''));
      expect(allBtn).toBeTruthy();
    });
  });

  it('النقر على "الطابعات" يفتح لوحة الطابعات (embedded)', async () => {
    render(withProviders({ initialEntries: ['/sales'] }));
    await waitFor(() => expect(screen.getByText('الفواتير والطباعة')).toBeInTheDocument());
    fireEvent.click(screen.getByText('الطابعات'));
    await waitFor(() => {
      // الطابعات المُدمجة تعرض عنوان h2 + قائمة الطابعات
      expect(screen.getByText(/الطابعات ·/)).toBeInTheDocument();
    });
  });
});

describe('SalesPage — initial tab من state', () => {
  it('state.tab=printers يفتح تبويب الطابعات مباشرة', async () => {
    render(
      withProviders({ initialEntries: [{ pathname: '/sales', state: { tab: 'printers' } }] }),
    );
    await waitFor(() => expect(screen.getByText(/الطابعات ·/)).toBeInTheDocument());
  });

  it('state.tab=queue يفتح تبويب الطابور مباشرة', async () => {
    render(
      withProviders({ initialEntries: [{ pathname: '/sales', state: { tab: 'queue' } }] }),
    );
    await waitFor(() => {
      const allBtn = screen.getAllByRole('button').find((b) => /الكل|الجميع/.test(b.textContent ?? ''));
      expect(allBtn).toBeTruthy();
    });
  });
});
