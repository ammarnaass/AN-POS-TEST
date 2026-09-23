import { describe, it, expect, vi } from 'vitest';
import type { Sale } from '@/types';
import {
  filterInvoices,
  recallSaleItemsToCart,
  prepareFullInvoiceReturnItems,
} from '../services/posInvoiceLookupService';

describe('posInvoiceLookupService (خدمات البحث والاسترجاع للسلة)', () => {
  const sampleSales: Sale[] = [
    {
      id: '1',
      number: 'INV-101',
      customerName: 'فاروق عبد الله',
      soldBy: 'كاشير 1',
      date: '2026-09-20T10:00:00.000Z',
      status: 'paid',
      type: 'sale',
      total: 1500,
      paidAmount: 1500,
      items: [{ productId: 'p1', name: 'صابون', qty: 3, unitPrice: 500, lineTotal: 1500 }],
    } as Sale,
    {
      id: '2',
      number: 'INV-102',
      customerName: 'ياسين بلحاج',
      soldBy: 'كاشير 2',
      date: '2026-09-21T12:00:00.000Z',
      status: 'unpaid',
      type: 'sale',
      total: 4000,
      paidAmount: 0,
      items: [{ productId: 'p2', name: 'مسحوق غسيل', qty: 2, unitPrice: 2000, lineTotal: 4000 }],
    } as Sale,
    {
      id: '3',
      number: 'RET-103',
      customerName: 'فاروق عبد الله',
      soldBy: 'كاشير 1',
      date: '2026-09-22T14:00:00.000Z',
      status: 'completed',
      type: 'return',
      total: 500,
      paidAmount: 0,
      items: [{ productId: 'p1', name: 'صابون', qty: 1, unitPrice: 500, lineTotal: 500 }],
    } as Sale,
  ];

  describe('filterInvoices', () => {
    it('returns all sales when filter is empty', () => {
      expect(filterInvoices(sampleSales, {})).toHaveLength(3);
    });

    it('filters by status "unpaid"', () => {
      const res = filterInvoices(sampleSales, { status: 'unpaid' });
      expect(res).toHaveLength(1);
      expect(res[0].number).toBe('INV-102');
    });

    it('filters by status "paid"', () => {
      const res = filterInvoices(sampleSales, { status: 'paid' });
      expect(res).toHaveLength(1);
      expect(res[0].number).toBe('INV-101');
    });

    it('filters by status "return"', () => {
      const res = filterInvoices(sampleSales, { status: 'return' });
      expect(res).toHaveLength(1);
      expect(res[0].number).toBe('RET-103');
    });

    it('filters by search query matching customer or item name', () => {
      // By customer name
      expect(filterInvoices(sampleSales, { searchQuery: 'ياسين' })).toHaveLength(1);
      // By item name
      expect(filterInvoices(sampleSales, { searchQuery: 'غسيل' })).toHaveLength(1);
      // By invoice number
      expect(filterInvoices(sampleSales, { searchQuery: '101' })).toHaveLength(1);
    });

    it('filters by date range', () => {
      const res = filterInvoices(sampleSales, { dateFrom: '2026-09-21', dateTo: '2026-09-21' });
      expect(res).toHaveLength(1);
      expect(res[0].number).toBe('INV-102');
    });
  });

  describe('recallSaleItemsToCart', () => {
    it('clears cart, loads all items, customer and discount properly', () => {
      const clearCart = vi.fn();
      const addItem = vi.fn();
      const setSelectedCustomer = vi.fn();
      const setDiscount = vi.fn();
      const setDiscountType = vi.fn();

      const saleToRecall: Sale = {
        id: 'sale-recall',
        number: 'INV-777',
        customerId: 'cust-xyz',
        discount: 10,
        discountType: 'percentage',
        items: [
          { productId: 'p1', name: 'سكر', qty: 2, unitPrice: 100, lineTotal: 200, unit: 'كغ' },
          { productId: 'p2', name: 'شاي', qty: 1, unitPrice: 250, lineTotal: 250, unit: 'علبة' },
        ],
      } as Sale;

      const loadedCount = recallSaleItemsToCart(saleToRecall, {
        clearCart,
        addItem,
        setSelectedCustomer,
        setDiscount,
        setDiscountType,
      });

      expect(loadedCount).toBe(2);
      expect(clearCart).toHaveBeenCalledTimes(1);
      expect(addItem).toHaveBeenCalledTimes(2);
      expect(setSelectedCustomer).toHaveBeenCalledWith('cust-xyz');
      expect(setDiscount).toHaveBeenCalledWith(10);
      expect(setDiscountType).toHaveBeenCalledWith('percentage');
    });
  });

  describe('prepareFullInvoiceReturnItems', () => {
    it('gathers all returnable quantities deducting already returned amounts', () => {
      const sale: Sale = {
        id: 'sale-ret',
        number: 'INV-888',
        items: [
          { productId: 'p1', name: 'سكر', qty: 5, unitPrice: 100 },
          { productId: 'p2', name: 'زيت', qty: 2, unitPrice: 150 },
        ],
      } as Sale;

      const alreadyReturned = new Map<string, number>([
        ['p1', 2], // 5 - 2 = 3
        ['p2', 2], // 2 - 2 = 0 (fully returned)
      ]);

      const items = prepareFullInvoiceReturnItems(sale, alreadyReturned);
      expect(items).toHaveLength(1);
      expect(items[0].productId).toBe('p1');
      expect(items[0].qty).toBe(3);
      expect(items[0].lineTotal).toBe(300);
    });
  });
});
