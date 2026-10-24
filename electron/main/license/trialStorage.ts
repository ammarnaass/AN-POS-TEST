// إدارة التخزين المحلي الآمن لبيانات التجربة المجانية على جهاز العميل وحمايتها من التلاعب (H9 & M11)
// يدعم التخزين الموزع المقاوم للحذف (Windows Registry + SQLite Settings + Persistent OS Marker + trial.json)
// ويشمل كشف التلاعب بالساعة (Clock Tampering) والتوقيع التشفيري (Cryptographic Signature)

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import os from 'node:os';
import { app } from 'electron';
import { computeHardwareFingerprint } from './hardwareFingerprint';

export const DEFAULT_TRIAL_DAYS = 7;
export const DEFAULT_MAX_TRIAL_SALES = 1000;
const TRIAL_SIGNATURE_SALT = 'ANPOS-TRIAL-TAMPER-GUARD-v2';

export interface StoredTrialData {
  startedAt: string;           // تاريخ بدء التجربة (ISO string)
  endsAt: string;              // تاريخ انتهاء التجربة (ISO string)
  trialDays: number;           // مدة التجربة بالأيام (7)
  salesCount: number;          // عدد عمليات البيع المنجزة
  hardwareFingerprint: string; // بصمة الجهاز
  lastCheckedAt?: string;      // آخر وقت تم فيه التحقق لكشف التلاعب بالساعة
  signature?: string;          // توقيع النزاهة التشفيري لمنع التعديل اليدوي (H9)
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
  tampered?: boolean;
}

/**
 * حساب التوقيع الرقمي لنزاهة بيانات التجربة
 */
export function computeTrialSignature(startedAt: string, endsAt: string, fp: string): string {
  return createHash('sha256')
    .update(`${TRIAL_SIGNATURE_SALT}:${startedAt}:${endsAt}:${fp}`)
    .digest('hex');
}

/**
 * حماية ملفات التخزين بضبط خصائص الأمان على Windows (M11)
 */
export function secureFileAttributes(filePath: string): void {
  if (process.platform === 'win32') {
    try {
      execSync(`attrib +h "${filePath}"`, {
        timeout: 1000,
        windowsHide: true,
        stdio: 'ignore',
      });
    } catch {
      // تجاهل إذا كان نظام الملفات لا يدعم ذلك
    }
  }
}

function getTrialFilePath(): string {
  if (process.env.ANPOS_DATA_DIR) {
    return join(process.env.ANPOS_DATA_DIR, 'trial.json');
  }
  let userDir: string;
  try {
    userDir = app.getPath('userData');
  } catch {
    userDir = join(process.cwd(), '.license-dev');
  }
  return join(userDir, 'trial.json');
}

function getOsMarkerPath(): string {
  if (process.env.ANPOS_DATA_DIR) {
    return join(process.env.ANPOS_DATA_DIR, '.anpos_sys_marker');
  }
  try {
    return join(os.homedir(), '.anpos_sys_marker');
  } catch {
    return join(process.cwd(), '.anpos_sys_marker');
  }
}

/**
 * قراءة علامة التجربة الدائمة من سجل Windows (HKCU)
 */
function readRegistryTrial(): { startedAt: string; endsAt: string; signature: string } | null {
  if (process.platform !== 'win32') return null;
  try {
    const out = execSync('reg query "HKCU\\Software\\ANPOS\\Trial"', {
      encoding: 'utf8',
      timeout: 1500,
      windowsHide: true,
    });
    const startedMatch = out.match(/StartedAt\s+REG_SZ\s+([^\r\n]+)/i);
    const endsMatch = out.match(/EndsAt\s+REG_SZ\s+([^\r\n]+)/i);
    const sigMatch = out.match(/Signature\s+REG_SZ\s+([^\r\n]+)/i);
    if (startedMatch?.[1] && endsMatch?.[1]) {
      return {
        startedAt: startedMatch[1].trim(),
        endsAt: endsMatch[1].trim(),
        signature: sigMatch?.[1]?.trim() || '',
      };
    }
  } catch {
    // المفتاح غير موجود بعد
  }
  return null;
}

