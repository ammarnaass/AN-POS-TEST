import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { initDatabase, closeDatabase } from './database';
import { seedDatabase } from './seed';
import { registerIpcHandlers } from './ipc/register';
import { startHttpServer, stopHttpServer, isHttpServerRunning, getNetworkSettings, getOrCreateConnectionKey } from './server/index';
import { queryOne } from './handlers/db-utils';
import { isDeveloperModeActive } from './handlers/auth';
import { getOrCreateConfigFile } from './ipc/system';
import { initTray, updateTrayMenu, destroyTray, getIsQuitting, setIsQuitting } from './tray';
import { handleCliBackupCommands } from './backup/preUpgrade';
import { setupAutoUpdater, registerUpdaterIpc, cleanupAutoUpdater } from './updater';

// 0. معالجة أوامر الترقية والنسخ الاحتياطي عبر سطر الأوامر (CLI - A3)
// يجب أن يُنفّذ قبل فحص قفل النسخة الواحدة لتمكين المثبت من طلب checkpoint و vacuum حتى أثناء تشغيل البرنامج
if (handleCliBackupCommands()) {
  // تم تنفيذ الأمر وانتهت العملية فوراً
}

// 1. قفل النسخة الواحدة (Single Instance Lock)
// يمنع تشغيل أكثر من نسخة من البرنامج في نفس الوقت لتفادي تعارض أو تلف قاعدة بيانات SQLite
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.warn('[main] ⚠️ تم تشغيل نسخة ثانية من التطبيق بينما البرنامج قيد التشغيل بالفعل — سيتم الإنهاء فوراً.');
  app.quit();
}

// تثبيت اسم التطبيق صراحةً — يضمن ثبات مسار بيانات المستخدم (%APPDATA%\an-pos) وعدم انتقال
// قاعدة البيانات إذا تغيّر productName في package.json مستقبلاً. يجب أن يُنفَّذ قبل أي app.getPath().
app.setName('an-pos');

// إخفاء شريط القوائم الافتراضي بالكامل (File, Edit, View, Window, etc.)
Menu.setApplicationMenu(null);

// توافقية: Electron 40 لا يدعم Windows 7 / 8 / 8.1 (الحد الأدنى هو Windows 10).
// أُزيلت تحايلات الأنظمة القديمة (use-angle d3d9 / no-sandbox) لأن النظام لا يعمل عليها أصلاً،
// وكانت تُضعف أمان كل تشغيل على ويندوز دون فائدة. للعملاء على أنظمة أقدم: فرع إصدار بـ Electron ≤ 22.

// دعم Wayland على لينكس
app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations');

// تعطيل GPU فقط عند الحاجة الصريحة في البيئات الافتراضية بدون شاشة (Headless/CI/VNC)
if (process.env.HEADLESS === 'true' || process.env.DISABLE_GPU === 'true') {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('in-process-gpu');
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
  app.disableHardwareAcceleration();
}

