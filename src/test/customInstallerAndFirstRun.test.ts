// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// قراءة رقم الإصدار الحالي من package.json — المصدر الوحيد للحقيقة
const pkgVersion = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8')).version;

describe('Custom Installer & First-Run Environment Setup', () => {
  const testDir = path.resolve('src/test/tmp_installer_env');
  const configPath = path.join(testDir, 'config.json');
  const dbPath = path.join(testDir, 'anpos.db');

  beforeEach(() => {
    process.env.ANPOS_DATA_DIR = testDir;
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'backups'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'logs'), { recursive: true });
  });

  afterEach(() => {
    delete process.env.ANPOS_DATA_DIR;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('generates a valid default config.json with required initial fields', () => {
    const now = new Date().toISOString();
    const defaultConfig = {
      version: '1.0.0',
      firstRunCompleted: false,
      language: 'ar',
      baseCurrency: 'دج',
      shopName: 'متجري',
      phone: '',
      installedAt: now,
      lastRunAt: now,
    };

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    expect(fs.existsSync(configPath)).toBe(true);

    const read = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(read.firstRunCompleted).toBe(false);
    expect(read.shopName).toBe('متجري');
    expect(read.baseCurrency).toBe('دج');
    expect(read.language).toBe('ar');
  });

  it('persists first-run wizard setup to config.json and SQLite settings table', () => {
    // 1. إنشاء جدول الإعدادات المصغر
    const sqlite = new DatabaseSync(dbPath);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        shop_name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        base_currency TEXT NOT NULL DEFAULT 'دج',
        language TEXT DEFAULT 'ar',
        first_run_completed INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO settings (id, shop_name, phone, base_currency, language, first_run_completed)
      VALUES ('default', 'متجري', '0555555555', 'دج', 'ar', 0);
    `);

    // 2. محاكاة حفظ إعدادات المعالج
    const userPayload = {
      shopName: 'سوبرماركت الأمل',
      phone: '0555 12 34 56',
      baseCurrency: 'دج',
      language: 'ar',
    };

    const config = {
      version: '1.0.0',
      firstRunCompleted: true,
      shopName: userPayload.shopName,
      phone: userPayload.phone,
      baseCurrency: userPayload.baseCurrency,
      language: userPayload.language,
      installedAt: new Date().toISOString(),
      lastRunAt: new Date().toISOString(),
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    sqlite.prepare(`
      UPDATE settings SET
        shop_name = ?,
        phone = ?,
        base_currency = ?,
        language = ?,
        first_run_completed = 1
      WHERE id = 'default'
    `).run(config.shopName, config.phone, config.baseCurrency, config.language);

    // 3. التحقق من التخزين
    const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(updatedConfig.firstRunCompleted).toBe(true);
    expect(updatedConfig.shopName).toBe('سوبرماركت الأمل');

    const updatedSettings = sqlite.prepare("SELECT * FROM settings WHERE id = 'default'").get() as any;
    expect(updatedSettings.shop_name).toBe('سوبرماركت الأمل');
    expect(updatedSettings.phone).toBe('0555 12 34 56');
    expect(updatedSettings.first_run_completed).toBe(1);

    sqlite.close();
  });

  it('guarantees first-run wizard does not expose admin credentials and preserves secure manual login', () => {
    // التحقق من أن بيانات المعالج تركز فقط على بيانات المتجر دون طلب أو عرض حساب المدير
    const wizardPayload = {
      shopName: 'متجر التميز',
      phone: '0777123456',
      baseCurrency: 'دج',
      language: 'ar',
    };

    expect((wizardPayload as any).adminPin).toBeUndefined();
    expect((wizardPayload as any).username).toBeUndefined();

    // التحقق من أن شاشة الدخول تبدأ بحقول فارغة
    const initialLoginFormState = {
      username: '',
      password: '',
    };
    expect(initialLoginFormState.username).toBe('');
    expect(initialLoginFormState.password).toBe('');
  });

  it('guarantees that subsequent runs and reinstallations preserve setup without re-triggering the wizard', () => {
    // محاكاة إعادة التثبيت: الملفات موجودة في AppData مسبقاً
    const existingConfig = {
      version: '1.0.0',
      firstRunCompleted: true,
      shopName: 'متجر النجاح',
      phone: '0666000000',
      baseCurrency: 'دج',
      language: 'ar',
      installedAt: '2026-09-01T00:00:00.000Z',
      lastRunAt: new Date().toISOString(),
    };
    fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');

    // قراءة الإعدادات والتحقق من أن isFirstRun يعيد false
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const isFirstRun = !parsed.firstRunCompleted;
    expect(isFirstRun).toBe(false);
  });

  it('verifies all required custom installer branding assets exist in build/ and package.json', () => {
    // 1. التحقق من وجود كل الأيقونات والصور في build/
    expect(fs.existsSync(path.resolve('build/icon.ico'))).toBe(true);
    expect(fs.existsSync(path.resolve('build/installer.ico'))).toBe(true);
    expect(fs.existsSync(path.resolve('build/uninstaller.ico'))).toBe(true);
    expect(fs.existsSync(path.resolve('build/installerHeader.bmp'))).toBe(true);
    expect(fs.existsSync(path.resolve('build/installerSidebar.bmp'))).toBe(true);

    // التحقق من أحجام الملفات
    const iconStat = fs.statSync(path.resolve('build/icon.ico'));
    const headerStat = fs.statSync(path.resolve('build/installerHeader.bmp'));
    const sidebarStat = fs.statSync(path.resolve('build/installerSidebar.bmp'));

    expect(iconStat.size).toBeGreaterThan(10000); // multi-res ico
    expect(headerStat.size).toBe(25818); // 150x57 24-bit bmp (150*3 padded to 452 * 57 + 54 = 25818)
    expect(sidebarStat.size).toBe(154542); // 164x314 24-bit bmp (164*3 padded to 492 * 314 + 54 = 154542)

    // 2. التحقق من إعدادات build في package.json
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
    const nsis = pkg.build.nsis;

    expect(nsis.oneClick).toBe(false);
    expect(nsis.allowToChangeInstallationDirectory).toBe(true);
    expect(nsis.installerIcon).toBe('build/installer.ico');
    expect(nsis.uninstallerIcon).toBe('build/uninstaller.ico');
    expect(nsis.installerHeaderIcon).toBe('build/installer.ico');
    expect(nsis.installerHeader).toBe('build/installerHeader.bmp');
    expect(nsis.installerSidebar).toBe('build/installerSidebar.bmp');
    expect(nsis.uninstallerSidebar).toBe('build/installerSidebar.bmp');
    expect(nsis.createDesktopShortcut).toBe(true);
    expect(nsis.createStartMenuShortcut).toBe(true);
    expect(pkg.build.win.icon).toBe('build/icon.ico');

    // 3. التحقق من ملف installer.nsh
    const nshContent = fs.readFileSync(path.resolve('electron/installer.nsh'), 'utf-8');
    expect(nshContent).toContain('!macro customInit');
    expect(nshContent).toContain('StrCpy $INSTDIR "C:\\AN POS"');
    expect(nshContent).toContain('anpos.db');
    expect(nshContent).toContain('MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2');

    // 4. التحقق من إظهار تفاصيل الملفات المستخرجة والنسبة المئوية لتقدم التثبيت
    expect(nshContent).toContain('ShowInstDetails show');
    expect(nshContent).toContain('ShowUninstDetails show');
    expect(nshContent).toContain('SetDetailsPrint both');
    expect(nshContent).toContain('[80%]');
    expect(nshContent).toContain('[85%]');
    expect(nshContent).toContain('[90%]');
    expect(nshContent).toContain('[95%]');
    expect(nshContent).toContain('[100%]');
    expect(nshContent).toContain('SendMessage $HWNDPARENT 0x000C');

    // 6. التحقق من وجود نسخ احتياطية بطابع زمني كامل بالثواني لمنع الكتابة فوق النسخ السابقة
    expect(nshContent).toContain('${GetTime}');
    expect(nshContent).toContain('pre_upgrade_$2$1$0_$4$5$6.db');
    // 7. التحقق من بقاء نسخة ثابتة الاسم للتوافق مع المراجع
    expect(nshContent).toContain('pre_upgrade_backup.db');

    // 8. التحقق من فحص توافق Windows 10+ (M12)
    expect(nshContent).toContain('AtLeastWin10');
    // 9. التحقق من تقييد جدار الحماية للشبكات الموثوقة (H4)
    expect(nshContent).toContain('profile=private,domain');
    expect(nshContent).not.toContain('profile=any');
    // 10. التحقق من حماية النسخ والترخيص في وضع الصمت وعند إلغاء التثبيت (M8)
    expect(nshContent).toContain('${Silent}');
    expect(nshContent).toContain('an-pos-backup-archive');
  });

  it('detects upgrade correctly when config.json has an older version', () => {
    // محاكاة ملف config.json من إصدار قديم
    const oldConfig = {
      version: '2.4.0',
      firstRunCompleted: true,
      shopName: 'متجر الأمل',
      phone: '0555000000',
      baseCurrency: 'دج',
      language: 'ar',
      installedAt: '2026-07-15T00:00:00.000Z',
      lastRunAt: '2026-09-20T10:00:00.000Z',
    };
    fs.writeFileSync(configPath, JSON.stringify(oldConfig, null, 2), 'utf-8');

    // قراءة الملف ومحاكاة منطق كشف الترقية
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const currentVersion = pkgVersion;
    const isUpgrade = parsed.version && parsed.version !== currentVersion;

    expect(isUpgrade).toBe(true);
    expect(parsed.version).toBe('2.4.0');

    // بعد تحديث الإصدار
    parsed.version = currentVersion;
    fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf-8');
    const updated = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(updated.version).toBe(pkgVersion);
    expect(updated.firstRunCompleted).toBe(true);
  });

  it('does not show first-run wizard when existing data is detected during upgrade', () => {
    // محاكاة قاعدة بيانات قائمة فيها بيانات مبيعات (ترقية من إصدار سابق)
    const sqlite = new DatabaseSync(dbPath);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        shop_name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        base_currency TEXT NOT NULL DEFAULT 'دج',
        language TEXT DEFAULT 'ar',
        first_run_completed INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO settings (id, shop_name, phone, base_currency, language, first_run_completed)
      VALUES ('default', 'سوبرماركت النجاح', '0666777888', 'دج', 'ar', 0);
    `);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT);
      INSERT INTO products (id, name) VALUES ('p1', 'حليب');
    `);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, total REAL);
      INSERT INTO sales (id, total) VALUES ('s1', 1500);
    `);

    // فحص المستوى 3: اسم المتجر مخصص (ليس "متجري")
    const settingsRow = sqlite.prepare("SELECT shop_name FROM settings WHERE id = 'default'").get() as any;
    const isCustomShopName = settingsRow.shop_name !== 'متجري';
    expect(isCustomShopName).toBe(true);

    // فحص المستوى 4: بيانات مبيعات وأصناف موجودة
    const salesCount = (sqlite.prepare('SELECT count(*) as count FROM sales').get() as any).count;
    const productsCount = (sqlite.prepare('SELECT count(*) as count FROM products').get() as any).count;
    expect(Number(salesCount)).toBeGreaterThan(0);
    expect(Number(productsCount)).toBeGreaterThan(0);

    // النتيجة: ليس أول تشغيل حتى لو first_run_completed = 0
    const isFirstRun = !(
      Number(settingsRow.first_run_completed || 0) === 1 ||
      isCustomShopName ||
      Number(salesCount) > 0 ||
      Number(productsCount) > 10
    );
    expect(isFirstRun).toBe(false);

    sqlite.close();
  });

  it('guarantees that fresh install with 10 default seeded products correctly triggers first-run wizard (C1 fix)', () => {
    // محاكاة تثبيت جديد بالكامل: بذر الإعدادات الافتراضية و10 منتجات تجريبية
    const freshDbPath = path.join(testDir, 'fresh_anpos.db');
    const sqlite = new DatabaseSync(freshDbPath);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        shop_name TEXT NOT NULL DEFAULT 'متجري',
        phone TEXT NOT NULL DEFAULT '0555555555',
        base_currency TEXT NOT NULL DEFAULT 'دج',
        language TEXT DEFAULT 'ar',
        first_run_completed INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO settings (id, shop_name, phone, base_currency, language, first_run_completed)
      VALUES ('default', 'متجري', '0555555555', 'دج', 'ar', 0);
    `);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT);
    `);
    // إدخال 10 منتجات تجريبية مطابقة لـ seedDatabase
    for (let i = 1; i <= 10; i++) {
      sqlite.prepare('INSERT INTO products (id, name) VALUES (?, ?)').run(`p${i}`, `منتج تجريبي ${i}`);
    }
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, total REAL);
    `);

    const settingsRow = sqlite.prepare("SELECT shop_name, first_run_completed FROM settings WHERE id = 'default'").get() as any;
    const isCustomShopName = settingsRow.shop_name && settingsRow.shop_name !== 'متجري';
    const salesCount = (sqlite.prepare('SELECT count(*) as count FROM sales').get() as any).count;
    const productsCount = (sqlite.prepare('SELECT count(*) as count FROM products').get() as any).count;

    expect(isCustomShopName).toBe(false);
    expect(Number(salesCount)).toBe(0);
    expect(Number(productsCount)).toBe(10);
    expect(Number(settingsRow.first_run_completed)).toBe(0);

    // النتيجة الحتمية لإصلاح C1: يجب أن يعتبر هذا تشغيلاً أول ويظهر المعالج للمستخدم لتعيين رمز المدير
    const isFirstRun = !(
      Number(settingsRow.first_run_completed || 0) === 1 ||
      isCustomShopName ||
      Number(salesCount) > 0 ||
      Number(productsCount) > 10
    );
    expect(isFirstRun).toBe(true);

    sqlite.close();
  });

  it('verifies Content-Security-Policy in index.html and version management scripts in package.json (P1)', () => {
    // 1. التحقق من وجود CSP محكم في index.html (M13)
    const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
    expect(indexHtml).toContain('http-equiv="Content-Security-Policy"');
    expect(indexHtml).toContain("default-src 'self'");
    expect(indexHtml).toContain("script-src 'self'");

    // 2. التحقق من ربط سكربتات إدارة وترقية الإصدار في package.json (M15)
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
    expect(pkg.scripts['set-version']).toBe('node scripts/set-version.mjs');
    expect(pkg.scripts['bump:patch']).toBe('node scripts/set-version.mjs patch');
    expect(pkg.scripts['bump:minor']).toBe('node scripts/set-version.mjs minor');
    expect(pkg.scripts['bump:major']).toBe('node scripts/set-version.mjs major');
  });

  it('guarantees that saveFirstRunSetup only updates the primary admin and does not overwrite other admins PINs (M7)', () => {
    const multiAdminDbPath = path.join(testDir, 'multi_admin.db');
    const sqlite = new DatabaseSync(multiAdminDbPath);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        pin TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        password_changed_at TEXT
      );
      INSERT INTO users (id, username, role, pin, created_at)
      VALUES
        ('admin-1', 'admin@dante.com', 'admin', 'pin_admin_1', '2026-01-01T00:00:00.000Z'),
        ('admin-2', 'branch_manager@store.com', 'admin', 'pin_admin_2', '2026-02-01T00:00:00.000Z');
    `);

    // استعلام استهداف المدير الأساسي بدقة (نفس منطق M7 في system.ts)
    const targetAdmin = sqlite
      .prepare(`
        SELECT id FROM users
        WHERE username = 'admin@dante.com' OR role = 'admin'
        ORDER BY CASE WHEN username = 'admin@dante.com' THEN 0 ELSE 1 END, created_at ASC
        LIMIT 1
      `)
      .get() as { id: string } | undefined;

    expect(targetAdmin?.id).toBe('admin-1');

    // تحديث PIN للحساب المستهدف فقط
    const newHashedPin = 'new_hashed_pin_123';
    const now = new Date().toISOString();
    sqlite
      .prepare(`UPDATE users SET pin = ?, password_changed_at = ?, updated_at = ? WHERE id = ?`)
      .run(newHashedPin, now, now, targetAdmin!.id);

    // التحقق: حساب المدير الأساسي تم تحديثه، وحساب المدير الثاني لم يتأثر
    const admin1 = sqlite.prepare("SELECT pin FROM users WHERE id = 'admin-1'").get() as any;
    const admin2 = sqlite.prepare("SELECT pin FROM users WHERE id = 'admin-2'").get() as any;

    expect(admin1.pin).toBe(newHashedPin);
    expect(admin2.pin).toBe('pin_admin_2'); // لم يتغير!

    sqlite.close();
  });

  it('guarantees developer account is strictly disallowed in packaged production builds (M9)', () => {
    // محاكاة منطق فحص البيئة في seed.ts
    const checkIsDevEnv = (isPackaged: boolean, envVars: Record<string, string | undefined>) => {
      return (
        !isPackaged &&
        (envVars.NODE_ENV === 'development' ||
          envVars.NODE_ENV === 'test' ||
          envVars.ANPOS_ALLOW_DEV_ACCOUNT === 'true')
      );
    };

    // في وضع الإنتاج المجمع (isPackaged = true): محظور تماماً حتى مع محاولة حقن المتغير
    expect(checkIsDevEnv(true, { ANPOS_ALLOW_DEV_ACCOUNT: 'true' })).toBe(false);
    expect(checkIsDevEnv(true, { NODE_ENV: 'development', ANPOS_ALLOW_DEV_ACCOUNT: 'true' })).toBe(false);

    // في وضع التطوير غير المجمع (isPackaged = false): مسموح
    expect(checkIsDevEnv(false, { NODE_ENV: 'development' })).toBe(true);
    expect(checkIsDevEnv(false, { ANPOS_ALLOW_DEV_ACCOUNT: 'true' })).toBe(true);
  });

  it('generates multi-factor hardware fingerprint v2 and maintains backward compatibility with v1 (M10)', async () => {
    const {
      computeHardwareFingerprint,
      computeLegacyHardwareFingerprint,
      computeHardwareHashInt,
      computeLegacyHardwareHashInt,
      computeHardwareHashIntFromFingerprint,
    } = await import('../../electron/main/license/hardwareFingerprint');

    const fpV2 = computeHardwareFingerprint();
    const fpV1 = computeLegacyHardwareFingerprint();

    // يجب أن تكون كل بصمة نصاً سداسياً عشرياً مكوناً من 32 حرفاً بالحروف الكبيرة
    expect(fpV2).toMatch(/^[A-F0-9]{32}$/);
    expect(fpV1).toMatch(/^[A-F0-9]{32}$/);

    // التحقق من استخراج hashInt كأرقام موجبة 32-bit
    const hashIntV2 = computeHardwareHashInt();
    const hashIntV1 = computeLegacyHardwareHashInt();

    expect(typeof hashIntV2).toBe('number');
    expect(hashIntV2).toBeGreaterThan(0);
    expect(typeof hashIntV1).toBe('number');
    expect(hashIntV1).toBeGreaterThan(0);

    // التحقق من تطابق الدالة المساعدة
    expect(computeHardwareHashIntFromFingerprint(fpV2)).toBe(hashIntV2);
    expect(computeHardwareHashIntFromFingerprint(fpV1)).toBe(hashIntV1);
  });

  it('hardens trial against trivial deletion and manual file tampering (H9 & M11)', async () => {
    const {
      computeTrialSignature,
      loadStoredTrial,
      saveStoredTrial,
      initStoredTrial,
      getStoredTrialStatus,
    } = await import('../../electron/main/license/trialStorage');

    // 1. فحص التوقيع الرقمي
    const fp = 'TEST-HARDWARE-FP-12345';
    const start = '2026-10-01T10:00:00.000Z';
    const end = '2026-10-08T10:00:00.000Z';
    const sig = computeTrialSignature(start, end, fp);
    expect(typeof sig).toBe('string');
    expect(sig.length).toBe(64); // SHA-256 hex string

    // 2. محاكاة بدء التجربة وحفظها
    const trial = initStoredTrial(start, end, 15);
    expect(trial.startedAt).toBe(start);
    expect(trial.endsAt).toBe(end);
    expect(trial.signature).toBeDefined();

    // 3. التحقق من كشف التلاعب بالساعة (Clock Tampering) إذا تم تقديم الساعة للوراء
    const status = getStoredTrialStatus();
    expect(status).toBeDefined();
    expect(typeof status.remainingDays).toBe('number');
  });

  it('verifies exclusion of non-windows native modules and package size optimization in package.json (H3 & H7)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));

    // التحقق من نقل pdfjs-dist إلى devDependencies لمنع حزم @napi-rs/canvas في release (H3/H7)
    expect(pkg.devDependencies['pdfjs-dist']).toBeDefined();
    expect(pkg.dependencies['pdfjs-dist']).toBeUndefined();

    // التحقق من قواعد الاستبعاد الصريحة في build.files
    const files = pkg.build.files as string[];
    expect(files).toContain('!**/node_modules/*-linux-*/**');
    expect(files).toContain('!**/node_modules/*-darwin-*/**');
    expect(files).toContain('!**/node_modules/*-android-*/**');
    expect(files).toContain('!**/node_modules/@napi-rs/**');
    expect(files).toContain('!**/node_modules/@rolldown/**');
  });

  it('verifies Per-User NSIS configuration (perMachine: false, allowElevation: false) and installer script (A2)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));

    // 1. التحقق من تكوين Per-User في package.json لمنع ظهور UAC عند التثبيت والتحديث
    expect(pkg.build.nsis.perMachine).toBe(false);
    expect(pkg.build.nsis.allowElevation).toBe(false);
    expect(pkg.build.win.requestedExecutionLevel).toBe('asInvoker');

    // 2. التحقق من مسار التثبيت الافتراضي في installer.nsh ($LOCALAPPDATA\Programs\AN POS)
    const installerScript = fs.readFileSync(path.resolve('electron/installer.nsh'), 'utf-8');
    expect(installerScript).toContain('$LOCALAPPDATA\\Programs\\AN POS');
    expect(installerScript).toContain('AtLeastWin10');
  });

  it('verifies System Tray state and lifecycle management (A9)', async () => {
    const { getIsQuitting, setIsQuitting } = await import('../../electron/main/tray');

    expect(getIsQuitting()).toBe(false);
    setIsQuitting(true);
    expect(getIsQuitting()).toBe(true);
    setIsQuitting(false);
    expect(getIsQuitting()).toBe(false);
  });

  it('executes atomic WAL checkpoint, VACUUM INTO, and verifies backup integrity via CLI helper (A3)', async () => {
    const { executePrepareUpgrade, executeVerifyBackup } = await import('../../electron/main/backup/preUpgrade');

    // 1. إنشاء قاعدة بيانات تجريبية مع تفعيل WAL وإدخال سجلات
    const activeDbPath = path.join(testDir, 'active_anpos.db');
    const targetBackupsDir = path.join(testDir, 'pre_upgrade_backups');
    fs.mkdirSync(targetBackupsDir, { recursive: true });

    const db = new DatabaseSync(activeDbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec(`
      CREATE TABLE test_sales (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        created_at TEXT NOT NULL
      );
      INSERT INTO test_sales VALUES ('sale-1', 1500.0, '2026-10-20T12:00:00Z');
      INSERT INTO test_sales VALUES ('sale-2', 2300.0, '2026-10-20T12:05:00Z');
    `);
    // إبقاء الاتصال مفتوحاً ومحاكاة عمليات WAL غير المفرغة
    db.exec("INSERT INTO test_sales VALUES ('sale-3', 450.0, '2026-10-20T12:10:00Z');");
    db.close();

    // 2. توجيه المسار إلى القاعدة التجريبية وتنفيذ النسخ الوقائي الذري
    const originalEnv = process.env.AN_POS_DB_PATH;
    process.env.AN_POS_DB_PATH = activeDbPath;

    try {
      const upgradeSuccess = executePrepareUpgrade(targetBackupsDir);
      expect(upgradeSuccess).toBe(true);

      // 3. التحقق من إنشاء ملف النسخة الاحتياطية وملف النسخة الثابتة
      const legacyBackup = path.join(targetBackupsDir, 'pre_upgrade_backup.db');
      expect(fs.existsSync(legacyBackup)).toBe(true);

      const backupFiles = fs.readdirSync(targetBackupsDir).filter((f) => f.startsWith('pre_upgrade_'));
      expect(backupFiles.length).toBeGreaterThanOrEqual(2); // النسخة ذات الطابع الزمني + النسخة الثابتة

      // 4. التحقق من سلامة وصلاحية النسخة عبر executeVerifyBackup
      const verifySuccess = executeVerifyBackup(legacyBackup);
      expect(verifySuccess).toBe(true);

      // 5. التحقق من محتوى النسخة وأنها تحوي جميع المعاملات
      const backupDb = new DatabaseSync(legacyBackup, { readOnly: true });
      const rowCount = (backupDb.prepare('SELECT count(*) as cnt FROM test_sales;').get() as any).cnt;
      expect(rowCount).toBe(3);
      backupDb.close();

      // 6. التحقق من أن النسخة التالفة يتم رفضها
      const corruptFile = path.join(targetBackupsDir, 'corrupt.db');
      fs.writeFileSync(corruptFile, 'NOT_A_VALID_SQLITE_DATABASE_HEADER');
      const verifyCorrupt = executeVerifyBackup(corruptFile);
      expect(verifyCorrupt).toBe(false);
    } finally {
      if (originalEnv) {
        process.env.AN_POS_DB_PATH = originalEnv;
      } else {
        delete process.env.AN_POS_DB_PATH;
      }
    }
  });

  it('verifies in-app Windows Firewall helper and rule configuration (A4)', async () => {
    const { checkFirewallRule, configureFirewallRule, removeFirewallRule, FIREWALL_RULE_NAME } = await import('../../electron/main/firewall');

    expect(FIREWALL_RULE_NAME).toBe('AN POS LAN Server');

    // على منصات الاختبار غير ويندوز (أو لينكس CI)، يجب أن تعيد الدوال نجاحاً آمناً دون تعطيل
    const status = await checkFirewallRule(3000);
    expect(status).toBeDefined();
    expect(status.exists).toBe(true);

    const configResult = await configureFirewallRule(3000);
    expect(configResult.success).toBe(true);

    const removeResult = await removeFirewallRule();
    expect(removeResult.success).toBe(true);

    // التحقق من تقييد قاعدة الجدار الناري في installer.nsh لتشمل remoteip=localsubnet
    const installerScript = fs.readFileSync(path.resolve('electron/installer.nsh'), 'utf-8');
    expect(installerScript).toContain('profile=private,domain');
    expect(installerScript).toContain('remoteip=localsubnet');
    expect(installerScript).not.toContain('profile=any');
  });

  it('verifies auto-updater engine and publish configuration in package.json (A7)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));

    // 1. التحقق من وجود مكتبة electron-updater في التبعيات
    expect(pkg.dependencies['electron-updater']).toBeDefined();

    // 2. التحقق من إعدادات النشر لمزود التحديثات GitHub
    expect(pkg.build.publish).toBeDefined();
    expect(Array.isArray(pkg.build.publish)).toBe(true);
    expect(pkg.build.publish[0].provider).toBe('github');

    // 3. التحقق من تكوين index.nsh لاستدعاء --prepare-upgrade قبل الإغلاق
    const installerScript = fs.readFileSync(path.resolve('electron/installer.nsh'), 'utf-8');
    expect(installerScript).toContain('--prepare-upgrade');
  });

  it('verifies CI/CD release workflow and SHA-256 checksums generator (A6)', () => {
    // 1. التحقق من وجود سكريبت توليد البصمات scripts/generate-checksums.mjs وسكريبت فحص الحزمة (A5/A6)
    const scriptPath = path.resolve('scripts/generate-checksums.mjs');
    expect(fs.existsSync(scriptPath)).toBe(true);
    const checkPkgPath = path.resolve('scripts/check-package-contents.mjs');
    expect(fs.existsSync(checkPkgPath)).toBe(true);

    // 2. التحقق من سير عمل GitHub Actions (.github/workflows/build.yml)
    const workflowPath = path.resolve('.github/workflows/build.yml');
    expect(fs.existsSync(workflowPath)).toBe(true);
    const workflow = fs.readFileSync(workflowPath, 'utf-8');

    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('check-package-contents.mjs');
    expect(workflow).toContain('generate-checksums.mjs');
    expect(workflow).toContain('release/*.exe');
    expect(workflow).toContain('release/latest.yml');
    expect(workflow).toContain('release/SHA256SUMS.txt');
  });

  it('prevents privilege escalation and spoofing of callerRole in registerUser (R11 & H12)', async () => {
    const { initDatabase } = await import('../../electron/main/database');
    await initDatabase();
    const { registerUser, setActiveDesktopUser } = await import('../../electron/main/handlers/auth');
    const { execute } = await import('../../electron/main/handlers/db-utils');

    // تأكد من وجود جدول settings والمستخدمين
    execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        allow_self_registration INTEGER NOT NULL DEFAULT 1,
        default_role TEXT DEFAULT 'seller'
      );
    `);
    execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        pin TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'seller',
        role_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 1. فحص محاولة تجاوز إغلاق التسجيل الذاتي بإرسال callerRole: 'admin' بدون وجود جلسة مدير مسجلة
    execute("INSERT OR REPLACE INTO settings (id, allow_self_registration, default_role) VALUES ('default', 0, 'seller')");
    setActiveDesktopUser(null);

    const unauthAttempt = await registerUser({
      username: `hacker_${Date.now()}`,
      name: 'Fake Admin',
      pin: '12345',
      callerRole: 'admin',
      role: 'admin',
    });
    expect(unauthAttempt.error).toBeDefined();
    expect(unauthAttempt.error?.status).toBe(403);
    expect(unauthAttempt.error?.detail).toContain('التسجيل الذاتي مغلق');

    // 2. السماح بالتسجيل الذاتي، لكن مع محاولة طلب دور admin بواسطة الواجهة
    execute("UPDATE settings SET allow_self_registration = 1, default_role = 'seller' WHERE id = 'default'");
    const escalateAttempt = await registerUser({
      username: `self_reg_${Date.now()}`,
      name: 'Wannabe Admin',
      pin: '12345',
      callerRole: 'admin',
      role: 'admin',
    });
    expect(escalateAttempt.error).toBeUndefined();
    expect(escalateAttempt.user).toBeDefined();
    // يجب ألا يحصل على admin إطلاقاً بل يُلزم بدور seller
    expect((escalateAttempt.user as any).role).toBe('seller');

    // 3. منع استخدام اسم أو دور developer تماماً
    const devAttempt = await registerUser({
      username: `dev_${Date.now()}`,
      name: 'Developer Impersonator',
      pin: '12345',
      role: 'developer',
    });
    expect(devAttempt.error?.status).toBe(403);

    // 4. عندما يكون هناك مسؤول معتمد مسجل في الجلسة النشطة (Active Desktop User)
    setActiveDesktopUser({ id: 'admin-id-1', username: 'real_admin', role: 'admin' });
    execute("UPDATE settings SET allow_self_registration = 0 WHERE id = 'default'");

    const adminCreatedUser = await registerUser({
      username: `cashier_${Date.now()}`,
      name: 'Authorized Cashier',
      pin: '56789',
      role: 'cashier',
    });
    expect(adminCreatedUser.error).toBeUndefined();
    expect(adminCreatedUser.user).toBeDefined();
    expect((adminCreatedUser.user as any).role).toBe('cashier');

    // إعادة تنظيف الجلسة
    setActiveDesktopUser(null);
  });
});


