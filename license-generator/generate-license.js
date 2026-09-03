// أداة توليد مفاتيح التفعيل الموقعة رقمياً لعملاء AN POS
// تشغل هذه الأداة من قبل الناشر عند كل عملية بيع / اشتراك.

import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {Object} LicenseOptions
 * @property {string} storeId - معرّف المتجر، حتى 6 أحرف (مثال: ST0001)
 * @property {number} [expiresAt] - تاريخ الانتهاء كـ Unix Timestamp بالثواني (0 = مدى الحياة)
 * @property {number} [maxMobileDevices] - الحد الأقصى لأجهزة الهاتف المتزامنة (افتراضي: 5)
 * @property {number} [issuedAt] - تاريخ الإصدار بالثواني (افتراضي: الآن)
 * @property {number} [flags] - ميزات إضافية / رايات (افتراضي: 0)
 */

/**
 * توليد مفتاح ترخيص موقّع
 * @param {LicenseOptions} opts 
 * @param {string} [privateKeyPem] 
 * @returns {{ key: string, rawBase64: string }}
 */
export function generateLicenseKey(opts, privateKeyPem) {
  let privPem = privateKeyPem;
  if (!privPem) {
    const privPath = resolve(__dirname, 'private-key.pem');
    if (!existsSync(privPath)) {
      throw new Error('لم يتم العثور على private-key.pem. يرجى تشغيل generate-keypair.js أولاً.');
    }
    privPem = readFileSync(privPath, 'utf8');
  }

  const privateKey = createPrivateKey(privPem);

  // تجهيز الـ Binary Payload (20 بايت)
  const buffer = Buffer.alloc(20);
  const cleanStoreId = (opts.storeId || 'ST0001').toUpperCase().padEnd(6, '0').slice(0, 6);
  buffer.write(cleanStoreId, 0, 6, 'ascii');
  buffer.writeUInt32LE(opts.expiresAt || 0, 6);
  buffer.writeUInt16LE(opts.maxMobileDevices ?? 5, 10);
  buffer.writeUInt32LE(opts.issuedAt || Math.floor(Date.now() / 1000), 12);
  buffer.writeUInt32LE(opts.flags || 0, 16);

  // التوقيع الرقمي بمفتاح Ed25519 الخاص (64 بايت)
  const signature = sign(null, buffer, privateKey);

  // دمج البيانات مع التوقيع (20 + 64 = 84 بايت)
  const fullPayload = Buffer.concat([buffer, signature]);
  const rawBase64 = fullPayload.toString('base64');

  // تقسيم لمجموعات 5 أحرف بفواصل
  const chunks = rawBase64.match(/.{1,5}/g) ?? [rawBase64];
  const formattedKey = `ANPS-${chunks.join('-')}`;

  return {
    key: formattedKey,
    rawBase64,
  };
}

// تشغيل مباشر من سطر الأوامر CLI
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const storeId = args[0] || 'ST0001';
  const days = args[1] ? Number.parseInt(args[1], 10) : 0; // 0 = lifetime
  const maxDevices = args[2] ? Number.parseInt(args[2], 10) : 5;

  const expiresAt = days > 0 ? Math.floor(Date.now() / 1000) + days * 86400 : 0;

  try {
    const result = generateLicenseKey({
      storeId,
      expiresAt,
      maxMobileDevices: maxDevices,
    });

    console.log('\n======================================================');
    console.log('🎉 تم إصدار مفتاح ترخيص جديد بنجاح:');
    console.log('======================================================');
    console.log(`المتجر:              ${storeId}`);
    console.log(`نوع الترخيص:         ${expiresAt === 0 ? 'مدى الحياة (Lifetime)' : `${days} يوم (ينتهي في ${new Date(expiresAt * 1000).toLocaleDateString('ar-EG')})`}`);
    console.log(`الحد الأقصى للجوال:  ${maxDevices} أجهزة`);
    console.log('------------------------------------------------------');
    console.log('🔑 كود التفعيل (أرسله للعميل):');
    console.log(result.key);
    console.log('------------------------------------------------------\n');

    // تصدير ملف .lic اختياري
    const licPath = resolve(__dirname, `${storeId}.lic`);
    writeFileSync(licPath, JSON.stringify({
      storeId,
      expiresAt,
      maxMobileDevices: maxDevices,
      key: result.key,
      issuedAt: new Date().toISOString(),
    }, null, 2));
    console.log(`💾 تم حفظ ملف الترخيص أيضاً في: ${licPath}\n`);
  } catch (err) {
    console.error('❌ خطأ في توليد المفتاح:', err.message);
  }
}
