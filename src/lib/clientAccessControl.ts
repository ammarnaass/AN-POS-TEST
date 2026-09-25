// clientAccessControl.ts — إدارة وتدقيق الصلاحيات لنقاط البيع الفرعية (RBAC & Terminal Hardening)
// يقفل العمليات الحساسة (النسخ الاحتياطي، حذف البيانات، إدارة المستخدمين) على شاشات العميل
// ويوفر آلية الفك المؤقت برمز المدير (Manager PIN Override)

import { getStoredTerminalRole } from './transportGateway';

const MANAGER_UNLOCK_KEY = 'anpos_manager_unlocked_until';

/**
 * فحص ما إذا كان هذا الحاسوب يعمل كنقطة بيع فرعية (Client Terminal)
 */
export function isClientTerminal(): boolean {
  return getStoredTerminalRole() === 'client';
}

/**
 * فحص ما إذا كان قسم أو تبويب معين محظوراً افتراضياً على شاشات الكاشير الفرعية
 */
export function isRestrictedTabOnClient(tabId: string): boolean {
  if (!isClientTerminal()) return false;
  // الأقسام المحمية: النسخ الاحتياطي وإدارة المستخدمين والترخيص الرئيسي
  const restrictedTabs = ['export', 'users'];
  return restrictedTabs.includes(tabId);
}

/**
 * فحص ما إذا كانت جلسة المدير مفكوكة مؤقتاً بالرمز السري
 */
export function isManagerUnlocked(): boolean {
  const untilStr = sessionStorage.getItem(MANAGER_UNLOCK_KEY);
  if (!untilStr) return false;
  const until = parseInt(untilStr, 10);
  if (isNaN(until) || Date.now() > until) {
    sessionStorage.removeItem(MANAGER_UNLOCK_KEY);
    return false;
  }
  return true;
}

/**
 * فك قفل جلسة المدير لمدة محددة (الافتراضي 15 دقيقة)
 */
export function unlockManagerSession(minutes = 15): void {
  const expiry = Date.now() + minutes * 60 * 1000;
  sessionStorage.setItem(MANAGER_UNLOCK_KEY, String(expiry));
}

/**
 * قفل جلسة المدير فورياً
 */
export function lockManagerSession(): void {
  sessionStorage.removeItem(MANAGER_UNLOCK_KEY);
}

/**
 * التحقق من رمز المدير السري عبر Electron IPC أو محاكاة المتصفح
 */
export async function verifyManagerPin(
  pin: string
): Promise<{ success: boolean; error?: string; managerName?: string }> {
  if (!pin || pin.trim().length === 0) {
    return { success: false, error: 'يرجى إدخال رمز المدير' };
  }

  const cleanPin = pin.trim();

  // عبر Electron IPC
  if (typeof window !== 'undefined' && (window as any).electronAPI?.auth?.verifyManagerPin) {
    try {
      const res = await (window as any).electronAPI.auth.verifyManagerPin(cleanPin);
      if (res?.success) {
        unlockManagerSession();
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ في التحقق من الرمز' };
    }
  }

  // في بيئة المتصفح / الاختبارات: قبول الرموز القياسية للمدير
  if (cleanPin === '1234' || cleanPin === '0000' || cleanPin === '9999') {
    unlockManagerSession();
    return { success: true, managerName: 'المدير العام' };
  }

  return { success: false, error: 'رمز المدير غير صحيح' };
}
