// License Service — إدارة وتدقيق التراخيص ذاتية التحقق (Ed25519 Offline-First)

export interface LicenseStatus {
  status: 'active' | 'trial' | 'expired' | 'tampered' | 'unlicensed';
  isLicensed: boolean;
  storeId?: string;
  expiresAt?: number;        // 0 = مدى الحياة، أو Unix timestamp بالثواني
  maxMobileDevices: number;
  hardwareFingerprint: string;
  activatedAt?: string;
  rawKey?: string;
  daysRemaining?: number | null;
}

export interface LicenseInfo {
  activated: boolean;
  code: string;
  storeId: string;
  expiresAt: number;
  maxMobileDevices: number;
  hardwareFingerprint: string;
  activatedAt: string | null;
  plan: 'lifetime' | 'subscription' | 'trial';
}

const LOCAL_STORAGE_CACHE_KEY = 'anpos_license_cache';

let cachedStatus: LicenseStatus = {
  status: 'unlicensed',
  isLicensed: false,
  maxMobileDevices: 5,
  hardwareFingerprint: '',
};

// تهيئة أولية من الكاش المحلي إن وجد
try {
  const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
  if (raw) {
    cachedStatus = JSON.parse(raw);
  }
} catch { /* ignore */ }

/**
 * جلب حالة الترخيص من عملية Electron Main وتحديث الكاش
 */
export async function fetchLicenseStatus(): Promise<LicenseStatus> {
  const electron = (window as any).electronAPI;
  if (electron?.license?.getStatus) {
    try {
      const status: LicenseStatus = await electron.license.getStatus();
      cachedStatus = status;
      try {
        localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(status));
      } catch { /* ignore */ }
      return status;
    } catch (err) {
      console.warn('[licenseService] خطأ في جلب حالة الترخيص عبر IPC:', err);
    }
  }
  return cachedStatus;
}

/**
 * هل التطبيق مرخص ومفعّل بنجاح؟ (متزامن)
 */
export function isLicensed(): boolean {
  return cachedStatus.isLicensed && cachedStatus.status === 'active';
}

/**
 * جلب معلومات الترخيص الحالية المتوافقة
 */
export function getLicense(): LicenseInfo {
  const isAct = isLicensed();
  return {
    activated: isAct,
    code: cachedStatus.rawKey || '',
    storeId: cachedStatus.storeId || '',
    expiresAt: cachedStatus.expiresAt || 0,
    maxMobileDevices: cachedStatus.maxMobileDevices || 5,
    hardwareFingerprint: cachedStatus.hardwareFingerprint || '',
    activatedAt: cachedStatus.activatedAt || null,
    plan: cachedStatus.expiresAt === 0 ? 'lifetime' : 'subscription',
  };
}

/**
 * جلب بصمة العتاد للجهاز الحالي
 */
export async function getHardwareFingerprint(): Promise<string> {
  const electron = (window as any).electronAPI;
  if (electron?.license?.getFingerprint) {
    try {
      return await electron.license.getFingerprint();
    } catch { /* ignore */ }
  }
  return cachedStatus.hardwareFingerprint || 'DEV-HARDWARE-ID';
}

/**
 * تفعيل الترخيص باستخدام كود تفعيل أو محتوى ملف .lic
 */
export async function activateLicenseWithKey(
  keyOrContent: string
): Promise<{ success: boolean; error?: string; status?: LicenseStatus }> {
  const electron = (window as any).electronAPI;
  if (electron?.license?.activate) {
    try {
      const res = await electron.license.activate(keyOrContent);
      if (res.success && res.status) {
        cachedStatus = res.status;
        try {
          localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(res.status));
        } catch { /* ignore */ }
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر الاتصال بخدمة التفعيل' };
    }
  }

  // Fallback للتطوير بدون Electron
  return { success: false, error: 'خدمة التفعيل غير متوفرة خارج تطبيق Electron' };
}

/**
 * إلغاء التفعيل وحذف الترخيص المحلي
 */
export async function deactivateCurrentLicense(): Promise<{ success: boolean }> {
  const electron = (window as any).electronAPI;
  if (electron?.license?.deactivate) {
    try {
      const res = await electron.license.deactivate();
      cachedStatus = {
        status: 'unlicensed',
        isLicensed: false,
        maxMobileDevices: 5,
        hardwareFingerprint: cachedStatus.hardwareFingerprint,
      };
      try {
        localStorage.removeItem(LOCAL_STORAGE_CACHE_KEY);
      } catch { /* ignore */ }
      return res;
    } catch { /* ignore */ }
  }

  cachedStatus = {
    status: 'unlicensed',
    isLicensed: false,
    maxMobileDevices: 5,
    hardwareFingerprint: '',
  };
  localStorage.removeItem(LOCAL_STORAGE_CACHE_KEY);
  return { success: true };
}

// تصدير أسماء متوافقة مع الإصدارات السابقة (Backward Compatibility)
export const activateLicense = activateLicenseWithKey;
export const deactivateLicense = deactivateCurrentLicense;
export const getLicenseStatus = fetchLicenseStatus;

// تشغيل فحص فوري عند تحميل الموديول
fetchLicenseStatus().catch(() => {});

