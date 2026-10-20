// معالجات IPC لتكامل النظام وتكوين ويندوز (System Integration & Auto-Launch & First-Run Setup)
// يوفر التحكم في التشغيل التلقائي مع بدء تشغيل نظام ويندوز (Windows Startup)
// ويوفر إدارة ملف إعدادات البيئة config.json وشاشة الإعداد الأول (First-Run Wizard)

import { app, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabasePath, getSqlite } from '../database';
import { hashPassword, verifyPassword } from '../handlers/password-hash';
import { KNOWN_WEAK_PINS } from '../seed';

export interface AppConfigFile {
  version: string;
  firstRunCompleted: boolean;
  language: string;
  baseCurrency: string;
  shopName: string;
  phone: string;
  installedAt: string;
  lastRunAt: string;
}

export interface FirstRunSetupPayload {
  shopName: string;
  phone?: string;
  baseCurrency?: string;
  language?: string;
  adminPin?: string;
}

/**
 * جلب مسار ملف الإعدادات config.json وضمان وجود المجلدات الفرعية في userData
 */
export function getConfigFilePath(): string {
  const userData = app.getPath('userData');
  try {
    fs.mkdirSync(userData, { recursive: true });
    fs.mkdirSync(path.join(userData, 'backups'), { recursive: true });
    fs.mkdirSync(path.join(userData, 'logs'), { recursive: true });
  } catch (err) {
    console.warn('[system] تنبيه أثناء إنشاء مجلدات userData:', err);
  }
  return path.join(userData, 'config.json');
}

/**
 * قراءة ملف config.json أو إنشاؤه بقيم افتراضية إذا لم يكن موجوداً
 */
export function getOrCreateConfigFile(): AppConfigFile {
  const filePath = getConfigFilePath();
  const now = new Date().toISOString();
  const defaultConfig: AppConfigFile = {
    version: app.getVersion() || '1.0.0',
    firstRunCompleted: false,
    language: 'ar',
    baseCurrency: 'دج',
    shopName: 'متجري',
    phone: '',
    installedAt: now,
    lastRunAt: now,
  };

  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      console.log(`[system] تم إنشاء ملف إعدادات افتراضي: ${filePath}`);
      return defaultConfig;
    } catch (err) {
      console.warn('[system] تعذر كتابة ملف config.json:', err);
      return defaultConfig;
    }
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    // تحديث الإصدار دائماً للنسخة الحالية من البرنامج (مهم عند الترقية)
    const currentVersion = app.getVersion() || '1.0.0';
    const previousVersion = parsed.version || null;
    const updated: AppConfigFile = {
      ...defaultConfig,
      ...parsed,
      version: currentVersion,
      lastRunAt: now,
    };

    // تنظيف _upgradedFrom المخزن سابقاً حتى لا يتكرر تسجيل الترقية في كل تشغيل لاحق
    delete (updated as any)._upgradedFrom;

    // كشف الترقية: إذا كان الإصدار المحفوظ مختلفاً عن الإصدار الحالي
    let upgradedFrom: string | null = null;
    if (previousVersion && previousVersion !== currentVersion) {
      console.log(`[system] 🔄 تم اكتشاف ترقية البرنامج: ${previousVersion} → ${currentVersion}`);
      upgradedFrom = previousVersion;
    }
    try {
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    } catch {}

    // إرفاق _upgradedFrom بالكائن في الذاكرة للجلسة الحالية فقط دون حفظه في القرص
    if (upgradedFrom) {
      (updated as any)._upgradedFrom = upgradedFrom;
    }
    return updated;
  } catch (err) {
    console.warn('[system] خطأ في قراءة config.json، سيتم استخدام القيم الافتراضية:', err);
    return defaultConfig;
  }
}

/**
 * التحقق مما إذا كان هذا هو التشغيل الأول للتطبيق
 * يفحص كلاً من ملف config.json وجدول settings في قاعدة البيانات لمنع تكرار الشاشة عند إعادة التثبيت
 */
