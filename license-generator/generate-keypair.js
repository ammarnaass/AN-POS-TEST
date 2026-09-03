// أداة توليد زوج مفاتيح Ed25519 (المفتاح العام والمفتاح الخاص)
// يُشغل هذا السكربت مرة واحدة فقط من قبل الناشر.
// المفتاح الخاص (private-key.pem) سري جداً ويبقى عند الناشر فقط!
// المفتاح العام (public-key.pem) يُدمج في تطبيق AN POS Desktop.

import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pubPath = resolve(__dirname, 'public-key.pem');
const privPath = resolve(__dirname, 'private-key.pem');

if (existsSync(privPath) && process.argv[2] !== '--force') {
  console.log('⚠️ تم العثور على زوج مفاتيح موجود بالفعل.');
  console.log('إذا كنت ترغب في إعادة توليد مفاتيح جديدة واستبدال الحالية، شغل السكربت مع الوسيط --force');
  process.exit(0);
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

writeFileSync(pubPath, pubPem, { mode: 0o644 });
writeFileSync(privPath, privPem, { mode: 0o600 });

console.log('✅ تم توليد زوج المفاتيح بنجاح:');
console.log('--------------------------------------------------');
console.log('📌 المفتاح العام (Public Key - يُدمج في التطبيق):');
console.log(pubPem);
console.log('--------------------------------------------------');
console.log('🔒 المفتاح الخاص تم حفظه بأمان في: license-generator/private-key.pem');
