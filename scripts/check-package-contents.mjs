// فحص محتويات الحزمة بعد البناء لمنع تسرب ثنائيات المنصات الأخرى (A5 - Clean Package Verifier)
// يفحص مجلد release/win-unpacked لضمان خلوه تماماً من حزم linux أو darwin

import fs from 'node:fs';
import path from 'node:path';

const unpackedDir = path.resolve('release/win-unpacked/resources/app.asar.unpacked');

if (!fs.existsSync(unpackedDir)) {
  console.log('[package-check] مجلد app.asar.unpacked غير موجود (لم يتم بناء win-unpacked بعد). تخطي الفحص.');
  process.exit(0);
}

function scanDir(currentDir, matches = []) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const lowerName = entry.name.toLowerCase();

    if (
      lowerName.includes('-linux-') ||
      lowerName.includes('-darwin-') ||
      lowerName.includes('-android-') ||
      lowerName.includes('linux-x64') ||
      lowerName.includes('darwin-x64')
    ) {
      matches.push(fullPath);
    }

    if (entry.isDirectory()) {
      scanDir(fullPath, matches);
    }
  }
  return matches;
}

const forbidden = scanDir(unpackedDir);

if (forbidden.length > 0) {
  console.error('[package-check] ❌ تم اكتشاف ثنائيات تابعة لمنصات أخرى داخل حزمة ويندوز:');
  for (const item of forbidden) {
    console.error(`  - ${path.relative(path.resolve('release/win-unpacked'), item)}`);
  }
  console.error('[package-check] يجب تنظيف build.files واستبعاد المنصات غير المطلوبة لمنع تضخم حجم الحزمة.');
  process.exit(1);
}

console.log('[package-check] ✅ حزمة Windows نظيفة وخالية من ثنائيات Linux/Darwin.');
process.exit(0);
