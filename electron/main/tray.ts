// مدير صينية النظام (System Tray Manager) — A9
// يتيح استمرار عمل خادم LAN والـ WebSocket في الخلفية بعد إغلاق الواجهة الرئيسية (Window Close to Tray)
// ويمنع انقطاع اتصال أجهزة الكاشير والهواتف المحمولة التابعة مع توفير تحكم كامل بالإيقاف والخروج

import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { isHttpServerRunning, stopHttpServer, getNetworkSettings } from './server/index';

let tray: Tray | null = null;
let isQuitting = false;

export function getIsQuitting(): boolean {
  return isQuitting;
}

export function setIsQuitting(value: boolean): void {
  isQuitting = value;
}

/**
 * استخراج مسار أيقونة الـ Tray الأنسب للمنصة
 */
function getTrayIconPath(): string {
  const isDev = !app.isPackaged;
  const isWin = process.platform === 'win32';

  const icoCandidate = isDev
    ? path.join(__dirname, '../../build/icon.ico')
    : path.join(process.resourcesPath, 'icon.ico');

  const pngCandidate = isDev
    ? path.join(__dirname, '../../public/an-pos-icon.png')
    : path.join(process.resourcesPath, 'an-pos-icon.png');

  if (isWin && fs.existsSync(icoCandidate)) {
    return icoCandidate;
  }
  if (fs.existsSync(pngCandidate)) {
    return pngCandidate;
  }
  return icoCandidate;
}

/**
 * تحديث قائمة سياق الـ Tray حسب حالة الخادم
 */
export function updateTrayMenu(mainWindow?: BrowserWindow | null): void {
  if (!tray) return;

  const serverRunning = isHttpServerRunning();
  const netSettings = getNetworkSettings();
  const port = Number(netSettings?.server_port) || 3000;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'فتح AN POS',
      click: () => {
        if (mainWindow) {
          if (!mainWindow.isVisible()) mainWindow.show();
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: serverRunning
        ? `🟢 خادم LAN: نشط (منفذ ${port})`
        : '⚪ خادم LAN: متوقف',
      enabled: false,
    },
    ...(serverRunning
      ? [
          {
            label: 'إيقاف خادم الشبكة المحلية',
            click: async () => {
              await stopHttpServer();
              updateTrayMenu(mainWindow);
            },
          },
        ]
      : []),
    { type: 'separator' },
    {
      label: 'إغلاق التطبيق نهائياً (خروج)',
      click: async () => {
        isQuitting = true;
        await stopHttpServer().catch(() => {});
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(
    serverRunning
      ? `AN POS — خادم LAN يعمل على المنفذ ${port}`
      : 'AN POS — نقطة البيع المتقدمة'
  );
}

/**
 * تهيئة أيقونة صينية النظام (System Tray)
 */
export function initTray(mainWindow: BrowserWindow): Tray | null {
  if (tray) return tray;

  const iconPath = getTrayIconPath();
  let image = nativeImage.createFromPath(iconPath);

  // تصغير الأيقونة لحجم صينية النظام المعتاد (16x16 أو 24x24)
  if (!image.isEmpty()) {
    image = image.resize({ width: 16, height: 16 });
  }

  tray = new Tray(image);

  updateTrayMenu(mainWindow);

  // النقر على الأيقونة يفتح/يخفي النافذة
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      if (isHttpServerRunning()) {
        mainWindow.hide();
      } else {
        mainWindow.focus();
      }
    } else {
      mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  tray.on('double-click', () => {
    if (!mainWindow) return;
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  return tray;
}

/**
 * تنظيف صينية النظام عند الإنهاء
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
