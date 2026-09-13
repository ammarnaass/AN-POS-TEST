import { describe, it, expect } from 'vitest';
import {
  calculateChangeDue,
  calculateNextDenomination,
  calculateTotalPieces,
} from '../services/quickPOSCalculationService';

describe('quickPOSCalculationService', () => {
  describe('calculateChangeDue', () => {
    it('should return correct change when cash tendered is greater than total', () => {
      expect(calculateChangeDue(2000, 1500)).toBe(500);
      expect(calculateChangeDue(1000, 750)).toBe(250);
    });

    it('should return 0 when cash tendered is equal to total', () => {
      expect(calculateChangeDue(1500, 1500)).toBe(0);
    });

    it('should return 0 when cash tendered is less than total', () => {
      expect(calculateChangeDue(1000, 1500)).toBe(0);
    });

    it('should handle zero and negative inputs gracefully', () => {
      expect(calculateChangeDue(0, 0)).toBe(0);
      expect(calculateChangeDue(0, 500)).toBe(0);
      expect(calculateChangeDue(-100, 500)).toBe(0);
    });
  });

  describe('calculateNextDenomination', () => {
    it('should return 0 if total is 0 or negative', () => {
      expect(calculateNextDenomination(0, 500, 0)).toBe(0);
      expect(calculateNextDenomination(1000, 500, -100)).toBe(0);
    });

    it('should round up to nearest denomination when cashTendered is 0', () => {
      // If total is 1250, next 500-step denomination is 1500
      expect(calculateNextDenomination(0, 500, 1250)).toBe(1500);
      // If total is 1250, next 1000-step denomination is 2000
      expect(calculateNextDenomination(0, 1000, 1250)).toBe(2000);
      // If total is 1250, next 200-step denomination is 1400
      expect(calculateNextDenomination(0, 200, 1250)).toBe(1400);
    });

    it('should jump to next denomination if base is already an exact multiple', () => {
      // If total is 1000 and step is 500, next should be 1500
      expect(calculateNextDenomination(0, 500, 1000)).toBe(1500);
      // If cashTendered is 2000 and step is 1000, next should be 3000
      expect(calculateNextDenomination(2000, 1000, 1500)).toBe(3000);
    });
  });

  describe('calculateTotalPieces', () => {
    it('should return sum of quantities correctly', () => {
      const items = [
        { qty: 2 },
        { qty: 5 },
        { qty: 1 },
      ];
      expect(calculateTotalPieces(items)).toBe(8);
    });

    it('should return 0 for empty list', () => {
      expect(calculateTotalPieces([])).toBe(0);
    });

    it('should handle missing or invalid qty values', () => {
      const items = [
        { qty: 3 },
        {},
        { qty: undefined },
        { qty: 0 },
      ];
      expect(calculateTotalPieces(items)).toBe(3);
    });
  });
});
