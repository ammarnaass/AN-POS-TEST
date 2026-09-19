import { describe, it, expect } from 'vitest';
import {
  getProductTierPrice,
  applyWholesalePrice,
  applyPromotionPrice,
  resolveUnitPrice,
  calculateSaleTotal,
} from '../index';
import type { Product, CartItem } from '@/types';

const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  name: 'Test Product',
  sku: 'SKU123',
  barcode: '123456789',
  category: 'General',
  unit: 'piece',
  costPrice: 50,
  retailPrice: 100,
  wholesalePrice: 80,
  wholesaleMinQty: 5,
  minStock: 2,
  currentStock: 50,
  salePrice1: 100,
  salePrice2: 90,
  salePrice3: 80,
  salePrice4: 70,
  invoicePrice: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Pricing Calculations & Tier Pricing', () => {
  describe('getProductTierPrice', () => {
    it('returns 0 if product is null or undefined', () => {
      expect(getProductTierPrice(null as any)).toBe(0);
      expect(getProductTierPrice(undefined as any)).toBe(0);
    });

    it('returns tier 1 price by default', () => {
      const product = createMockProduct({ salePrice1: 120, retailPrice: 100 });
      expect(getProductTierPrice(product)).toBe(120);
    });

    it('returns correct price for each explicit tier (1, 2, 3, 4)', () => {
      const product = createMockProduct({
        salePrice1: 100,
        salePrice2: 90,
        salePrice3: 80,
        salePrice4: 70,
      });

      expect(getProductTierPrice(product, '1')).toBe(100);
      expect(getProductTierPrice(product, '2')).toBe(90);
      expect(getProductTierPrice(product, '3')).toBe(80);
      expect(getProductTierPrice(product, '4')).toBe(70);
    });

    it('supports snake_case database property variants', () => {
      const snakeProduct = {
        sale_price1: 110,
        sale_price2: 95,
        sale_price3: 85,
        sale_price4: 65,
      };

      expect(getProductTierPrice(snakeProduct as any, '1')).toBe(110);
      expect(getProductTierPrice(snakeProduct as any, '2')).toBe(95);
      expect(getProductTierPrice(snakeProduct as any, '3')).toBe(85);
      expect(getProductTierPrice(snakeProduct as any, '4')).toBe(65);
    });

    it('falls back to tier 1 when tier 2 is missing or zero', () => {
      const product = createMockProduct({
        salePrice1: 150,
        salePrice2: 0,
      });
      expect(getProductTierPrice(product, '2')).toBe(150);
    });

    it('falls back to tier 1 when tier 3 is missing or zero', () => {
      const product = createMockProduct({
        salePrice1: 150,
        salePrice3: 0,
        wholesalePrice: 0,
      });
      expect(getProductTierPrice(product, '3')).toBe(150);
    });

    it('falls back to tier 3 then tier 1 when tier 4 is missing or zero', () => {
      const productWithT3 = createMockProduct({
        salePrice1: 150,
        salePrice3: 130,
        salePrice4: 0,
        invoicePrice: 0,
      });
      expect(getProductTierPrice(productWithT3, '4')).toBe(130);

      const productNoT3 = createMockProduct({
        salePrice1: 150,
        salePrice3: 0,
        wholesalePrice: 0,
        salePrice4: 0,
        invoicePrice: 0,
      });
      expect(getProductTierPrice(productNoT3, '4')).toBe(150);
    });
  });

  describe('applyWholesalePrice', () => {
    it('returns wholesale price when qty >= wholesaleMinQty', () => {
      const product = createMockProduct({
        retailPrice: 100,
        wholesalePrice: 80,
        wholesaleMinQty: 10,
      });

      expect(applyWholesalePrice(product, 10)).toBe(80);
      expect(applyWholesalePrice(product, 15)).toBe(80);
    });

    it('returns retail price when qty < wholesaleMinQty', () => {
      const product = createMockProduct({
        retailPrice: 100,
        wholesalePrice: 80,
        wholesaleMinQty: 10,
      });

      expect(applyWholesalePrice(product, 9)).toBe(100);
      expect(applyWholesalePrice(product, 1)).toBe(100);
    });

    it('returns retail price if wholesalePrice is zero even if min qty met', () => {
      const product = createMockProduct({
        retailPrice: 100,
        wholesalePrice: 0,
        salePrice3: 0,
        wholesaleMinQty: 5,
      });

      expect(applyWholesalePrice(product, 10)).toBe(100);
    });
  });

  describe('applyPromotionPrice', () => {
    const today = new Date().toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const pastDate = new Date(Date.now() - 86400000).toISOString();

    it('applies active percentage promotion', () => {
      const product = createMockProduct({ retailPrice: 200 });
      const promos = [
        {
          productId: product.id,
          active: true,
          discountType: 'percent' as const,
          discountValue: 15,
          startDate: pastDate,
          endDate: futureDate,
        },
      ];

      const price = applyPromotionPrice(product, promos, today);
      expect(price).toBe(170); // 200 * (1 - 0.15) = 170
    });

    it('applies active fixed amount promotion', () => {
      const product = createMockProduct({ retailPrice: 200 });
      const promos = [
        {
          productId: product.id,
          active: true,
          discountType: 'amount' as const,
          discountValue: 30,
          startDate: pastDate,
          endDate: futureDate,
        },
      ];

      const price = applyPromotionPrice(product, promos, today);
      expect(price).toBe(170); // 200 - 30 = 170
    });

    it('returns null if promotion is expired or in the future', () => {
      const product = createMockProduct({ retailPrice: 200 });
      const expiredPromos = [
        {
          productId: product.id,
          active: true,
          discountType: 'percent' as const,
          discountValue: 10,
          startDate: new Date(Date.now() - 200000).toISOString(),
          endDate: new Date(Date.now() - 100000).toISOString(),
        },
      ];

      expect(applyPromotionPrice(product, expiredPromos, today)).toBeNull();

      const futurePromos = [
        {
          productId: product.id,
          active: true,
          discountType: 'percent' as const,
          discountValue: 10,
          startDate: new Date(Date.now() + 100000).toISOString(),
          endDate: new Date(Date.now() + 200000).toISOString(),
        },
      ];

      expect(applyPromotionPrice(product, futurePromos, today)).toBeNull();
    });

    it('returns null if promotion is inactive', () => {
      const product = createMockProduct({ retailPrice: 200 });
      const inactivePromos = [
        {
          productId: product.id,
          active: false,
          discountType: 'percent' as const,
          discountValue: 20,
          startDate: pastDate,
          endDate: futureDate,
        },
      ];

      expect(applyPromotionPrice(product, inactivePromos, today)).toBeNull();
    });

    it('picks the lowest price when multiple promotions match', () => {
      const product = createMockProduct({ retailPrice: 100 });
      const promos = [
        {
          productId: product.id,
          active: true,
          discountType: 'percent' as const,
          discountValue: 10, // 90
          startDate: pastDate,
          endDate: futureDate,
        },
        {
          productId: product.id,
          active: true,
          discountType: 'percent' as const,
          discountValue: 25, // 75 (better discount)
          startDate: pastDate,
          endDate: futureDate,
        },
      ];

      expect(applyPromotionPrice(product, promos, today)).toBe(75);
    });

    it('matches promotion when product.id is in productIds array', () => {
      const product = createMockProduct({ id: 'p-multi', retailPrice: 100 });
      const promos = [
        {
          productIds: ['other-p', 'p-multi'],
          active: true,
          discountType: 'amount' as const,
          discountValue: 20,
          startDate: pastDate,
          endDate: futureDate,
        },
      ];

      expect(applyPromotionPrice(product, promos, today)).toBe(80);
    });
  });

  describe('resolveUnitPrice', () => {
    const today = new Date().toISOString();
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    it('returns tier price for tier 2, 3, 4 ignoring promotions', () => {
      const product = createMockProduct({
        retailPrice: 100,
        salePrice1: 100,
        salePrice2: 90,
        salePrice3: 80,
        salePrice4: 70,
      });

      const promos = [
        {
          productId: product.id,
          active: true,
          discountType: 'percent' as const,
          discountValue: 50,
          startDate: pastDate,
          endDate: futureDate,
        },
      ];

      expect(resolveUnitPrice(product, 1, promos, false, '2')).toBe(90);
      expect(resolveUnitPrice(product, 1, promos, false, '3')).toBe(80);
      expect(resolveUnitPrice(product, 1, promos, false, '4')).toBe(70);
    });

    it('applies promotion for tier 1 if available', () => {
      const product = createMockProduct({ retailPrice: 100, salePrice1: 100 });
      const promos = [
        {
          productId: product.id,
          active: true,
          discountType: 'percent' as const,
          discountValue: 20,
          startDate: pastDate,
          endDate: futureDate,
        },
      ];

      expect(resolveUnitPrice(product, 1, promos, false, '1')).toBe(80);
    });

    it('returns tier 1 price if tier 1 requested and no promotion matches', () => {
      const product = createMockProduct({ retailPrice: 100, salePrice1: 100 });
      expect(resolveUnitPrice(product, 1, [], false, '1')).toBe(100);
    });

    it('uses wholesale price if forceWholesale is true and wholesalePrice > 0', () => {
      const product = createMockProduct({
        retailPrice: 100,
        wholesalePrice: 85,
        salePrice3: 85,
      });

      expect(resolveUnitPrice(product, 1, [], true)).toBe(85);
    });

    it('applies wholesale pricing based on quantity when no tier is selected', () => {
      const product = createMockProduct({
        retailPrice: 100,
        wholesalePrice: 75,
        wholesaleMinQty: 6,
      });

      expect(resolveUnitPrice(product, 2, [])).toBe(100);
      expect(resolveUnitPrice(product, 6, [])).toBe(75);
    });
  });

  describe('calculateSaleTotal', () => {
    const items: CartItem[] = [
      {
        productId: 'p1',
        name: 'Item 1',
        qty: 2,
        unitPrice: 100,
        lineTotal: 200,
        costPrice: 70,
      },
      {
        productId: 'p2',
        name: 'Item 2',
        qty: 1,
        unitPrice: 50,
        lineTotal: 50,
        costPrice: 30,
      },
    ];

    it('calculates subtotal and total without discount and TVA', () => {
      const res = calculateSaleTotal(items, 0, 'amount', 0);
      expect(res.subtotal).toBe(250);
      expect(res.discountAmount).toBe(0);
      expect(res.tvaAmount).toBe(0);
      expect(res.total).toBe(250);
    });

    it('applies amount discount accurately', () => {
      const res = calculateSaleTotal(items, 30, 'amount', 0);
      expect(res.subtotal).toBe(250);
      expect(res.discountAmount).toBe(30);
      expect(res.total).toBe(220);
    });

    it('applies percent discount accurately', () => {
      const res = calculateSaleTotal(items, 10, 'percent', 0); // 10% of 250 = 25
      expect(res.subtotal).toBe(250);
      expect(res.discountAmount).toBe(25);
      expect(res.total).toBe(225);
    });

    it('calculates TVA on amount after discount', () => {
      // Subtotal: 250, Discount: 50 => After discount: 200, TVA 19% = 38 => Total = 238
      const res = calculateSaleTotal(items, 50, 'amount', 19);
      expect(res.subtotal).toBe(250);
      expect(res.discountAmount).toBe(50);
      expect(res.tvaAmount).toBe(38);
      expect(res.total).toBe(238);
    });

    it('clamps discount and total so they cannot become negative', () => {
      const res = calculateSaleTotal(items, 500, 'amount', 19);
      expect(res.subtotal).toBe(250);
      expect(res.discountAmount).toBe(250);
      expect(res.tvaAmount).toBe(0);
      expect(res.total).toBe(0);
    });

    it('handles empty items array gracefully', () => {
      const res = calculateSaleTotal([], 10, 'percent', 19);
      expect(res.subtotal).toBe(0);
      expect(res.discountAmount).toBe(0);
      expect(res.tvaAmount).toBe(0);
      expect(res.total).toBe(0);
    });

    it('handles JSON stringified items gracefully', () => {
      const jsonItems = JSON.stringify(items);
      const res = calculateSaleTotal(jsonItems as any, 0, 'amount', 0);
      expect(res.subtotal).toBe(250);
      expect(res.total).toBe(250);
    });
  });
});
