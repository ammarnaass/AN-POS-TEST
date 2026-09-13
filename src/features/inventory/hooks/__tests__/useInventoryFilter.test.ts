import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Product } from '@/types';
import {
  useInventoryFilter,
  getStockStatus,
  isExpiringSoon,
} from '../useInventoryFilter';

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'منتج أ',
    barcode: '1234567890',
    sku: 'SKU-001',
    category: 'مشروبات',
    unit: 'قطعة',
    costPrice: 50,
    wholesalePrice: 70,
    retailPrice: 80,
    wholesaleMinQty: 5,
    quantity: 20,
    lowStockThreshold: 5,
    reorderPoint: 10,
    maxStock: 100,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'منتج ب',
    barcode: '9876543210',
    sku: 'SKU-002',
    category: 'مواد غذائية',
    unit: 'علبة',
    costPrice: 100,
    wholesalePrice: 120,
    retailPrice: 150,
    wholesaleMinQty: 2,
    quantity: 3,
    lowStockThreshold: 5,
    reorderPoint: 10,
    maxStock: 50,
    status: 'active',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'prod-3',
    name: 'منتج ج نافذ',
    barcode: '5555555555',
    sku: 'SKU-003',
    category: 'مشروبات',
    unit: 'قطعة',
    costPrice: 30,
    wholesalePrice: 40,
    retailPrice: 50,
    wholesaleMinQty: 10,
    quantity: 0,
    lowStockThreshold: 5,
    reorderPoint: 10,
    maxStock: 100,
    status: 'inactive',
    createdAt: '2026-01-03T00:00:00.000Z',
  },
];

describe('Inventory Filter Helpers', () => {
  it('identifies stock status correctly', () => {
    expect(getStockStatus(mockProducts[0])).toBe('in_stock');
    expect(getStockStatus(mockProducts[1])).toBe('low_stock');
    expect(getStockStatus(mockProducts[2])).toBe('out_of_stock');
  });

  it('identifies expiring products accurately', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10); // in 10 days
    const expiringProduct: Product = {
      ...mockProducts[0],
      expiryDate: futureDate.toISOString(),
    };
    expect(isExpiringSoon(expiringProduct)).toBe(true);

    const farFutureDate = new Date();
    farFutureDate.setDate(farFutureDate.getDate() + 60); // in 60 days
    const notExpiringProduct: Product = {
      ...mockProducts[0],
      expiryDate: farFutureDate.toISOString(),
    };
    expect(isExpiringSoon(notExpiringProduct)).toBe(false);

    expect(isExpiringSoon(mockProducts[0])).toBe(false);
  });
});

describe('useInventoryFilter hook', () => {
  it('computes inventory stats correctly', () => {
    const { result } = renderHook(() => useInventoryFilter(mockProducts));

    expect(result.current.stats.totalProducts).toBe(3);
    expect(result.current.stats.lowStock).toBe(1);
    expect(result.current.stats.outOfStock).toBe(1);
    // stockValue = (50*20) + (100*3) + (30*0) = 1000 + 300 = 1300
    expect(result.current.stats.stockValue).toBe(1300);
    // retailValue = (80*20) + (150*3) + (50*0) = 1600 + 450 = 2050
    expect(result.current.stats.retailValue).toBe(2050);
  });

  it('filters by search query', () => {
    const { result } = renderHook(() => useInventoryFilter(mockProducts));

    act(() => {
      result.current.setSearchQuery('منتج ب');
    });
    expect(result.current.filteredProducts.length).toBe(1);
    expect(result.current.filteredProducts[0].id).toBe('prod-2');

    act(() => {
      result.current.setSearchQuery('SKU-003');
    });
    expect(result.current.filteredProducts.length).toBe(1);
    expect(result.current.filteredProducts[0].id).toBe('prod-3');
  });

  it('filters by category', () => {
    const { result } = renderHook(() => useInventoryFilter(mockProducts));

    act(() => {
      result.current.setFilterCategory('مشروبات');
    });
    expect(result.current.filteredProducts.map((p) => p.id)).toEqual(['prod-3', 'prod-1']);
  });

  it('filters by stock status', () => {
    const { result } = renderHook(() => useInventoryFilter(mockProducts));

    act(() => {
      result.current.setFilterStockStatus('low_stock');
    });
    expect(result.current.filteredProducts.length).toBe(1);
    expect(result.current.filteredProducts[0].id).toBe('prod-2');

    act(() => {
      result.current.setFilterStockStatus('out_of_stock');
    });
    expect(result.current.filteredProducts.length).toBe(1);
    expect(result.current.filteredProducts[0].id).toBe('prod-3');
  });

  it('resets filters correctly', () => {
    const { result } = renderHook(() => useInventoryFilter(mockProducts));

    act(() => {
      result.current.setSearchQuery('test');
      result.current.setFilterCategory('مشروبات');
      result.current.setFilterStockStatus('low_stock');
    });

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.filterCategory).toBe('');
    expect(result.current.filterStockStatus).toBe('all');
    expect(result.current.filteredProducts.length).toBe(3);
  });
});
