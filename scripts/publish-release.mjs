#!/usr/bin/env node
/**
 * منظومة النشر والإصدار الآلي لنظام AN POS (Publish Release System)
 * 
 * الميزات:
 * 1. دعم الترقية التفاعلية أو المباشرة (patch, minor, major, custom version).
 * 2. قراءة وحفظ التوكن GH_TOKEN تلقائياً من ملف .env المحلي.
 * 3. فحص صلاحية التوكن والاتصال بمستودع GitHub قبل البدء.
 * 4. فحوصات الجودة الآلية (Typecheck & Unit Tests).
 * 5. تحديث إصدار المشروع (package.json و package-lock.json).
 * 6. إنشاء Git Commit و Git Tag ودفعها إلى المستودع.
 * 7. بناء ونشر الحزم التنفيذية (NSIS Setup & Portable) إلى GitHub Releases.
 * 8. توليد ورفع البصمات الأمنية SHA256SUMS.txt كأصل من أصول الإصدار.
 * 9. عرض بطاقة ختامية مع روابط التحميل المباشرة للملفات.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkgPath = path.join(rootDir, 'package.json');
const envPath = path.join(rootDir, '.env');
const releaseDir = path.join(rootDir, 'release');

// الألوان في الطرفية
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(msg) {
  console.log(msg);
}

function logSuccess(msg) {
  console.log(`${colors.green}✔ ${msg}${colors.reset}`);
}

function logInfo(msg) {
  console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`);
}

function logWarn(msg) {
  console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`);
}

function logError(msg) {
  console.error(`${colors.red}✖ ${msg}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + colors.bright + colors.blue + '═'.repeat(64) + colors.reset);
  console.log(`  ${colors.bright}${colors.cyan}🚀 AN POS — ${title}${colors.reset}`);
  console.log(colors.bright + colors.blue + '═'.repeat(64) + colors.reset + '\n');
}

// 1. تحميل متغيرات البيئة من ملف .env
function loadLocalEnv() {
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// إنشاء جلسة قراءة من سطر الأوامر
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// تشغيل أمر طرفية مع التمرير المباشر
function run(cmd, envExtra = {}) {
  try {
    execSync(cmd, {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...envExtra,
      },
    });
    return true;
  } catch (err) {
    return false;
  }
}

// التحقق من صحة التوكن والاتصال بـ GitHub
async function verifyGitHubAccess(token, owner, repo) {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'AN-POS-Release-Automation',
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (res.status === 200) {
      const data = await res.json();
      return { ok: true, repoName: data.full_name, permissions: data.permissions };
    }
    if (res.status === 401) {
      return { ok: false, error: 'رمز التوكن غير صالح أو منتهي الصلاحية (Bad credentials).' };
    }
    if (res.status === 404) {
      return { ok: false, error: `المستودع ${owner}/${repo} غير موجود أو لا يملك التوكن صلاحية الوصول إليه.` };
    }
    return { ok: false, error: `استجابة غير متوقعة من GitHub (كود: ${res.status})` };
  } catch (err) {
    return { ok: false, error: `فشل الاتصال بـ GitHub: ${err.message}` };
  }
}

// رفع ملف إضافي إلى أصول الإصدار (Release Assets)
async function uploadReleaseAsset(token, owner, repo, tag, filePath) {
  const fileName = path.basename(filePath);
  if (!fs.existsSync(filePath)) {
    logWarn(`الملف غير موجود لرفعه: ${filePath}`);
    return false;
  }

  try {
    // 1. جلب تفاصيل الإصدار عبر الـ tag
    const releaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'AN-POS-Release-Automation',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!releaseRes.ok) {
      logWarn(`تعذر جلب تفاصيل الإصدار ${tag} من GitHub (كود: ${releaseRes.status})`);
      return false;
    }

    const releaseData = await releaseRes.json();
    const releaseId = releaseData.id;

    // 2. إذا كان الملف موجوداً مسبقاً، نحذفه لتحديثه
    const existingAsset = releaseData.assets?.find((a) => a.name === fileName);
    if (existingAsset) {
      await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'AN-POS-Release-Automation',
        },
      });
    }

    // 3. رفع الملف الجديد
    const fileContent = fs.readFileSync(filePath);
    const uploadRes = await fetch(
      `https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(fileName)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
          'Content-Length': fileContent.length.toString(),
          'User-Agent': 'AN-POS-Release-Automation',
        },
        body: fileContent,
      }
    );

    return uploadRes.ok;
  } catch (err) {
    logWarn(`حدث خطأ أثناء رفع الأصل ${fileName}: ${err.message}`);
    return false;
  }
}

// الدالة الرئيسية للمنظومة
async function main() {
  logHeader('منظومة النشر والإصدار الآلي (Publish Release System)');

  // 1. فحص وجود package.json
  if (!fs.existsSync(pkgPath)) {
    logError('ملف package.json غير موجود في مسار المشروع!');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const currentVersion = pkg.version || '3.0.0';
  const owner = pkg.build?.publish?.[0]?.owner || 'ammarnaass';
  const repo = pkg.build?.publish?.[0]?.repo || 'AN-POS-TEST';

  logInfo(`المستودع المستهدف: ${colors.bright}${owner}/${repo}${colors.reset}`);
  logInfo(`الإصدار الحالي في المشروع: ${colors.bright}v${currentVersion}${colors.reset}`);

  // 2. تحميل والتحقق من GH_TOKEN
  loadLocalEnv();
  let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  const rl = createPrompt();

  if (!token) {
    console.log(`\n${colors.yellow}لم يتم العثور على رمز GH_TOKEN في متغيرات البيئة أو في ملف .env${colors.reset}`);
    token = (await askQuestion(rl, '🔑 يرجى لصق GitHub Personal Access Token: ')).trim();

    if (!token) {
      logError('لا يمكن المتابعة بدون رمز GH_TOKEN صالح.');
      rl.close();
      process.exit(1);
    }

    const saveChoice = (await askQuestion(rl, '💾 هل تريد حفظ الرمز في ملف .env المحلي لاستخدامه تلقائياً مستقبلاً؟ (Y/n): ')).trim().toLowerCase();
    if (saveChoice === '' || saveChoice === 'y' || saveChoice === 'yes') {
      fs.appendFileSync(envPath, `\nGH_TOKEN="${token}"\n`, 'utf-8');
      logSuccess('تم حفظ الرمز في ملف .env بنجاح (وهو محمي في .gitignore).');
    }
  }

  // 3. التحقق من صلاحية التوكن مع GitHub
  logInfo('جاري التحقق من صلاحية التوكن والاتصال بمستودع GitHub...');
  const accessCheck = await verifyGitHubAccess(token, owner, repo);
  if (!accessCheck.ok) {
    logError(accessCheck.error);
    rl.close();
    process.exit(1);
  }
  logSuccess(`الاتصال سليم بمستودع: ${accessCheck.repoName}`);

  // 4. معالجة خيارات سطر الأوامر (Arguments)
  const args = process.argv.slice(2);
  const skipTests = args.includes('--skip-tests');
  const isCurrentOnly = args.includes('--current');
  let targetArg = args.find((a) => !a.startsWith('--'));

  let targetVersion = currentVersion;
  let needsBump = false;

  if (isCurrentOnly) {
    targetVersion = currentVersion;
    logInfo(`تم اختيار إعادة بناء ونشر الإصدار الحالي: v${targetVersion}`);
  } else if (targetArg) {
    if (['patch', 'minor', 'major'].includes(targetArg.toLowerCase())) {
      const parts = currentVersion.split('.').map(Number);
      if (targetArg.toLowerCase() === 'patch') parts[2] = (parts[2] || 0) + 1;
      if (targetArg.toLowerCase() === 'minor') { parts[1] = (parts[1] || 0) + 1; parts[2] = 0; }
      if (targetArg.toLowerCase() === 'major') { parts[0] = (parts[0] || 0) + 1; parts[1] = 0; parts[2] = 0; }
      targetVersion = parts.join('.');
      needsBump = true;
    } else {
      targetVersion = targetArg.startsWith('v') ? targetArg.slice(1) : targetArg;
      needsBump = targetVersion !== currentVersion;
    }
  } else {
    // قائمة تفاعلية لاختيار نوع الترقية
    const parts = currentVersion.split('.').map(Number);
    const patchVer = `${parts[0]}.${parts[1]}.${(parts[2] || 0) + 1}`;
    const minorVer = `${parts[0]}.${(parts[1] || 0) + 1}.0`;
    const majorVer = `${(parts[0] || 0) + 1}.0.0`;

    console.log('\nاختر نوع الإصدار المطلوب نشره:');
    console.log(`  1) ترقية فرعية صغيرة (Patch):  ${colors.green}v${patchVer}${colors.reset} (موصى بها لإصلاح الأخطاء)`);
    console.log(`  2) ترقية مميزات (Minor):       ${colors.green}v${minorVer}${colors.reset} (لإضافة مميزات جديدة متوافقة)`);
    console.log(`  3) ترقية رئيسية (Major):       ${colors.green}v${majorVer}${colors.reset} (لتغييرات معمارية كبرى)`);
    console.log(`  4) نشر الإصدار الحالي:         ${colors.green}v${currentVersion}${colors.reset} (إعادة البناء والرفع فقط)`);
    console.log('  5) إدخال رقم إصدار مخصص يدوياً');

    const choice = (await askQuestion(rl, '\n👉 أدخل رقم الخيار (1-5) [الافتراضي: 1]: ')).trim();

    if (choice === '2') {
      targetVersion = minorVer;
      needsBump = true;
    } else if (choice === '3') {
      targetVersion = majorVer;
      needsBump = true;
    } else if (choice === '4') {
      targetVersion = currentVersion;
      needsBump = false;
    } else if (choice === '5') {
      const customVer = (await askQuestion(rl, '📝 أدخل رقم الإصدار الجديد (مثال 3.0.2): ')).trim();
      targetVersion = customVer.startsWith('v') ? customVer.slice(1) : customVer;
      needsBump = targetVersion !== currentVersion;
    } else {
      // Default to 1 (Patch)
      targetVersion = patchVer;
      needsBump = true;
    }
  }

  const confirmMsg = `\nهل أنت متأكد من بناء ونشر الإصدار ${colors.bright}${colors.green}v${targetVersion}${colors.reset} إلى GitHub Releases؟ (Y/n): `;
  const confirm = (await askQuestion(rl, confirmMsg)).trim().toLowerCase();
  rl.close();

  if (confirm !== '' && confirm !== 'y' && confirm !== 'yes') {
    logWarn('تم إلغاء عملية النشر من قبل المستخدم.');
    process.exit(0);
  }

  // 5. فحوصات الجودة الآلية (Typecheck & Tests)
  if (!skipTests) {
    logInfo('جاري تشغيل الفحص البرمجي (TypeScript Typecheck)...');
    const typecheckPassed = run('npm run typecheck');
    if (!typecheckPassed) {
      logError('فشل فحص الأنواع TypeScript. يرجى معالجة الأخطاء قبل النشر.');
      process.exit(1);
    }
    logSuccess('فحص TypeScript Typecheck اكتمل بنجاح دون أخطاء.');

    logInfo('جاري تشغيل حزمة الاختبارات الآلية (Unit Tests)...');
    const testsPassed = run('npm test');
    if (!testsPassed) {
      logError('فشلت بعض الاختبارات الآلية. يرجى التأكد من اجتياز جميع الاختبارات قبل النشر.');
      process.exit(1);
    }
    logSuccess('جميع الاختبارات الآلية اجتازت بنجاح.');
  } else {
    logWarn('تم تخطي فحوصات الجودة بناءً على الراية --skip-tests.');
  }

  // 6. تحديث الإصدار في الكود والـ Git إذا لزم الأمر
  const targetTag = `v${targetVersion}`;

  if (needsBump) {
    logInfo(`جاري ترقية الإصدار إلى v${targetVersion}...`);
    const bumpOk = run(`node scripts/set-version.mjs ${targetVersion}`);
    if (!bumpOk) {
      logError('فشل تحديث الإصدار عبر scripts/set-version.mjs');
      process.exit(1);
    }

    logInfo('جاري تثبيت التعديلات وإنشاء Git Tag...');
    run('git add package.json package-lock.json');
    run(`git commit -m "chore(release): bump version to ${targetVersion}"`);
    run(`git tag -a ${targetTag} -m "Release ${targetTag}"`);
    
    logInfo('جاري دفع التعديلات والـ Tags إلى GitHub...');
    const pushOk = run('git push && git push --tags');
    if (!pushOk) {
      logWarn('تعذر دفع الـ commit أو الـ tag تلقائياً. تأكد من إعدادات Git.');
    } else {
      logSuccess('تم دفع الـ Git Commit و Git Tag بنجاح.');
    }
  }

  // 7. بناء التطبيق ونشره إلى GitHub Releases عبر electron-builder
  logInfo(`جاري بناء الحزم التنفيذية لنظام Windows ورفعها إلى GitHub Releases (v${targetVersion})...`);
  const publishOk = run('npx electron-builder --win --x64 --publish always', { GH_TOKEN: token });
  if (!publishOk) {
    logError('فشل بناء أو رفع الحزم التنفيذية عبر electron-builder.');
    process.exit(1);
  }
  logSuccess('اكتمل بناء ورفع الحزم التنفيذية إلى GitHub بنجاح.');

  // 8. توليد ورفع البصمات الأمنية SHA256SUMS.txt
  logInfo('جاري توليد البصمات الأمنية SHA256SUMS.txt...');
  run('node scripts/generate-checksums.mjs');

  const shaFile = path.join(releaseDir, 'SHA256SUMS.txt');
  if (fs.existsSync(shaFile)) {
    logInfo('جاري رفع SHA256SUMS.txt إلى GitHub Release...');
    const uploadSha = await uploadReleaseAsset(token, owner, repo, targetTag, shaFile);
    if (uploadSha) {
      logSuccess('تم رفع SHA256SUMS.txt إلى أصول الإصدار بنجاح.');
    } else {
      logWarn('لم يتم رفع SHA256SUMS.txt تلقائياً، يمكنك رفعه يدوياً إذا رغبت.');
    }
  }

  // 9. بطاقة النجاح الختامية
  console.log('\n' + colors.bright + colors.green + '═'.repeat(64) + colors.reset);
  console.log(`  🎉 ${colors.bright}تم نشر الإصدار ${targetTag} بنجاح على GitHub Releases!${colors.reset}`);
  console.log(colors.bright + colors.green + '═'.repeat(64) + colors.reset);
  console.log(`\n🔗 ${colors.cyan}صفحة الإصدار الرسمية:${colors.reset}`);
  console.log(`   https://github.com/${owner}/${repo}/releases/tag/${targetTag}`);
  console.log(`\n📦 ${colors.cyan}روابط التنزيل المباشرة:${colors.reset}`);
  console.log(`   - مثبت ويندوز (Setup):`);
  console.log(`     https://github.com/${owner}/${repo}/releases/download/${targetTag}/AN-POS-Setup-${targetVersion}-x64.exe`);
  console.log(`   - النسخة المحمولة (Portable):`);
  console.log(`     https://github.com/${owner}/${repo}/releases/download/${targetTag}/AN-POS-${targetVersion}-x64-portable.exe`);
  console.log(`   - ملف التحديث التلقائي:`);
  console.log(`     https://github.com/${owner}/${repo}/releases/download/${targetTag}/latest.yml`);
  console.log(`   - البصمات الأمنية:`);
  console.log(`     https://github.com/${owner}/${repo}/releases/download/${targetTag}/SHA256SUMS.txt\n`);
}

main().catch((err) => {
  logError(`خطأ غير متوقع: ${err.message}`);
  process.exit(1);
});
