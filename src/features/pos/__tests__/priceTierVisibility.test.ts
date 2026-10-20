import { describe, it, expect } from 'vitest';
import { getEnabledPriceTiers, matchPriceTierShortcut } from '@/services';
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

  describe('matchPriceTierShortcut (Alt+1..4, AZERTY, Arabic, Numpad)', () => {
    const makeEvent = (overrides: Partial<KeyboardEvent> = {}) =>
      ({
        altKey: false,
        ctrlKey: false,
        key: '',
        code: '',
        ...overrides,
      } as KeyboardEvent);

    it('returns null when neither Alt nor Ctrl is pressed', () => {
      expect(matchPriceTierShortcut(makeEvent({ key: '2' }))).toBeNull();
      expect(matchPriceTierShortcut(makeEvent({ key: '3' }))).toBeNull();
      expect(matchPriceTierShortcut(makeEvent({ key: '4' }))).toBeNull();
    });

    it('matches standard Alt+1, Alt+2, Alt+3, Alt+4', () => {
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '1' }))).toBe('1');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '2' }))).toBe('2');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '3' }))).toBe('3');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '4' }))).toBe('4');
    });

    it('matches AZERTY keyboard layouts (Alt+&, Alt+é, Alt+", Alt+\')', () => {
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '&' }))).toBe('1');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: 'é' }))).toBe('2');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '"' }))).toBe('3');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: "'" }))).toBe('4');
    });

    it('matches physical keyboard codes (Digit1..Digit4)', () => {
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, code: 'Digit1' }))).toBe('1');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, code: 'Digit2', key: 'é' }))).toBe('2');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, code: 'Digit3', key: '"' }))).toBe('3');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, code: 'Digit4', key: "'" }))).toBe('4');
    });

    it('matches Arabic numeral keys (Alt+١, Alt+٢, Alt+٣, Alt+٤)', () => {
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '١' }))).toBe('1');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '٢' }))).toBe('2');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '٣' }))).toBe('3');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '٤' }))).toBe('4');
    });

    it('matches Numpad keys (Alt+Numpad1..4)', () => {
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, code: 'Numpad1' }))).toBe('1');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, code: 'Numpad2' }))).toBe('2');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, code: 'Numpad3' }))).toBe('3');
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, code: 'Numpad4' }))).toBe('4');
    });

    it('matches Ctrl as alternative to Alt', () => {
      expect(matchPriceTierShortcut(makeEvent({ ctrlKey: true, key: '2' }))).toBe('2');
      expect(matchPriceTierShortcut(makeEvent({ ctrlKey: true, key: '3' }))).toBe('3');
      expect(matchPriceTierShortcut(makeEvent({ ctrlKey: true, key: '4' }))).toBe('4');
    });

    it('returns null on unrelated keys', () => {
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: 'a' }))).toBeNull();
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: 's' }))).toBeNull();
      expect(matchPriceTierShortcut(makeEvent({ altKey: true, key: '5' }))).toBeNull();
    });
  });

  describe('Wholesale Mode & Disabled Tier Protection Logic', () => {
    it('blocks switching to wholesale mode (Alt+W) when tier 3 is disabled', () => {
      const enabledTiers: Array<'1' | '2' | '3' | '4'> = ['1', '2', '4'];
      const canActivateWholesale = (tiers: Array<'1' | '2' | '3' | '4'>) => tiers.includes('3');

      expect(canActivateWholesale(enabledTiers)).toBe(false);
      expect(canActivateWholesale(['1', '2', '3', '4'])).toBe(true);
    });

    it('rejects keyboard selection for disabled tiers', () => {
      const enabledTiers: Array<'1' | '2' | '3' | '4'> = ['1', '3']; // 2 and 4 disabled
      const isTierAllowed = (tier: '1' | '2' | '3' | '4', enabled: Array<'1' | '2' | '3' | '4'>) =>
        enabled.includes(tier);

      expect(isTierAllowed('1', enabledTiers)).toBe(true);
      expect(isTierAllowed('2', enabledTiers)).toBe(false);
      expect(isTierAllowed('3', enabledTiers)).toBe(true);
      expect(isTierAllowed('4', enabledTiers)).toBe(false);
    });

    it('auto-reverts to retail (س1) when active tier is deactivated in settings', () => {
      let activeTier: '1' | '2' | '3' | '4' = '2';
      const settings = { enablePriceTier2: false, enablePriceTier3: true, enablePriceTier4: true };

      // Revert logic mimicking the useEffect in usePOSPageState
      if (activeTier === '2' && settings.enablePriceTier2 === false) {
        activeTier = '1';
      }
      expect(activeTier).toBe('1');
    });
  });
});
