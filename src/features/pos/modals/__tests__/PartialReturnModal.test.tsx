import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartialReturnModal } from '../PartialReturnModal';
import { db } from '@/infrastructure/database/dexie/db';
import { formatMoney } from '@/features/pos/utils/format';
import type { Sale } from '@/types';

// Mock Dexie database
vi.mock('@/infrastructure/database/dexie/db', () => ({
  db: {
    sales: {
      toArray: vi.fn(),
    },
  },
}));

const mockSale: Sale = {
  id: 'sale-001',
  number: '2026-0001',
  date: '2026-09-18T10:00:00.000Z',
  docType: 'facture',
  type: 'sale',
  items: [
    {
      productId: 'p-1',
      name: 'قهوة اسبريسو',
      qty: 5,
      unitPrice: 200,
      lineTotal: 1000,
      unit: 'علبة',
    },
    {
      productId: 'p-2',
      name: 'شاي أخضر',
      qty: 2,
      unitPrice: 150,
      lineTotal: 300,
      unit: 'علبة',
    },
  ],
  subtotal: 1300,
  discount: 0,
  discountType: 'amount',
  tvaAmount: 0,
  total: 1300,
  paymentMethod: 'cash',
  customerId: 'cust-1',
  customerName: 'أحمد بن علي',
  amountPaid: 1300,
  status: 'completed',
  soldBy: 'الكاشير',
  cashSessionId: 'sess-1',
};

describe('PartialReturnModal (واجهة الإرجاع الجزئي)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.mocked(db.sales.toArray).mockResolvedValue([]);
  });

  const renderModal = (props: Partial<React.ComponentProps<typeof PartialReturnModal>> = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      sale: mockSale,
      onConfirmReturn: vi.fn(),
      onLoadToCart: vi.fn(),
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <PartialReturnModal {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  it('renders invoice details, customer name and item list correctly', () => {
    renderModal();

    expect(screen.getByText(/إرجاع جزئي \/ مخصص للفاتورة/)).toBeInTheDocument();
    expect(screen.getByText(/#2026-0001/)).toBeInTheDocument();
    expect(screen.getByText(/أحمد بن علي/)).toBeInTheDocument();
    expect(screen.getByText('قهوة اسبريسو')).toBeInTheDocument();
    expect(screen.getByText('شاي أخضر')).toBeInTheDocument();
  });

  it('calculates prior returns and reduces maxReturnableQty accordingly', async () => {
    // المحاكاة: تم إرجاع قطعتين من قهوة اسبريسو في وقت سابق
    vi.mocked(db.sales.toArray).mockResolvedValue([
      {
        id: 'ret-001',
        number: 'RET-001',
        date: '2026-09-18T11:00:00.000Z',
        docType: 'facture',
        type: 'return',
        originalSaleId: 'sale-001',
        items: [
          {
            productId: 'p-1',
            name: 'قهوة اسبريسو',
            qty: 2,
            unitPrice: 200,
            lineTotal: 400,
          },
        ],
        subtotal: 400,
        discount: 0,
        discountType: 'amount',
        tvaAmount: 0,
        total: 400,
        paymentMethod: 'cash',
        customerId: 'cust-1',
        amountPaid: 0,
        status: 'completed',
        soldBy: 'الكاشير',
        cashSessionId: 'sess-1',
      } as Sale,
    ]);

    renderModal();

    await waitFor(() => {
      expect(screen.getByText(/أُرجع سابقاً: 2/)).toBeInTheDocument();
    });
  });

  it('allows modifying return quantity with plus and minus buttons and updates total amount', () => {
    renderModal();

    // بالافتراضي يتم اختيار كامل الكميات المباعة: 5 * 200 + 2 * 150 = 1300 دج
    expect(screen.getByText(formatMoney(1300))).toBeInTheDocument();

    // تقليل كمية قهوة اسبريسو من 5 إلى 3 بالضغط مرتين على زر الناقص
    const minusButtons = screen.getAllByRole('button').filter((b) => b.querySelector('svg.lucide-minus'));
    fireEvent.click(minusButtons[0]); // أصبح 4 (800 + 300 = 1100 دج)
    fireEvent.click(minusButtons[0]); // أصبح 3 (600 + 300 = 900 دج)

    // إجمالي المسترد: 3 * 200 + 2 * 150 = 900 دج
    expect(screen.getByText(formatMoney(900))).toBeInTheDocument();

    // تجربة زر قطعة واحدة فقط
    const onePieceBtn = screen.getByText('قطعة واحدة فقط');
    fireEvent.click(onePieceBtn);
    expect(screen.getByText(formatMoney(350))).toBeInTheDocument();
  });

  it('submits onConfirmReturn with selected items, reason, and refund method', () => {
    const onConfirmReturn = vi.fn();
    renderModal({ onConfirmReturn });

    const confirmBtn = screen.getByRole('button', { name: /تأكيد واسترداد فوري/ });
    fireEvent.click(confirmBtn);

    expect(onConfirmReturn).toHaveBeenCalledTimes(1);
    expect(onConfirmReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        originalSale: mockSale,
        reason: 'طلب الزبون (تراجع عن الشراء)',
        refundMethod: 'cash',
        returnItems: expect.arrayContaining([
          expect.objectContaining({ productId: 'p-1', qty: 5 }),
          expect.objectContaining({ productId: 'p-2', qty: 2 }),
        ]),
      })
    );
  });

  it('triggers onLoadToCart when clicking "تحميل للسلة للمعاينة"', () => {
    const onLoadToCart = vi.fn();
    renderModal({ onLoadToCart });

    const loadBtn = screen.getByRole('button', { name: /تحميل للسلة للمعاينة/ });
    fireEvent.click(loadBtn);

    expect(onLoadToCart).toHaveBeenCalledTimes(1);
    expect(onLoadToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        originalSale: mockSale,
        returnItems: expect.any(Array),
      })
    );
  });
});
