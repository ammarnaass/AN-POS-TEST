import { AnposSecureStore } from '@/modules/AnposSecureStore';
import type { User, Product, Sale, Customer, Supplier, CashSession, Promotion, Category, CartItem } from '@shared/types';
import { db as unifiedDB } from '@/infrastructure/database/UnifiedDB';

const SERVER_URL_KEY = 'anpos_server_url';
const SESSION_KEY = 'anpos_session_token';
const DEVICE_ID_KEY = 'anpos_device_id';
const CONNECTION_KEY_KEY = 'anpos_connection_key';

/**
 * Normalizes any IP, host, or URL into a clean http://<host>:<port> string
 */
export function normalizeServerUrl(rawUrl: string, defaultPort: string = '4321'): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // If starts with scheme, handle port
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      if (!parsed.port && defaultPort) {
        parsed.port = defaultPort;
        return parsed.toString().replace(/\/+$/, '');
      }
      return url;
    } catch {
      return url;
    }
  }

  // If no scheme: e.g. 192.168.1.5 or 192.168.1.5:4321
  if (url.includes(':')) {
    return `http://${url}`;
  }

  return `http://${url}:${defaultPort}`;
}

async function getServerUrl(): Promise<string | null> {
  const raw = await AnposSecureStore.get(SERVER_URL_KEY);
  return raw ? normalizeServerUrl(raw) : null;
}

async function getSession(): Promise<{ token: string | null; deviceId: string | null }> {
  const [token, deviceId] = await Promise.all([
    AnposSecureStore.get(SESSION_KEY),
    AnposSecureStore.get(DEVICE_ID_KEY),
  ]);
  return { token, deviceId };
}

async function clearSession(): Promise<void> {
  await Promise.all([
    AnposSecureStore.remove(SESSION_KEY),
    AnposSecureStore.remove(DEVICE_ID_KEY),
  ]);
}

export async function checkServerHealth(serverUrl: string): Promise<{ ok: boolean; info?: any; error?: string }> {
  const normalized = normalizeServerUrl(serverUrl);
  if (!normalized) return { ok: false, error: 'عنوان الخادم فارغ' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    let res = await fetch(`${normalized}/api/discover`, {
      method: 'GET',
      headers: { 'X-Discovery': 'anpos-mobile', Accept: 'application/json' },
      signal: controller.signal,
    }).catch(() => null);

    if (!res || !res.ok) {
      res = await fetch(`${normalized}/api/pair/info`, {
        method: 'GET',
        headers: { 'X-Discovery': 'anpos-mobile', Accept: 'application/json' },
        signal: controller.signal,
      }).catch(() => null);
    }

    clearTimeout(timer);
    if (res && res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, info: data };
    }
    return { ok: false, error: 'الخادم لم يستجب على المنفذ المحدد' };
  } catch (err: any) {
    clearTimeout(timer);
    return { ok: false, error: err?.message || 'تعذر الوصول إلى الخادم' };
  }
}

export async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  timeoutMs: number = 8500
): Promise<T> {
  const base = await getServerUrl();
  if (!base) throw new Error('لم يتم تحديد عنوان الخادم — امسح رمز QR أو أدخل عنوان IP أولاً');

  const { token, deviceId } = await getSession();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${cleanPath}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) headers['x-session-token'] = token;
  if (deviceId) headers['x-device-id'] = deviceId;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      if (res.status === 401) {
        await clearSession();
      }
      let errMsg = `خطأ من الخادم (${res.status})`;
      try {
        const err = await res.json();
        errMsg = err?.error?.detail || err?.message || err?.error || errMsg;
      } catch {
        // keep default
      }
      throw new Error(errMsg);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new Error('مهلة الاتصال بالخادم انتهت (8 ثوانٍ). تأكد من تشغيل البرنامج على الكمبيوتر ومن اتصال الهاتف والحاسوب بنفس شبكة الـ Wi-Fi.');
    }
    if (err?.message?.includes('Network request failed') || err?.message?.includes('Failed to fetch')) {
      throw new Error('تعذر الوصول إلى جهاز الكمبيوتر. تأكد من أن الهاتف والكمبيوتر على نفس الشبكة ومن إيقاف حظر جدار الحماية (Firewall) في الويندوز.');
    }
    throw err;
  }
}

