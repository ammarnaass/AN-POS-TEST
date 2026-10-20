#!/usr/bin/env node
/**
 * سكربت إدارة وتحديث إصدار نظام AN POS
 * المصدر الموحد الوحيد للحقيقة (Single Source of Truth)
 *
 * الاستخدام:
 *   node scripts/set-version.mjs 2.5.7
 *   node scripts/set-version.mjs patch
 *   node scripts/set-version.mjs minor
 *   node scripts/set-version.mjs major
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkgPath = path.join(rootDir, 'package.json');
const lockPath = path.join(rootDir, 'package-lock.json');

if (!fs.existsSync(pkgPath)) {
  console.error('❌ خطأ: لم يتم العثور على ملف package.json!');
  process.exit(1);
}

const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
const pkg = JSON.parse(pkgRaw);
const currentVersion = pkg.version;

const arg = process.argv[2]?.trim();

function parseSemver(v) {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$/);
  if (!m) return null;
  return {
    major: parseInt(m[1], 10),
    minor: parseInt(m[2], 10),
    patch: parseInt(m[3], 10),
    prerelease: m[4] || '',
  };
}

function bumpVersion(current, type) {
  const parts = parseSemver(current);
  if (!parts) {
    throw new Error(`الإصدار الحالي (${current}) ليس بصيغة SemVer صالحة (X.Y.Z)`);
  }
  switch (type.toLowerCase()) {
    case 'patch':
      return `${parts.major}.${parts.minor}.${parts.patch + 1}`;
    case 'minor':
      return `${parts.major}.${parts.minor + 1}.0`;
    case 'major':
      return `${parts.major + 1}.0.0`;
    default:
      return null;
  }
}

if (!arg) {
  console.log(`\n📦 إصدار AN POS الحالي: \x1b[32mv${currentVersion}\x1b[0m`);
  console.log('\nطريقة الاستخدام:');
  console.log('  npm run set-version <version>    (مثال: npm run set-version 2.5.7)');
  console.log('  npm run bump:patch               (زيادة تلقائية: ' + bumpVersion(currentVersion, 'patch') + ')');
  console.log('  npm run bump:minor               (ترقية فرعية:   ' + bumpVersion(currentVersion, 'minor') + ')');
  console.log('  npm run bump:major               (ترقية رئيسية:  ' + bumpVersion(currentVersion, 'major') + ')\n');
  process.exit(0);
}

let targetVersion = null;
if (['patch', 'minor', 'major'].includes(arg.toLowerCase())) {
  targetVersion = bumpVersion(currentVersion, arg);
} else {
  const cleaned = arg.startsWith('v') ? arg.slice(1) : arg;
  if (!parseSemver(cleaned)) {
    console.error(`\x1b[31m❌ خطأ: الإصدار المطلوب "${arg}" ليس بصيغة SemVer صحيحة (مثال: 2.5.7 أو 2.6.0)\x1b[0m`);
    process.exit(1);
  }
  targetVersion = cleaned;
}

if (targetVersion === currentVersion) {
  console.log(`⚠️ الإصدار المطلوب (${targetVersion}) هو نفس الإصدار الحالي بالفعل.`);
  process.exit(0);
}

console.log(`\n🚀 جاري ترقية إصدار AN POS من \x1b[33mv${currentVersion}\x1b[0m إلى \x1b[32mv${targetVersion}\x1b[0m...`);

// 1. تحديث package.json مع الحفاظ على التنسيق الأصلي
pkg.version = targetVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
console.log('  ✅ تم تحديث package.json بنجاح.');

// 2. تحديث package-lock.json إذا وجد
if (fs.existsSync(lockPath)) {
  try {
    const lockRaw = fs.readFileSync(lockPath, 'utf-8');
    const lock = JSON.parse(lockRaw);
    lock.version = targetVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = targetVersion;
    }
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
    console.log('  ✅ تم تحديث وتزامن package-lock.json بنجاح.');
  } catch (lockErr) {
    console.warn('  ⚠️ تعذر تحديث package-lock.json تلقائياً:', lockErr.message);
  }
}

console.log('\n=============================================================');
console.log(`🎉 اكتمل التحديث بنجاح! الإصدار الجديد: \x1b[32mv${targetVersion}\x1b[0m`);
console.log('=============================================================');
console.log('ينعكس هذا الإصدار تلقائياً وفورياً على:');
console.log('  - واجهة المستخدم React (شاشة الدخول، ترويسات الكاشير، شاشة التحديثات)');
console.log('  - سجل التحديثات (Changelog) كإصدار حالي فعال');
console.log('  - العملية الرئيسية Electron (app.getVersion و config.json)');
console.log('  - خادم الشبكة المحلية LAN والمزامنة (x-app-version)');
console.log(`  - حزم التثبيت NSIS والملفات التنفيذية: (AN POS-Setup-${targetVersion}-*.exe)`);
console.log('=============================================================\n');