export interface FirstRunCheckResult {
  isFirstRun: boolean;
  config: AppConfigFile;
  /** true إذا كان هناك حساب إداري نشط ما زال يستخدم رمزاً افتراضياً معروفاً (خطر أمني) */
  weakAdminPin: boolean;
}

/**
 * هل يوجد حساب إداري نشط ما زال يستخدم رمزاً افتراضياً معروفاً؟
 * يُستخدم لإجبار المستخدم على تعيين رمز قوي قبل استخدام النظام (وقاية للحسابات القديمة).
 */
export function hasWeakAdminPin(): boolean {
  try {
    const sqlite = getSqlite();
    const rows = sqlite
      .prepare("SELECT pin FROM users WHERE role IN ('admin','owner','manager','developer') AND status = 'active'")
      .all() as Array<{ pin: string }>;
    return rows.some((row) => row?.pin && KNOWN_WEAK_PINS.some((weak) => verifyPassword(weak, row.pin)));
  } catch {
    // قاعدة البيانات غير جاهزة بعد — لا نفترض وجود خطر
    return false;
  }
}

/**
 * التحقق من قوة الرمز السري — يطابق سياسة الواجهة في src/utils/passwordStrength.tsx
 */
export function isStrongSecret(value: string): boolean {
  const secret = (value || '').trim();
  if (secret.length < 8) return false;
  if (!/[a-zA-Z\u0600-\u06FF]/.test(secret)) return false;
  if (!/[0-9]/.test(secret)) return false;
  if (KNOWN_WEAK_PINS.includes(secret.toLowerCase())) return false;
  return true;
}

function checkIsFirstRunInternal(): { isFirstRun: boolean; config: AppConfigFile } {
  const config = getOrCreateConfigFile();

  // 1. إذا كان ملف الإعدادات قد سجل اكتمال الإعداد الأول مسبقاً
  if (config.firstRunCompleted) {
    return { isFirstRun: false, config };
  }

  // 2. التحقق من قاعدة البيانات (في حال وجود قاعدة بيانات سابقة أو إعادة تثبيت)
  try {
    const sqlite = getSqlite();
    const settingsRow = sqlite.prepare("SELECT shop_name, phone, base_currency, first_run_completed FROM settings WHERE id = 'default' LIMIT 1").get() as any;
    if (settingsRow) {
      if (Number(settingsRow.first_run_completed) === 1) {
        config.firstRunCompleted = true;
        try {
          fs.writeFileSync(getConfigFilePath(), JSON.stringify(config, null, 2), 'utf-8');
        } catch {}
        return { isFirstRun: false, config };
      }

      // إذا كان اسم المتجر قد تم تخصيصه وتغييره عن الاسم الافتراضي
      if (settingsRow.shop_name && settingsRow.shop_name !== 'متجري') {
        config.firstRunCompleted = true;
        try {
          fs.writeFileSync(getConfigFilePath(), JSON.stringify(config, null, 2), 'utf-8');
        } catch {}
        return { isFirstRun: false, config };
      }
    }

    // 3. التحقق مما إذا كانت هناك بيانات مبيعات أو أصناف مخصصة تفوق البذور الافتراضية
    try {
      const salesCount = (sqlite.prepare('SELECT count(*) as count FROM sales').get() as any)?.count;
      if (Number(salesCount) > 0) {
        config.firstRunCompleted = true;
        try {
          fs.writeFileSync(getConfigFilePath(), JSON.stringify(config, null, 2), 'utf-8');
        } catch {}
        return { isFirstRun: false, config };
      }

      // إذا كانت الأصناف تفوق البذور الافتراضية (10 أصناف تجريبية)
      const productsCount = (sqlite.prepare('SELECT count(*) as count FROM products').get() as any)?.count;
      if (Number(productsCount) > 10) {
        config.firstRunCompleted = true;
        try {
          fs.writeFileSync(getConfigFilePath(), JSON.stringify(config, null, 2), 'utf-8');
        } catch {}
        return { isFirstRun: false, config };
      }
    } catch {
      // تجاهل الخطأ في حال عدم وجود الجداول بعد
    }
  } catch {
    // في حال عدم جاهزية قاعدة البيانات بعد، نعتمد على ملف الإعدادات
  }

  return { isFirstRun: !config.firstRunCompleted, config };
}

