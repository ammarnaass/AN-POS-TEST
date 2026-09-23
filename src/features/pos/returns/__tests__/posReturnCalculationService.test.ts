import { describe, it, expect } from 'vitest';
import type { Sale } from '@/types';
import {
  buildAlreadyReturnedMap,
  computeReturnableItems,
  clampReturnQty,
  calculateReturnSummary,
  prepareCartItemsFromReturn,
  filterSalesForReturn,
  resolveEffectiveReason,
} from '../services/posReturnCalculationService';
import type { ReturnItemSelection } from '../types';

describe('posReturnCalculationService (خدمات حسابات المرتجعات النقية)', () => {
  describe('buildAlreadyReturnedMap', () => {
    it('returns empty map if no previous returns or empty array provided', () => {
      expect(buildAlreadyReturnedMap([]).size).toBe(0);
      expect(buildAlreadyReturnedMap(undefined as any).size).toBe(0);
    });

    it('sums returned quantities for each product across multiple prior return sales', () => {
      const priorSales: Sale[] = [
        {
          id: 'ret-1',
          number: 'RET-01',
          date: '2026-09-20',
          docType: 'facture',
          type: 'return',
          subtotal: 500,
          discount: 0,
          discountType: 'amount',
          tvaAmount: 0,
          total: 500,
          paymentMethod: 'cash',
          items: [
            { productId: 'prod-1', name: 'عصير', qty: 2, unitPrice: 100, lineTotal: 200 },
            { productId: 'prod-2', name: 'حليب', qty: 3, unitPrice: 100, lineTotal: 300 },
          ],
        } as Sale,
        {
          id: 'ret-2',
          number: 'RET-02',
          date: '2026-09-21',
          docType: 'facture',
          type: 'return',
          subtotal: 300,
          discount: 0,
          discountType: 'amount',
          tvaAmount: 0,
          total: 300,
          paymentMethod: 'cash',
          items: [
            { productId: 'prod-1', name: 'عصير', qty: 1, unitPrice: 100, lineTotal: 100 },
          ],
        } as Sale,
      ];

      const map = buildAlreadyReturnedMap(priorSales);
      expect(map.get('prod-1')).toBe(3); // 2 + 1
      expect(map.get('prod-2')).toBe(3);
      expect(map.get('unknown')).toBeUndefined();
    });
  });

  describe('computeReturnableItems', () => {
    it('handles null or empty sale safely', () => {
      expect(computeReturnableItems(null, new Map())).toEqual([]);
      expect(computeReturnableItems({} as Sale, new Map())).toEqual([]);
    });

    it('calculates maxReturnableQty and defaults selection correctly', () => {
      const mockSale: Sale = {
        id: 'sale-1',
        number: 'INV-100',
        date: '2026-09-22',
        docType: 'facture',
        type: 'sale',
        subtotal: 1000,
        discount: 0,
        discountType: 'amount',
        tvaAmount: 0,
        total: 1000,
        paymentMethod: 'cash',
        items: [
          { productId: 'p1', name: 'شوكولاتة', qty: 5, unitPrice: 100, lineTotal: 500 },
          { productId: 'p2', name: 'بسكويت', qty: 2, unitPrice: 250, lineTotal: 500 },
        ],
      } as Sale;

      const alreadyMap = new Map<string, number>([
        ['p1', 2], // 5 - 2 = 3 max returnable
        ['p2', 2], // 2 - 2 = 0 max returnable (fully returned)
      ]);

      const items = computeReturnableItems(mockSale, alreadyMap);
      expect(items).toHaveLength(2);

      // p1
      expect(items[0].productId).toBe('p1');
      expect(items[0].originalQty).toBe(5);
      expect(items[0].alreadyReturnedQty).toBe(2);
      expect(items[0].maxReturnableQty).toBe(3);
      // الآن يتم تعيين الكمية تلقائياً للعدد الحقيقي المتبقي (3 قطع) بدلاً من قطعة واحدة
      expect(items[0].selectedQty).toBe(3);
      expect(items[0].isSelected).toBe(true);

      // اختبار خيار عدم التعيين للكمية الكاملة
      const partialDefaultItems = computeReturnableItems(mockSale, alreadyMap, false);
      expect(partialDefaultItems[0].selectedQty).toBe(1);

      // p2 (fully returned)
      expect(items[1].productId).toBe('p2');
      expect(items[1].maxReturnableQty).toBe(0);
      expect(items[1].selectedQty).toBe(0);
      expect(items[1].isSelected).toBe(false);
    });
  });

  describe('clampReturnQty', () => {
    it('returns 0 when maxReturnableQty is 0 or less', () => {
      expect(clampReturnQty(5, 0)).toBe(0);
      expect(clampReturnQty(5, -1)).toBe(0);
    });

    it('clamps to 1 when value is less than 1 or invalid', () => {
      expect(clampReturnQty(0, 5)).toBe(1);
      expect(clampReturnQty(-3, 5)).toBe(1);
      expect(clampReturnQty(NaN, 5)).toBe(1);
    });

    it('clamps to maxReturnableQty when exceeding maximum', () => {
      expect(clampReturnQty(10, 4)).toBe(4);
    });

    it('returns valid integer within range', () => {
      expect(clampReturnQty(3.7, 5)).toBe(3);
    });
  });

  describe('calculateReturnSummary', () => {
    it('calculates total amount, total pieces and count correctly', () => {
      const items: ReturnItemSelection[] = [
        {
          productId: 'p1',
          name: 'صنف 1',
          unitPrice: 200,
          originalQty: 5,
          alreadyReturnedQty: 0,
          maxReturnableQty: 5,
          selectedQty: 3,
          isSelected: true,
        },
        {
          productId: 'p2',
          name: 'صنف 2',
          unitPrice: 150,
          originalQty: 2,
          alreadyReturnedQty: 0,
          maxReturnableQty: 2,
          selectedQty: 2,
          isSelected: false, // unselected
        },
        {
          productId: 'p3',
          name: 'صنف 3',
          unitPrice: 50,
          originalQty: 10,
          alreadyReturnedQty: 0,
          maxReturnableQty: 10,
          selectedQty: 4,
          isSelected: true,
        },
      ];

      const summary = calculateReturnSummary(items);
      // p1: 3 * 200 = 600
      // p3: 4 * 50 = 200
      // total amount = 800
      // total pieces = 3 + 4 = 7
      // selected count = 2
      expect(summary.totalAmount).toBe(800);
      expect(summary.totalPieces).toBe(7);
      expect(summary.selectedItemsCount).toBe(2);
    });
  });

  describe('prepareCartItemsFromReturn', () => {
    it('converts only selected items to valid CartItem array', () => {
      const items: ReturnItemSelection[] = [
        {
          productId: 'p1',
          name: 'منتج أ',
          unitPrice: 120,
          originalQty: 3,
          alreadyReturnedQty: 0,
          maxReturnableQty: 3,
          selectedQty: 2,
          isSelected: true,
          unit: 'علبة',
          barcode: '123456',
        },
        {
          productId: 'p2',
          name: 'منتج ب',
          unitPrice: 300,
          originalQty: 1,
          alreadyReturnedQty: 0,
          maxReturnableQty: 1,
          selectedQty: 1,
          isSelected: false,
        },
      ];

      const cartItems = prepareCartItemsFromReturn(items);
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0]).toEqual({
        productId: 'p1',
        name: 'منتج أ',
        qty: 2,
        unitPrice: 120,
        lineTotal: 240,
        unit: 'علبة',
        barcode: '123456',
        isPack: undefined,
        packId: undefined,
        packQty: undefined,
        packUnit: undefined,
      });
    });
  });

  describe('filterSalesForReturn', () => {
    const sales: Sale[] = [
      { id: '1', number: 'INV-001', customerName: 'محمد أحمد', soldBy: 'كاشير 1' } as Sale,
      { id: '2', number: 'INV-002', customerName: 'سعيد علي', soldBy: 'كاشير 2' } as Sale,
      { id: '3', number: 'INV-003', customerName: 'كمال بن عيسى', soldBy: 'المدير' } as Sale,
    ];

    it('returns all sales when query is empty', () => {
      expect(filterSalesForReturn(sales, '')).toHaveLength(3);
    });

    it('filters by number', () => {
      expect(filterSalesForReturn(sales, '002')).toEqual([sales[1]]);
    });

    it('filters by customerName', () => {
      expect(filterSalesForReturn(sales, 'سعيد')).toEqual([sales[1]]);
    });

    it('filters by soldBy', () => {
      expect(filterSalesForReturn(sales, 'المدير')).toEqual([sales[2]]);
    });
  });

  describe('resolveEffectiveReason', () => {
    it('returns standard reason directly', () => {
      expect(resolveEffectiveReason('عيب مصنعي أو كسر', '')).toBe('عيب مصنعي أو كسر');
    });

    it('returns custom reason when "أخرى" is selected with non-empty text', () => {
      expect(resolveEffectiveReason('أخرى', 'الزبون غير رايه في المقاس')).toBe('الزبون غير رايه في المقاس');
    });

    it('falls back to "أخرى" when custom reason is empty', () => {
      expect(resolveEffectiveReason('أخرى', '   ')).toBe('أخرى');
    });
  });
});
