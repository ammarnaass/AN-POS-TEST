// بوابة نقل البيانات الموزعة (Transport Gateway)
// تدعم التبديل السلس والذكي بين:
// 1. الوضع المحلي (Server / Master): استدعاء دوال IPC المباشرة مع SQLite
// 2. وضع العميل (Client Terminal): استدعاء خادم الشبكة المحلية عبر HTTP REST مع Session Token و Device ID
//
// جميع الشاشات والمخازن في الواجهة تستخدم هذه الطبقة عبر src/lib/db.ts بدون أي تعديل في منطق الأعمال.

import {
  saveReplicaItem,
  saveReplicaBatch,
  getReplicaItem,
  listReplicaItems,
  removeReplicaItem,
} from './offlineReplica';
import { enqueueOutboxItem } from './offlineOutbox';

export type TerminalRole = 'server' | 'client';
export type SyncMode = 'single' | 'lan' | 'cloud' | 'hybrid';

export interface TransportDbApi {
  list: (table: string, opts?: { search?: string; from?: string; to?: string; limit?: number; offset?: number; filter?: Record<string, unknown>; orderBy?: string; orderDir?: 'ASC' | 'DESC' | 'asc' | 'desc' }) => Promise<{ data: any[]; total: number; offlineReplica?: boolean }>;
  get: (table: string, id: string) => Promise<{ data: any; offlineReplica?: boolean } | null>;
  bulkGet: (table: string, ids: string[]) => Promise<{ data: any[]; offlineReplica?: boolean }>;
  create: (table: string, data: Record<string, unknown>) => Promise<{ data: any; queuedOffline?: boolean }>;
  bulkCreate: (table: string, items: Record<string, unknown>[]) => Promise<{ success: boolean; insertedCount: number; queuedOffline?: boolean }>;
  update: (table: string, id: string, data: Record<string, unknown>) => Promise<{ data: any; queuedOffline?: boolean }>;
  bulkUpdate: (table: string, items: Record<string, unknown>[]) => Promise<{ success: boolean; updatedCount: number; queuedOffline?: boolean }>;
  remove: (table: string, id: string) => Promise<{ success: boolean; queuedOffline?: boolean }>;
  count: (table: string, filter?: Record<string, unknown>) => Promise<{ count: number }>;
  clear: (table: string) => Promise<{ success: boolean }>;
  onTableUpdated: (callback: (data: { table: string; action?: string; id?: string }) => void) => () => void;
}

const TABLE_LISTENERS = new Set<(data: { table: string; action?: string; id?: string }) => void>();

export function getStoredSyncMode(): SyncMode {
  if (typeof window === 'undefined') return 'single';
  const mode = localStorage.getItem('anpos_sync_mode');
  if (mode === 'lan' || mode === 'cloud' || mode === 'hybrid' || mode === 'single') {
    return mode;
  }
  // إذا لم يُخزن نمط المزامنة وكان الجهاز عميلاً، فالنمط شبكي حتماً
  if (localStorage.getItem('anpos_terminal_role') === 'client') {
    return 'lan';
  }
  return 'single';
}

export function getStoredTerminalRole(): TerminalRole {
  if (typeof window === 'undefined') return 'server';
  const role = localStorage.getItem('anpos_terminal_role');
  return role === 'client' ? 'client' : 'server';
}

export function isClientNode(): boolean {
  if (getStoredSyncMode() === 'single') return false;
  return getStoredTerminalRole() === 'client';
}

export function getStoredServerLanUrl(): string {
  if (typeof window === 'undefined') return '';
  const stored = (localStorage.getItem('anpos_server_lan_url') || '').trim().replace(/\/+$/, '');
  if (stored) return stored;
  // في بيئة المتصفح دون وجود Electron، الاتصال بخادم Fastify المحلي على المنفذ 3000 تلقائياً
  if (!(window as any).electronAPI && typeof window.location !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return '';
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
  syncMode?: SyncMode;
  serverUrl?: string;
  token?: string;
  deviceId?: string;
}): void {
  if (typeof window === 'undefined') return;
  if (config.role) localStorage.setItem('anpos_terminal_role', config.role);
  if (config.syncMode) {
    localStorage.setItem('anpos_sync_mode', config.syncMode);
  } else if (config.role === 'server' && !localStorage.getItem('anpos_sync_mode')) {
    // التوافق مع بيئة الاختبارات عند تعيين السيرفر دون تحديد syncMode
    localStorage.setItem('anpos_sync_mode', 'lan');
  }
  if (config.serverUrl !== undefined) localStorage.setItem('anpos_server_lan_url', config.serverUrl.trim().replace(/\/+$/, ''));
  if (config.token !== undefined) localStorage.setItem('anpos_client_token', config.token);
  if (config.deviceId !== undefined) localStorage.setItem('anpos_client_device_id', config.deviceId);

  try {
    window.dispatchEvent(new CustomEvent('anpos:transport-config-changed', { detail: config }));
  } catch {}
}