export const electronAPI = {
  pair: {
    info: () => apiCall<{ shopName: string; requiresKey: boolean }>('GET', '/api/pair/info'),
    pair: (payload: { deviceName: string; connectionKey: string }) =>
      apiCall<{
        success?: boolean;
        sessionToken?: string;
        token?: string;
        deviceId?: string;
        id?: string;
        error?: { status: number; detail: string };
      }>('POST', '/api/pair', {
        deviceName: payload.deviceName,
        connectionKey: payload.connectionKey,
        key: payload.connectionKey,
      }),
    unpair: () => apiCall<{ success: boolean }>('POST', '/api/pair/unpair'),
  },

  auth: {
    login: (username: string, pin: string) =>
      apiCall<{ user?: User; error?: { status: number; detail: string } }>('POST', '/api/auth/login', { username, pin }),
    me: (userId: string) =>
      apiCall<{ user?: User; error?: { status: number; detail: string } }>('GET', `/api/auth/me?userId=${encodeURIComponent(userId)}`),
    logout: (userId: string) =>
      apiCall<{ success: boolean }>('POST', '/api/auth/logout', { userId }),
  },

  db: {
    list: async (table: string, opts?: { search?: string; limit?: number; offset?: number; }) => {
      const result = await unifiedDB.list(table, opts);
      return { data: result.data };
    },
    get: (table: string, id: string) => unifiedDB.get(table, id),
    create: <T>(table: string, data: T) => unifiedDB.create(table, data),
    update: (table: string, id: string, data: Record<string, unknown>) => unifiedDB.update(table, id, data),
    remove: (table: string, id: string) => unifiedDB.remove(table, id),
  },

  sales: {
    list: async (opts?: Record<string, string | number | undefined>) => {
      const filters: Record<string, unknown> = {};
      if (opts) {
        for (const [k, v] of Object.entries(opts)) {
          if (v !== undefined) filters[k] = v;
        }
      }
      const hasFilters = Object.keys(filters).length > 0;
      return unifiedDB.list('sales', hasFilters ? { filters } : undefined);
    },
    get: (id: string) => unifiedDB.get('sales', id),
    create: (data: Record<string, unknown>) => unifiedDB.create('sales', data),
    update: (id: string, data: Record<string, unknown>) => unifiedDB.update('sales', id, data),
    remove: (id: string) => unifiedDB.remove('sales', id),
  },

  cash: {
    list: () => unifiedDB.list('cash_sessions'),
    get: (id: string) => unifiedDB.get('cash_sessions', id),
    current: async () => {
      const result = await unifiedDB.list('cash_sessions');
      const openSessions = result.data.filter((s: any) => s.status === 'open');
      return openSessions.length > 0 ? { data: openSessions[0] } : { data: null };
    },
    open: (data: { openedBy: string; openingBalance: number }) =>
      unifiedDB.create('cash_sessions', data),
    close: (id: string, data: { actualBalance: number; note?: string }) =>
      unifiedDB.update('cash_sessions', id, data),
    deposit: (id: string, data: { amount: number; note?: string }) => {
      return unifiedDB.get('cash_sessions', id).then(async (sessionData) => {
        if (!sessionData) return { data: null };
        const currentDeposits = (sessionData as any).deposits || [];
        const newDeposit = { amount: data.amount, date: new Date().toISOString(), note: data.note || '' };
        const updated = { ...sessionData, deposits: [...currentDeposits, newDeposit] };
        await unifiedDB.update('cash_sessions', id, updated);
        return { data: { success: true } };
      });
    },
  },

  categories: {
    list: () => unifiedDB.list('categories'),
    get: (id: string) => unifiedDB.get('categories', id),
    create: (data: Record<string, unknown>) => unifiedDB.create('categories', data),
    update: (id: string, data: Record<string, unknown>) => unifiedDB.update('categories', id, data),
    remove: (id: string) => unifiedDB.remove('categories', id),
  },

  payments: {
    list: (opts?: { partyId?: string; partyType?: string }) => {
      const filters: Record<string, unknown> = {};
      if (opts?.partyId) filters.partyId = opts.partyId;
      if (opts?.partyType) filters.partyType = opts.partyType;
      const hasFilters = Object.keys(filters).length > 0;
      return unifiedDB.list('payments', hasFilters ? { filters } : undefined);
    },
    create: (data: Record<string, unknown>) => unifiedDB.create('payments', data),
  },

  print: {
    printReceipt: (payload: { invoice: any; saleId?: string; options?: { copies?: number; templateId?: string; printerId?: string } }) =>
      apiCall<{ success: boolean; message?: string }>('POST', '/api/print/receipt', payload, 7000),
    listPrinters: () =>
      apiCall<{ success: boolean; printers: Array<{ id: string; name: string; type: string; isDefault?: boolean }> }>('GET', '/api/print/printers'),
  },

  stock: {
    checkStock: (productIds: string[]) =>
      apiCall<{ success: boolean; stock: Record<string, number> }>('POST', '/api/products/check-stock', { productIds }, 5000),
  },

  settings: {
    get: () => apiCall<{ success?: boolean; settings?: Record<string, any>; data?: Record<string, any> } | Record<string, any>>('GET', '/api/settings', undefined, 6000),
    update: (data: Record<string, unknown>) =>
      apiCall<{ success: boolean; settings?: Record<string, any> }>('PUT', '/api/settings', data, 6000),
  },
};

