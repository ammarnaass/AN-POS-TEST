// توليد شهادة توقيع رقمي محلية ذاتية التوقيع (Self-Signed Code Signing Certificate)
// تُستخدم لاختبار مسار التوقيع الرقمي (A1) محلياً وفي بيئات التطوير دون الحاجة لشراء شهادة تجارية فوراً

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const buildDir = path.resolve('build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const certPath = path.join(buildDir, 'dev-cert.pfx');
const certPassword = process.env.DEV_CERT_PASSWORD || 'anpos-dev-cert-2026';
const subject = process.env.DEV_CERT_SUBJECT || '/CN=AN POS Development Test/O=AN POS/C=LY';

console.log('===========================================================');
console.log('🔐 [code-signing] توليد شهادة توقيع رقمي تجريبية (Dev Cert)');
console.log('===========================================================');

function generateWithOpenSSL() {
  const tempKey = path.join(buildDir, 'temp-key.pem');
  const tempCert = path.join(buildDir, 'temp-cert.pem');

  try {
    console.log('[code-signing] جارٍ توليد المفتاح والشهادة باستخدام OpenSSL...');
    
    // 1. توليد المفتاح الخاص والشهادة مع extendedKeyUsage = codeSigning
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${tempKey}" -out "${tempCert}" -days 730 -nodes -subj "${subject}" -addext "extendedKeyUsage = codeSigning"`,
      { stdio: 'pipe' }
    );

    // 2. تصدير إلى صيغة PKCS#12 (.pfx)
    execSync(
      `openssl pkcs12 -export -out "${certPath}" -inkey "${tempKey}" -in "${tempCert}" -passout pass:${certPassword}`,
      { stdio: 'pipe' }
    );

    return true;
  } catch (err) {
    console.warn('[code-signing] تعذر التوليد عبر OpenSSL:', err.message);
    return false;
  } finally {
    // تنظيف الملفات المؤقتة
    if (fs.existsSync(tempKey)) fs.unlinkSync(tempKey);
    if (fs.existsSync(tempCert)) fs.unlinkSync(tempCert);
  }
}

function generateWithPowerShell() {
  try {
    console.log('[code-signing] محاولة التوليد عبر PowerShell (بيئة ويندوز)...');
    const psScript = `
      $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=AN POS Development Test, O=AN POS, C=LY" -CertStoreLocation "Cert:\\CurrentUser\\My" -NotAfter (Get-Date).AddYears(2);
      $pwd = ConvertTo-SecureString -String "${certPassword}" -Force -AsPlainText;
      Export-PfxCertificate -Cert $cert -FilePath "${certPath}" -Password $pwd | Out-Null;
    `;
    execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, { stdio: 'pipe' });
    return true;
  } catch (err) {
    console.warn('[code-signing] تعذر التوليد عبر PowerShell:', err.message);
    return false;
  }
}

const success = generateWithOpenSSL() || (process.platform === 'win32' && generateWithPowerShell());

if (!success || !fs.existsSync(certPath)) {
  console.error('❌ [code-signing] فشل توليد شهادة التوقيع الرقمي التجريبية.');
  console.error('يرجى التأكد من تثبيت OpenSSL أو تشغيل الأمر من بيئة ويندوز مزودة بـ PowerShell.');
  process.exit(1);
}

const stats = fs.statSync(certPath);
console.log(`✅ [code-signing] تم إنشاء الشهادة بنجاح!`);
console.log(`📁 المسار: ${certPath} (${stats.size} bytes)`);
console.log(`🔑 كلمة المرور الافتراضية: ${certPassword}`);
console.log('');
console.log('-----------------------------------------------------------');
console.log('📌 كيفية الاستخدام للبناء والتوقيع المحلي:');
console.log('-----------------------------------------------------------');
console.log('1. تعيين المتغيرات في سطر الأوامر:');
if (process.platform === 'win32') {
  console.log(`   $env:CSC_LINK="${certPath}"`);
  console.log(`   $env:CSC_KEY_PASSWORD="${certPassword}"`);
} else {
  console.log(`   export CSC_LINK="${certPath}"`);
  console.log(`   export CSC_KEY_PASSWORD="${certPassword}"`);
}
console.log('');
console.log('2. تشغيل البناء مع التوقيع:');
console.log('   npm run package:win:signed');
console.log('');
console.log('3. للتحقق من التوقيع بعد البناء:');
console.log('   npm run verify:signatures');
console.log('');
console.log('💡 لتثبيت الشهادة على جهاز ويندوز لاختبار زوال تحذير SmartScreen:');
console.log('   - انقر مرتين على ملف build/dev-cert.pfx');
console.log('   - اختر Current User أو Local Machine ثم أدخل كلمة المرور');
console.log('   - ضع الشهادة في مخزن: "Trusted Root Certification Authorities" (جهات إصدار الشهادات الجذرية الموثوقة)');
console.log('-----------------------------------------------------------');
