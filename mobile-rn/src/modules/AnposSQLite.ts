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
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    const result: Record<string, unknown> = {};
    try {
      for (const [key, value] of Object.entries(obj)) {
        if (key) {
          const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
          result[snakeKey] = value;
        }
      }
    } catch {
      return {};
    }
    return result;
  }

  private toCamelCase(row: Record<string, unknown>): Record<string, unknown> {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return {};
    const result: Record<string, unknown> = {};
    try {
      for (const [key, value] of Object.entries(row)) {
        if (key) {
          const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
          result[camelKey] = value;
        }
      }
    } catch {
      return {};
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
    if (opts.filters && typeof opts.filters === 'object' && !Array.isArray(opts.filters)) {
      try {
        for (const [field, value] of Object.entries(opts.filters)) {
          if (value !== undefined && value !== null) {
            const col = field.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
            conditions.push(`${col} = ?`);
            params.push(value);
          }
        }
      } catch {
        // ignore filter error
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

  private extractRows(res: any): any[] {
    if (!res || !res.rows) return [];
    if (Array.isArray(res.rows)) return res.rows;
    if (Array.isArray((res.rows as any)._array)) return (res.rows as any)._array;
    if (typeof (res.rows as any).length === 'number') {
      const items: any[] = [];
      const len = (res.rows as any).length;
      for (let i = 0; i < len; i++) {
        const item = typeof (res.rows as any).item === 'function'
          ? (res.rows as any).item(i)
          : (res.rows as any)[i];
        if (item !== undefined && item !== null) items.push(item);
      }
      return items;
    }
    return [];
  }

  async list<T = unknown>(table: string, opts: ListOptions = {}): Promise<ListResult<T>> {
    const conn = this.getConn();
    const { sql, params, countSql, countParams } = this.buildListQuery(table, opts);

    const result = conn.execute(sql, params as any[]);
    const countResult = conn.execute(countSql, countParams as any[]);
    const countRows = this.extractRows(countResult);
    const total = Number(countRows[0]?.total ?? 0);

    const data: T[] = [];
    const rows = this.extractRows(result);
    for (const item of rows) {
      if (item && typeof item === 'object') {
        data.push(this.toCamelCase(item as Record<string, unknown>) as T);
      }
    }
    return { data, total };
  }

  private tableColumnsCache = new Map<string, Set<string>>();

  private getTableColumns(table: string): Set<string> {
    if (this.tableColumnsCache.has(table)) {
      return this.tableColumnsCache.get(table)!;
    }
    try {
      const conn = this.getConn();
      const res = conn.execute(`PRAGMA table_info(${table})`);
      const rows = this.extractRows(res);
      const cols = new Set<string>();
      for (const row of rows) {
        if (row && row.name) cols.add(String(row.name));
      }
      if (cols.size > 0) {
        this.tableColumnsCache.set(table, cols);
        return cols;
      }
    } catch (err) {
      console.warn(`[AnposSQLite] PRAGMA table_info(${table}) error:`, err);
    }
    return new Set<string>();
  }

  async get<T = unknown>(table: string, id: string): Promise<T | null> {
    const conn = this.getConn();
    const result = conn.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    const rows = this.extractRows(result);
    if (rows.length === 0) return null;
    const item = rows[0];
    return item && typeof item === 'object' ? (this.toCamelCase(item as Record<string, unknown>) as T) : null;
  }

  async create<T = unknown, R = T>(table: string, data: T): Promise<R> {
    const conn = this.getConn();
    const now = new Date().toISOString();
    const snakeData = this.toSnakeCase(data as Record<string, unknown>);

    if (!snakeData.id) snakeData.id = generateId();
    if (!snakeData.created_at) snakeData.created_at = now;
    if (!snakeData.updated_at) snakeData.updated_at = now;

    const validCols = this.getTableColumns(table);
    const columns = Object.keys(snakeData).filter(
      (c) => validCols.size > 0 ? validCols.has(c) : true
    );

    if (columns.length === 0) return data as unknown as R;

    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((c) => {
      const v = snakeData[c];
      if (v !== null && typeof v === 'object') return JSON.stringify(v);
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v;
    });

    const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    conn.execute(sql, values as any[]);
    return data as unknown as R;
  }

  async update<T = unknown>(table: string, id: string, data: T): Promise<boolean> {
    const conn = this.getConn();
    const snakeData = this.toSnakeCase(data as Record<string, unknown>);
    snakeData.updated_at = new Date().toISOString();

    const validCols = this.getTableColumns(table);
    const columns = Object.keys(snakeData).filter(
      (c) => c !== 'id' && (validCols.size > 0 ? validCols.has(c) : true)
    );

    if (columns.length === 0) return true;

    const setClause = columns.map((c) => `${c} = ?`).join(', ');
    const values = columns.map((c) => {
      const v = snakeData[c];
      if (v !== null && typeof v === 'object') return JSON.stringify(v);
      if (typeof v === 'boolean') return v ? 1 : 0;
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
    const rawRows = this.extractRows(result);
    for (const item of rawRows) {
      if (item && typeof item === 'object') {
        rows.push(this.toCamelCase(item as Record<string, unknown>));
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
