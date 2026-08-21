// ============================================================
// سائق REST API — يربط بالخادم الكهربائي على شبكة LAN
// REST API driver — connects to desktop Electron server over HTTP
// ============================================================

import type { DataDriver, ListOptions, ListResult, DriverConfig } from './DataDriver';
import { DriverError } from './DataDriver';

export class RESTDriver implements DataDriver {
  private baseUrl: string;
  private sessionToken: string | null;
  private deviceId: string | null;
  private initialized = false;

  constructor(config: DriverConfig) {
    this.baseUrl = config.baseUrl || '';
    this.sessionToken = config.sessionToken || null;
    this.deviceId = config.deviceId || null;
  }

  setSession(token: string, deviceId: string): void {
    this.sessionToken = token;
    this.deviceId = deviceId;
    this.initialized = true;
  }

  async initialize(): Promise<void> {
    if (!this.baseUrl) {
      throw new DriverError('No server URL configured', 'NO_SERVER_URL');
    }
    this.initialized = true;
  }

  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.sessionToken) headers['x-session-token'] = this.sessionToken;
    if (this.deviceId) headers['x-device-id'] = this.deviceId;
    return headers;
  }

  private async apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...this.buildHeaders(), ...(options.headers as Record<string, string> || {}) },
      credentials: 'omit',
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.sessionToken = null;
        this.deviceId = null;
      }
      let errMsg = 'API Error';
      try {
        const err = await res.json();
        errMsg = err?.error?.detail || errMsg;
      } catch {
        // keep default
      }
      throw new DriverError(errMsg, `HTTP_${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json() as Promise<T>;
    }
    return (await res.text()) as unknown as T;
  }

  async list<T = unknown>(table: string, opts: ListOptions = {}): Promise<ListResult<T>> {
    const q = new URLSearchParams();
    if (opts.search) q.set('search', opts.search);
    if (opts.from) q.set('from', opts.from);
    if (opts.to) q.set('to', opts.to);
    if (opts.limit) q.set('limit', String(opts.limit));
    if (opts.offset) q.set('offset', String(opts.offset));

    const qs = q.toString();
    const result = await this.apiCall<{ data: T[]; total?: number }>(
      `/api/${table}${qs ? `?${qs}` : ''}`
    );
    return { data: result.data || [], total: result.total || result.data?.length || 0 };
  }

  async get<T = unknown>(table: string, id: string): Promise<T | null> {
    const result = await this.apiCall<{ data: T | null }>(`/api/${table}/${id}`);
    return result.data ?? null;
  }

  async create<T = unknown, R = T>(table: string, data: T): Promise<R> {
    const result = await this.apiCall<{ data: R }>(`/api/${table}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.data;
  }

  async update<T = unknown>(table: string, id: string, data: T): Promise<boolean> {
    await this.apiCall(`/api/${table}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return true;
  }

  async remove(table: string, id: string): Promise<boolean> {
    await this.apiCall(`/api/${table}/${id}`, { method: 'DELETE' });
    return true;
  }

  async batchCreate<T = unknown, R = T>(table: string, records: T[]): Promise<R[]> {
    const results: R[] = [];
    for (const record of records) {
      const r = await this.create<T, R>(table, record);
      results.push(r);
    }
    return results;
  }

  async batchUpdate<T = unknown>(table: string, records: T[]): Promise<number> {
    let count = 0;
    for (const record of records) {
      const id = (record as Record<string, unknown>).id as string;
      const ok = await this.update(table, id, record);
      if (ok) count++;
    }
    return count;
  }

  async beginTransaction(): Promise<void> {
    // REST has no real transaction — batch is sequential
  }

  async commit(): Promise<void> {
    // no-op
  }

  async rollback(): Promise<void> {
    // no-op
  }

  async close(): Promise<void> {
    this.initialized = false;
  }
}
