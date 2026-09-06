// إدارة التخزين المحلي الآمن لبيانات التجربة المجانية على جهاز العميل
// الموقع: appData/trial.json لمنع التلاعب عبر مسح localStorage المتصفح

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { app } from 'electron';
import { computeHardwareFingerprint } from './hardwareFingerprint';

export const DEFAULT_TRIAL_DAYS = 7;
export const DEFAULT_MAX_TRIAL_SALES = 1000;

export interface StoredTrialData {
  startedAt: string; // تاريخ بدء التجربة (ISO string)
  endsAt: string;    // تاريخ انتهاء التجربة (ISO string)
  trialDays: number; // مدة التجربة بالأيام (7)
  salesCount: number;// عدد عمليات البيع المنجزة
  hardwareFingerprint: string; // بصمة الجهاز
  lastCheckedAt?: string;      // آخر وقت تم فيه التحقق لكشف التلاعب بالساعة
}

export interface ElectronTrialStatus {
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
}

function getTrialFilePath(): string {
  let userDir: string;
  try {
    userDir = app.getPath('userData');
  } catch {
    userDir = join(process.cwd(), '.license-dev');
  }
  return join(userDir, 'trial.json');
}

/**
 * قراءة بيانات التجربة المحفوظة في مسار النظام الدائم
 */
export function loadStoredTrial(): StoredTrialData | null {
  try {
    const filePath = getTrialFilePath();
    if (!existsSync(filePath)) return null;

    const content = readFileSync(filePath, 'utf8');
    const data = JSON.parse(content) as StoredTrialData;

    if (!data.startedAt || !data.endsAt) {
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[trialStorage] خطأ أثناء قراءة ملف التجربة:', err);
    return null;
  }
}

/**
 * حفظ بيانات التجربة في القرص بشكل دائم
 */
export function saveStoredTrial(data: StoredTrialData): boolean {
  try {
    const filePath = getTrialFilePath();
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    return true;
  } catch (err) {
    console.error('[trialStorage] خطأ أثناء حفظ ملف التجربة:', err);
    return false;
  }
}

/**
 * بدء فترة تجريبية جديدة وحفظ تاريخ البدء والانتهاء (7 أيام)
 */
export function initStoredTrial(
  existingStart?: string,
  existingEnd?: string,
  existingSales = 0
): StoredTrialData {
  const existing = loadStoredTrial();
  if (existing) {
    return existing;
  }

  const startDate = existingStart ? new Date(existingStart) : new Date();
  const startTime = isNaN(startDate.getTime()) ? Date.now() : startDate.getTime();

  let endTime: number;
  if (existingEnd) {
    const endDate = new Date(existingEnd);
    endTime = isNaN(endDate.getTime()) ? startTime + DEFAULT_TRIAL_DAYS * 86400000 : endDate.getTime();
  } else {
    endTime = startTime + DEFAULT_TRIAL_DAYS * 86400000;
  }

  const data: StoredTrialData = {
    startedAt: new Date(startTime).toISOString(),
    endsAt: new Date(endTime).toISOString(),
    trialDays: DEFAULT_TRIAL_DAYS,
    salesCount: existingSales || 0,
    hardwareFingerprint: computeHardwareFingerprint(),
    lastCheckedAt: new Date().toISOString(),
  };

  saveStoredTrial(data);
  return data;
}

/**
 * زيادة عداد مبيعات التجربة وحفظه
 */
export function incrementStoredTrialSales(): number {
  let trial = loadStoredTrial();
  if (!trial) {
    trial = initStoredTrial();
  }
  trial.salesCount = (trial.salesCount || 0) + 1;
  trial.lastCheckedAt = new Date().toISOString();
  saveStoredTrial(trial);
  return trial.salesCount;
}

/**
 * فحص وحساب حالة التجربة مع التحقق من الصلاحية والانتهاء
 */
export function getStoredTrialStatus(): ElectronTrialStatus {
  const trial = loadStoredTrial();
  if (!trial) {
    return {
      startedAt: null,
      endsAt: null,
      remainingDays: DEFAULT_TRIAL_DAYS,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      salesCount: 0,
      remainingSales: DEFAULT_MAX_TRIAL_SALES,
      isExpired: false,
      isActive: false,
    };
  }

  const now = Date.now();
  const end = new Date(trial.endsAt).getTime();
  const start = new Date(trial.startedAt).getTime();

  // فحص التراجع بالوقت (Clock Tampering): إذا كان وقت الجهاز أقل بكثير من آخر فحص مسجل
  let clockTampered = false;
  if (trial.lastCheckedAt) {
    const lastChecked = new Date(trial.lastCheckedAt).getTime();
    if (now < lastChecked - 3600000) { // تم تقديم الساعة إلى الوراء بأكثر من ساعة
      clockTampered = true;
    }
  }

  // تحديث آخر فحص إذا كان الوقت طبيعياً
  if (!clockTampered) {
    trial.lastCheckedAt = new Date().toISOString();
    saveStoredTrial(trial);
  }

  const diffMs = end - now;
  const isTimeExpired = diffMs <= 0 || clockTampered;
  const isSalesExpired = trial.salesCount >= DEFAULT_MAX_TRIAL_SALES;
  const isExpired = isTimeExpired || isSalesExpired;

  const remainingMs = Math.max(0, diffMs);
  const remainingDays = Math.floor(remainingMs / 86400000);
  const remainingHours = Math.floor((remainingMs % 86400000) / 3600000);
  const remainingMinutes = Math.floor((remainingMs % 3600000) / 60000);
  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

  return {
    startedAt: trial.startedAt,
    endsAt: trial.endsAt,
    remainingDays,
    remainingHours,
    remainingMinutes,
    remainingSeconds,
    salesCount: trial.salesCount,
    remainingSales: Math.max(0, DEFAULT_MAX_TRIAL_SALES - trial.salesCount),
    isExpired,
    isActive: !isExpired,
    clockTampered,
  };
}