export function getStoredTransportConfig(): {
  role: TerminalRole;
  syncMode: SyncMode;
  serverUrl: string;
  token: string;
  deviceId: string;
} {
  return {
    role: getStoredTerminalRole(),
    syncMode: getStoredSyncMode(),
    serverUrl: getStoredServerLanUrl(),
    token: getStoredClientToken(),
    deviceId: getStoredClientDeviceId(),
  };
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
 * التحقق مما إذا كان الخطأ ناتجاً عن انقطاع الشبكة أو تعذر الوصول للخادم
 */
function isNetworkFailure(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('econnrefused') ||
    msg.includes('enetunreach') ||
    msg.includes('etimedout') ||
    msg.includes('aborterror') ||
    msg.includes('غير محدد') ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  );
}

/**
 * معالجة إنشاء سجل في وضع عدم الاتصال (حفظ بالنسخة المحلية + طابور Outbox)
 */
async function handleOfflineCreate(table: string, data: Record<string, unknown>) {
  const id = String(
    data.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
  );
  const record = { ...data, id };

  // 1. الحفظ في النسخة المحلية فورياً
  await saveReplicaItem(table, record);

  // 2. الإدراج في طابور الـ Outbox
  await enqueueOutboxItem({
    entity: table,
    operation: 'create',
    localId: id,
    payload: record,
    id,
  });

  // 3. إشعار المستمعين بالواجهة
  TABLE_LISTENERS.forEach((cb) => {
    try {
      cb({ table, action: 'create', id });
    } catch {}
  });

  console.log(`[transportGateway] 📴 تم تسجيل عملية إنشاء محلياً في الـ Outbox (${table}: ${id})`);
  return { data: record, queuedOffline: true };
}

/**
 * معالجة تعديل سجل في وضع عدم الاتصال
 */
async function handleOfflineUpdate(table: string, id: string, data: Record<string, unknown>) {
  const existing = (await getReplicaItem(table, id)) || {};
  const updatedRecord = { ...existing, ...data, id };

  await saveReplicaItem(table, updatedRecord);
  await enqueueOutboxItem({
    entity: table,
    operation: 'update',
    localId: id,
    payload: data,
  });

  TABLE_LISTENERS.forEach((cb) => {
    try {
      cb({ table, action: 'update', id });
    } catch {}
  });

  console.log(`[transportGateway] 📴 تم تسجيل عملية تعديل محلياً في الـ Outbox (${table}: ${id})`);
  return { data: updatedRecord, queuedOffline: true };
}

/**
 * معالجة حذف سجل في وضع عدم الاتصال
 */
async function handleOfflineRemove(table: string, id: string) {
  await removeReplicaItem(table, id);
  await enqueueOutboxItem({
    entity: table,
    operation: 'delete',
    localId: id,
    payload: {},
  });

  TABLE_LISTENERS.forEach((cb) => {
    try {
      cb({ table, action: 'delete', id });
    } catch {}
  });

  console.log(`[transportGateway] 📴 تم تسجيل عملية حذف محلياً في الـ Outbox (${table}: ${id})`);
  return { success: true, queuedOffline: true };
}

/**
 * عميل HTTP لنقل البيانات إلى خادم AN POS على الشبكة المحلية مع حماية الصمود دون اتصال
 */
