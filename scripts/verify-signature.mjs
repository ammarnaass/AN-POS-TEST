// فحص وتدقيق التوقيع الرقمي (A1 - Code Signing Verifier)
// يفحص جميع الملفات التنفيذية الناتجة في release/ للتحقق من وجود توقيع Authenticode وبيانات الشهادة

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const releaseDir = path.resolve('release');
const args = process.argv.slice(2);
const requireSigned = args.includes('--require-signed');

console.log('===========================================================');
console.log('🔍 [code-signing] فحص وتدقيق التوقيع الرقمي Authenticode');
console.log('===========================================================');

if (!fs.existsSync(releaseDir)) {
  console.log('[signature-check] مجلد release غير موجود. تخطي الفحص.');
  process.exit(0);
}

// جمع الملفات التنفيذية
function collectExecutables() {
  const files = [];

  // الملفات التنفيذية وحزم التثبيت في release/ مباشرة (.exe و .msi و .msix و .appx)
  const rootEntries = fs.readdirSync(releaseDir, { withFileTypes: true });
  for (const entry of rootEntries) {
    const lower = entry.name.toLowerCase();
    if (
      entry.isFile() &&
      (lower.endsWith('.exe') ||
        lower.endsWith('.msi') ||
        lower.endsWith('.msix') ||
        lower.endsWith('.appx'))
    ) {
      files.push(path.join(releaseDir, entry.name));
    }
  }

  // التطبيق الرئيسي داخل win-unpacked
  const unpackedExe = path.join(releaseDir, 'win-unpacked', 'AN POS.exe');
  if (fs.existsSync(unpackedExe)) {
    files.push(unpackedExe);
  }

  return files;
}

/**
 * فحص ترويسة PE / MSI / MSIX لاكتشاف توقيع Authenticode
 */
function inspectPeSignature(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const headerBuf = Buffer.alloc(1024);
    fs.readSync(fd, headerBuf, 0, 1024, 0);

    const lowerPath = filePath.toLowerCase();

    // التحقق مما إذا كانت الحزمة من نوع MSI (Compound Storage)
    if (lowerPath.endsWith('.msi')) {
      fs.closeSync(fd);
      const isMsiHeader = headerBuf.readUInt32LE(0) === 0xe011cfd0;
      return {
        isPe: isMsiHeader,
        arch: 'MSI (Windows Installer Package)',
        isSigned: false,
        certOffset: 0,
        certSize: 0
      };
    }

    // التحقق مما إذا كانت الحزمة من نوع MSIX / AppX (ZIP OPC Package)
    if (lowerPath.endsWith('.msix') || lowerPath.endsWith('.appx')) {
      const isZip = headerBuf.readUInt32LE(0) === 0x04034b50;
      if (!isZip) {
        fs.closeSync(fd);
        return { isPe: false, error: 'ليس ملف MSIX/ZIP صالح' };
      }
      const stat = fs.statSync(filePath);
      const endSize = Math.min(stat.size, 128 * 1024);
      const endBuf = Buffer.alloc(endSize);
      fs.readSync(fd, endBuf, 0, endSize, stat.size - endSize);
      fs.closeSync(fd);

      const hasSignature = endBuf.includes('AppxSignature.p7x');
      return {
        isPe: true,
        arch: 'MSIX (Windows App Package)',
        isSigned: hasSignature,
        certOffset: 0,
        certSize: hasSignature ? 1 : 0,
        certRevision: 0,
        certType: hasSignature ? 0x0002 : null,
        isPkcsSignedData: hasSignature
      };
    }

    // التحقق من ترويسة DOS MZ
    if (headerBuf.readUInt16LE(0) !== 0x5a4d) {
      fs.closeSync(fd);
      return { isPe: false, error: 'ليس ملف PE صالح (لا يحتوي على توقيع MZ)' };
    }

    // إزاحة ترويسة PE
    const peOffset = headerBuf.readUInt32LE(0x3c);
    
    // قراءة ترويسة PE والمواصفات
    const peBuf = Buffer.alloc(512);
    fs.readSync(fd, peBuf, 0, 512, peOffset);
    fs.closeSync(fd);

    if (peBuf.readUInt32LE(0) !== 0x00004550) {
      return { isPe: false, error: 'توقيع PE غير صحيح' };
    }

    const magic = peBuf.readUInt16LE(24);
    const is64 = magic === 0x20b;
    const is32 = magic === 0x10b;

    if (!is64 && !is32) {
      return { isPe: false, error: 'Magic number غير معروف في ترويسة Optional Header' };
    }

    // موقع Security Directory (Index 4 في Data Directories)
    const dataDirBase = 24 + (is64 ? 112 : 96);
    const secDirOffset = dataDirBase + 32;

    const certOffset = peBuf.readUInt32LE(secDirOffset);
    const certSize = peBuf.readUInt32LE(secDirOffset + 4);

    const isSigned = certOffset > 0 && certSize > 0;

    let certType = null;
    let certRevision = null;

    if (isSigned) {
      const certHeader = Buffer.alloc(8);
      const certFd = fs.openSync(filePath, 'r');
      fs.readSync(certFd, certHeader, 0, 8, certOffset);
      fs.closeSync(certFd);

      const _dwLength = certHeader.readUInt32LE(0);
      certRevision = certHeader.readUInt16LE(4);
      certType = certHeader.readUInt16LE(6);
    }

    return {
      isPe: true,
      arch: is64 ? 'x64' : 'x86 (ia32)',
      isSigned,
      certOffset,
      certSize,
      certRevision,
      certType,
      isPkcsSignedData: certType === 0x0002
    };
  } catch (err) {
    return { isPe: false, error: err.message };
  }
}

