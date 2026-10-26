import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { execSync } from 'node:child_process';

export type SlotName = 'slot_a' | 'slot_b';

export interface SlotHealthStatus {
  slot: SlotName;
  version: string;
  healthy: boolean;
  lastBoot: string;
  errorCount: number;
  lastError?: string;
}

export interface VaultPaths {
  baseDir: string;
  systemVault: string;
  dataVault: string;
  currentLink: string;
  slotA: string;
  slotB: string;
  databaseDir: string;
  logsDir: string;
  backupsDir: string;
}

/**
 * تحديد وحل مسارات التخزين المعزولة SystemVault و DataVault
 */
export function getVaultPaths(customBaseDir?: string): VaultPaths {
  const localAppData = process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local');
  const baseDir = customBaseDir || path.join(localAppData, 'Programs', 'AN POS');
  const systemVault = path.join(baseDir, 'SystemVault');
  const dataVault = path.join(baseDir, 'DataVault');

  return {
    baseDir,
    systemVault,
    dataVault,
    currentLink: path.join(systemVault, 'current'),
    slotA: path.join(systemVault, 'slot_a'),
    slotB: path.join(systemVault, 'slot_b'),
    databaseDir: path.join(dataVault, 'database'),
    logsDir: path.join(dataVault, 'logs'),
    backupsDir: path.join(dataVault, 'backups'),
  };
}

/**
 * معرفة الفتحة النشطة حالياً عبر فحص وجهة الرابط التشعبي current
 */
export function getActiveSlot(paths: VaultPaths = getVaultPaths()): SlotName | null {
  try {
    if (!fs.existsSync(paths.currentLink)) {
      return null;
    }
    const realPath = fs.realpathSync(paths.currentLink);
    if (realPath.includes('slot_a')) return 'slot_a';
    if (realPath.includes('slot_b')) return 'slot_b';
    return null;
  } catch (err) {
    console.warn('[SlotManager] تعذر قراءة الرابط current:', err);
    return null;
  }
}

/**
 * معرفة الفتحة الخاملة الصالحة لتنزيل التحديثات بالخلفية
 */
export function getInactiveSlot(paths: VaultPaths = getVaultPaths()): SlotName {
  const active = getActiveSlot(paths);
  return active === 'slot_a' ? 'slot_b' : 'slot_a';
}

/**
 * تنفيذ التبديل الذري اللحظي للرابط current إلى الفتحة المستهدفة (في أقل من 15ms)
 */
export function atomicSwitchSlot(targetSlot: SlotName, paths: VaultPaths = getVaultPaths()): boolean {
  const targetDir = targetSlot === 'slot_a' ? paths.slotA : paths.slotB;
  if (!fs.existsSync(targetDir)) {
    throw new Error(`الفتحة المستهدفة غير موجودة: ${targetDir}`);
  }

  const start = Date.now();

  try {
    // في بيئة ويندوز: إزالة الرابط القديم ثم إنشاء Junction جديد ذرياً
    if (process.platform === 'win32') {
      if (fs.existsSync(paths.currentLink)) {
        execSync(`cmd /c rmdir "${paths.currentLink}"`, { stdio: 'ignore' });
      }
      execSync(`cmd /c mklink /J "${paths.currentLink}" "${targetDir}"`, { stdio: 'ignore' });
    } else {
      // لينكس / ماك: استخدام symlink عادي
      if (fs.existsSync(paths.currentLink)) {
        fs.unlinkSync(paths.currentLink);
      }
      fs.symlinkSync(targetDir, paths.currentLink, 'junction');
    }

    const duration = Date.now() - start;
    console.log(`[SlotManager] ⚡ تم التبديل الذري إلى ${targetSlot} خلال ${duration}ms`);

    // تسجيل العملية في سجل العمليات
    recordDeploymentLog(paths, `ATOMIC_SWAP -> ${targetSlot} (${duration}ms)`);
    return true;
  } catch (err: any) {
    console.error('[SlotManager] ❌ فشل التبديل الذري:', err);
    recordDeploymentLog(paths, `SWAP_FAILED -> ${targetSlot} Error: ${err.message}`);
    return false;
  }
}

/**
 * تنفيذ التراجع التلقائي العاجل إلى الفتحة السابقة المستقرة (Emergency Rollback)
 */
export function rollbackSlot(reason: string, paths: VaultPaths = getVaultPaths()): boolean {
  const active = getActiveSlot(paths);
  const fallbackSlot: SlotName = active === 'slot_a' ? 'slot_b' : 'slot_a';
  const fallbackDir = fallbackSlot === 'slot_a' ? paths.slotA : paths.slotB;

  console.warn(`[SlotManager] 🚨 جاري التراجع الفوري من ${active} إلى ${fallbackSlot} بسبب: ${reason}`);

  if (!fs.existsSync(fallbackDir)) {
    console.error(`[SlotManager] لا يمكن إجراء Rollback: المجلد السابق غير موجود (${fallbackDir})`);
    return false;
  }

  const success = atomicSwitchSlot(fallbackSlot, paths);
  if (success) {
    const timestamp = new Date().toISOString();
    const logPath = path.join(paths.logsDir, 'rollback.log');
    try {
      fs.mkdirSync(paths.logsDir, { recursive: true });
      fs.appendFileSync(
        logPath,
        `[${timestamp}] CRITICAL ROLLBACK: From ${active} to ${fallbackSlot} | Reason: ${reason}\n`,
        'utf-8'
      );
    } catch (e) {
      console.warn('[SlotManager] تعذر كتابة سجل rollback.log:', e);
    }
  }

  return success;
}

/**
 * تحديث حالة صحة الفتحة في ملف status
 */
export function writeSlotStatus(slot: SlotName, healthy: boolean, version: string, error?: string, paths: VaultPaths = getVaultPaths()): void {
  try {
    const statusDir = path.join(paths.systemVault);
    fs.mkdirSync(statusDir, { recursive: true });
    const statusFile = path.join(statusDir, `status_${slot}.json`);

    const statusData: SlotHealthStatus = {
      slot,
      version,
      healthy,
      lastBoot: new Date().toISOString(),
      errorCount: healthy ? 0 : 1,
      lastError: error,
    };

    fs.writeFileSync(statusFile, JSON.stringify(statusData, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[SlotManager] تعذر كتابة حالة الفتحة ${slot}:`, err);
  }
}

function recordDeploymentLog(paths: VaultPaths, message: string): void {
  try {
    fs.mkdirSync(paths.logsDir, { recursive: true });
    const logFile = path.join(paths.logsDir, 'deployments.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`, 'utf-8');
  } catch {
    // تجاهل أخطاء السجل لتفادي تعطيل سير العمل
  }
}
