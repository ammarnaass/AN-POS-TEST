import { AnposSecureStore } from '@/modules/AnposSecureStore';
import type { User, Product, Sale, Customer, Supplier, CashSession, Promotion, Category, CartItem } from '@shared/types';
import { db as unifiedDB } from '@/infrastructure/database/UnifiedDB';

const SERVER_URL_KEY = 'anpos_server_url';
const SESSION_KEY = 'anpos_session_token';
const DEVICE_ID_KEY = 'anpos_device_id';
const CONNECTION_KEY_KEY = 'anpos_connection_key';

async function getServerUrl(): Promise<string | null> {
  return AnposSecureStore.get(SERVER_URL_KEY);
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

export async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const base = await getServerUrl();
  if (!base) throw new Error('لم يتم تكوين الخادم — امسح رمز QR أولاً');

  const { token, deviceId } = await getSession();
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['x-session-token'] = token;
  if (deviceId) headers['x-device-id'] = deviceId;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      await clearSession();
    }
    let errMsg = 'خطأ غير متوقع';
    try {
      const err = await res.json();
      errMsg = (err as { error?: { detail?: string } }).error?.detail || errMsg;
    } catch {
      // keep default
    }
    throw new Error(errMsg);
  }

  return res.json() as Promise<T>;
}

export const electronAPI = {
  pair: {
    info: () => apiCall<{ shopName: string; requiresKey: boolean }>('GET', '/api/pair/info'),
    pair: (payload: { deviceName: string; connectionKey: string }) =>
      apiCall<{ success: boolean; sessionToken?: string; deviceId?: string; error?: { status: number; detail: string } }>('POST', '/api/pair', payload),
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
  _cachedServerUrl = urlPref;
  _cachedToken = tokenPref;
  _cachedDeviceId = devicePref;
}

refreshSessionCache();

export const session = {
  save: async (serverUrl: string, key: string) => {
    await Promise.all([
      AnposSecureStore.set(SERVER_URL_KEY, serverUrl),
      AnposSecureStore.set(CONNECTION_KEY_KEY, key),
    ]);
    _cachedServerUrl = serverUrl;
    await unifiedDB.switchToConnected(serverUrl);
  },
  savePairing: async (token: string, deviceId: string) => {
    await Promise.all([
      AnposSecureStore.set(SESSION_KEY, token),
      AnposSecureStore.set(DEVICE_ID_KEY, deviceId),
    ]);
    _cachedToken = token;
    _cachedDeviceId = deviceId;
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
