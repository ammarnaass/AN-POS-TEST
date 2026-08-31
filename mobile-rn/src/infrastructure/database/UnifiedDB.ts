import { AnposSQLiteDriver } from '@/modules/AnposSQLite';
import { RESTDriver } from '../drivers/RESTDriver';
import { AnposSecureStore } from '@/modules/AnposSecureStore';
import type { DataDriver, DriverConfig, DriverType, ListOptions, ListResult } from '../drivers/DataDriver';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL } from './schema';
import { seedDatabase } from './seed';

export type AppMode = 'standalone' | 'connected';

const PREF_KEY_MODE = 'anpos_app_mode';
const PREF_KEY_SERVER_URL = 'anpos_server_url';
const PREF_KEY_SESSION_TOKEN = 'anpos_session_token';
const PREF_KEY_DEVICE_ID = 'anpos_device_id';
const PREF_KEY_CONNECTION_KEY = 'anpos_connection_key';

export async function getStoredMode(): Promise<AppMode> {
  const mode = await AnposSecureStore.get(PREF_KEY_MODE);
  return (mode as AppMode) || 'standalone';
}

export async function setStoredMode(mode: AppMode): Promise<void> {
  await AnposSecureStore.set(PREF_KEY_MODE, mode);
}

/** Run CREATE TABLE + INDEX statements, then seed default data */
export async function initSQLiteSchema(driver: AnposSQLiteDriver): Promise<void> {
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
    "ALTER TABLE products ADD COLUMN custom_prices TEXT DEFAULT '[]'",
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
  try {
    await seedDatabase(driver);
  } catch (err) {
    console.warn('[UnifiedDB] Seed database error:', err);
  }
}

class UnifiedDB {
  private driver: DataDriver | null = null;
  private mode: AppMode = 'standalone';
  private sqliteDriver: AnposSQLiteDriver | null = null;
  private restDriver: RESTDriver | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const storedMode = await getStoredMode();
    this.mode = storedMode;

    if (this.mode === 'connected') {
      const [serverUrl, token, deviceId] = await Promise.all([
        AnposSecureStore.get(PREF_KEY_SERVER_URL),
        AnposSecureStore.get(PREF_KEY_SESSION_TOKEN),
        AnposSecureStore.get(PREF_KEY_DEVICE_ID),
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
        this.mode = 'standalone';
      }
    }

    // تهيئة SQLite دائماً ليكون متاحاً للمزامنة والتخزين المؤقت المحلي
    try {
      if (!this.sqliteDriver) {
        this.sqliteDriver = new AnposSQLiteDriver({ databaseName: 'anpos' });
        await this.sqliteDriver.initialize();
      }
      await initSQLiteSchema(this.sqliteDriver);
      if (this.mode === 'standalone' || !this.driver) {
        this.driver = this.sqliteDriver;
        this.mode = 'standalone';
      }
    } catch (err) {
      console.warn('[UnifiedDB] SQLite init failed:', err);
    }

    this.initialized = true;
  }

  getMode(): AppMode {
    return this.mode;
  }

  getSqliteDriver(): AnposSQLiteDriver {
    if (!this.sqliteDriver) {
      this.sqliteDriver = new AnposSQLiteDriver({ databaseName: 'anpos' });
      this.sqliteDriver.initialize().catch(() => {});
    }
    return this.sqliteDriver;
  }

