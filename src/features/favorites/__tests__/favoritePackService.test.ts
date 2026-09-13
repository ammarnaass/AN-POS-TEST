import { describe, it, expect } from 'vitest';
import {
  calculateQuickPackPrice,
  generateQuickPackName,
  buildQuickPackEntity,
  buildUpdatedPackEntity,
} from '../services/favoritePackService';
import type { PackEntity } from '@/infrastructure/database/dexie/db';

describe('favoritePackService', () => {
  describe('calculateQuickPackPrice', () => {
    it('calculates total price correctly for regular pieces count', () => {
      expect(calculateQuickPackPrice(100, 6)).toBe(600);
      expect(calculateQuickPackPrice(125.5, 4)).toBe(502);
    });

    it('handles minimum piece count of 1 for 0 or negative numbers', () => {
      expect(calculateQuickPackPrice(150, 0)).toBe(150);
      expect(calculateQuickPackPrice(150, -5)).toBe(150);
    });

    it('handles zero base price correctly', () => {
      expect(calculateQuickPackPrice(0, 10)).toBe(0);
    });
  });

  describe('generateQuickPackName', () => {
    it('generates Arabic formatted name with correct unit, product name, and pieces', () => {
      const name = generateQuickPackName('كرتونة', 'حليب كانديا 1 لتر', 6);
      expect(name).toBe('كرتونة حليب كانديا 1 لتر (6 قطع)');
    });

    it('uses singular "قطعة" for single piece', () => {
      const name = generateQuickPackName('علبة', 'شوكولاتة', 1);
      expect(name).toBe('علبة شوكولاتة (1 قطعة)');
    });

    it('falls back to default unit name if empty string is provided', () => {
      const name = generateQuickPackName('', 'عصير برتقال', 12);
      expect(name).toBe('كرتونة عصير برتقال (12 قطعة)');
    });
  });

  describe('buildQuickPackEntity', () => {
    it('builds a complete PackEntity with correct mapping and single item', () => {
      const entity = buildQuickPackEntity({
        id: 'pack-123',
        name: 'كرتونة مياه معدنية (6 قطع)',
        barcode: '123456789',
        packPrice: 180,
        unitName: 'كرتونة',
        piecesCount: 6,
        productId: 'prod-456',
        productName: 'مياه معدنية 1.5 لتر',
        packType: 'wholesale',
        minWholesaleQty: 5,
      });

      expect(entity.id).toBe('pack-123');
      expect(entity.name).toBe('كرتونة مياه معدنية (6 قطع)');
      expect(entity.barcode).toBe('123456789');
      expect(entity.packPrice).toBe(180);
      expect(entity.pack_price).toBe(180);
      expect(entity.packType).toBe('wholesale');
      expect(entity.minWholesaleQty).toBe(5);
      expect(entity.unitName).toBe('كرتونة');
      expect(entity.piecesCount).toBe(6);
      expect(entity.items).toHaveLength(1);
      expect(entity.items[0]).toEqual({
        productId: 'prod-456',
        name: 'مياه معدنية 1.5 لتر',
        qty: 6,
      });
      expect(entity.createdAt).toBeDefined();
      expect(entity.updatedAt).toBeDefined();
    });

    it('defaults unitName to "كرتونة" and barcode to empty string if missing', () => {
      const entity = buildQuickPackEntity({
        id: 'pack-789',
        name: 'طرد عصير',
        packPrice: 500,
        piecesCount: 10,
        productId: 'prod-999',
        productName: 'عصير تفاح',
      });

      expect(entity.unitName).toBe('كرتونة');
      expect(entity.barcode).toBe('');
      expect(entity.packType).toBe('bundle');
      expect(entity.minWholesaleQty).toBe(1);
    });
  });

  describe('buildUpdatedPackEntity', () => {
    it('accurately updates all fields and re-links to a new product', () => {
      const existingPack: PackEntity = {
        id: 'pack-100',
        name: 'طرد قديم',
        barcode: '111111',
        packPrice: 300,
        pack_price: 300,
        packType: 'bundle',
        unitName: 'طرد',
        piecesCount: 4,
        minWholesaleQty: 1,
        items: [{ productId: 'old-prod-1', qty: 4, name: 'منتج قديم' }],
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      const updated = buildUpdatedPackEntity(existingPack, {
        id: 'pack-100',
        name: 'كرتونة مياه معدنية (12 قطعة)',
        barcode: '222222',
        packPrice: 360,
        unitName: 'كرتونة',
        piecesCount: 12,
        productId: 'new-prod-2',
        productName: 'مياه معدنية جديدة',
        packType: 'half_wholesale',
        minWholesaleQty: 3,
      });

      expect(updated.id).toBe('pack-100');
      expect(updated.name).toBe('كرتونة مياه معدنية (12 قطعة)');
      expect(updated.barcode).toBe('222222');
      expect(updated.packPrice).toBe(360);
      expect(updated.pack_price).toBe(360);
      expect(updated.packType).toBe('half_wholesale');
      expect(updated.minWholesaleQty).toBe(3);
      expect(updated.piecesCount).toBe(12);
      expect(updated.unitName).toBe('كرتونة');
      expect(updated.items).toHaveLength(1);
      expect(updated.items[0]).toEqual({
        productId: 'new-prod-2',
        name: 'مياه معدنية جديدة',
        qty: 12,
      });
      expect(updated.createdAt).toBe('2026-01-01T00:00:00Z');
      expect(updated.updatedAt).not.toBe('2026-01-01T00:00:00Z');
    });
  });
});