/**
 * فحص التوقيع عبر PowerShell في بيئة ويندوز للحصول على تفاصيل إضافية
 */
function inspectWithPowerShell(filePath) {
  if (process.platform !== 'win32') return null;

  try {
    const cmd = `powershell -NoProfile -Command "Get-AuthenticodeSignature -FilePath '${filePath}' | Select-Object Status, StatusMessage, @{Name='Subject'; Expression={$_.SignerCertificate.Subject}} | ConvertTo-Json"`;
    const stdout = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
    const result = JSON.parse(stdout);
    return {
      status: result.Status,
      statusMessage: result.StatusMessage,
      subject: result.Subject
    };
  } catch {
    return null;
  }
}

const targetFiles = collectExecutables();

if (targetFiles.length === 0) {
  console.log('[signature-check] لم يتم العثور على ملفات تنفيذية في release/.');
  process.exit(0);
}

let signedCount = 0;
let unsignedCount = 0;

console.log(`تم العثور على ${targetFiles.length} ملفاً تنفيذياً:\n`);

for (const filePath of targetFiles) {
  const relativePath = path.relative(releaseDir, filePath);
  const peInfo = inspectPeSignature(filePath);

  if (!peInfo.isPe) {
    console.log(`⚠️  ${relativePath}: خطأ في فحص PE (${peInfo.error})`);
    continue;
  }

  const psInfo = inspectWithPowerShell(filePath);

  if (peInfo.isSigned) {
    signedCount++;
    console.log(`✅ [موقّع] ${relativePath}`);
    console.log(`   - المعمارية: ${peInfo.arch}`);
    if (peInfo.certSize > 1) {
      console.log(`   - جدول الشهادات: ${peInfo.certSize} bytes (Offset: 0x${peInfo.certOffset.toString(16)})`);
      console.log(`   - نوع التوقيع: PKCS#7 SignedData (Revision: 0x${peInfo.certRevision.toString(16)})`);
    } else {
      console.log(`   - نوع التوقيع: حزمة AppX/MSIX معتمدة (AppxSignature.p7x متوفرة)`);
    }
    if (psInfo) {
      console.log(`   - حالة النظام (Windows): ${psInfo.status} (${psInfo.statusMessage || 'OK'})`);
      if (psInfo.subject) console.log(`   - شهادة الناشر: ${psInfo.subject}`);
    }
  } else {
    unsignedCount++;
    console.log(`❌ [غير موقّع] ${relativePath}`);
    console.log(`   - المعمارية: ${peInfo.arch}`);
    console.log(`   - جدول الشهادات: فارغ (لا يوجد توقيع رقمي)`);
    if (psInfo) {
      console.log(`   - حالة النظام (Windows): ${psInfo.status}`);
    }
  }
  console.log('');
}

console.log('-----------------------------------------------------------');
console.log(`📊 النتيجة الإجمالية: ${signedCount} موقّع | ${unsignedCount} غير موقّع`);
console.log('-----------------------------------------------------------');

if (requireSigned && unsignedCount > 0) {
  console.error(`❌ [code-signing] فشل التحقق: تم طلب شرط التوقيع الإلزامي (--require-signed) ووجد ${unsignedCount} ملف غير موقّع.`);
  process.exit(1);
}

if (signedCount > 0 && unsignedCount === 0) {
  console.log('🎉 جميع الملفات التنفيذية موقّعة برمجياً وجاهزة للتوزيع!');
} else if (signedCount === 0) {
  console.log('ℹ️ الملفات حالياً غير موقّعة (إصدار عادي بدون شهادة).');
  console.log('لتفعيل التوقيع، عيّن متغيرات CSC_LINK و CSC_KEY_PASSWORD ثم أعد البناء.');
}

process.exit(0);
