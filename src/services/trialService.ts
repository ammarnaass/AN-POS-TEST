import { isLicensed } from '@/services/licenseService';

export const TRIAL_START_KEY = 'anpos_trial_started_at';
export const TRIAL_END_KEY = 'anpos_trial_ends_at';
export const TRIAL_LEGACY_KEY = 'anpos_trial_started';
export const TRIAL_SALES_KEY = 'anpos_trial_sales';

export const TRIAL_DAYS = 7;
export const TRIAL_MAX_SALES = 1000;

export interface TrialState {
  startedAt: string | null;  // تاريخ بدء التجربة
  endsAt: string | null;     // تاريخ انتهاء التجربة الصارم (7 أيام)
  remainingDays: number;
  remainingHours: number;
  remainingMinutes: number;
  remainingSeconds: number;
  isExpired: boolean;
  isActive: boolean;
  salesCount: number;
  remainingSales: number;
  isDeveloper?: boolean;
  clockTampered?: boolean;
}

let latestElectronTrial: {
  startedAt: string | null;
  endsAt: string | null;
  remainingDays: number;
  remainingHours: number;
  remainingMinutes: number;
  remainingSeconds: number;
  salesCount: number;
  remainingSales: number;
  isExpired: boolean;
  isActive: boolean;
  clockTampered?: boolean;
} | null = null;

export interface TrialRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * تنسيق التاريخ باللغة العربية للعرض في الواجهات
 */
export function formatTrialDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * بدء الفترة التجريبية وحفظ تاريخ البدء وتاريخ الانتهاء المحددين بـ 7 أيام
 */
export function startTrial(customStartDate?: string, customEndDate?: string): { startedAt: string; endsAt: string } {
  const existingStart = localStorage.getItem(TRIAL_START_KEY) || localStorage.getItem(TRIAL_LEGACY_KEY);
  const existingEnd = localStorage.getItem(TRIAL_END_KEY);

  let startIso: string;
  let endIso: string;

  if (existingStart && existingEnd) {
    startIso = existingStart;
    endIso = existingEnd;
  } else {
    const start = customStartDate ? new Date(customStartDate) : new Date();
    const startTime = isNaN(start.getTime()) ? Date.now() : start.getTime();

    let endTime: number;
    if (customEndDate) {
      const end = new Date(customEndDate);
      endTime = isNaN(end.getTime()) ? startTime + TRIAL_DAYS * 24 * 60 * 60 * 1000 : end.getTime();
    } else {
      endTime = startTime + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    }

    startIso = new Date(startTime).toISOString();
    endIso = new Date(endTime).toISOString();

    localStorage.setItem(TRIAL_START_KEY, startIso);
    localStorage.setItem(TRIAL_LEGACY_KEY, startIso);
    localStorage.setItem(TRIAL_END_KEY, endIso);

    if (!localStorage.getItem(TRIAL_SALES_KEY)) {
      localStorage.setItem(TRIAL_SALES_KEY, '0');
    }
  }

  // المزامنة فوراً مع تخزين Electron الدائم في ملف appData/trial.json
  const electron = (window as any).electronAPI;
  if (electron?.trial?.start) {
    electron.trial.start(startIso, endIso, Number(localStorage.getItem(TRIAL_SALES_KEY) || '0'))
      .then((res: any) => { if (res) latestElectronTrial = res; })
      .catch(() => {});
  }

  return { startedAt: startIso, endsAt: endIso };
}

/**
 * استعادة التواريخ من مسار تخزين القرص التابع لـ Electron كـ Single Source of Truth
 */
