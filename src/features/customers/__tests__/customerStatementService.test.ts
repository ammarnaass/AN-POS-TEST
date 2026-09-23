import { describe, it, expect } from 'vitest';
import { calculateCustomerStatement, calculateCustomerDebtAging } from '../services/customerStatementService';
import type { Customer, Sale } from '@/types';

describe('calculateCustomerStatement', () => {
  it('correctly calculates initial balance, running balances, and totals for أحمد بن علي scenario', () => {
    const customer: Customer = {
      id: 'cust-1',
      name: 'أحمد بن علي',
      phone: '0555123456',
      creditLimit: 20000,
      balance: 15250, // Final customer balance in DB
      createdAt: '2026-05-01T10:00:00.000Z',
    };

    const sales: Sale[] = [
      {
        id: 'inv-1',
        invoiceNumber: 'INV-989143',
        customerId: 'cust-1',
        type: 'sale',
        total: 400,
        amountPaid: 0,
        paidAmount: 0,
        status: 'completed',
        createdAt: '2026-09-13T09:00:00.000Z',
        items: [],
        paymentMethod: 'credit',
      } as any,
    ];

    const payments = [
      {
        id: 'pay-1',
        customerId: 'cust-1',
        amount: 150,
        method: 'cash',
        date: '2026-09-13T10:00:00.000Z',
        createdAt: '2026-09-13T10:00:00.000Z',
      },
    ];

    const result = calculateCustomerStatement(
      customer,
      sales,
      payments,
      'all',
      '',
      ''
    );

    // Initial opening balance was 15,000 (15,250 - 400 + 150)
    expect(result.initialOpeningBalance).toBe(15000);
    expect(result.totalSales).toBe(400);
    expect(result.totalPayments).toBe(150);
    expect(result.currentBalance).toBe(15250);

    // Check entry rows
    // Entry 0: opening_balance with debit 15000, runningBalance 15000
    expect(result.entries[0].type).toBe('opening_balance');
    expect(result.entries[0].debit).toBe(15000);
    expect(result.entries[0].runningBalance).toBe(15000);

    // Entry 1: sale invoice with debit 400, runningBalance 15400
    expect(result.entries[1].type).toBe('sale');
    expect(result.entries[1].debit).toBe(400);
    expect(result.entries[1].runningBalance).toBe(15400);

    // Entry 2: payment with credit 150, runningBalance 15250
    expect(result.entries[2].type).toBe('payment');
    expect(result.entries[2].credit).toBe(150);
    expect(result.entries[2].runningBalance).toBe(15250);
  });

  it('correctly handles date range filtering with balance brought forward (previous_balance)', () => {
    const customer: Customer = {
      id: 'cust-1',
      name: 'أحمد بن علي',
      phone: '0555123456',
      creditLimit: 20000,
      balance: 15250,
      createdAt: '2026-05-01T10:00:00.000Z',
    };

    const sales: Sale[] = [
      {
        id: 'inv-old',
        invoiceNumber: 'INV-OLD',
        customerId: 'cust-1',
        type: 'sale',
        total: 500,
        amountPaid: 0,
        status: 'completed',
        createdAt: '2026-06-01T09:00:00.000Z',
        items: [],
      } as any,
      {
        id: 'inv-new',
        invoiceNumber: 'INV-NEW',
        customerId: 'cust-1',
        type: 'sale',
        total: 400,
        amountPaid: 0,
        status: 'completed',
        createdAt: '2026-09-13T09:00:00.000Z',
        items: [],
      } as any,
    ];

    const payments = [
      {
        id: 'pay-new',
        customerId: 'cust-1',
        amount: 150,
        method: 'cash',
        date: '2026-09-13T10:00:00.000Z',
        createdAt: '2026-09-13T10:00:00.000Z',
      },
    ];

    // Filter starting on 2026-09-01
    const result = calculateCustomerStatement(
      customer,
      sales,
      payments,
      'all',
      '2026-09-01',
      '2026-09-30'
    );

    // Initial opening balance was 15250 - 900 + 150 = 14500
    // Before 2026-09-01: initial (14500) + inv-old (500) = 15000
    expect(result.balanceBroughtForward).toBe(15000);
    expect(result.entries[0].type).toBe('previous_balance');
    expect(result.entries[0].runningBalance).toBe(15000);
  });
});

