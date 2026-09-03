// التحقق الرياضي الصارم من صحة مفتاح الترخيص وفك بياناته (Ed25519)

import { createPublicKey, verify } from 'node:crypto';
import { PUBLIC_KEY_PEM } from './keys';

export interface ParsedLicense {
  storeId: string;
  expiresAt: number;        // 0 = lifetime, or Unix timestamp (seconds)
  maxMobileDevices: number;
  issuedAt: number;
  flags: number;
  rawKey: string;
}

/**
 * تنظيف وفك وتدقيق التوقيع الرقمي لمفتاح التفعيل
 * @param inputKey مفتاح التفعيل المدخل أو محتوى ملف .lic
 * @param customPublicKeyPem مفتاح عام مخصص (اختياري للاختبارات)
 */
export function parseAndVerifyKey(inputKey: string, customPublicKeyPem?: string): ParsedLicense | null {
  try {
    if (!inputKey || typeof inputKey !== 'string') return null;

    let keyStr = inputKey.trim();

    // إذا كان المدخل ملف JSON (.lic)
    if (keyStr.startsWith('{') && keyStr.endsWith('}')) {
      try {
        const parsedJson = JSON.parse(keyStr);
        if (parsedJson.key) {
          keyStr = parsedJson.key;
        }
      } catch { /* proceed with raw string */ }
    }

    // تنظيف المفتاح من المسافات والشُرط والبادئة (مع الحفاظ على حالة الأحرف A-Z و a-z لأن Base64 حساس للحالة)
    const withoutPrefix = keyStr.trim().replace(/^ANPS-/i, '');
    const cleanBase64 = withoutPrefix.replace(/-/g, '').replace(/\s+/g, '');

    // فك الترميز من Base64
    const fullPayload = Buffer.from(cleanBase64, 'base64');

    // يجب أن يكون الطول 84 بايت بالضبط (20 بايت بيانات + 64 بايت توقيع Ed25519)
    if (fullPayload.length !== 84) {
      return null;
    }

    const payloadBuffer = fullPayload.subarray(0, 20);
    const signatureBuffer = fullPayload.subarray(20, 84);

    const pubKey = createPublicKey(customPublicKeyPem || PUBLIC_KEY_PEM);
    const isValid = verify(null, payloadBuffer, pubKey, signatureBuffer);

    if (!isValid) {
      return null; // التوقيع مزور أو تم التلاعب بالمفتاح
    }

    // استخراج الحقول الثنائية
    const rawStoreId = payloadBuffer.subarray(0, 6).toString('ascii').replace(/0+$/, '').trim();
    const expiresAt = payloadBuffer.readUInt32LE(6);
    const maxMobileDevices = payloadBuffer.readUInt16LE(10);
    const issuedAt = payloadBuffer.readUInt32LE(12);
    const flags = payloadBuffer.readUInt32LE(16);

    return {
      storeId: rawStoreId || 'STORE',
      expiresAt,
      maxMobileDevices: maxMobileDevices || 1,
      issuedAt,
      flags,
      rawKey: keyStr.startsWith('ANPS-') || keyStr.startsWith('anps-') ? keyStr : `ANPS-${keyStr}`,
    };
  } catch (err) {
    console.warn('[license] فشل فك وتحقق المفتاح:', err);
    return null;
  }
}
