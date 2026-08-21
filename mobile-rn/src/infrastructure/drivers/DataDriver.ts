export interface QueryResult {
  rows: Record<string, unknown>[];
  rowsAffected: number;
  insertId?: number;
}

export interface ListOptions {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
  from?: string;
  to?: string;
}

export interface ListResult<T> {
  data: T[];
  total: number;
}

export type DriverType = 'sqlite' | 'rest' | 'indexeddb' | 'memory';

export interface DriverConfig {
  databaseName?: string;
  baseUrl?: string;
  sessionToken?: string;
  deviceId?: string;
}

export abstract class DataDriver {
  abstract initialize(): Promise<void>;
  abstract list<T = unknown>(table: string, opts?: ListOptions): Promise<ListResult<T>>;
  abstract get<T = unknown>(table: string, id: string): Promise<T | null>;
  abstract create<T, R = T>(table: string, data: T): Promise<R>;
  abstract update<T = unknown>(table: string, id: string, data: T): Promise<boolean>;
  abstract remove(table: string, id: string): Promise<boolean>;
  abstract batchCreate<T, R = T>(table: string, records: T[]): Promise<R[]>;
  abstract batchUpdate<T = unknown>(table: string, records: T[]): Promise<number>;
  beginTransaction?(): Promise<void>;
  commit?(): Promise<void>;
  rollback?(): Promise<void>;
  transaction?<T>(fn: () => Promise<T>): Promise<T>;
  execute?(sql: string, params?: unknown[]): Promise<QueryResult>;
  close?(): Promise<void>;
}

export class DriverError extends Error {
  code: string;
  cause?: unknown;
  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}
