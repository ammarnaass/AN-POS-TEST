// بوابة نقل البيانات الموزعة (Transport Gateway)
// تدعم التبديل السلس والذكي بين:
// 1. الوضع المحلي (Server / Master): استدعاء دوال IPC المباشرة مع SQLite
// 2. وضع العميل (Client Terminal): استدعاء خادم الشبكة المحلية عبر HTTP REST مع Session Token و Device ID
//
// جميع الشاشات والمخازن في الواجهة تستخدم هذه الطبقة عبر src/lib/db.ts بدون أي تعديل في منطق الأعمال.

export type TerminalRole = 'server' | 'client';

export interface TransportDbApi {
  list: (table: string, opts?: { search?: string; from?: string; to?: string; limit?: number; offset?: number; filter?: Record<string, unknown>; orderBy?: string; orderDir?: 'ASC' | 'DESC' | 'asc' | 'desc' }) => Promise<{ data: any[]; total: number }>;
  get: (table: string, id: string) => Promise<{ data: any } | null>;
  bulkGet: (table: string, ids: string[]) => Promise<{ data: any[] }>;
  create: (table: string, data: Record<string, unknown>) => Promise<{ data: any }>;
  bulkCreate: (table: string, items: Record<string, unknown>[]) => Promise<{ success: boolean; insertedCount: number }>;
  update: (table: string, id: string, data: Record<string, unknown>) => Promise<{ data: any }>;
  bulkUpdate: (table: string, items: Record<string, unknown>[]) => Promise<{ success: boolean; updatedCount: number }>;
  remove: (table: string, id: string) => Promise<{ success: boolean }>;
  count: (table: string, filter?: Record<string, unknown>) => Promise<{ count: number }>;
  clear: (table: string) => Promise<{ success: boolean }>;
  onTableUpdated: (callback: (data: { table: string; action?: string; id?: string }) => void) => () => void;
}

const TABLE_LISTENERS = new Set<(data: { table: string; action?: string; id?: string }) => void>();

export function getStoredTerminalRole(): TerminalRole {
  if (typeof window === 'undefined') return 'server';
  const role = localStorage.getItem('anpos_terminal_role');
  return role === 'client' ? 'client' : 'server';
}

export function getStoredServerLanUrl(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem('anpos_server_lan_url') || '').trim().replace(/\/+$/, '');
}

export function getStoredClientToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('anpos_client_token') || '';
}

