import { isLicensed } from '@/services/licenseService';

const TRIAL_KEY = 'anpos_trial_started';
const TRIAL_SALES_KEY = 'anpos_trial_sales';
export const TRIAL_DAYS = 7;
const TRIAL_MAX_SALES = 1000;

export interface TrialState {
  startedAt: string | null;
  remainingDays: number;
  isExpired: boolean;
  isActive: boolean;
  salesCount: number;
  remainingSales: number;
}

export interface TrialRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function startTrial(): void {
  const now = new Date().toISOString();
  localStorage.setItem(TRIAL_KEY, now);
  localStorage.setItem(TRIAL_SALES_KEY, '0');
}

export function getTrialRemaining(): TrialRemaining {
  const startedAt = localStorage.getItem(TRIAL_KEY);
  if (!startedAt) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const totalMs = TRIAL_DAYS * 24 * 60 * 60 * 1000 - (now - start);

  if (totalMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  const days = Math.floor(totalMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((totalMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((totalMs % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((totalMs % (60 * 1000)) / 1000);

  return { days, hours, minutes, seconds };
}

export function isTrialExpired(): boolean {
  return getTrialState().isExpired;
}

export function getTrialState(): TrialState {
  if (isLicensed()) {
    return {
      startedAt: localStorage.getItem(TRIAL_KEY),
      remainingDays: Number.POSITIVE_INFINITY,
      isExpired: false,
      isActive: false,
      salesCount: Number(localStorage.getItem(TRIAL_SALES_KEY) || '0'),
      remainingSales: Number.POSITIVE_INFINITY,
    };
  }

  const startedAt = localStorage.getItem(TRIAL_KEY);
  const salesCount = Number(localStorage.getItem(TRIAL_SALES_KEY) || '0');
  if (!startedAt) {
    return { startedAt: null, remainingDays: TRIAL_DAYS, isExpired: false, isActive: false, salesCount: 0, remainingSales: TRIAL_MAX_SALES };
  }
  const start = new Date(startedAt);
  const now = new Date();
  const elapsed = now.getTime() - start.getTime();
  const remainingMs = TRIAL_DAYS * 24 * 60 * 60 * 1000 - elapsed;
  if (remainingMs <= 0 || salesCount >= TRIAL_MAX_SALES) {
    return { startedAt, remainingDays: 0, isExpired: true, isActive: false, salesCount, remainingSales: Math.max(0, TRIAL_MAX_SALES - salesCount) };
  }
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  return { startedAt, remainingDays, isExpired: false, isActive: true, salesCount, remainingSales: TRIAL_MAX_SALES - salesCount };
}

export function incrementTrialSales(): void {
  const salesCount = Number(localStorage.getItem(TRIAL_SALES_KEY) || '0');
  localStorage.setItem(TRIAL_SALES_KEY, String(salesCount + 1));
}

export function clearTrial(): void {
  localStorage.removeItem(TRIAL_KEY);
  localStorage.removeItem(TRIAL_SALES_KEY);
}