/**
 * فحص حالة التشغيل الأول مع إعطاء الأولوية الأمنية:
 * إن وُجد رمز إداري افتراضي معروف يُعاد isFirstRun = true لإجبار المستخدم على تعيين رمز قوي.
 */
export function checkIsFirstRun(): FirstRunCheckResult {
  const config = getOrCreateConfigFile();
  if (hasWeakAdminPin()) {
    return { isFirstRun: true, config, weakAdminPin: true };
  }
  return { ...checkIsFirstRunInternal(), weakAdminPin: false };
}

/**
 * حفظ بيانات الإعداد الأول في ملف config.json وقاعدة البيانات SQLite
 */
export function saveFirstRunSetup(payload: FirstRunSetupPayload): { success: boolean; config: AppConfigFile; error?: string } {
  try {
    const config = getOrCreateConfigFile();
    const filePath = getConfigFilePath();
    const adminPin = (payload.adminPin || '').trim();

    // 0. تحقق أمني: يجب تعيين رمز قوي للمدير
    if (adminPin && !isStrongSecret(adminPin)) {
      return {
        success: false,
        config,
        error: 'الرمز السري ضعيف: يجب أن يتكوّن من 8 خانات على الأقل ويحتوي أحرفاً وأرقاماً.',
      };
    }
    // لا يكتمل الإعداد الأول ما دام هناك حساب إداري برمز افتراضي معروف
    if (!adminPin && hasWeakAdminPin()) {
      return {
        success: false,
        config,
        error: 'يجب تعيين رمز سري قوي لحساب المدير قبل المتابعة.',
      };
    }

    config.firstRunCompleted = true;
    config.shopName = (payload.shopName || config.shopName).trim();
    if (payload.phone) config.phone = payload.phone.trim();
    if (payload.baseCurrency) config.baseCurrency = payload.baseCurrency.trim();
    if (payload.language) config.language = payload.language.trim();
    config.lastRunAt = new Date().toISOString();

    // 1. كتابة ملف config.json
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');

    // 2. تحديث جدول settings في SQLite (غير حاسم — لا يُفشل العملية)
    try {
      const sqlite = getSqlite();
      sqlite.prepare(`
        UPDATE settings SET
          shop_name = ?,
          phone = ?,
          base_currency = ?,
          language = ?,
          first_run_completed = 1
        WHERE id = 'default'
      `).run(config.shopName, config.phone, config.baseCurrency, config.language);
    } catch (dbErr) {
      console.warn('[system] تم حفظ config.json ولكن تعذر تحديث جدول الإعدادات فوراً:', dbErr);
    }

    // 3. تحديث رمز المدير — حاسم: فشله يُفشل العملية كاملة (وإلا بقي رمز افتراضي معروف)
    if (adminPin) {
      const sqlite = getSqlite();
      const hashedPin = hashPassword(adminPin);
      const now = new Date().toISOString();
      // البحث عن حساب المدير الأساسي بدقة لمنع تغيير PIN لجميع المديرين دفعة واحدة (M7)
      const targetAdmin = sqlite
        .prepare(`
          SELECT id FROM users
          WHERE username = 'admin@dante.com'
             OR role = 'admin'
          ORDER BY CASE WHEN username = 'admin@dante.com' THEN 0 ELSE 1 END, created_at ASC
          LIMIT 1
        `)
        .get() as { id: string } | undefined;

      if (!targetAdmin?.id) {
        throw new Error('تعذّر العثور على حساب المدير لتحديث رمزه السري.');
      }

      const result = sqlite
        .prepare(`
          UPDATE users SET pin = ?, password_changed_at = ?, updated_at = ?
          WHERE id = ?
        `)
        .run(hashedPin, now, now, targetAdmin.id);

      if (!result.changes) {
        throw new Error('تعذّر العثور على حساب المدير لتحديث رمزه السري.');
      }
    }

    return { success: true, config };
  } catch (err: any) {
    console.error('[system] فشل حفظ بيانات الإعداد الأول:', err);
    return { success: false, config: getOrCreateConfigFile(), error: err?.message || String(err) };
  }
}

