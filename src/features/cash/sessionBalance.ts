type Deposit = { amount?: unknown };

/**
 * Safely totals cash deposits, including legacy records that stored a non-array
 * value in the deposits field before the current Dexie schema was enforced.
 */
export function calculateDepositsTotal(deposits: unknown): number {
  if (!Array.isArray(deposits)) return 0;

  return deposits.reduce<number>((total, deposit) => {
    const amount = Number((deposit as Deposit)?.amount);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}
