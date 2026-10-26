import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { getVaultPaths, getActiveSlot, getInactiveSlot, atomicSwitchSlot, SlotName } from './slotManager';
import { executePrepareUpgrade } from '../backup/preUpgrade';

export interface PrepareSlotResult {
  success: boolean;
  targetSlot: SlotName;
  targetPath: string;
  error?: string;
}

export interface ApplyUpdateResult {
  success: boolean;
  fromSlot: SlotName;
  toSlot: SlotName;
  durationMs?: number;
  error?: string;
}

/**
 * فحص ما إذا كان التطبيق يعمل ضمن بيئة الفتحات المزدوجة A/B المنظمة
 */
export function isRunningInSlotArchitecture(): boolean {
  try {
    const paths = getVaultPaths();
    return fs.existsSync(paths.systemVault) && fs.existsSync(paths.currentLink);
  } catch {
    return false;
  }
}

/**
 * تحضير الفتحة الخاملة (Slot B أو Slot A) ونسخ/استخراج ملفات الإصدار الجديد إليها في صمت
 */
export async function prepareInactiveSlotPayload(
  sourceUnpackedOrFiles: string,
  newVersion: string
): Promise<PrepareSlotResult> {
  const paths = getVaultPaths();
  const inactiveSlot = getInactiveSlot(paths);
  const targetDir = inactiveSlot === 'slot_a' ? paths.slotA : paths.slotB;

  console.log(`[ABUpdater] 📦 تجهيز الفتحة الخاملة [${inactiveSlot}] للإصدار v${newVersion}...`);

  try {
    // 1. تنظيف الفتحة الخاملة بالكامل من أي بقايا قديمة
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    // 2. نسخ الملفات إلى الفتحة الخاملة
    if (fs.existsSync(sourceUnpackedOrFiles)) {
      copyDirectoryRecursive(sourceUnpackedOrFiles, targetDir);
    } else {
      throw new Error(`مسار الحزمة المصدرية غير موجود: ${sourceUnpackedOrFiles}`);
    }

    // 3. كتابة ملف التعريف والبيانات الوصفية للفتحة الجديدة
    const manifest = {
      version: newVersion,
      preparedAt: new Date().toISOString(),
      source: sourceUnpackedOrFiles,
      status: 'PREPARED',
    };
    fs.writeFileSync(
      path.join(targetDir, 'slot_manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    console.log(`[ABUpdater] ✅ تم تجهيز الفتحة الخاملة [${inactiveSlot}] بنجاح للإصدار v${newVersion}.`);
    return {
      success: true,
      targetSlot: inactiveSlot,
      targetPath: targetDir,
    };
  } catch (err: any) {
    console.error(`[ABUpdater] ❌ فشل تجهيز الفتحة الخاملة [${inactiveSlot}]:`, err);
    return {
      success: false,
      targetSlot: inactiveSlot,
      targetPath: targetDir,
      error: err?.message || String(err),
    };
  }
}

/**
 * تنفيذ التبديل الذري الآمن بعد تأمين قاعدة البيانات والنسخ الاحتياطي
 */
export async function applyAtomicUpdate(newVersion: string): Promise<ApplyUpdateResult> {
  const paths = getVaultPaths();
  const activeSlot = getActiveSlot(paths) || 'slot_a';
  const targetSlot = getInactiveSlot(paths);
  const targetDir = targetSlot === 'slot_a' ? paths.slotA : paths.slotB;

  console.log(`[ABUpdater] ⚡ بدء إجراءات التبديل الذري من [${activeSlot}] إلى [${targetSlot}]...`);

  // 1. التحقق من وجود الملف التنفيذي في الفتحة المستهدفة
  const targetExe = path.join(targetDir, 'AN POS.exe');
  if (!fs.existsSync(targetExe)) {
    return {
      success: false,
      fromSlot: activeSlot,
      toSlot: targetSlot,
      error: `الملف التنفيذي غير موجود في الفتحة المستهدفة: ${targetExe}`,
    };
  }

  // 2. تأمين وتفريغ قاعدة البيانات وحفظ نسخة احتياطية فورية قبل التبديل (Zero Data Loss)
  console.log('[ABUpdater] 🛡️ جاري أخذ نسخة احتياطية ذرية لقاعدة البيانات وتفريغ سجل WAL...');
  try {
    const backupOk = executePrepareUpgrade(paths.backupsDir);
    if (!backupOk) {
      console.warn('[ABUpdater] تنبيه: فشل فحص النسخ الاحتياطي التمهيدي، المتابعة بحذر.');
    }
  } catch (backupErr) {
    console.warn('[ABUpdater] تنبيه أثناء النسخ الاحتياطي التمهيدي:', backupErr);
  }

  // 3. تنفيذ التبديل الذري للرابط التشعبي في أقل من 15ms
  const start = Date.now();
  const switched = atomicSwitchSlot(targetSlot, paths);
  const duration = Date.now() - start;

  if (!switched) {
    return {
      success: false,
      fromSlot: activeSlot,
      toSlot: targetSlot,
      durationMs: duration,
      error: 'فشل التبديل الذري لمؤشر الرابط التشعبي',
    };
  }

  console.log(`[ABUpdater] 🚀 تم التبديل الذري بنجاح خلال ${duration}ms!`);
  return {
    success: true,
    fromSlot: activeSlot,
    toSlot: targetSlot,
    durationMs: duration,
  };
}

/**
 * دالة مساعدة لنسخ المجلدات بشكل تكراري
 */
function copyDirectoryRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
