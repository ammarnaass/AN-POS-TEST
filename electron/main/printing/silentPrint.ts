// محرك الطباعة الصامتة لأجهزة الكاشير الحرارية في بيئة Electron
// يقوم بإنشاء نافذة خفية غير مرئية (Offscreen) وتمرير أمر الطباعة مباشرة إلى الطابعة

import { BrowserWindow, ipcMain, type WebContentsPrintOptions } from 'electron';

export interface SilentPrintOptions {
  silent?: boolean;
  deviceName?: string;
  copies?: number;
  pageSize?: 'A4' | 'A5' | { width: number; height: number };
  color?: boolean;
}

/**
 * الحصول على قائمة بجميع الطابعات المثبتة في نظام التشغيل
 */
export async function getAvailablePrinters(): Promise<Electron.PrinterInfo[]> {
  try {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0 && wins[0].webContents) {
      return await wins[0].webContents.getPrintersAsync();
    }
    // نافذة مؤقتة في حال لم توجد نافذة نشطة
    const tempWin = new BrowserWindow({ show: false, width: 100, height: 100 });
    const printers = await tempWin.webContents.getPrintersAsync();
    tempWin.destroy();
    return printers;
  } catch (err) {
    console.error('[print] فشل استخراج قائمة الطابعات:', err);
    return [];
  }
}

/**
 * تنفيذ طباعة صامتة عبر نافذة Electron خفية
 */
export function executeSilentPrint(
  html: string,
  options: SilentPrintOptions = {}
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    let printWindow: BrowserWindow | null = new BrowserWindow({
      show: false,
      width: 400,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (printWindow && !printWindow.isDestroyed()) {
        try {
          printWindow.destroy();
        } catch {
          /* ignore */
        }
        printWindow = null;
      }
    };

    // مهلة أمان قصوى (15 ثانية) لمنع تسريب النوافذ الخفية
    timeoutId = setTimeout(() => {
      console.warn('[print] مهلة الطباعة انتهت (Timeout)');
      cleanup();
      resolve({ success: false, error: 'مهلة أمر الطباعة انتهت (Timeout)' });
    }, 15000);

    printWindow.webContents.on('did-finish-load', () => {
      if (!printWindow || printWindow.isDestroyed()) return;

      const printOpts: WebContentsPrintOptions = {
        silent: options.silent !== false, // افتراضياً صامتة
        printBackground: true,
        deviceName: options.deviceName || '',
        copies: options.copies || 1,
        margins: {
          marginType: 'none',
        },
      };

      // إذا تم تحديد اسم طابعة فارغ، لا نمرره ليطبع على الافتراضية
      if (!options.deviceName) {
        delete (printOpts as any).deviceName;
      }

      printWindow.webContents.print(printOpts, (success, failureReason) => {
        cleanup();
        if (!success) {
          console.warn('[print] تعذر إتمام الطباعة:', failureReason);
          resolve({ success: false, error: failureReason || 'فشل تنفيذ الطباعة على الجهاز' });
        } else {
          resolve({ success: true });
        }
      });
    });

    printWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      cleanup();
      resolve({ success: false, error: `فشل تحميل محتوى الطباعة: ${errorDescription} (${errorCode})` });
    });

    // تحميل محتوى الـ HTML المشفر
    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });
}

/**
 * تسجيل معالجات IPC للطباعة
 */
export function registerPrintingIpc(): void {
  ipcMain.handle('print:silent', async (_evt, html: string, options?: SilentPrintOptions) => {
    return executeSilentPrint(html, options);
  });

  ipcMain.handle('print:getPrinters', async () => {
    return getAvailablePrinters();
  });
}
