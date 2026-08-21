// License / Activation Service — نموذج "دفعة واحدة مدى الحياة" (PRD)
// يخزّن حالة الترخيص محلياً. عند التفعيل تُلغى قيود التجربة نهائياً.

const LICENSE_KEY = 'anpos_license';

export interface LicenseInfo {
  activated: boolean;
  code: string;
  deviceName: string;
  contactPhone: string;
  activatedAt: string | null;
  // نوع الإجازة — حالياً "lifetime" فقط حسب نموذج التسعير
  plan: 'lifetime';
}

const EMPTY_LICENSE: LicenseInfo = {
  activated: false,
  code: '',
  deviceName: '',
  contactPhone: '',
  activatedAt: null,
  plan: 'lifetime',
};

/** صيغة كود التفعيل المقبولة: XXXX-XXXX-XXXX-XXXX (حروف/أرقام) */
export function isValidActivationCode(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  return /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(normalized);
}

export function getLicense(): LicenseInfo {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    if (!raw) return { ...EMPTY_LICENSE };
    const parsed = JSON.parse(raw) as Partial<LicenseInfo>;
    return { ...EMPTY_LICENSE, ...parsed };
  } catch {
    return { ...EMPTY_LICENSE };
  }
}

export function isLicensed(): boolean {
  return getLicense().activated;
}

/** تفعيل الترخيص محلياً. يرجّع نتيجة العملية. */
export function activateLicense(input: {
  code: string;
  deviceName: string;
  contactPhone: string;
}): { success: boolean; error?: string } {
  const code = input.code.trim().toUpperCase();
  if (!isValidActivationCode(code)) {
    return { success: false, error: 'صيغة كود التفعيل غير صحيحة (XXXX-XXXX-XXXX-XXXX)' };
  }
  const license: LicenseInfo = {
    activated: true,
    code,
    deviceName: input.deviceName.trim(),
    contactPhone: input.contactPhone.trim(),
    activatedAt: new Date().toISOString(),
    plan: 'lifetime',
  };
  localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
  return { success: true };
}

export function deactivateLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
}
