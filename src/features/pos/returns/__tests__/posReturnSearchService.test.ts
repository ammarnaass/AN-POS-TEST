import { describe, it, expect } from 'vitest';
import type { Sale } from '@/types';
import {
  isDateInRange,
  filterSalesForReturnAdvanced,
  findSaleByBarcode,
  prepareFullReturnCartItems,
  buildReturnsByOriginalSaleMap,
} from '../services/posReturnSearchService';

describe('posReturnSearchService (محرك بحث المرتجعات المتقدم)', () => {
  const baseDate = new Date('2026-09-22T12:00:00Z');

  describe('isDateInRange (تصفية التواريخ)', () => {
    it('returns true for "all" range', () => {
      expect(isDateInRange('2020-01-01', 'all', undefined, undefined, baseDate)).toBe(true);
    });

    it('identifies sales from "today"', () => {
      expect(isDateInRange('2026-09-22T08:00:00Z', 'today', undefined, undefined, baseDate)).toBe(true);
      expect(isDateInRange('2026-09-21T20:00:00Z', 'today', undefined, undefined, baseDate)).toBe(false);
    });

    it('identifies sales from "yesterday"', () => {
      expect(isDateInRange('2026-09-21T15:00:00Z', 'yesterday', undefined, undefined, baseDate)).toBe(true);
      expect(isDateInRange('2026-09-22T08:00:00Z', 'yesterday', undefined, undefined, baseDate)).toBe(false);
      expect(isDateInRange('2026-09-20T10:00:00Z', 'yesterday', undefined, undefined, baseDate)).toBe(false);
    });

    it('identifies sales from the last "week"', () => {
      expect(isDateInRange('2026-09-18T10:00:00Z', 'week', undefined, undefined, baseDate)).toBe(true);
      expect(isDateInRange('2026-09-10T10:00:00Z', 'week', undefined, undefined, baseDate)).toBe(false);
    });

    it('handles custom date range', () => {
      expect(
        isDateInRange('2026-09-15T12:00:00Z', 'custom', '2026-09-10', '2026-09-20', baseDate)
      ).toBe(true);
      expect(
        isDateInRange('2026-09-25T12:00:00Z', 'custom', '2026-09-10', '2026-09-20', baseDate)
      ).toBe(false);
    });
  });

  describe('filterSalesForReturnAdvanced (تصفية وبحث الفواتير الغنية)', () => {
    const mockSales: Sale[] = [
      {
        id: 'sale-1',
        number: 'INV-101',
        date: '2026-09-22T09:00:00Z',
        customerId: 'cust-1',
        customerName: 'أحمد بن علي',
        paymentMethod: 'cash',
        type: 'sale',
        soldBy: 'كاشير 1',
        total: 1000,
        subtotal: 1000,
        discount: 0,
        discountType: 'amount',
        tvaAmount: 0,
        paidAmount: 1000,
        status: 'paid',
        docType: 'facture',
        items: [
          { productId: 'p1', name: 'زيت نباتي 5 لتر', barcode: '6130001', qty: 2, unitPrice: 500, lineTotal: 1000 },
        ],
      } as Sale,
      {
        id: 'sale-2',
        number: 'INV-102',
        date: '2026-09-21T10:00:00Z',
        customerId: 'cust-2',
        customerName: 'فاطمة الزهراء',
        paymentMethod: 'credit',
        type: 'sale',
        soldBy: 'كاشير 2',
        total: 800,
        subtotal: 800,
        discount: 0,
        discountType: 'amount',
        tvaAmount: 0,
        paidAmount: 0,
        status: 'unpaid',
        docType: 'facture',
        items: [
          { productId: 'p2', name: 'سكر 1 كغ', barcode: '6130002', qty: 5, unitPrice: 100, lineTotal: 500 },
          { productId: 'p3', name: 'شاي أخضر', barcode: '6130003', qty: 3, unitPrice: 100, lineTotal: 300 },
        ],
      } as Sale,
      {
        id: 'sale-3',
        number: 'INV-103',
        date: '2026-09-20T11:00:00Z',
        type: 'sale',
        customerName: 'زبون عام',
        paymentMethod: 'cash',
        soldBy: 'كاشير 1',
        total: 200,
        subtotal: 200,
        discount: 0,
        discountType: 'amount',
        tvaAmount: 0,
        paidAmount: 200,
        status: 'paid',
        docType: 'facture',
        items: [
          { productId: 'p4', name: 'قهوة مطحونة', barcode: '6130004', qty: 1, unitPrice: 200, lineTotal: 200 },
        ],
      } as Sale,
    ];

    const mockReturns: Sale[] = [
      {
        id: 'ret-1',
        number: 'RET-01',
        originalSaleId: 'sale-3',
        type: 'return',
        total: 200,
        items: [
          { productId: 'p4', name: 'قهوة مطحونة', qty: 1, unitPrice: 200, lineTotal: 200 },
        ],
      } as Sale,
      {
        id: 'ret-2',
        number: 'RET-02',
        originalSaleId: 'sale-2',
        type: 'return',
        total: 100,
        items: [
          { productId: 'p2', name: 'سكر 1 كغ', qty: 1, unitPrice: 100, lineTotal: 100 },
        ],
      } as Sale,
    ];

    it('returns all sales when query is empty and no restrictive filters', () => {
      const results = filterSalesForReturnAdvanced(mockSales, mockReturns, { query: '' });
      expect(results.length).toBe(3);
    });

    it('searches by invoice number', () => {
      const results = filterSalesForReturnAdvanced(mockSales, mockReturns, { query: '101' });
      expect(results.length).toBe(1);
      expect(results[0].sale.id).toBe('sale-1');
    });

    it('searches by customer name', () => {
      const results = filterSalesForReturnAdvanced(mockSales, mockReturns, { query: 'فاطمة' });
      expect(results.length).toBe(1);
      expect(results[0].sale.id).toBe('sale-2');
    });

    it('searches by product name inside items and annotates matchedItemNames', () => {
      const results = filterSalesForReturnAdvanced(mockSales, mockReturns, { query: 'سكر' });
      expect(results.length).toBe(1);
      expect(results[0].sale.id).toBe('sale-2');
      expect(results[0].matchedItemNames).toContain('سكر 1 كغ');
    });

    it('searches by product barcode inside items', () => {
      const results = filterSalesForReturnAdvanced(mockSales, mockReturns, { query: '6130001' });
      expect(results.length).toBe(1);
      expect(results[0].sale.id).toBe('sale-1');
      expect(results[0].matchedItemNames).toContain('زيت نباتي 5 لتر');
    });

    it('computes prior returns and eligibility accurately', () => {
      const results = filterSalesForReturnAdvanced(mockSales, mockReturns, { query: '' });
      
      const resSale1 = results.find((r) => r.sale.id === 'sale-1')!;
      expect(resSale1.hasPriorReturns).toBe(false);
      expect(resSale1.isFullyReturned).toBe(false);
      expect(resSale1.remainingReturnablePieces).toBe(2);

      const resSale2 = results.find((r) => r.sale.id === 'sale-2')!;
      expect(resSale2.hasPriorReturns).toBe(true);
      expect(resSale2.alreadyReturnedCount).toBe(1);
      expect(resSale2.isFullyReturned).toBe(false);
      expect(resSale2.remainingReturnablePieces).toBe(7); // 8 - 1 = 7

      const resSale3 = results.find((r) => r.sale.id === 'sale-3')!;
      expect(resSale3.hasPriorReturns).toBe(true);
      expect(resSale3.isFullyReturned).toBe(true);
      expect(resSale3.remainingReturnablePieces).toBe(0);
    });

    it('filters out fully returned sales when eligibilityStatus is refundable', () => {
      const results = filterSalesForReturnAdvanced(mockSales, mockReturns, {
        query: '',
        eligibilityStatus: 'refundable',
      });
      expect(results.some((r) => r.sale.id === 'sale-3')).toBe(false);
      expect(results.length).toBe(2);
    });

    it('filters by customerId', () => {
      const results = filterSalesForReturnAdvanced(mockSales, mockReturns, {
        query: '',
        customerId: 'cust-1',
      });
      expect(results.length).toBe(1);
      expect(results[0].sale.id).toBe('sale-1');
    });

    it('filters by paymentMethod', () => {
      const creditResults = filterSalesForReturnAdvanced(mockSales, mockReturns, {
        query: '',
        paymentMethod: 'credit',
      });
      expect(creditResults.length).toBe(1);
      expect(creditResults[0].sale.id).toBe('sale-2');
    });
  });

  describe('findSaleByBarcode (البحث السريع بالباركود)', () => {
    const sales: Sale[] = [
      { id: 's1', number: 'INV-100', type: 'sale' } as Sale,
      { id: 's2', number: '2026-005', barcode: 'REC-9999', type: 'sale' } as any,
    ];

    it('finds sale by invoice number with or without hash prefix', () => {
      expect(findSaleByBarcode('INV-100', sales)?.id).toBe('s1');
      expect(findSaleByBarcode('#INV-100', sales)?.id).toBe('s1');
      expect(findSaleByBarcode('inv-100', sales)?.id).toBe('s1');
    });

    it('finds sale by receipt barcode', () => {
      expect(findSaleByBarcode('REC-9999', sales)?.id).toBe('s2');
    });

    it('returns null when not found', () => {
      expect(findSaleByBarcode('NON-EXISTENT', sales)).toBeNull();
    });
  });

  describe('prepareFullReturnCartItems', () => {
    it('generates CartItem objects with remaining returnable quantities', () => {
      const sale: Sale = {
        id: 's-test',
        number: 'TEST-1',
        type: 'sale',
        items: [
          { productId: 'p1', name: 'منتج أ', qty: 5, unitPrice: 200, lineTotal: 1000 },
          { productId: 'p2', name: 'منتج ب', qty: 2, unitPrice: 300, lineTotal: 600 },
        ],
      } as Sale;

      const priorReturns: Sale[] = [
        {
          id: 'ret-prior',
          originalSaleId: 's-test',
          type: 'return',
          items: [
            { productId: 'p1', name: 'منتج أ', qty: 2, unitPrice: 200, lineTotal: 400 },
            { productId: 'p2', name: 'منتج ب', qty: 2, unitPrice: 300, lineTotal: 600 }, // fully returned
          ],
        } as Sale,
      ];

      const cartItems = prepareFullReturnCartItems(sale, priorReturns);
      expect(cartItems.length).toBe(1); // p2 is 0 remaining, so only p1
      expect(cartItems[0].productId).toBe('p1');
      expect(cartItems[0].qty).toBe(3); // 5 - 2 = 3
      expect(cartItems[0].lineTotal).toBe(600);
    });
  });

  describe('ربط المرتجعات التلقائي وتحديث الأهلية اللحظي', () => {
    it('يربط المرتجع بالفاتورة الأصلية عبر الملاحظة note "مرتجع للفاتورة #INV-XXX" ويضمن تضمين priorReturns', () => {
      const originalSale: Sale = {
        id: 'sale-orig-1',
        number: 'INV-5555',
        type: 'sale',
        date: '2026-09-22T10:00:00Z',
        items: [{ productId: 'p1', name: 'منتج أ', qty: 2, unitPrice: 500, lineTotal: 1000 }],
        total: 1000,
      } as Sale;

      const returnSaleLinkedByNote: Sale = {
        id: 'ret-5555-1',
        number: 'RET-001',
        type: 'return',
        date: '2026-09-22T11:00:00Z',
        note: 'مرتجع للفاتورة #INV-5555 - طلب الزبون',
        items: [{ productId: 'p1', name: 'منتج أ', qty: 2, unitPrice: 500, lineTotal: 1000 }],
        total: 1000,
      } as Sale;

      const results = filterSalesForReturnAdvanced([originalSale], [returnSaleLinkedByNote], { query: '' });

      expect(results.length).toBe(1);
      expect(results[0].sale.id).toBe('sale-orig-1');
      expect(results[0].hasPriorReturns).toBe(true);
      expect(results[0].isFullyReturned).toBe(true);
      expect(results[0].remainingReturnablePieces).toBe(0);
      expect(results[0].priorReturns).toHaveLength(1);
      expect(results[0].priorReturns?.[0].number).toBe('RET-001');
    });
  });
});