  async switchToConnected(serverUrl: string, token?: string, deviceId?: string): Promise<void> {
    await this.init();
    await AnposSecureStore.set(PREF_KEY_SERVER_URL, serverUrl);
    const sessionToken = token || (await AnposSecureStore.get(PREF_KEY_SESSION_TOKEN)) || '';
    const devId = deviceId || (await AnposSecureStore.get(PREF_KEY_DEVICE_ID)) || '';

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
      await this.restDriver.close();
      this.restDriver = null;
    }
    if (!this.sqliteDriver) {
      this.sqliteDriver = new AnposSQLiteDriver({ databaseName: 'anpos' });
      await this.sqliteDriver.initialize();
    }
    await initSQLiteSchema(this.sqliteDriver);
    this.driver = this.sqliteDriver;
    this.mode = 'standalone';
    await setStoredMode('standalone');
    this.initialized = true;
  }

  getDriverType(): DriverType {
    return this.mode === 'connected' ? 'rest' : 'sqlite';
  }

  getDriver(): DataDriver {
    if (!this.driver) {
      throw new Error('DB not initialized. Call await db.init() first');
    }
    return this.driver;
  }

  async list<T>(table: string, opts?: ListOptions): Promise<ListResult<T>> {
    await this.init();
    const sqlite = this.getSqliteDriver();
    const localResult = await sqlite.list<T>(table, opts).catch(() => ({ data: [] as T[], total: 0 }));

    if (this.mode === 'connected' && this.restDriver) {
      try {
        const restResult = await this.restDriver.list<T>(table, opts);
        if (restResult && Array.isArray(restResult.data)) {
          // Merge local & remote (remote takes precedence, local unique items are preserved)
          const remoteMap = new Map<string, T>();
          for (const item of restResult.data) {
            const id = (item as any)?.id || (item as any)?._id;
            if (id) remoteMap.set(String(id), item);
          }

          // Cache remote items to SQLite in background
          if (this.sqliteDriver && restResult.data.length > 0) {
            Promise.resolve().then(async () => {
              try {
                for (const item of restResult.data.slice(0, 100)) {
                  if (item && typeof item === 'object') {
                    await this.sqliteDriver?.create(table, item).catch(() => {});
                  }
                }
              } catch {}
            });
          }

          // Include local items not yet in remote (so mobile created products are immediately visible!)
          const mergedList = [...restResult.data];
          for (const localItem of localResult.data) {
            const localId = (localItem as any)?.id || (localItem as any)?._id;
            if (localId && !remoteMap.has(String(localId))) {
              mergedList.unshift(localItem);
            }
          }

          // Filter out any items that have a pending delete operation in sync_queue
          let filteredList = mergedList;
          try {
            const pendingDeletes: any = await sqlite.execute(
              `SELECT record_id FROM sync_queue WHERE table_name = ? AND type = 'delete' AND (status = 'pending' OR status = 'processing')`,
              [table]
            );
            if (Array.isArray(pendingDeletes) && pendingDeletes.length > 0) {
              const delIds = new Set(pendingDeletes.map((r: any) => String(r.record_id)));
              filteredList = mergedList.filter((item: any) => !delIds.has(String(item.id || item._id)));
            }
          } catch {}

          return {
            data: filteredList,
            total: filteredList.length,
          };
        }
      } catch (err) {
        console.warn(`[UnifiedDB] REST list failed for ${table}, falling back to SQLite:`, err);
      }
    }

    return localResult;
  }

  async get<T>(table: string, id: string): Promise<T | null> {
    await this.init();
    if (this.mode === 'connected' && this.restDriver) {
      try {
        const restItem = await this.restDriver.get<T>(table, id);
        if (restItem) {
          this.sqliteDriver?.create(table, restItem).catch(() => {});
          return restItem;
        }
      } catch {
        // fallback to sqlite
      }
    }
    const sqlite = this.getSqliteDriver();
    return sqlite.get<T>(table, id);
  }

  async create<T, R = T>(table: string, data: T): Promise<R> {
    await this.init();
    const sqlite = this.getSqliteDriver();
    // 1. Always save locally to SQLite
    const localResult = await sqlite.create<T, R>(table, data);

    // 2. If in connected mode, push to server (or queue)
    if (this.mode === 'connected' && this.restDriver) {
      try {
        const remoteResult = await this.restDriver.create<T, R>(table, data);
        if (remoteResult && typeof remoteResult === 'object') {
          await sqlite.create(table, remoteResult).catch(() => {});
          return remoteResult;
        }
      } catch (err) {
        console.warn(`[UnifiedDB] REST create failed for ${table}, enqueued locally:`, err);
        const recordId = (data as any)?.id || (localResult as any)?.id || '';
        if (recordId) {
          const nowIso = new Date().toISOString();
          const payload = JSON.stringify(data);
          await sqlite.execute(
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
    const sqlite = this.getSqliteDriver();
    const localOk = await sqlite.update<T>(table, id, data);

    if (this.mode === 'connected' && this.restDriver) {
      try {
        await this.restDriver.update<T>(table, id, data);
      } catch (err) {
        console.warn(`[UnifiedDB] REST update failed for ${table}, enqueued locally:`, err);
        const nowIso = new Date().toISOString();
        const payload = JSON.stringify(data);
        await sqlite.execute(
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
    const sqlite = this.getSqliteDriver();
    const localOk = await sqlite.remove(table, id);

    if (this.mode === 'connected' && this.restDriver) {
      try {
        await this.restDriver.remove(table, id);
      } catch (err) {
        console.warn(`[UnifiedDB] REST remove failed for ${table}, enqueued locally:`, err);
        const nowIso = new Date().toISOString();
        await sqlite.execute(
          `INSERT INTO sync_queue (id, type, table_name, record_id, payload, created_at, retries, max_retries, status, error_message)
           VALUES (?, 'delete', ?, ?, '{}', ?, 0, 5, 'pending', ?)`,
          [`sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, table, id, nowIso, String(err)]
        ).catch(() => {});
      }
    }

    return localOk;
  }

  async batchCreate<T, R = T>(table: string, records: T[]): Promise<R[]> {
    return this.getDriver().batchCreate(table, records);
  }

  async batchUpdate<T>(table: string, records: T[]): Promise<number> {
    return this.getDriver().batchUpdate(table, records);
  }

  async execute(sql: string, params?: unknown[]): Promise<void> {
    await this.getDriver().execute?.(sql, params);
  }

  async beginTransaction(): Promise<void> {
    await this.getDriver().beginTransaction?.();
  }

  async commit(): Promise<void> {
    await this.getDriver().commit?.();
  }

  async rollback(): Promise<void> {
    await this.getDriver().rollback?.();
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close?.();
      this.driver = null;
      this.initialized = false;
    }
  }
}

export const db = new UnifiedDB();