export async function syncWithElectronTrial(): Promise<void> {
  const electron = (window as any).electronAPI;
  if (!electron?.trial?.get) return;

  try {
    const status = await electron.trial.get();
    if (status?.startedAt && status?.endsAt) {
      latestElectronTrial = status;
      // المزامنة الصارمة من القرص الدائم إلى localStorage
      localStorage.setItem(TRIAL_START_KEY, status.startedAt);
      localStorage.setItem(TRIAL_LEGACY_KEY, status.startedAt);
      localStorage.setItem(TRIAL_END_KEY, status.endsAt);
      localStorage.setItem(TRIAL_SALES_KEY, String(status.salesCount || 0));
      if (status.clockTampered) {
        localStorage.setItem('anpos_clock_tampered', 'true');
      } else {
        localStorage.removeItem('anpos_clock_tampered');
      }
    } else {
      // إذا كان التخزين المحلي يحتوي على التجربة بينما Electron لم يسجلها بعد
      const localStart = localStorage.getItem(TRIAL_START_KEY) || localStorage.getItem(TRIAL_LEGACY_KEY);
      const localEnd = localStorage.getItem(TRIAL_END_KEY);
      if (localStart) {
        const sales = Number(localStorage.getItem(TRIAL_SALES_KEY) || '0');
        const res = await electron.trial.start(localStart, localEnd || undefined, sales).catch(() => null);
        if (res) latestElectronTrial = res;
      }
    }
  } catch (err) {
    console.warn('[trialService] تعذر مزامنة بيانات التجربة مع Electron:', err);
  }
}

/**
 * ضمان تسجيل التجربة وتخزين تاريخ البداية والنهاية
 */
export function ensureTrialStarted(): void {
  if (isLicensed()) return;

  const startedAt = localStorage.getItem(TRIAL_START_KEY) || localStorage.getItem(TRIAL_LEGACY_KEY);
  const endsAt = localStorage.getItem(TRIAL_END_KEY);

  if (!startedAt || !endsAt) {
    startTrial(startedAt || undefined, endsAt || undefined);
  }
}

/**
 * حساب الوقت المتبقي بالأيام والساعات والدقائق والثواني
 */