let _cachedServerUrl: string | null = null;
let _cachedToken: string | null = null;
let _cachedDeviceId: string | null = null;

async function refreshSessionCache(): Promise<void> {
  const [urlPref, tokenPref, devicePref] = await Promise.all([
    getServerUrl(),
    AnposSecureStore.get(SESSION_KEY),
    AnposSecureStore.get(DEVICE_ID_KEY),
  ]);
  _cachedServerUrl = urlPref ? normalizeServerUrl(urlPref) : null;
  _cachedToken = tokenPref;
  _cachedDeviceId = devicePref;
}

refreshSessionCache();

export const session = {
  save: async (serverUrl: string, key: string) => {
    const normalized = normalizeServerUrl(serverUrl);
    await Promise.all([
      AnposSecureStore.set(SERVER_URL_KEY, normalized),
      AnposSecureStore.set(CONNECTION_KEY_KEY, key),
    ]);
    _cachedServerUrl = normalized;
  },
  savePairing: async (token: string, deviceId: string) => {
    await Promise.all([
      AnposSecureStore.set(SESSION_KEY, token),
      AnposSecureStore.set(DEVICE_ID_KEY, deviceId),
    ]);
    _cachedToken = token;
    _cachedDeviceId = deviceId;
    if (_cachedServerUrl) {
      await unifiedDB.switchToConnected(_cachedServerUrl);
    }
  },
  getServerUrl,
  getSession,
  clear: async () => {
    await clearSession();
    _cachedToken = null;
    _cachedDeviceId = null;
  },
  isConnected: async () => {
    await refreshSessionCache();
    return Boolean(_cachedToken && _cachedDeviceId && _cachedServerUrl);
  },
  isConnectedSync: () => Boolean(_cachedToken && _cachedDeviceId && _cachedServerUrl),
  getServerUrlSync: () => _cachedServerUrl,
  getHeaders: () => ({
    'x-session-token': _cachedToken || '',
    'x-device-id': _cachedDeviceId || '',
  }),
  getServerUrlDisplay: async () => {
    const base = await getServerUrl();
    if (!base) return 'غير مُكوّن';
    try {
      const u = new URL(base);
      return `${u.hostname}:${u.port}`;
    } catch {
      return base;
    }
  },
};

export type { User, Product, Sale, Customer, Supplier, CashSession, Promotion, Category, CartItem };
