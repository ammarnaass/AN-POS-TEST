// سكربت إنشاء حزمة التثبيت الذري فائق الاعتمادية (Atomic A/B Bundle Packager)
// يقوم بتجميع ملفات التطبيق غير القابلة للتغيير مع سكريبتات التثبيت ومولد البصمات

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const rootDir = path.resolve('.');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const version = pkg.version || '3.0.0';
const productName = pkg.build?.productName || 'AN POS';
const releaseDir = path.join(rootDir, 'release');
const unpackedDir = path.join(releaseDir, 'win-unpacked');
const targetBundleDir = path.join(releaseDir, `AN-POS-Atomic-v${version}`);

console.log('=============================================================');
console.log(`📦 إنشاء حزمة التثبيت الذري لـ ${productName} (الإصدار: v${version})`);
console.log('=============================================================');

// 1. التحقق من وجود مجلد release
fs.mkdirSync(releaseDir, { recursive: true });

// 2. فحص ما إذا كان البناء مطلوباً
const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');

if (!skipBuild) {
  console.log('\n[1/4] بناء ملفات Electron و Vite...');
  try {
    execSync('npx electron-vite build --config electron.vite.config.ts', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ فشل بناء electron-vite:', err);
    process.exit(1);
  }

  // في بيئة ويندوز أو لينكس (إذا كان electron-builder متاحاً)
  if (args.includes('--dir') || args.includes('--full')) {
    console.log('\n[2/4] تجميع ملفات win-unpacked عبر electron-builder...');
    try {
      execSync('npx electron-builder --win --dir --x64', { stdio: 'inherit' });
    } catch (err) {
      console.warn('⚠️ تحذير: تعذر تشغيل electron-builder --win مباشرة (طبيعي في بعض بيئات لينكس):', err.message);
    }
  }
} else {
  console.log('\n[1/4] تخطي مرحلة البناء بناءً على الراية --skip-build.');
}

// 3. تجهيز مجلد الحزمة الذرية
console.log(`\n[3/4] تجهيز حزمة التوزيع في: ${targetBundleDir}`);
if (fs.existsSync(targetBundleDir)) {
  fs.rmSync(targetBundleDir, { recursive: true, force: true });
}
fs.mkdirSync(targetBundleDir, { recursive: true });

const payloadDir = path.join(targetBundleDir, 'payload');
fs.mkdirSync(payloadDir, { recursive: true });

// نسخ الملفات غير القابلة للتغيير
if (fs.existsSync(unpackedDir)) {
  console.log(`  -> نسخ محتويات win-unpacked إلى payload...`);
  copyDirRecursive(unpackedDir, payloadDir);
} else {
  console.log(`  -> إنشاء هيكل payload افتراضي من out/ لعدم وجود win-unpacked بعد...`);
  const outDir = path.join(rootDir, 'out');
  if (fs.existsSync(outDir)) {
    copyDirRecursive(outDir, path.join(payloadDir, 'out'));
  }
  // ملف تنفيذي وهمي أو ملفات المورد
  fs.writeFileSync(path.join(payloadDir, 'package.json'), JSON.stringify({ name: pkg.name, version: pkg.version }, null, 2));
}

// 4. توليد ملف البصمات manifest.json لكل ملفات الـ payload
console.log('  -> توليد بصمات SHA-256 للملفات في manifest.json...');
const manifestFiles = {};
function hashFiles(dir, relativeTo) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(relativeTo, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      hashFiles(fullPath, relativeTo);
    } else {
      const buffer = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      manifestFiles[relPath] = hash;
    }
  }
}
hashFiles(payloadDir, payloadDir);

const manifestData = {
  appName: productName,
  version: version,
  generatedAt: new Date().toISOString(),
  filesCount: Object.keys(manifestFiles).length,
  files: manifestFiles,
};

fs.writeFileSync(
  path.join(targetBundleDir, 'manifest.json'),
  JSON.stringify(manifestData, null, 2),
  'utf-8'
);
fs.writeFileSync(
  path.join(payloadDir, 'manifest.json'),
  JSON.stringify(manifestData, null, 2),
  'utf-8'
);

// 5. نسخ سكريبتات التثبيت الذرية إلى مجلد الحزمة الرئيسي
console.log('  -> نسخ سكريبتات التثبيت والـ bat...');
const installerScripts = [
  'slot-manager.ps1',
  'install-cold.ps1',
  'install.bat',
];

for (const script of installerScripts) {
  const src = path.join(rootDir, 'scripts', 'installer', script);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(targetBundleDir, script));
  }
}

// نسخ مجلد الواجهة الرسومية الحديثة (Modern Splash GUI)
const splashSrc = path.join(rootDir, 'scripts', 'installer', 'splash');
if (fs.existsSync(splashSrc)) {
  console.log('  -> نسخ مجلد الواجهة الرسومية (Splash GUI)...');
  copyDirRecursive(splashSrc, path.join(targetBundleDir, 'splash'));
}

// 6. ملف تعليمات التشغيل السريع
const instructions = `========================================================
نظام نقاط البيع AN POS - حزمة التثبيت الذري فائق الاعتمادية
الإصدار: v${version}
========================================================

طريقة التثبيت بنقرة واحدة:
1. انقر نقراً مزدوجاً على الملف: install.bat
2. سيكتمل التثبيت في ثوانٍ معدودة داخل مساحة المستخدم دون طلب أي صلاحيات مدير (No UAC).
3. سيفتح البرنامج تلقائياً ويتم وضع اختصار على سطح المكتب.

للتثبيت اليدوي أو عبر PowerShell:
  powershell -ExecutionPolicy Bypass -File .\\install-cold.ps1
`;

fs.writeFileSync(path.join(targetBundleDir, 'تعليمات التثبيت.txt'), instructions, 'utf-8');

console.log('\n[4/4] ✅ اكتمل تجهيز الحزمة بنجاح!');
console.log(`📁 المسار النهائي: ${targetBundleDir}`);
console.log(`📊 إجمالي الملفات المفهرسة: ${manifestData.filesCount}`);
console.log('=============================================================');

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
