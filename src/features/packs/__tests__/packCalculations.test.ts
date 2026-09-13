import { describe, it, expect } from 'vitest';
import {
  calculatePackFinancials,
  calculatePackStockReadiness,
  formatPackMoney,
} from '../services/packCalculations';
import type { PackItemSelection } from '../types';
import type { Product } from '@/types';

describe('packCalculations service', () => {
  it('correctly calculates financials when items have defined cost and retail prices', () => {
    const items: PackItemSelection[] = [
      {
        productId: 'prod-1',
        name: 'زيت المائدة 1 لتر',
        qty: 6,
        costPrice: 150, // 6 * 150 = 900
        retailPrice: 200, // 6 * 200 = 1200
      },
      {
        productId: 'prod-2',
        name: 'سكر 1 كغ',
        qty: 4,
        costPrice: 90, // 4 * 90 = 360
        retailPrice: 110, // 4 * 110 = 440
      },
    ];

    // Total Cost = 900 + 360 = 1260
    // Total Retail = 1200 + 440 = 1640
    // Pack Price = 1500
    // Margin = ((1500 - 1260) / 1500) * 100 = (240 / 1500) * 100 = 16%
    // Savings = 1640 - 1500 = 140
    // Savings Percent = (140 / 1640) * 100 = 8.5%

    const result = calculatePackFinancials(items, '1500');

    expect(result.totalCost).toBe(1260);
    expect(result.totalRetail).toBe(1640);
    expect(result.margin).toBe(16);
    expect(result.savings).toBe(140);
    expect(result.savingsPercent).toBe(8.5);
  });

  it('correctly resolves cost and retail prices from products list if not in item selection', () => {
    const products: Product[] = [
      {
        id: 'p-1',
        name: 'حليب معقم 1 لتر',
        barcode: '1234567890123',
        costPrice: 85,
        retailPrice: 100,
        wholesalePrice: 95,
        wholesaleMinQty: 10,
        lowStockThreshold: 5,
        quantity: 50,
        unit: 'علبة',
        category: 'ألبان',
        status: 'active',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const items: PackItemSelection[] = [
      {
        productId: 'p-1',
        name: 'حليب معقم 1 لتر',
        qty: 10,
      },
    ];

    // 10 * 85 = 850 cost
    // 10 * 100 = 1000 retail
    // pack price = 950
    // margin = ((950 - 850) / 950) * 100 = 10.5%
    // savings = 1000 - 950 = 50
    // savings percent = 5%

    const result = calculatePackFinancials(items, 950, products);

    expect(result.totalCost).toBe(850);
    expect(result.totalRetail).toBe(1000);
    expect(result.margin).toBe(10.5);
    expect(result.savings).toBe(50);
    expect(result.savingsPercent).toBe(5);
  });

  it('handles empty items and zero price gracefully without division by zero', () => {
    const result = calculatePackFinancials([], 0);

    expect(result.totalCost).toBe(0);
    expect(result.totalRetail).toBe(0);
    expect(result.margin).toBe(0);
    expect(result.savings).toBe(0);
    expect(result.savingsPercent).toBe(0);
  });

  it('correctly formats money according to DZ standards', () => {
    const formatted = formatPackMoney(12500.5);
    // Locale formatting with comma and space/narrow space
    expect(formatted).toContain('12');
    expect(formatted).toContain('500');
  });

  it('correctly calculates pack stock assembly readiness and bottleneck', () => {
    const products: Product[] = [
      {
        id: 'p-1',
        name: 'علبة تونة',
        barcode: '111',
        costPrice: 100,
        retailPrice: 130,
        wholesalePrice: 120,
        wholesaleMinQty: 5,
        lowStockThreshold: 2,
        quantity: 30, // 30 in stock
        unit: 'علبة',
        category: 'معلبات',
        status: 'active',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'p-2',
        name: 'مايونيز',
        barcode: '222',
        costPrice: 150,
        retailPrice: 200,
        wholesalePrice: 180,
        wholesaleMinQty: 5,
        lowStockThreshold: 2,
        quantity: 8, // 8 in stock
        unit: 'قارورة',
        category: 'صلصات',
        status: 'active',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    // Pack requires: 3 tuna + 1 mayonnaise
    // Tuna max: floor(30 / 3) = 10 packs
    // Mayo max: floor(8 / 1) = 8 packs
    // Overall max packs = 8, bottleneck is mayonnaise
    const items = [
      { productId: 'p-1', quantity: 3 },
      { productId: 'p-2', quantity: 1 },
    ];

    const result = calculatePackStockReadiness(items, products);
    expect(result.maxPacksPossible).toBe(8);
    expect(result.bottleneckProduct?.id).toBe('p-2');
    expect(result.status).toBe('ready'); // >= 5 is ready

    // Out of stock case
    const oosProducts: Product[] = [
      { ...products[0], quantity: 0 },
      products[1],
    ];
    const oosResult = calculatePackStockReadiness(items, oosProducts);
    expect(oosResult.maxPacksPossible).toBe(0);
    expect(oosResult.bottleneckProduct?.id).toBe('p-1');
    expect(oosResult.status).toBe('out_of_stock');
  });
});
