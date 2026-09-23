import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Sale } from '@/types';
import { useReturnItemSelection } from '../hooks/useReturnItemSelection';

const mockSale: Sale = {
  id: 'sale-1',
  number: '2026-001',
  date: '2026-09-22',
  docType: 'facture',
  type: 'sale',
  subtotal: 700,
  discount: 0,
  discountType: 'amount',
  tvaAmount: 0,
  total: 700,
  paymentMethod: 'cash',
  items: [
    { productId: 'p1', name: 'سكر 1 كغ', qty: 4, unitPrice: 100, lineTotal: 400 },
    { productId: 'p2', name: 'زيت 1 لتر', qty: 2, unitPrice: 150, lineTotal: 300 },
  ],
} as Sale;

describe('useReturnItemSelection (خطاف اختيار وتعديل بنود المرتجع)', () => {
  it('initializes returnable items with full real remaining quantities', () => {
    const alreadyReturnedMap = new Map<string, number>([['p1', 1]]); // 4 - 1 = 3 returnable

    const { result } = renderHook(() =>
      useReturnItemSelection({
        sale: mockSale,
        isOpen: true,
        alreadyReturnedMap,
      })
    );

    expect(result.current.items).toHaveLength(2);
    // p1: 4 - 1 = 3 متبقية وتحدد كاملة افتراضياً
    expect(result.current.items[0].maxReturnableQty).toBe(3);
    expect(result.current.items[0].selectedQty).toBe(3);
    expect(result.current.items[0].isSelected).toBe(true);

    // p2: 2 مباعة وتحدد كاملة (2)
    expect(result.current.items[1].maxReturnableQty).toBe(2);
    expect(result.current.items[1].selectedQty).toBe(2);
    expect(result.current.items[1].isSelected).toBe(true);

    // Total: 3 * 100 + 2 * 150 = 600 دج
    expect(result.current.summary.totalAmount).toBe(600);
    expect(result.current.summary.totalPieces).toBe(5);
    expect(result.current.summary.selectedItemsCount).toBe(2);
  });

  it('switches between full real quantities and one piece via helper functions', () => {
    const alreadyReturnedMap = new Map<string, number>();

    const { result } = renderHook(() =>
      useReturnItemSelection({
        sale: mockSale,
        isOpen: true,
        alreadyReturnedMap,
      })
    );

    // افتراضياً: كامل الأعداد (p1: 4, p2: 2)
    expect(result.current.items[0].selectedQty).toBe(4);
    expect(result.current.items[1].selectedQty).toBe(2);

    // التحويل إلى قطعة واحدة لكل صنف
    act(() => {
      result.current.setAllToOneQty();
    });
    expect(result.current.items[0].selectedQty).toBe(1);
    expect(result.current.items[1].selectedQty).toBe(1);
    expect(result.current.summary.totalPieces).toBe(2);

    // إعادة التعيين لكامل الكميات الحقيقية
    act(() => {
      result.current.setAllToFullQty();
    });
    expect(result.current.items[0].selectedQty).toBe(4);
    expect(result.current.items[1].selectedQty).toBe(2);
    expect(result.current.summary.totalPieces).toBe(6);
  });

  it('toggles selection of single item and updates summary', () => {
    const alreadyReturnedMap = new Map<string, number>();

    const { result } = renderHook(() =>
      useReturnItemSelection({
        sale: mockSale,
        isOpen: true,
        alreadyReturnedMap,
      })
    );

    // Deselect p1
    act(() => {
      result.current.toggleItem('p1');
    });

    expect(result.current.items[0].isSelected).toBe(false);
    expect(result.current.selectedItems).toHaveLength(1);
    expect(result.current.summary.totalAmount).toBe(300); // Only p2: 2 * 150
    expect(result.current.summary.totalPieces).toBe(2);
  });

  it('toggles all items on and off', () => {
    const alreadyReturnedMap = new Map<string, number>();

    const { result } = renderHook(() =>
      useReturnItemSelection({
        sale: mockSale,
        isOpen: true,
        alreadyReturnedMap,
      })
    );

    // Deselect all
    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selectedItems).toHaveLength(0);
    expect(result.current.summary.totalAmount).toBe(0);

    // Select all back
    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selectedItems).toHaveLength(2);
  });

  it('updates quantity and clamps to maximum returnable', () => {
    const alreadyReturnedMap = new Map<string, number>([['p2', 1]]); // p2 max is 1

    const { result } = renderHook(() =>
      useReturnItemSelection({
        sale: mockSale,
        isOpen: true,
        alreadyReturnedMap,
      })
    );

    // Change p1 qty to 2
    act(() => {
      result.current.updateQty('p1', 2);
    });
    expect(result.current.items[0].selectedQty).toBe(2);

    // Attempt to increase p2 qty to 5 (max is 1)
    act(() => {
      result.current.updateQty('p2', 5);
    });
    expect(result.current.items[1].selectedQty).toBe(1);

    // Total: 2 * 100 + 1 * 150 = 350
    expect(result.current.summary.totalAmount).toBe(350);
    expect(result.current.summary.totalPieces).toBe(3);
  });

  it('prepares cart items properly', () => {
    const alreadyReturnedMap = new Map<string, number>();

    const { result } = renderHook(() =>
      useReturnItemSelection({
        sale: mockSale,
        isOpen: true,
        alreadyReturnedMap,
      })
    );

    act(() => {
      result.current.updateQty('p1', 3);
    });

    const cartItems = result.current.prepareCartItems();
    expect(cartItems).toHaveLength(2);
    expect(cartItems[0].productId).toBe('p1');
    expect(cartItems[0].qty).toBe(3);
    expect(cartItems[0].lineTotal).toBe(300);
  });
});
