// معالجات IPC للتحكم بنافذة التطبيق المدمجة (Electron Custom Titlebar)
// يوفر التصغير والتكبير والاستعادة والإغلاق مع إشعار الواجهة بتغير حالة التكبير

import { ipcMain, BrowserWindow } from 'electron';

let targetWindow: BrowserWindow | null = null;

/**
 * تعيين النافذة المستهدفة لربط أحداث التكبير والاستعادة
 */
export function setWindowControlsTarget(win: BrowserWindow): void {
  targetWindow = win;

  // إرسال إشعار لحظي للواجهة عند تكبير أو استعادة النافذة
  win.on('maximize', () => {
    if (!win.isDestroyed()) {
      win.webContents.send('window:maximized-change', true);
    }
  });

  win.on('unmaximize', () => {
    if (!win.isDestroyed()) {
      win.webContents.send('window:maximized-change', false);
    }
  });
}

/**
 * تسجيل قنوات IPC لأزرار التحكم بالنافذة
 */
export function registerWindowControlsIpc(): void {
  // تصغير النافذة
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || targetWindow;
    if (win && !win.isDestroyed()) {
      win.minimize();
      return true;
    }
    return false;
  });

  // التبديل بين التكبير والاستعادة
  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || targetWindow;
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      return win.isMaximized();
    }
    return false;
  });

  // إغلاق النافذة
  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || targetWindow;
    if (win && !win.isDestroyed()) {
      win.close();
      return true;
    }
    return false;
  });

  // فحص ما إذا كانت النافذة مكبرة حالياً
  ipcMain.handle('window:is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || targetWindow;
    if (win && !win.isDestroyed()) {
      return win.isMaximized();
    }
    return false;
  });
}