describe('calculateCustomerDebtAging', () => {
  it('correctly categorizes unpaid and partial sales into aging buckets based on reference date', () => {
    // Reference date: 2026-09-30
    const refDate = new Date('2026-09-30T12:00:00.000Z');

    const customerSales: Sale[] = [
      // 10 days old -> 0-30 bucket (amount: 1,000)
      {
        id: 'sale-1',
        number: 'INV-1',
        total: 1000,
        paidAmount: 0,
        status: 'unpaid',
        date: '2026-09-20T10:00:00.000Z',
        type: 'sale',
      } as any,
      // 40 days old -> 31-60 bucket (total: 2,000, paid: 500, remaining debt: 1,500)
      {
        id: 'sale-2',
        number: 'INV-2',
        total: 2000,
        paidAmount: 500,
        status: 'partial',
        date: '2026-08-21T10:00:00.000Z',
        type: 'sale',
      } as any,
      // 75 days old -> 61-90 bucket (total: 3,000, debt: 3,000)
      {
        id: 'sale-3',
        number: 'INV-3',
        total: 3000,
        paidAmount: 0,
        status: 'unpaid',
        date: '2026-07-17T10:00:00.000Z',
        type: 'sale',
      } as any,
      // 110 days old -> +90 bucket (total: 4,000, debt: 4,000)
      {
        id: 'sale-4',
        number: 'INV-4',
        total: 4000,
        paidAmount: 0,
        status: 'unpaid',
        date: '2026-06-12T10:00:00.000Z',
        type: 'sale',
      } as any,
      // Fully paid sale -> should be ignored completely
      {
        id: 'sale-paid',
        number: 'INV-PAID',
        total: 5000,
        paidAmount: 5000,
        status: 'paid',
        date: '2026-06-01T10:00:00.000Z',
        type: 'sale',
      } as any,
      // Return sale -> should be ignored completely
      {
        id: 'sale-return',
        number: 'RET-1',
        total: -500,
        status: 'return',
        type: 'return',
      } as any,
    ];

    const aging = calculateCustomerDebtAging(customerSales, refDate);

    // Total overdue = 1,000 + 1,500 + 3,000 + 4,000 = 9,500
    expect(aging.totalOverdue).toBe(9500);
    expect(aging.unpaidInvoicesCount).toBe(4);
    expect(aging.oldestInvoiceDays).toBe(110);

    // Bucket 0-30
    const b0 = aging.buckets.find((b) => b.rangeDays === '0-30');
    expect(b0?.amount).toBe(1000);
    expect(b0?.invoicesCount).toBe(1);

    // Bucket 31-60
    const b31 = aging.buckets.find((b) => b.rangeDays === '31-60');
    expect(b31?.amount).toBe(1500);
    expect(b31?.invoicesCount).toBe(1);

    // Bucket 61-90
    const b61 = aging.buckets.find((b) => b.rangeDays === '61-90');
    expect(b61?.amount).toBe(3000);
    expect(b61?.invoicesCount).toBe(1);

    // Bucket +90
    const b90 = aging.buckets.find((b) => b.rangeDays === '+90');
    expect(b90?.amount).toBe(4000);
    expect(b90?.invoicesCount).toBe(1);
  });

  it('correctly calculates statement when direct manual debt (debit) is added', () => {
    const customer: Customer = {
      id: 'cust-debt-test',
      name: 'فاروق التاجر',
      phone: '0666112233',
      creditLimit: 50000,
      balance: 7000,
      createdAt: '2026-01-01T10:00:00.000Z',
    };

    const sales: Sale[] = [
      {
        id: 'sale-1',
        number: 'INV-101',
        customerId: 'cust-debt-test',
        type: 'sale',
        total: 5000,
        paidAmount: 5000, // Fully paid
        status: 'paid',
        date: '2026-02-01T10:00:00.000Z',
      } as any,
    ];

    const payments = [
      // Direct debt addition of 7000
      {
        id: 'pay-debit-1',
        customerId: 'cust-debt-test',
        amount: 7000,
        type: 'debit',
        method: 'credit',
        note: 'قيد دين إضافي مقابل خدمة صيانة خارجية',
        date: '2026-02-05T10:00:00.000Z',
        createdAt: '2026-02-05T10:00:00.000Z',
      },
    ];

    const result = calculateCustomerStatement(customer, sales, payments);

    expect(result.initialOpeningBalance).toBe(0);
    expect(result.finalBalance).toBe(7000);
    const debitEntry = result.entries.find((e) => e.type === 'debt_addition');
    expect(debitEntry).toBeDefined();
    expect(debitEntry?.debit).toBe(7000);
    expect(debitEntry?.credit).toBe(0);
    expect(debitEntry?.runningBalance).toBe(7000);
  });
});
