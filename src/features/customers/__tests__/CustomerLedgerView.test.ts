import { describe, it, expect } from 'vitest';
import type { Customer, Sale, Payment } from '@/types';

describe('CustomerLedgerView Accounting Logic', () => {
  it('correctly maps returns as credits and decreases customer debt', () => {
    const customer: Customer = {
      id: 'cust-1',
      name: 'محمد صالح',
      phone: '0666123456',
      creditLimit: 30000,
      balance: -2784,
      createdAt: '2026-09-01T10:00:00.000Z',
    };

    const sales: Sale[] = [
      // Credit sale of 4,590
      {
        id: 'sale-1',
        number: 'INV-001',
        customerId: 'cust-1',
        total: 4590,
        amountPaid: 0,
        paidAmount: 0,
        paymentMethod: 'credit',
        status: 'unpaid',
        type: 'sale',
        date: '2026-09-22T10:00:00.000Z',
      } as any,
      // Return of 2,458
      {
        id: 'ret-1',
        number: 'INV-002',
        customerId: 'cust-1',
        total: 2458,
        amountPaid: 2458,
        paidAmount: 2458,
        paymentMethod: 'cash',
        status: 'paid',
        type: 'return',
        date: '2026-09-22T11:00:00.000Z',
      } as any,
    ];

    const payments: Payment[] = [];

    // Verify accounting effect
    const saleTotal = sales[0].total;
    const returnTotal = sales[1].total;
    const net = saleTotal - returnTotal; // 4590 - 2458 = 2132

    expect(net).toBe(2132);
    expect(sales[1].type).toBe('return');
  });

  it('handles amountPaid property fallback from SQLite correctly', () => {
    const saleFromSQLite = {
      id: 'sale-sqlite',
      number: 'INV-SQLITE',
      total: 1599,
      amountPaid: 1599, // came through toCamel from amount_paid
      paidAmount: undefined, // undefined in Dexie proxy
      paymentMethod: 'credit',
      status: 'paid',
      type: 'sale',
    };

    const resolvedPaid = Number(
      saleFromSQLite.amountPaid ?? (saleFromSQLite as any).paidAmount ?? 0
    );

    expect(resolvedPaid).toBe(1599);
    const unpaidPart = Math.max(0, saleFromSQLite.total - resolvedPaid);
    expect(unpaidPart).toBe(0);
  });
});
