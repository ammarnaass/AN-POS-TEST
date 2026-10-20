// مدير دورة حياة الترخيص — AN POS Desktop License Manager

import {
  computeHardwareFingerprint,
  computeHardwareHashInt,
  computeLegacyHardwareFingerprint,
  computeLegacyHardwareHashInt,
} from './hardwareFingerprint';
import { parseAndVerifyKey, type ParsedLicense } from './verifyLicense';
import { loadStoredLicense, saveStoredLicense, removeStoredLicense, type StoredLicenseData } from './licenseStorage';
import { getStoredTrialStatus, type ElectronTrialStatus } from './trialStorage';
import { isDeveloperModeActive } from '../handlers/auth';

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
  trialInfo?: ElectronTrialStatus;
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
      const trial = getStoredTrialStatus();
      let status: LicenseStateStatus = 'unlicensed';
      if (trial.isActive && !trial.isExpired) {
        status = 'trial';
      } else if (trial.isExpired) {
        status = 'expired';
      }

      return {
        status,
        isLicensed: false,
        maxMobileDevices: 5, // الحد الافتراضي في وضع التجربة
        hardwareFingerprint: hwFingerprint,
        trialInfo: trial,
        daysRemaining: trial.remainingDays,
      };
    }

    // 2. مطابقة بصمة العتاد (المحلية + المشفرة في التوقيع الرقمي إن وُجدت) — دعم v2 والبصمة السابقة للتوافق (M10)
    const legacyFingerprint = computeLegacyHardwareFingerprint();
    const hwHashInt = computeHardwareHashInt();
    const legacyHwHashInt = computeLegacyHardwareHashInt();

    const isCryptoBound = this.verifiedParsed.flags !== 0;
    const isCryptoMatch =
      !isCryptoBound ||
      this.verifiedParsed.flags === hwHashInt ||
      this.verifiedParsed.flags === legacyHwHashInt;

    const isFpMatch =
      this.currentLicense.hardwareFingerprint === hwFingerprint ||
      this.currentLicense.hardwareFingerprint === legacyFingerprint;

    if (!isFpMatch || !isCryptoMatch) {
      return {
        status: 'tampered',
        isLicensed: false,
        storeId: this.verifiedParsed.storeId,
        maxMobileDevices: 1,
        hardwareFingerprint: hwFingerprint,
        rawKey: this.currentLicense.rawKey,
      };
    }

    // ترقية تلقائية للبصمة المحفوظة إذا كانت بالإصدار القديم v1
    if (this.currentLicense.hardwareFingerprint === legacyFingerprint && hwFingerprint !== legacyFingerprint) {
      this.currentLicense.hardwareFingerprint = hwFingerprint;
      saveStoredLicense(this.currentLicense);
      console.log('[license] تم ترقية بصمة العتاد المحفوظة تلقائياً إلى الإصدار v2 (M10)');
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

    // التحقق التشفيري من مطابقة عتاد الجهاز (إذا كان المفتاح مقيداً بعتاد محدد) — دعم v2 و v1
    const hwHashInt = computeHardwareHashInt();
    const legacyHwHashInt = computeLegacyHardwareHashInt();
    if (parsed.flags !== 0 && parsed.flags !== hwHashInt && parsed.flags !== legacyHwHashInt) {
      return {
        success: false,
        error: 'كود التفعيل هذا مشفر ومخصص لجهاز حاسوب آخر ولا يتطابق مع عتاد هذا الجهاز.',
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
    if (isDeveloperModeActive()) {
      return 999;
    }
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
    return this.getStatus().status === 'active' || isDeveloperModeActive();
  }
}

export const licenseManager = new LicenseManager();