export function getTrialRemaining(userRole?: string): TrialRemaining {
  if (userRole === 'developer') {
    return { days: 999, hours: 0, minutes: 0, seconds: 0 };
  }

  const isClockTampered = latestElectronTrial?.clockTampered || localStorage.getItem('anpos_clock_tampered') === 'true';
  if (isClockTampered) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  if (latestElectronTrial) {
    return {
      days: latestElectronTrial.remainingDays,
      hours: latestElectronTrial.remainingHours,
      minutes: latestElectronTrial.remainingMinutes,
      seconds: latestElectronTrial.remainingSeconds,
    };
  }

  ensureTrialStarted();

  const endsAt = localStorage.getItem(TRIAL_END_KEY);
  const startedAt = localStorage.getItem(TRIAL_START_KEY) || localStorage.getItem(TRIAL_LEGACY_KEY);

  if (!endsAt) {
    if (!startedAt) return { days: TRIAL_DAYS, hours: 0, minutes: 0, seconds: 0 };
    // إنشاء endsAt تلقائياً إذا كان مفقوداً
    const computedEnd = new Date(new Date(startedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(TRIAL_END_KEY, computedEnd);
    return getTrialRemaining(userRole);
  }

  const endTime = new Date(endsAt).getTime();
  const now = Date.now();
  const totalMs = endTime - now;

  if (totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(totalMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((totalMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((totalMs % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((totalMs % (60 * 1000)) / 1000);

  return { days, hours, minutes, seconds };
}

/**
 * هل انتهت فترة التجربة المجانية؟
 */
export function isTrialExpired(userRole?: string): boolean {
  if (userRole === 'developer') return false;
  return getTrialState(userRole).isExpired;
}

/**
 * الحصول على كائن حالة التجربة الكامل
 */
export function getTrialState(userRole?: string): TrialState {
  // 1. حساب المطور: وصول كامل مدى الحياة بدون قيود تجربة أو ترخيص
  if (userRole === 'developer') {
    return {
      startedAt: null,
      endsAt: null,
      remainingDays: Number.POSITIVE_INFINITY,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      isExpired: false,
      isActive: false,
      salesCount: 0,
      remainingSales: Number.POSITIVE_INFINITY,
      isDeveloper: true,
    };
  }

  // 2. إذا كان التطبيق مفعلاً بترخيص رسمي
  if (isLicensed()) {
    return {
      startedAt: localStorage.getItem(TRIAL_START_KEY) || localStorage.getItem(TRIAL_LEGACY_KEY),
      endsAt: localStorage.getItem(TRIAL_END_KEY),
      remainingDays: Number.POSITIVE_INFINITY,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      isExpired: false,
      isActive: false,
      salesCount: Number(localStorage.getItem(TRIAL_SALES_KEY) || '0'),
      remainingSales: Number.POSITIVE_INFINITY,
    };
  }

  const isClockTampered = latestElectronTrial?.clockTampered || localStorage.getItem('anpos_clock_tampered') === 'true';

  // 3. إذا توفرت حالة Electron المحفوظة على القرص مسبقاً
  if (latestElectronTrial) {
    const isExpired = latestElectronTrial.isExpired || isClockTampered;
    return {
      startedAt: latestElectronTrial.startedAt,
      endsAt: latestElectronTrial.endsAt,
      remainingDays: isClockTampered ? 0 : latestElectronTrial.remainingDays,
      remainingHours: isClockTampered ? 0 : latestElectronTrial.remainingHours,
      remainingMinutes: isClockTampered ? 0 : latestElectronTrial.remainingMinutes,
      remainingSeconds: isClockTampered ? 0 : latestElectronTrial.remainingSeconds,
      isExpired,
      isActive: !isExpired,
      salesCount: latestElectronTrial.salesCount,
      remainingSales: isClockTampered ? 0 : latestElectronTrial.remainingSales,
      clockTampered: isClockTampered,
    };
  }

  // 4. ضمان تشغيل العداد وحفظ التواريخ من أول استخدام
  ensureTrialStarted();

  const startedAt = localStorage.getItem(TRIAL_START_KEY) || localStorage.getItem(TRIAL_LEGACY_KEY);
  let endsAt = localStorage.getItem(TRIAL_END_KEY);
  const salesCount = Number(localStorage.getItem(TRIAL_SALES_KEY) || '0');

  if (!startedAt) {
    return {
      startedAt: null,
      endsAt: null,
      remainingDays: TRIAL_DAYS,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      isExpired: false,
      isActive: true,
      salesCount: 0,
      remainingSales: TRIAL_MAX_SALES,
      clockTampered: isClockTampered,
    };
  }

  if (!endsAt) {
    const computedEnd = new Date(new Date(startedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(TRIAL_END_KEY, computedEnd);
    endsAt = computedEnd;
  }

  const now = Date.now();
  const end = new Date(endsAt).getTime();
  const totalMs = end - now;

  const isTimeExpired = totalMs <= 0 || isClockTampered;
  const isSalesExpired = salesCount >= TRIAL_MAX_SALES;
  const isExpired = isTimeExpired || isSalesExpired;

  const remainingMs = Math.max(0, totalMs);
  const remainingDays = isClockTampered ? 0 : Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const remainingHours = isClockTampered ? 0 : Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const remainingMinutes = isClockTampered ? 0 : Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const remainingSeconds = isClockTampered ? 0 : Math.floor((remainingMs % (60 * 1000)) / 1000);

  return {
    startedAt,
    endsAt,
    remainingDays,
    remainingHours,
    remainingMinutes,
    remainingSeconds,
    isExpired,
    isActive: !isExpired,
    salesCount,
    remainingSales: Math.max(0, TRIAL_MAX_SALES - salesCount),
    clockTampered: isClockTampered,
  };
}

/**
 * زيادة عداد مبيعات التجربة
 */
export function incrementTrialSales(): void {
  const salesCount = Number(localStorage.getItem(TRIAL_SALES_KEY) || '0');
  const next = salesCount + 1;
  localStorage.setItem(TRIAL_SALES_KEY, String(next));

  const electron = (window as any).electronAPI;
  if (electron?.trial?.incrementSales) {
    electron.trial.incrementSales()
      .then((count: number) => {
        if (latestElectronTrial && typeof count === 'number') {
          latestElectronTrial.salesCount = count;
          latestElectronTrial.remainingSales = Math.max(0, TRIAL_MAX_SALES - count);
          if (count >= TRIAL_MAX_SALES) {
            latestElectronTrial.isExpired = true;
            latestElectronTrial.isActive = false;
          }
        }
      })
      .catch(() => {});
  }
}

/**
 * مسح بيانات التجربة عند التفعيل
 */
export function clearTrial(): void {
  localStorage.removeItem(TRIAL_START_KEY);
  localStorage.removeItem(TRIAL_END_KEY);
  localStorage.removeItem(TRIAL_LEGACY_KEY);
  localStorage.removeItem(TRIAL_SALES_KEY);
  localStorage.removeItem('anpos_clock_tampered');
  latestElectronTrial = null;
}

// تشغيل الفحص والمزامنة فوراً
ensureTrialStarted();
syncWithElectronTrial().catch(() => {});
