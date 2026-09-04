// تشفير والتحقق من كلمات المرور باستخدام node:crypto scrypt
// لا يتطلب أي مكتبات خارجية أصلية (native dependencies) لضمان الاستقرار مع Electron

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const KEY_LEN = 32;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };
const HASH_PREFIX = 'scrypt';

/**
 * تشفير كلمة مرور وتوليد سلسلة مشفرة: scrypt$salt$hashHex
 */
export function hashPassword(plain: string): string {
  if (!plain || typeof plain !== 'string') {
    throw new Error('كلمة المرور يجب أن تكون نصاً غير فارغ');
  }
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(plain, salt, KEY_LEN, SCRYPT_OPTIONS);
  return `${HASH_PREFIX}$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * فحص ما إذا كانت السلسلة المخزنة مشفرة بـ scrypt
 */
export function isHashed(stored: string): boolean {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  return parts.length === 3 && parts[0] === HASH_PREFIX && parts[1].length === 32 && parts[2].length === 64;
}

/**
 * التحقق من مطابقة كلمة المرور المدخلة مع القيمة المخزنة
 * تدعم كلمات المرور المشفرة بـ scrypt وكذلك كلمات المرور القديمة كنص عادي للتوافق التراجعي
 */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!plain || !stored) return false;

  if (isHashed(stored)) {
    try {
      const parts = stored.split('$');
      if (parts.length !== 3) return false;
      const [, salt, hashHex] = parts;
      const derivedKey = scryptSync(plain, salt, KEY_LEN, SCRYPT_OPTIONS);
      const storedKeyBuffer = Buffer.from(hashHex, 'hex');
      if (derivedKey.length !== storedKeyBuffer.length) return false;
      return timingSafeEqual(derivedKey, storedKeyBuffer);
    } catch {
      return false;
    }
  }

  // دعم تراجعي لكلمات المرور القديمة المخزنة كنص عادي
  return plain === stored;
}
