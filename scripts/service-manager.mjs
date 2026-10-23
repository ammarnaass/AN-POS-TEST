// أداة إدارة خدمة خادم AN POS LAN لنظام ويندوز (Windows Service Manager - Track C)
// تتيح تثبيت وتشغيل وإيقاف وإلغاء تثبيت خدمة ANPOSLanService عبر سطر الأوامر

import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const SERVICE_NAME = 'ANPOSLanService';
const SERVICE_DISPLAY_NAME = 'AN POS LAN Service';
const SERVICE_DESC = 'خدمة خادم الشبكة المحلية لنظام AN POS';

const action = process.argv[2] || 'status';
const customExe = process.argv[3];

console.log('===========================================================');
console.log(`🔧 [service-manager] إدارة خدمة ويندوز: ${SERVICE_NAME}`);
console.log('===========================================================');

function resolveExePath() {
  if (customExe && fs.existsSync(customExe)) {
    return path.resolve(customExe);
  }
  const defaultUnpacked = path.resolve('release/win-unpacked/AN POS.exe');
  if (fs.existsSync(defaultUnpacked)) {
    return defaultUnpacked;
  }
  const defaultProgramFiles = 'C:\\Program Files\\AN POS\\AN POS\\AN POS.exe';
  return defaultProgramFiles;
}

function runScCommand(args) {
  if (process.platform !== 'win32') {
    console.log(`[service-manager] (محاكاة بيئة لينكس) تنفيذ: sc.exe ${args}`);
    return { success: true, stdout: 'Simulator Mode' };
  }

  try {
    const stdout = execSync(`sc.exe ${args}`, { stdio: 'pipe', encoding: 'utf-8' });
    return { success: true, stdout };
  } catch (err) {
    return { success: false, error: err.message, stdout: err.stdout ? err.stdout.toString() : '' };
  }
}

switch (action.toLowerCase()) {
  case 'install': {
    const exePath = resolveExePath();
    console.log(`[service-manager] جارٍ تثبيت الخدمة: ${SERVICE_NAME}`);
    console.log(`   - المسار المستهدف: "${exePath}" --service`);

    const binPath = `\\"${exePath}\\" --service`;
    const createRes = runScCommand(`create ${SERVICE_NAME} binPath= "${binPath}" start= auto DisplayName= "${SERVICE_DISPLAY_NAME}"`);

    if (createRes.success) {
      console.log('✅ تم تسجيل خدمة ويندوز بنجاح!');
      // ضبط الوصف وسياسة التعافي التلقائي (Auto-Recovery)
      runScCommand(`description ${SERVICE_NAME} "${SERVICE_DESC}"`);
      runScCommand(`failure ${SERVICE_NAME} reset= 86400 actions= restart/5000/restart/10000/restart/30000`);
      console.log('✅ تم ضبط سياسة إعادة التشغيل التلقائي عند الفشل (Auto-Recovery Policy).');
    } else {
      console.error('❌ فشل تثبيت الخدمة:', createRes.stdout || createRes.error);
      process.exit(1);
    }
    break;
  }

  case 'start': {
    console.log(`[service-manager] جارٍ تشغيل الخدمة: ${SERVICE_NAME}...`);
    const res = runScCommand(`start ${SERVICE_NAME}`);
    if (res.success) {
      console.log('✅ تم إرسال أمر بدء التشغيل للخدمة بنجاح.');
    } else {
      console.error('❌ تعذر تشغيل الخدمة:', res.stdout || res.error);
      process.exit(1);
    }
    break;
  }

  case 'stop': {
    console.log(`[service-manager] جارٍ إيقاف الخدمة: ${SERVICE_NAME}...`);
    const res = runScCommand(`stop ${SERVICE_NAME}`);
    if (res.success) {
      console.log('✅ تم إرسال أمر إيقاف الخدمة بنجاح.');
    } else {
      console.error('❌ تعذر إيقاف الخدمة:', res.stdout || res.error);
      process.exit(1);
    }
    break;
  }

  case 'status': {
    console.log(`[service-manager] فحص حالة الخدمة: ${SERVICE_NAME}...`);
    const res = runScCommand(`query ${SERVICE_NAME}`);
    if (res.success) {
      console.log(res.stdout);
    } else {
      console.log(`ℹ️ الخدمة غير مسجلة حالياً أو متوقفة (رمز: ${res.stdout || res.error})`);
    }
    break;
  }

  case 'uninstall': {
    console.log(`[service-manager] جارٍ إلغاء تثبيت وحذف الخدمة: ${SERVICE_NAME}...`);
    runScCommand(`stop ${SERVICE_NAME}`);
    const res = runScCommand(`delete ${SERVICE_NAME}`);
    if (res.success) {
      console.log('✅ تم حذف وإلغاء تسجيل الخدمة من نظام ويندوز بنجاح.');
    } else {
      console.error('❌ تعذر حذف الخدمة:', res.stdout || res.error);
      process.exit(1);
    }
    break;
  }

  default:
    console.log(`استخدام الأداة: node scripts/service-manager.mjs [install|start|stop|status|uninstall] [exePath]`);
    process.exit(1);
}
