// نقطة دخول Electron main process
// يتولى: تهيئة قاعدة البيانات + إنشاء الجداول + seed + تسجيل IPC + إنشاء النافذة

import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'node:path';
import { initDatabase, closeDatabase } from './database';
import { initSchema } from './schema-init';
import { seedDatabase } from './seed';
import { registerIpcHandlers } from './ipc/register';
import { startHttpServer, stopHttpServer, getNetworkSettings, getOrCreateConnectionKey } from './server/index';

// إخفاء شريط القوائم الافتراضي بالكامل (File, Edit, View, Window, etc.)
Menu.setApplicationMenu(null);

// تعطيل GPU sandbox — مطلوب في بيئات بدون GPU فعلي (خوادم/headless/VNC)
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');

// Wayland: اسمح لـ Electron بعرض النوافذ على جلسات Wayland عبر ozone
// (بدون هذا على Wayland لا تظهر النافذة)
app.commandLine.appendSwitch('ozone-platform', 'auto');
app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations');

// تعطيل تسريع العتاد بالكامل — حل رسمي لبيئات headless/VNC/server بدون GPU فعلي
// يمنع خطأ "GPU process isn't usable" الذي يقتل التطبيق قبل ظهور النافذة
app.disableHardwareAcceleration();

// node:sqlite يتطلب flag --experimental-sqlite في بعض إصدارات Node/Electron
// في Electron 43+ يُفعّل تلقائياً في main process

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  // 1. تهيئة قاعدة البيانات + إنشاء الجداول
  console.log('[main] تهيئة قاعدة البيانات...');
  initDatabase();
  initSchema();

  // 2. تسجيل معالجات IPC
  console.log('[main] تسجيل معالجات IPC...');
  registerIpcHandlers();

  // 3. استماع لحالة preload
  ipcMain.on('preload:status', (_e, status) => {
    console.log('[main] preload status:', status);
  });

  // 4. Seed البيانات الافتراضية
  console.log('[main] تهيئة البيانات الافتراضية...');
  try {
    await seedDatabase();
  } catch (e) {
    console.error('[main] فشل seed:', e);
  }

  // 5. تشغيل خادم HTTP REST (إن كان LAN مفعلًا في network_settings)
  try {
    const netSettings = getNetworkSettings();
    const lanEnabled = Boolean(netSettings?.lan_enabled);
    if (lanEnabled) {
      const port = Number(netSettings?.server_port) || 4321;
      // تأكد من وجود مفتاح اتصال (يُولّد تلقائياً عند الحاجة)
      getOrCreateConnectionKey();
      await startHttpServer({ port });
    } else {
      console.log('[main] خادم HTTP معطّل (lan_enabled = 0 في network_settings)');
    }
  } catch (e) {
    console.error('[main] فشل تشغيل خادم HTTP:', e);
  }

  // 6. إنشاء النافذة
  // ملاحظة: على Wayland/ozone قد لا يُطلق ready-to-show دائماً، لذا نُظهر فوراً
  const isDevMode = !app.isPackaged;
  const iconPath = isDevMode
    ? path.join(__dirname, '../../public/an-pos-icon.png')
    : path.join(process.resourcesPath, 'an-pos-icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 360,
    minHeight: 480,
    show: true,
    autoHideMenuBar: true,
    title: 'AN POS',
    icon: iconPath,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: (() => {
        const mjs = path.join(__dirname, '../preload/index.mjs');
        const js = path.join(__dirname, '../preload/index.js');
        const cjs = path.join(__dirname, '../preload/index.cjs');
        if (path.extname(__filename) === '.cjs') return cjs;
        return mjs;
      })(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // sandbox: false يسمح للـ preload بالوصول لـ ipcRenderer
      // node:sqlite متاح في main process فقط
    },
  });

  // إخفاء وحذف شريط القوائم (File, Edit, View, Window) نهائياً على جميع المنصات
  mainWindow.setMenu(null);
  mainWindow.removeMenu();
  mainWindow.setMenuBarVisibility(false);

  // احتياط: إن لم تكن النافذة ظاهرة، أظهرها عند ready-to-show
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
  });

  // التقاط أخطاء الـ preload
  mainWindow.webContents.on('preload-error', (_e, preloadPath, error) => {
    console.error('[preload-error]', preloadPath, error);
  });
  mainWindow.webContents.on('console-message', (_e, _level, message, _line, _sourceId) => {
    console.log('[renderer]', message);
  });

  // تحميل الواجهة
  const isDev = !app.isPackaged;
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools();
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // وضع الإنتاج: ملف مبني
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// تطبيق إخفاء شريط القوائم على أي نافذة جديدة يتم إنشاؤها في التطبيق
app.on('browser-window-created', (_event, window) => {
  window.setMenu(null);
  window.removeMenu();
  window.setMenuBarVisibility(false);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  closeDatabase();
  stopHttpServer().catch(() => {});
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!BrowserWindow.getAllWindows().length) createWindow();
});

app.on('before-quit', async () => {
  closeDatabase();
  await stopHttpServer().catch(() => {});
});

