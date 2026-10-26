import { app, BrowserWindow } from 'electron';
import { getActiveSlot, rollbackSlot, writeSlotStatus, getVaultPaths, SlotName } from './slotManager';
import { spawn } from 'node:child_process';
import path from 'node:path';

export interface WatchdogOptions {
  timeoutMs?: number; // الافتراضي: 5000ms
  version?: string;
  testDatabaseConnection?: () => Promise<boolean> | boolean;
  onCanarySuccess?: () => void;
  onCanaryFailure?: (err: Error) => void;
}

class BootWatchdog {
  private timer: NodeJS.Timeout | null = null;
  private isDisarmed: boolean = false;
  private currentSlot: SlotName | null = null;
  private appVersion: string = '1.0.0';

  /**
   * تشغيل مراقب الإقلاع الذاتي (Canary Boot Watchdog)
   * يفحص استقرار البرنامج خلال أول 5 ثوانٍ من الإقلاع
   */
  public start(options: WatchdogOptions = {}): void {
    const timeoutMs = options.timeoutMs ?? 5000;
    this.appVersion = options.version || app.getVersion();
    this.currentSlot = getActiveSlot();

    console.log(`[BootWatchdog] 🛡️ تفعيل مراقب صحة الإقلاع للفتحة [${this.currentSlot || 'standalone'}] لمـدة ${timeoutMs}ms...`);

    // 1. تسجيل معالجات اعتراض الانهيارات الفجائية (Crash Traps)
    const handleFatalError = (err: any) => {
      if (this.isDisarmed) return;
      console.error('[BootWatchdog] 💥 رصد انهيار غير معالج أثناء نافذة الإقلاع الحرجة:', err);
      this.triggerEmergencyRollback(`Uncaught Exception: ${err?.message || err}`, options);
    };

    process.once('uncaughtException', handleFatalError);
    process.once('unhandledRejection', handleFatalError);

    // 2. ضبط مؤقت نافذة الحماية (Canary Window)
    this.timer = setTimeout(async () => {
      if (this.isDisarmed) return;

      try {
        // فحص صحة قاعدة البيانات إن تم توفير دالة فحص
        if (options.testDatabaseConnection) {
          const dbOk = await options.testDatabaseConnection();
          if (!dbOk) {
            throw new Error('Database ping check failed during canary window');
          }
        }

        // تم اجتياز الفحص بنجاح 100%
        this.disarm(true);
        if (options.onCanarySuccess) {
          options.onCanarySuccess();
        }
      } catch (checkErr: any) {
        this.triggerEmergencyRollback(checkErr?.message || 'Canary Health Check Failed', options);
      }
    }, timeoutMs);
  }

  /**
   * استدعاء عند اكتمال رسم واجهة المستخدم بنجاح لتأكيد الجاهزية البصرية
   */
  public notifyWindowReady(window: BrowserWindow): void {
    if (this.isDisarmed) return;

    window.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
      if (this.isDisarmed) return;
      console.error(`[BootWatchdog] فشل تحميل واجهة المستخدم (Code: ${errorCode}): ${errorDescription}`);
      this.triggerEmergencyRollback(`UI Load Failed (${errorCode}): ${errorDescription}`);
    });
  }

  /**
   * تعطيل المراقب وتأكيد سلامة النسخة الحالية
   */
  public disarm(markHealthy: boolean = true): void {
    if (this.isDisarmed) return;
    this.isDisarmed = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.currentSlot && markHealthy) {
      writeSlotStatus(this.currentSlot, true, this.appVersion);
      console.log(`[BootWatchdog] ✅ تم اجتياز فحص السلامة بنجاح — الفتحة [${this.currentSlot}] مصنفة كنسخة مستقرة (HEALTHY).`);
    }
  }

  /**
   * تنفيذ التراجع التلقائي العاجل وإعادة تشغيل النسخة السابقة
   */
  private triggerEmergencyRollback(reason: string, options?: WatchdogOptions): void {
    if (this.isDisarmed) return;
    this.disarm(false);

    console.error(`[BootWatchdog] 🚨 تنفيذ إجراء التراجع التلقائي (Auto-Rollback) بسبب: ${reason}`);

    if (this.currentSlot) {
      writeSlotStatus(this.currentSlot, false, this.appVersion, reason);
    }

    if (options?.onCanaryFailure) {
      try {
        options.onCanaryFailure(new Error(reason));
      } catch {}
    }

    // تفعيل التبديل الذري العكسي
    const paths = getVaultPaths();
    const rollbackSuccess = rollbackSlot(reason, paths);

    if (rollbackSuccess) {
      const fallbackExe = path.join(paths.currentLink, 'AN POS.exe');
      console.log(`[BootWatchdog] 🔄 إعادة تشغيل النسخة المستقرة السابقة من: ${fallbackExe}`);

      try {
        // إطلاق النسخة السابقة كعملية منفصلة تماماً
        spawn(fallbackExe, ['--recovered-from-crash'], {
          detached: true,
          stdio: 'ignore',
        }).unref();
      } catch (spawnErr) {
        console.error('[BootWatchdog] فشل إطلاق النسخة السابقة:', spawnErr);
      }
    }

    // إنهاء العملية الحالية المنهارة بأمان
    setTimeout(() => {
      app.exit(1);
    }, 500);
  }
}

export const bootWatchdog = new BootWatchdog();
