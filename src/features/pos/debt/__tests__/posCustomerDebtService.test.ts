import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCustomerDebtSummary,
  validateCreditSaleParams,
  addCustomerDebtRecord,
  fetchCustomerStatement,
  allocatePaymentFIFO,
  settleSpecificInvoiceDebtRecord,
} from '../services/posCustomerDebtService';
import type { Customer } from '@/types';
import { db } from '@/infrastructure/database/dexie/db';

vi.mock('@/infrastructure/database/dexie/db', () => ({
  db: {
    customers: {
      get: vi.fn(),
      update: vi.fn(),
      add: vi.fn(),
    },
    payments: {
      add: vi.fn(),
      filter: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve([])),
      })),
    },
    sales: {
      get: vi.fn(),
      update: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([])),
          filter: vi.fn(() => ({
            toArray: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    },
    cash_sessions: {
      get: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(() => Promise.resolve(null)),
        })),
      })),
      update: vi.fn(),
    },
    transaction: vi.fn((_mode: string, _tables: any[], cb: () => any) => cb()),
  },
}));

describe('posCustomerDebtService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const customer: Customer = {
    id: 'c-test',
    name: 'سفيان',
    phone: '0555000111',
    creditLimit: 60000,
    balance: 20000,
  };

  describe('getCustomerDebtSummary', () => {
    it('returns default fallback summary when customer is null', () => {
      const summary = getCustomerDebtSummary(null);
      expect(summary.customerId).toBe('');
      expect(summary.customerName).toContain('افتراضي');
      expect(summary.balance).toBe(0);
      expect(summary.isCreditLimitExceeded).toBe(false);
    });

    it('calculates remaining credit and debt indicators correctly', () => {
      const summary = getCustomerDebtSummary(customer);
      expect(summary.balance).toBe(20000);
      expect(summary.creditLimit).toBe(60000);
      expect(summary.remainingCredit).toBe(40000);
      expect(summary.isCreditLimitExceeded).toBe(false);
      expect(summary.hasCreditAdvance).toBe(false);
    });

    it('flags limit exceeded when balance > creditLimit', () => {
      const exceededCustomer: Customer = {
        ...customer,
        balance: 75000,
      };
      const summary = getCustomerDebtSummary(exceededCustomer);
      expect(summary.isCreditLimitExceeded).toBe(true);
      expect(summary.creditExcessAmount).toBe(15000);
      expect(summary.remainingCredit).toBe(0);
    });

    it('identifies advance credit when balance < 0', () => {
      const advanceCustomer: Customer = {
        ...customer,
        balance: -10000,
      };
      const summary = getCustomerDebtSummary(advanceCustomer);
      expect(summary.hasCreditAdvance).toBe(true);
      expect(summary.isCreditLimitExceeded).toBe(false);
    });
  });

  describe('validateCreditSaleParams', () => {
    it('blocks confirmation when customer is missing', () => {
      const result = validateCreditSaleParams({
        customer: null,
        saleTotal: 1000,
        overrideCreditLimit: false,
      });
      expect(result.isConfirmDisabled).toBe(true);
      expect(result.validationError).toBeDefined();
    });

    it('permits sale when projected balance is within limit', () => {
      const result = validateCreditSaleParams({
        customer,
        saleTotal: 30000, // 20,000 + 30,000 = 50,000 <= 60,000
        overrideCreditLimit: false,
      });
      expect(result.projectedDebt).toBe(50000);
      expect(result.isCreditLimitExceeded).toBe(false);
      expect(result.isConfirmDisabled).toBe(false);
    });

    it('blocks sale when projected balance exceeds limit without supervisor override', () => {
      const result = validateCreditSaleParams({
        customer,
        saleTotal: 50000, // 20,000 + 50,000 = 70,000 > 60,000
        overrideCreditLimit: false,
      });
      expect(result.projectedDebt).toBe(70000);
      expect(result.isCreditLimitExceeded).toBe(true);
      expect(result.creditExcessAmount).toBe(10000);
      expect(result.isConfirmDisabled).toBe(true);
    });

    it('unblocks sale when supervisor overrides limit violation', () => {
      const result = validateCreditSaleParams({
        customer,
        saleTotal: 50000,
        overrideCreditLimit: true,
      });
      expect(result.isConfirmDisabled).toBe(false);
    });
  });

  describe('addCustomerDebtRecord (إضافة دين مباشر للعميل)', () => {
    it('throws error when amount is zero or negative', async () => {
      await expect(
        addCustomerDebtRecord({
          customerId: 'c-test',
          customerName: 'سفيان',
          amount: 0,
        })
      ).rejects.toThrow(/مبلغ الدين غير صالح/);

      await expect(
        addCustomerDebtRecord({
          customerId: 'c-test',
          customerName: 'سفيان',
          amount: -500,
        })
      ).rejects.toThrow(/مبلغ الدين غير صالح/);
    });

    it('throws error when customer is not found', async () => {
      vi.mocked(db.customers.get).mockResolvedValue(undefined as any);

      await expect(
        addCustomerDebtRecord({
          customerId: 'non-existent',
          customerName: 'غير معروف',
          amount: 5000,
        })
      ).rejects.toThrow(/الزبون غير موجود/);
    });

    it('blocks debt addition when credit limit is exceeded without override', async () => {
      vi.mocked(db.customers.get).mockResolvedValue(customer as any);

      // current balance = 20,000, limit = 60,000. Adding 45,000 -> 65,000 (excess: 5,000)
      await expect(
        addCustomerDebtRecord({
          customerId: 'c-test',
          customerName: 'سفيان',
          amount: 45000,
          overrideCreditLimit: false,
        })
      ).rejects.toThrow(/تجاوز سقف الائتمان/);
    });

    it('successfully adds debt within limit and updates balance and payments', async () => {
      vi.mocked(db.customers.get).mockResolvedValue(customer as any);

      const result = await addCustomerDebtRecord({
        customerId: 'c-test',
        customerName: 'سفيان',
        amount: 15000, // 20,000 + 15,000 = 35,000 <= 60,000
        reason: 'بضاعة إضافية',
      });

      expect(result.success).toBe(true);
      expect(result.previousBalance).toBe(20000);
      expect(result.addedAmount).toBe(15000);
      expect(result.newBalance).toBe(35000);

      // Check payment entry created as debit
      expect(db.payments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          partyId: 'c-test',
          customerId: 'c-test',
          amount: 15000,
          type: 'debit',
          method: 'credit',
        })
      );

      // Check customer balance update
      expect(db.customers.update).toHaveBeenCalledWith('c-test', {
        balance: 35000,
        updatedAt: expect.any(String),
      });
    });

    it('successfully adds debt with supervisor override when limit is exceeded', async () => {
      vi.mocked(db.customers.get).mockResolvedValue(customer as any);

      const result = await addCustomerDebtRecord({
        customerId: 'c-test',
        customerName: 'سفيان',
        amount: 50000,
        overrideCreditLimit: true,
        reason: 'رصيد سابق استثنائي',
      });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(70000);
      expect(db.customers.update).toHaveBeenCalledWith('c-test', {
        balance: 70000,
        updatedAt: expect.any(String),
      });
    });
  });

  describe('fetchCustomerStatement (استخراج كشف حساب الزبون المحاسبي)', () => {
    it('returns empty statement summary when customer does not exist', async () => {
      vi.mocked(db.customers.get).mockResolvedValue(undefined as any);

      const summary = await fetchCustomerStatement('unknown');
      expect(summary.entries).toHaveLength(0);
      expect(summary.finalBalance).toBe(0);
    });

    it('calculates chronological running balance with sales, payments, and returns', async () => {
      vi.mocked(db.customers.get).mockResolvedValue({
        id: 'c-test',
        name: 'سفيان',
        balance: 25000,
      } as any);

      // 1 Sale for 30,000 (0 paid, debt 30,000)
      vi.mocked(db.sales.where).mockReturnValue({
        equals: vi.fn(() => ({
          toArray: vi.fn(() =>
            Promise.resolve([
              {
                id: 's-1',
                number: 'INV-100',
                date: '2026-03-01T10:00:00Z',
                total: 30000,
                paidAmount: 0,
                type: 'sale',
                status: 'unpaid',
              },
            ])
          ),
        })),
      } as any);

      // 1 Payment for 5,000
      vi.mocked(db.payments.filter).mockReturnValue({
        toArray: vi.fn(() =>
          Promise.resolve([
            {
              id: 'p-1',
              date: '2026-03-02T12:00:00Z',
              customerId: 'c-test',
              amount: 5000,
              type: 'credit',
              method: 'cash',
              note: 'تسديد نقدي',
            },
          ])
        ),
      } as any);

      const summary = await fetchCustomerStatement('c-test');

      expect(summary.totalDebit).toBe(30000);
      expect(summary.totalCredit).toBe(5000);
      expect(summary.finalBalance).toBe(25000);
      expect(summary.entries.length).toBeGreaterThanOrEqual(2);

      // Verify running balances
      const saleRow = summary.entries.find((e) => e.type === 'sale');
      expect(saleRow).toBeDefined();
      expect(saleRow?.debit).toBe(30000);

      const paymentRow = summary.entries.find((e) => e.type === 'payment');
      expect(paymentRow).toBeDefined();
      expect(paymentRow?.credit).toBe(5000);
      expect(paymentRow?.runningBalance).toBe(25000);
    });
  });

  describe('allocatePaymentFIFO', () => {
    it('allocates payment strictly in FIFO order from oldest to newest invoice', () => {
      const invoices = [
        {
          id: 'inv-newer',
          number: 'INV-2',
          date: '2026-09-10T10:00:00Z',
          total: 1000,
          paidAmount: 0,
          status: 'unpaid',
        },
        {
          id: 'inv-older',
          number: 'INV-1',
          date: '2026-09-01T10:00:00Z',
          total: 800,
          paidAmount: 0,
          status: 'unpaid',
        },
      ];

      // Pay 1200 -> should fully settle inv-older (800) and partially settle inv-newer (400 / 1000)
      const result = allocatePaymentFIFO(invoices, 1200);

      expect(result.unallocatedRemaining).toBe(0);
      expect(result.allocations).toHaveLength(2);

      // Oldest invoice first
      const firstAlloc = result.allocations[0];
      expect(firstAlloc.invoiceId).toBe('inv-older');
      expect(firstAlloc.allocatedAmount).toBe(800);
      expect(firstAlloc.remainingAfter).toBe(0);
      expect(firstAlloc.newStatus).toBe('paid');

      // Newer invoice second
      const secondAlloc = result.allocations[1];
      expect(secondAlloc.invoiceId).toBe('inv-newer');
      expect(secondAlloc.allocatedAmount).toBe(400);
      expect(secondAlloc.remainingAfter).toBe(600);
      expect(secondAlloc.newStatus).toBe('partial');
    });

    it('returns unallocatedRemaining when incoming payment exceeds all unpaid invoices', () => {
      const invoices = [
        {
          id: 'inv-1',
          number: 'INV-1',
          date: '2026-09-01T10:00:00Z',
          total: 500,
          paidAmount: 0,
          status: 'unpaid',
        },
      ];

      const result = allocatePaymentFIFO(invoices, 1500);

      expect(result.unallocatedRemaining).toBe(1000);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].newStatus).toBe('paid');
      expect(result.allocations[0].remainingAfter).toBe(0);
    });

    it('skips invoices that are already fully paid', () => {
      const invoices = [
        {
          id: 'inv-paid',
          number: 'INV-0',
          date: '2026-08-01T10:00:00Z',
          total: 600,
          paidAmount: 600,
          status: 'paid',
        },
        {
          id: 'inv-unpaid',
          number: 'INV-1',
          date: '2026-09-01T10:00:00Z',
          total: 400,
          paidAmount: 0,
          status: 'unpaid',
        },
      ];

      const result = allocatePaymentFIFO(invoices, 400);

      expect(result.unallocatedRemaining).toBe(0);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].invoiceId).toBe('inv-unpaid');
      expect(result.allocations[0].allocatedAmount).toBe(400);
      expect(result.allocations[0].newStatus).toBe('paid');
    });
  });

  describe('settleSpecificInvoiceDebtRecord', () => {
    it('successfully settles a specific invoice, updates sale, records payment, and decreases customer debt', async () => {
      vi.mocked(db.sales.get).mockResolvedValue({
        id: 'sale-123',
        number: 'INV-123',
        total: 5000,
        paidAmount: 2000,
        amountPaid: 2000,
        status: 'partial',
        customerId: 'c-test',
      } as any);

      vi.mocked(db.customers.get).mockResolvedValue({
        id: 'c-test',
        name: 'سفيان',
        balance: 10000,
      } as any);

      const openSession = {
        id: 'sess-1',
        status: 'open',
        deposits: [],
      };
      vi.mocked(db.cash_sessions.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn(() => Promise.resolve(openSession)),
        })),
      } as any);

      // Settle remaining 3000 on this invoice
      const result = await settleSpecificInvoiceDebtRecord({
        saleId: 'sale-123',
        customerId: 'c-test',
        customerName: 'سفيان',
        amount: 3000,
        paymentMethod: 'cash',
        note: 'تسديد مباشر',
        currentSessionId: 'sess-1',
      });

      expect(result.success).toBe(true);
      expect(result.settledAmount).toBe(3000);
      expect(result.previousBalance).toBe(10000);
      expect(result.newBalance).toBe(7000);

      // Verify db.sales.update called with status: 'paid'
      expect(db.sales.update).toHaveBeenCalledWith(
        'sale-123',
        expect.objectContaining({
          paidAmount: 5000,
          amountPaid: 5000,
          status: 'paid',
        })
      );

      // Verify db.payments.add was called
      expect(db.payments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          partyId: 'c-test',
          customerId: 'c-test',
          amount: 3000,
          type: 'credit',
        })
      );

      // Verify db.customers.update decreased balance
      expect(db.customers.update).toHaveBeenCalledWith(
        'c-test',
        expect.objectContaining({
          balance: 7000,
        })
      );

      // Verify cash_session updated with deposit
      expect(db.cash_sessions.update).toHaveBeenCalledWith(
        'sess-1',
        expect.objectContaining({
          deposits: expect.arrayContaining([
            expect.objectContaining({
              amount: 3000,
            }),
          ]),
        })
      );
    });

    it('throws error when amount is invalid or zero', async () => {
      await expect(
        settleSpecificInvoiceDebtRecord({
          saleId: 'sale-123',
          customerId: 'c-test',
          amount: 0,
          paymentMethod: 'cash',
        })
      ).rejects.toThrow('مبلغ التسديد غير صالح');
    });

    it('throws error when invoice does not exist', async () => {
      vi.mocked(db.sales.get).mockResolvedValue(undefined as any);

      await expect(
        settleSpecificInvoiceDebtRecord({
          saleId: 'invalid-id',
          customerId: 'c-test',
          amount: 500,
          paymentMethod: 'cash',
        })
      ).rejects.toThrow('غير موجودة');
    });
  });
});
