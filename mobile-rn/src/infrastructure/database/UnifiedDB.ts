import { AnposSQLiteDriver } from '@/modules/AnposSQLite';
import { RESTDriver } from '../drivers/RESTDriver';
import { AnposSecureStore } from '@/modules/AnposSecureStore';
import type { DataDriver, DriverConfig, DriverType, ListOptions, ListResult } from '../drivers/DataDriver';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL } from './schema';
import { seedDatabase } from './seed';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export type AppMode = 'standalone' | 'connected';

export async function getStoredMode(): Promise<AppMode> {
  const mode = await AnposSecureStore.get(STORAGE_KEYS.APP_MODE);
  return (mode as AppMode) || 'standalone';
}

export async function setStoredMode(mode: AppMode): Promise<void> {
  await AnposSecureStore.set(STORAGE_KEYS.APP_MODE, mode);
}

/** Run CREATE TABLE + INDEX statements, then optionally seed default data */
export async function initSQLiteSchema(driver: AnposSQLiteDriver, shouldSeed = true): Promise<void> {
  for (const sql of CREATE_TABLES_SQL) {
    try {
      await driver.execute(sql);
    } catch (err) {
      console.warn('[UnifiedDB] Schema statement failed:', err);
    }
  }

  // Schema migrations — safe ALTER TABLE for existing databases
  const MIGRATIONS = [
    // products — existing DB upgrades
    "ALTER TABLE products ADD COLUMN product_name TEXT DEFAULT ''",
    'ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN purchase_price REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN average_price REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN image TEXT',
    'ALTER TABLE products ADD COLUMN image_url TEXT',
    'ALTER TABLE products ADD COLUMN expiry_date TEXT',
    'ALTER TABLE products ADD COLUMN batch_number TEXT',
    'ALTER TABLE products ADD COLUMN wholesale_min_qty REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN min_quantity REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN quick_sale INTEGER DEFAULT 1',
    "ALTER TABLE products ADD COLUMN allow_negative_stock INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE products ADD COLUMN warehouse_id TEXT NOT NULL DEFAULT ''",
    // PRD-MOB-WS-PROD-2026 Wholesale & Colisage parity upgrades
    'ALTER TABLE products ADD COLUMN sale_price2 REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN sale_price3 REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN invoice_price REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN profit_margin REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN tax_rate REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN discount REAL DEFAULT 0',
    "ALTER TABLE products ADD COLUMN wholesale_unit_name TEXT DEFAULT 'كرتون'",
    'ALTER TABLE products ADD COLUMN weight REAL DEFAULT 0',
    "ALTER TABLE products ADD COLUMN package_size TEXT DEFAULT ''",
    "ALTER TABLE products ADD COLUMN location TEXT DEFAULT ''",
    // packs — colisage and wholesale pack upgrades
    "ALTER TABLE packs ADD COLUMN barcode TEXT DEFAULT ''",
    'ALTER TABLE packs ADD COLUMN pack_price REAL DEFAULT 0',
    'ALTER TABLE packs ADD COLUMN price REAL DEFAULT 0',
    "ALTER TABLE packs ADD COLUMN pack_type TEXT DEFAULT 'pack'",
    "ALTER TABLE packs ADD COLUMN unit_name TEXT DEFAULT 'كرتون'",
    'ALTER TABLE packs ADD COLUMN pieces_count INTEGER DEFAULT 1',
    'ALTER TABLE packs ADD COLUMN min_wholesale_qty INTEGER DEFAULT 1',
    'ALTER TABLE packs ADD COLUMN is_active INTEGER DEFAULT 1',
    "ALTER TABLE packs ADD COLUMN description TEXT DEFAULT ''",
    'ALTER TABLE packs ADD COLUMN sync_version INTEGER DEFAULT 1',
    'ALTER TABLE packs ADD COLUMN deleted_at TEXT DEFAULT NULL',
    // customers — Algerian tax and commercial numbers
    "ALTER TABLE customers ADD COLUMN rc TEXT DEFAULT ''",
    "ALTER TABLE customers ADD COLUMN nif TEXT DEFAULT ''",
    "ALTER TABLE customers ADD COLUMN nis TEXT DEFAULT ''",
    "ALTER TABLE customers ADD COLUMN art TEXT DEFAULT ''",
    "ALTER TABLE product_barcodes ADD COLUMN price_label TEXT DEFAULT ''",
    "ALTER TABLE product_barcodes ADD COLUMN price_name TEXT DEFAULT ''",
    // sales — existing DB upgrades
    "ALTER TABLE sales ADD COLUMN cash_session_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE sales ADD COLUMN note TEXT DEFAULT ''",
    "ALTER TABLE sales ADD COLUMN last_printed_at TEXT DEFAULT ''",
    "ALTER TABLE sales ADD COLUMN sold_by TEXT NOT NULL DEFAULT ''",
    // sale_items — batch tracking
    'ALTER TABLE sale_items ADD COLUMN batch_number TEXT',
    // purchases — TVA support
    'ALTER TABLE purchases ADD COLUMN tva_amount REAL DEFAULT 0',
    // print_templates — desktop parity
    "ALTER TABLE print_templates ADD COLUMN description TEXT DEFAULT ''",
    "ALTER TABLE print_templates ADD COLUMN paper_size TEXT DEFAULT '80mm'",
    "ALTER TABLE print_templates ADD COLUMN orientation TEXT DEFAULT 'portrait'",
    'ALTER TABLE print_templates ADD COLUMN width_mm INTEGER DEFAULT 80',
    "ALTER TABLE print_templates ADD COLUMN supported_documents TEXT DEFAULT '[]'",
    "ALTER TABLE print_templates ADD COLUMN visibility TEXT DEFAULT '{}'",
    "ALTER TABLE print_templates ADD COLUMN layout TEXT DEFAULT '{}'",
    "ALTER TABLE print_templates ADD COLUMN styles TEXT DEFAULT '{}'",
    "ALTER TABLE print_templates ADD COLUMN qr TEXT DEFAULT '{}'",
    "ALTER TABLE print_templates ADD COLUMN is_system INTEGER DEFAULT 0",
    // printers — desktop parity
    "ALTER TABLE printers ADD COLUMN connection TEXT DEFAULT 'usb'",
    "ALTER TABLE printers ADD COLUMN paper_size TEXT DEFAULT '80mm'",
    "ALTER TABLE printers ADD COLUMN driver TEXT DEFAULT 'esc_pos'",
    'ALTER TABLE printers ADD COLUMN dpi INTEGER DEFAULT 203',
    'ALTER TABLE printers ADD COLUMN is_active INTEGER DEFAULT 1',
    // warehouses — extended metadata
    'ALTER TABLE warehouses ADD COLUMN location TEXT',
    "ALTER TABLE warehouses ADD COLUMN type TEXT DEFAULT 'main'",
    'ALTER TABLE warehouses ADD COLUMN capacity REAL DEFAULT 0',
    'ALTER TABLE warehouses ADD COLUMN temperature REAL DEFAULT 0',
    'ALTER TABLE warehouses ADD COLUMN humidity REAL DEFAULT 0',
    'ALTER TABLE warehouses ADD COLUMN is_active INTEGER DEFAULT 1',
    'ALTER TABLE warehouses ADD COLUMN parent_id TEXT',
    // print_history — desktop parity
    "ALTER TABLE print_history ADD COLUMN invoice_id TEXT DEFAULT ''",
    "ALTER TABLE print_history ADD COLUMN invoice_type TEXT DEFAULT 'sale'",
    "ALTER TABLE print_history ADD COLUMN doc_type_key TEXT DEFAULT 'facture'",
    "ALTER TABLE print_history ADD COLUMN template_id TEXT DEFAULT ''",
    "ALTER TABLE print_history ADD COLUMN printed_by TEXT DEFAULT ''",
    'ALTER TABLE print_history ADD COLUMN copies INTEGER DEFAULT 1',
    "ALTER TABLE print_history ADD COLUMN printer_name TEXT DEFAULT ''",
    'ALTER TABLE print_history ADD COLUMN is_reprint INTEGER DEFAULT 0',
    "ALTER TABLE print_history ADD COLUMN payload TEXT DEFAULT '{}'",
    // PRD §5.1: Sync columns across all syncable tables
    "ALTER TABLE products ADD COLUMN category_id TEXT DEFAULT ''",
    "ALTER TABLE products ADD COLUMN sync_version INTEGER DEFAULT 1",
    "ALTER TABLE products ADD COLUMN deleted_at TEXT DEFAULT NULL",
    "ALTER TABLE categories ADD COLUMN icon TEXT DEFAULT 'Tag'",
    "ALTER TABLE categories ADD COLUMN color TEXT DEFAULT '#3b82f6'",
    "ALTER TABLE categories ADD COLUMN sync_version INTEGER DEFAULT 1",
    "ALTER TABLE categories ADD COLUMN deleted_at TEXT DEFAULT NULL",
    "ALTER TABLE sales ADD COLUMN sync_version INTEGER DEFAULT 1",
    "ALTER TABLE sales ADD COLUMN deleted_at TEXT DEFAULT NULL",
    "ALTER TABLE customers ADD COLUMN sync_version INTEGER DEFAULT 1",
    // settings — full parity with desktop
    "ALTER TABLE settings ADD COLUMN shop_name TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN phone TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN phone2 TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN email TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN address TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN city TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN logo TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN tva_rate REAL DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN print_width_mm INTEGER DEFAULT 80",
    "ALTER TABLE settings ADD COLUMN sync_mode TEXT DEFAULT 'single'",
    "ALTER TABLE settings ADD COLUMN currencies TEXT DEFAULT '[]'",
    "ALTER TABLE settings ADD COLUMN base_currency TEXT DEFAULT 'دج'",
    "ALTER TABLE settings ADD COLUMN invoice_prefix TEXT DEFAULT 'INV-'",
    "ALTER TABLE settings ADD COLUMN invoice_start_number INTEGER DEFAULT 1",
    "ALTER TABLE settings ADD COLUMN receipt_footer TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN zakat_enabled INTEGER DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN nisab_threshold REAL DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN shop_logo TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN language TEXT DEFAULT 'ar'",
    "ALTER TABLE settings ADD COLUMN print_language TEXT DEFAULT 'ar'",
    "ALTER TABLE settings ADD COLUMN commercial_register TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN company_nif TEXT DEFAULT ''",
    "ALTER TABLE settings ADD COLUMN allow_negative_stock INTEGER DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN operating_mode TEXT DEFAULT 'online'",
    // subscriptions — standalone quota & tier management
    "ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free'",
    "ALTER TABLE settings ADD COLUMN subscription_tier TEXT DEFAULT 'free'",
    "ALTER TABLE settings ADD COLUMN subscription_base_quota INTEGER DEFAULT 300",
    "ALTER TABLE settings ADD COLUMN subscription_bonus_sales INTEGER DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN subscription_used_sales INTEGER DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN subscription_ads_watched INTEGER DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN subscription_license_key TEXT DEFAULT ''",
  ];

  for (const sql of MIGRATIONS) {
    try {
      await driver.execute(sql);
    } catch {
      // Column might already exist, safe to ignore
    }
  }

  for (const sql of CREATE_INDEXES_SQL) {
    try {
      await driver.execute(sql);
    } catch { /* index may already exist */ }
  }

  // Refresh introspection cache after migrations
  driver.clearTableColumnsCache?.();

  if (shouldSeed) {
    try {
      await seedDatabase(driver);
    } catch (err) {
      console.warn('[UnifiedDB] Seed database error:', err);
    }
  }
}

