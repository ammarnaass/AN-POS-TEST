// تنفيذ إجراءات النسخ الاحتياطي الذري والتحقق قبل الترقية عبر سطر الأوامر (CLI - A3)
// يُستدعى بواسطة مثبّت NSIS:
// 1. "AN POS.exe" --prepare-upgrade "<backupDir>"
// 2. "AN POS.exe" --verify-backup "<backupFilePath>"

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * تحديد مسار قاعدة البيانات الرئيسي للتطبيق
 */
function resolveDbPath(): string {
  if (process.env.AN_POS_DB_PATH) {
    return path.resolve(process.env.AN_POS_DB_PATH);
  }
  const appData = process.env.APPDATA || (process.platform === 'darwin'
    ? path.join(process.env.HOME || '', 'Library/Application Support')
    : path.join(process.env.HOME || '', '.config'));
  return path.join(appData, 'an-pos', 'anpos.db');
}

/**
 * قراءة رقم الإصدار الحالي للتطبيق
 */
function getAppVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, '../../package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return pkg.version || '2.6.0';
    }
  } catch { /* ignore */ }
  return '2.6.0';
}

/**
 * تنفيذ النسخ الاحتياطي الذري وتفريغ سجل WAL قبل الترقية
 */
export function executePrepareUpgrade(targetDir?: string): boolean {
  const dbPath = resolveDbPath();
  console.log(`[prepare-upgrade] 🔍 فحص مسار قاعدة البيانات: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.log('[prepare-upgrade] ℹ️ قاعدة البيانات غير موجودة بعد (تثبيت نظيف). تخطي النسخ الاحتياطي.');
    return true;
  }

  const stat = fs.statSync(dbPath);
  if (stat.size === 0) {
    console.log('[prepare-upgrade] ℹ️ ملف قاعدة البيانات فارغ الحجم. تخطي النسخ الاحتياطي.');
    return true;
  }

  // تحديد مجلد النسخ الاحتياطي
  const backupsDir = targetDir
    ? path.resolve(targetDir)
    : path.join(path.dirname(dbPath), 'backups');

  try {
    fs.mkdirSync(backupsDir, { recursive: true });
  } catch (dirErr) {
    console.error('[prepare-upgrade] ❌ فشل إنشاء مجلد النسخ الاحتياطي:', dirErr);
    return false;
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const version = getAppVersion();
  const backupFileName = `pre_upgrade_${version}_${timestamp}.db`;
  const backupFilePath = path.join(backupsDir, backupFileName);
  const legacyBackupFilePath = path.join(backupsDir, 'pre_upgrade_backup.db');

  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(dbPath);

    // 1. تفريغ جميع معاملات WAL إلى ملف قاعدة البيانات الرئيسي (Checkpoint Truncate)
    console.log('[prepare-upgrade] 🔄 تفريغ معاملات WAL (PRAGMA wal_checkpoint(TRUNCATE))...');
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (walErr) {
      console.warn('[prepare-upgrade] تنبيه أثناء تفريغ WAL:', walErr);
    }

    // 2. إنشاء نسخة احتياطية ذرية مدمجة ومفرغة عبر VACUUM INTO
    console.log(`[prepare-upgrade] 🛡️ جاري إنشاء النسخة الذرية: ${backupFilePath}`);
    if (fs.existsSync(backupFilePath)) {
      try { fs.unlinkSync(backupFilePath); } catch {}
    }
    const sqlSafePath = backupFilePath.replace(/'/g, "''");
    db.exec(`VACUUM INTO '${sqlSafePath}';`);

    // 3. التحقق من سلامة قاعدة البيانات بعد النسخ (PRAGMA integrity_check)
    const integrityRow = db.prepare('PRAGMA integrity_check;').get() as Record<string, unknown> | undefined;
    const integrityValue = integrityRow ? Object.values(integrityRow)[0] : 'unknown';
    if (integrityValue !== 'ok') {
      throw new Error(`فشل فحص سلامة قاعدة البيانات: ${integrityValue}`);
    }

    // 4. نسخ ملف النسخة الثابت للتوافقية
    try {
      fs.copyFileSync(backupFilePath, legacyBackupFilePath);
    } catch {}

    console.log(`[prepare-upgrade] ✅ اكتمل النسخ الاحتياطي الذري بنجاح تام: ${backupFilePath}`);
    return true;
  } catch (err: any) {
    console.error('[prepare-upgrade] ❌ فشلت عملية النسخ الاحتياطي الذري:', err?.message || err);

    // محاولة نسخ ملفات db و wal مباشرة كـ Fallback
    try {
      console.log('[prepare-upgrade] ⚠️ محاولة النسخ المباشر للملفات كإجراء طارئ (Fallback)...');
      fs.copyFileSync(dbPath, backupFilePath);
      if (fs.existsSync(`${dbPath}-wal`)) {
        fs.copyFileSync(`${dbPath}-wal`, `${backupFilePath}-wal`);
      }
      if (fs.existsSync(`${dbPath}-shm`)) {
        fs.copyFileSync(`${dbPath}-shm`, `${backupFilePath}-shm`);
      }
      fs.copyFileSync(dbPath, legacyBackupFilePath);
      return true;
    } catch (fallbackErr) {
      console.error('[prepare-upgrade] ❌ فشل النسخ الاحتياطي الطارئ أيضاً:', fallbackErr);
      return false;
    }
  } finally {
    if (db) {
      try { db.close(); } catch {}
    }
  }
}

/**
 * التحقق من سلامة وصلاحية ملف نسخة احتياطية
 */
export function executeVerifyBackup(backupPath: string): boolean {
  const resolved = path.resolve(backupPath);
  console.log(`[verify-backup] 🔍 التحقق من سلامة ملف النسخة: ${resolved}`);

  if (!fs.existsSync(resolved)) {
    console.error('[verify-backup] ❌ ملف النسخة الاحتياطية غير موجود');
    return false;
  }

  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(resolved, { readOnly: true });
    const checkRow = db.prepare('PRAGMA integrity_check;').get() as Record<string, unknown> | undefined;
    const checkVal = checkRow ? Object.values(checkRow)[0] : 'unknown';
    if (checkVal !== 'ok') {
      console.error(`[verify-backup] ❌ ملف النسخة الاحتياطية تالف (integrity_check: ${checkVal})`);
      return false;
    }

    const tablesRow = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").get() as any;
    const tableCount = Number(tablesRow?.count || 0);
    console.log(`[verify-backup] ✅ النسخة الاحتياطية سليمة وصالحة (عدد الجداول: ${tableCount})`);
    return true;
  } catch (err: any) {
    console.error('[verify-backup] ❌ خطأ أثناء فتح والتحقق من النسخة:', err?.message || err);
    return false;
  } finally {
    if (db) {
      try { db.close(); } catch {}
    }
  }
}

/**
 * فحص وسائط سطر الأوامر وتنفيذ أوامر الترقية والنسخ إن وُجدت
 * يُرجع true إذا كان الأمر خاصاً بالـ CLI وتم التعامل معه (يجب إنهاء العملية فوراً)
 */
export function handleCliBackupCommands(): boolean {
  const args = process.argv;

  const prepareIndex = args.indexOf('--prepare-upgrade');
  if (prepareIndex !== -1) {
    const targetDir = args[prepareIndex + 1] && !args[prepareIndex + 1].startsWith('-')
      ? args[prepareIndex + 1]
      : undefined;
    const success = executePrepareUpgrade(targetDir);
    process.exit(success ? 0 : 1);
    return true;
  }

  const verifyIndex = args.indexOf('--verify-backup');
  if (verifyIndex !== -1) {
    const backupPath = args[verifyIndex + 1];
    if (!backupPath) {
      console.error('[verify-backup] ❌ يجب تحديد مسار ملف النسخة الاحتياطية.');
      process.exit(1);
    }
    const success = executeVerifyBackup(backupPath);
    process.exit(success ? 0 : 1);
    return true;
  }

  return false;
}
