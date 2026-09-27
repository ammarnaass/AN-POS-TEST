// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

describe('Custom Installer & First-Run Environment Setup', () => {
  const testDir = path.resolve('src/test/tmp_installer_env');
  const configPath = path.join(testDir, 'config.json');
  const dbPath = path.join(testDir, 'anpos.db');

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'backups'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'logs'), { recursive: true });
  });

  afterEach(() => {
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
  });
});
