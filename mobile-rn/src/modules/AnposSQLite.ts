import { open, type NitroSQLiteConnection } from 'react-native-nitro-sqlite';
import type { DataDriver, DriverConfig, ListOptions, ListResult } from '@/infrastructure/drivers/DataDriver';
import { DriverError } from '@/infrastructure/drivers/DataDriver';
import { generateId } from '@shared/utils';

export class AnposSQLiteDriver implements DataDriver {
  private conn: NitroSQLiteConnection | null = null;
  private dbName: string;

  constructor(config: DriverConfig) {
    this.dbName = config.databaseName || 'anpos';
  }

  async initialize(): Promise<void> {
    try {
      this.conn = open({ name: this.dbName });
    } catch (err) {
      throw new DriverError('Failed to initialize SQLite database', 'SQLITE_INIT_ERROR', err);
    }
  }

  private getConn(): NitroSQLiteConnection {
    if (!this.conn) {
      throw new DriverError('DB not initialized', 'NOT_INITIALIZED');
    }
    return this.conn;
  }

  private toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = value;
    }
    return result;
  }

  private toCamelCase(row: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }

  private buildListQuery(table: string, opts: ListOptions): { sql: string; params: unknown[]; countSql: string; countParams: unknown[] } {
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Full-text search (products)
    if (opts.search) {
      const searchTerm = `%${opts.search}%`;
      conditions.push('(name LIKE ? OR barcode LIKE ? OR sku LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Exact field filters
    if (opts.filters) {
      for (const [field, value] of Object.entries(opts.filters)) {
        if (value !== undefined && value !== null) {
          const col = field.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
          conditions.push(`${col} = ?`);
          params.push(value);
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderByClause = '';
    if (opts.sortBy) {
      const col = opts.sortBy.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
      orderByClause = `ORDER BY ${col} ${opts.sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    }

    const countSql = `SELECT COUNT(*) as total FROM ${table} ${whereClause}`;
    const countParams = [...params];

    let sql = `SELECT * FROM ${table}`;
    if (whereClause) sql += ` ${whereClause}`;
    if (orderByClause) sql += ` ${orderByClause}`;
    if (opts.limit) {
      sql += ` LIMIT ?`;
      params.push(opts.limit);
      if (opts.offset) {
        sql += ` OFFSET ?`;
        params.push(opts.offset);
      }
    }

    return { sql, params, countSql, countParams };
  }

  async list<T = unknown>(table: string, opts: ListOptions = {}): Promise<ListResult<T>> {
    const conn = this.getConn();
    const { sql, params, countSql, countParams } = this.buildListQuery(table, opts);

    const result = conn.execute(sql, params as any[]);
    const countResult = conn.execute(countSql, countParams as any[]);
    const total = Number(countResult.rows?.item(0)?.total ?? 0);

    const data: T[] = [];
    if (result.rows) {
      for (let i = 0; i < result.rows.length; i++) {
        const item = result.rows.item(i);
        if (item) {
          data.push(this.toCamelCase(item as Record<string, unknown>) as T);
        }
      }
    }
    return { data, total };
  }

  async get<T = unknown>(table: string, id: string): Promise<T | null> {
    const conn = this.getConn();
    const result = conn.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!result.rows || result.rows.length === 0) return null;
    const item = result.rows.item(0);
    return item ? (this.toCamelCase(item as Record<string, unknown>) as T) : null;
  }

  async create<T = unknown, R = T>(table: string, data: T): Promise<R> {
    const conn = this.getConn();
    const now = new Date().toISOString();
    const snakeData = this.toSnakeCase(data as Record<string, unknown>);

    if (!snakeData.id) snakeData.id = generateId();
    if (!snakeData.created_at) snakeData.created_at = now;
    if (!snakeData.updated_at) snakeData.updated_at = now;

    const columns = Object.keys(snakeData);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((c) => {
      const v = snakeData[c];
      if (v !== null && typeof v === 'object') return JSON.stringify(v);
      return v;
    });

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    conn.execute(sql, values as any[]);
    return data as unknown as R;
  }

  async update<T = unknown>(table: string, id: string, data: T): Promise<boolean> {
    const conn = this.getConn();
    const snakeData = this.toSnakeCase(data as Record<string, unknown>);
    snakeData.updated_at = new Date().toISOString();

    const columns = Object.keys(snakeData).filter((c) => c !== 'id');
    const setClause = columns.map((c) => `${c} = ?`).join(', ');
    const values = columns.map((c) => {
      const v = snakeData[c];
      if (v !== null && typeof v === 'object') return JSON.stringify(v);
      return v;
    });
    values.push(id);

    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    conn.execute(sql, values as any[]);
    return true;
  }

  async remove(table: string, id: string): Promise<boolean> {
    const conn = this.getConn();
    conn.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return true;
  }

  async batchCreate<T = unknown, R = T>(table: string, records: T[]): Promise<R[]> {
    const conn = this.getConn();
    conn.execute('BEGIN TRANSACTION;');
    try {
      const results: R[] = [];
      for (const record of records) {
        results.push(await this.create<T, R>(table, record));
      }
      conn.execute('COMMIT;');
      return results;
    } catch (err) {
      conn.execute('ROLLBACK;');
      throw err;
    }
  }

  async batchUpdate<T = unknown>(table: string, records: T[]): Promise<number> {
    const conn = this.getConn();
    conn.execute('BEGIN TRANSACTION;');
    try {
      let updated = 0;
      for (const record of records) {
        const id = (record as Record<string, unknown>).id as string;
        const ok = await this.update(table, id, record);
        if (ok) updated++;
      }
      conn.execute('COMMIT;');
      return updated;
    } catch (err) {
      conn.execute('ROLLBACK;');
      throw err;
    }
  }

  async beginTransaction(): Promise<void> {
    this.getConn().execute('BEGIN TRANSACTION;');
  }

  async commit(): Promise<void> {
    this.getConn().execute('COMMIT;');
  }

  async rollback(): Promise<void> {
    this.getConn().execute('ROLLBACK;');
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const conn = this.getConn();
    conn.execute('BEGIN TRANSACTION;');
    try {
      const result = await fn();
      conn.execute('COMMIT;');
      return result;
    } catch (error) {
      try {
        conn.execute('ROLLBACK;');
      } catch { /* ignore */ }
      throw error;
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowsAffected: number }> {
    const conn = this.getConn();
    const queryParams = (params && params.length > 0) ? (params as any[]) : undefined;
    const result = conn.execute(sql, queryParams);
    const rows: Record<string, unknown>[] = [];
    if (result.rows) {
      for (let i = 0; i < result.rows.length; i++) {
        const item = result.rows.item(i);
        if (item) {
          rows.push(this.toCamelCase(item as Record<string, unknown>));
        }
      }
    }
    return { rows, rowsAffected: result.rowsAffected ?? 0 };
  }

  async close(): Promise<void> {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
  }
}