// node:sqlite يتطلب flag --experimental-sqlite في بعض إصدارات Node/Electron
// في Electron 43+ يُفعّل تلقائياً في main process

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  // 0. تجهيز بيئة العمل وملف الإعدادات الافتراضي (config.json)
  console.log('[main] تجهيز بيئة التشغيل وملف الإعدادات الافتراضي (config.json)...');
  try {
    const config = getOrCreateConfigFile();
    // تسجيل نوع التشغيل: تثبيت جديد أو تحديث أو تشغيل عادي
    if (!config.firstRunCompleted) {
      console.log('[main] 🆕 نوع التشغيل: تثبيت جديد بالكامل (Fresh Install) — سيظهر معالج الإعداد الأول');
    } else if ((config as any)._upgradedFrom) {
      console.log(`[main] 🔄 نوع التشغيل: ترقية البرنامج من ${(config as any)._upgradedFrom} إلى ${config.version} (Upgrade)`);
    } else {
      console.log(`[main] ✅ نوع التشغيل: تشغيل عادي — الإصدار ${config.version}`);
    }
  } catch (cfgErr) {
    console.warn('[main] تعذر تجهيز config.json:', cfgErr);
  }

  // 1. تهيئة قاعدة البيانات وتشغيل الهجرات التلقائية (Auto-Migration)
  console.log('[main] تهيئة قاعدة البيانات وتشغيل الهجرات التلقائية...');
  try {
    await initDatabase();
  } catch (dbErr: any) {
    console.error('[main] فشل فادح في تهيئة قاعدة البيانات:', dbErr);
    const causeMsg = dbErr?.cause?.message ? `\n(السبب الداخلي: ${dbErr.cause.message})` : '';

    // كتابة تقرير الخطأ إلى ملف logs في userData لضمان وجود أثر تشخيصي حتى لو أُغلقت النافذة
    try {
      const userData = app.getPath('userData');
      const logsDir = path.join(userData, 'logs');
      fs.mkdirSync(logsDir, { recursive: true });
      const errorLogPath = path.join(logsDir, 'startup_error.log');
      const timestamp = new Date().toISOString();
      fs.appendFileSync(
        errorLogPath,
        `[${timestamp}] DB Initialization Failure:\n${dbErr?.stack || dbErr?.message || dbErr}\n${causeMsg}\n\n`,
        'utf-8'
      );
    } catch (logErr) {
      console.warn('[main] تعذر كتابة startup_error.log:', logErr);
    }

    dialog.showErrorBox(
      'خطأ في تشغيل قاعدة البيانات (AN POS)',
      `تعذر على البرنامج فتح قاعدة البيانات أو تهيئة مجلد التخزين.\n\nالسبب المحتمل:\n- عدم وجود صلاحيات كتابة كافية في مسار البيانات.\n- ملف قاعدة البيانات قيد الاستخدام بواسطة برنامج آخر.\n\nالتفاصيل: ${dbErr?.message || dbErr}${causeMsg}`
    );
    app.quit();
    return;
  }

  // 2. تسجيل معالجات IPC (فقط وحصرياً بعد اكتمال تهيئة قاعدة البيانات)
  console.log('[main] تسجيل معالجات IPC...');
  registerIpcHandlers();
  registerUpdaterIpc();

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

  // 5. تشغيل خادم HTTP REST (فقط إن كان LAN مفعلًا ووضع التشغيل عدة أجهزة)
  try {
    const netSettings = getNetworkSettings();
    const lanEnabled = Boolean(netSettings?.lan_enabled);
    const settingsRow = queryOne('SELECT sync_mode, terminal_role FROM settings WHERE id = \'default\' LIMIT 1');
    const syncMode = (settingsRow?.sync_mode as string) || 'single';
    const terminalRole = (settingsRow?.terminal_role as string) || 'server';

    const isDev = isDeveloperModeActive();

    // تشغيل خادم Fastify فقط إذا كان هذا الجهاز خادماً رئيسياً (terminalRole === 'server')
    if (terminalRole === 'server' && (lanEnabled || isDev) && (syncMode !== 'single' || isDev)) {
      const port = Number(netSettings?.server_port) || 3000;
      // تأكد من وجود مفتاح اتصال (يُولّد تلقائياً عند الحاجة)
      getOrCreateConnectionKey();
      await startHttpServer({ port });
    } else {
      console.log(`[main] خادم HTTP معطّل (role = '${terminalRole}', lan_enabled = ${lanEnabled ? 1 : 0}, sync_mode = '${syncMode}')`);
    }
  } catch (e) {
    console.error('[main] فشل تشغيل خادم HTTP:', e);
  }

  // 6. إنشاء النافذة
  // ملاحظة: على Wayland/ozone قد لا يُطلق ready-to-show دائماً، لذا نُظهر فوراً
  const isDevMode = !app.isPackaged;
  const isWin = process.platform === 'win32';
  const startInBackground = process.argv.includes('--background');
  const icoCandidate = isDevMode
    ? path.join(__dirname, '../../build/icon.ico')
    : path.join(process.resourcesPath, 'icon.ico');
  const pngCandidate = isDevMode
    ? path.join(__dirname, '../../public/an-pos-icon.png')
    : path.join(process.resourcesPath, 'an-pos-icon.png');
  const iconPath = (isWin && fs.existsSync(icoCandidate)) ? icoCandidate : pngCandidate;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 360,
    minHeight: 480,
    show: !startInBackground,
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

  // منع فتح نوافذ عشوائية والتحكم في الروابط الخارجية
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // منع الملاحة غير المقصودة خارج التطبيق
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isRendererUrl = Boolean(process.env['ELECTRON_RENDERER_URL'] && url.startsWith(process.env['ELECTRON_RENDERER_URL']));
    const isLocalDev = url.startsWith('http://localhost:5173');
    const isLocalFile = url.startsWith('file://');
    if (!isRendererUrl && !isLocalDev && !isLocalFile) {
      event.preventDefault();
      shell.openExternal(url);
    }
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

  // تهيئة صينية النظام (System Tray) لتمكين بقاء خادم LAN بالخلفية (A9)
  initTray(mainWindow);
  updateTrayMenu(mainWindow);

  // تهيئة التحديثات التلقائية (A7)
  setupAutoUpdater();

  // اعتراض إغلاق النافذة: إخفاء إلى صينية النظام إذا كان خادم LAN نشطاً (A9)
  mainWindow.on('close', (event) => {
    if (!getIsQuitting() && isHttpServerRunning()) {
      event.preventDefault();
      mainWindow?.hide();
      updateTrayMenu(mainWindow);
      console.log('[main] 🔕 تم إخفاء نافذة التطبيق إلى صينية النظام مع استمرار تشغيل خادم LAN في الخلفية (A9).');
    }
  });

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

// تركيز النافذة الحالية أو إظهارها عند محاولة تشغيل نسخة ثانية من التطبيق
app.on('second-instance', () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// إطلاق التطبيق بأمان مع اعتراض أي خطأ غير متوقع
app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (err: any) {
    console.error('[main] خطأ فادح أثناء إطلاق نافذة التطبيق:', err);
    dialog.showErrorBox(
      'خطأ في تشغيل التطبيق (AN POS)',
      `حدث خطأ غير متوقع أثناء إطلاق التطبيق:\n${err?.message || err}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;
  // في حال كان خادم LAN يعمل، لا ننهي التطبيق بل نبقيه في الـ Tray (A9)
  if (isHttpServerRunning()) {
    updateTrayMenu(mainWindow);
    return;
  }
  closeDatabase();
  destroyTray();
  app.quit();
});

app.on('activate', () => {
  if (!BrowserWindow.getAllWindows().length) {
    createWindow();
  } else if (mainWindow && !mainWindow.isVisible()) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('before-quit', async () => {
  setIsQuitting(true);
  cleanupAutoUpdater();
  destroyTray();
  closeDatabase();
  await stopHttpServer().catch(() => {});
});

