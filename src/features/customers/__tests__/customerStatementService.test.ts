import { describe, it, expect } from 'vitest';
import { calculateCustomerStatement } from '../services/customerStatementService';
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
