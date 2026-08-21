import { describe, expect, it } from 'vitest';
import { calculateDepositsTotal } from './sessionBalance';

describe('calculateDepositsTotal', () => {
  it('returns zero when a legacy cash session has a non-array deposits value', () => {
    expect(calculateDepositsTotal({ amount: 250 } as never)).toBe(0);
  });

  it('adds the amounts in valid deposits', () => {
    expect(calculateDepositsTotal([{ amount: 100 }, { amount: 25.5 }] as never)).toBe(125.5);
  });
});