export function registerSystemIpc(): void {
  // 1. الاستعلام عن حالة التشغيل التلقائي مع النظام
  ipcMain.handle('system:getAutoLaunch', async () => {
    try {
      const loginSettings = app.getLoginItemSettings();
      return { success: true, enabled: Boolean(loginSettings.openAtLogin) };
    } catch (error) {
      console.error('[system:getAutoLaunch] فشل قراءة حالة التشغيل التلقائي:', error);
      return { success: false, enabled: false, error: String(error) };
    }
  });

  // 2. تفعيل أو تعطيل التشغيل التلقائي مع بدء تشغيل نظام ويندوز
  ipcMain.handle('system:setAutoLaunch', async (_evt, enabled: boolean) => {
    try {
      const isEnable = Boolean(enabled);
      app.setLoginItemSettings({
        openAtLogin: isEnable,
        path: process.execPath,
        args: [],
      });
      const updated = app.getLoginItemSettings();
      console.log(`[system] تم ضبط التشغيل التلقائي مع بدء النظام إلى: ${isEnable ? 'مفعل' : 'معطل'}`);
      return { success: true, enabled: Boolean(updated.openAtLogin) };
    } catch (error) {
      console.error('[system:setAutoLaunch] فشل ضبط التشغيل التلقائي:', error);
      return { success: false, enabled: false, error: String(error) };
    }
  });

  // 3. جلب المسار النشط لملف قاعدة البيانات
  ipcMain.handle('system:getDatabasePath', async () => {
    try {
      const dbPath = getDatabasePath();
      return { success: true, path: dbPath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 4. اختبار الاتصال بعنوان خادم محلي (LAN Server Ping)
  ipcMain.handle('system:testServerConnection', async (_evt, serverUrl: string) => {
    try {
      const cleanUrl = (serverUrl || '').trim().replace(/\/+$/, '');
      if (!cleanUrl) {
        return { success: false, error: 'عنوان الخادم غير محدد' };
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${cleanUrl}/api/health`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        return { success: false, status: res.status, error: `استجاب الخادم برمز خطأ (${res.status})` };
      }
      const data = await res.json();
      return { success: true, data };
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      return {
        success: false,
        error: isTimeout ? 'انتهت مهلة الاتصال بالخادم (4 ثوانٍ)' : (err.message || 'تعذر الوصول إلى الخادم على الشبكة'),
      };
    }
  });

  // 5. فحص حالة الإعداد الأول (First-Run Wizard status)
  ipcMain.handle('system:isFirstRun', async () => {
    try {
      const result = checkIsFirstRun();
      return { success: true, isFirstRun: result.isFirstRun, weakAdminPin: result.weakAdminPin, config: result.config };
    } catch (error) {
      return { success: false, isFirstRun: false, error: String(error) };
    }
  });

  // 6. جلب بيانات ملف الإعدادات config.json
  ipcMain.handle('system:getConfig', async () => {
    try {
      const config = getOrCreateConfigFile();
      return { success: true, config };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 7. حفظ بيانات شاشة الإعداد الأول واكتمال التهيئة
  ipcMain.handle('system:saveFirstRunSetup', async (_evt, payload: FirstRunSetupPayload) => {
    try {
      return saveFirstRunSetup(payload);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}

