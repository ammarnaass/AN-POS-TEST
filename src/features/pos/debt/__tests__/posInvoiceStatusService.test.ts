import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Sale, Customer } from '@/types';
import { db } from '@/infrastructure/database/dexie/db';
import {
  toggleInvoicePaymentStatus,
  calculateCustomerInvoicesMetrics,
} from '../services/posInvoiceStatusService';

vi.mock('@/infrastructure/database/dexie/db', () => ({
  db: {
    sales: {
      get: vi.fn(),
      update: vi.fn(),
    },
    customers: {
      get: vi.fn(),
      update: vi.fn(),
    },
    payments: {
      add: vi.fn(),
    },
    cash_sessions: {
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
        })),
      })),
      update: vi.fn(),
    },
    transaction: vi.fn((_mode, _tables, callback) => callback()),
  },
}));

describe('posInvoiceStatusService (خدمة التبديل الذري لحالة الفاتورة والديون)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toggleInvoicePaymentStatus (تبديل الحالة بين مدفوع وغير مسدد)', () => {
    it('throws error if invoice not found', async () => {
      vi.mocked(db.sales.get).mockResolvedValue(undefined);

      await expect(
        toggleInvoicePaymentStatus({ saleId: 'not-exist', targetStatus: 'paid' })
      ).rejects.toThrow(/غير موجودة/);
    });

    it('toggles from unpaid to paid, settles customer debt and records payment', async () => {
      const mockSale: Sale = {
        id: 's-1',
        number: 'INV-001',
        total: 5000,
        paidAmount: 0,
        status: 'unpaid',
        paymentMethod: 'credit',
        customerId: 'cust-1',
        items: [],
      } as any;

      const mockCustomer: Customer = {
        id: 'cust-1',
        name: 'أحمد بن علي',
        balance: 12000, // Current debt is 12,000
      } as any;

      vi.mocked(db.sales.get).mockResolvedValue(mockSale);
      vi.mocked(db.customers.get).mockResolvedValue(mockCustomer);

      const result = await toggleInvoicePaymentStatus({
        saleId: 's-1',
        targetStatus: 'paid',
        paymentMethod: 'cash',
        currentSessionId: 'sess-1',
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('paid');
      expect(result.previousCustomerBalance).toBe(12000);
      expect(result.newCustomerBalance).toBe(7000); // 12000 - 5000
      expect(result.amountChanged).toBe(5000);

      // Verify sales update
      expect(db.sales.update).toHaveBeenCalledWith(
        's-1',
        expect.objectContaining({
          status: 'paid',
          paidAmount: 5000,
          paymentMethod: 'cash',
        })
      );

      // Verify customer debt reduced
      expect(db.customers.update).toHaveBeenCalledWith(
        'cust-1',
        expect.objectContaining({
          balance: 7000,
        })
      );

      // Verify payment added
      expect(db.payments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          customerId: 'cust-1',
        })
      );
    });

    it('toggles from paid to unpaid, increases customer debt and converts to credit', async () => {
      const mockSale: Sale = {
        id: 's-2',
        number: 'INV-002',
        total: 3000,
        paidAmount: 3000,
        status: 'paid',
        paymentMethod: 'cash',
        customerId: 'cust-2',
        items: [],
      } as any;

      const mockCustomer: Customer = {
        id: 'cust-2',
        name: 'سفيان دراجي',
        balance: 1000, // Current debt is 1,000
      } as any;

      vi.mocked(db.sales.get).mockResolvedValue(mockSale);
      vi.mocked(db.customers.get).mockResolvedValue(mockCustomer);

      const result = await toggleInvoicePaymentStatus({
        saleId: 's-2',
        targetStatus: 'unpaid',
      });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('unpaid');
      expect(result.previousCustomerBalance).toBe(1000);
      expect(result.newCustomerBalance).toBe(4000); // 1000 + 3000
      expect(result.amountChanged).toBe(3000);

      // Verify sales update
      expect(db.sales.update).toHaveBeenCalledWith(
        's-2',
        expect.objectContaining({
          status: 'unpaid',
          paidAmount: 0,
          paymentMethod: 'credit',
        })
      );

      // Verify customer debt increased
      expect(db.customers.update).toHaveBeenCalledWith(
        'cust-2',
        expect.objectContaining({
          balance: 4000,
        })
      );
    });

    it('fails to convert paid to unpaid if customer is not specified', async () => {
      const mockSale: Sale = {
        id: 's-3',
        number: 'INV-003',
        total: 1500,
        paidAmount: 1500,
        status: 'paid',
        paymentMethod: 'cash',
        // No customerId!
      } as any;

      vi.mocked(db.sales.get).mockResolvedValue(mockSale);

      await expect(
        toggleInvoicePaymentStatus({ saleId: 's-3', targetStatus: 'unpaid' })
      ).rejects.toThrow(/لا يمكن تحويل الفاتورة إلى دين بدون تحديد زبون مسجل/);
    });
  });

  describe('calculateCustomerInvoicesMetrics', () => {
    it('calculates metrics across sales, debts, and returns accurately', () => {
      const sales: Sale[] = [
        // Paid sale: 2000
        { id: '1', total: 2000, paidAmount: 2000, status: 'paid', type: 'sale' } as Sale,
        // Unpaid sale: 3000 (0 paid)
        { id: '2', total: 3000, paidAmount: 0, status: 'unpaid', type: 'sale' } as Sale,
        // Partial sale: 4000 (1500 paid, 2500 remaining debt)
        { id: '3', total: 4000, paidAmount: 1500, status: 'partial', type: 'sale' } as Sale,
        // Return: 500
        { id: '4', total: 500, paidAmount: 0, status: 'completed', type: 'return' } as Sale,
      ];

      const metrics = calculateCustomerInvoicesMetrics(sales);
      expect(metrics.totalSalesAmount).toBe(9000); // 2000 + 3000 + 4000
      expect(metrics.totalPaidAmount).toBe(3500); // 2000 + 0 + 1500
      expect(metrics.totalUnpaidDebt).toBe(5500); // 3000 + 2500
      expect(metrics.paidCount).toBe(1);
      expect(metrics.unpaidCount).toBe(2);
      expect(metrics.returnsCount).toBe(1);
      expect(metrics.totalCount).toBe(4);
    });
  });
});