export function getStoredClientDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('anpos_client_device_id');
  if (!id) {
    id = `term_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem('anpos_client_device_id', id);
  }
  return id;
}

export function setStoredTransportConfig(config: {
  role?: TerminalRole;
  serverUrl?: string;
  token?: string;
  deviceId?: string;
}): void {
  if (typeof window === 'undefined') return;
  if (config.role) localStorage.setItem('anpos_terminal_role', config.role);
  if (config.serverUrl !== undefined) localStorage.setItem('anpos_server_lan_url', config.serverUrl.trim().replace(/\/+$/, ''));
  if (config.token !== undefined) localStorage.setItem('anpos_client_token', config.token);
  if (config.deviceId !== undefined) localStorage.setItem('anpos_client_device_id', config.deviceId);
}

function buildHeaders(): Record<string, string> {
  const token = getStoredClientToken();
  const deviceId = getStoredClientDeviceId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) headers['x-session-token'] = token;
  if (deviceId) headers['x-device-id'] = deviceId;
  return headers;
}

function toQueryString(params: Record<string, unknown> = {}): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])).toString();
}

/**
 * عميل HTTP لنقل البيانات إلى خادم AN POS على الشبكة المحلية (Client Mode)
 */
export const httpTransportDb: TransportDbApi = {
  list: async (table, opts = {}) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) throw new Error('عنوان خادم الشبكة المحلية غير محدد. يرجى ضبطه في إعدادات الشبكة.');
    const url = `${baseUrl}/api/${encodeURIComponent(table)}${toQueryString(opts as Record<string, unknown>)}`;
    const res = await fetch(url, { headers: buildHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
      throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
    }
    const json = await res.json();
    return { data: Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []), total: json?.total ?? 0 };
  },

  get: async (table, id) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) throw new Error('عنوان خادم الشبكة المحلية غير محدد.');
    const url = `${baseUrl}/api/${encodeURIComponent(table)}/${encodeURIComponent(id)}`;
    const res = await fetch(url, { headers: buildHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
      throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
    }
    const json = await res.json();
    return { data: json?.data ?? json };
  },

  bulkGet: async (table, ids) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) throw new Error('عنوان خادم الشبكة المحلية غير محدد.');
    const url = `${baseUrl}/api/${encodeURIComponent(table)}/bulk-get`;
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
      throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
    }
    const json = await res.json();
    return { data: Array.isArray(json?.data) ? json.data : [] };
  },

  create: async (table, data) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) throw new Error('عنوان خادم الشبكة المحلية غير محدد.');
    const url = `${baseUrl}/api/${encodeURIComponent(table)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
      throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
    }
    const json = await res.json();
    // إشعار المستمعين محلياً
    TABLE_LISTENERS.forEach((cb) => {
      try { cb({ table, action: 'create', id: (json?.data?.id || (data.id as string)) }); } catch {}
    });
    return { data: json?.data ?? json };
  },

  bulkCreate: async (table, items) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) throw new Error('عنوان خادم الشبكة المحلية غير محدد.');
    const url = `${baseUrl}/api/${encodeURIComponent(table)}/bulk-create`;
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
      throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
    }
    const json = await res.json();
    TABLE_LISTENERS.forEach((cb) => {
      try { cb({ table, action: 'bulkCreate' }); } catch {}
    });
    return json;
  },

  update: async (table, id, data) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) throw new Error('عنوان خادم الشبكة المحلية غير محدد.');
    const url = `${baseUrl}/api/${encodeURIComponent(table)}/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
      throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
    }
    const json = await res.json();
    TABLE_LISTENERS.forEach((cb) => {
      try { cb({ table, action: 'update', id }); } catch {}
    });
    return { data: json?.data ?? json };
  },

  bulkUpdate: async (table, items) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) throw new Error('عنوان خادم الشبكة المحلية غير محدد.');
    const url = `${baseUrl}/api/${encodeURIComponent(table)}/bulk-update`;
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
      throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
    }
    const json = await res.json();
    TABLE_LISTENERS.forEach((cb) => {
      try { cb({ table, action: 'bulkUpdate' }); } catch {}
    });
    return json;
  },

  remove: async (table, id) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) throw new Error('عنوان خادم الشبكة المحلية غير محدد.');
    const url = `${baseUrl}/api/${encodeURIComponent(table)}/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
      throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
    }
    const json = await res.json();
    TABLE_LISTENERS.forEach((cb) => {
      try { cb({ table, action: 'delete', id }); } catch {}
    });
    return { success: json?.success ?? true };
  },

  count: async (table, filter = {}) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) throw new Error('عنوان خادم الشبكة المحلية غير محدد.');
    const url = `${baseUrl}/api/${encodeURIComponent(table)}/count${toQueryString(filter)}`;
    const res = await fetch(url, { headers: buildHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
      throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
    }
    const json = await res.json();
    return { count: Number(json?.count ?? 0) };
  },

  clear: async (table) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) throw new Error('عنوان خادم الشبكة المحلية غير محدد.');
    const url = `${baseUrl}/api/${encodeURIComponent(table)}/clear`;
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
      throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
    }
    TABLE_LISTENERS.forEach((cb) => {
      try { cb({ table, action: 'clear' }); } catch {}
    });
    return { success: true };
  },

  onTableUpdated: (callback) => {
    TABLE_LISTENERS.add(callback);
    return () => {
      TABLE_LISTENERS.delete(callback);
    };
  },
};

/**
 * الحصول على واجهة التخزين المناسبة بناءً على دور الجهاز (خادم أو عميل)
 */
export function getActiveTransportDb(): TransportDbApi | null {
  const role = getStoredTerminalRole();
  const serverUrl = getStoredServerLanUrl();

  // إذا تم تعيين دور هذا الجهاز كـ عميل ومحدد له عنوان السيرفر
  if (role === 'client' && serverUrl) {
    return httpTransportDb;
  }

  // الافتراضي: استخدام Electron IPC المحلي
  if (typeof window !== 'undefined' && (window as any).electronAPI?.db) {
    return (window as any).electronAPI.db as TransportDbApi;
  }

  return null;
}
