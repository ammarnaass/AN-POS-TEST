// توليد بصمات SHA-256 لحزم التثبيت في مجلد release/
// يُستخدم في مسار CI/CD (A6) للتحقق من سلامة الملفات ومطابقتها قبل التنزيل

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const releaseDir = path.resolve('release');

if (!fs.existsSync(releaseDir)) {
  console.log('[checksums] مجلد release غير موجود بعد. تخطي توليد البصمات.');
  process.exit(0);
}

const files = fs.readdirSync(releaseDir).filter((file) => {
  return (
    file.endsWith('.exe') ||
    file.endsWith('.msi') ||
    file.endsWith('.msix') ||
    file.endsWith('.appx') ||
    file.endsWith('.blockmap') ||
    file.endsWith('.zip')
  );
});

if (files.length === 0) {
  console.log('[checksums] لم يتم العثور على ملفات تنفيذية في release/.');
  process.exit(0);
}

const lines = [];

for (const file of files.sort()) {
  const filePath = path.join(releaseDir, file);
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  lines.push(`${hash}  ${file}`);
  console.log(`[checksums] ${file}: ${hash}`);
}

const outputPath = path.join(releaseDir, 'SHA256SUMS.txt');
fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
console.log(`[checksums] ✅ تم حفظ البصمات بنجاح في: ${outputPath}`);
