// مشغل خادم LAN كخدمة ويندوز مستقلة (Windows Service Mode - Track C)
// يعمل في الخلفية بدون واجهة مستخدم (Headless) حتى قبل تسجيل دخول المستخدم
// يتيح للهواتف والطرفيات التابعة الاتصال بالخادم والعمل المستمر دون الحاجة لفتح نافذة التطبيق

import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase, closeDatabase } from '../database';
import { seedDatabase } from '../seed';
import { startHttpServer, stopHttpServer } from '../server/index';
import { checkFirewallRule, configureFirewallRule } from '../firewall';

let serviceModeActive = false;
let backupIntervalId: NodeJS.Timeout | null = null;
let logStream: fs.WriteStream | null = null;

export function isServiceModeActive(): boolean {
  return serviceModeActive;
}

/**
 * تحديد مسار مجلد بيانات الخدمة في %PROGRAMDATA% ليكون مشتركاً ومستقلاً عن جلسة المستخدم
 */
export function resolveServiceDataDir(): string {
  if (process.env.AN_POS_SERVICE_DATA_DIR) {
    return path.resolve(process.env.AN_POS_SERVICE_DATA_DIR);
  }

  const baseProgramData = process.env.PROGRAMDATA || (process.platform === 'win32' ? 'C:\\ProgramData' : '/var/lib');
  const serviceDir = path.join(baseProgramData, 'AN POS', 'data');
  
  if (!fs.existsSync(serviceDir)) {
    try {
      fs.mkdirSync(serviceDir, { recursive: true });
    } catch {
      // Fallback إلى مجلد محلي إذا تعذرت الكتابة في ProgramData (في بيئات التطوير غير المرتفعة)
      const fallback = path.resolve('data');
      if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
      return fallback;
    }
  }

  return serviceDir;
}

/**
 * إعداد ملف تسجيل أحداث الخدمة (Service Logging)
 */
function initServiceLogger(): void {
  try {
    const baseProgramData = process.env.PROGRAMDATA || (process.platform === 'win32' ? 'C:\\ProgramData' : '/var/log');
    const logsDir = path.join(baseProgramData, 'AN POS', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFile = path.join(logsDir, 'service.log');
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  } catch {
    // تجاهل أخطاء مجلد السجلات في بيئات الاختبار
  }
}

export function logServiceEvent(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [SERVICE] [${level.toUpperCase()}] ${message}\n`;
  console.log(formatted.trim());
  if (logStream) {
    logStream.write(formatted);
  }
}

/**
 * فحص ما إذا كان التطبيق قد تم استدعاؤه كخدمة ويندوز (--service)
 * يتم استدعاؤه في بداية main/index.ts
 */
export function handleServiceCommand(): boolean {
  if (!process.argv.includes('--service')) {
    return false;
  }

  serviceModeActive = true;
  console.log('===========================================================');
  console.log('🚀 [service] بدء تشغيل AN POS في نمط خدمة ويندوز (Headless Service)');
  console.log('===========================================================');

  // تعطيل الواجهة الرسومية وتسريع الأداء في نمط الخدمة
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('headless');
  app.disableHardwareAcceleration();

  initServiceLogger();
  logServiceEvent('جارٍ تهيئة AN POS LAN Service...');

  app.whenReady().then(async () => {
    try {
      // 1. تحديد وتثبيت مسار قاعدة البيانات للخدمة
      const dataDir = resolveServiceDataDir();
      const serviceDbPath = path.join(dataDir, 'anpos.db');
      process.env.AN_POS_DB_PATH = serviceDbPath;
      logServiceEvent(`مسار قاعدة البيانات المعتمد للخدمة: ${serviceDbPath}`);

      // 2. فحص وتأمين قاعدة جدار الحماية للمنفذ 3000
      try {
        const fw = await checkFirewallRule(3000);
        if (!fw.exists) {
          logServiceEvent('قاعدة جدار الحماية غير موجودة، جارٍ إعدادها...', 'warn');
          await configureFirewallRule(3000);
        }
      } catch (fwErr: any) {
        logServiceEvent(`تعذر فحص جدار الحماية: ${fwErr.message}`, 'warn');
      }

      // 3. تهيئة قاعدة البيانات والهجرات التلقائية (node:sqlite + Drizzle)
      logServiceEvent('تهيئة قاعدة البيانات ونظام WAL...');
      initDatabase();
      seedDatabase();

      // 4. تشغيل خادم Fastify HTTP و WebSocket
      const port = parseInt(process.env.PORT || '3000', 10);
      logServiceEvent(`تشغيل خادم Fastify و WebSocket على المنفذ ${port}...`);
      await startHttpServer({ host: '0.0.0.0', port });

      // 5. جدولة النسخ الاحتياطي التلقائي وتفريغ سجل WAL كل 6 ساعات
      const backupsDir = path.join(dataDir, 'backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      backupIntervalId = setInterval(() => {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupPath = path.join(backupsDir, `service_auto_${timestamp}.db`);
          logServiceEvent(`تنفيذ النسخ الاحتياطي التلقائي للخدمة: ${backupPath}`);
          // تفريغ WAL عبر executePrepareUpgrade
          import('../backup/preUpgrade').then(({ executePrepareUpgrade }) => {
            executePrepareUpgrade(backupsDir);
          });
        } catch (bkErr: any) {
          logServiceEvent(`فشل النسخ الاحتياطي التلقائي للخدمة: ${bkErr.message}`, 'error');
        }
      }, 6 * 60 * 60 * 1000);

      logServiceEvent('✅ خدمة AN POS LAN Service تعمل بنجاح وجاهزة لاستقبال اتصالات نقاط البيع والهواتف!');
    } catch (err: any) {
      logServiceEvent(`❌ خطأ فادح أثناء تشغيل الخدمة: ${err.message}`, 'error');
      process.exit(1);
    }
  });

  // معالجة إشارات الإنهاء النظيف من نظام التشغيل (Windows Service Control / SCM)
  const shutdown = async (signal: string) => {
    logServiceEvent(`تم تلقي إشارة إيقاف الخدمة (${signal})، جارٍ الإنهاء النظيف...`);
    if (backupIntervalId) clearInterval(backupIntervalId);
    try {
      await stopHttpServer();
      closeDatabase();
      logServiceEvent('تم إغلاق الخادم وقاعدة البيانات بنجاح.');
    } catch (err: any) {
      logServiceEvent(`خطأ أثناء الإغلاق: ${err.message}`, 'error');
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return true;
}

/**
 * فحص ما إذا كانت خدمة ويندوز المحلية تعمل بالفعل في الخلفية على المنفذ 3000
 * يُستدعى بواسطة واجهة سطح المكتب لتفادي تعارض المنفذ
 */
export async function isLocalServiceRunning(port = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const data = await res.json() as any;
    return data && (data.status === 'ok' || data.app === 'an-pos');
  } catch {
    return false;
  }
}
