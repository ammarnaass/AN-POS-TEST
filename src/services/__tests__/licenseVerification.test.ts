import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, createPrivateKey, sign } from 'node:crypto';
import { parseAndVerifyKey } from '../../../electron/main/license/verifyLicense';
import { PUBLIC_KEY_PEM } from '../../../electron/main/license/keys';
import { generateLicenseKey } from '../../../license-generator/generate-license.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Ed25519 Offline License System Tests', () => {
  it('يجب أن يتحقق بنجاح من مفتاح تم توقيعه بزوج مفاتيح ديناميكي', () => {
    // 1. توليد زوج مفاتيح اختباري
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const testPubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const testPrivPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

    // 2. إصدار مفتاح ترخيص اختباري
    const storeId = 'TEST01';
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // ساعة واحدة
    const maxDevices = 7;

    const { key } = generateLicenseKey(
      { storeId, expiresAt, maxMobileDevices: maxDevices },
      testPrivPem
    );

    expect(key).toMatch(/^ANPS-[A-Za-z0-9+/=-]+$/);

    // 3. فك المفتاح والتحقق منه بالمفتاح العام
    const parsed = parseAndVerifyKey(key, testPubPem);
    expect(parsed).not.toBeNull();
    expect(parsed?.storeId).toBe(storeId);
    expect(parsed?.expiresAt).toBe(expiresAt);
    expect(parsed?.maxMobileDevices).toBe(maxDevices);
  });

  it('يجب أن يرفض المفتاح إذا تم التلاعب بأي حرف منه (Anti-Tampering)', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const testPubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const testPrivPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

    const { key } = generateLicenseKey({ storeId: 'SHOP01' }, testPrivPem);

    // التلاعب بحرف في منتصف المفتاح
    const chars = key.split('');
    const targetIdx = 12;
    chars[targetIdx] = chars[targetIdx] === 'A' ? 'B' : 'A';
    const tamperedKey = chars.join('');

    const parsed = parseAndVerifyKey(tamperedKey, testPubPem);
    expect(parsed).toBeNull();
  });

  it('يجب أن يرفض النصوص العشوائية والصيغ التالفة', () => {
    expect(parseAndVerifyKey('')).toBeNull();
    expect(parseAndVerifyKey('INVALID-RANDOM-KEY-12345')).toBeNull();
    expect(parseAndVerifyKey('ANPS-SHORT')).toBeNull();
    expect(parseAndVerifyKey('{}')).toBeNull();
  });

  it('يجب أن يدعم تفعيل الترخيص مدى الحياة (expiresAt = 0)', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const testPubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const testPrivPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

    const { key } = generateLicenseKey(
      { storeId: 'LIFE01', expiresAt: 0, maxMobileDevices: 10 },
      testPrivPem
    );

    const parsed = parseAndVerifyKey(key, testPubPem);
    expect(parsed).not.toBeNull();
    expect(parsed?.expiresAt).toBe(0);
    expect(parsed?.maxMobileDevices).toBe(10);
    expect(parsed?.storeId).toBe('LIFE01');
  });

  it('يجب أن يقبل محتوى ملف JSON (.lic)', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const testPubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const testPrivPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

    const { key } = generateLicenseKey({ storeId: 'FILE01' }, testPrivPem);
    const licJson = JSON.stringify({
      storeId: 'FILE01',
      key,
      issuedAt: new Date().toISOString(),
    });

    const parsed = parseAndVerifyKey(licJson, testPubPem);
    expect(parsed).not.toBeNull();
    expect(parsed?.storeId).toBe('FILE01');
  });

  it('التحقق من توافق المفتاح الرسمي للمشروع مع المفتاح العام المدمج', () => {
    const privPath = resolve(process.cwd(), 'license-generator/private-key.pem');
    if (existsSync(privPath)) {
      const privPem = readFileSync(privPath, 'utf8');
      const { key } = generateLicenseKey({ storeId: 'OFFIC1', maxMobileDevices: 8 }, privPem);

      const parsed = parseAndVerifyKey(key, PUBLIC_KEY_PEM);
      expect(parsed).not.toBeNull();
      expect(parsed?.storeId).toBe('OFFIC1');
      expect(parsed?.maxMobileDevices).toBe(8);
    }
  });
});
