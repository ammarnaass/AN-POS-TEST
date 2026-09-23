import { describe, it, expect } from 'vitest';
import {
  enrichCartItems,
  calculateInventoryDeltas,
} from '../services/posSaleTransactionService';

describe('posSaleTransactionService — خدمة تجهيز ومعاملة البيع والمخزون', () => {
  const mockProducts = [
    { id: 'p1', name: 'حليب 1 لتر', packageSize: '12', unit: 'علبة' },
    { id: 'p2', name: 'سكر 1 كغ', packageSize: '1', unit: 'كغ' },
  ];

  const mockPacks = [
    {
      id: 'pack-milk',
      name: 'كرتونة حليب',
      piecesCount: 12,
      unitName: 'طرد',
      items: [{ productId: 'p1', qty: 12 }],
    },
  ];

  describe('enrichCartItems (إثراء عناصر السلة بالطرود والتعبئة)', () => {
    it('يثري عناصر المنتجات المنفردة بالوحدات وأحجام العبوات', () => {
      const cart = [
        {
          productId: 'p1',
          name: 'حليب 1 لتر',
          qty: 2,
          unitPrice: 120,
          lineTotal: 240,
        } as any,
      ];

      const enriched = enrichCartItems(cart, mockProducts, mockPacks, false);
      expect(enriched[0].packPiecesCount).toBe(12);
      expect(enriched[0].pricingType).toBe('retail');
    });

    it('يضبط نمط التسعير على wholesale في فواتير الجملة', () => {
      const cart = [
        {
          productId: 'p2',
          name: 'سكر 1 كغ',
          qty: 5,
          unitPrice: 90,
          lineTotal: 450,
        } as any,
      ];

      const enriched = enrichCartItems(cart, mockProducts, mockPacks, true);
      expect(enriched[0].pricingType).toBe('wholesale');
    });
  });

  describe('calculateInventoryDeltas (حساب فروقات المخزون اللحظية)', () => {
    it('يخصم الكمية بالسالب لعملية البيع العادية', () => {
      const cart = [
        {
          productId: 'p2',
          name: 'سكر 1 كغ',
          qty: 3,
          unitPrice: 100,
          lineTotal: 300,
        } as any,
      ];

      const deltas = calculateInventoryDeltas(cart, mockProducts, mockPacks, false, 'sale');
      expect(deltas.get('p2')).toBe(-3);
    });

    it('يضيف الكمية بالموجب في عملية الإرجاع (return)', () => {
      const cart = [
        {
          productId: 'p2',
          name: 'سكر 1 كغ',
          qty: 2,
          unitPrice: 100,
          lineTotal: 200,
        } as any,
      ];

      const deltas = calculateInventoryDeltas(cart, mockProducts, mockPacks, false, 'return');
      expect(deltas.get('p2')).toBe(2);
    });

    it('يفكك الطرود والعبوات المجمعة ويخصم مكوناتها الفردية بدقة', () => {
      const cart = [
        {
          productId: 'pack-milk',
          packId: 'pack-milk',
          name: 'كرتونة حليب',
          qty: 2,
          isPack: true,
          unitPrice: 1400,
          lineTotal: 2800,
        } as any,
      ];

      const deltas = calculateInventoryDeltas(cart, mockProducts, mockPacks, false, 'sale');
      // كل كرتونة تحتوي 12 علبة، بيع 2 كرتونة = خصم 24 علبة
      expect(deltas.get('p1')).toBe(-24);
    });
  });
});
