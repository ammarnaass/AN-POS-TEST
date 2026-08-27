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

    if (this.mode === 'standalone' || !this.driver) {
      try {
        if (!this.sqliteDriver) {
          this.sqliteDriver = new AnposSQLiteDriver({ databaseName: 'anpos' });
          await this.sqliteDriver.initialize();
        }
        await initSQLiteSchema(this.sqliteDriver);
        this.driver = this.sqliteDriver;
      } catch (err) {
        console.warn('[UnifiedDB] SQLite init failed:', err);
      }
      this.mode = 'standalone';
    }

    this.initialized = true;
  }

  getMode(): AppMode {
    return this.mode;
  }

  async switchToConnected(serverUrl: string): Promise<void> {
    await this.init();
    await AnposSecureStore.set(PREF_KEY_SERVER_URL, serverUrl);
    this.restDriver = new RESTDriver({ baseUrl: serverUrl });
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
    return this.getDriver().list<T>(table, opts);
  }

  async get<T>(table: string, id: string): Promise<T | null> {
    return this.getDriver().get<T>(table, id);
  }

  async create<T, R = T>(table: string, data: T): Promise<R> {
    return this.getDriver().create<T, R>(table, data);
  }

  async update<T>(table: string, id: string, data: T): Promise<boolean> {
    return this.getDriver().update<T>(table, id, data);
  }

  async remove(table: string, id: string): Promise<boolean> {
    return this.getDriver().remove(table, id);
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