class UnifiedDB {
  private driver: DataDriver | null = null;
  private mode: AppMode = 'standalone';
  private standaloneDriver: AnposSQLiteDriver | null = null;
  private connectedDriver: AnposSQLiteDriver | null = null;
  private restDriver: RESTDriver | null = null;
  private initialized = false;

  /**
   * ترحيل آمن لبيانات الوضع المستقل السابقة من قاعدة البيانات القديمة (anpos) إلى (anpos_standalone)
   */
  private async migrateLegacyData(targetDriver: AnposSQLiteDriver): Promise<void> {
    try {
      const isMigrated = await AnposSecureStore.get('anpos_legacy_migrated_v2');
      if (isMigrated) return;

      const legacyDriver = new AnposSQLiteDriver({ databaseName: 'anpos' });
      await legacyDriver.initialize();

      const legacyProducts = await legacyDriver.list('products', { limit: 1 }).catch(() => ({ data: [], total: 0 }));
      const currentProducts = await targetDriver.list('products', { limit: 1 }).catch(() => ({ data: [], total: 0 }));

      if (legacyProducts.total > 0 && currentProducts.total === 0) {
        const TABLES_TO_MIGRATE = [
          'categories',
          'products',
          'product_barcodes',
          'customers',
          'suppliers',
          'sales',
          'sale_items',
          'expenses',
          'purchases',
          'purchase_items',
          'cash_sessions',
          'settings',
          'users',
          'roles',
          'packs',
          'warehouses',
          'print_templates',
          'printers',
        ];

        for (const table of TABLES_TO_MIGRATE) {
          try {
            const rows = await legacyDriver.list(table, { limit: 5000 }).catch(() => ({ data: [], total: 0 }));
            if (rows.data && rows.data.length > 0) {
              for (const row of rows.data) {
                await targetDriver.create(table, row).catch(() => {});
              }
            }
          } catch (err) {
            console.warn(`[UnifiedDB] Failed to migrate table ${table}:`, err);
          }
        }
        console.log('[UnifiedDB] Legacy data migration to anpos_standalone completed successfully');
      }

      await legacyDriver.close().catch(() => {});
      await AnposSecureStore.set('anpos_legacy_migrated_v2', 'true');
    } catch (err) {
      console.warn('[UnifiedDB] Legacy migration check error:', err);
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    const storedMode = await getStoredMode();
    this.mode = storedMode;

    // 1. تهيئة قاعدة بيانات الوضع المستقل (anpos_standalone.db) وتجهيز بنيتها
    try {
      if (!this.standaloneDriver) {
        this.standaloneDriver = new AnposSQLiteDriver({ databaseName: 'anpos_standalone' });
        await this.standaloneDriver.initialize();
      }
      await initSQLiteSchema(this.standaloneDriver, true);
      await this.migrateLegacyData(this.standaloneDriver);
    } catch (err) {
      console.warn('[UnifiedDB] Standalone SQLite init failed:', err);
    }

    // 2. تهيئة قاعدة بيانات الوضع المتصل (anpos_connected.db) الخاصة بسطح المكتب ومزامنتها (بدون بيانات تجريبية)
    try {
      if (!this.connectedDriver) {
        this.connectedDriver = new AnposSQLiteDriver({ databaseName: 'anpos_connected' });
        await this.connectedDriver.initialize();
      }
      await initSQLiteSchema(this.connectedDriver, false);
    } catch (err) {
      console.warn('[UnifiedDB] Connected SQLite init failed:', err);
    }

    // 3. تحديد المشغل الفعال حسب الوضع الحالي
    if (this.mode === 'connected') {
      const [serverUrl, token, deviceId] = await Promise.all([
        AnposSecureStore.get(STORAGE_KEYS.SERVER_URL),
        AnposSecureStore.get(STORAGE_KEYS.SESSION_TOKEN),
        AnposSecureStore.get(STORAGE_KEYS.DEVICE_ID),
      ]);

      if (serverUrl && token && deviceId) {
        this.restDriver = new RESTDriver({
          baseUrl: serverUrl,
          sessionToken: token,
          deviceId: deviceId,
        });
        await this.restDriver.initialize();
        this.driver = this.restDriver;
      } else {
        console.warn('[UnifiedDB] Missing connection credentials in connected mode — falling back to standalone');
        this.mode = 'standalone';
        await setStoredMode('standalone');
        this.driver = this.standaloneDriver;
      }
    } else {
      this.driver = this.standaloneDriver;
    }

    this.initialized = true;
  }

  getMode(): AppMode {
    return this.mode;
  }

  /**
   * إرجاع مشغل SQLite النشط المتوافق مع الوضع الحالي (مستقل أو متصل)
   */
  getSqliteDriver(): AnposSQLiteDriver {
    if (this.mode === 'connected') {
      return this.getConnectedSqliteDriver();
    }
    return this.getStandaloneSqliteDriver();
  }

  getStandaloneSqliteDriver(): AnposSQLiteDriver {
    if (!this.standaloneDriver) {
      this.standaloneDriver = new AnposSQLiteDriver({ databaseName: 'anpos_standalone' });
      this.standaloneDriver.initialize().catch(() => {});
    }
    return this.standaloneDriver;
  }

  getConnectedSqliteDriver(): AnposSQLiteDriver {
    if (!this.connectedDriver) {
      this.connectedDriver = new AnposSQLiteDriver({ databaseName: 'anpos_connected' });
      this.connectedDriver.initialize().catch(() => {});
    }
    return this.connectedDriver;
  }

  async switchToConnected(serverUrl: string, token?: string, deviceId?: string): Promise<void> {
    await this.init();
    await AnposSecureStore.set(STORAGE_KEYS.SERVER_URL, serverUrl);
    const sessionToken = token || (await AnposSecureStore.get(STORAGE_KEYS.SESSION_TOKEN)) || '';
    const devId = deviceId || (await AnposSecureStore.get(STORAGE_KEYS.DEVICE_ID)) || '';

    this.restDriver = new RESTDriver({
      baseUrl: serverUrl,
      sessionToken,
      deviceId: devId,
    });
    await this.restDriver.initialize();
    this.driver = this.restDriver;
    this.mode = 'connected';
    await setStoredMode('connected');
    this.initialized = true;
  }

  async switchToStandalone(): Promise<void> {
    if (this.restDriver) {
      await this.restDriver.close().catch(() => {});
      this.restDriver = null;
    }
    if (!this.standaloneDriver) {
      this.standaloneDriver = new AnposSQLiteDriver({ databaseName: 'anpos_standalone' });
      await this.standaloneDriver.initialize();
      await initSQLiteSchema(this.standaloneDriver, true);
    }
    this.driver = this.standaloneDriver;
    this.mode = 'standalone';
    await setStoredMode('standalone');
    this.initialized = true;
  }

  getDriverType(): DriverType {
    return this.mode === 'connected' ? 'rest' : 'sqlite';
  }

  getDriver(): DataDriver {
    if (!this.driver) {
      if (this.mode === 'connected' && this.restDriver) return this.restDriver;
      if (this.mode === 'standalone' && this.standaloneDriver) return this.standaloneDriver;
      throw new Error('DB not initialized. Call await db.init() first');
    }
    return this.driver;
  }

  async list<T>(table: string, opts?: ListOptions): Promise<ListResult<T>> {
    await this.init();

    // ── 1. الوضع المستقل: قراءة معزولة تماماً من anpos_standalone فقط ────────
    if (this.mode === 'standalone') {
      const standalone = this.getStandaloneSqliteDriver();
      return standalone.list<T>(table, opts).catch(() => ({ data: [] as T[], total: 0 }));
    }

    // ── 2. الوضع المتصل: قراءة من سيرفر سطح المكتب مع تخزين مؤقت في anpos_connected ──
    const connectedSqlite = this.getConnectedSqliteDriver();

    if (this.restDriver) {
      try {
        const restResult = await this.restDriver.list<T>(table, opts);
        if (restResult && Array.isArray(restResult.data)) {
          // حفظ العناصر الواردة من سطح المكتب في قاعدة anpos_connected الخلفية (دون مساس بالوضع المستقل)
          if (restResult.data.length > 0) {
            Promise.resolve().then(async () => {
              try {
                for (const item of restResult.data.slice(0, 100)) {
                  if (item && typeof item === 'object') {
                    await connectedSqlite.create(table, item).catch(() => {});
                  }
                }
              } catch {}
            });
          }

          let resultList = [...restResult.data];

          // إدراج العناصر التي أُنشئت في الوضع المتصل محلياً ولم تُرفع بعد للسيرفر
          try {
            const pendingCreates: any = await connectedSqlite.execute(
              `SELECT payload FROM sync_queue WHERE table_name = ? AND type = 'create' AND (status = 'pending' OR status = 'processing')`,
              [table]
            );
            if (Array.isArray(pendingCreates) && pendingCreates.length > 0) {
              const remoteIds = new Set(resultList.map((item: any) => String(item.id || item._id)));
              for (const row of pendingCreates) {
                try {
                  const pendingItem = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
                  const pId = String(pendingItem?.id || pendingItem?._id || '');
                  if (pId && !remoteIds.has(pId)) {
                    resultList.unshift(pendingItem);
                    remoteIds.add(pId);
                  }
                } catch {}
              }
            }
          } catch {}

          // استبعاد العناصر التي تم حذفها محلياً وما زالت قيد الحذف في طابور المزامنة
          try {
            const pendingDeletes: any = await connectedSqlite.execute(
              `SELECT record_id FROM sync_queue WHERE table_name = ? AND type = 'delete' AND (status = 'pending' OR status = 'processing')`,
              [table]
            );
            if (Array.isArray(pendingDeletes) && pendingDeletes.length > 0) {
              const delIds = new Set(pendingDeletes.map((r: any) => String(r.record_id)));
              resultList = resultList.filter((item: any) => !delIds.has(String(item.id || item._id)));
            }
          } catch {}

          return {
            data: resultList,
            total: resultList.length,
          };
        }
      } catch (err) {
        console.warn(`[UnifiedDB] REST list failed for ${table}, falling back to connected SQLite:`, err);
      }
    }

    // احتياطي الوضع المتصل عند انقطاع الشبكة: القراءة من anpos_connected المعزولة
    return connectedSqlite.list<T>(table, opts).catch(() => ({ data: [] as T[], total: 0 }));
  }

  async get<T>(table: string, id: string): Promise<T | null> {
    await this.init();
    if (this.mode === 'standalone') {
      return this.getStandaloneSqliteDriver().get<T>(table, id);
    }

    const connectedSqlite = this.getConnectedSqliteDriver();
    if (this.restDriver) {
      try {
        const restItem = await this.restDriver.get<T>(table, id);
        if (restItem) {
          connectedSqlite.create(table, restItem).catch(() => {});
          return restItem;
        }
      } catch {
        // fallback to connected sqlite
      }
    }
    return connectedSqlite.get<T>(table, id);
  }

  async create<T, R = T>(table: string, data: T): Promise<R> {
    await this.init();

    if (this.mode === 'standalone') {
      return this.getStandaloneSqliteDriver().create<T, R>(table, data);
    }

    const connectedSqlite = this.getConnectedSqliteDriver();
    const localResult = await connectedSqlite.create<T, R>(table, data);

    if (this.restDriver) {
      try {
        const remoteResult = await this.restDriver.create<T, R>(table, data);
        if (remoteResult && typeof remoteResult === 'object') {
          await connectedSqlite.create(table, remoteResult).catch(() => {});
          return remoteResult;
        }
      } catch (err) {
        console.warn(`[UnifiedDB] REST create failed for ${table}, enqueued in connected sync_queue:`, err);
        const recordId = (data as any)?.id || (localResult as any)?.id || '';
        if (recordId) {
          const nowIso = new Date().toISOString();
          const payload = JSON.stringify(data);
          await connectedSqlite.execute(
            `INSERT INTO sync_queue (id, type, table_name, record_id, payload, created_at, retries, max_retries, status, error_message)
             VALUES (?, 'create', ?, ?, ?, ?, 0, 5, 'pending', ?)`,
            [`sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, table, recordId, payload, nowIso, String(err)]
          ).catch(() => {});
        }
      }
    }

    return localResult;
  }

  async update<T>(table: string, id: string, data: T): Promise<boolean> {
    await this.init();

    if (this.mode === 'standalone') {
      return this.getStandaloneSqliteDriver().update<T>(table, id, data);
    }

    const connectedSqlite = this.getConnectedSqliteDriver();
    const localOk = await connectedSqlite.update<T>(table, id, data);

    if (this.restDriver) {
      try {
        await this.restDriver.update<T>(table, id, data);
      } catch (err) {
        console.warn(`[UnifiedDB] REST update failed for ${table}, enqueued in connected sync_queue:`, err);
        const nowIso = new Date().toISOString();
        const payload = JSON.stringify(data);
        await connectedSqlite.execute(
          `INSERT INTO sync_queue (id, type, table_name, record_id, payload, created_at, retries, max_retries, status, error_message)
           VALUES (?, 'update', ?, ?, ?, ?, 0, 5, 'pending', ?)`,
          [`sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, table, id, payload, nowIso, String(err)]
        ).catch(() => {});
      }
    }

    return localOk;
  }

  async remove(table: string, id: string): Promise<boolean> {
    await this.init();

    if (this.mode === 'standalone') {
      return this.getStandaloneSqliteDriver().remove(table, id);
    }

    const connectedSqlite = this.getConnectedSqliteDriver();
    const localOk = await connectedSqlite.remove(table, id);

    if (this.restDriver) {
      try {
        await this.restDriver.remove(table, id);
      } catch (err) {
        console.warn(`[UnifiedDB] REST remove failed for ${table}, enqueued in connected sync_queue:`, err);
        const nowIso = new Date().toISOString();
        await connectedSqlite.execute(
          `INSERT INTO sync_queue (id, type, table_name, record_id, payload, created_at, retries, max_retries, status, error_message)
           VALUES (?, 'delete', ?, ?, '{}', ?, 0, 5, 'pending', ?)`,
          [`sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, table, id, nowIso, String(err)]
        ).catch(() => {});
      }
    }

    return localOk;
  }

  async batchCreate<T, R = T>(table: string, records: T[]): Promise<R[]> {
    await this.init();
    if (this.mode === 'standalone') {
      return this.getStandaloneSqliteDriver().batchCreate(table, records);
    }
    if (this.restDriver) {
      try {
        return await this.restDriver.batchCreate(table, records);
      } catch {
        // fallback
      }
    }
    return this.getConnectedSqliteDriver().batchCreate(table, records);
  }

  async batchUpdate<T>(table: string, records: T[]): Promise<number> {
    await this.init();
    if (this.mode === 'standalone') {
      return this.getStandaloneSqliteDriver().batchUpdate(table, records);
    }
    if (this.restDriver) {
      try {
        return await this.restDriver.batchUpdate(table, records);
      } catch {
        // fallback
      }
    }
    return this.getConnectedSqliteDriver().batchUpdate(table, records);
  }

  async execute(sql: string, params?: unknown[]): Promise<void> {
    await this.init();
    const driver = this.mode === 'standalone' ? this.getStandaloneSqliteDriver() : this.getConnectedSqliteDriver();
    await driver.execute(sql, params);
  }

  async beginTransaction(): Promise<void> {
    await this.init();
    const driver = this.mode === 'standalone' ? this.getStandaloneSqliteDriver() : this.getConnectedSqliteDriver();
    await driver.beginTransaction();
  }

  async commit(): Promise<void> {
    await this.init();
    const driver = this.mode === 'standalone' ? this.getStandaloneSqliteDriver() : this.getConnectedSqliteDriver();
    await driver.commit();
  }

  async rollback(): Promise<void> {
    await this.init();
    const driver = this.mode === 'standalone' ? this.getStandaloneSqliteDriver() : this.getConnectedSqliteDriver();
    await driver.rollback();
  }

  async close(): Promise<void> {
    if (this.restDriver) {
      await this.restDriver.close().catch(() => {});
      this.restDriver = null;
    }
    if (this.standaloneDriver) {
      await this.standaloneDriver.close().catch(() => {});
      this.standaloneDriver = null;
    }
    if (this.connectedDriver) {
      await this.connectedDriver.close().catch(() => {});
      this.connectedDriver = null;
    }
    this.driver = null;
    this.initialized = false;
  }
}

export const db = new UnifiedDB();
