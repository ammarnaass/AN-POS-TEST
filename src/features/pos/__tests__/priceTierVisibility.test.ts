import { describe, it, expect } from 'vitest';
import { getEnabledPriceTiers } from '@/services';
import type { POSSettings } from '../hooks/usePOSData';

describe('Price Tier Visibility & Navigation Rules', () => {
  describe('getEnabledPriceTiers', () => {
    it('returns all 4 tiers by default when settings are undefined or default', () => {
      expect(getEnabledPriceTiers()).toEqual(['1', '2', '3', '4']);
      expect(getEnabledPriceTiers(undefined)).toEqual(['1', '2', '3', '4']);
      expect(getEnabledPriceTiers({})).toEqual(['1', '2', '3', '4']);
    });

    it('hides tier 2 (س2 نصف الجملة) when enablePriceTier2 is false', () => {
      const settings: Partial<POSSettings> = {
        enablePriceTier2: false,
        enablePriceTier3: true,
        enablePriceTier4: true,
      };
      expect(getEnabledPriceTiers(settings)).toEqual(['1', '3', '4']);
    });

    it('hides tier 3 (س3 جملة) when enablePriceTier3 is false', () => {
      const settings: Partial<POSSettings> = {
        enablePriceTier2: true,
        enablePriceTier3: false,
        enablePriceTier4: true,
      };
      expect(getEnabledPriceTiers(settings)).toEqual(['1', '2', '4']);
    });

    it('hides tier 4 (س4 الفاتورة/خاص) when enablePriceTier4 is false', () => {
      const settings: Partial<POSSettings> = {
        enablePriceTier2: true,
        enablePriceTier3: true,
        enablePriceTier4: false,
      };
      expect(getEnabledPriceTiers(settings)).toEqual(['1', '2', '3']);
    });

    it('guarantees tier 1 (تجزئة) is ALWAYS present even if all optional tiers are false', () => {
      const settings: Partial<POSSettings> = {
        enablePriceTier2: false,
        enablePriceTier3: false,
        enablePriceTier4: false,
      };
      const tiers = getEnabledPriceTiers(settings);
      expect(tiers).toEqual(['1']);
      expect(tiers.includes('1')).toBe(true);
    });
  });

  describe('Cyclic Price Tier Transitioning (F4 / Quick Cycle)', () => {
    const cycleTier = (current: '1' | '2' | '3' | '4', enabled: Array<'1' | '2' | '3' | '4'>): '1' | '2' | '3' | '4' => {
      const currentIndex = enabled.indexOf(current);
      if (currentIndex === -1) {
        return enabled[0] || '1';
      }
      const nextIndex = (currentIndex + 1) % enabled.length;
      return enabled[nextIndex];
    };

    it('cycles sequentially through 1 -> 2 -> 3 -> 4 -> 1 when all enabled', () => {
      const enabled: Array<'1' | '2' | '3' | '4'> = ['1', '2', '3', '4'];
      expect(cycleTier('1', enabled)).toBe('2');
      expect(cycleTier('2', enabled)).toBe('3');
      expect(cycleTier('3', enabled)).toBe('4');
      expect(cycleTier('4', enabled)).toBe('1');
    });

    it('skips disabled tier 2 smoothly (1 -> 3 -> 4 -> 1)', () => {
      const enabled: Array<'1' | '2' | '3' | '4'> = ['1', '3', '4'];
      expect(cycleTier('1', enabled)).toBe('3');
      expect(cycleTier('3', enabled)).toBe('4');
      expect(cycleTier('4', enabled)).toBe('1');
    });

    it('skips disabled tier 3 smoothly (1 -> 2 -> 4 -> 1)', () => {
      const enabled: Array<'1' | '2' | '3' | '4'> = ['1', '2', '4'];
      expect(cycleTier('1', enabled)).toBe('2');
      expect(cycleTier('2', enabled)).toBe('4');
      expect(cycleTier('4', enabled)).toBe('1');
    });

    it('stays safely on 1 if all other tiers are disabled', () => {
      const enabled: Array<'1' | '2' | '3' | '4'> = ['1'];
      expect(cycleTier('1', enabled)).toBe('1');
    });

    it('immediately reverts to first enabled tier if current tier is disabled', () => {
      const enabled: Array<'1' | '2' | '3' | '4'> = ['1', '3'];
      // If cashier was previously on '2', but '2' was just disabled
      expect(cycleTier('2', enabled)).toBe('1');
    });
  });
});
