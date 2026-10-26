// وحدة إدارة التحديثات التلقائية — A7 (Auto-Updater Engine)
// تعتمد على electron-updater وتدعم التنزيل التفاضلي والإشعار عبر IPC
// وتمنع المقاطعة أثناء عمليات البيع أو الأعطال غير المتوقعة

import electronUpdater, { type UpdateInfo } from 'electron-updater';
import { app, BrowserWindow, ipcMain } from 'electron';
import { isRunningInSlotArchitecture, applyAtomicUpdate, prepareInactiveSlotPayload } from './installer';

const { autoUpdater } = electronUpdater;

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
  progressPercent?: number;
  error?: string;
  inSlotArchitecture?: boolean;
}

let currentState: UpdateState = { status: 'idle' };
let checkInterval: NodeJS.Timeout | null = null;

function notifyRenderer(channel: string, data: any): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}

/**
 * تهيئة وإعداد محرك التحديثات التلقائية
 */
export function setupAutoUpdater(): void {
  // تفعيل التحديثات فقط في وضع الإنتاج المجمع (Packaged App)
  if (!app.isPackaged) {
    console.log('[updater] ℹ️ وضع التطوير: تعطيل الفحص التلقائي للتحديثات.');
    return;
  }

  // إعدادات التحديث الأساسية
  autoUpdater.autoDownload = false; // التحكم بالتحميل لتفادي استهلاك الإنترنت أثناء عمليات البيع
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  // مؤقتاً بحسب قرار صاحب المنتج لعدم وجود شهادة توقيع حالياً:
  // تم ضبط verifyUpdateCodeSignature: false في package.json تحت build.win
  // عند تفعيل الشهادة لاحقاً (A1) تُعاد إلى true في package.json ويُفعّل التحقق من الناشر

  // الأحداث ودورة حياة التحديث
  autoUpdater.on('checking-for-update', () => {
    currentState = { status: 'checking', inSlotArchitecture: isRunningInSlotArchitecture() };
    notifyRenderer('updater:status', currentState);
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log(`[updater] 🚀 يتوفر إصدار جديد: v${info.version}`);
    currentState = {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
      inSlotArchitecture: isRunningInSlotArchitecture(),
    };
    notifyRenderer('updater:available', currentState);
    notifyRenderer('updater:status', currentState);
  });

  autoUpdater.on('update-not-available', (_info: UpdateInfo) => {
    currentState = { status: 'not-available', inSlotArchitecture: isRunningInSlotArchitecture() };
    notifyRenderer('updater:status', currentState);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    currentState = {
      ...currentState,
      status: 'downloading',
      progressPercent: Math.round(progressObj.percent),
      inSlotArchitecture: isRunningInSlotArchitecture(),
    };
    notifyRenderer('updater:progress', currentState);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log(`[updater] ✅ تم تنزيل التحديث v${info.version} بنجاح وهو جاهز للتثبيت.`);
    currentState = {
      ...currentState,
      status: 'downloaded',
      version: info.version,
      inSlotArchitecture: isRunningInSlotArchitecture(),
    };
    notifyRenderer('updater:downloaded', currentState);
    notifyRenderer('updater:status', currentState);
  });

  autoUpdater.on('error', (err) => {
    console.warn('[updater] تنبيه أثناء فحص/تنزيل التحديث:', err?.message || err);
    currentState = {
      status: 'error',
      error: err?.message || String(err),
      inSlotArchitecture: isRunningInSlotArchitecture(),
    };
    notifyRenderer('updater:error', currentState);
    notifyRenderer('updater:status', currentState);
  });

  // فحص تلقائي بعد 10 ثوانٍ من الإقلاع
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[updater] تعذر الفحص الأولي للتحديثات:', err?.message || err);
    });
  }, 10_000);

  // فحص دوري كل 4 ساعات
  checkInterval = setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

/**
 * تسجيل معالجات IPC للتفاعل مع شاشة التحديثات في الواجهة
 */
export function registerUpdaterIpc(): void {
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      return { status: 'not-available', error: 'التحديث غير متاح في وضع التطوير' };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      return { status: 'checking', updateInfo: result?.updateInfo };
    } catch (err: any) {
      return { status: 'error', error: err?.message || String(err) };
    }
  });

  ipcMain.handle('updater:download', async () => {
    if (!app.isPackaged) return false;
    try {
      await autoUpdater.downloadUpdate();
      return true;
    } catch (err) {
      console.error('[updater] فشل بدء تنزيل التحديث:', err);
      return false;
    }
  });

  ipcMain.handle('updater:prepareSlot', async (_e, payloadPath: string, version: string) => {
    return await prepareInactiveSlotPayload(payloadPath, version);
  });

  ipcMain.handle('updater:install', async () => {
    if (!app.isPackaged) return;

    // 1. إذا كان التطبيق يعمل ضمن معمارية الفتحات المزدوجة، نطبق التبديل الذري الفوري
    if (isRunningInSlotArchitecture() && currentState.version) {
      console.log('[updater] 🚀 تطبيق التحديث بالتبديل الذري (Atomic A/B Slot Switch)...');
      try {
        const result = await applyAtomicUpdate(currentState.version);
        if (result.success) {
          console.log('[updater] ✅ اكتمل التبديل الذري بنجاح، جاري إعادة تشغيل البرنامج بالنسخة الجديدة...');
          app.relaunch();
          app.exit(0);
          return;
        } else {
          console.warn('[updater] تنبيه: تعذر التبديل الذري، سيتم اللجوء للمثبت القياسي:', result.error);
        }
      } catch (err) {
        console.warn('[updater] خطأ أثناء تطبيق التبديل الذري:', err);
      }
    }

    // 2. البديل الكلاسيكي في حال لم يكن المثبت بنمط الفتحات
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle('updater:getStatus', () => {
    return {
      ...currentState,
      inSlotArchitecture: isRunningInSlotArchitecture(),
    };
  });
}

/**
 * تنظيف المؤقتات عند إغلاق التطبيق
 */
export function cleanupAutoUpdater(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
