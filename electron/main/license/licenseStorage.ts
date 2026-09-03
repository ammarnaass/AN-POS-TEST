// إدارة التخزين المحلي الآمن لملف الترخيص على جهاز العميل

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { app } from 'electron';

export interface StoredLicenseData {
  storeId: string;
  expiresAt: number;
  maxMobileDevices: number;
  hardwareFingerprint: string;
  activatedAt: string;
  rawKey: string;
  flags?: number;
}

function getLicenseFilePath(): string {
  let userDir: string;
  try {
    userDir = app.getPath('userData');
  } catch {
    // بيئة الاختبار أو التطوير بدون Electron
    userDir = join(process.cwd(), '.license-dev');
  }
  return join(userDir, 'license.json');
}

/**
 * قراءة ملف الترخيص المحلي
 */
export function loadStoredLicense(): StoredLicenseData | null {
  try {
    const filePath = getLicenseFilePath();
    if (!existsSync(filePath)) return null;

    const content = readFileSync(filePath, 'utf8');
    const data = JSON.parse(content) as StoredLicenseData;

    if (!data.rawKey || !data.hardwareFingerprint) {
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[license] فشل قراءة ملف الترخيص المحلي:', err);
    return null;
  }
}

/**
 * حفظ ملف الترخيص المحلي
 */
export function saveStoredLicense(data: StoredLicenseData): boolean {
  try {
    const filePath = getLicenseFilePath();
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    return true;
  } catch (err) {
    console.error('[license] فشل حفظ ملف الترخيص المحلي:', err);
    return false;
  }
}

/**
 * حذف ملف الترخيص المحلي (إلغاء التفعيل)
 */
export function removeStoredLicense(): boolean {
  try {
    const filePath = getLicenseFilePath();
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    return true;
  } catch (err) {
    console.error('[license] فشل حذف ملف الترخيص المحلي:', err);
    return false;
  }
}