export const httpTransportDb: TransportDbApi = {
  list: async (table, opts = {}) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) {
      const rep = await listReplicaItems(table, opts);
      return { ...rep, offlineReplica: true };
    }

    const url = `${baseUrl}/api/${encodeURIComponent(table)}${toQueryString(opts as Record<string, unknown>)}`;
    try {
      const res = await fetch(url, { headers: buildHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
        throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
      }
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      // حفظ في النسخة المحلية في الخلفية لتكون جاهزة دائماً
      if (data.length > 0) {
        saveReplicaBatch(table, data).catch(() => {});
      }
      return { data, total: json?.total ?? data.length };
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        console.warn(`[transportGateway] ⚠️ انقطاع اتصال الخادم — قراءة الجدول (${table}) من النسخة المحلية Offline Replica`);
        const rep = await listReplicaItems(table, opts);
        return { ...rep, offlineReplica: true };
      }
      throw err;
    }
  },

  get: async (table, id) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) {
      const local = await getReplicaItem(table, id);
      return local ? { data: local, offlineReplica: true } : null;
    }

    const url = `${baseUrl}/api/${encodeURIComponent(table)}/${encodeURIComponent(id)}`;
    try {
      const res = await fetch(url, { headers: buildHeaders() });
      if (res.status === 404) return null;
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
        throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
      }
      const json = await res.json();
      const data = json?.data ?? json;
      if (data) {
        saveReplicaItem(table, data).catch(() => {});
      }
      return { data };
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        console.warn(`[transportGateway] ⚠️ انقطاع اتصال الخادم — استرجاع العنصر (${table}/${id}) من النسخة المحلية Offline Replica`);
        const local = await getReplicaItem(table, id);
        return local ? { data: local, offlineReplica: true } : null;
      }
      throw err;
    }
  },

  bulkGet: async (table, ids) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) {
      const results: any[] = [];
      for (const id of ids) {
        const item = await getReplicaItem(table, id);
        if (item) results.push(item);
      }
      return { data: results, offlineReplica: true };
    }

    const url = `${baseUrl}/api/${encodeURIComponent(table)}/bulk-get`;
    try {
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
      const list = Array.isArray(json?.data) ? json.data : [];
      if (list.length > 0) {
        saveReplicaBatch(table, list).catch(() => {});
      }
      return { data: list };
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        const results: any[] = [];
        for (const id of ids) {
          const item = await getReplicaItem(table, id);
          if (item) results.push(item);
        }
        return { data: results, offlineReplica: true };
      }
      throw err;
    }
  },

  create: async (table, data) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) {
      return handleOfflineCreate(table, data);
    }

    const url = `${baseUrl}/api/${encodeURIComponent(table)}`;
    try {
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
      const createdItem = json?.data ?? json;
      saveReplicaItem(table, createdItem).catch(() => {});
      TABLE_LISTENERS.forEach((cb) => {
        try {
          cb({ table, action: 'create', id: createdItem?.id || (data.id as string) });
        } catch {}
      });
      return { data: createdItem };
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        return handleOfflineCreate(table, data);
      }
      throw err;
    }
  },

  bulkCreate: async (table, items) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) {
      for (const item of items) {
        await handleOfflineCreate(table, item);
      }
      return { success: true, insertedCount: items.length, queuedOffline: true };
    }

    const url = `${baseUrl}/api/${encodeURIComponent(table)}/bulk-create`;
    try {
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
      saveReplicaBatch(table, items).catch(() => {});
      TABLE_LISTENERS.forEach((cb) => {
        try {
          cb({ table, action: 'bulkCreate' });
        } catch {}
      });
      return json;
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        for (const item of items) {
          await handleOfflineCreate(table, item);
        }
        return { success: true, insertedCount: items.length, queuedOffline: true };
      }
      throw err;
    }
  },

  update: async (table, id, data) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) {
      return handleOfflineUpdate(table, id, data);
    }

    const url = `${baseUrl}/api/${encodeURIComponent(table)}/${encodeURIComponent(id)}`;
    try {
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
      const updatedItem = json?.data ?? json;
      saveReplicaItem(table, updatedItem).catch(() => {});
      TABLE_LISTENERS.forEach((cb) => {
        try {
          cb({ table, action: 'update', id });
        } catch {}
      });
      return { data: updatedItem };
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        return handleOfflineUpdate(table, id, data);
      }
      throw err;
    }
  },

  bulkUpdate: async (table, items) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) {
      for (const item of items) {
        const id = String(item.id || '');
        if (id) await handleOfflineUpdate(table, id, item);
      }
      return { success: true, updatedCount: items.length, queuedOffline: true };
    }

    const url = `${baseUrl}/api/${encodeURIComponent(table)}/bulk-update`;
    try {
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
        try {
          cb({ table, action: 'bulkUpdate' });
        } catch {}
      });
      return json;
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        for (const item of items) {
          const id = String(item.id || '');
          if (id) await handleOfflineUpdate(table, id, item);
        }
        return { success: true, updatedCount: items.length, queuedOffline: true };
      }
      throw err;
    }
  },

  remove: async (table, id) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) {
      return handleOfflineRemove(table, id);
    }

    const url = `${baseUrl}/api/${encodeURIComponent(table)}/${encodeURIComponent(id)}`;
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: buildHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
        throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
      }
      const json = await res.json();
      removeReplicaItem(table, id).catch(() => {});
      TABLE_LISTENERS.forEach((cb) => {
        try {
          cb({ table, action: 'delete', id });
        } catch {}
      });
      return { success: json?.success ?? true };
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        return handleOfflineRemove(table, id);
      }
      throw err;
    }
  },

  count: async (table, filter = {}) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) {
      const rep = await listReplicaItems(table, { filter });
      return { count: rep.total };
    }

    const url = `${baseUrl}/api/${encodeURIComponent(table)}/count${toQueryString(filter)}`;
    try {
      const res = await fetch(url, { headers: buildHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
        throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
      }
      const json = await res.json();
      return { count: Number(json?.count ?? 0) };
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        const rep = await listReplicaItems(table, { filter });
        return { count: rep.total };
      }
      throw err;
    }
  },

  clear: async (table) => {
    const baseUrl = getStoredServerLanUrl();
    if (!baseUrl) {
      return { success: true };
    }

    const url = `${baseUrl}/api/${encodeURIComponent(table)}/clear`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { detail: res.statusText } }));
        throw new Error(err?.error?.detail || `HTTP Error ${res.status}`);
      }
      TABLE_LISTENERS.forEach((cb) => {
        try {
          cb({ table, action: 'clear' });
        } catch {}
      });
      return { success: true };
    } catch (err: any) {
      if (isNetworkFailure(err)) {
        TABLE_LISTENERS.forEach((cb) => {
          try {
            cb({ table, action: 'clear' });
          } catch {}
        });
        return { success: true };
      }
      throw err;
    }
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

  // في بيئة المتصفح المباشر دون Electron، استخدام خادم HTTP المحلي
  if (typeof window !== 'undefined' && !(window as any).electronAPI) {
    return httpTransportDb;
  }

  return null;
}
