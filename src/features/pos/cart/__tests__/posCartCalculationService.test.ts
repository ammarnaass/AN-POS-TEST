import { describe, it, expect } from 'vitest';
import {
  calculateCartUnitsCount,
  calculateCartItemsCount,
  calculateCartSubtotal,
  calculateCartTotals,
  validateStockAvailability,
  findMatchingCartItem,
} from '../services/posCartCalculationService';
import type { CartItem } from '../types';

describe('posCartCalculationService — خدمة الحسابات والتحقق النقية لنظام السلة', () => {
  const sampleCart: CartItem[] = [
    {
      productId: 'p1',
      name: 'قهوة 250غ',
      qty: 3,
      unitPrice: 300,
      lineTotal: 900,
    },
    {
      productId: 'p2',
      name: 'سكر 1كغ',
      qty: 2,
      unitPrice: 100,
      lineTotal: 200,
    },
  ];

  describe('calculateCartUnitsCount', () => {
    it('يحسب إجمالي عدد الوحدات / القطع بدقة', () => {
      expect(calculateCartUnitsCount(sampleCart)).toBe(5);
    });

    it('يعيد 0 للسلة الفارغة أو المصفوفة غير الصالحة', () => {
      expect(calculateCartUnitsCount([])).toBe(0);
      expect(calculateCartUnitsCount(null as any)).toBe(0);
    });
  });

  describe('calculateCartItemsCount', () => {
    it('يحسب عدد بنود الأصناف المختلفة', () => {
      expect(calculateCartItemsCount(sampleCart)).toBe(2);
      expect(calculateCartItemsCount([])).toBe(0);
    });
  });

  describe('calculateCartSubtotal', () => {
    it('يحسب المجموع الفرعي الإجمالي قبل الخصم بدقة', () => {
      expect(calculateCartSubtotal(sampleCart)).toBe(1100);
    });

    it('يحسب المجموع الفرعي من unitPrice * qty إذا لم يتوفر lineTotal', () => {
      const cartWithoutLineTotal: CartItem[] = [
        { productId: 'p3', name: 'شاي', qty: 4, unitPrice: 150 } as any,
      ];
      expect(calculateCartSubtotal(cartWithoutLineTotal)).toBe(600);
    });
  });

  describe('calculateCartTotals', () => {
    it('يحسب المجاميع بدون خصم أو ضريبة بشكل صحيح', () => {
      const summary = calculateCartTotals(sampleCart, 0, 'percent', 0);
      expect(summary.itemsCount).toBe(2);
      expect(summary.unitsCount).toBe(5);
      expect(summary.subtotal).toBe(1100);
      expect(summary.discountAmount).toBe(0);
      expect(summary.tvaAmount).toBe(0);
      expect(summary.total).toBe(1100);
    });

    it('يطبق الخصم النسبي (percent) بشكل دقيق', () => {
      // 10% على 1100 = 110 دج خصم، الصافي 990 دج
      const summary = calculateCartTotals(sampleCart, 10, 'percent', 0);
      expect(summary.discountAmount).toBe(110);
      expect(summary.total).toBe(990);
    });

    it('يطبق الخصم بالمبلغ الثابت (amount) بشكل دقيق', () => {
      // خصم 200 دج على 1100 = الصافي 900 دج
      const summary = calculateCartTotals(sampleCart, 200, 'amount', 0);
      expect(summary.discountAmount).toBe(200);
      expect(summary.total).toBe(900);
    });

    it('يحسب الضريبة (TVA) بعد تطبيق الخصم', () => {
      // 1100 - 100 خصم = 1000. 19% ضريبة = 190 دج. الإجمالي 1190 دج.
      const summary = calculateCartTotals(sampleCart, 100, 'amount', 19);
      expect(summary.subtotal).toBe(1100);
      expect(summary.discountAmount).toBe(100);
      expect(summary.tvaAmount).toBe(190);
      expect(summary.total).toBe(1190);
    });
  });

  describe('validateStockAvailability', () => {
    const product = { id: 'p1', name: 'زيت 5 لتر', quantity: 10 };

    it('يسمح بالإضافة إذا كانت الكمية المتاحة كافية', () => {
      const res = validateStockAvailability(product, 3, 2, false);
      expect(res.allowed).toBe(true);
      expect(res.availableQty).toBe(10);
    });

    it('يمنع الإضافة ويصدر رسالة واضحة إذا تجاوزت الكمية المتاح في المخزن', () => {
      const res = validateStockAvailability(product, 8, 3, false);
      expect(res.allowed).toBe(false);
      expect(res.message).toContain('المخزون غير كافٍ');
      expect(res.message).toContain('المتاح من "زيت 5 لتر": 10 قطعة');
    });

    it('يسمح بالإمكان عند تفعيل خيار المخزون السالب (allowNegativeStock)', () => {
      const res = validateStockAvailability(product, 8, 10, true);
      expect(res.allowed).toBe(true);
    });
  });

  describe('findMatchingCartItem', () => {
    it('يعثر على المنتج عند تطابق المعرف', () => {
      const item = findMatchingCartItem(sampleCart, 'p1');
      expect(item?.name).toBe('قهوة 250غ');
    });

    it('يميز بين نفس المنتج إذا كان بسعر مخصص مختلف', () => {
      const cartWithCustom: CartItem[] = [
        { productId: 'p1', name: 'قهوة', qty: 1, unitPrice: 300, lineTotal: 300 },
        { productId: 'p1', name: 'قهوة (مخفضة)', qty: 1, unitPrice: 250, lineTotal: 250, isCustom: true },
      ];

      const matchOriginal = findMatchingCartItem(cartWithCustom, 'p1', 300);
      expect(matchOriginal?.unitPrice).toBe(300);

      const matchCustom = findMatchingCartItem(cartWithCustom, 'p1', 250);
      expect(matchCustom?.unitPrice).toBe(250);
    });
  });
});
