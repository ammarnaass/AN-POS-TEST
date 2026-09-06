import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startTrial,
  ensureTrialStarted,
  getTrialState,
  getTrialRemaining,
  isTrialExpired,
  clearTrial,
  formatTrialDate,
  TRIAL_START_KEY,
  TRIAL_END_KEY,
  TRIAL_DAYS,
} from '../trialService';

describe('trialService — إدارة التجربة المجانية (7 أيام)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('يجب حفظ تاريخ بدء وانتهاء التجربة المجانية بفارق 7 أيام بالضبط', () => {
    const fixedNow = new Date('2026-09-01T12:00:00.000Z');
    vi.setSystemTime(fixedNow);

    const { startedAt, endsAt } = startTrial();

    expect(startedAt).toBe('2026-09-01T12:00:00.000Z');
    expect(endsAt).toBe('2026-09-08T12:00:00.000Z');

    expect(localStorage.getItem(TRIAL_START_KEY)).toBe(startedAt);
    expect(localStorage.getItem(TRIAL_END_KEY)).toBe(endsAt);

    const diffDays =
      (new Date(endsAt).getTime() - new Date(startedAt).getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(TRIAL_DAYS);
  });

  it('يجب أن تكون التجربة نشطة وغير منتهية خلال فترة الـ 7 أيام', () => {
    const fixedNow = new Date('2026-09-01T12:00:00.000Z');
    vi.setSystemTime(fixedNow);

    startTrial();

    // بعد 3 أيام
    vi.setSystemTime(new Date('2026-09-04T12:00:00.000Z'));

    const state = getTrialState();
    expect(state.isActive).toBe(true);
    expect(state.isExpired).toBe(false);
    expect(state.remainingDays).toBe(4);

    const remaining = getTrialRemaining();
    expect(remaining.days).toBe(4);
    expect(isTrialExpired()).toBe(false);
  });

  it('يجب أن تنتهي التجربة ويتوقف النظام بمجرد انقضاء الـ 7 أيام', () => {
    const fixedNow = new Date('2026-09-01T12:00:00.000Z');
    vi.setSystemTime(fixedNow);

    startTrial();

    // بعد 7 أيام وثانية واحدة
    vi.setSystemTime(new Date('2026-09-08T12:00:01.000Z'));

    const state = getTrialState();
    expect(state.isActive).toBe(false);
    expect(state.isExpired).toBe(true);
    expect(state.remainingDays).toBe(0);
    expect(isTrialExpired()).toBe(true);

    const remaining = getTrialRemaining();
    expect(remaining.days).toBe(0);
    expect(remaining.hours).toBe(0);
    expect(remaining.minutes).toBe(0);
    expect(remaining.seconds).toBe(0);
  });

  it('حساب المطور معفى تماماً ولا يتأثر بانتهاء فترة التجربة', () => {
    const fixedNow = new Date('2026-09-01T12:00:00.000Z');
    vi.setSystemTime(fixedNow);

    startTrial();

    // بعد شهر من بدء التجربة
    vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));

    // مستخدم عادي
    expect(isTrialExpired('admin')).toBe(true);
    expect(isTrialExpired('cashier')).toBe(true);

    // مطور
    expect(isTrialExpired('developer')).toBe(false);
    const devState = getTrialState('developer');
    expect(devState.isExpired).toBe(false);
    expect(devState.isDeveloper).toBe(true);
  });

  it('دالة formatTrialDate تنسق التاريخ بشكل سليم وتتعامل مع القيم الفارغة', () => {
    expect(formatTrialDate(null)).toBe('—');
    expect(formatTrialDate('invalid-date')).toBe('—');

    const formatted = formatTrialDate('2026-09-01T12:30:00.000Z');
    expect(formatted).not.toBe('—');
    expect(formatted).toContain('2026');
  });

  it('دالة clearTrial تحذف جميع مفاتيح التجربة المحفوظة', () => {
    startTrial();
    expect(localStorage.getItem(TRIAL_START_KEY)).not.toBeNull();
    expect(localStorage.getItem(TRIAL_END_KEY)).not.toBeNull();

    clearTrial();
    expect(localStorage.getItem(TRIAL_START_KEY)).toBeNull();
    expect(localStorage.getItem(TRIAL_END_KEY)).toBeNull();
  });
});