/**
 * كتابة علامة التجربة الدائمة في سجل Windows (HKCU) لحمايتها من حذف الملفات
 */
function writeRegistryTrial(startedAt: string, endsAt: string, signature: string): void {
  if (process.platform !== 'win32') return;
  try {
    execSync(
      `reg add "HKCU\\Software\\ANPOS\\Trial" /v StartedAt /t REG_SZ /d "${startedAt}" /f && ` +
      `reg add "HKCU\\Software\\ANPOS\\Trial" /v EndsAt /t REG_SZ /d "${endsAt}" /f && ` +
      `reg add "HKCU\\Software\\ANPOS\\Trial" /v Signature /t REG_SZ /d "${signature}" /f`,
      { timeout: 2000, windowsHide: true, stdio: 'ignore' }
    );
  } catch {
    // تجاهل في حالة صلاحيات مقيدة
  }
}

/**
 * قراءة علامة التجربة الاحتياطية على أنظمة Linux/macOS
 */
function readOsMarkerTrial(): { startedAt: string; endsAt: string; signature: string } | null {
  if (process.platform === 'win32') return null;
  try {
    const p = getOsMarkerPath();
    if (!existsSync(p)) return null;
    const data = JSON.parse(readFileSync(p, 'utf8'));
    if (data.startedAt && data.endsAt) {
      return { startedAt: data.startedAt, endsAt: data.endsAt, signature: data.signature || '' };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * كتابة علامة التجربة الاحتياطية على أنظمة Linux/macOS
 */
function writeOsMarkerTrial(startedAt: string, endsAt: string, signature: string): void {
  if (process.platform === 'win32') return;
  try {
    const p = getOsMarkerPath();
    writeFileSync(p, JSON.stringify({ startedAt, endsAt, signature }), { encoding: 'utf8', mode: 0o600 });
  } catch {
    // ignore
  }
}

/**
 * قراءة علامة التجربة من جدول settings في قاعدة البيانات SQLite
 */
function readDbTrial(): { startedAt: string; endsAt: string; signature: string; salesCount?: number } | null {
  try {
    // استيراد ديناميكي تفادياً لأي دورات تبعية
    const { getSqlite } = require('../database');
    const sqlite = getSqlite?.();
    if (!sqlite) return null;
    const row = sqlite
      .prepare('SELECT trial_first_started_at, trial_ends_at, trial_checksum, trial_sales_count FROM settings LIMIT 1')
      .get() as any;
    if (row?.trial_first_started_at && row?.trial_ends_at) {
      return {
        startedAt: String(row.trial_first_started_at),
        endsAt: String(row.trial_ends_at),
        signature: row.trial_checksum ? String(row.trial_checksum) : '',
        salesCount: Number(row.trial_sales_count || 0),
      };
    }
  } catch {
    // قاعدة البيانات لم تُهيأ بعد
  }
  return null;
}

/**
 * كتابة علامة التجربة في جدول settings في قاعدة البيانات SQLite
 */
function writeDbTrial(startedAt: string, endsAt: string, signature: string, salesCount = 0): void {
  try {
    const { getSqlite } = require('../database');
    const sqlite = getSqlite?.();
    if (!sqlite) return null;
    sqlite
      .prepare(
        `UPDATE settings
         SET trial_first_started_at = COALESCE(trial_first_started_at, ?),
             trial_ends_at = COALESCE(trial_ends_at, ?),
             trial_checksum = ?,
             trial_sales_count = MAX(COALESCE(trial_sales_count, 0), ?)
         WHERE id = (SELECT id FROM settings LIMIT 1)`
      )
      .run(startedAt, endsAt, signature, salesCount);
  } catch {
    // ignore
  }
}

/**
 * قراءة بيانات التجربة المحفوظة مع الحماية من الحذف والتلاعب (H9)
 */
export function loadStoredTrial(): StoredTrialData | null {
  const hwFp = computeHardwareFingerprint();
  let fileTrial: StoredTrialData | null = null;
  const filePath = getTrialFilePath();

  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const data = JSON.parse(content) as StoredTrialData;
      if (data.startedAt && data.endsAt) {
        fileTrial = data;
      }
    } catch (err) {
      console.warn('[trialStorage] تنبيه: خطأ أثناء قراءة ملف trial.json:', err);
    }
  }

  // قراءة العلامات الدائمة من السجلات الثانوية (Registry / OS Marker / SQLite)
  const regTrial = readRegistryTrial() || readOsMarkerTrial();
  const dbTrial = readDbTrial();

  // كشف محاولة إعادة ضبط التجربة عبر حذف trial.json (ثغرة H9)
  if (!fileTrial && (regTrial || dbTrial)) {
    const recoveredStart = regTrial?.startedAt || dbTrial?.startedAt;
    const recoveredEnd = regTrial?.endsAt || dbTrial?.endsAt;
    if (recoveredStart && recoveredEnd) {
      console.warn('[trialStorage] 🛡️ تم كشف محاولة إعادة ضبط التجربة بحذف ملف trial.json! جاري استعادة السجل الدائم الأصلي...');
      const recoveredSignature = computeTrialSignature(recoveredStart, recoveredEnd, hwFp);
      const restoredData: StoredTrialData = {
        startedAt: recoveredStart,
        endsAt: recoveredEnd,
        trialDays: DEFAULT_TRIAL_DAYS,
        salesCount: dbTrial?.salesCount || 0,
        hardwareFingerprint: hwFp,
        lastCheckedAt: new Date().toISOString(),
        signature: recoveredSignature,
      };
      saveStoredTrial(restoredData);
      return restoredData;
    }
  }

  if (!fileTrial) return null;

  // فحص النزاهة التشفيرية لملف trial.json
  const expectedSig = computeTrialSignature(fileTrial.startedAt, fileTrial.endsAt, fileTrial.hardwareFingerprint || hwFp);
  if (!fileTrial.signature) {
    fileTrial.signature = expectedSig;
    saveStoredTrial(fileTrial);
  }

  // كشف التلاعب بتمديد تاريخ الانتهاء مقارنة بالسجلات الثانوية الموثقة
  const historicalEnd = regTrial?.endsAt || dbTrial?.endsAt;
  if (historicalEnd) {
    const fileEndTime = new Date(fileTrial.endsAt).getTime();
    const histEndTime = new Date(historicalEnd).getTime();
    if (fileEndTime > histEndTime + 60000) {
      console.warn('[trialStorage] ⚠️ كشف تلاعب بملف التجربة (محاولة تمديد تاريخ الانتهاء). اعتماد التاريخ الأصلي.');
      fileTrial.endsAt = historicalEnd;
      fileTrial.signature = computeTrialSignature(fileTrial.startedAt, fileTrial.endsAt, hwFp);
      saveStoredTrial(fileTrial);
    }
  }

  return fileTrial;
}

/**
 * حفظ بيانات التجربة في القرص والسجلات الدائمة بشكل آمن ومحمي (H9 & M11)
 */
export function saveStoredTrial(data: StoredTrialData): boolean {
  try {
    const filePath = getTrialFilePath();
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // حساب التوقيع الرقمي للبيانات
    if (!data.signature) {
      data.signature = computeTrialSignature(data.startedAt, data.endsAt, data.hardwareFingerprint);
    }

    // 1. الكتابة في trial.json مع إخفاء الملف على Windows (M11)
    writeFileSync(filePath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    secureFileAttributes(filePath);

    // 2. المزامنة مع السجلات الدائمة الثانوية للحماية من الحذف (H9)
    writeRegistryTrial(data.startedAt, data.endsAt, data.signature);
    writeOsMarkerTrial(data.startedAt, data.endsAt, data.signature);
    writeDbTrial(data.startedAt, data.endsAt, data.signature, data.salesCount);

    return true;
  } catch (err) {
    console.error('[trialStorage] خطأ أثناء حفظ بيانات التجربة:', err);
    return false;
  }
}

/**
 * بدء فترة تجريبية جديدة وحفظ تاريخ البدء والانتهاء (7 أيام) مع منع إعادة التوليد بعد الحذف (H9)
 */
export function initStoredTrial(
  existingStart?: string,
  existingEnd?: string,
  existingSales = 0
): StoredTrialData {
  const hwFp = computeHardwareFingerprint();
  const existing = loadStoredTrial();
  if (existing) {
    return existing;
  }

  // فحص السجلات الدائمة القديمة في Registry أو DB لمنع منح تجربة جديدة
  const regTrial = readRegistryTrial() || readOsMarkerTrial();
  const dbTrial = readDbTrial();
  const priorStart = regTrial?.startedAt || dbTrial?.startedAt;
  const priorEnd = regTrial?.endsAt || dbTrial?.endsAt;

  let startTime: number;
  let endTime: number;

  if (priorStart && priorEnd) {
    console.warn('[trialStorage] 🛡️ تم العثور على تجربة سابقة في سجل النظام الدائم، لن يتم بدء فترة تجريبية جديدة.');
    startTime = new Date(priorStart).getTime();
    endTime = new Date(priorEnd).getTime();
  } else {
    const startDate = existingStart ? new Date(existingStart) : new Date();
    startTime = isNaN(startDate.getTime()) ? Date.now() : startDate.getTime();

    if (existingEnd) {
      const endDate = new Date(existingEnd);
      endTime = isNaN(endDate.getTime()) ? startTime + DEFAULT_TRIAL_DAYS * 86400000 : endDate.getTime();
    } else {
      endTime = startTime + DEFAULT_TRIAL_DAYS * 86400000;
    }
  }

  const startIso = new Date(startTime).toISOString();
  const endIso = new Date(endTime).toISOString();
  const signature = computeTrialSignature(startIso, endIso, hwFp);

  const data: StoredTrialData = {
    startedAt: startIso,
    endsAt: endIso,
    trialDays: DEFAULT_TRIAL_DAYS,
    salesCount: existingSales || dbTrial?.salesCount || 0,
    hardwareFingerprint: hwFp,
    lastCheckedAt: new Date().toISOString(),
    signature,
  };

  saveStoredTrial(data);
  return data;
}

/**
 * زيادة عداد مبيعات التجربة وحفظه في السجلات المتعددة
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
 * فحص وحساب حالة التجربة مع التحقق من الصلاحية والانتهاء وكشف التلاعب بالساعة (Clock Tampering)
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

  // 1. فحص التراجع بالوقت (Clock Tampering): إذا كان وقت الجهاز أقل بكثير من آخر فحص مسجل
  let clockTampered = false;
  if (trial.lastCheckedAt) {
    const lastChecked = new Date(trial.lastCheckedAt).getTime();
    if (now < lastChecked - 3600000) {
      // تم تقديم الساعة إلى الوراء بأكثر من ساعة
      clockTampered = true;
    }
  }

  // إذا كان وقت الجهاز الحالي يسبق وقت بدء التجربة المسجل
  if (now < start - 300000) {
    clockTampered = true;
  }

  // 2. فحص النزاهة التشفيرية
  let tampered = false;
  const hwFp = computeHardwareFingerprint();
  if (trial.signature) {
    const expectedSig = computeTrialSignature(trial.startedAt, trial.endsAt, trial.hardwareFingerprint || hwFp);
    if (trial.signature !== expectedSig) {
      tampered = true;
    }
  }

  // تحديث آخر فحص إذا كان الوقت طبيعياً
  if (!clockTampered && !tampered) {
    trial.lastCheckedAt = new Date().toISOString();
    saveStoredTrial(trial);
  }

  const diffMs = end - now;
  const isTimeExpired = diffMs <= 0 || clockTampered || tampered;
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
    tampered,
  };
}
