// مدير دورة حياة الترخيص — AN POS Desktop License Manager

import { computeHardwareFingerprint } from './hardwareFingerprint';
import { parseAndVerifyKey, type ParsedLicense } from './verifyLicense';
import { loadStoredLicense, saveStoredLicense, removeStoredLicense, type StoredLicenseData } from './licenseStorage';

export type LicenseStateStatus = 'active' | 'trial' | 'expired' | 'tampered' | 'unlicensed';

export interface LicenseStatusResponse {
  status: LicenseStateStatus;
  isLicensed: boolean;
  storeId?: string;
  expiresAt?: number; // 0 = مدى الحياة، أو timestamp بالثواني
  maxMobileDevices: number;
  hardwareFingerprint: string;
  activatedAt?: string;
  rawKey?: string;
  daysRemaining?: number | null;
}

class LicenseManager {
  private currentLicense: StoredLicenseData | null = null;
  private verifiedParsed: ParsedLicense | null = null;

  constructor() {
    this.reload();
  }

  /**
   * إعادة تحميل وفحص ملف الترخيص من القرص
   */
  public reload(): LicenseStatusResponse {
    this.currentLicense = loadStoredLicense();

    if (!this.currentLicense) {
      this.verifiedParsed = null;
      return this.getStatus();
    }

    // 1. إعادة التحقق التشفيري من المفتاح الموقّع
    const parsed = parseAndVerifyKey(this.currentLicense.rawKey);
    if (!parsed) {
      console.warn('[license] فشل التحقق من التوقيع الرقمي للمفتاح المحلي');
      this.verifiedParsed = null;
      return this.getStatus();
    }

    this.verifiedParsed = parsed;
    return this.getStatus();
  }

  /**
   * الحصول على الحالة التفصيلية الحالية للترخيص
   */
  public getStatus(): LicenseStatusResponse {
    const hwFingerprint = computeHardwareFingerprint();

    if (!this.currentLicense || !this.verifiedParsed) {
      return {
        status: 'unlicensed',
        isLicensed: false,
        maxMobileDevices: 5, // الحد الافتراضي في وضع التجربة
        hardwareFingerprint: hwFingerprint,
      };
    }

    // 2. مطابقة بصمة العتاد
    if (this.currentLicense.hardwareFingerprint !== hwFingerprint) {
      return {
        status: 'tampered',
        isLicensed: false,
        storeId: this.verifiedParsed.storeId,
        maxMobileDevices: 1,
        hardwareFingerprint: hwFingerprint,
        rawKey: this.currentLicense.rawKey,
      };
    }

    // 3. التحقق من الصلاحية الزمنية
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = this.verifiedParsed.expiresAt;

    if (expiresAt > 0 && expiresAt < nowSec) {
      return {
        status: 'expired',
        isLicensed: false,
        storeId: this.verifiedParsed.storeId,
        expiresAt,
        maxMobileDevices: 1,
        hardwareFingerprint: hwFingerprint,
        activatedAt: this.currentLicense.activatedAt,
        rawKey: this.currentLicense.rawKey,
        daysRemaining: 0,
      };
    }

    const daysRemaining = expiresAt > 0 ? Math.ceil((expiresAt - nowSec) / 86400) : null;

    return {
      status: 'active',
      isLicensed: true,
      storeId: this.verifiedParsed.storeId,
      expiresAt,
      maxMobileDevices: this.verifiedParsed.maxMobileDevices,
      hardwareFingerprint: hwFingerprint,
      activatedAt: this.currentLicense.activatedAt,
      rawKey: this.currentLicense.rawKey,
      daysRemaining,
    };
  }

  /**
   * تفعيل مفتاح جديد (نص أو ملف)
   */
  public activate(keyOrFileContent: string): { success: boolean; error?: string; status?: LicenseStatusResponse } {
    const parsed = parseAndVerifyKey(keyOrFileContent);
    if (!parsed) {
      return {
        success: false,
        error: 'كود التفعيل غير صالح أو تم التلاعب به. تأكد من إدخال المفتاح بشكل صحيح.',
      };
    }

    // التحقق من الصلاحية الزمنية وقت التفعيل
    const nowSec = Math.floor(Date.now() / 1000);
    if (parsed.expiresAt > 0 && parsed.expiresAt < nowSec) {
      return {
        success: false,
        error: 'انتهت فترة صلاحية هذا الترخيص.',
      };
    }

    const hwFingerprint = computeHardwareFingerprint();
    const activatedAt = new Date().toISOString();

    const storedData: StoredLicenseData = {
      storeId: parsed.storeId,
      expiresAt: parsed.expiresAt,
      maxMobileDevices: parsed.maxMobileDevices,
      hardwareFingerprint: hwFingerprint,
      activatedAt,
      rawKey: parsed.rawKey,
      flags: parsed.flags,
    };

    const saved = saveStoredLicense(storedData);
    if (!saved) {
      return {
        success: false,
        error: 'تعذر حفظ ملف الترخيص محلياً على هذا الجهاز.',
      };
    }

    this.currentLicense = storedData;
    this.verifiedParsed = parsed;

    return {
      success: true,
      status: this.getStatus(),
    };
  }

  /**
   * إلغاء التفعيل وحذف الترخيص المحلي
   */
  public deactivate(): { success: boolean } {
    removeStoredLicense();
    this.currentLicense = null;
    this.verifiedParsed = null;
    return { success: true };
  }

  /**
   * الحد الأقصى لأجهزة الهاتف المصرح بربطها
   */
  public getMaxMobileDevices(): number {
    const status = this.getStatus();
    if (status.isLicensed && status.status === 'active') {
      return status.maxMobileDevices;
    }
    return 5; // الافتراضي
  }

  /**
   * هل النظام مفعّل ومرخص حالياً؟
   */
  public isLicensed(): boolean {
    return this.getStatus().status === 'active';
  }
}

export const licenseManager = new LicenseManager();
